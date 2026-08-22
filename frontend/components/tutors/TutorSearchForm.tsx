"use client";

import { LOCATIONS, SUBJECTS } from "@/lib/mock-data";
import { Button } from "../ui/Button";
import { Select } from "../ui/Input";

interface TutorSearchFormProps {
  subject: string;
  location: string;
  onSubjectChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onSearch: () => void;
  loading?: boolean;
}

export function TutorSearchForm({
  subject,
  location,
  onSubjectChange,
  onLocationChange,
  onSearch,
  loading,
}: TutorSearchFormProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <h2 className="text-lg font-bold mb-4">Tìm gia sư phù hợp</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Select
          label="Môn học"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          options={[
            { value: "", label: "Tất cả môn học" },
            ...SUBJECTS.map((s) => ({ value: s, label: s })),
          ]}
        />
        <Select
          label="Khu vực"
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          options={[
            { value: "", label: "Tất cả khu vực" },
            ...LOCATIONS.map((l) => ({ value: l, label: l })),
          ]}
        />
        <div className="flex items-end">
          <Button fullWidth onClick={onSearch} disabled={loading}>
            {loading ? "Đang tìm..." : "Tìm kiếm"}
          </Button>
        </div>
      </div>
    </div>
  );
}
