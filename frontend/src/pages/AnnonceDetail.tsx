import { useState, useRef, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Star, Calendar, Heart, MessageSquare, Flag, CheckCircle, MapPin, Navigation2, Loader2 } from "lucide-react";
import LocationMap from "@/components/LocationMap";
import DeliveryLocation from "@/components/DeliveryLocation";
import PickupItinerary from "@/components/PickupItinerary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { allListings } from "@/data/listings";
import { toast } from "@/hooks/use-toast";
import ShareModal from "@/components/ShareModal";
import { TemplateStudioModal } from "@/components/TemplateStudioModal";
import { reviewsAPI, listingsAPI, API_BASE } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

const AnnonceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"details" | "avis">("details");
  const [showPickup, setShowPickup] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [claimText, setClaimText] = useState("");
  const [reportText, setReportText] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [apiReviews, setApiReviews] = useState<Array<{ id: number; reviewer_name: string; rating: number; comment: string; created_at: string }>>([]);
  const reviewFormRef = useRef<HTMLDivElement>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);

  // Nouvel état pour l'annonce chargée dynamiquement
  const [listing, setListing] = useState<any>(null);
  const [loadingListing, setLoadingListing] = useState(true);

  // Charger l'annonce depuis l'API ou utiliser les mocks
  useEffect(() => {
    if (!id) return;
    setLoadingListing(true);

    listingsAPI.getOne(Number(id))
      .then((res) => {
        if (res.data) {
          const l = res.data;
          setListing({
            id: l.id,
            title: l.title,
            description: l.description,
            price: l.price > 0 ? `${l.price.toLocaleString("fr-BI")} ${l.currency || "BIF"}` : "Sur devis",
            image: (() => {
              const rawImg = l.image || (l.image_urls ? l.image_urls.split(",")[0] : null);
              if (!rawImg) {
                if (l.seller?.avatar_url) {
                  const avatar = l.seller.avatar_url;
                  if (avatar.startsWith("http://") || avatar.startsWith("https://")) return avatar;
                  return `${API_BASE}/${avatar}`;
                }
                const cat = (l.category?.name_fr || l.category?.name || "").toLowerCase();
                if (cat.includes("immobilier")) return `${API_BASE}/media/listing/category-immobilier.jpg`;
                if (cat.includes("service")) return `${API_BASE}/media/listing/category-services.jpg`;
                return `${API_BASE}/media/listing/category-avendre.jpg`;
              }
              if (rawImg.startsWith("http://") || rawImg.startsWith("https://")) return rawImg;
              return `${API_BASE}/${rawImg}`;
            })(),
            image_urls: l.image_urls || l.image || "",
            category: l.category?.name_fr || l.category?.name || "À vendre",
            rating: 5.0,
            reviews: 0,
            date: new Date(l.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
            details: [
              { label: "Localisation", value: l.address || l.city || "Bujumbura" }
            ],
            // On conserve les coordonnées GPS pour la carte
            latitude: l.latitude,
            longitude: l.longitude,
            location: {
              lat: l.latitude || -3.38,
              lng: l.longitude || 29.36,
              address: l.address || l.city || "Bujumbura"
            }
          });
        }
        setLoadingListing(false);
      })
      .catch((err) => {
        console.warn("Annonce non trouvée en API, recherche dans les mocks...", err);
        const mock = allListings.find((l) => l.id === Number(id));
        if (mock) {
          setListing(mock);
        }
        setLoadingListing(false);
      });
  }, [id]);

  const similarListings = allListings.filter((l) => l.id !== listing?.id && l.category === listing?.category).slice(0, 2);

  // Load existing reviews from backend and reset carousel index
  useEffect(() => {
    if (!id) return;
    setCurrentPhotoIdx(0);
    reviewsAPI.getReviews(Number(id))
      .then((res) => setApiReviews(res.data))
      .catch(() => {/* silently ignore if API not reachable */});
  }, [id]);

  // Autoplay timer for detail images (3s)
  useEffect(() => {
    if (!listing) return;
    const API_BASE_URL = API_BASE;
    const norm = (url: string) => {
      if (!url || !url.trim()) return "";
      if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
      if (url.startsWith("/assets/") || url.startsWith("/category-") || url.startsWith("assets/")) {
        return url.startsWith("/") ? url : `/${url}`;
      }
      if (url.startsWith("/") && !url.startsWith("/media") && !url.startsWith("/uploads")) {
        return url;
      }
      const cleanUrl = url.replace(/^\//, "");
      if (cleanUrl.startsWith("media") || cleanUrl.startsWith("uploads")) {
        return `${API_BASE_URL}/${cleanUrl}`;
      }
      return url;
    };
    const photos: string[] = [];
    if (listing.image?.trim()) photos.push(norm(listing.image.trim()));
    if ((listing as any).image_urls) {
      (listing as any).image_urls.split(",").forEach((u: string) => {
        const n = norm(u.trim());
        if (n && !photos.includes(n)) photos.push(n);
      });
    }

    if (photos.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentPhotoIdx((prev) => (prev + 1) % photos.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [id, listing]);


  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast({ title: !isFavorite ? "Ajouté aux favoris ❤️" : "Retiré des favoris" });
  };

  if (loadingListing) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center pt-16">
          <div className="text-center space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-[#febb2d] mx-auto" />
            <p className="text-sm text-muted-foreground">Chargement de l'annonce...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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

              {/* Tabs and Actions bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 mb-6 gap-4">
                <div className="flex gap-6">
                  <button onClick={() => setActiveTab("details")} className={`pb-2 border-b-2 font-medium text-sm transition-colors ${activeTab === "details" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Détails</button>
                  <button onClick={() => setActiveTab("avis")} className={`pb-2 border-b-2 font-medium text-sm transition-colors ${activeTab === "avis" ? "border-accent text-accent text-accent font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Avis</button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={() => setShowStudioModal(true)}
                    size="sm"
                    className="bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-bold gap-1.5 text-xs shadow-sm"
                  >
                    ✨ Studio Multi-Canaux
                  </Button>
                  <button onClick={handleFavorite} className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border transition-colors ${isFavorite ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:text-accent hover:bg-secondary"}`}>
                    <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-red-500" : ""}`} /> {isFavorite ? "Favori" : "Favoris"}
                  </button>
                </div>
              </div>

              {activeTab === "details" && (
                <>
                  {/* Image Carousel with 3s Autoplay */}
                  <div className="rounded-xl overflow-hidden mb-6 relative group bg-secondary/30">
                    {(() => {
                      const API_BASE_URL = API_BASE;
                      const norm = (url: string) => {
                        if (!url || !url.trim()) return "";
                        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
                        if (url.startsWith("/") && !url.startsWith("/media") && !url.startsWith("/uploads")) {
                          return url;
                        }
                        const cleanUrl = url.replace(/^\//, "");
                        if (cleanUrl.startsWith("media") || cleanUrl.startsWith("uploads")) {
                          return `${API_BASE}/${cleanUrl}`;
                        }
                        return url;
                      };
                      
                      const photos: string[] = [];
                      if (listing.image?.trim()) photos.push(norm(listing.image.trim()));
                      if ((listing as any).image_urls) {
                        (listing as any).image_urls.split(",").forEach((u: string) => {
                          const n = norm(u.trim());
                          if (n && !photos.includes(n)) photos.push(n);
                        });
                      }

                      if (photos.length === 0) {
                        return (
                          <div className="w-full aspect-[16/10] flex flex-col items-center justify-center text-muted-foreground">
                            <span className="text-4xl">📷</span>
                            <span className="text-xs mt-2">Aucune image disponible</span>
                          </div>
                        );
                      }

                      const safeIdx = Math.max(0, Math.min(currentPhotoIdx, photos.length - 1));

                      return (
                        <div className="relative w-full aspect-[16/10]">
                          <img
                            src={photos[safeIdx]}
                            alt={listing.title}
                            className="w-full h-full object-cover transition-all duration-500"
                          />
                          {photos.length > 1 && (
                            <>
                              {/* Left arrow */}
                              <button
                                onClick={() => setCurrentPhotoIdx((prev) => (prev - 1 + photos.length) % photos.length)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/45 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/60 transition-colors text-lg"
                              >
                                ‹
                              </button>
                              {/* Right arrow */}
                              <button
                                onClick={() => setCurrentPhotoIdx((prev) => (prev + 1) % photos.length)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/45 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/60 transition-colors text-lg"
                              >
                                ›
                              </button>
                              {/* Indicator Dots */}
                              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                                {photos.map((_, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setCurrentPhotoIdx(i)}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${i === safeIdx ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}
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
                  <h2 className="text-xl font-display font-bold text-foreground mb-6">
                    Avis {apiReviews.length > 0 && <span className="text-base font-normal text-muted-foreground">({apiReviews.length})</span>}
                  </h2>
                  <div className="space-y-4">
                    {apiReviews.length > 0 ? (
                      apiReviews.map((review) => (
                        <div key={review.id} className="bg-secondary/50 rounded-xl p-5">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center font-semibold text-sm">
                              {review.reviewer_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground text-sm">{review.reviewer_name}</p>
                              <div className="flex items-center gap-2">
                                <div className="flex gap-0.5">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} className={`w-3 h-3 ${i < review.rating ? "text-accent fill-accent" : "text-muted-foreground/30"}`} />
                                  ))}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(review.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="text-muted-foreground text-sm leading-relaxed">{review.comment}</p>
                        </div>
                      ))
                    ) : listing.reviewsList.length > 0 ? (
                      listing.reviewsList.map((review) => (
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
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Star className="w-8 h-8 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Aucun avis pour le moment.</p>
                        <button
                          onClick={() => { setShowReviewForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                          className="mt-2 text-xs text-accent hover:underline"
                        >
                          Soyez le premier à laisser un avis !
                        </button>
                      </div>
                    )}
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
                <div className="bg-card rounded-xl border border-border p-6 text-center space-y-3">
                  <p className="text-xl font-bold text-foreground">{listing.price}</p>
                  <Button
                    onClick={() => {
                      const sellerId = (listing as any).seller_id || 1; // Partner user ID
                      navigate(`/messages?user=${sellerId}`);
                      toast({ title: "Discussion ouverte 💬" });
                    }}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold gap-2"
                  >
                    <MessageSquare className="w-4 h-4" /> Discuter avec le vendeur
                  </Button>

                  <Button
                    onClick={() => setShowStudioModal(true)}
                    className="w-full bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-bold gap-2 text-xs shadow-md"
                  >
                    ✨ Studio Multi-Canaux (IG, FB, WA, XML)
                  </Button>
                </div>

                {/* Je vais récupérer (Design Conforme) */}
                <div className="bg-card rounded-2xl border border-border/60 shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-4 transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                  <button
                    onClick={() => setShowPickup(!showPickup)}
                    className="w-full flex items-center justify-between font-sans font-medium text-foreground text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-500 transform rotate-[45deg]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="3 11 22 2 13 21 11 13 3 11" />
                      </svg>
                      <span className="text-base">🚶</span>
                      <span className="text-foreground font-semibold">Je vais récupérer</span>
                    </span>
                    <span className="text-muted-foreground/60 text-xs font-light mr-1">{showPickup ? "−" : "+"}</span>
                  </button>
                  {showPickup && (
                    <div className="mt-4 pt-3 border-t border-border/40">
                      <PickupItinerary destination={listing.location || { lat: -3.3822, lng: 29.3644, address: "Bujumbura" }} />
                    </div>
                  )}
                </div>

                {/* Localisation de la boutique */}
                <div className="bg-card rounded-xl border border-border p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-accent" />
                    <h3 className="font-semibold text-foreground text-sm">Localisation</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{listing.location?.address || "Bujumbura"}</p>
                  <LocationMap lat={listing.location?.lat || -3.3822} lng={listing.location?.lng || 29.3644} label={listing.title} />
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
                    <textarea id="review-text" name="review-text" value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Votre avis..." className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent min-h-[80px] resize-none" maxLength={500} />
                  <Button
                    disabled={reviewLoading}
                    onClick={async () => {
                      if (!user) { toast({ title: "Connexion requise", description: "Connectez-vous pour laisser un avis." }); return; }
                      if (!reviewRating || !reviewText.trim()) { toast({ title: "Erreur", description: "Veuillez donner une note et écrire un commentaire." }); return; }
                      setReviewLoading(true);
                      try {
                        const res = await reviewsAPI.postReview(Number(id), { rating: reviewRating, comment: reviewText });
                        setApiReviews((prev) => [res.data, ...prev]);
                        toast({ title: "Avis publié ✅", description: "Merci pour votre avis !" });
                        setShowReviewForm(false);
                        setReviewRating(0);
                        setReviewText("");
                        setActiveTab("avis");
                      } catch (err: any) {
                        const msg = err?.response?.data?.detail || "Erreur lors de l'envoi.";
                        toast({ title: "Erreur", description: msg });
                      } finally {
                        setReviewLoading(false);
                      }
                    }}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-semibold"
                  >
                    {reviewLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi...</> : "Envoyer l'avis"}
                  </Button>
                  </div>
                )}

                {/* Claim Form */}
                {showClaimForm && (
                  <div className="bg-card rounded-xl border border-border p-5 space-y-3">
                    <h4 className="font-semibold text-foreground text-sm">Réclamer l'annonce</h4>
                    <p className="text-xs text-muted-foreground">Expliquez pourquoi vous réclamez cette annonce.</p>
                    <textarea id="claim-text" name="claim-text" value={claimText} onChange={(e) => setClaimText(e.target.value)} placeholder="Votre message..." className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent min-h-[80px] resize-none" maxLength={500} />
                    <Button
                      disabled={reportLoading}
                      onClick={async () => {
                        if (!user) { toast({ title: "Connexion requise", description: "Connectez-vous pour envoyer une réclamation." }); return; }
                        if (!claimText.trim()) { toast({ title: "Erreur", description: "Veuillez écrire un message." }); return; }
                        setReportLoading(true);
                        try {
                          await reviewsAPI.postReport(Number(id), { report_type: "claim", reason: claimText });
                          toast({ title: "Réclamation envoyée ✅", description: "Nous traiterons votre demande sous 48h." });
                          setShowClaimForm(false);
                          setClaimText("");
                        } catch {
                          toast({ title: "Erreur", description: "Impossible d'envoyer la réclamation." });
                        } finally {
                          setReportLoading(false);
                        }
                      }}
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-semibold"
                    >
                      {reportLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi...</> : "Envoyer la réclamation"}
                    </Button>
                  </div>
                )}

                {/* Report Form */}
                {showReportForm && (
                  <div className="bg-card rounded-xl border border-border p-5 space-y-3">
                    <h4 className="font-semibold text-foreground text-sm">Signaler l'annonce</h4>
                    <p className="text-xs text-muted-foreground">Décrivez le problème avec cette annonce.</p>
                    <textarea id="report-text" name="report-text" value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder="Raison du signalement..." className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent min-h-[80px] resize-none" maxLength={500} />
                    <Button
                      disabled={reportLoading}
                      onClick={async () => {
                        if (!user) { toast({ title: "Connexion requise", description: "Connectez-vous pour signaler." }); return; }
                        if (!reportText.trim()) { toast({ title: "Erreur", description: "Veuillez décrire le problème." }); return; }
                        setReportLoading(true);
                        try {
                          await reviewsAPI.postReport(Number(id), { report_type: "report", reason: reportText });
                          toast({ title: "Signalement envoyé ✅", description: "Merci, nous examinerons cette annonce." });
                          setShowReportForm(false);
                          setReportText("");
                        } catch {
                          toast({ title: "Erreur", description: "Impossible d'envoyer le signalement." });
                        } finally {
                          setReportLoading(false);
                        }
                      }}
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-semibold"
                    >
                      {reportLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi...</> : "Envoyer le signalement"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Studio Multi-Canaux Modal */}
      {listing && (
        <TemplateStudioModal
          isOpen={showStudioModal}
          onClose={() => setShowStudioModal(false)}
          listing={listing}
        />
      )}
    </div>
  );
};

export default AnnonceDetail;
