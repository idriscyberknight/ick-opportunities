export interface DigestRecipient {
  name?: string | null;
  email: string;
}

export interface DigestOpportunityItem {
  id: string;
  title: string;
  category: "scholarship" | "job" | "internship" | "grant" | string;
  organization?: string | null;
  country?: string | null;
  state?: string | null;
  deadline?: string | null;
  matchScore?: number;
  matchReasons?: string[];
  url?: string;
}

export interface DigestEmailPayload {
  recipient: DigestRecipient;
  opportunities: DigestOpportunityItem[];
  siteOrigin?: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
}

export function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  scholarship: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
  job: { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
  internship: { bg: "#f5f3ff", text: "#5b21b6", border: "#ddd6fe" },
  grant: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
};

export function getDigestSubject(payload: DigestEmailPayload): string {
  const count = payload.opportunities.length;
  if (count === 0) {
    return "[ICK Opportunities] New Personalized Opportunity Recommendations";
  }
  const firstCategory = payload.opportunities[0]?.category || "opportunity";
  const catLabel = firstCategory.charAt(0).toUpperCase() + firstCategory.slice(1);
  return `[ICK Opportunities] ${count} New ${catLabel} & Verified Matches for You`;
}

export function renderOpportunityDigestHtml(payload: DigestEmailPayload): string {
  const origin = (payload.siteOrigin || "https://ick-opportunities.vercel.app").replace(/\/+$/, "");
  const recipientName = payload.recipient.name?.trim() || "Applicant";
  const items = payload.opportunities;
  const preferencesUrl = payload.preferencesUrl || `${origin}/dashboard/alerts`;
  const unsubscribeUrl = payload.unsubscribeUrl || `${origin}/dashboard/alerts`;

  const itemsHtml = items.map((item) => {
    const itemUrl = item.url || `${origin}/opportunities/${item.id}`;
    const colors = CATEGORY_COLORS[item.category] || { bg: "#f3f4f6", text: "#1f2937", border: "#e5e7eb" };
    const categoryBadge = item.category.toUpperCase();
    const location = [item.state, item.country].filter(Boolean).join(", ") || "International / Online";
    const deadlineText = item.deadline ? `Deadline: ${item.deadline}` : "No deadline specified";

    const reasonsHtml = item.matchReasons && item.matchReasons.length > 0
      ? `<div style="margin-top: 10px; padding: 10px 14px; background-color: #f8fafc; border-left: 3px solid #10b981; border-radius: 4px;">
           <span style="font-size: 11px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">Why this matches your profile:</span>
           <ul style="margin: 4px 0 0 0; padding-left: 18px; color: #475569; font-size: 13px; line-height: 18px;">
             ${item.matchReasons.map((r) => `<li style="margin-bottom: 2px;">${escapeHtml(r)}</li>`).join("")}
           </ul>
         </div>`
      : "";

    return `
      <tr>
        <td style="padding: 18px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 12px; background-color: ${colors.bg}; color: ${colors.text}; border: 1px solid ${colors.border};">
                  ${escapeHtml(categoryBadge)}
                </span>
                ${item.matchScore ? `<span style="font-size: 12px; font-weight: 600; color: #059669; margin-left: 8px;">Match: ${item.matchScore}%</span>` : ""}
              </td>
            </tr>
            <tr>
              <td style="padding-top: 10px;">
                <a href="${escapeHtml(itemUrl)}" style="font-size: 17px; font-weight: 700; color: #0f172a; text-decoration: none; line-height: 22px;">
                  ${escapeHtml(item.title)}
                </a>
              </td>
            </tr>
            ${item.organization ? `
            <tr>
              <td style="padding-top: 4px; font-size: 13px; color: #64748b; font-weight: 500;">
                Organization / Institution: <strong>${escapeHtml(item.organization)}</strong>
              </td>
            </tr>` : ""}
            <tr>
              <td style="padding-top: 6px; font-size: 12px; color: #64748b;">
                📍 ${escapeHtml(location)} &nbsp;|&nbsp; ⏰ ${escapeHtml(deadlineText)}
              </td>
            </tr>
            ${reasonsHtml ? `<tr><td>${reasonsHtml}</td></tr>` : ""}
            <tr>
              <td style="padding-top: 14px;">
                <a href="${escapeHtml(itemUrl)}" style="display: inline-block; background-color: #0284c7; color: #ffffff; padding: 9px 18px; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                  View Details &amp; Apply &rarr;
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td height="14" style="line-height: 14px; font-size: 14px;">&nbsp;</td></tr>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(getDigestSubject(payload))}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container (Max 600px for Gmail & Mobile) -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px; text-align: center;">
              <a href="${escapeHtml(origin)}" style="text-decoration: none;">
                <span style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                  ICK <span style="color: #38bdf8;">Opportunities</span>
                </span>
              </a>
              <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
                Verified Global &amp; Nigerian Opportunities &bull; Scholarships, Jobs, Grants &amp; Internships
              </div>
            </td>
          </tr>

          <!-- Greeting Body -->
          <tr>
            <td style="padding: 24px 24px 12px 24px;">
              <h1 style="font-size: 19px; font-weight: 700; color: #0f172a; margin: 0 0 10px 0; line-height: 26px;">
                Hello, ${escapeHtml(recipientName)}! 👋
              </h1>
              <p style="font-size: 14px; color: #475569; margin: 0; line-height: 22px;">
                Based on your profile, career interests, and skills, the ICK Opportunities recommendation engine has matched you with the following verified opportunities:
              </p>
            </td>
          </tr>

          <!-- Opportunities List -->
          <tr>
            <td style="padding: 12px 24px 16px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- Anti-Scam Security Notice -->
          <tr>
            <td style="padding: 0 24px 20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px;">
                <tr>
                  <td style="font-size: 12px; color: #991b1b; line-height: 18px;">
                    🛡️ <strong>Security Alert:</strong> All opportunities listed on ICK Opportunities are 100% free. Never send money or pay application fees to anyone claiming to represent a scholarship, internship, or job listing.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 18px;">
              <p style="margin: 0 0 8px 0;">
                You are receiving this digest because you enabled opportunity match alerts on your account.
              </p>
              <p style="margin: 0 0 12px 0;">
                <a href="${escapeHtml(preferencesUrl)}" style="color: #0284c7; text-decoration: underline; margin-right: 12px;">Alert Settings</a>
                &bull;
                <a href="${escapeHtml(unsubscribeUrl)}" style="color: #64748b; text-decoration: underline; margin-left: 12px;">Unsubscribe</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                &copy; 2026 ICK Opportunities. All rights reserved.<br>
                <a href="${escapeHtml(origin)}" style="color: #94a3b8; text-decoration: none;">${escapeHtml(origin)}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderOpportunityDigestText(payload: DigestEmailPayload): string {
  const origin = (payload.siteOrigin || "https://ick-opportunities.vercel.app").replace(/\/+$/, "");
  const recipientName = payload.recipient.name?.trim() || "Applicant";
  const items = payload.opportunities;

  const itemsText = items.map((item, index) => {
    const itemUrl = item.url || `${origin}/opportunities/${item.id}`;
    const location = [item.state, item.country].filter(Boolean).join(", ") || "International / Online";
    const deadline = item.deadline ? `Deadline: ${item.deadline}` : "No deadline specified";
    const reasons = item.matchReasons && item.matchReasons.length > 0
      ? `  Why it matches: ${item.matchReasons.join("; ")}\n`
      : "";

    return `${index + 1}. [${item.category.toUpperCase()}] ${item.title}
  Organization: ${item.organization || "N/A"}
  Location: ${location} | ${deadline}
  Match Score: ${item.matchScore ? item.matchScore + "%" : "Tailored match"}
${reasons}  Apply URL: ${itemUrl}
`;
  }).join("\n");

  return `HELLO, ${recipientName.toUpperCase()}!

Based on your profile, here are new opportunities tailored to your interests:

${itemsText}
---
SECURITY ALERT:
All listings on ICK Opportunities are 100% free. Never pay anyone claiming to sell scholarship slots or job opportunities.

---
You received this email because you opted in to opportunity alerts.
Manage Preferences: ${payload.preferencesUrl || `${origin}/dashboard/alerts`}
Unsubscribe: ${payload.unsubscribeUrl || `${origin}/dashboard/alerts`}

(c) 2026 ICK Opportunities (${origin})
`;
    }
               
