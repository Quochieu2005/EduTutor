import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TutorDetailPageClient } from "./TutorDetailPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TutorDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <TutorDetailPageClient slug={id} />
      <Footer />
    </div>
  );
}
