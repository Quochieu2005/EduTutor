"use client";

export type RequestStatus = "pending" | "approved" | "rejected";

export interface EnrollmentRequest {
  id: string;
  userId: string;
  userEmail: string;
  tutorId: string;
  tutorName: string;
  classId: string;
  classTitle: string;
  subject: string;
  grade: string;
  teachingMode: "online" | "offline" | "both";
  schedule: string;
  address: string;
  studentName: string;
  gender: "male" | "female" | "other";
  age: number;
  parentPhone: string;
  studentPhone: string;
  status: RequestStatus;
  createdAt: string;
}

export interface TutorApplication {
  id: string;
  userId: string;
  userEmail: string;
  fullName: string;
  subject: string;
  grades: string;
  city: string;
  teachingMode: "online" | "offline" | "both";
  experience: number;
  desiredFee: string;
  bio: string;
  status: RequestStatus;
  assignedTutorId?: string;
  createdAt: string;
}

export interface TeachingScheduleItem {
  id: string;
  day: 2 | 3 | 4 | 5 | 6 | 7 | 8;
  period: "morning" | "afternoon";
  time: string;
  subject: string;
  grade: string;
  teachingMode: "online" | "offline" | "both";
  address?: string;
}

const ENROLLMENT_KEY = "edututor.demo.enrollments.v1";
const TUTOR_APPLICATION_KEY = "edututor.demo.tutor-applications.v1";
export const PORTAL_STORE_EVENT = "edututor:portal-store-changed";

function readList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T[]) : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(PORTAL_STORE_EVENT));
}

function createId(prefix: string) {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${randomPart}`;
}

export function getEnrollmentRequests(): EnrollmentRequest[] {
  return readList<EnrollmentRequest>(ENROLLMENT_KEY);
}

export function getEnrollmentRequestsForUser(userId: string): EnrollmentRequest[] {
  return getEnrollmentRequests().filter((request) => request.userId === userId);
}

export function addEnrollmentRequest(
  input: Omit<EnrollmentRequest, "id" | "status" | "createdAt">,
): EnrollmentRequest {
  const request: EnrollmentRequest = {
    ...input,
    id: createId("enrollment"),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  writeList(ENROLLMENT_KEY, [request, ...getEnrollmentRequests()]);
  return request;
}

export function updateEnrollmentStatus(id: string, status: RequestStatus) {
  writeList(
    ENROLLMENT_KEY,
    getEnrollmentRequests().map((request) =>
      request.id === id ? { ...request, status } : request,
    ),
  );
}

export function getTutorApplications(): TutorApplication[] {
  return readList<TutorApplication>(TUTOR_APPLICATION_KEY);
}

export function getTutorApplicationForUser(userId: string): TutorApplication | undefined {
  return getTutorApplications().find((application) => application.userId === userId);
}

export function saveTutorApplication(
  input: Omit<TutorApplication, "id" | "status" | "createdAt">,
): TutorApplication {
  const existing = getTutorApplicationForUser(input.userId);
  const application: TutorApplication = {
    ...input,
    id: existing?.id ?? createId("tutor-application"),
    status: existing?.status ?? "pending",
    assignedTutorId: existing?.assignedTutorId,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  const next = getTutorApplications().filter((item) => item.userId !== input.userId);
  writeList(TUTOR_APPLICATION_KEY, [application, ...next]);
  return application;
}

export function updateTutorApplicationStatus(
  id: string,
  status: RequestStatus,
  assignedTutorId?: string,
) {
  writeList(
    TUTOR_APPLICATION_KEY,
    getTutorApplications().map((application) =>
      application.id === id
        ? {
            ...application,
            status,
            assignedTutorId:
              status === "approved"
                ? assignedTutorId || application.assignedTutorId || "tut-1"
                : application.assignedTutorId,
          }
        : application,
    ),
  );
}

export function isApprovedTutor(userId?: string | null): boolean {
  if (!userId) return false;
  return getTutorApplicationForUser(userId)?.status === "approved";
}

export function getTutorPhone(tutorId: string): string {
  const contacts: Record<string, string> = {
    "tut-1": "0912 345 678",
    "tut-2": "0988 654 321",
    "tut-3": "0905 226 118",
    "tut-4": "0939 440 225",
    "tut-5": "0977 112 882",
    "tut-6": "0968 210 456",
    "tut-7": "0902 771 339",
    "tut-8": "0938 662 190",
    "tut-9": "0918 773 204",
    "tut-10": "0945 218 670",
    "tut-11": "0973 405 821",
  };
  return contacts[tutorId] ?? "0988 654 321";
}

export function getTutorPhoneForClass(classItem: {
  tutorId?: string;
  tutorName?: string;
}): string {
  if (classItem.tutorId) {
    return getTutorPhone(classItem.tutorId);
  }
  const name = classItem.tutorName?.toLowerCase() || "";
  if (name.includes("bình") || name.includes("binh")) return getTutorPhone("tut-2");
  if (name.includes("an")) return getTutorPhone("tut-1");
  if (name.includes("long")) return getTutorPhone("tut-3");
  if (name.includes("linh")) return getTutorPhone("tut-4");
  if (name.includes("tuấn") || name.includes("tuan")) return getTutorPhone("tut-5");
  if (name.includes("hạnh") || name.includes("hanh")) return getTutorPhone("tut-6");
  if (name.includes("thịnh") || name.includes("bích")) return getTutorPhone("tut-7");
  return getTutorPhone("tut-2");
}

export function hasUserEnrolledInClass(
  userId: string | undefined | null,
  classIdOrCode: string,
): boolean {
  if (!userId) return false;
  const requests = getEnrollmentRequestsForUser(userId);
  const target = classIdOrCode.toLowerCase();
  return requests.some(
    (r) =>
      r.classId.toLowerCase() === target ||
      (r.classTitle && r.classTitle.toLowerCase().includes(target)),
  );
}

export function buildDemoTeachingSchedule(
  application: TutorApplication,
): TeachingScheduleItem[] {
  const address = application.teachingMode === "online" ? undefined : application.city;
  return [
    {
      id: `${application.id}-schedule-1`,
      day: 2,
      period: "morning",
      time: "08:00–09:30",
      subject: application.subject,
      grade: application.grades,
      teachingMode: application.teachingMode,
      address,
    },
    {
      id: `${application.id}-schedule-2`,
      day: 4,
      period: "afternoon",
      time: "14:00–15:30",
      subject: application.subject,
      grade: application.grades,
      teachingMode: application.teachingMode,
      address,
    },
    {
      id: `${application.id}-schedule-3`,
      day: 7,
      period: "morning",
      time: "09:00–10:30",
      subject: application.subject,
      grade: application.grades,
      teachingMode: application.teachingMode,
      address,
    },
  ];
}
