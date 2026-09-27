import { Header } from "@/components/Header";
import { HeroBanner } from "@/components/HeroBanner";
import { WhyChooseTutor } from "@/components/WhyChooseTutor";
import { TutorCategories } from "@/components/TutorCategories";
import { ProcessTimeline } from "@/components/ProcessTimeline";
import { ArticlesSection } from "@/components/ArticlesSection";
import { RegistrationSection } from "@/components/RegistrationSection";
import { Footer } from "@/components/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Header />
      <main className="flex-1">
        <HeroBanner />
        <WhyChooseTutor />
        <ProcessTimeline />
        <TutorCategories />
        <ArticlesSection />
        <RegistrationSection />
      </main>
      <Footer />
    </div>
  );
}
