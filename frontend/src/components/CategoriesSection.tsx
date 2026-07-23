import { Link } from "react-router-dom";

const categories = [
  { name: "Immobilier", count: 2, image: "/category-immobilier.jpg", description: "Maisons, appartements, terrains" },
  { name: "Services", count: 4, image: "/category-services.jpg", description: "Nettoyage, soudage, jardinage" },
  { name: "À vendre", count: 1, image: "/category-avendre.jpg", description: "Électronique, meubles, véhicules" },
];

const CategoriesSection = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="w-12 h-1 bg-accent mx-auto mb-4 rounded-full" />
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Catégories principales
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <Link
              to={`/annonces?category=${encodeURIComponent(cat.name)}`}
              key={cat.name}
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
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent" />
              {/* Badge */}
              <span className="absolute top-4 left-4 bg-primary/80 backdrop-blur text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                {cat.count} ANNONCE{cat.count > 1 ? "S" : ""}
              </span>
              {/* Text */}
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-xl font-display font-bold text-primary-foreground">{cat.name}</h3>
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
