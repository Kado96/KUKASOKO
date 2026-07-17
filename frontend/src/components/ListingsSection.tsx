import { Star, MapPin, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { allListings } from "@/data/listings";

const listings = allListings.slice(0, 3);

const ListingsSection = () => {
  return (
    <section className="py-16 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="w-12 h-1 bg-accent mx-auto mb-4 rounded-full" />
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Annonces récentes
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <Link
              to={`/annonces/${listing.id}`}
              key={listing.id}
              className="bg-card rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer group"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={listing.image}
                  alt={listing.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground border-0 font-semibold text-xs">
                  {listing.category}
                </Badge>
              </div>

              <div className="p-5">
                <h3 className="font-sans font-semibold text-foreground text-lg mb-2 group-hover:text-accent transition-colors">
                  {listing.title}
                </h3>

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < Math.floor(listing.rating) ? "text-accent fill-accent" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {listing.rating.toFixed(1)} ({listing.reviews})
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                  <Calendar className="w-3.5 h-3.5" />
                  Ajouté le {listing.date}
                </div>

                <div className="border-t border-border pt-3 space-y-1.5">
                  {listing.details.map((d) => (
                    <div key={d.label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{d.label}</span>
                      <span className="font-medium text-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ListingsSection;
