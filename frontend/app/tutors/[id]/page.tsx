import { notFound } from "next/navigation";
import { getTutorById, getOpenClassesByTutorId, MOCK_FEATURED_TUTORS } from "@/lib/home-mock-data";
import { TutorDetailClient } from "./TutorDetailClient";

export function generateStaticParams() {
  return MOCK_FEATURED_TUTORS.map((tutor) => ({
    id: tutor.id,
  }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TutorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const tutor = getTutorById(id);

  if (!tutor) {
    notFound();
  }

  const initialOpenClasses = getOpenClassesByTutorId(id);

  return <TutorDetailClient tutor={tutor} initialOpenClasses={initialOpenClasses} />;
}
