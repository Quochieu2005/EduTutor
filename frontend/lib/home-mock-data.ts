export type ClassCategorySlug =
  | "primary"
  | "secondary"
  | "high-school"
  | "foreign-language"
  | "talent"
  | "exam-prep";

export interface ClassCategory {
  id: ClassCategorySlug;
  name: string;
  description: string;
}

export const CLASS_CATEGORIES: ClassCategory[] = [
  { id: "primary", name: "Lớp cấp 1", description: "Các lớp tiểu học từ lớp 1 đến lớp 5, rèn chữ và tư duy nền tảng" },
  { id: "secondary", name: "Lớp cấp 2", description: "Các lớp trung học cơ sở từ lớp 6 đến lớp 9, ôn thi vào lớp 10" },
  { id: "high-school", name: "Lớp cấp 3", description: "Các lớp trung học phổ thông từ lớp 10 đến lớp 12" },
  { id: "foreign-language", name: "Lớp ngoại ngữ", description: "Luyện thi chứng chỉ tiếng Anh (IELTS, TOEIC), giao tiếp và ngoại ngữ khác" },
  { id: "talent", name: "Lớp năng khiếu", description: "Âm nhạc, đàn piano, guitar, mỹ thuật và cờ vua" },
  { id: "exam-prep", name: "Lớp luyện thi", description: "Chuyên đề ôn thi chuyển cấp, THPT Quốc Gia và thi học sinh giỏi" },
];

export interface ClassReview {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface ClassComment {
  id: string;
  author: string;
  initials: string;
  avatarColor: string;
  content: string;
  date: string;
  replies?: ClassComment[];
}

export interface ClassListing {
  id: string;
  code: string;
  title: string;
  status: "needing" | "with";
  category: ClassCategorySlug;
  categoryName: string;
  grade: string;
  gradeLevel: "primary" | "secondary" | "high-school" | "exam-prep" | "other";
  subject: string;
  address: string;
  city: string;
  fee: string;
  feeValue: number;
  schedule: string;
  sessionsPerWeek: number;
  sessionDuration: string;
  teachingMode: "online" | "offline" | "both";
  requirements: string;
  description: string;
  contact: string;
  tutorName?: string;
  tutorBio?: string;
  tutorId?: string;
  capacity?: number;
  enrolled?: number;
  classStatus?: "open" | "paused" | "ended";
  averageRating: number;
  reviewCount: number;
  ratingBreakdown: { 5: number; 4: number; 3: number; 2: number; 1: number };
  reviews: ClassReview[];
  comments: ClassComment[];
}

export type GradeLevelSlug = "primary" | "secondary" | "high-school" | "exam-prep" | "other";
export type TutorType = "student" | "teacher";

export interface TutorReview {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface TutorComment {
  id: string;
  author: string;
  initials: string;
  avatarColor: string;
  content: string;
  date: string;
  replies?: TutorComment[];
}

export interface TutorOpenClass {
  id: string;
  tutorId: string;
  title: string;
  subject: string;
  grade: string;
  teachingMode: "online" | "offline" | "both";
  schedule: string;
  fee: string;
  capacity: number;
  enrolled: number;
}

export interface Tutor {
  id: string;
  name: string;
  avatarColor: string;
  initials: string;
  subject: string;
  grades: string;
  gradeLevel?: GradeLevelSlug;
  gradeLevels: GradeLevelSlug[];
  tutorType: TutorType;
  location: string;
  city: string;
  experience: number;
  hourlyRate: string;
  hourlyRateValue: number;
  rating: number;
  reviewCount: number;
  ratingBreakdown: { 5: number; 4: number; 3: number; 2: number; 1: number };
  isVerified: boolean;
  teachingMode: "online" | "offline" | "both";
  bio: string;
  fullBio?: string;
  reviews: TutorReview[];
  comments: TutorComment[];
}


export interface NewsItem {
  id: string;
  title: string;
  date: string;
  summary: string;
  badge: string;
}

export interface AccessStatistics {
  online: number;
  today: number;
  total: number;
}

export const CITIES = [
  "Tất cả tỉnh/thành",
  "Hà Nội",
  "TP.HCM",
  "Đà Nẵng",
  "Cần Thơ",
  "Bình Dương",
  "Đồng Nai",
  "Khánh Hòa",
  "Vũng Tàu",
];

export const SUBJECTS = [
  "Tất cả môn",
  "Toán",
  "Vật lý",
  "Hóa học",
  "Tiếng Anh",
  "Văn học",
  "Sinh học",
  "Tin học",
  "Năng khiếu",
];

export const GRADES = [
  "Tất cả khối lớp",
  "Cấp 1 (Lớp 1-5)",
  "Cấp 2 (Lớp 6-9)",
  "Cấp 3 (Lớp 10-12)",
  "Luyện thi Đại học",
];

export const TEACHING_MODES = [
  { value: "all", label: "Tất cả hình thức" },
  { value: "online", label: "Học Online" },
  { value: "offline", label: "Học trực tiếp" },
];

export const FEE_RANGES = [
  { value: "all", label: "Tất cả mức học phí" },
  { value: "under-150", label: "Dưới 150.000đ/buổi" },
  { value: "150-250", label: "150.000đ - 250.000đ/buổi" },
  { value: "250-400", label: "250.000đ - 400.000đ/buổi" },
  { value: "above-400", label: "Trên 400.000đ/buổi" },
];

export interface LeftSidebarProvince {
  key: string;
  label: string;
  city: string;
}

export interface LeftSidebarCategory {
  key: string;
  label: string;
  city?: string;
  grade?: string;
  subject?: string;
  keyword?: string;
  tutorType?: TutorType;
}

export const LEFT_PROVINCES: LeftSidebarProvince[] = [
  { key: "prov-hcm", label: "Gia sư tại TP.HCM", city: "TP.HCM" },
  { key: "prov-hn", label: "Gia sư tại Hà Nội", city: "Hà Nội" },
  { key: "prov-dn", label: "Gia sư tại Đà Nẵng", city: "Đà Nẵng" },
  { key: "prov-kh", label: "Gia sư tại Khánh Hòa", city: "Khánh Hòa" },
  { key: "prov-bd", label: "Gia sư tại Bình Dương", city: "Bình Dương" },
  { key: "prov-dong-nai", label: "Gia sư tại Đồng Nai", city: "Đồng Nai" },
  { key: "prov-vung-tau", label: "Gia sư tại Vũng Tàu", city: "Vũng Tàu" },
  { key: "prov-can-tho", label: "Gia sư tại Cần Thơ", city: "Cần Thơ" },
];

export const LEFT_FIND_CATEGORIES: LeftSidebarCategory[] = [
  { key: "cat-student", label: "Tìm sinh viên dạy kèm", tutorType: "student" },
  { key: "cat-teacher", label: "Tìm giáo viên dạy kèm", tutorType: "teacher" },
  { key: "cat-grade-1", label: "Tìm gia sư dạy kèm cấp 1", grade: "Cấp 1 (Lớp 1-5)" },
  { key: "cat-grade-2", label: "Tìm gia sư dạy kèm cấp 2", grade: "Cấp 2 (Lớp 6-9)" },
  { key: "cat-grade-3", label: "Tìm gia sư dạy kèm cấp 3", grade: "Cấp 3 (Lớp 10-12)" },
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
    summary: "Xây dựng cầu nối vững chắc giữa phụ huynh và đội ngũ gia sư tận tâm.",
    badge: "Tin nổi bật",
  },
  {
    id: "news-2",
    title: "Gia sư tri ân giáo viên – sinh viên",
    date: "10/09/2026",
    summary: "Chương trình vinh danh và hỗ trợ học bổng dành cho các gia sư xuất sắc.",
    badge: "Hoạt động",
  },
  {
    id: "news-3",
    title: "Kinh nghiệm dạy kèm tại nhà",
    date: "05/09/2026",
    summary: "Những phương pháp sư phạm giúp học sinh tiếp thu bài nhanh và chủ động.",
    badge: "Kinh nghiệm",
  },
];

export const ACCESS_STATISTICS: AccessStatistics = {
  online: 42,
  today: 1250,
  total: 158430,
};

export const MOCK_FEATURED_TUTORS: Tutor[] = [
  {
    id: "tut-1",
    name: "Nguyễn Văn An",
    avatarColor: "from-blue-600 to-indigo-600",
    initials: "NA",
    subject: "Toán",
    grades: "Lớp 9, Lớp 12",
    gradeLevel: "secondary",
    gradeLevels: ["secondary", "high-school", "exam-prep"],
    tutorType: "teacher",
    location: "Hà Nội",
    city: "Hà Nội",
    experience: 8,
    hourlyRate: "250.000đ/buổi",
    hourlyRateValue: 250000,
    rating: 4.9,
    reviewCount: 142,
    ratingBreakdown: { 5: 130, 4: 10, 3: 2, 2: 0, 1: 0 },
    isVerified: true,
    teachingMode: "both",
    bio: "Cử nhân Sư phạm Toán, 8 năm luyện thi vào 10 và THPT Quốc gia điểm cao.",
    fullBio: "Thầy Nguyễn Văn An tốt nghiệp khoa Sư phạm Toán - ĐH Sư phạm Hà Nội loại giỏi. Với hơn 8 năm giảng dạy và luyện thi chuyên sâu, thầy có phương pháp hệ thống hóa kiến thức bằng sơ đồ tư duy, rèn luyện kỹ năng bấm máy tính Casio và tư duy giải nhanh các câu hỏi vận dụng cao (8+ và 9+) trong kỳ thi tuyển sinh vào 10 và THPT Quốc gia.",
    reviews: [
      {
        id: "rev-tut1-1",
        reviewerName: "Bác Nguyễn Minh Tuấn (Phụ huynh)",
        rating: 5,
        comment: "Thầy An dạy rất tận tâm, con tôi học lực trung bình khá đã tiến bộ rõ rệt và đỗ vào lớp 10 trường THPT Kim Liên.",
        date: "14/09/2026",
      },
      {
        id: "rev-tut1-2",
        reviewerName: "Em Trần Hoàng Long (Lớp 12)",
        rating: 5,
        comment: "Các chuyên đề hàm số và tích phân thầy dạy cực kỳ dễ hiểu, em tự tin đạt 9+ môn Toán trong kỳ thi vừa qua.",
        date: "28/08/2026",
      },
      {
        id: "rev-tut1-3",
        reviewerName: "Chị Hoàng Lan (Phụ huynh)",
        rating: 4,
        comment: "Thầy đúng giờ, giáo án bám sát kỳ thi, luôn có báo cáo học tập định kỳ cho phụ huynh.",
        date: "10/08/2026",
      },
    ],
    comments: [
      {
        id: "cm-tut1-1",
        author: "Vũ Quốc Hưng",
        initials: "QH",
        avatarColor: "from-blue-600 to-indigo-600",
        content: "Thầy ơi, lớp ôn thi THPT 9+ buổi tối T3-T6 còn nhận thêm học sinh không ạ?",
        date: "2 ngày trước",
        replies: [
          {
            id: "rep-tut1-1-1",
            author: "Thầy Nguyễn Văn An",
            initials: "NA",
            avatarColor: "from-blue-600 to-indigo-600",
            content: "Chào em, lớp hiện vẫn còn 3 slot nhé. Em bấm nút Đặt lớp ngay trên trang để giữ chỗ nhé.",
            date: "1 ngày trước",
          },
        ],
      },
    ],
  },
  {
    id: "tut-2",
    name: "Trần Thị Bình",
    avatarColor: "from-purple-600 to-pink-600",
    initials: "TB",
    subject: "Tiếng Anh",
    grades: "IELTS, Lớp 6-12",
    gradeLevel: "high-school",
    gradeLevels: ["secondary", "high-school", "exam-prep"],
    tutorType: "teacher",
    location: "TP.HCM",
    city: "TP.HCM",
    experience: 6,
    hourlyRate: "280.000đ/buổi",
    hourlyRateValue: 280000,
    rating: 5.0,
    reviewCount: 98,
    ratingBreakdown: { 5: 98, 4: 0, 3: 0, 2: 0, 1: 0 },
    isVerified: true,
    teachingMode: "both",
    bio: "IELTS 8.0, Thạc sĩ Ngôn ngữ Anh, phương pháp phản xạ giao tiếp tự nhiên.",
    fullBio: "Cô Trần Thị Bình đạt chứng chỉ IELTS 8.0 (Listening 8.5, Reading 8.5, Speaking 8.0, Writing 7.5), Thạc sĩ Giảng dạy Tiếng Anh (TESOL). Cô chú trọng sửa phát âm chuẩn bản xứ, phản xạ giao tiếp tự nhiên và chiến thuật nâng band điểm cấp tốc trong kỳ thi IELTS Writing & Speaking.",
    reviews: [
      {
        id: "rev-tut2-1",
        reviewerName: "Bạn Lê Minh Thư (ĐH Kinh Tế)",
        rating: 5,
        comment: "Học cô Bình 3 tháng từ 5.5 em đã thi đạt IELTS 7.0 mục tiêu. Cách sửa bài Writing của cô vô cùng chi tiết!",
        date: "10/09/2026",
      },
      {
        id: "rev-tut2-2",
        reviewerName: "Bác Đặng Văn Hùng (Phụ huynh)",
        rating: 5,
        comment: "Cô rất kiên nhẫn, kèm con tôi lớp 8 từ mất gốc tiếng Anh nay đã tự tin nói chuyện lưu loát.",
        date: "01/09/2026",
      },
    ],
    comments: [
      {
        id: "cm-tut2-1",
        author: "Phạm Thảo Vy",
        initials: "TV",
        avatarColor: "from-purple-600 to-pink-600",
        content: "Cô có nhận dạy kèm 1-1 online cho người đi làm buổi tối muộn không ạ?",
        date: "3 ngày trước",
        replies: [
          {
            id: "rep-tut2-1-1",
            author: "Cô Trần Thị Bình",
            initials: "TB",
            avatarColor: "from-purple-600 to-pink-600",
            content: "Chào Vy, cô có lớp online lúc 19h-21h tối T4-T7 em nhé, em có thể xem lớp đang mở bên dưới.",
            date: "2 ngày trước",
          },
        ],
      },
    ],
  },
  {
    id: "tut-3",
    name: "Lê Hoàng Long",
    avatarColor: "from-blue-700 to-cyan-600",
    initials: "HL",
    subject: "Vật lý",
    grades: "Lớp 10-12",
    gradeLevel: "high-school",
    gradeLevels: ["high-school", "exam-prep"],
    tutorType: "teacher",
    location: "Đà Nẵng",
    city: "Đà Nẵng",
    experience: 5,
    hourlyRate: "200.000đ/buổi",
    hourlyRateValue: 200000,
    rating: 4.8,
    reviewCount: 76,
    ratingBreakdown: { 5: 64, 4: 10, 3: 2, 2: 0, 1: 0 },
    isVerified: true,
    teachingMode: "online",
    bio: "Chuyên bồi dưỡng học sinh mất gốc môn Vật lý đạt điểm 8+ trong kỳ thi tốt nghiệp.",
    fullBio: "Thầy Lê Hoàng Long có 5 năm giảng dạy bộ môn Vật lý cấp THPT tại Đà Nẵng. Phong cách giảng dạy trực quan, liên hệ hiện tượng thực tế, giúp học sinh nắm vững bản chất công thức và tự tin xử lý bài toán đồ thị, dao động và dòng điện xoay chiều.",
    reviews: [
      {
        id: "rev-tut3-1",
        reviewerName: "Em Ngô Gia Huy",
        rating: 5,
        comment: "Thầy dạy nhiệt tình, giảng giải đồ thị sóng cơ rất trực quan, dễ nhớ.",
        date: "05/09/2026",
      },
    ],
    comments: [],
  },
  {
    id: "tut-4",
    name: "Phạm Thùy Linh",
    avatarColor: "from-purple-700 to-indigo-700",
    initials: "TL",
    subject: "Hóa học",
    grades: "Lớp 8-12",
    gradeLevel: "secondary",
    gradeLevels: ["secondary", "high-school", "exam-prep"],
    tutorType: "teacher",
    location: "Cần Thơ",
    city: "Cần Thơ",
    experience: 7,
    hourlyRate: "220.000đ/buổi",
    hourlyRateValue: 220000,
    rating: 4.9,
    reviewCount: 110,
    ratingBreakdown: { 5: 100, 4: 9, 3: 1, 2: 0, 1: 0 },
    isVerified: true,
    teachingMode: "both",
    bio: "Giảng viên trường đại học, nắm vững cấu trúc đề thi trắc nghiệm Hóa học mới.",
    fullBio: "Cô Phạm Thùy Linh là giảng viên chuyên ngành Hóa học với 7 năm kinh nghiệm bồi dưỡng học sinh thi vào 10 và luyện thi đại học khối B (Y Dược). Cô nổi tiếng với phương pháp giải nhanh trắc nghiệm este, peptit và kim loại kiềm thổ.",
    reviews: [
      {
        id: "rev-tut4-1",
        reviewerName: "Học sinh Hoàng Anh (Khối B)",
        rating: 5,
        comment: "Nhờ cô Linh mà môn Hóa của em từ nỗi sợ trở thành môn kéo điểm cao nhất.",
        date: "08/09/2026",
      },
    ],
    comments: [],
  },
  {
    id: "tut-5",
    name: "Vũ Minh Tuấn",
    avatarColor: "from-sky-600 to-blue-800",
    initials: "MT",
    subject: "Văn học",
    grades: "Lớp 9, Lớp 12",
    gradeLevel: "exam-prep",
    gradeLevels: ["secondary", "high-school", "exam-prep"],
    tutorType: "teacher",
    location: "Hà Nội",
    city: "Hà Nội",
    experience: 10,
    hourlyRate: "260.000đ/buổi",
    hourlyRateValue: 260000,
    rating: 5.0,
    reviewCount: 165,
    ratingBreakdown: { 5: 165, 4: 0, 3: 0, 2: 0, 1: 0 },
    isVerified: true,
    teachingMode: "offline",
    bio: "Gia sư Ngữ Văn tận tâm, rèn luyện kỹ năng phân tích và hành văn giàu cảm xúc.",
    fullBio: "Thầy Vũ Minh Tuấn có 10 năm kinh nghiệm dạy kèm Ngữ văn chất lượng cao tại Hà Nội. Thầy giúp học sinh rèn luyện tư duy lập luận logic cho bài văn nghị luận xã hội, mở rộng vốn từ và trau chuốt hành văn cảm xúc sâu sắc.",
    reviews: [
      {
        id: "rev-tut5-1",
        reviewerName: "Bác Trần Bích Thủy (Phụ huynh)",
        rating: 5,
        comment: "Thầy Tuấn dạy văn rất cuốn hút, con gái tôi từ lười viết văn nay đã đạt 8.75 điểm thi vào 10.",
        date: "12/09/2026",
      },
    ],
    comments: [],
  },
  {
    id: "tut-6",
    name: "Đặng Mai Phương",
    avatarColor: "from-violet-600 to-purple-800",
    initials: "MP",
    subject: "Tiếng Anh",
    grades: "Tiểu học & THCS",
    gradeLevel: "primary",
    gradeLevels: ["primary", "secondary"],
    tutorType: "student",
    location: "Bình Dương",
    city: "Bình Dương",
    experience: 4,
    hourlyRate: "180.000đ/buổi",
    hourlyRateValue: 180000,
    rating: 4.8,
    reviewCount: 52,
    ratingBreakdown: { 5: 45, 4: 6, 3: 1, 2: 0, 1: 0 },
    isVerified: false,
    teachingMode: "offline",
    bio: "Sinh viên năm cuối ĐH Quốc tế, kiên nhẫn, kèm tiếng Anh tiểu học phát âm chuẩn.",
    fullBio: "Bạn Đặng Mai Phương là sinh viên năm cuối ngành Ngôn ngữ Anh ĐH Quốc tế, sở hữu IELTS 7.5. Phương rất yêu trẻ em, tính cách nhẹ nhàng, kiên nhẫn giúp các bé tiểu học yêu thích môn tiếng Anh thông qua trò chơi và truyện tranh song ngữ.",
    reviews: [
      {
        id: "rev-tut6-1",
        reviewerName: "Chị Mai Hương (Thủ Dầu Một)",
        rating: 5,
        comment: "Cô giáo Phương rất dễ thương, bé nhà mình 7 tuổi rất thích học cùng cô.",
        date: "04/09/2026",
      },
    ],
    comments: [],
  },
  {
    id: "tut-7",
    name: "Hoàng Đức Thịnh",
    avatarColor: "from-blue-600 to-teal-600",
    initials: "ĐT",
    subject: "Sinh học",
    grades: "Lớp 11-12",
    gradeLevel: "high-school",
    gradeLevels: ["high-school", "exam-prep"],
    tutorType: "teacher",
    location: "Khánh Hòa",
    city: "Khánh Hòa",
    experience: 5,
    hourlyRate: "210.000đ/buổi",
    hourlyRateValue: 210000,
    rating: 4.7,
    reviewCount: 43,
    ratingBreakdown: { 5: 35, 4: 7, 3: 1, 2: 0, 1: 0 },
    isVerified: true,
    teachingMode: "online",
    bio: "Luyện thi khối B Y Dược, phương pháp sơ đồ tư duy ghi nhớ kiến thức Sinh học.",
    fullBio: "Thầy Hoàng Đức Thịnh chuyên bồi dưỡng học sinh thi học sinh giỏi cấp tỉnh và thi đại học khối B môn Sinh học. Thầy giúp học sinh giải mã các bài toán di truyền học quy luật Menđen và di truyền phả hệ một cách ngắn gọn, chính xác.",
    reviews: [],
    comments: [],
  },
  {
    id: "tut-8",
    name: "Trịnh Gia Bảo",
    avatarColor: "from-indigo-600 to-blue-700",
    initials: "GB",
    subject: "Tin học",
    grades: "Lớp 6-12 & Lập trình",
    gradeLevel: "secondary",
    gradeLevels: ["secondary", "high-school"],
    tutorType: "teacher",
    location: "TP.HCM",
    city: "TP.HCM",
    experience: 6,
    hourlyRate: "300.000đ/buổi",
    hourlyRateValue: 300000,
    rating: 4.9,
    reviewCount: 88,
    ratingBreakdown: { 5: 80, 4: 8, 3: 0, 2: 0, 1: 0 },
    isVerified: true,
    teachingMode: "both",
    bio: "Kỹ sư phần mềm hướng dẫn Python, C++, thuật toán cho học sinh giỏi tin.",
    fullBio: "Anh Trịnh Gia Bảo là kỹ sư phần mềm cao cấp, cựu học sinh chuyên Tin Phổ thông Năng khiếu TP.HCM. Anh chuyên hướng dẫn lập trình căn bản Python, C++ và tư duy cấu trúc dữ liệu - giải thuật cho học sinh định hướng thi Tin học trẻ.",
    reviews: [],
    comments: [],
  },
  {
    id: "tut-9",
    name: "Ngô Quốc Huy",
    avatarColor: "from-amber-600 to-orange-700",
    initials: "QH",
    subject: "Toán",
    grades: "Lớp 6-10",
    gradeLevel: "secondary",
    gradeLevels: ["secondary", "high-school"],
    tutorType: "student",
    location: "Đồng Nai",
    city: "Đồng Nai",
    experience: 3,
    hourlyRate: "190.000đ/buổi",
    hourlyRateValue: 190000,
    rating: 4.8,
    reviewCount: 36,
    ratingBreakdown: { 5: 30, 4: 5, 3: 1, 2: 0, 1: 0 },
    isVerified: true,
    teachingMode: "both",
    bio: "Sinh viên năm 3 Đại học Sư phạm, kèm Toán cấp 2 và lớp 10 tận tình, phương pháp tư duy dễ hiểu.",
    fullBio: "Bạn Ngô Quốc Huy là sinh viên năm 3 khoa Toán ĐH Sư phạm. Với nhiệt huyết tuổi trẻ và sự tận tụy, Huy đã kèm cặp hơn 15 học sinh THCS tại Biên Hòa (Đồng Nai) tiến bộ vượt bậc môn Toán và hình học phẳng.",
    reviews: [
      {
        id: "rev-tut9-1",
        reviewerName: "Bác Lâm (Biên Hòa)",
        rating: 5,
        comment: "Thầy giáo trẻ rất nhiệt tình, dạy con tôi có phương pháp tiến bộ rõ rệt.",
        date: "06/09/2026",
      },
    ],
    comments: [],
  },
  {
    id: "tut-10",
    name: "Bùi Thu Hà",
    avatarColor: "from-teal-600 to-emerald-700",
    initials: "TH",
    subject: "Vật lý",
    grades: "Lớp 10-12",
    gradeLevel: "high-school",
    gradeLevels: ["high-school", "exam-prep"],
    tutorType: "teacher",
    location: "Vũng Tàu",
    city: "Vũng Tàu",
    experience: 6,
    hourlyRate: "240.000đ/buổi",
    hourlyRateValue: 240000,
    rating: 4.9,
    reviewCount: 64,
    ratingBreakdown: { 5: 58, 4: 6, 3: 0, 2: 0, 1: 0 },
    isVerified: true,
    teachingMode: "both",
    bio: "Giáo viên chuyên Vật lý trường THPT tại Vũng Tàu, luyện thi tốt nghiệp và đánh giá năng lực.",
    fullBio: "Cô Bùi Thu Hà có 6 năm công tác giảng dạy môn Vật lý tại TP. Vũng Tàu. Giáo án sinh động, luôn cập nhật các dạng đề thi đánh giá năng lực ĐHQG và tốt nghiệp THPT, kèm sát từng học sinh.",
    reviews: [
      {
        id: "rev-tut10-1",
        reviewerName: "Em Phương Thảo (Vũng Tàu)",
        rating: 5,
        comment: "Cô Hà dạy bài tập phần điện từ trường và mạch RLC rất dễ áp dụng, em được 8.5 điểm thi học kỳ.",
        date: "11/09/2026",
      },
    ],
    comments: [],
  },
  {
    id: "tut-11",
    name: "Lê Minh Thảo",
    avatarColor: "from-rose-500 to-pink-600",
    initials: "MT",
    subject: "Tiếng Việt",
    grades: "Lớp 1-5 & Rèn chữ",
    gradeLevel: "primary",
    gradeLevels: ["primary"],
    tutorType: "student",
    location: "Cần Thơ",
    city: "Cần Thơ",
    experience: 2,
    hourlyRate: "160.000đ/buổi",
    hourlyRateValue: 160000,
    rating: 4.9,
    reviewCount: 41,
    ratingBreakdown: { 5: 38, 4: 3, 3: 0, 2: 0, 1: 0 },
    isVerified: true,
    teachingMode: "offline",
    bio: "Sinh viên ngành Giáo dục Tiểu học ĐH Cần Thơ, yêu trẻ, kiên nhẫn rèn chữ đẹp và toán tư duy.",
    fullBio: "Bạn Lê Minh Thảo là sinh viên ngành Giáo dục Tiểu học tại ĐH Cần Thơ, đạt giải Nhất Hội thi Rèn chữ đẹp cấp tỉnh. Thảo có phương pháp sư phạm tâm lý với trẻ nhỏ, giúp các bé lớp 1-5 viết chữ ngay ngắn, đọc hiểu nhanh và phát triển tư duy logic sớm.",
    reviews: [
      {
        id: "rev-tut11-1",
        reviewerName: "Chị Ánh Tuyết (Ninh Kiều - Cần Thơ)",
        rating: 5,
        comment: "Cô giáo Thảo rèn chữ cho bé nhà mình rất khéo, nét chữ con tròn trịa và con rất thích học.",
        date: "09/09/2026",
      },
    ],
    comments: [],
  },
];

export const MOCK_ALL_CLASSES: ClassListing[] = [
  // 1. Cấp 2 - Đang tuyển
  {
    id: "lop-101",
    code: "LOP-101",
    title: "Toán 9 Luyện thi vào 10 Chuyên",
    status: "needing",
    category: "secondary",
    categoryName: "Lớp cấp 2",
    grade: "Lớp 9",
    gradeLevel: "secondary",
    subject: "Toán",
    address: "Quận Hoàn Kiếm, Hà Nội",
    city: "Hà Nội",
    fee: "250.000đ/buổi",
    feeValue: 250000,
    schedule: "Tối T2 - T5 (19h00 - 21h00)",
    sessionsPerWeek: 2,
    sessionDuration: "120 phút",
    teachingMode: "offline",
    requirements: "Cần sinh viên hoặc giáo viên kiên nhẫn ôn thi vào lớp 10 công lập, nắm chắc hình học.",
    description: "Học sinh nam lớp 9 trường THCS Trưng Vương, học lực khá, cần củng cố phần Hình học không gian và Bất đẳng thức để thi vào chuyên Toán.",
    contact: "0912.834.xxx (Chị Hằng - Phụ huynh)",
    averageRating: 4.9,
    reviewCount: 18,
    ratingBreakdown: { 5: 15, 4: 3, 3: 0, 2: 0, 1: 0 },
    reviews: [
      {
        id: "rev-101-1",
        reviewerName: "Bác Nguyễn Minh Tuấn",
        rating: 5,
        comment: "Trung tâm kết nối gia sư dạy rất nhiệt tình, con tôi tiến bộ rõ rệt phần hình học chỉ sau 1 tháng.",
        date: "12/08/2026",
      },
      {
        id: "rev-101-2",
        reviewerName: "Chị Trần Thu Trang",
        rating: 4,
        comment: "Gia sư đúng giờ, giáo án bám sát chương trình thi vào 10 mới.",
        date: "04/09/2026",
      },
    ],
    comments: [
      {
        id: "cm-101-1",
        author: "Lê Hoàng (Sinh viên Sư phạm)",
        initials: "LH",
        avatarColor: "from-blue-600 to-indigo-600",
        content: "Em đã có kinh nghiệm dạy 3 bạn đỗ trường Chuyên Chu Văn An, em có thể nhận lớp vào tối T2 và T5 không ạ?",
        date: "14/09/2026 19:30",
        replies: [
          {
            id: "cm-101-1-1",
            author: "Phụ huynh Chị Hằng",
            initials: "CH",
            avatarColor: "from-purple-600 to-pink-600",
            content: "Chào em, em bấm nút Đăng ký nhận lớp trên hệ thống để trung tâm xác nhận hồ sơ nhé.",
            date: "15/09/2026 08:15",
          },
        ],
      },
    ],
  },

  // 2. Ngoại ngữ - Đang tuyển
  {
    id: "lop-102",
    code: "LOP-102",
    title: "Tiếng Anh IELTS 6.5 Cấp tốc",
    status: "needing",
    category: "foreign-language",
    categoryName: "Lớp ngoại ngữ",
    grade: "Lớp 12",
    gradeLevel: "high-school",
    subject: "Tiếng Anh",
    address: "Quận 1, TP.HCM",
    city: "TP.HCM",
    fee: "300.000đ/buổi",
    feeValue: 300000,
    schedule: "Chiều T3 - T6 (17h30 - 19h30)",
    sessionsPerWeek: 2,
    sessionDuration: "120 phút",
    teachingMode: "both",
    requirements: "Gia sư có chứng chỉ IELTS 7.5+ hoặc giảng viên Tiếng Anh, luyện giải đề THPT Quốc Gia và kỹ năng Writing/Speaking.",
    description: "Học sinh nữ chuẩn bị xét tuyển đại học bằng chứng chỉ IELTS, mục tiêu từ 5.5 lên 6.5+ trong vòng 4 tháng.",
    contact: "0988.654.xxx (Thầy Minh - Phụ huynh)",
    averageRating: 5.0,
    reviewCount: 24,
    ratingBreakdown: { 5: 22, 4: 2, 3: 0, 2: 0, 1: 0 },
    reviews: [
      {
        id: "rev-102-1",
        reviewerName: "Anh Vũ Đình Trọng",
        rating: 5,
        comment: "Lớp học chất lượng, phương pháp phản xạ nói và sửa bài viết chi tiết từng câu.",
        date: "20/08/2026",
      },
    ],
    comments: [
      {
        id: "cm-102-1",
        author: "Phạm Thảo Vy (IELTS 8.0)",
        initials: "TV",
        avatarColor: "from-emerald-600 to-teal-600",
        content: "Mình từng kèm nhiều bạn đạt mục tiêu 6.5 trong 3 tháng. Lớp này học online hay trực tiếp tại nhà phụ huynh vậy ạ?",
        date: "18/09/2026 10:20",
      },
    ],
  },

  // 3. Cấp 1 - Đang tuyển
  {
    id: "lop-103",
    code: "LOP-103",
    title: "Toán & Tiếng Việt Tiểu học Lớp 5",
    status: "needing",
    category: "primary",
    categoryName: "Lớp cấp 1",
    grade: "Lớp 5",
    gradeLevel: "primary",
    subject: "Toán",
    address: "Quận Ninh Kiều, Cần Thơ",
    city: "Cần Thơ",
    fee: "160.000đ/buổi",
    feeValue: 160000,
    schedule: "Sáng T7 - CN (8h30 - 10h30)",
    sessionsPerWeek: 2,
    sessionDuration: "120 phút",
    teachingMode: "offline",
    requirements: "Sinh viên Sư phạm Tiểu học hoặc có kinh nghiệm rèn chữ và tư duy toán lớp 5 chuyển cấp.",
    description: "Bé học lớp 5 cần gia sư kèm sát bài tập trên lớp, ôn thi chuyển cấp vào trường THCS điểm.",
    contact: "0903.221.xxx (Cô Mai - Mẹ bé)",
    averageRating: 4.8,
    reviewCount: 12,
    ratingBreakdown: { 5: 10, 4: 2, 3: 0, 2: 0, 1: 0 },
    reviews: [
      {
        id: "rev-103-1",
        reviewerName: "Bác Lê Thị Hoa",
        rating: 5,
        comment: "Gia sư rất yêu trẻ, biết cách động viên con học tập tự giác hơn.",
        date: "10/09/2026",
      },
    ],
    comments: [],
  },

  // 4. Cấp 3 - Đang tuyển
  {
    id: "lop-104",
    code: "LOP-104",
    title: "Vật lý 11 Nâng cao & Luyện thi",
    status: "needing",
    category: "high-school",
    categoryName: "Lớp cấp 3",
    grade: "Lớp 11",
    gradeLevel: "high-school",
    subject: "Vật lý",
    address: "Quận Hải Châu, Đà Nẵng",
    city: "Đà Nẵng",
    fee: "220.000đ/buổi",
    feeValue: 220000,
    schedule: "Tối T3 - T7 (19h30 - 21h00)",
    sessionsPerWeek: 2,
    sessionDuration: "90 phút",
    teachingMode: "both",
    requirements: "Kèm kiến thức Quang hình và Điện từ, giải bài tập nâng cao chuẩn bị thi học sinh giỏi cấp trường.",
    description: "Học sinh trường THPT Phan Châu Trinh, cần gia sư củng cố bản chất hiện tượng vật lý và kỹ năng bấm máy trắc nghiệm nhanh.",
    contact: "0977.112.xxx (Anh Tuấn - Phụ huynh)",
    averageRating: 4.7,
    reviewCount: 9,
    ratingBreakdown: { 5: 7, 4: 2, 3: 0, 2: 0, 1: 0 },
    reviews: [],
    comments: [],
  },

  // 5. Năng khiếu - Đang tuyển
  {
    id: "lop-105",
    code: "LOP-105",
    title: "Đàn Piano Cơ bản & Cảm thụ Âm nhạc",
    status: "needing",
    category: "talent",
    categoryName: "Lớp năng khiếu",
    grade: "Năng khiếu",
    gradeLevel: "other",
    subject: "Năng khiếu",
    address: "TP. Thủ Dầu Một, Bình Dương",
    city: "Bình Dương",
    fee: "250.000đ/buổi",
    feeValue: 250000,
    schedule: "Tối T4 - CN (18h30 - 20h00)",
    sessionsPerWeek: 2,
    sessionDuration: "90 phút",
    teachingMode: "offline",
    requirements: "Gia sư tốt nghiệp Nhạc viện hoặc Sư phạm Âm nhạc, có đàn tại nhà học viên sẵn sàng luyện tập.",
    description: "Bé 8 tuổi mới bắt đầu học đàn piano, cần thầy/cô kiên nhẫn rèn tư thế ngồi, ngón tay và khả năng đọc xướng âm.",
    contact: "0934.567.xxx (Bác Quang)",
    averageRating: 5.0,
    reviewCount: 14,
    ratingBreakdown: { 5: 14, 4: 0, 3: 0, 2: 0, 1: 0 },
    reviews: [
      {
        id: "rev-105-1",
        reviewerName: "Chị Ngọc Lan",
        rating: 5,
        comment: "Bé nhà tôi rất thích học cô, giờ đã tự đánh được các bản nhạc ngắn.",
        date: "02/09/2026",
      },
    ],
    comments: [],
  },

  // 6. Luyện thi - Đang tuyển
  {
    id: "lop-106",
    code: "LOP-106",
    title: "Luyện thi Cấp tốc THPT QG Môn Văn",
    status: "needing",
    category: "exam-prep",
    categoryName: "Lớp luyện thi",
    grade: "Lớp 12",
    gradeLevel: "exam-prep",
    subject: "Văn học",
    address: "TP. Biên Hòa, Đồng Nai",
    city: "Đồng Nai",
    fee: "240.000đ/buổi",
    feeValue: 240000,
    schedule: "Tối T2 - T6 (19h00 - 21h00)",
    sessionsPerWeek: 2,
    sessionDuration: "120 phút",
    teachingMode: "online",
    requirements: "Cần giáo viên có kinh nghiệm luyện nghị luận văn học và nghị luận xã hội điểm 8+.",
    description: "Ôn tập chuyên sâu các tác phẩm trọng tâm chương trình mới, rèn kỹ năng viết mở bài và kết bài ấn tượng.",
    contact: "0915.998.xxx (Chị Thảo)",
    averageRating: 4.9,
    reviewCount: 31,
    ratingBreakdown: { 5: 28, 4: 3, 3: 0, 2: 0, 1: 0 },
    reviews: [],
    comments: [],
  },

  // 7. Luyện thi - Đang có gia sư
  {
    id: "cls-201",
    code: "LOP-201",
    title: "Toán 12 Ôn thi THPT Quốc Gia Điểm 9+",
    status: "with",
    classStatus: "open",
    capacity: 6,
    enrolled: 3,
    tutorId: "tut-1",
    category: "exam-prep",
    categoryName: "Lớp luyện thi",
    grade: "Lớp 12",
    gradeLevel: "exam-prep",
    subject: "Toán",
    address: "Quận Cầu Giấy, Hà Nội",
    city: "Hà Nội",
    fee: "280.000đ/buổi",
    feeValue: 280000,
    schedule: "T2 - T5 (18h00 - 20h00)",
    sessionsPerWeek: 2,
    sessionDuration: "120 phút",
    teachingMode: "both",
    requirements: "Thầy giáo đã đảm nhận, học sinh duy trì kết quả trên 8.5 điểm.",
    description: "Lớp học nâng cao chuyên đề Hàm số, Tích phân và Hình học Oxyz.",
    contact: "0912.334.xxx (EduTutor Điều phối)",
    tutorName: "Thầy Nguyễn Văn An",
    tutorBio: "Cử nhân Sư phạm Toán, 8 năm kinh nghiệm giảng dạy và luyện thi.",
    averageRating: 4.9,
    reviewCount: 45,
    ratingBreakdown: { 5: 41, 4: 4, 3: 0, 2: 0, 1: 0 },
    reviews: [
      {
        id: "rev-201-1",
        reviewerName: "Học sinh Hoàng Long",
        rating: 5,
        comment: "Thầy dạy cực kỳ dễ hiểu, các bài toán vận dụng cao được thầy hệ thống hóa rõ ràng.",
        date: "01/09/2026",
      },
    ],
    comments: [],
  },

  // 8. Ngoại ngữ - Đang có gia sư
  {
    id: "cls-202",
    code: "LOP-202",
    title: "Tiếng Anh Giao tiếp & IELTS Học sinh 11",
    status: "with",
    classStatus: "open",
    capacity: 5,
    enrolled: 2,
    tutorId: "tut-2",
    category: "foreign-language",
    categoryName: "Lớp ngoại ngữ",
    grade: "Lớp 11",
    gradeLevel: "high-school",
    subject: "Tiếng Anh",
    address: "Quận 3, TP.HCM",
    city: "TP.HCM",
    fee: "300.000đ/buổi",
    feeValue: 300000,
    schedule: "T3 - T6 (17h30 - 19h30)",
    sessionsPerWeek: 2,
    sessionDuration: "120 phút",
    teachingMode: "both",
    requirements: "Cô giáo chuyên luyện kỹ năng nghe và nói lưu loát.",
    description: "Lớp học 1 kèm 1 tăng cường phản xạ giao tiếp và chiến thuật thi IELTS.",
    contact: "0988.112.xxx (EduTutor Điều phối)",
    tutorName: "Cô Trần Thị Bình",
    tutorBio: "Thạc sĩ Ngôn ngữ Anh, IELTS 8.0.",
    averageRating: 5.0,
    reviewCount: 38,
    ratingBreakdown: { 5: 38, 4: 0, 3: 0, 2: 0, 1: 0 },
    reviews: [],
    comments: [],
  },

  // 9. Cấp 3 - Đang có gia sư (Hết slot để test case đã hết slot)
  {
    id: "cls-203",
    code: "LOP-203",
    title: "Vật lý 10 Cơ học và Nhiệt học",
    status: "with",
    classStatus: "open",
    capacity: 4,
    enrolled: 4,
    tutorId: "tut-3",
    category: "high-school",
    categoryName: "Lớp cấp 3",
    grade: "Lớp 10",
    gradeLevel: "high-school",
    subject: "Vật lý",
    address: "Quận Cẩm Lệ, Đà Nẵng",
    city: "Đà Nẵng",
    fee: "200.000đ/buổi",
    feeValue: 200000,
    schedule: "T4 - T7 (19h00 - 21h00)",
    sessionsPerWeek: 2,
    sessionDuration: "120 phút",
    teachingMode: "offline",
    requirements: "Thầy kèm chắc kiến thức cơ bản bước vào cấp 3.",
    description: "Lớp học kèm học sinh nắm vững các định luật Newton và công bảo toàn năng lượng.",
    contact: "0905.778.xxx (EduTutor Điều phối)",
    tutorName: "Thầy Lê Hoàng Long",
    tutorBio: "5 năm kinh nghiệm bồi dưỡng học sinh khối THPT.",
    averageRating: 4.8,
    reviewCount: 22,
    ratingBreakdown: { 5: 18, 4: 4, 3: 0, 2: 0, 1: 0 },
    reviews: [],
    comments: [],
  },

  // 10. Cấp 3 (Hóa) - Đang có gia sư (Tạm dừng để test case tạm dừng)
  {
    id: "cls-204",
    code: "LOP-204",
    title: "Hóa học 11 Hóa hữu cơ & Bài tập",
    status: "with",
    classStatus: "paused",
    capacity: 5,
    enrolled: 2,
    tutorId: "tut-4",
    category: "high-school",
    categoryName: "Lớp cấp 3",
    grade: "Lớp 11",
    gradeLevel: "high-school",
    subject: "Hóa học",
    address: "Quận Bình Thủy, Cần Thơ",
    city: "Cần Thơ",
    fee: "220.000đ/buổi",
    feeValue: 220000,
    schedule: "T5 - CN (18h30 - 20h30)",
    sessionsPerWeek: 2,
    sessionDuration: "120 phút",
    teachingMode: "both",
    requirements: "Cô giáo kèm sát phản ứng hữu cơ và sơ đồ điều chế.",
    description: "Học sinh theo định hướng khối B Y Dược, học lực tiến bộ đạt loại giỏi.",
    contact: "0939.889.xxx (EduTutor Điều phối)",
    tutorName: "Cô Phạm Thùy Linh",
    tutorBio: "Giảng viên trường đại học, 7 năm giảng dạy môn Hóa.",
    averageRating: 4.9,
    reviewCount: 27,
    ratingBreakdown: { 5: 24, 4: 3, 3: 0, 2: 0, 1: 0 },
    reviews: [],
    comments: [],
  },

  // 11. Cấp 2 - Đang có gia sư (Đã kết thúc để test case đã kết thúc)
  {
    id: "cls-205",
    code: "LOP-205",
    title: "Ngữ Văn 9 Ôn thi Tuyển sinh vào 10",
    status: "with",
    classStatus: "ended",
    capacity: 6,
    enrolled: 6,
    tutorId: "tut-5",
    category: "secondary",
    categoryName: "Lớp cấp 2",
    grade: "Lớp 9",
    gradeLevel: "secondary",
    subject: "Văn học",
    address: "Quận Đống Đa, Hà Nội",
    city: "Hà Nội",
    fee: "260.000đ/buổi",
    feeValue: 260000,
    schedule: "T2 - T6 (19h30 - 21h00)",
    sessionsPerWeek: 2,
    sessionDuration: "90 phút",
    teachingMode: "offline",
    requirements: "Thầy kèm kỹ năng viết đoạn văn và phân tích nhân vật.",
    description: "Lớp rèn luyện văn phong mạch lạc, học sinh tự tin đạt điểm cao kỳ thi tuyển sinh.",
    contact: "0912.998.xxx (EduTutor Điều phối)",
    tutorName: "Thầy Vũ Minh Tuấn",
    tutorBio: "10 năm kinh nghiệm luyện thi Ngữ Văn cấp 2 và cấp 3.",
    averageRating: 5.0,
    reviewCount: 50,
    ratingBreakdown: { 5: 50, 4: 0, 3: 0, 2: 0, 1: 0 },
    reviews: [],
    comments: [],
  },

  // 12. Cấp 1 - Đang có gia sư
  {
    id: "cls-206",
    code: "LOP-206",
    title: "Toán & Tiếng Việt Tiểu học Lớp 4",
    status: "with",
    classStatus: "open",
    capacity: 4,
    enrolled: 1,
    tutorId: "tut-6",
    category: "primary",
    categoryName: "Lớp cấp 1",
    grade: "Lớp 4",
    gradeLevel: "primary",
    subject: "Toán",
    address: "TP. Nha Trang, Khánh Hòa",
    city: "Khánh Hòa",
    fee: "150.000đ/buổi",
    feeValue: 150000,
    schedule: "T7 - CN (08h00 - 10h00)",
    sessionsPerWeek: 2,
    sessionDuration: "120 phút",
    teachingMode: "offline",
    requirements: "Cô giáo hỗ trợ bé rèn chữ đẹp và tính nhẩm nhanh.",
    description: "Bé học tập tiến bộ, đạt học sinh xuất sắc học kỳ vừa qua.",
    contact: "0905.334.xxx (EduTutor Điều phối)",
    tutorName: "Cô Hoàng Thị Hạnh",
    tutorBio: "Giáo viên tiểu học nhiều năm kinh nghiệm tại Khánh Hòa.",
    averageRating: 4.8,
    reviewCount: 16,
    ratingBreakdown: { 5: 13, 4: 3, 3: 0, 2: 0, 1: 0 },
    reviews: [],
    comments: [],
  },

  // 13. Năng khiếu - Đang có gia sư
  {
    id: "cls-207",
    code: "LOP-207",
    title: "Mỹ thuật Hội họa Sáng tạo Thiếu nhi",
    status: "with",
    classStatus: "open",
    capacity: 8,
    enrolled: 3,
    tutorId: "tut-7",
    category: "talent",
    categoryName: "Lớp năng khiếu",
    grade: "Năng khiếu",
    gradeLevel: "other",
    subject: "Năng khiếu",
    address: "Quận Hải Châu, Đà Nẵng",
    city: "Đà Nẵng",
    fee: "200.000đ/buổi",
    feeValue: 200000,
    schedule: "Sáng T7 - CN (09h00 - 10h30)",
    sessionsPerWeek: 2,
    sessionDuration: "90 phút",
    teachingMode: "offline",
    requirements: "Cô giáo hướng dẫn vẽ màu sáp, màu nước và phát triển tư duy hình khối.",
    description: "Lớp học vẽ thư giãn cuối tuần cho bé từ 6 - 12 tuổi, kích thích trí tưởng tượng sáng tạo.",
    contact: "0905.123.xxx (EduTutor Điều phối)",
    tutorName: "Cô Nguyễn Ngọc Bích",
    tutorBio: "Cử nhân Đại học Mỹ thuật, 4 năm dạy vẽ cho thiếu nhi.",
    averageRating: 4.9,
    reviewCount: 20,
    ratingBreakdown: { 5: 18, 4: 2, 3: 0, 2: 0, 1: 0 },
    reviews: [],
    comments: [],
  },
];

// Danh sách các lớp học do gia sư đang mở đăng ký trực tiếp
export const MOCK_TUTOR_OPEN_CLASSES: TutorOpenClass[] = [
  // Lớp của Thầy Nguyễn Văn An (tut-1)
  {
    id: "cls-op-101",
    tutorId: "tut-1",
    title: "Toán 12 Luyện đề Chinh phục 9+ THPT",
    subject: "Toán",
    grade: "Lớp 12",
    teachingMode: "both",
    schedule: "T3 - T6 (19h30 - 21h30)",
    fee: "250.000đ/buổi",
    capacity: 8,
    enrolled: 5, // Còn 3 slot
  },
  {
    id: "cls-op-102",
    tutorId: "tut-1",
    title: "Toán 9 Ôn thi Chuyên & Công lập",
    subject: "Toán",
    grade: "Lớp 9",
    teachingMode: "offline",
    schedule: "T2 - T5 (18h00 - 20h00)",
    fee: "220.000đ/buổi",
    capacity: 6,
    enrolled: 6, // Hết slot
  },

  // Lớp của Cô Trần Thị Bình (tut-2)
  {
    id: "cls-op-201",
    tutorId: "tut-2",
    title: "IELTS Speaking & Writing Nâng Band 7.0+",
    subject: "Tiếng Anh",
    grade: "Lớp 10-12 & ĐH",
    teachingMode: "online",
    schedule: "T4 - T7 (19h00 - 21h00)",
    fee: "300.000đ/buổi",
    capacity: 6,
    enrolled: 4, // Còn 2 slot
  },
  {
    id: "cls-op-202",
    tutorId: "tut-2",
    title: "Tiếng Anh THCS Ngữ pháp & Giao tiếp phản xạ",
    subject: "Tiếng Anh",
    grade: "Lớp 7-9",
    teachingMode: "both",
    schedule: "Sáng T7 - CN (08h30 - 10h30)",
    fee: "220.000đ/buổi",
    capacity: 8,
    enrolled: 8, // Hết slot
  },

  // Lớp của Thầy Lê Hoàng Long (tut-3)
  {
    id: "cls-op-301",
    tutorId: "tut-3",
    title: "Vật lý 12 Chuyên đề Sóng cơ & Điện xoay chiều",
    subject: "Vật lý",
    grade: "Lớp 12",
    teachingMode: "online",
    schedule: "Tối T3 - T6 (20h00 - 21h30)",
    fee: "200.000đ/buổi",
    capacity: 10,
    enrolled: 7, // Còn 3 slot
  },

  // Lớp của Cô Phạm Thùy Linh (tut-4)
  {
    id: "cls-op-401",
    tutorId: "tut-4",
    title: "Hóa 11 Bồi dưỡng Hóa Hữu cơ Nâng cao",
    subject: "Hóa học",
    grade: "Lớp 11",
    teachingMode: "both",
    schedule: "Tối T2 - T5 (18h30 - 20h30)",
    fee: "220.000đ/buổi",
    capacity: 6,
    enrolled: 3, // Còn 3 slot
  },

  // Lớp của Thầy Vũ Minh Tuấn (tut-5)
  {
    id: "cls-op-501",
    tutorId: "tut-5",
    title: "Nghị luận Văn học 12 Bứt phá điểm 8+",
    subject: "Văn học",
    grade: "Lớp 12",
    teachingMode: "offline",
    schedule: "Chiều T7 - CN (15h00 - 17h00)",
    fee: "260.000đ/buổi",
    capacity: 8,
    enrolled: 5, // Còn 3 slot
  },

  // Lớp của Bạn Đặng Mai Phương (tut-6)
  {
    id: "cls-op-601",
    tutorId: "tut-6",
    title: "Tiếng Anh Tiểu học Cambridge Starters/Movers",
    subject: "Tiếng Anh",
    grade: "Lớp 3-5",
    teachingMode: "offline",
    schedule: "Tối T4 - T7 (18h00 - 19h30)",
    fee: "180.000đ/buổi",
    capacity: 5,
    enrolled: 2, // Còn 3 slot
  },

  // Lớp của Bạn Ngô Quốc Huy (tut-9)
  {
    id: "cls-op-901",
    tutorId: "tut-9",
    title: "Toán 9 Luyện hình học phẳng & Đại số",
    subject: "Toán",
    grade: "Lớp 9",
    teachingMode: "both",
    schedule: "Tối T3 - T5 (19h00 - 20h30)",
    fee: "190.000đ/buổi",
    capacity: 6,
    enrolled: 6, // Hết slot
  },

  // Lớp của Cô Bùi Thu Hà (tut-10)
  {
    id: "cls-op-1001",
    tutorId: "tut-10",
    title: "Vật lý 11 Khảo sát Hiện tượng & Giải toán",
    subject: "Vật lý",
    grade: "Lớp 11",
    teachingMode: "both",
    schedule: "Tối T2 - T6 (18h00 - 19h30)",
    fee: "240.000đ/buổi",
    capacity: 8,
    enrolled: 4, // Còn 4 slot
  },

  // Lớp của Bạn Lê Minh Thảo (tut-11)
  {
    id: "cls-op-1101",
    tutorId: "tut-11",
    title: "Rèn chữ đẹp & Tiếng Việt Tiểu học",
    subject: "Tiếng Việt",
    grade: "Lớp 1-3",
    teachingMode: "offline",
    schedule: "Sáng T7 - CN (08h00 - 09h30)",
    fee: "160.000đ/buổi",
    capacity: 5,
    enrolled: 1, // Còn 4 slot
  },
];

// Helper để lấy danh sách lớp theo status
export function getClassesNeedingTutors(): ClassListing[] {
  return MOCK_ALL_CLASSES.filter((c) => c.status === "needing");
}

export function getClassesWithTutors(): ClassListing[] {
  return MOCK_ALL_CLASSES.filter((c) => c.status === "with");
}

// Helper để tìm lớp theo ID hoặc code
export function getClassById(id: string): ClassListing | undefined {
  const norm = id.toLowerCase();
  return MOCK_ALL_CLASSES.find(
    (c) => c.id.toLowerCase() === norm || c.code.toLowerCase() === norm
  );
}

// Lấy danh sách lớp theo category
export function getClassesByCategory(category?: string | null): ClassListing[] {
  if (!category || category === "all") return MOCK_ALL_CLASSES;
  const norm = category.toLowerCase().trim();
  const matched = MOCK_ALL_CLASSES.filter((c) => c.category === norm);
  // Nếu category không hợp lệ hoặc không có kết quả, trả về tất cả
  return matched.length > 0 ? matched : MOCK_ALL_CLASSES;
}

// Helper tìm gia sư theo ID
export function getTutorById(id: string): Tutor | undefined {
  const norm = id.toLowerCase().trim();
  return MOCK_FEATURED_TUTORS.find(
    (t) => t.id.toLowerCase() === norm
  );
}

// Helper tìm các lớp đang mở của một gia sư
export function getOpenClassesByTutorId(tutorId: string): TutorOpenClass[] {
  const norm = tutorId.toLowerCase().trim();
  return MOCK_TUTOR_OPEN_CLASSES.filter(
    (c) => c.tutorId.toLowerCase() === norm
  );
}

// Cấu hình item bộ lọc sidebar
export interface SidebarFilterItem {
  key: string;
  label: string;
  city?: string;
  grade?: string;
  subject?: string;
  keyword?: string;
  tutorType?: TutorType;
}

// Tra cứu cấu hình bộ lọc từ filterKey
export function getSidebarFilterByKey(filterKey: string): SidebarFilterItem | undefined {
  const norm = filterKey.toLowerCase().trim();
  const allFilters: SidebarFilterItem[] = [...LEFT_PROVINCES, ...LEFT_FIND_CATEGORIES];

  const directMatch = allFilters.find((f) => f.key.toLowerCase() === norm);
  if (directMatch) return directMatch;

  // Hỗ trợ alias URL thân thiện cho Bình Dương
  if (norm === "prov-binh-duong") {
    return allFilters.find((f) => f.key === "prov-bd");
  }

  return undefined;
}

// Lấy toàn bộ filter keys cho generateStaticParams
export function getAllSidebarFilterKeys(): string[] {
  return [
    ...LEFT_PROVINCES.map((p) => p.key),
    ...LEFT_FIND_CATEGORIES.map((c) => c.key),
    "prov-binh-duong",
  ];
}

// Lọc gia sư theo cấu hình bộ lọc sidebar
export function filterTutorsBySidebarFilter(
  tutors: Tutor[],
  filter: SidebarFilterItem
): Tutor[] {
  return tutors.filter((tutor) => {
    // 1. Lọc theo tỉnh thành
    if (filter.city) {
      const targetCity = filter.city.toLowerCase().trim();
      const tutorCity = (tutor.city || tutor.location).toLowerCase().trim();
      if (tutorCity !== targetCity && !tutorCity.includes(targetCity)) {
        return false;
      }
    }

    // 2. Lọc theo môn học
    if (filter.subject) {
      const targetSub = filter.subject.toLowerCase().trim();
      if (!tutor.subject.toLowerCase().includes(targetSub)) {
        return false;
      }
    }

    // 3. Lọc theo cấp lớp (hỗ trợ cả gradeLevels mảng và gradeLevel đơn)
    if (filter.grade) {
      let targetLevel: GradeLevelSlug | null = null;
      if (filter.grade.includes("Cấp 1") || filter.grade.includes("Lớp 1-5")) targetLevel = "primary";
      else if (filter.grade.includes("Cấp 2") || filter.grade.includes("Lớp 6-9")) targetLevel = "secondary";
      else if (filter.grade.includes("Cấp 3") || filter.grade.includes("Lớp 10-12")) targetLevel = "high-school";
      else if (filter.grade.includes("Đại học") || filter.grade.includes("Luyện thi")) targetLevel = "exam-prep";

      if (targetLevel) {
        const hasLevel =
          (tutor.gradeLevels && tutor.gradeLevels.includes(targetLevel)) ||
          tutor.gradeLevel === targetLevel;
        if (!hasLevel) return false;
      }
    }

    // 4. Lọc theo vai trò gia sư (student / teacher)
    if (filter.tutorType) {
      if (tutor.tutorType !== filter.tutorType) {
        return false;
      }
    }

    // 5. Lọc theo từ khóa
    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase().trim();
      const match =
        tutor.name.toLowerCase().includes(kw) ||
        tutor.subject.toLowerCase().includes(kw) ||
        tutor.location.toLowerCase().includes(kw) ||
        tutor.bio.toLowerCase().includes(kw);
      if (!match) return false;
    }

    return true;
  });
}

