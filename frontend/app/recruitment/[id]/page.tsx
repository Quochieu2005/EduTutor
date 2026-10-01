import RecruitmentJobDetailClient from "./RecruitmentJobDetailClient";

export default async function RecruitmentJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RecruitmentJobDetailClient slug={decodeURIComponent(id)} />;
}
