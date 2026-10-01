import { ClassDetailPageClient } from "./ClassDetailPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <ClassDetailPageClient slug={id} />;
}
