import categoryImmobilier from "@/assets/category-immobilier.jpg";
import categoryServices from "@/assets/category-services.jpg";
import categoryAvendre from "@/assets/category-avendre.jpg";

export interface ListingDetail {
  label: string;
  value: string;
}

export interface Review {
  id: number;
  author: string;
  rating: number;
  date: string;
  comment: string;
}

export interface Listing {
  id: number;
  title: string;
  category: string;
  image: string;
  rating: number;
  reviews: number;
  date: string;
  price: string;
  description: string;
  details: ListingDetail[];
  reviewsList: Review[];
  location: { lat: number; lng: number; address: string };
}

export const allListings: Listing[] = [
  {
    id: 1,
    title: "Chambre rénovée et élégante",
    category: "Immobilier",
    image: categoryImmobilier,
    rating: 4.5,
    reviews: 2,
    date: "17 Nov 2021",
    price: "Fbu 400 / mois",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi vitae eleifend massa. Sed tristique vehicula urna, et scelerisque orci suscipit nec. Donec egestas id nulla at lacinia. Donec lorem lectus, suscipit ac mi id, blandit posuere enim. Quisque mollis erat fermentum risus auctor fermentum curabitur quis aliquet dui. Integer enim nisl, sollicitudin sed dui et, luctus egestas magna.",
    details: [
      { label: "Type", value: "Chambre" },
      { label: "Superficie en pieds carrés", value: "130 m²" },
    ],
    reviewsList: [
      { id: 1, author: "Michelle Foster", rating: 5, date: "Novembre 17, 2021", comment: "Nunc facilisis felis pharetra urna cursus, sed porta lacus commodo. Praesent aliquet facilisis tincidunt. Nullam malesuada blandit est, nec accumsan tortor malesuada donec." },
      { id: 2, author: "Thomas Hinton", rating: 4, date: "Novembre 17, 2021", comment: "Aliquam et eros vel dui finibus interdum quis vel nulla. Fusce vestibulum ex eget cursus commodo. Nulla vitae blandit sapien. Ut sit amet mauris id enim ullamcorper." },
    ],
    location: { lat: -3.3822, lng: 29.3644, address: "Bujumbura, Burundi" },
  },
  {
    id: 2,
    title: "Apple MacBook Pro 15 pouces",
    category: "À vendre",
    image: categoryAvendre,
    rating: 5.0,
    reviews: 2,
    date: "17 Nov 2021",
    price: "Fbu 1 200 000",
    description: "MacBook Pro 15 pouces en excellent état. Processeur rapide, écran Retina, et clavier confortable. Idéal pour les professionnels et les créatifs. Livré avec chargeur original et housse de protection.",
    details: [
      { label: "Condition", value: "Occasion" },
      { label: "Expédition", value: "Monde entier" },
    ],
    reviewsList: [
      { id: 1, author: "Jean Dupont", rating: 5, date: "Novembre 17, 2021", comment: "Produit en excellent état, exactement comme décrit. Livraison rapide et vendeur très réactif." },
      { id: 2, author: "Marie Claire", rating: 5, date: "Novembre 16, 2021", comment: "Très satisfaite de mon achat. Le MacBook fonctionne parfaitement." },
    ],
    location: { lat: -3.3761, lng: 29.3599, address: "Centre-ville, Bujumbura" },
  },
  {
    id: 3,
    title: "Services de nettoyage domestique",
    category: "Services",
    image: categoryServices,
    rating: 4.0,
    reviews: 2,
    date: "17 Nov 2021",
    price: "Fbu 50 000 / session",
    description: "Service de nettoyage professionnel pour votre domicile. Nous offrons un nettoyage complet incluant les sols, les fenêtres, la cuisine et les salles de bain. Produits écologiques utilisés. Satisfaction garantie.",
    details: [
      { label: "Disponibilité", value: "2 jours" },
      { label: "Garantie", value: "Complet" },
    ],
    reviewsList: [
      { id: 1, author: "Alice Nkurunziza", rating: 4, date: "Novembre 17, 2021", comment: "Service très professionnel. Ma maison n'a jamais été aussi propre. Je recommande vivement." },
      { id: 2, author: "Patrick Ndayisaba", rating: 4, date: "Novembre 16, 2021", comment: "Bon service dans l'ensemble. Ponctuel et efficace." },
    ],
    location: { lat: -3.3900, lng: 29.3700, address: "Quartier Rohero, Bujumbura" },
  },
  {
    id: 4,
    title: "Belle pièce centrale",
    category: "Immobilier",
    image: categoryImmobilier,
    rating: 5.0,
    reviews: 2,
    date: "17 Nov 2021",
    price: "Fbu 500 / mois",
    description: "Magnifique pièce centrale dans un appartement rénové. Lumineuse et spacieuse, idéale pour un couple ou une personne seule. Proche des transports et commerces.",
    details: [
      { label: "Type", value: "Chambre" },
      { label: "Superficie en pieds carrés", value: "130 m²" },
    ],
    reviewsList: [
      { id: 1, author: "Sophie Martin", rating: 5, date: "Novembre 17, 2021", comment: "Endroit magnifique, très bien entretenu. Le propriétaire est très accueillant." },
      { id: 2, author: "David Karera", rating: 5, date: "Novembre 17, 2021", comment: "Excellent rapport qualité-prix. Je recommande sans hésitation." },
    ],
    location: { lat: -3.3850, lng: 29.3550, address: "Quartier Buyenzi, Bujumbura" },
  },
  {
    id: 5,
    title: "Services de soudage en interne",
    category: "Services",
    image: categoryServices,
    rating: 4.0,
    reviews: 2,
    date: "16 Nov 2021",
    price: "Sur devis",
    description: "Services de soudage professionnels disponibles à domicile. Travail soigné et matériaux de qualité. Devis gratuit sur demande.",
    details: [
      { label: "Disponibilité", value: "2 jours" },
      { label: "Garantie", value: "Complet" },
    ],
    reviewsList: [
      { id: 1, author: "Emmanuel Bizimana", rating: 4, date: "Novembre 16, 2021", comment: "Travail impeccable. Le soudeur est arrivé à l'heure et a fait un excellent travail." },
      { id: 2, author: "Claude Habimana", rating: 4, date: "Novembre 16, 2021", comment: "Bon rapport qualité-prix. Je ferai appel à ses services à nouveau." },
    ],
    location: { lat: -3.3950, lng: 29.3750, address: "Quartier Kinindo, Bujumbura" },
  },
  {
    id: 6,
    title: "Aménagement paysager et jardinage",
    category: "Services",
    image: categoryServices,
    rating: 5.0,
    reviews: 2,
    date: "16 Nov 2021",
    price: "Fbu 80 000 / session",
    description: "Service complet d'aménagement paysager et de jardinage. Taille de haies, tonte de pelouse, plantation de fleurs et entretien général du jardin.",
    details: [
      { label: "Disponibilité", value: "1 jour" },
      { label: "Garantie", value: "Complet" },
    ],
    reviewsList: [
      { id: 1, author: "Jeanne Niyonzima", rating: 5, date: "Novembre 16, 2021", comment: "Mon jardin est transformé ! Un vrai professionnel avec un excellent sens esthétique." },
      { id: 2, author: "Pierre Ndikumana", rating: 5, date: "Novembre 16, 2021", comment: "Service exceptionnel. Très attentif aux détails et respectueux des délais." },
    ],
    location: { lat: -3.3780, lng: 29.3680, address: "Quartier Mutanga, Bujumbura" },
  },
];
