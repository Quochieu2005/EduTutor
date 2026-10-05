import type { Tutor } from "./presentation-models";

export interface TutorCategoryItem {
  id: string;
  slug: string;
  title: string;
  imageSrc: string;
  filterSubjectSlug: string;
  bullets: string[];
}

export interface TutorSubjectFilter {
  slug: string;
  label: string;
  aliases: string[];
  matches: (tutor: Tutor) => boolean;
}

export const TUTOR_SUBJECT_FILTERS: TutorSubjectFilter[] = [
  {
    slug: "toan",
    label: "Toán",
    aliases: ["toan", "toán", "toan-hoc", "môn toán"],
    matches: (tutor: Tutor) => tutor.subject.toLowerCase().includes("toán"),
  },
  {
    slug: "toan-tu-duy",
    label: "Toán tư duy",
    aliases: ["toan-tu-duy", "toán tư duy", "toan tu duy", "math-logic"],
    matches: (tutor: Tutor) =>
      tutor.subject.toLowerCase().includes("toán") ||
      tutor.bio.toLowerCase().includes("tư duy") ||
      Boolean(tutor.fullBio?.toLowerCase().includes("tư duy")),
  },
  {
    slug: "tieng-anh",
    label: "Tiếng Anh",
    aliases: ["tieng-anh", "tiếng anh", "tieng anh", "anh-van", "english"],
    matches: (tutor: Tutor) => tutor.subject.toLowerCase().includes("tiếng anh"),
  },
  {
    slug: "ielts",
    label: "IELTS",
    aliases: ["ielts", "luyện thi ielts", "tieng-anh-ielts"],
    matches: (tutor: Tutor) =>
      tutor.subject.toLowerCase().includes("ielts") ||
      tutor.grades.toLowerCase().includes("ielts") ||
      tutor.bio.toLowerCase().includes("ielts") ||
      Boolean(tutor.fullBio?.toLowerCase().includes("ielts")),
  },
  {
    slug: "ngu-van",
    label: "Ngữ Văn",
    aliases: ["ngu-van", "ngữ văn", "ngu van", "van-hoc", "văn học", "văn"],
    matches: (tutor: Tutor) =>
      tutor.subject.toLowerCase().includes("văn") ||
      tutor.bio.toLowerCase().includes("văn") ||
      Boolean(tutor.fullBio?.toLowerCase().includes("văn")),
  },
  {
    slug: "vat-ly",
    label: "Vật lý",
    aliases: ["vat-ly", "vật lý", "vật lí", "vat ly", "vat-li", "lý"],
    matches: (tutor: Tutor) =>
      tutor.subject.toLowerCase().includes("vật lý") ||
      tutor.subject.toLowerCase().includes("vật lí") ||
      tutor.subject.toLowerCase().includes("lý"),
  },
  {
    slug: "hoa-hoc",
    label: "Hóa học",
    aliases: ["hoa-hoc", "hóa học", "hoa hoc", "hóa"],
    matches: (tutor: Tutor) =>
      tutor.subject.toLowerCase().includes("hóa học") ||
      tutor.subject.toLowerCase().includes("hóa"),
  },
  {
    slug: "sinh-hoc",
    label: "Sinh học",
    aliases: ["sinh-hoc", "sinh học", "sinh hoc", "sinh"],
    matches: (tutor: Tutor) =>
      tutor.subject.toLowerCase().includes("sinh học") ||
      tutor.subject.toLowerCase().includes("sinh"),
  },
  {
    slug: "tin-hoc",
    label: "Tin học",
    aliases: ["tin-hoc", "tin học", "tin hoc", "lập trình"],
    matches: (tutor: Tutor) =>
      tutor.subject.toLowerCase().includes("tin học") ||
      tutor.subject.toLowerCase().includes("tin"),
  },
  {
    slug: "nang-khieu",
    label: "Năng khiếu",
    aliases: ["nang-khieu", "năng khiếu", "nang khieu", "talent"],
    matches: (tutor: Tutor) =>
      tutor.subject.toLowerCase().includes("năng khiếu") ||
      tutor.subject.toLowerCase().includes("âm nhạc") ||
      tutor.subject.toLowerCase().includes("mỹ thuật"),
  },
];

const PROVINCE_SLUGS: Record<string, string> = {
  "Hà Nội": "ha-noi",
  "TP.HCM": "ho-chi-minh",
  "Đà Nẵng": "da-nang",
  "Cần Thơ": "can-tho",
  "Bình Dương": "binh-duong",
  "Đồng Nai": "dong-nai",
  "Khánh Hòa": "khanh-hoa",
  "Vũng Tàu": "ba-ria-vung-tau",
};

/** Converts the labels used by the public filters to the geography API slug. */
export function getProvinceSlug(label: string | null | undefined): string | undefined {
  if (!label || label === "all" || label === "Tất cả tỉnh/thành") return undefined;
  return PROVINCE_SLUGS[label] ?? label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getSubjectSlug(label: string | null | undefined): string | undefined {
  if (!label || label === "all" || label === "Tất cả môn") return undefined;
  const known = getSubjectFilterByQuery(label);
  if (known) return known.slug;
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const TUTOR_CATEGORIES: TutorCategoryItem[] = [
  {
    id: "sub-1",
    slug: "tieng-anh",
    title: "Gia sư Tiếng Anh",
    imageSrc: "/assets/sub-tienganh.png",
    filterSubjectSlug: "tieng-anh",
    bullets: [
      "Học sinh lấy lại gốc",
      "Mở rộng từ vựng và ngữ pháp",
      "Tăng phản xạ, nghe nói tự nhiên",
    ],
  },
  {
    id: "sub-2",
    slug: "ielts",
    title: "Gia sư IELTS",
    imageSrc: "/assets/sub-ielts.png",
    filterSubjectSlug: "ielts",
    bullets: [
      "Luyện thi IELTS theo mục tiêu",
      "Phát triển toàn diện 4 kỹ năng",
      "Nâng cao khả năng giao tiếp",
    ],
  },
  {
    id: "sub-3",
    slug: "ngu-van",
    title: "Gia sư Ngữ Văn",
    imageSrc: "/assets/sub-nguvan.png",
    filterSubjectSlug: "ngu-van",
    bullets: [
      "Rèn đọc hiểu văn bản",
      "Nâng cao kỹ năng viết",
      "Phát triển khả năng diễn đạt",
    ],
  },
  {
    id: "sub-4",
    slug: "vat-ly",
    title: "Gia sư Vật Lý",
    imageSrc: "/assets/sub-vatly.png",
    filterSubjectSlug: "vat-ly",
    bullets: [
      "Giúp hiểu bản chất hiện tượng",
      "Rèn kỹ năng giải bài tập",
      "Nắm vững công thức trọng tâm",
    ],
  },
  {
    id: "sub-5",
    slug: "hoa-hoc",
    title: "Gia sư Hoá Học",
    imageSrc: "/assets/sub-hoahoc.png",
    filterSubjectSlug: "hoa-hoc",
    bullets: [
      "Nắm chắc kiến thức nền tảng",
      "Thành thạo phương pháp giải",
      "Hệ thống kiến thức hiệu quả",
    ],
  },
  {
    id: "sub-6",
    slug: "toan-tu-duy",
    title: "Toán tư duy",
    imageSrc: "/assets/sub-toantuduy.png",
    filterSubjectSlug: "toan-tu-duy",
    bullets: [
      "Rèn tư duy logic, sáng tạo",
      "Luyện thi TIMO, AMC, SASMO",
      "Tham gia sân chơi Toán quốc tế",
    ],
  },
];

/**
 * Finds matching subject filter definition based on slug, title, or alias
 */
export function getSubjectFilterByQuery(query: string | null | undefined): TutorSubjectFilter | null {
  if (!query || query === "all") return null;

  const normalized = query.trim().toLowerCase();

  // Match by exact slug
  const directMatch = TUTOR_SUBJECT_FILTERS.find((f) => f.slug === normalized);
  if (directMatch) return directMatch;

  // Match by alias or label
  return (
    TUTOR_SUBJECT_FILTERS.find(
      (f) =>
        f.label.toLowerCase() === normalized ||
        f.aliases.some((alias) => alias.toLowerCase() === normalized)
    ) || null
  );
}
