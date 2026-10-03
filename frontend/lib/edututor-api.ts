/**
 * Client duy nhất cho toàn bộ API công khai trong Swagger EduTutor.
 *
 * Không hard-code host: Axios `api` lấy NEXT_PUBLIC_API_URL, nên local dùng
 * Django localhost còn Vercel dùng Render chỉ bằng biến môi trường.
 */
import { api, type EduTutorRequestConfig } from "./api";

export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };
export type Banner = { id: number; slug: string | null; title: string | null; image: string; link_url: string | null; sort_order: number };
export type BlogCategory = { slug: string; name: string };
export type BlogPost = { slug: string; title: string; excerpt: string | null; thumbnail: string | null; published_at: string | null; category: BlogCategory | null };
export type BlogPostDetail = BlogPost & { content: string };
export type TutorReview = {
  id: number;
  lesson_id: number;
  student: string;
  tutor: string;
  rating: number;
  comment: string | null;
  admin_reply: string | null;
  created_at: string | null;
};
export type TutorQuestion = {
  id: number;
  tutor: string;
  student: string;
  content: string;
  answer: string | null;
  created_at: string | null;
  answered_at: string | null;
};
export type Subject = {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  category?: string | { slug: string; name: string } | null;
  level?: string | null;
  tutor_count?: number;
};
export type Province = { id: number; slug: string; name: string; code?: string | null };
export type Ward = { id: number; slug: string; name: string; code?: string | null; type: string };
export type TutorAvailability = { tutor: { id: number; slug: string; name: string }; slots: Array<{ weekday: number; period: "morning" | "afternoon" | "evening" }> };
export type TutorSubjectChangeRequest = {
  id: number;
  subject: { id: number; slug: string; name: string };
  action: "add" | "remove";
  level: string | null;
  price_per_hour: number | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  created_at: string;
};
export type PublicTutor = { id: number; slug: string; name: string; avatar: string | null; birth_year: number | null; gender: "male" | "female" | "other" | null; hometown: string | null; voice: string | null; headline: string | null; bio: string | null; education_level: string | null; major: string | null; institution: string | null; experience_years: number; hourly_rate_min: number | null; hourly_rate_max: number | null; teaching_mode: "online" | "offline" | "both"; rating_avg: number; rating_count: number; subjects: Array<{ slug: string; name: string; level?: string | null }>; teaching_areas: Array<{ province_slug: string; province_name: string; ward_slug?: string | null; ward_name?: string | null }> };
export type TutorJob = { slug: string; posted_by_type: "admin" | "parent" | "student"; title: string; subject: { id: number; slug: string; name: string }; province: { id: number; slug: string; name: string }; district: { id: number; slug: string; name: string } | null; ward: { id: number; slug: string; name: string; type: string } | null; grade: string | null; description: string; budget_min: number | null; budget_max: number | null; schedule_expect: string | null; teaching_mode: "online" | "offline" | "both"; status: string; created_at: string; updated_at: string };
export type ActorNotification = { id: number; title: string; content: string; is_read: boolean; created_at: string; type?: string };
export type LessonSession = {
  id: string; requestId: string; subject: string; studentName: string; studentPhone: string;
  tutorName: string; sessionDate: string; startTime: string; endTime: string;
  mode: "online" | "offline"; location: string; meetingUrl: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show"; seriesId: string;
};

function page<T>(data: T[] | Page<T>): Page<T> {
  return Array.isArray(data) ? { count: data.length, next: null, previous: null, results: data } : data;
}

export const edututorApi = {
  // Nội dung công khai
  async banners() { return (await api.get<Banner[]>("/v1/banners/")).data; },
  async blogs(params?: { page?: number; page_size?: number; category?: string; search?: string }) {
    return page<BlogPost>((await api.get("/v1/blog/", { params })).data);
  },
  async blog(slug: string) { return (await api.get<BlogPostDetail>(`/v1/blog/${encodeURIComponent(slug)}/`)).data; },
  async blogCategories() { return (await api.get<BlogCategory[]>("/v1/blog/categories/")).data; },
  async sendContact(payload: { parent_name: string; email: string; phone: string; grade?: string; subject_id?: number | null; needs_description: string }) {
    return (await api.post<{ message: string }>("/v1/contacts/", payload)).data;
  },

  // Môn học và địa giới
  async subjects(params?: { page?: number; page_size?: number; category?: string; search?: string }) {
    return page<Subject>((await api.get("/v1/subjects/", { params })).data);
  },
  async subjectCategories() { return (await api.get("/v1/subjects/categories/")).data; },
  async subject(slug: string) { return (await api.get<Subject>(`/v1/subjects/${encodeURIComponent(slug)}/`)).data; },
  async subjectTutors(slug: string, params?: { page?: number; page_size?: number }) {
    return page((await api.get(`/v1/subjects/${encodeURIComponent(slug)}/tutors/`, { params })).data);
  },
  async provinces() { return (await api.get<Province[]>("/v1/geography/provinces/")).data; },
  async wards(provinceSlug: string) { return (await api.get<Ward[]>(`/v1/geography/provinces/${encodeURIComponent(provinceSlug)}/wards/`)).data; },
  async provinceArea(provinceSlug: string) { return (await api.get(`/v1/geography/areas/${encodeURIComponent(provinceSlug)}/`)).data; },
  async wardArea(provinceSlug: string, wardSlug: string) { return (await api.get(`/v1/geography/areas/${encodeURIComponent(provinceSlug)}/${encodeURIComponent(wardSlug)}/`)).data; },

  // Tuyển dụng, nhận lớp và thời gian rảnh của gia sư
  async tutorJobs(params?: { page?: number; page_size?: number; search?: string; subject?: string; province?: string; ward?: string; posted_by?: "admin" | "parent" | "student" | "requester"; teaching_mode?: "online" | "offline" | "both" }) {
    return page<TutorJob>((await api.get("/v1/tutors/jobs/", { params })).data);
  },
  async tutors(params?: { page?: number; page_size?: number; subject?: string; province?: string; ward?: string; teaching_mode?: "online" | "offline" | "both"; search?: string }) {
    return page<PublicTutor>((await api.get("/v1/tutors/", { params })).data);
  },
  async tutor(slug: string) { return (await api.get<PublicTutor>(`/v1/tutors/${encodeURIComponent(slug)}/`)).data; },
  async tutorJob(slug: string) { return (await api.get(`/v1/tutors/jobs/${encodeURIComponent(slug)}/`)).data; },
  async applyForTutorJob(slug: string, payload: { cover_letter?: string }) { return (await api.post(`/v1/tutors/jobs/${encodeURIComponent(slug)}/apply/`, payload)).data; },
  async createTutorRequest(payload: { subject_id: number; province_id: number; ward_id: number; title: string; description: string; grade?: string; budget_min?: number | null; budget_max?: number | null; schedule_expect?: string; teaching_mode?: "online" | "offline" | "both" }) {
    return (await api.post<TutorJob>("/v1/tutors/requests/", payload)).data;
  },
  async submitTutorApplication(payload: FormData) { return (await api.post("/v1/tutors/applications/", payload, { headers: { "Content-Type": "multipart/form-data" } })).data; },
  async tutorAvailability(slug: string) { return (await api.get<TutorAvailability>(`/v1/tutors/${encodeURIComponent(slug)}/availability/`)).data; },
  async tutorLogin(payload: { email: string; password: string }) { return (await api.post("/v1/tutors/auth/login/", payload)).data; },
  async refreshTutorSession(refresh: string) { return (await api.post("/v1/tutors/auth/refresh/", { refresh })).data; },
  async myTutorAvailability() { return (await api.get<TutorAvailability>("/v1/tutors/me/availability/")).data; },
  async updateMyTutorAvailability(slots: TutorAvailability["slots"]) { return (await api.put<TutorAvailability>("/v1/tutors/me/availability/", { slots })).data; },
  async tutorSubjectChangeRequests() { return (await api.get<Array<TutorSubjectChangeRequest>>("/v1/tutors/auth/subject-change-requests/")).data; },
  async requestTutorSubjectChange(payload: { subject_id: number; action: "add" | "remove"; level?: string; price_per_hour?: number | null; note?: string }) { return (await api.post<TutorSubjectChangeRequest>("/v1/tutors/auth/subject-change-requests/", payload)).data; },

  // Lịch học và hồ sơ
  async lessons() { return page((await api.get("/v1/lessons/")).data); },
  async createLesson(payload: Record<string, unknown>) { return (await api.post("/v1/lessons/", payload)).data; },
  async inviteTutor(slug: string, payload: { contact_name: string; contact_phone: string; student_name?: string; grade_subject?: string; message?: string }) {
    return (await api.post<{ id: number; status: string; email_sent: boolean; message: string }>(`/v1/lessons/invite/${encodeURIComponent(slug)}/`, payload)).data;
  },
  async updateLessonStatus(id: number | string, status: string) {
    return (await api.patch(`/v1/lessons/${id}/`, { status }, {
      // The tutor portal renders the API's precise workflow reason below;
      // avoid a second generic global toast for the same failed action.
      _edututorSilentToast: true,
    } as EduTutorRequestConfig)).data;
  },
  async proposeLesson(id: number | string, payload: Record<string, unknown>) {
    return (await api.put(`/v1/lessons/${id}/proposal/`, payload, {
      _edututorSilentToast: true,
    } as EduTutorRequestConfig)).data;
  },
  async lessonSessions() { return (await api.get<LessonSession[]>("/v1/lessons/sessions/")).data; },
  async markLessonAttendance(id: string, status: "completed" | "no_show") { return (await api.patch<LessonSession>(`/v1/lessons/sessions/${id}/attendance/`, { status })).data; },
  async account() { return (await api.get("/v1/accounts/me/")).data; },
  async accountProfile() { return (await api.get("/v1/accounts/profile/")).data; },
  async updateAccountProfile(payload: FormData | Record<string, unknown>) { return (await api.patch("/v1/accounts/profile/", payload, payload instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined)).data; },
  async tutorAccount() { return (await api.get("/v1/tutors/auth/me/")).data; },
  async tutorProfile() { return (await api.get("/v1/tutors/auth/profile/")).data; },
  async updateTutorProfile(payload: FormData | Record<string, unknown>) { return (await api.patch("/v1/tutors/auth/profile/", payload, payload instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined)).data; },
  async changeTutorPassword(payload: { current_password: string; new_password: string; confirm_password: string }) { return (await api.post("/v1/tutors/auth/change-password/", payload)).data; },

  // Thông báo
  async notifications() { return page<ActorNotification>((await api.get("/v1/notifications/me/")).data); },
  async readNotification(id: number) { return (await api.post(`/v1/notifications/me/${id}/read/`)).data; },
  async readAllNotifications() { return (await api.post("/v1/notifications/me/read-all/")).data; },
  async tutorNotifications() { return page<ActorNotification>((await api.get("/v1/notifications/tutor/me/")).data); },
  async readTutorNotification(id: number) { return (await api.post(`/v1/notifications/tutor/me/${id}/read/`)).data; },
  async readAllTutorNotifications() { return (await api.post("/v1/notifications/tutor/me/read-all/")).data; },

  // Học phí, lương gia sư và hóa đơn
  async payments() { return page((await api.get("/v1/payments/me/")).data); },
  async payment(id: number) { return (await api.get(`/v1/payments/me/${id}/`)).data; },
  async beginPayment(id: number, payload: Record<string, unknown>) { return (await api.post(`/v1/payments/me/${id}/pay/`, payload)).data; },
  async tutorEarnings() { return (await api.get("/v1/payments/tutor/earnings/")).data; },
  async tutorPayouts() { return page((await api.get("/v1/payments/tutor/payouts/")).data); },
  async invoices() { return page((await api.get("/v1/invoices/me/")).data); },
  async invoice(invoiceNo: string) { return (await api.get(`/v1/invoices/me/${encodeURIComponent(invoiceNo)}/`)).data; },

  // Đánh giá và khiếu nại
  async createReview(payload: { lesson_id: number; rating: number; comment?: string }) {
    return (await api.post<TutorReview>("/v1/feedback/reviews/", payload)).data;
  },
  async tutorReviews(slug: string, params?: { page?: number; page_size?: number }) {
    return page<TutorReview>((await api.get(`/v1/feedback/reviews/tutors/${encodeURIComponent(slug)}/`, { params })).data);
  },
  async tutorQuestions(slug: string, params?: { page?: number; page_size?: number }) {
    return page<TutorQuestion>((await api.get(`/v1/feedback/questions/tutors/${encodeURIComponent(slug)}/`, { params })).data);
  },
  async createTutorQuestion(slug: string, payload: { content: string }) {
    return (await api.post<TutorQuestion>(`/v1/feedback/questions/tutors/${encodeURIComponent(slug)}/`, payload)).data;
  },
  async tutorQuestionInbox() {
    return (await api.get<TutorQuestion[]>("/v1/feedback/questions/tutor/me/")).data;
  },
  async answerTutorQuestion(id: number, payload: { answer: string }) {
    return (await api.patch<TutorQuestion>(`/v1/feedback/questions/tutor/me/${id}/answer/`, payload)).data;
  },
  async complaints() { return page((await api.get("/v1/feedback/complaints/me/")).data); },
  async createComplaint(payload: Record<string, unknown>) { return (await api.post("/v1/feedback/complaints/me/", payload)).data; },
  async tutorComplaints() { return page((await api.get("/v1/feedback/complaints/tutor/me/")).data); },
  async createTutorComplaint(payload: Record<string, unknown>) { return (await api.post("/v1/feedback/complaints/tutor/me/", payload)).data; },
};
