"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createLessonRequest, getTutor } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SUBJECTS } from "@/lib/mock-data";
import type { TutorProfile } from "@/lib/types";
import { Badge, Card, formatCurrency } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";

export default function TutorDetailPage() {
  const params = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { user } = useAuth();
  const router = useRouter();

  const [tutor, setTutor] = useState<TutorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");

  useEffect(() => {
    let ignore = false;
    if (!id) {
      return;
    }

    getTutor(id)
      .then((data) => {
        if (!ignore) setTutor(data);
      })
      .catch(() => {
        if (!ignore) setTutor(null);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !id) {
      if (!user) router.push("/login");
      return;
    }
    setSubmitting(true);
    try {
      await createLessonRequest({
        tutorId: id,
        subject,
        message,
        preferredDate,
        preferredTime,
      });
      setSuccess(true);
      setShowForm(false);
    } catch {
      alert("Không thể gửi yêu cầu. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-500">
        Đang tải thông tin gia sư...
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 mb-4">Không tìm thấy gia sư.</p>
        <Link href="/tutors">
          <Button>Quay lại danh sách</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/tutors" className="text-sm text-blue-600 hover:underline">
          ← Quay lại danh sách
        </Link>

        <Card padding="lg">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-4xl font-bold shrink-0 mx-auto sm:mx-0">
              {tutor.fullName.charAt(0)}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <h1 className="text-2xl font-bold">{tutor.fullName}</h1>
                {tutor.isVerified && (
                  <Badge variant="success">Đã xác minh</Badge>
                )}
              </div>
              <p className="text-gray-500 mb-3">
                {tutor.location} · {tutor.experience} năm KN · {tutor.rating}★ (
                {tutor.reviewCount} đánh giá)
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mb-4">
                {tutor.subjects.map((s) => (
                  <Badge key={s} variant="info">
                    {s}
                  </Badge>
                ))}
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(tutor.hourlyRate)}/giờ
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <h2 className="font-bold mb-2">Giới thiệu</h2>
            <p className="text-gray-600">{tutor.bio}</p>
          </div>
        </Card>

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Yêu cầu học đã được gửi thành công!{" "}
            <Link href="/lessons" className="underline font-medium">
              Xem lịch học
            </Link>
          </div>
        )}

        {!showForm ? (
          <Button
            size="lg"
            fullWidth
            onClick={() => (user ? setShowForm(true) : router.push("/login"))}
          >
            {user ? "Gửi yêu cầu học" : "Đăng nhập để đặt lịch"}
          </Button>
        ) : (
          <Card padding="lg">
            <h2 className="text-lg font-bold mb-4">
              Đặt lịch học với {tutor.fullName}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select
                label="Môn học"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                options={[
                  { value: "", label: "Chọn môn học" },
                  ...tutor.subjects.map((s) => ({ value: s, label: s })),
                  ...SUBJECTS.filter((s) => !tutor.subjects.includes(s)).map(
                    (s) => ({ value: s, label: s }),
                  ),
                ]}
              />
              <Textarea
                label="Lời nhắn"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Mô tả nhu cầu học tập của bạn..."
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Ngày học"
                  type="date"
                  required
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
                <Input
                  label="Giờ học"
                  type="time"
                  required
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Hủy
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
