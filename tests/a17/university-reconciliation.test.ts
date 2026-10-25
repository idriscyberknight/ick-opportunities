import { describe, expect, it } from "bun:test";
import { STARTER_UNIVERSITIES } from "../../src/lib/university-directory";
import {
  prepareStarterPrivateDraft,
  reconcileUniversityDirectory,
} from "../../src/lib/university-reconciliation";
import type {
  RegistryAlias,
  RegistryUniversity,
} from "../../src/lib/university-registry-admin";

function draft(partial: Partial<RegistryUniversity>): RegistryUniversity {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "unrelated",
    official_name: "Temporary internal draft",
    country_code: "NG",
    city: null,
    official_website: null,
    summary: null,
    publication_status: "draft",
    verification_status: "pending_review",
    created_at: "2026-10-25T00:00:00Z",
    ...partial,
  };
}

const madinah = "islamic-university-of-madinah";
const malaysia = "international-islamic-university-malaysia";

describe("A1.7 read-only university reconciliation", () => {
  it("keeps all eight public static entries and does not mistake an unrelated NG draft for them", () => {
    const snapshot = reconcileUniversityDirectory(
      [draft({ slug: "ick", official_name: "Y" })],
      [],
    );
    expect(STARTER_UNIVERSITIES).toHaveLength(8);
    expect(snapshot.entries).toHaveLength(8);
    expect(snapshot.unmatched).toBe(8);
    expect(snapshot.candidates).toBe(0);
    expect(snapshot.privateOnly).toHaveLength(1);
    expect(snapshot.privateOnly[0].slug).toBe("ick");
  });

  it("uses an exact canonical slug with matching country as a review candidate", () => {
    const entry = reconcileUniversityDirectory(
      [draft({ slug: madinah, country_code: "SA" })],
      [],
    ).entries.find((row) => row.starter.slug === madinah);
    expect(entry?.status).toBe("candidate");
    expect(entry?.reasons).toContain("canonical slug");
  });

  it("recognizes a country-scoped institution alias without treating acronyms as globally unique", () => {
    const privateDraft = draft({ country_code: "MY", slug: "iium-official", official_name: "A different title" });
    const aliases: RegistryAlias[] = [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        university_id: privateDraft.id,
        alias: "Universiti Islam Antarabangsa Malaysia",
        language_code: "ms",
      },
    ];
    const entry = reconcileUniversityDirectory([privateDraft], aliases).entries.find(
      (row) => row.starter.slug === malaysia,
    );
    expect(entry?.status).toBe("candidate");
    expect(entry?.reasons[0]).toContain("alias");
  });

  it("compares normalized HTTPS hostnames but never matches unrelated domains", () => {
    const privateDraft = draft({
      country_code: "SA",
      official_website: "https://www.iu.edu.sa/some-page",
    });
    const matches = reconcileUniversityDirectory([privateDraft], []);
    const entry = matches.entries.find((row) => row.starter.slug === madinah);
    expect(entry?.status).toBe("candidate");
    expect(entry?.reasons[0]).toContain("hostname");
  });

  it("flags same-slug conflicting country rather than creating a false identity", () => {
    const conflict = draft({ slug: madinah, country_code: "NG" });
    const result = reconcileUniversityDirectory([conflict], []);
    const entry = result.entries.find((row) => row.starter.slug === madinah);
    expect(entry?.status).toBe("country_conflict");
    expect(result.countryConflicts).toBe(1);
    expect(result.privateOnly).toHaveLength(1);
  });

  it("flags multiple matches as ambiguous and does not auto-link either", () => {
    const first = draft({ id: "00000000-0000-4000-8000-000000000001", country_code: "SA", slug: madinah });
    const second = draft({
      id: "00000000-0000-4000-8000-000000000002",
      country_code: "SA",
      slug: "other",
      official_name: "Islamic University of Madinah",
    });
    const result = reconcileUniversityDirectory([first, second], []);
    const entry = result.entries.find((row) => row.starter.slug === madinah);
    expect(entry?.status).toBe("ambiguous");
    expect(result.ambiguous).toBe(1);
    expect(result.privateOnly).toHaveLength(2);
  });

  it("has no write method, no automatic import and never equates source inclusion with verification", () => {
    const result = reconcileUniversityDirectory([], []);
    expect(result.entries.every((row) => row.status === "unmatched")).toBe(true);
    expect(result.privateOnly).toEqual([]);
  });
});

describe("A1.7.2 explicit safe private draft preparation", () => {
  it("preserves existing canonical Madinah slug and never sets any reviewed or publishing state", () => {
    const starter = STARTER_UNIVERSITIES.find(
      (item) => item.slug === "islamic-university-of-madinah",
    );
    expect(starter).toBeDefined();
    if (!starter) throw new Error("Missing canonical public Madinah entry");
    const values = prepareStarterPrivateDraft(starter);
    expect(values.slug).toBe(starter.slug);
    expect(values.country_code).toBe("SA");
    expect(values.official_name).toBe(starter.name);
    expect(values.summary).toBe("");
    expect(Object.keys(values).sort()).toEqual([
      "city",
      "country_code",
      "official_name",
      "official_website",
      "slug",
      "summary",
    ]);
    expect("verification_status" in values).toBe(false);
    expect("publication_status" in values).toBe(false);
    expect("review_status" in values).toBe(false);
  });

  it("does not prefill disputed Niger website or ambiguous multiple-city field", () => {
    const starter = STARTER_UNIVERSITIES.find(
      (item) => item.slug === "islamic-university-in-niger",
    );
    expect(starter).toBeDefined();
    if (!starter) throw new Error("Missing Niger entry");
    const values = prepareStarterPrivateDraft(starter);
    expect(values.slug).toBe(starter.slug);
    expect(values.country_code).toBe("NE");
    expect(values.city).toBe("");
    expect(values.official_website).toBe("");
  });

  it("cannot magically create private records by preparing all public entries", () => {
    const records: RegistryUniversity[] = [];
    const values = STARTER_UNIVERSITIES.map(prepareStarterPrivateDraft);
    expect(values).toHaveLength(8);
    expect(records).toHaveLength(0);
    expect(new Set(values.map((v) => v.slug)).size).toBe(8);
  });
});
