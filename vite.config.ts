// Keep Lovable's existing framework plugins and SSR entry.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

const reviewedHash =
  "ccc35767aca6a759e17af0cae72238decbfdf283ac1da2a7f28a4906cfd52104";

function assertReviewedStorage(source: string) {
  const normalized = source.replace(/\r\n/g, "\n").trim();
  const hash = createHash("sha256").update(normalized).digest("hex");
  if (hash !== reviewedHash) {
    throw new Error(
      "ICK auth: generated preview storage changed. Review the broker protocol before updating the approved hash.",
    );
  }
}

function ickAuthStorage(): Plugin {
  let root = "";
  let generatedPath = "";
  return {
    name: "ick-reviewed-auth-storage",
    enforce: "pre",
    configResolved(config) {
      root = config.root;
      generatedPath = resolve(root, "src/integrations/supabase/previewAuthStorage.ts")
        .replace(/\\/g, "/");
    },
    buildStart() {
      assertReviewedStorage(readFileSync(generatedPath, "utf8"));
      const client = readFileSync(
        resolve(root, "src/integrations/supabase/client.ts"), "utf8",
      );
      if (
        !/from\s+['"]\.\/previewAuthStorage['"]/.test(client) ||
        !/storage:\s*brokeredPreviewStorage\(\)/.test(client)
      ) {
        throw new Error(
          "ICK auth: generated client wiring changed. Review the storage integration.",
        );
      }
    },
    transform(source, id) {
      const filename = (id.split("?")[0] ?? "").replace(/\\/g, "/");
      if (filename !== generatedPath) return null;
      assertReviewedStorage(source);
      return {
        code: 'export { brokeredPreviewStorage } from "../../lib/auth/previewAuthStorage";\nexport type { PreviewAuthStorage } from "../../lib/auth/previewAuthStorage";',
        map: null,
      };
    },
  };
}

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [ickAuthStorage()],
  },
});

        
