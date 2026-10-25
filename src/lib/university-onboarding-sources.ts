/**
 * A1.7.2B — Editor-curated SOURCE CANDIDATES for the EIGHT existing public
 * canonical university profiles. Research checked 2026-10-25. These are
 * references for further human source verification, NOT verified evidence,
 * accreditation, active admissions or scholarship announcements.
 *
 * This file never calls Supabase, creates a draft, attaches a source, changes
 * a reviewer status, or publishes anything.
 */
export type StarterSourceCandidate = {
  title: string;
  url: string;
  claim: "identity" | "website";
  sourceKind: "institution" | "official_authority";
  reviewerCaution: string;
};

export const UNIVERSITY_SOURCE_CANDIDATES: Readonly<
  Record<string, readonly StarterSourceCandidate[]>
> = {
  "islamic-university-of-madinah": [
    {
      title: "Islamic University of Madinah — University website",
      url: "https://iu.edu.sa/en-us",
      claim: "identity",
      sourceKind: "institution",
      reviewerCaution:
        "Check the university's identity and official domain. This is not a scholarship-cycle review.",
    },
    {
      title: "Saudi Ministry of Education — Public Universities",
      url: "https://www.moe.gov.sa/en/education/highereducation/Pages/UniversitiesList.aspx",
      claim: "identity",
      sourceKind: "official_authority",
      reviewerCaution:
        "Confirm the Madinah entry in the Saudi public university list; separate from programme accreditation.",
    },
  ],
  "al-azhar-university": [
    {
      title: "Al-Azhar University — Official student services portal",
      url: "https://www.azu.edu.eg/",
      claim: "identity",
      sourceKind: "institution",
      reviewerCaution:
        "This is a student-services portal, not a regulator decision or a comprehensive university prospectus.",
    },
    {
      title: "Al-Azhar Al-Sharif — Official central portal",
      url: "https://azhar.eg/",
      claim: "identity",
      sourceKind: "official_authority",
      reviewerCaution:
        "Separate Al-Azhar institution's broad site from the university's actual services and campus identity.",
    },
  ],
  "international-islamic-university-malaysia": [
    {
      title: "International Islamic University Malaysia — Official website",
      url: "https://www.iium.edu.my/",
      claim: "identity",
      sourceKind: "institution",
      reviewerCaution:
        "IIUM/UIAM has multiple campuses; do not equate the registered entity with a specific campus.",
    },
    {
      title: "Malaysia Ministry of Higher Education — Public Universities",
      url: "https://jpt.mohe.gov.my/index.php/en/hei/public-hei/public-universities",
      claim: "identity",
      sourceKind: "official_authority",
      reviewerCaution:
        "Check UIAM's public-university listing; individual course awards must be verified in MQR separately.",
    },
    {
      title: "Malaysian Qualifications Register — Public HE qualifications",
      url: "https://www.mqa.gov.my/mqr/english/eakrbyipta.cfm",
      claim: "identity",
      sourceKind: "official_authority",
      reviewerCaution:
        "MQR has IIUM entries for separate regions and programmes; never claim universal course accreditation.",
    },
  ],
  "islamic-university-in-niger": [
    {
      title: "Organization of Islamic Cooperation — Islamic University in Niger",
      url: "https://scholarship.oic-oci.org/university/23",
      claim: "identity",
      sourceKind: "official_authority",
      reviewerCaution:
        "OIC establishes historical institutional affiliation, NOT trustworthy ownership or availability of any present university website.",
    },
    {
      title: "OIC — Science and Higher Education overview",
      url: "https://www.oic-oci.org/en/departments/6",
      claim: "identity",
      sourceKind: "official_authority",
      reviewerCaution:
        "OIC lists Niger as an affiliated institution. Keep campus and official web-domain fields under independent review.",
    },
  ],
  "islamic-university-in-uganda": [
    {
      title: "Islamic University in Uganda — Official website",
      url: "https://iuiu.ac.ug/",
      claim: "identity",
      sourceKind: "institution",
      reviewerCaution:
        "Check current affiliation and main-campus details before making any admissions claim.",
    },
    {
      title: "Uganda NCHE — Register of institutions",
      url: "https://unche.or.ug/institutions/",
      claim: "identity",
      sourceKind: "official_authority",
      reviewerCaution:
        "Verify the current registered entry and its type. Programme-level accreditation has its own register.",
    },
  ],
  "international-islamic-university-islamabad": [
    {
      title: "International Islamic University Islamabad — Official website",
      url: "https://www.iiu.edu.pk/",
      claim: "identity",
      sourceKind: "institution",
      reviewerCaution:
        "IIUI/IIU abbreviations are not globally unique; include Pakistan and Islamabad when comparing identity.",
    },
    {
      title: "Pakistan HEC — International Islamic University, Islamabad",
      url: "https://www.hec.gov.pk/english/universities/Pages/Islamabad/International-Islamic-University.aspx",
      claim: "identity",
      sourceKind: "official_authority",
      reviewerCaution:
        "HEC identifies recognition of the institution, not every faculty/programme's current standing.",
    },
  ],
  "uin-syarif-hidayatullah-jakarta": [
    {
      title: "UIN Syarif Hidayatullah Jakarta — Official university website",
      url: "https://uinjkt.ac.id/en/",
      claim: "identity",
      sourceKind: "institution",
      reviewerCaution:
        "University title says Jakarta; institutional main campus location is Ciputat, Tangerang Selatan. Verify actual address.",
    },
    {
      title: "Indonesia Ministry of Religious Affairs — UIN Syarif Hidayatullah Jakarta",
      url: "https://kemenag.go.id/nasional/menag-dorong-uin-jakarta-akselerasi-transformasi-jadi-ptkin-berbadan-hukum-xLwAs",
      claim: "identity",
      sourceKind: "official_authority",
      reviewerCaution:
        "Official Ministry reference validates state Islamic university identity, not an institutional accreditation certificate.",
    },
  ],
  "islamic-university-of-technology": [
    {
      title: "Islamic University of Technology — About",
      url: "https://iutoic-dhaka.edu/about",
      claim: "identity",
      sourceKind: "institution",
      reviewerCaution:
        "Official institutional page, not proof any scholarship funding is currently open.",
    },
    {
      title: "OIC — Subsidiary organs listing",
      url: "https://www.oic-oci.org/en/organs/subsidiary-organs",
      claim: "identity",
      sourceKind: "official_authority",
      reviewerCaution:
        "OIC lists IUT in Bangladesh as its subsidiary organ. Do not infer ongoing admissions or scholarship cycles.",
    },
  ],
};

export function starterSourceCandidates(slug: string): readonly StarterSourceCandidate[] {
  return UNIVERSITY_SOURCE_CANDIDATES[slug] ?? [];
}
