import type { TutorType } from "./presentation-models";
export interface NewsItem {
  id: string;
  title: string;
  date: string;
  summary: string;
  badge: string;
}
export const LEFT_PROVINCES = [
  { key: "prov-hcm", label: "Gia sư tại TP.HCM", city: "TP.HCM" },
  { key: "prov-hn", label: "Gia sư tại Hà Nội", city: "Hà Nội" },
  { key: "prov-dn", label: "Gia sư tại Đà Nẵng", city: "Đà Nẵng" },
  { key: "prov-kh", label: "Gia sư tại Khánh Hòa", city: "Khánh Hòa" },
  { key: "prov-bd", label: "Gia sư tại Bình Dương", city: "Bình Dương" },
  { key: "prov-dong-nai", label: "Gia sư tại Đồng Nai", city: "Đồng Nai" },
  { key: "prov-vung-tau", label: "Gia sư tại Vũng Tàu", city: "Vũng Tàu" },
  { key: "prov-can-tho", label: "Gia sư tại Cần Thơ", city: "Cần Thơ" },
];
export const LEFT_FIND_CATEGORIES: Array<{
  key: string;
  label: string;
  city?: string;
  grade?: string;
  subject?: string;
  keyword?: string;
  tutorType?: TutorType;
}> = [
  { key: "cat-student", label: "Tìm sinh viên dạy kèm", tutorType: "student" },
  { key: "cat-teacher", label: "Tìm giáo viên dạy kèm", tutorType: "teacher" },
  {
    key: "cat-grade-1",
    label: "Tìm gia sư dạy kèm cấp 1",
    grade: "Cấp 1 (Lớp 1-5)",
  },
  {
    key: "cat-grade-2",
    label: "Tìm gia sư dạy kèm cấp 2",
    grade: "Cấp 2 (Lớp 6-9)",
  },
  {
    key: "cat-grade-3",
    label: "Tìm gia sư dạy kèm cấp 3",
    grade: "Cấp 3 (Lớp 10-12)",
  },
  { key: "cat-math", label: "Tìm gia sư dạy kèm Toán", subject: "Toán" },
  { key: "cat-physics", label: "Tìm gia sư dạy kèm Vật lý", subject: "Vật lý" },
];
export const RIGHT_DOCUMENTS = [
  { label: "Tài liệu môn Toán", subject: "Toán", downloads: "2.4k" },
  { label: "Tài liệu môn Lý", subject: "Vật lý", downloads: "1.8k" },
  { label: "Tài liệu môn Hóa", subject: "Hóa học", downloads: "1.5k" },
  { label: "Tài liệu môn Văn", subject: "Văn học", downloads: "1.2k" },
  { label: "Tài liệu Tiếng Việt", subject: "Tiếng Việt", downloads: "950" },
  { label: "Tài liệu Tiếng Anh", subject: "Tiếng Anh", downloads: "3.1k" },
  { label: "Tài liệu môn Sinh", subject: "Sinh học", downloads: "870" },
];
export const RIGHT_NEWS: NewsItem[] = [
  {
    id: "news-1",
    title: "Trung tâm gia sư và phụ huynh",
    date: "15/09/2026",
    summary:
      "Xây dựng cầu nối vững chắc giữa phụ huynh và đội ngũ gia sư tận tâm.",
    badge: "Tin nổi bật",
  },
  {
    id: "news-2",
    title: "Gia sư tri ân giáo viên – sinh viên",
    date: "10/09/2026",
    summary:
      "Chương trình vinh danh và hỗ trợ học bổng dành cho các gia sư xuất sắc.",
    badge: "Hoạt động",
  },
  {
    id: "news-3",
    title: "Kinh nghiệm dạy kèm tại nhà",
    date: "05/09/2026",
    summary:
      "Những phương pháp sư phạm giúp học sinh tiếp thu bài nhanh và chủ động.",
    badge: "Kinh nghiệm",
  },
];
export const ACCESS_STATISTICS = { online: 42, today: 1250, total: 158430 };
