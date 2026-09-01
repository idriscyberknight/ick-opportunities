import { useState } from "react";
import { Search, MapPin, SlidersHorizontal } from "lucide-react";

const categories = [
  { value: "all", label: "All Opportunities" },
  { value: "scholarships", label: "Scholarships" },
  { value: "jobs", label: "Jobs" },
  { value: "internships", label: "Internships" },
  { value: "grants", label: "Grants" },
];

const locations = [
  { value: "any", label: "Any Location" },
  { value: "nigeria", label: "Nigeria" },
  { value: "remote", label: "Remote" },
  { value: "abroad", label: "Abroad" },
];

export function SearchSection() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("any");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder: in a later step this will route to a filtered opportunities page.
    // eslint-disable-next-line no-console
    console.log("Search:", { query, category, location });
  };

  return (
    <section className="w-full bg-background py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <form onSubmit={handleSearch} className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-2">
              <label htmlFor="search-query" className="text-sm font-medium text-foreground">
                What are you looking for?
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="search-query"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. software engineering internship"
                  className="w-full rounded-md border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>

            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="search-category" className="text-sm font-medium text-foreground">
                  Category
                </label>
                <div className="relative">
                  <SlidersHorizontal className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    id="search-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full appearance-none rounded-md border border-input bg-background py-2.5 pl-10 pr-8 text-sm text-foreground outline-none ring-offset-background transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="search-location" className="text-sm font-medium text-foreground">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    id="search-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full appearance-none rounded-md border border-input bg-background py-2.5 pl-10 pr-8 text-sm text-foreground outline-none ring-offset-background transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                  >
                    {locations.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-secondary px-6 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/90 lg:w-auto"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
