"use client";

import { useCallback, useEffect, useState } from "react";
import { getTutors } from "@/lib/api";
import type { TutorProfile } from "@/lib/types";
import { TutorCard } from "@/components/tutors/TutorCard";
import { TutorSearchForm } from "@/components/tutors/TutorSearchForm";

export default function TutorsPage() {
  const [subject, setSubject] = useState("");
  const [location, setLocation] = useState("");
  const [tutors, setTutors] = useState<TutorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTutors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTutors({
        subject: subject || undefined,
        location: location || undefined,
      });
      setTutors(data);
    } catch {
      setTutors([]);
    } finally {
      setLoading(false);
    }
  }, [subject, location]);

  useEffect(() => {
    let ignore = false;
    getTutors({
      subject: subject || undefined,
      location: location || undefined,
    })
      .then((data) => {
        if (!ignore) setTutors(data);
      })
      .catch(() => {
        if (!ignore) setTutors([]);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [subject, location]);

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tìm gia sư</h1>
          <p className="text-gray-600">
            Tìm kiếm gia sư theo môn học và khu vực phù hợp với bạn
          </p>
        </div>

        <TutorSearchForm
          subject={subject}
          location={location}
          onSubjectChange={setSubject}
          onLocationChange={setLocation}
          onSearch={fetchTutors}
          loading={loading}
        />

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Đang tải danh sách gia sư...
          </div>
        ) : tutors.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Không tìm thấy gia sư phù hợp. Thử thay đổi bộ lọc.
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {tutors.length} gia sư được tìm thấy
            </p>
            {tutors.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
