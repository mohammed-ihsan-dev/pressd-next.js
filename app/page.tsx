import AppProviders from "@/components/AppProviders";
import Loader from "@/components/Loader";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import IntroSection from "@/components/IntroSection";
import MenuSection from "@/components/menu/MenuSection";
import SignatureSection from "@/components/SignatureSection";
import PetFriendlySection from "@/components/PetFriendlySection";
import WorkSection from "@/components/WorkSection";
import WhySection from "@/components/WhySection";
import HealthySection from "@/components/HealthySection";
import GallerySection from "@/components/GallerySection";
import InstagramSection from "@/components/InstagramSection";
import VisitSection from "@/components/VisitSection";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import MobileDock from "@/components/MobileDock";
import CartDrawer from "@/components/cart/CartDrawer";
import BookingDialog from "@/components/booking/BookingDialog";
import RevealObserver from "@/components/RevealObserver";
import ScrollInit from "@/components/ScrollInit";

export default function Home() {
  return (
    <AppProviders>
      <Loader />
      <Navbar />
      <main>
        <Hero />
        <IntroSection />
        <MenuSection />
        <SignatureSection />
        <PetFriendlySection />
        <WorkSection />
        <WhySection />
        <HealthySection />
        <GallerySection />
        <InstagramSection />
        <VisitSection />
      </main>
      <Footer />
      <BackToTop />
      <MobileDock />
      <CartDrawer />
      <BookingDialog />
      <RevealObserver />
      <ScrollInit />
    </AppProviders>
  );
}
