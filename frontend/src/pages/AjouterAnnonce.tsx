import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { ImagePlus, Send, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const categories = [
  { value: "immobilier", label: "Immobilier" },
  { value: "services", label: "Services" },
  { value: "avendre", label: "À vendre" },
];

const AjouterAnnonce = () => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [images, setImages] = useState<string[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImages((prev) => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !category || !description) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires.", variant: "destructive" });
      return;
    }
    toast({ title: "Annonce soumise !", description: "Votre annonce a été enregistrée avec succès. (Démo — activez le backend pour sauvegarder)" });
    setTitle("");
    setCategory("");
    setDescription("");
    setPrice("");
    setLocation("");
    setPhone("");
    setImages([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-display font-bold text-primary-foreground mb-2">Ajouter une annonce</h1>
            <p className="text-primary-foreground/70">Publiez votre annonce en quelques minutes</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10 max-w-2xl">
          <form onSubmit={handleSubmit} className="bg-card rounded-xl shadow-lg p-6 md:p-8 space-y-6">
            {/* Titre */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-foreground font-medium">Titre de l'annonce *</Label>
              <Input
                id="title"
                placeholder="Ex: Appartement 3 pièces centre-ville"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-background"
              />
            </div>

            {/* Catégorie */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-foreground font-medium">Catégorie *</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Sélectionnez une catégorie</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground font-medium">Description *</Label>
              <Textarea
                id="description"
                placeholder="Décrivez votre annonce en détail..."
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-background"
              />
            </div>

            {/* Prix & Localisation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-foreground font-medium">Prix</Label>
                <Input
                  id="price"
                  placeholder="Ex: 500 $"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location" className="text-foreground font-medium">Localisation</Label>
                <Input
                  id="location"
                  placeholder="Ex: Kinshasa, Gombe"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>

            {/* Téléphone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground font-medium">Numéro de téléphone</Label>
              <Input
                id="phone"
                placeholder="Ex: +243 000 000 000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-background"
              />
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Photos</Label>
              <div className="flex flex-wrap gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border group">
                    <img src={img} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors text-muted-foreground hover:text-accent">
                  <ImagePlus className="w-6 h-6 mb-1" />
                  <span className="text-[10px]">Ajouter</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold h-12 text-base">
              <Send className="w-4 h-4 mr-2" />
              Publier l'annonce
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AjouterAnnonce;
