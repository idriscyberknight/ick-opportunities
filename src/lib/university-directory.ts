/**
 * ICK University Directory — editorial starter collection, 2026-10-23.
 * THIS IS NOT a live scholarship database or a complete list of universities.
 * Institutional websites were located from official institution/OIC pages.
 * Source checks are not accreditation assessments. Admission, programme,
 * funding, nationality eligibility, language, and deadlines remain unverified.
 * Future migration: replace this static collection with a reviewed directory API.
 */
export type UniversityType = "islamic" | "islamic_studies";

export type UniversityRecord = {
  slug: string;
  name: string;
  aliases: readonly string[];
  country: string;
  countryCode: string;
  location?: string;
  types: readonly UniversityType[];
  description: string;
  officialWebsite: string;
  institutionalSource: string;
  sourceCheckedOn: string;
};

const SOURCE_CHECK_DATE = "2026-10-23";

/** Selected source-linked institutions across several regions — not exhaustive. */
export const STARTER_UNIVERSITIES: readonly UniversityRecord[] = [
  {
    slug: "islamic-university-of-madinah",
    name: "Islamic University of Madinah",
    aliases: ["Islamic University of Medinah", "الجامعة الإسلامية بالمدينة المنورة"],
    country: "Saudi Arabia", countryCode: "SA", location: "Madinah",
    types: ["islamic", "islamic_studies"],
    description: "Islamic university in Madinah. Consult its official site for current programmes and scholarship cycles.",
    officialWebsite: "https://iu.edu.sa/en-us",
    institutionalSource: "https://iu.edu.sa/en-us",
    sourceCheckedOn: SOURCE_CHECK_DATE,
  },
  {
    slug: "al-azhar-university",
    name: "Al-Azhar University",
    aliases: ["جامعة الأزهر", "Al Azhar University"],
    country: "Egypt", countryCode: "EG", location: "Cairo",
    types: ["islamic_studies"],
    description: "University with an established Islamic academic tradition. Check the official university portal for programme information.",
    officialWebsite: "https://www.azu.edu.eg/",
    institutionalSource: "https://www.azu.edu.eg/",
    sourceCheckedOn: SOURCE_CHECK_DATE,
  },
  {
    slug: "international-islamic-university-malaysia",
    name: "International Islamic University Malaysia",
    aliases: ["IIUM", "UIAM", "Universiti Islam Antarabangsa Malaysia"],
    country: "Malaysia", countryCode: "MY", location: "Gombak",
    types: ["islamic", "islamic_studies"],
    description: "International Islamic university in Malaysia. Scholarship availability is not established by its inclusion here.",
    officialWebsite: "https://www.iium.edu.my/",
    institutionalSource: "https://www.iium.edu.my/",
    sourceCheckedOn: SOURCE_CHECK_DATE,
  },
  {
    slug: "islamic-university-in-niger",
    name: "Islamic University in Niger",
    aliases: ["Université Islamique au Niger", "UIN", "Islamic University of Niger"],
    country: "Niger", countryCode: "NE", location: "Say / Niamey",
    types: ["islamic", "islamic_studies"],
    description: "OIC-associated university in Niger with institutional information on its official site.",
    officialWebsite: "https://www.uin-ne.org/en/",
    institutionalSource: "https://www.uin-ne.org/en/",
    sourceCheckedOn: SOURCE_CHECK_DATE,
  },
  {
    slug: "islamic-university-in-uganda",
    name: "Islamic University in Uganda",
    aliases: ["IUIU"],
    country: "Uganda", countryCode: "UG", location: "Mbale",
    types: ["islamic", "islamic_studies"],
    description: "OIC-associated university in Uganda with academic and admissions information on its official website.",
    officialWebsite: "https://iuiu.ac.ug/",
    institutionalSource: "https://iuiu.ac.ug/",
    sourceCheckedOn: SOURCE_CHECK_DATE,
  },
  {
    slug: "international-islamic-university-islamabad",
    name: "International Islamic University Islamabad",
    aliases: ["IIUI", "International Islamic University Pakistan"],
    country: "Pakistan", countryCode: "PK", location: "Islamabad",
    types: ["islamic", "islamic_studies"],
    description: "International Islamic university in Pakistan. Verify specific courses and admission requirements on its website.",
    officialWebsite: "https://www.iiu.edu.pk/",
    institutionalSource: "https://www.iiu.edu.pk/",
    sourceCheckedOn: SOURCE_CHECK_DATE,
  },
  {
    slug: "uin-syarif-hidayatullah-jakarta",
    name: "Syarif Hidayatullah State Islamic University Jakarta",
    aliases: ["UIN Jakarta", "UIN Syarif Hidayatullah", "Universitas Islam Negeri Syarif Hidayatullah Jakarta"],
    country: "Indonesia", countryCode: "ID", location: "Jakarta",
    types: ["islamic", "islamic_studies"],
    description: "Indonesian state Islamic university; programme details are available from the official university site.",
    officialWebsite: "https://uinjkt.ac.id/en/",
    institutionalSource: "https://uinjkt.ac.id/en/",
    sourceCheckedOn: SOURCE_CHECK_DATE,
  },
  {
    slug: "islamic-university-of-technology",
    name: "Islamic University of Technology",
    aliases: ["IUT", "IUT OIC", "Islamic University of Technology Bangladesh"],
    country: "Bangladesh", countryCode: "BD", location: "Gazipur",
    types: ["islamic"],
    description: "OIC subsidiary university with a technology-focused mission. Scholarship and funding rules must be checked by cycle.",
    officialWebsite: "https://www.iutoic-dhaka.edu/",
    institutionalSource: "https://www.iutoic-dhaka.edu/about",
    sourceCheckedOn: SOURCE_CHECK_DATE,
  },
] as const;

/** Keep all public data in one module so cards and profiles cannot diverge. */
export function getUniversity(slug: string): UniversityRecord | undefined {
  return STARTER_UNIVERSITIES.find((item) => item.slug === slug);
}

export function normalizeUniversityTerm(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
}

export function filterUniversities(options: {
  keyword?: string;
  country?: string;
  type?: UniversityType | "all";
}): UniversityRecord[] {
  const term = normalizeUniversityTerm(options.keyword ?? "");
  return STARTER_UNIVERSITIES.filter((item) => {
    if (options.country && options.country !== "all" && item.countryCode !== options.country) return false;
    if (options.type && options.type !== "all" && !item.types.includes(options.type)) return false;
    if (!term) return true;
    const searchable = normalizeUniversityTerm(
      [item.name, ...item.aliases, item.country, item.location ?? "", item.description].join(" "),
    );
    return searchable.includes(term);
  });
  }
      
