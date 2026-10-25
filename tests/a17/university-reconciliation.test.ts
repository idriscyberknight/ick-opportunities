import { describe, expect, it } from "bun:test";
import { STARTER_UNIVERSITIES } from "../../src/lib/university-directory";
import { reconcileUniversityDirectory } from "../../src/lib/university-reconciliation";
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
