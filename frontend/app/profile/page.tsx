"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getMyTutorProfile, updateTutorProfile } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LOCATIONS, SUBJECTS } from "@/lib/mock-data";
import type { TutorProfile } from "@/lib/types";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [bio, setBio] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [experience, setExperience] = useState("");

  useEffect(() => {
    let ignore = false;
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "tutor") {
      router.replace("/tutors");
      return;
    }

    getMyTutorProfile()
      .then((p) => {
        if (!ignore && p) {
          setProfile(p);
          setBio(p.bio);
          setSubjects(p.subjects);
          setLocation(p.location);
          setHourlyRate(String(p.hourlyRate));
          setExperience(String(p.experience));
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [user, authLoading, router]);

  function toggleSubject(s: string) {
    setSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      const updated = await updateTutorProfile({
        bio,
        subjects,
        location,
        hourlyRate: Number(hourlyRate),
        experience: Number(experience),
      });
      setProfile(updated);
      setSuccess(true);
    } catch {
      alert("Không thể cập nhật hồ sơ.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="py-12 text-center text-gray-500">Đang tải hồ sơ...</div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quản lý hồ sơ gia sư
          </h1>
          <p className="text-gray-600">
            Cập nhật thông tin để học sinh dễ dàng tìm thấy bạn
          </p>
        </div>

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Hồ sơ đã được cập nhật thành công!
          </div>
        )}

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                {user?.fullName.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-lg">{user?.fullName}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                {profile?.isVerified && (
                  <Badge variant="success">Đã xác minh</Badge>
                )}
              </div>
            </div>

            <Textarea
              label="Giới thiệu bản thân"
              required
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Mô tả kinh nghiệm, phương pháp giảng dạy..."
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Môn dạy
              </label>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSubject(s)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${
                      subjects.includes(s)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <Select
              label="Khu vực"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              options={[
                { value: "", label: "Chọn khu vực" },
                ...LOCATIONS.map((l) => ({ value: l, label: l })),
              ]}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Học phí (VNĐ/giờ)"
                type="number"
                required
                min={0}
                step={10000}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
              <Input
                label="Số năm kinh nghiệm"
                type="number"
                required
                min={0}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              fullWidth
              disabled={saving || subjects.length === 0}
            >
              {saving ? "Đang lưu..." : "Lưu hồ sơ"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
