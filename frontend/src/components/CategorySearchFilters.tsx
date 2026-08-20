import { useId } from "react";
import { ChevronDown, Layers, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export type CatNode = {
  id: number;
  name: string;
  name_fr?: string | null;
  children?: CatNode[];
};

type CategorySearchFiltersProps = {
  tree: CatNode[];
  category: string;
  subCategory: string;
  onCategoryChange: (value: string) => void;
  onSubCategoryChange: (value: string) => void;
  /** hero = barre d'accueil | page = filtres annonces/carte */
  variant?: "hero" | "page";
  /** stack = mobile (grille) | inline = desktop (ligne) */
  layout?: "stack" | "inline";
  className?: string;
};

const FALLBACK_CATEGORIES = [
  { id: "immobilier", label: "Immobilier" },
  { id: "services", label: "Services" },
  { id: "avendre", label: "À vendre" },
];

/**
 * Styles partagés pour les <select> natifs.
 * On utilise des selects natifs (pas Radix UI) pour éviter les erreurs Portal
 * causées par les extensions navigateur (Google Translate, etc.).
 */
const baseSelectClass =
  "w-full appearance-none bg-transparent border-0 outline-none cursor-pointer pr-8 text-sm font-medium text-foreground focus:ring-0";

/** Wrapper stylisé autour d'un <select> natif */
function NativeSelect({
  id,
  name,
  value,
  onChange,
  disabled,
  children,
  className,
  placeholder,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  placeholder?: string;
}) {
  return (
    <div className={cn("relative w-full", className)}>
      <select
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          baseSelectClass,
          "h-full pl-3 pr-8 py-0 text-xs",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label={placeholder}
      >
        {children}
      </select>
      {/* Icône chevron personnalisée */}
      <ChevronDown
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",
          disabled && "opacity-40"
        )}
      />
    </div>
  );
}

export function CategorySearchFilters({
  tree,
  category,
  subCategory,
  onCategoryChange,
  onSubCategoryChange,
  variant = "hero",
  layout = "stack",
  className,
}: CategorySearchFiltersProps) {
  // useId() garantit des IDs uniques même si le composant est monté plusieurs fois
  const uid = useId();
  const catId = `${uid}-category`;
  const subId = `${uid}-subcategory`;

  const selectedParent = tree.find((c) => String(c.id) === category);
  const subcats = selectedParent?.children ?? [];
  const hasSubcats = subcats.length > 0;
  const subEnabled = category !== "all" && hasSubcats;
  const isHero = variant === "hero";
  const isInline = layout === "inline";

  const subPlaceholder =
    category === "all"
      ? "Choisir une catégorie"
      : hasSubcats
        ? "Toutes les sous-catégories"
        : "Aucune sous-catégorie";

  const labelClass =
    "text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 mb-1 text-muted-foreground";

  // Classes du wrapper du select selon variante
  const wrapperClass = cn(
    "relative",
    isHero
      ? isInline
        ? "h-10 hover:bg-secondary/30 transition-colors"
        : "h-9 bg-secondary/40 hover:bg-secondary/60 rounded-lg transition-colors"
      : "h-9 bg-card border border-border rounded-lg"
  );

  const categoryField = (
    <div className={cn("min-w-0", isInline && "shrink-0 min-w-[140px] lg:min-w-[170px]")}>
      {!isInline && (
        <label htmlFor={catId} className={labelClass}>
          <Layers className="w-3 h-3 text-accent shrink-0" />
          Catégorie
        </label>
      )}
      <div className={wrapperClass}>
        <NativeSelect
          id={catId}
          name="listing_category_filter"
          value={category}
          onChange={onCategoryChange}
          placeholder="Toutes les catégories"
          className="h-full"
        >
          <option value="all">Toutes les catégories</option>
          {tree.length > 0
            ? tree.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
                  {cat.name_fr || cat.name}
                </option>
              ))
            : FALLBACK_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
        </NativeSelect>
      </div>
    </div>
  );

  const subcategoryField = (
    <div
      className={cn(
        "min-w-0",
        isInline && "shrink-0 min-w-[140px] lg:min-w-[170px] border-l border-border"
      )}
    >
      {!isInline && (
        <label htmlFor={subId} className={labelClass}>
          <Tag className="w-3 h-3 text-accent shrink-0" />
          Sous-catégorie
        </label>
      )}
      <div className={wrapperClass}>
        <NativeSelect
          id={subId}
          name="listing_subcategory_filter"
          value={subEnabled ? subCategory : "all"}
          onChange={onSubCategoryChange}
          disabled={!subEnabled}
          placeholder={subPlaceholder}
          className="h-full"
        >
          <option value="all">
            {hasSubcats ? "Toutes les sous-catégories" : subPlaceholder}
          </option>
          {subcats.map((sub) => (
            <option key={sub.id} value={String(sub.id)}>
              {sub.name_fr || sub.name}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );

  if (isInline) {
    return (
      <div className={cn("flex items-stretch h-14", className)}>
        {categoryField}
        {subcategoryField}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {categoryField}
      {subcategoryField}
    </div>
  );
}

/** Résumé compact des filtres actifs (mobile) */
export function CategoryFilterSummary({
  tree,
  category,
  subCategory,
}: {
  tree: CatNode[];
  category: string;
  subCategory: string;
}) {
  if (category === "all") return null;
  const parent = tree.find((c) => String(c.id) === category);
  const sub =
    subCategory !== "all"
      ? parent?.children?.find((c) => String(c.id) === subCategory)
      : null;
  const label = sub
    ? `${parent?.name_fr || parent?.name} › ${sub.name_fr || sub.name}`
    : parent?.name_fr || parent?.name;

  if (!label) return null;

  return (
    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2 px-1">
      <ChevronDown className="w-3 h-3 rotate-[-90deg] text-accent" />
      <span className="truncate">{label}</span>
    </p>
  );
}
