import AppProviders from "@/components/AppProviders";
import Loader from "@/components/Loader";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import IntroSection from "@/components/IntroSection";
import MenuSection from "@/components/menu/MenuSection";
import SignatureSection from "@/components/SignatureSection";
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
import { getGoogleReviews } from "@/lib/googleReviews";

// Regenerate in the background at most every 6 hours so the About page's
// Google rating/reviews stay current without calling Google per visit
// (literal value: segment config must be statically analysable; keep in
// sync with GOOGLE_REVIEWS_REVALIDATE_SECONDS).
export const revalidate = 21600;

export default async function Home() {
  const googleReviews = await getGoogleReviews();

  return (
    <AppProviders>
      <Loader />
      <Navbar />
      <main>
        <Hero />
        <IntroSection googleReviews={googleReviews} />
        <MenuSection />
        <SignatureSection />
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
