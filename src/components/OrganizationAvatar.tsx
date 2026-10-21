import { useState } from "react";
import {
  Award,
  Briefcase,
  Building2,
  Compass,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OrganizationAvatarProps {
  name: string;
  category?: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Palettes masu saukin gani da kwarewa a Light da Dark mode */
const COLOR_PALETTES = [
  {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/25",
  },
  {
    bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-500/25",
  },
  {
    bg: "bg-sky-500/10 dark:bg-sky-500/15",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-500/25",
  },
  {
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/25",
  },
  {
    bg: "bg-violet-500/10 dark:bg-violet-500/15",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-500/25",
  },
  {
    bg: "bg-rose-500/10 dark:bg-rose-500/15",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-500/25",
  },
  {
    bg: "bg-teal-500/10 dark:bg-teal-500/15",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-500/25",
  },
  {
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500/25",
  },
];

/** Ciro haruffan farko na kungiya (Monogram) */
function getMonogram(name: string): string {
  if (!name || !name.trim()) return "ICK";
  const clean = name.replace(/[^\w\s]/g, " ").trim();
  const words = clean.split(/\s+/).filter(Boolean);

  const first = words[0];
  const second = words[1];
  if (first && second && first[0] && second[0]) {
    return (first[0] + second[0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

/** Tabbatar da kala iri daya a kowane lokaci ga wannan kungiyar */
function getPalette(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % COLOR_PALETTES.length;
  return COLOR_PALETTES[index] ?? COLOR_PALETTES[0]!;
}


/** Karamar alamar nau'in dama */
function CategoryIcon({ category, size }: { category?: string; size: "sm" | "md" | "lg" }) {
  const iconSize = size === "lg" ? "h-3.5 w-3.5" : "h-2.5 w-2.5";
  const cat = category?.toLowerCase();

  if (cat === "scholarship") return <GraduationCap className={iconSize} />;
  if (cat === "job") return <Briefcase className={iconSize} />;
  if (cat === "internship") return <Compass className={iconSize} />;
  if (cat === "grant") return <Award className={iconSize} />;
  return <Building2 className={iconSize} />;
}

export function OrganizationAvatar({
  name,
  category,
  logoUrl,
  size = "md",
  className,
}: OrganizationAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const monogram = getMonogram(name);
  const palette = getPalette(name);

  const sizeClasses = {
    sm: "h-9 w-9 text-xs rounded-lg",
    md: "h-11 w-11 text-sm rounded-xl",
    lg: "h-14 w-14 text-base rounded-2xl",
  };

  const badgeSizeClasses = {
    sm: "h-4 w-4 -bottom-1 -right-1",
    md: "h-5 w-5 -bottom-1 -right-1",
    lg: "h-6 w-6 -bottom-1 -right-1",
  };

  return (
    <div className={cn("relative shrink-0 select-none", className)}>
      <div
        className={cn(
          "flex items-center justify-center font-display font-bold tracking-tight border transition-transform shadow-2xs",
          sizeClasses[size],
          palette.bg,
          palette.text,
          palette.border
        )}
        title={name}
        aria-label={name}
      >
        {logoUrl && !imageError ? (
          <img
            src={logoUrl}
            alt={name}
            className="h-full w-full object-contain p-1 rounded-inherit"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <span>{monogram}</span>
        )}
      </div>

      {category && (
        <span
          className={cn(
            "absolute flex items-center justify-center rounded-full border border-background bg-card text-muted-foreground shadow-2xs",
            badgeSizeClasses[size]
          )}
          title={`Category: ${category}`}
        >
          <CategoryIcon category={category} size={size} />
        </span>
      )}
    </div>
  );
}
