import { createOpenAI } from "@ai-sdk/openai";
import { jsonSchema, NoObjectGeneratedError, Output, streamText } from "ai";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";
const MAX_PAGE_CHARS = 40_000;

export type ExtractedOpportunity = {
  title: string;
  organization: string;
  category: "scholarship" | "job" | "internship" | "grant";
  country: string | null;
  deadline: string | null;
  description: string;
  eligibility: string | null;
  benefits: string | null;
  official_link: string | null;
};

export class GatewayError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Fetch a source page and reduce it to readable text with absolute links kept inline. */
export async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "ICKOpportunitiesBot/1.0 (+opportunity discovery)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Source returned HTTP ${res.status}`);
  const html = await res.text();
  const text = html
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, inner: string) => {
      let abs = href;
      try {
        abs = new URL(href, url).toString();
      } catch {
        /* keep raw */
      }
      return ` ${inner} [${abs}] `;
    })
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, MAX_PAGE_CHARS);
}

const schema = jsonSchema<{ opportunities: ExtractedOpportunity[] }>({
  type: "object",
  additionalProperties: false,
  required: ["opportunities"],
  properties: {
    opportunities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "organization",
          "category",
          "country",
          "deadline",
          "description",
          "eligibility",
          "benefits",
          "official_link",
        ],
        properties: {
          title: { type: "string" },
          organization: { type: "string" },
          category: { type: "string", enum: ["scholarship", "job", "internship", "grant"] },
          country: { type: ["string", "null"] },
          deadline: { type: ["string", "null"] },
          description: { type: "string" },
          eligibility: { type: ["string", "null"] },
          benefits: { type: ["string", "null"] },
          official_link: { type: ["string", "null"] },
        },
      },
    },
  },
});

export async function extractOpportunities(
  pageText: string,
  sourceUrl: string,
  sourceType: string,
): Promise<ExtractedOpportunity[]> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new GatewayError("AI is not configured", 401);
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const r = await runIdFetch.fetch(input, init);
      if (!r.ok) {
        const body = await r.clone().text().catch(() => "");
        let msg = `AI request failed (${r.status})`;
        try {
          msg = JSON.parse(body)?.message ?? JSON.parse(body)?.error?.message ?? msg;
        } catch {
          /* ignore */
        }
        throw new GatewayError(msg, r.status);
      }
      return r;
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const result = streamText({
    model: provider.responses(MODEL),
    output: Output.object({ schema }),
    system:
      "You extract real, currently open opportunities (scholarships, fellowships, jobs, internships, grants) from web page text. " +
      "Only include opportunities explicitly described in the text — never invent details. Fellowships map to 'scholarship' unless funding a project (then 'grant'). " +
      "Use null for anything not stated. deadline must be YYYY-MM-DD or null. official_link must be an absolute URL taken from the [bracketed links] in the text, ideally the specific opportunity page. " +
      "description: 1–3 sentences. Return at most 15 opportunities; return an empty list if none are listed.",
    prompt: `Today is ${today}. Source type: ${sourceType}. Source URL: ${sourceUrl}\n\nPAGE TEXT:\n${pageText}`,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  try {
    const out = await result.output;
    return out?.opportunities ?? [];
  } catch (e) {
    if (e instanceof GatewayError) throw e;
    if (NoObjectGeneratedError.isInstance(e)) return [];
    const cause = (e as { cause?: unknown })?.cause;
    if (cause instanceof GatewayError) throw cause;
    throw e;
  }
}
