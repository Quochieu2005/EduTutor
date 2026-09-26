import { notFound } from "next/navigation";
import { getClassById, MOCK_ALL_CLASSES } from "@/lib/home-mock-data";
import { ClassDetailClient } from "./ClassDetailClient";

export function generateStaticParams() {
  const ids = MOCK_ALL_CLASSES.map((cls) => ({ id: cls.id }));
  const codes = MOCK_ALL_CLASSES.map((cls) => ({ id: cls.code }));
  const lowerCodes = MOCK_ALL_CLASSES.map((cls) => ({ id: cls.code.toLowerCase() }));
  return [...ids, ...codes, ...lowerCodes];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassDetailPage({ params }: PageProps) {
  const { id } = await params;
  const classItem = getClassById(id);

  if (!classItem) {
    notFound();
  }

  return <ClassDetailClient initialClass={classItem} />;
}
