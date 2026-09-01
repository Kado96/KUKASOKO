import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { Calendar, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { blogPosts } from "@/data/blogPosts";

import { useState, useEffect } from "react";

const Blog = () => {
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("kukasoko-blog-posts");
    if (stored) {
      setPosts(JSON.parse(stored));
    } else {
      setPosts(blogPosts);
      localStorage.setItem("kukasoko-blog-posts", JSON.stringify(blogPosts));
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16">
        <PageHero
          title="Blog & Actualités Kukasoko"
          subtitle="Découvrez nos conseils, guides pratiques et actualités pour optimiser vos ventes et vos achats au Burundi."
          showSearch={false}
          compact={true}
        />

        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link to={`/blog/${post.id}`} key={post.id} className="bg-card rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer group flex flex-col">
                <div className="aspect-[16/10] overflow-hidden">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <span className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">{post.category}</span>
                  <h3 className="font-sans font-semibold text-foreground text-lg mb-2 group-hover:text-accent transition-colors">{post.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4 flex-1">{post.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      {post.date}
                    </div>
                    <span className="text-accent text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                      Lire <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
