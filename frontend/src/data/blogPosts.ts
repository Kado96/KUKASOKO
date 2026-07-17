import categoryAvendre from "@/assets/category-avendre.jpg";
import categoryImmobilier from "@/assets/category-immobilier.jpg";
import categoryServices from "@/assets/category-services.jpg";

export interface BlogComment {
  id: number;
  author: string;
  date: string;
  comment: string;
}

export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  image: string;
  category: string;
  tags: string[];
  content: string;
  comments: BlogComment[];
  relatedPost?: { title: string; id: number };
}

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "Comment vendre rapidement sur Isoko",
    excerpt: "Découvrez nos conseils pour rédiger des annonces qui attirent les acheteurs et maximiser vos chances de vente.",
    date: "Novembre 17, 2021",
    image: categoryAvendre,
    category: "Conseils",
    tags: ["Amet", "Dolor", "Ipsum", "Lorem"],
    content: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque tempor nisl eget lacinia gravida. Ut in scelerisque lectus. Nunc non imperdiet magna, fermentum convallis libero. Cras nec orci eget tortor fermentum tempor ac pellentesque metus. Interdum et malesuada fames ac ante ipsum primis in faucibus. Etiam sed blandit dolor, eget convallis dui. Suspendisse interdum lectus elit, ut porttitor odio dignissim vitae, integer faucibus efficitur gravida nulla rhoncus.

Verbi et magna vel justo tempor consectetur in ut diam. Donec dapibus nisl in nisl dictum, sit amet tincidunt nulla mattis. Integer nec neque orci. Vivamus lacus augue commodo, ut cursus ligula rutrum mollis augue at magna rhoncus porttitor.

Proin consectetur faucibus ipsum sodales pharetra. Pellentesque facilisis arcu at volutpat pulvinar. Maecenas orci tortor ultrices enim hendrerit vehicula a non lectus. Aliquam eget commodo ante. Integer ut vehicula lacus, ac porttitor sem. In tristique mollis bibendum. Vestibulum viverra, nisl nec tempus vulputate, eros orci lobortis mi, in cursus mi mi non neque. Vestibulum semper turpis ac massa varius, et congue lacus dignissim. Donec et porta urna, vulputate dapibus elit.`,
    comments: [
      { id: 1, author: "Michelle", date: "Novembre 17, 2021", comment: "Maecenas eget elit vitae mauris ullamcorper volutpat. Nunc efficitur maximus pretium. Sed consequat accumsan dui, ac consecuat est venenatis nullem elementum iaculis." },
      { id: 2, author: "Brian", date: "Novembre 17, 2021", comment: "Proin imperdiet consectetur mauris, at luctus arcu dictum a. Donec magna ante, maximus ac diam at, blandit elementum claro. Nunc sit amet ultrices ex vestibulum venenatis." },
      { id: 3, author: "Thomas", date: "Novembre 17, 2021", comment: "Curabitur nec lorem sit amet nibh lobortis vestibulum. Curabitur ultrices nunc risus, sed suscipit augue luctus eu. Nam ac diam bibendum, vulputate sapien et posuere." },
    ],
    relatedPost: { title: "Les meilleures idées pour aménager un bureau à domicile", id: 2 },
  },
  {
    id: 2,
    title: "Les tendances immobilières en 2026",
    excerpt: "Le marché immobilier évolue. Voici ce que vous devez savoir pour investir intelligemment cette année.",
    date: "Novembre 5, 2021",
    image: categoryImmobilier,
    category: "Immobilier",
    tags: ["Immobilier", "Tendances", "Investissement"],
    content: `Le marché immobilier connaît des transformations majeures en 2026. Les nouvelles technologies, les changements démographiques et les évolutions économiques redessinent le paysage de l'investissement immobilier.

Les zones urbaines continuent d'attirer les investisseurs, mais les zones périurbaines gagnent en popularité grâce au télétravail. Les propriétés avec espaces extérieurs et bureaux à domicile sont particulièrement recherchées.

L'immobilier durable et écologique devient un critère de choix pour de nombreux acheteurs. Les bâtiments à faible consommation énergétique et les matériaux de construction écologiques sont de plus en plus valorisés sur le marché.`,
    comments: [
      { id: 1, author: "Jean-Pierre", date: "Novembre 6, 2021", comment: "Article très informatif. Les tendances décrites correspondent à ce que j'observe sur le terrain." },
      { id: 2, author: "Claudine", date: "Novembre 7, 2021", comment: "Merci pour ces informations précieuses. Cela m'aide dans mes décisions d'investissement." },
    ],
    relatedPost: { title: "Comment vendre rapidement sur Isoko", id: 1 },
  },
  {
    id: 3,
    title: "Trouver les meilleurs services près de chez vous",
    excerpt: "Guide complet pour utiliser Isoko et dénicher les prestataires de services les plus fiables.",
    date: "Novembre 1, 2021",
    image: categoryServices,
    category: "Guide",
    tags: ["Services", "Guide", "Prestataires"],
    content: `Trouver un prestataire de services fiable peut être un véritable défi. Avec Isoko, nous simplifions cette recherche en vous proposant une plateforme centralisée où vous pouvez comparer les offres, lire les avis et contacter directement les prestataires.

Commencez par définir vos besoins précis. Utilisez les filtres de recherche pour affiner vos résultats par catégorie, localisation et budget. Consultez les avis des autres utilisateurs pour vous faire une idée de la qualité du service.

N'hésitez pas à contacter plusieurs prestataires pour comparer les devis. La transparence est essentielle : posez toutes vos questions avant de vous engager.`,
    comments: [
      { id: 1, author: "Diane", date: "Novembre 2, 2021", comment: "Super guide ! J'ai trouvé un excellent plombier grâce à Isoko." },
    ],
    relatedPost: { title: "Comment vendre rapidement sur Isoko", id: 1 },
  },
];
