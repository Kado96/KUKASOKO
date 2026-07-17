import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useParams, Link } from "react-router-dom";
import { Clock, ChevronLeft, ChevronRight, Share2, MessageCircle, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { blogPosts } from "@/data/blogPosts";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const BlogDetail = () => {
  const { id } = useParams();
  const post = blogPosts.find((p) => p.id === Number(id));
  const [commentForm, setCommentForm] = useState({ name: "", email: "", website: "", comment: "", save: false });

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-16">
          <div className="container mx-auto px-4 py-20 text-center">
            <h1 className="text-2xl font-display font-bold text-foreground mb-4">Article introuvable</h1>
            <Link to="/blog" className="text-accent hover:underline">Retour au blog</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentIndex = blogPosts.findIndex((p) => p.id === post.id);
  const prevPost = currentIndex > 0 ? blogPosts[currentIndex - 1] : null;

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentForm.comment || !commentForm.name || !commentForm.email) {
      toast({ title: "Erreur", description: "Veuillez remplir les champs obligatoires." });
      return;
    }
    toast({ title: "Commentaire envoyé", description: "Votre commentaire a été soumis avec succès." });
    setCommentForm({ name: "", email: "", website: "", comment: "", save: false });
  };

  const paragraphs = post.content.split("\n\n");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        {/* Hero */}
        <div className="relative h-[55vh] min-h-[400px] overflow-hidden">
          <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 pb-10">
            <div className="container mx-auto max-w-5xl">
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-accent text-accent-foreground border-0 text-xs font-semibold px-3 py-1">{post.category}</Badge>
                <span className="flex items-center gap-1 text-white/70 text-xs">
                  <Clock className="w-3.5 h-3.5" /> 5 min de lecture
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-white max-w-2xl mb-5 leading-tight">
                {post.title}
              </h1>
              <div className="flex items-center gap-4 text-white/70 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center text-white text-xs font-bold">I</div>
                  <div>
                    <p className="text-white text-sm font-medium">Isoko Online</p>
                    <p className="text-white/50 text-xs uppercase tracking-wider">Rédaction</p>
                  </div>
                </div>
                <span className="text-white/40">•</span>
                <span>{post.date}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content + Sidebar */}
        <div className="container mx-auto max-w-5xl px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-2xl border border-border p-8 mb-8">
                {paragraphs.map((paragraph, i) => (
                  <p key={i} className="text-muted-foreground leading-relaxed mb-5 text-[15px]">
                    {i === 0 ? (
                      <>
                        <span className="text-4xl font-display font-bold text-accent float-left mr-2 mt-1 leading-none border-l-4 border-accent pl-3">
                          {paragraph.charAt(0)}
                        </span>
                        {paragraph.slice(1)}
                      </>
                    ) : paragraph}
                  </p>
                ))}
              </div>

              {/* Share bar */}
              <div className="bg-card rounded-2xl border border-border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                  <p className="font-semibold text-foreground text-sm">Vous avez aimé cet article ?</p>
                  <p className="text-muted-foreground text-xs">Partagez-le avec vos proches.</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" className="gap-2 text-xs border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                    <Share2 className="w-3.5 h-3.5" /> Partager
                  </Button>
                  <Button size="sm" className="gap-2 text-xs bg-accent hover:bg-accent/90 text-accent-foreground">
                    <MessageCircle className="w-3.5 h-3.5" /> Commenter
                  </Button>
                </div>
              </div>

              {/* Comments */}
              <div className="mb-8">
                <h2 className="text-xl font-display font-bold text-foreground mb-6">{post.comments.length} Commentaire(s)</h2>
                <div className="space-y-4">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="bg-card rounded-xl border border-border p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
                          {comment.author.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-foreground text-sm">{comment.author}</p>
                            <span className="text-xs text-muted-foreground">{comment.date}</span>
                          </div>
                          <p className="text-muted-foreground text-sm leading-relaxed mt-2">{comment.comment}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comment Form */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="text-lg font-display font-bold text-foreground mb-1">Laisser un commentaire</h3>
                <p className="text-xs text-muted-foreground mb-5">Les champs obligatoires sont indiqués avec *</p>
                <form onSubmit={handleSubmitComment} className="space-y-4">
                  <textarea
                    placeholder="Votre commentaire *"
                    value={commentForm.comment}
                    onChange={(e) => setCommentForm({ ...commentForm, comment: e.target.value })}
                    className="w-full h-28 px-4 py-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" placeholder="Nom *" value={commentForm.name} onChange={(e) => setCommentForm({ ...commentForm, name: e.target.value })} className="h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                    <input type="email" placeholder="E-mail *" value={commentForm.email} onChange={(e) => setCommentForm({ ...commentForm, email: e.target.value })} className="h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                    Envoyer
                  </Button>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Newsletter */}
              <div className="bg-accent rounded-2xl p-6 text-accent-foreground">
                <h3 className="font-display font-bold text-lg mb-2">Suivez l'actualité en direct</h3>
                <p className="text-accent-foreground/70 text-sm mb-4">Abonnez-vous pour recevoir les dernières annonces directement par email.</p>
                <Button variant="outline" className="w-full bg-white text-accent border-0 hover:bg-white/90 font-semibold">
                  S'abonner maintenant
                </Button>
              </div>

              {/* Tags */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="w-4 h-4 text-accent" />
                  <h3 className="font-display font-bold text-foreground">Mots clés</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent cursor-pointer transition-colors">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Back to blog */}
              <Link to="/blog" className="flex items-center justify-between bg-card rounded-2xl border border-border p-5 hover:border-accent transition-colors group">
                <div className="flex items-center gap-3">
                  <ChevronLeft className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Retour</p>
                    <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">Voir tous les articles</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>

              {/* Previous post */}
              {prevPost && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 text-center">Continuer la lecture</p>
                  <Link to={`/blog/${prevPost.id}`} className="flex items-center justify-between bg-card rounded-2xl border border-border p-5 hover:border-accent transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs">📄</div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Article précédent</p>
                        <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors truncate max-w-[180px]">{prevPost.title}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BlogDetail;
