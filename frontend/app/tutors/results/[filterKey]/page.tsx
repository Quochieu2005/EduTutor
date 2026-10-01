import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ filterKey: string }>;
}

// Legacy sidebar result URLs used a pre-rendered mock list. Keep old links
// working, but take visitors to the live API-backed tutor directory instead.
export default async function TutorFilterResultsPage({ params }: PageProps) {
  const { filterKey } = await params;
  redirect(`/tutors?legacyFilter=${encodeURIComponent(filterKey)}`);
}
