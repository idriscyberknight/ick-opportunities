import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, LayoutGrid } from "lucide-react";
import type { OpportunityCategory } from "@/lib/opportunities";

const categories: { value: "all" | OpportunityCategory; label: string }[] = [
  { value: "all", label: "All categories" },
  { value: "scholarship", label: "Scholarships" },
  { value: "job", label: "Jobs" },
  { value: "internship", label: "Internships" },
  { value: "grant", label: "Grants" },
];

const quickFilters = [
  "Software engineering",
  "Fully funded",
  "Remote",
  "Graduate trainee",
];

const fieldClass =
  "w-full appearance-none rounded-lg border border-input bg-background py-3 pl-10 pr-3 text-[15px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-ring/15";

export function SearchSection() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | OpportunityCategory>("all");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate({
      to: "/opportunities",
      search: {
        q: q || undefined,
        category: category === "all" ? undefined : category,
      },
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_12px_40px_-24px_rgba(16,24,40,0.45)] sm:p-5">
      <form
        onSubmit={handleSearch}
        className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] lg:items-center"
      >
        <div className="relative">
          <label htmlFor="search-query" className="sr-only">
            What are you looking for?
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="search-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search opportunities, roles or funders"
            className={fieldClass}
          />
        </div>

        <div className="relative">
          <label htmlFor="search-category" className="sr-only">
            Category
          </label>
          <LayoutGrid className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            id="search-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as "all" | OpportunityCategory)}
            className={fieldClass}
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-6 py-3 text-[15px] font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:w-auto"
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Popular
        </span>
        {quickFilters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setQuery(filter)}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-secondary/40 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {filter}
          </button>
        ))}
      </div>
    </div>
  );
}
