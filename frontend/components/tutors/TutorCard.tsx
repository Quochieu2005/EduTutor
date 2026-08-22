import Link from "next/link";
import type { TutorProfile } from "@/lib/types";
import { Badge, Card, formatCurrency } from "../ui/Card";

interface TutorCardProps {
  tutor: TutorProfile;
}

export function TutorCard({ tutor }: TutorCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {tutor.fullName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-gray-900">
              {tutor.fullName}
            </h3>
            {tutor.isVerified && <Badge variant="success">Đã xác minh</Badge>}
          </div>
          <p className="text-sm text-gray-500 mb-2">
            {tutor.location} · {tutor.experience} năm kinh nghiệm ·{" "}
            {tutor.rating}★ ({tutor.reviewCount})
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tutor.subjects.map((s) => (
              <Badge key={s} variant="info">
                {s}
              </Badge>
            ))}
          </div>
          <p className="text-gray-600 text-sm line-clamp-2 mb-3">{tutor.bio}</p>
          <div className="flex items-center justify-between">
            <span className="text-blue-600 font-semibold">
              {formatCurrency(tutor.hourlyRate)}/giờ
            </span>
            <Link
              href={`/tutors/${tutor.id}`}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition"
            >
              Xem chi tiết →
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
