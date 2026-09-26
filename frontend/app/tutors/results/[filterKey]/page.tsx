import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { TutorCard } from "@/components/TutorCard";
import {
  MOCK_FEATURED_TUTORS,
  getSidebarFilterByKey,
  filterTutorsBySidebarFilter,
  getAllSidebarFilterKeys,
} from "@/lib/home-mock-data";

export function generateStaticParams() {
  return getAllSidebarFilterKeys().map((filterKey) => ({
    filterKey,
  }));
}

interface PageProps {
  params: Promise<{ filterKey: string }>;
}

export default async function TutorFilterResultsPage({ params }: PageProps) {
  const { filterKey } = await params;
  const filter = getSidebarFilterByKey(filterKey);

  if (!filter) {
    notFound();
  }

  const matchingTutors = filterTutorsBySidebarFilter(MOCK_FEATURED_TUTORS, filter);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Cột 1: Sidebar trái với activeKey khớp với route hiện tại */}
          <div className="w-full lg:w-64 xl:w-72 shrink-0">
            <LeftSidebar activeKey={filter.key} />
          </div>

          {/* Cột 2: Nội dung kết quả tìm kiếm gia sư */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            {/* Breadcrumb điều hướng */}
            <nav aria-label="Breadcrumb" className="text-xs text-gray-500">
              <ol className="flex items-center gap-1.5 flex-wrap">
                <li>
                  <Link href="/Home" className="hover:text-blue-600 transition-colors">
                    Trang chủ
                  </Link>
                </li>
                <li>/</li>
                <li>
                  <Link href="/tutors" className="hover:text-blue-600 transition-colors">
                    Gia sư
                  </Link>
                </li>
                <li>/</li>
                <li className="font-semibold text-gray-900">{filter.label}</li>
              </ol>
            </nav>

            {/* Khung kết quả chính */}
            <section
              aria-label={`Kết quả cho ${filter.label}`}
              className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-gray-200 space-y-5"
            >
              {/* Header tiêu đề và số lượng kết quả (bỏ nút Quay lại Homepage theo yêu cầu) */}
              <div className="pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    </svg>
                  </span>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                      {filter.label}
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Tìm thấy <span className="font-semibold text-blue-600">{matchingTutors.length}</span> gia sư phù hợp với tiêu chí
                    </p>
                  </div>
                </div>
              </div>

              {/* Danh sách gia sư hoặc Empty State */}
              {matchingTutors.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    Chưa có gia sư nào phù hợp với tiêu chí “{filter.label}”.
                  </p>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    Bạn có thể chọn khu vực hoặc tiêu chí khác ở thanh bên trái hoặc xem danh sách tất cả gia sư hiện có.
                  </p>
                  <Link
                    href="/tutors"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors"
                  >
                    <span>Xem tất cả gia sư</span>
                  </Link>
                </div>
              ) : (
                /* Kết quả hiển thị dạng Responsive Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matchingTutors.map((tutor) => (
                    <div key={tutor.id} className="h-full">
                      <TutorCard tutor={tutor} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Cột 3: Sidebar phải */}
          <div className="w-full lg:w-64 xl:w-72 shrink-0">
            <RightSidebar />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
