import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CategoriesSection from "@/components/CategoriesSection";
import ListingsSection from "@/components/ListingsSection";
import NearMeSection from "@/components/NearMeSection";
import LocationBanner from "@/components/LocationBanner";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <LocationBanner />
        <HeroSection />
        <NearMeSection />
        <CategoriesSection />
        <ListingsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
