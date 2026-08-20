import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listingsAPI } from "@/services/api";

type CategoryCard = {
  id: number;
  name: string;
  icon?: string | null;
  description: string;
  image: string;
  childrenCount: number;
};

const fallbackCategories: CategoryCard[] = [
  {
    id: 1,
    name: "Immobilier",
    description: "Maisons, appartements, terrains",
    image: "/category-immobilier.jpg",
    childrenCount: 0,
  },
  {
    id: 2,
    name: "A vendre",
    description: "Electronique, meubles, vehicules",
    image: "/category-avendre.jpg",
    childrenCount: 0,
  },
  {
    id: 3,
    name: "Services",
    description: "Nettoyage, soudage, jardinage",
    image: "/category-services.jpg",
    childrenCount: 0,
  },
];

function getCategoryImage(name: string) {
  const normalizedName = name.toLowerCase();
  if (normalizedName.includes("immobilier")) return "/category-immobilier.jpg";
  if (normalizedName.includes("service")) return "/category-services.jpg";
  return "/category-avendre.jpg";
}

const CategoriesSection = () => {
  const [categories, setCategories] = useState<CategoryCard[]>(fallbackCategories);

  useEffect(() => {
    listingsAPI
      .getCategoriesTree()
      .then((res) => {
        if (!Array.isArray(res.data) || res.data.length === 0) return;
        setCategories(
          res.data.slice(0, 6).map((cat: any) => {
            const name = cat.name_fr || cat.name || "Categorie";
            const childrenCount = Array.isArray(cat.children) ? cat.children.length : 0;
            return {
              id: cat.id,
              name,
              icon: cat.icon,
              description:
                childrenCount > 0
                  ? `${childrenCount} sous-categorie${childrenCount > 1 ? "s" : ""}`
                  : "Voir les annonces disponibles",
              image: getCategoryImage(name),
              childrenCount,
            };
          })
        );
      })
      .catch(() => {});
  }, []);

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="w-12 h-1 bg-accent mx-auto mb-4 rounded-full" />
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Categories principales
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <Link
              to={`/annonces?category=${cat.id}`}
              key={cat.id}
              className="group relative rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent" />
              <span className="absolute top-4 left-4 bg-primary/80 backdrop-blur text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                {cat.childrenCount > 0 ? `${cat.childrenCount} SOUS-CAT.` : "CATEGORIE"}
              </span>
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-xl font-display font-bold text-primary-foreground">
                  {cat.icon ? `${cat.icon} ` : ""}
                  {cat.name}
                </h3>
                <p className="text-sm text-primary-foreground/70 mt-1">{cat.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
