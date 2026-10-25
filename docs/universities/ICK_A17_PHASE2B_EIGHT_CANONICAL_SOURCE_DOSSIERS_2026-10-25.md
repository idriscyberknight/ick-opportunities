# ICK Opportunities — A1.7 Phase 2B: Official-Source Dossiers for the Existing Eight Universities

**Research snapshot: 2026-10-25. Status: source-candidate inventory, NOT Admin reviewed evidence, NOT a database import, NOT programme accreditation, NOT a verified scholarship, NOT a publishing authorization.**

## Purpose and reconciliation

Eight named university profiles already exist as STATIC records in `src/lib/university-directory.ts`, publicly displayed through `/scholarship-navigator/universities`. Their canonical slug and public profile links must survive the later move to an independently reviewed database source of truth.

Authoritative Lovable Cloud Production baseline immediately preceding this work: one unrelated private draft, zero matching canonical starter slugs, one private evidence row, zero review events, zero published registry institutions; `universities_no_publishing_yet` CHECK intact. A legacy static public profile is *not* a published database row.

This research selects **claim-specific official source URLs** to assist an Admin in creating private drafts and attaching unreviewed source claims. The Admin UI only pre-fills a source form; a human must independently examine it and press the existing **Attach unreviewed source** button. The secure `ick_a16_review_evidence` RPC requires a distinct justified decision, and neither source attachment nor review establishes accreditation or a live scholarship.

| Canonical slug and institution | Government/official primary source | Notes and hold conditions |
|---|---|---|
| `islamic-university-of-madinah` (Saudi Arabia) | Saudi Ministry of Education: https://www.moe.gov.sa/en/education/highereducation/Pages/UniversitiesList.aspx | Ministry lists Islamic University of Madinah among public universities; school site `https://iu.edu.sa/en-us`. Do not infer 2026 funding availability. |
| `al-azhar-university` (Egypt) | Official Al-Azhar University services portal: https://www.azu.edu.eg/ ; Al-Azhar central authority: https://azhar.eg/ | Distinguish the university's services from the broad Al-Azhar institutional umbrella. No independent degree/programme decision is established by this dossier. |
| `international-islamic-university-malaysia` (Malaysia) | Ministry of Higher Education public list: https://jpt.mohe.gov.my/index.php/en/hei/public-hei/public-universities ; MQR: https://www.mqa.gov.my/mqr/english/eakrbyipta.cfm | Multiple IIUM/UIAM campuses and programme-specific MQR records. One institution canonical slug; campus record may vary. |
| `islamic-university-in-niger` (Niger) | OIC record: https://scholarship.oic-oci.org/university/23 ; OIC higher education page: https://www.oic-oci.org/en/departments/6 | **HOLD website verification**: neither `universite-say.com` nor `uin-ne.org` has sufficiently established *current ownership and safe applicant handling*. Do not prefill the disputed domain, link users to unverified payment pages, or claim application deadlines. |
| `islamic-university-in-uganda` (Uganda) | Uganda NCHE current institution register: https://unche.or.ug/institutions/ | NCHE includes Islamic University in Uganda with separate-Act status; confirm campus details and check programme register separately. |
| `international-islamic-university-islamabad` (Pakistan) | HEC record: https://www.hec.gov.pk/english/universities/Pages/Islamabad/International-Islamic-University.aspx | Pakistan HEC marks this Islamabad institution recognized; specific courses/accreditation are separate questions. |
| `uin-syarif-hidayatullah-jakarta` (Indonesia) | Indonesia Ministry of Religious Affairs: https://kemenag.go.id/nasional/menag-dorong-uin-jakarta-akselerasi-transformasi-jadi-ptkin-berbadan-hukum-xLwAs | UIN Jakarta is a state Islamic institution. Its campus is at Ciputat, Tangerang Selatan; avoid treating the name “Jakarta” as a precise physical location. |
| `islamic-university-of-technology` (Bangladesh) | OIC subsidiary organs list: https://www.oic-oci.org/en/organs/subsidiary-organs ; university: https://iutoic-dhaka.edu/about | OIC-affiliated IUT is an institution; the university site may discuss scholarships generally, but no current round has been separately reviewed for ICK. |

## Data integrity / security gates

1. Always use the eight existing canonical slugs; never create a second public identity with an alternate country suffix.
2. Admin UI may *prepare* source input only if `selected.slug` AND `selected.country_code` match the existing starter identity. Other private drafts must never see these suggested sources.
3. Attaching a URL creates `review_status='pending_review'`, not `reviewed`. A fresh Admin-only registry snapshot is checked before submit to avoid accidental repeated URLs. This client safeguard is not a globally atomic anti-duplicate guarantee; a future DB constraint and full pagination are necessary at scale.
4. No automatic cloning of Arabic/local aliases, no provisional classifications, and no university `verified` or `published` statuses until the later audited approval and distinct publishing release.
5. Do not import anything directly through privileged SQL in this phase. The authorized human Admin session must perform any draft/source CREATE from the existing protected UI, after reviewing official pages and any conflicts.
6. No student/user documents, personal details, fee payments or external source scraping is required for registry research.
7. When all eight are onboarded, the **public** directory STILL uses the static list until a separately designed approved database-publication system is installed. Do not equate 8/8 private drafts with a completed public switchover.

## Deliverable

- `src/lib/university-onboarding-sources.ts`: all eight official institution/authority source candidate lists, clear warning copy and source classification.
- Existing Admin University Registry displays clickable source references only on the **matching selected private draft**, each with a **Prepare source (no write)** control.
- Clicking prepares `claim_type='identity'`, URL and title, but does not write any DB row or review flag.
- Existing **Attach unreviewed source** remains the only human-initiated write path, and duplicate-same-URL attachment from a single session is guarded by fresh readback.
- Bun CI tests all eight keys, HTTPS, regulator examples, Niger disputed-domain exclusion, no auto-verification fields. No backend migration or public directory refactor.

**Next explicit acceptance:** Real Admin may create a canonical pending/draft entry using the already deployed safe one-at-a-time form, inspect linked authority, then attach only the researched source whose claim they have personally checked. Production write and publication decisions are separate approval events.
