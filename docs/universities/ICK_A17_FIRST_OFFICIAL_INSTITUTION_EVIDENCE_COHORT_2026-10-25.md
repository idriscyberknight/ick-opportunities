# ICK Opportunities — A1.7 First Global University Evidence Cohort

**Research date:** 2026-10-25. **Status:** Research dossier only; not a database import, internal review decision, institutional certification, scholarship, or publication authorization.

**Purpose:** Move from A1.6.2 engineering into evidence-led manual onboarding of **actual universities** from multiple countries. This deliberately includes institutions with Islamic constitutional missions and one general university, so classification cannot be inferred merely from name, place or the presence of an Islamic Studies course.

## Source and adjudication rules

- The **institution's official site** is the primary source for its preferred name, campus location, institutional charter/mission, and current website.
- A **country government/quality-assurance directory** independently substantiates identity and legal recognition; each programme or international degree requires separate current accreditation verification.
- Do not treat a government *institution listing* as proof of specific scholarships, open admissions, fees, deadlines, visas or course accreditation.
- A source is an **external research finding**, not a reviewed row in ICK database. Database `university_evidence.review_status` must initially be `pending_review`; authorized Admin must read the linked source and write a reason through the atomic audited `ick_a16_review_evidence` RPC before changing it.
- Do not mark any university as `verification_status=verified` or `publication_status=published`: A1.6.2 reviews individual sources only and retains `universities_no_publishing_yet`.
- Source text may be copyright-controlled. Record **short claim-specific descriptions and original links**, never scrape full proprietary institutional or directory records, especially WHED/MQA bulk data, without appropriate permissions.

## Candidate A — Islamic University of Madinah (Saudi Arabia)

| Draft field | Proposed value |
| --- | --- |
| `slug` | `islamic-university-of-madinah-sa` |
| `official_name` | Islamic University of Madinah |
| `country_code` | `SA` |
| `city` | Al Madinah al Munawwarah |
| `official_website` | `https://iu.edu.sa/` |
| `verification_status` / `publication_status` | `pending_review` / `draft` |
| Classification to investigate | `islamic_institution` (not applied) |

**Claim-specific evidence to attach as `pending_review`**:
1. **Identity / Islamic constitutional mission:** `https://iu.edu.sa/en-us/university` — university's own charter and Royal Decree establishment account; includes explicitly Islamic vision.
2. **Independent Saudi government institutional listing:** `https://www.moe.gov.sa/en/education/highereducation/Pages/UniversitiesList.aspx` — Ministry of Education lists the Islamic University of Madinah among public universities, established 1961, located Almadinah.
3. **University homepage cross-check:** `https://iu.edu.sa/en-us` — describes the institution, Islamic/Sharia and scientific education. The university mentions scholarships on its website, but **no current scholarship eligibility or deadline is verified in this registry dossier**.

**Confidence:** Strong evidence of identity, official domain, Saudi public-university listing and Islamic institutional mission; these are independent **source observations**, not Admin-reviewed database events.

## Candidate B — International Islamic University Malaysia (Malaysia)

| Draft field | Proposed value |
| --- | --- |
| `slug` | `international-islamic-university-malaysia-my` |
| `official_name` | International Islamic University Malaysia |
| `country_code` | `MY` |
| `city` | Kuala Lumpur (campus-specific sites also exist; use campus records later) |
| `official_website` | `https://www.iium.edu.my/` |
| `verification_status` / `publication_status` | `pending_review` / `draft` |
| Classification to investigate | `islamic_institution` (not applied) |

**Claim-specific evidence to attach as `pending_review`**:
1. **Institution identity & Islamic mission:** `https://www.iium.edu.my/` and `https://www.iium.edu.my/vision-and-mission-2024/` — official IIUM website; describes mission to integrate academic knowledge with Islamic values.
2. **Malaysian Higher Education institutional listing:** `https://jpt.mohe.gov.my/index.php/en/hei/public-hei/public-universities` — Ministry of Higher Education public university directory lists Universiti Islam Antarabangsa Malaysia (UIAM).
3. **Malaysia Qualifications Register (MQR):** `https://www.mqa.gov.my/mqr/english/eakrbyipta.cfm?CodeID=24&OrderBy=NamaIPTSBI` — national Malaysian quality assurance register lists International Islamic University Malaysia (IIUM), Kuala Lumpur and Pahang campus entries. **Programme-specific status must be checked separately**.

**Caution:** IIUM has multiple campuses; do not use a single institution city field to imply all programmes are in Kuala Lumpur. `International Islamic University Malaysia`, `IIUM`, and `Universiti Islam Antarabangsa Malaysia` can be *candidate aliases*, not separately duplicated universities.

## Candidate C — Al-Hikmah University, Ilorin (Nigeria)

| Draft field | Proposed value |
| --- | --- |
| `slug` | `al-hikmah-university-ilorin-ng` |
| `official_name` | Al-Hikmah University, Ilorin |
| `country_code` | `NG` |
| `city` | Ilorin |
| `official_website` | `https://alhikmahuniversity.edu.ng/` **tentative pending official-domain reconciliation** |
| `verification_status` / `publication_status` | `pending_review` / `draft` |
| Classification to investigate | `islamic_institution` (not applied) |

**Claim-specific evidence to attach as `pending_review`**:
1. **Nigeria NUC institutional listing:** `https://www.nuc.edu.ng/nigerian-univerisities/private-univeristies/` — lists Al-Hikmah University, Ilorin among Nigerian private universities, established 2005. The NUC directory links **`https://www.alhikmah.edu.ng`** as its website.
2. **University's currently responding institutional homepage:** `https://alhikmahuniversity.edu.ng/` and `https://alhikmahuniversity.edu.ng/about-us/` — identifies 2005 establishment, private-university licensing, Islamic faith-based foundation and the explicitly described Islamic ethos.
3. **Nigeria NUC alternate official index:** `https://enuc.nuc.edu.ng/nus` — lists Al-Hikmah University, Ilorin, Kwara State as a private university, established 2005.

**IMPORTANT domain discrepancy:** The NUC directory links `alhikmah.edu.ng` while the active institution-branded website is `alhikmahuniversity.edu.ng`. Its own website links some official institutional services on `alhikmah.edu.ng`, which suggests a relationship, **but is not sufficient to treat all sites as canonical without careful cross-check**. Before saving a final canonical website and treating the classification as reviewed, compare current institutional contact/redirect/official communications and the NUC source; do not automatically redirect applicants or accept third-party application/payment links.

**Confidence:** Strong evidence of a recognized Nigerian institution and stated faith-based character; **website canonicalization needs review**. Do **not** translate the university's claim that all programmes are accredited into a programme-level verified database assertion without regulator-specific evidence.

## Candidate D — University of Ilorin (Nigeria; general university comparator)

| Draft field | Proposed value |
| --- | --- |
| `slug` | `university-of-ilorin-ng` |
| `official_name` | University of Ilorin |
| `country_code` | `NG` |
| `city` | Ilorin |
| `official_website` | `https://www.unilorin.edu.ng/` |
| `verification_status` / `publication_status` | `pending_review` / `draft` |
| Classification to investigate | `general_institution` (not applied) |

**Claim-specific evidence to attach as `pending_review`**:
1. **NUC federal-university list:** `https://www.nuc.edu.ng/federal-univeristies/` — lists University of Ilorin (established 1975) with institutional domain.
2. **NUC new institutional portal:** `https://enuc.nuc.edu.ng/nus` — lists University of Ilorin, Ilorin, Kwara State as a Federal institution founded 1975.
3. **Institution's own site:** `https://www.unilorin.edu.ng/about-us/` — confirms founding and city; provides institutional mission.

**Classification caution:** This is an example of a **general-purpose public university**. Do not call it an Islamic university merely because it is located in Ilorin or may offer Islamic Studies classes.

## Ordering, without production writes

1. First pilot: Islamic University of Madinah and University of Ilorin — clear government + institutional evidence and unambiguous website.
2. Second: IIUM — strong sources but campus-level normalization required.
3. Third: Al-Hikmah — independent NUC identity confirmed; reconcile differing official-site domains before selecting canonical URL.
4. For each, Admin first checks **the existing Production `universities.slug` list** for duplicates, then creates a new **private/unverified draft** via the existing authenticated Admin UI (not a privileged connector SQL import). Attach each source as its own pending claim. Use review RPC only after human research supports the specific claim.
5. Post-insertion validation: counts increased only as intended, no source has `reviewed` without rationale and audit, no university `verified`, no `published`, and the publishing CHECK is still active.
6. **Stop:** no mass scraper, auto-classification, public directory, programme accreditation badge, scholarship listing, expiry or direct admissions link is authorized by this dossier.

**Research conclusion:** All four institutions have official institution sites + independent national government/regulator mentions. The next operational deliverable is **four small private institutional dossiers**, not a global "verified" list. Independent source research is NOT evidence that ICK Opportunities has created these rows.
