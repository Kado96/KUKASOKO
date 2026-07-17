import { useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Star, Calendar, Heart, MessageSquare, Flag, CheckCircle, MapPin, Navigation2 } from "lucide-react";
import LocationMap from "@/components/LocationMap";
import DeliveryLocation from "@/components/DeliveryLocation";
import PickupItinerary from "@/components/PickupItinerary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { allListings } from "@/data/listings";
import { toast } from "@/hooks/use-toast";

const AnnonceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"details" | "avis">("details");
  const [showPickup, setShowPickup] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [claimText, setClaimText] = useState("");
  const [reportText, setReportText] = useState("");
  const reviewFormRef = useRef<HTMLDivElement>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const listing = allListings.find((l) => l.id === Number(id));
  const similarListings = allListings.filter((l) => l.id !== listing?.id && l.category === listing?.category).slice(0, 2);

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast({ title: !isFavorite ? "Ajouté aux favoris ❤️" : "Retiré des favoris" });
  };

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-16">
          <div className="container mx-auto px-4 py-20 text-center">
            <h1 className="text-2xl font-display font-bold text-foreground mb-4">Annonce introuvable</h1>
            <Link to="/annonces" className="text-accent hover:underline">Retour aux annonces</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2">
              <Badge className="bg-accent text-accent-foreground border-0 font-semibold text-xs mb-3">
                {listing.category}
              </Badge>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
                {listing.title}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                AJOUTÉ LE {listing.date.toUpperCase()}
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(listing.rating) ? "text-accent fill-accent" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">{listing.rating.toFixed(1)} ({listing.reviews})</span>
              </div>

              {/* Tabs */}
              <div className="flex items-center justify-between border-b border-border mb-6">
                <div className="flex gap-6">
                  <button onClick={() => setActiveTab("details")} className={`pb-3 border-b-2 font-medium text-sm transition-colors ${activeTab === "details" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Détails</button>
                  <button onClick={() => setActiveTab("avis")} className={`pb-3 border-b-2 font-medium text-sm transition-colors ${activeTab === "avis" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Avis</button>
                </div>
                <button onClick={handleFavorite} className={`flex items-center gap-1 text-sm transition-colors pb-3 ${isFavorite ? "text-red-500" : "text-muted-foreground hover:text-accent"}`}>
                  <Heart className={`w-4 h-4 ${isFavorite ? "fill-red-500" : ""}`} /> {isFavorite ? "Favori" : "Ajouter aux favoris"}
                </button>
              </div>

              {activeTab === "details" && (
                <>
                  {/* Image */}
                  <div className="rounded-xl overflow-hidden mb-6">
                    <img src={listing.image} alt={listing.title} className="w-full aspect-[16/10] object-cover" />
                  </div>

                  {/* Details */}
                  <div className="flex flex-wrap gap-x-12 gap-y-2 mb-6">
                    {listing.details.map((d) => (
                      <div key={d.label} className="text-sm">
                        <span className="font-medium text-foreground">{d.label}:</span>{" "}
                        <span className="text-muted-foreground">{d.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground text-sm leading-relaxed mb-10">
                    {listing.description}
                  </p>
                </>
              )}

              {activeTab === "avis" && (
                <div className="mb-10">
                  <div className="w-10 h-1 bg-accent rounded-full mb-4" />
                  <h2 className="text-xl font-display font-bold text-foreground mb-6">Avis</h2>
                  <div className="space-y-4">
                    {listing.reviewsList.map((review) => (
                      <div key={review.id} className="bg-secondary/50 rounded-xl p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm">
                            {review.author.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">{review.author}</p>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${i < review.rating ? "text-accent fill-accent" : "text-muted-foreground/30"}`} />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">{review.date}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar Listings */}
              {similarListings.length > 0 && (
                <div>
                  <div className="w-10 h-1 bg-accent rounded-full mb-4" />
                  <h2 className="text-xl font-display font-bold text-foreground mb-6">Annonces similaires</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {similarListings.map((sl) => (
                      <Link to={`/annonces/${sl.id}`} key={sl.id} className="bg-card rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow group">
                        <div className="relative aspect-[16/10] overflow-hidden">
                          <img src={sl.image} alt={sl.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground border-0 text-xs font-semibold">{sl.category}</Badge>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors flex items-center gap-1">
                            {sl.title} <CheckCircle className="w-4 h-4 text-green-500" />
                          </h3>
                          <div className="text-xs text-muted-foreground mt-1">AJOUTÉ LE {sl.date.toUpperCase()}</div>
                          <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < Math.floor(sl.rating) ? "text-accent fill-accent" : "text-muted-foreground/30"}`} />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">{sl.rating.toFixed(1)} ({sl.reviews})</span>
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-muted-foreground">
                            {sl.details.map((d) => (
                              <span key={d.label}><span className="font-medium text-foreground">{d.label}:</span> {d.value}</span>
                            ))}
                          </div>
                          <div className="text-sm font-semibold text-foreground mt-2">{sl.price}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                <div className="bg-card rounded-xl border border-border p-6 text-center">
                  <p className="text-xl font-bold text-foreground mb-4">{listing.price}</p>
                  <Button
                    onClick={() => { navigate("/messages"); toast({ title: "Discussion ouverte 💬" }); }}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold gap-2"
                  >
                    <MessageSquare className="w-4 h-4" /> Discuter avec le vendeur
                  </Button>
                </div>

                {/* Je vais récupérer */}
                <div className="bg-card rounded-xl border border-border p-5">
                  <button
                    onClick={() => setShowPickup(!showPickup)}
                    className="w-full flex items-center justify-between font-semibold text-foreground text-sm mb-3"
                  >
                    <span className="flex items-center gap-2">
                      <Navigation2 className="w-4 h-4 text-accent" /> 🚶 Je vais récupérer
                    </span>
                    <span className="text-xs text-muted-foreground">{showPickup ? "−" : "+"}</span>
                  </button>
                  {showPickup && <PickupItinerary destination={listing.location} />}
                </div>

                {/* Localisation de la boutique */}
                <div className="bg-card rounded-xl border border-border p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-accent" />
                    <h3 className="font-semibold text-foreground text-sm">Localisation</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{listing.location.address}</p>
                  <LocationMap lat={listing.location.lat} lng={listing.location.lng} label={listing.title} />
                </div>

                {/* Livraison - géolocalisation client */}
                <div className="bg-card rounded-xl border border-border p-5">
                  <h3 className="font-semibold text-foreground text-sm mb-3">🚚 Livraison</h3>
                  <p className="text-xs text-muted-foreground mb-3">Partagez votre position pour que le vendeur puisse vous livrer.</p>
                  <DeliveryLocation />
                </div>

                <div className="bg-card rounded-xl border border-border p-5 space-y-3">
                  <button onClick={() => { setShowReviewForm(!showReviewForm); setActiveTab("avis"); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors w-full">
                    <Star className="w-4 h-4" /> Rédiger un avis
                  </button>
                  <button onClick={() => setShowClaimForm(!showClaimForm)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors w-full">
                    <MessageSquare className="w-4 h-4" /> Réclamer l'annonce
                  </button>
                  <button onClick={() => setShowReportForm(!showReportForm)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors w-full">
                    <Flag className="w-4 h-4" /> Signaler l'annonce
                  </button>
                </div>

                {/* Review Form */}
                {showReviewForm && (
                  <div ref={reviewFormRef} className="bg-card rounded-xl border border-border p-5 space-y-3">
                    <h4 className="font-semibold text-foreground text-sm">Rédiger un avis</h4>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button key={i} onClick={() => setReviewRating(i + 1)}>
                          <Star className={`w-5 h-5 cursor-pointer ${i < reviewRating ? "text-accent fill-accent" : "text-muted-foreground/30"}`} />
                        </button>
                      ))}
                    </div>
                    <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Votre avis..." className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent min-h-[80px] resize-none" maxLength={500} />
                    <Button onClick={() => { if (!reviewRating || !reviewText.trim()) { toast({ title: "Erreur", description: "Veuillez donner une note et écrire un commentaire." }); return; } toast({ title: "Avis envoyé ✅", description: "Merci pour votre avis !" }); setShowReviewForm(false); setReviewRating(0); setReviewText(""); }} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-semibold">Envoyer l'avis</Button>
                  </div>
                )}

                {/* Claim Form */}
                {showClaimForm && (
                  <div className="bg-card rounded-xl border border-border p-5 space-y-3">
                    <h4 className="font-semibold text-foreground text-sm">Réclamer l'annonce</h4>
                    <p className="text-xs text-muted-foreground">Expliquez pourquoi vous réclamez cette annonce.</p>
                    <textarea value={claimText} onChange={(e) => setClaimText(e.target.value)} placeholder="Votre message..." className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent min-h-[80px] resize-none" maxLength={500} />
                    <Button onClick={() => { if (!claimText.trim()) { toast({ title: "Erreur", description: "Veuillez écrire un message." }); return; } toast({ title: "Réclamation envoyée ✅", description: "Nous traiterons votre demande." }); setShowClaimForm(false); setClaimText(""); }} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-semibold">Envoyer la réclamation</Button>
                  </div>
                )}

                {/* Report Form */}
                {showReportForm && (
                  <div className="bg-card rounded-xl border border-border p-5 space-y-3">
                    <h4 className="font-semibold text-foreground text-sm">Signaler l'annonce</h4>
                    <p className="text-xs text-muted-foreground">Décrivez le problème avec cette annonce.</p>
                    <textarea value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder="Raison du signalement..." className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent min-h-[80px] resize-none" maxLength={500} />
                    <Button onClick={() => { if (!reportText.trim()) { toast({ title: "Erreur", description: "Veuillez décrire le problème." }); return; } toast({ title: "Signalement envoyé ✅", description: "Merci, nous examinerons cette annonce." }); setShowReportForm(false); setReportText(""); }} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-semibold">Envoyer le signalement</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AnnonceDetail;
