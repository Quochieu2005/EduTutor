import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function ClassRulesPage() {
  const rules = [
    {
      step: "01",
      title: "Điều kiện nhận lớp",
      items: [
        "Gia sư phải cung cấp thông tin trung thực về học vấn, văn bằng, chứng chỉ và kinh nghiệm giảng dạy.",
        "Đáp ứng đầy đủ các yêu cầu chuyên môn và thời gian học do phụ huynh/học sinh đề ra cho từng lớp cụ thể.",
        "Được EduTutor phê duyệt hồ sơ và xác nhận đăng ký nhận lớp trước khi bắt đầu buổi dạy đầu tiên.",
      ],
    },
    {
      step: "02",
      title: "Trách nhiệm của gia sư",
      items: [
        "Chuẩn bị giáo án, tài liệu và lộ trình học tập rõ ràng phù hợp với năng lực của học sinh.",
        "Đến lớp đúng giờ, dạy đủ thời lượng quy định (tối thiểu 90 - 120 phút/buổi tùy theo thỏa thuận lớp).",
        "Thường xuyên kiểm tra kiến thức, theo dõi sự tiến bộ và báo cáo kết quả định kỳ cho phụ huynh.",
      ],
    },
    {
      step: "03",
      title: "Quy tắc liên hệ phụ huynh / học viên",
      items: [
        "Liên hệ với phụ huynh trong vòng 24 giờ sau khi được trung tâm xác nhận nhận lớp thành công.",
        "Giữ thái độ lịch sự, tôn trọng, trao đổi rõ ràng về phương pháp giảng dạy và mục tiêu học tập.",
        "Chỉ trao đổi về các nội dung liên quan trực tiếp đến việc học tập của học viên.",
      ],
    },
    {
      step: "04",
      title: "Quy tắc thay đổi hoặc hủy lịch",
      items: [
        "Nếu có việc bận đột xuất cần dời lịch dạy, gia sư phải thông báo cho phụ huynh trước ít nhất 12 - 24 giờ.",
        "Không được tự ý hủy lịch học mà không có lý do chính đáng và không sắp xếp buổi dạy bù thích hợp.",
        "Nếu không thể tiếp tục nhận lớp lâu dài, phải thông báo cho trung tâm và phụ huynh trước ít nhất 2 tuần.",
      ],
    },
    {
      step: "05",
      title: "Quy tắc bảo mật thông tin",
      items: [
        "Bảo mật tuyệt đối số điện thoại, địa chỉ nhà riêng và hình ảnh của phụ huynh cũng như học sinh.",
        "Không chia sẻ tài liệu nội bộ, thông tin cá nhân hoặc bài kiểm tra của học sinh ra bên ngoài mà chưa có sự đồng ý.",
      ],
    },
    {
      step: "06",
      title: "Quy tắc ứng xử",
      items: [
        "Trang phục gọn gàng, lịch sự, tác phong sư phạm chuẩn mực trong cả buổi học trực tiếp lẫn học online.",
        "Tuyệt đối không sử dụng điện thoại cho việc riêng trong giờ dạy.",
        "Kiên nhẫn, tận tâm, không dùng lời lẽ tiêu cực hoặc xúc phạm đến danh dự của học sinh.",
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-gray-500">
          <ol className="flex items-center gap-1.5">
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
            <li className="font-semibold text-gray-900">Nội quy nhận lớp</li>
          </ol>
        </nav>

        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-gray-200 space-y-8">
          <div className="border-b border-gray-100 pb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Nội quy nhận lớp dành cho gia sư
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Các quy định bắt buộc nhằm đảm bảo quyền lợi, tính chuyên nghiệp và chất lượng giáo dục tại EduTutor
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rules.map((rule) => (
              <section
                key={rule.step}
                className="p-5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-purple-200 transition-all space-y-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                    {rule.step}
                  </span>
                  <h2 className="text-base font-bold text-gray-900">
                    {rule.title}
                  </h2>
                </div>
                <ul className="space-y-2 text-xs text-gray-700 list-disc list-inside leading-relaxed">
                  {rule.items.map((item, idx) => (
                    <li key={idx} className="pl-1">
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>
              Bạn đã nắm rõ nội quy và sẵn sàng nhận lớp giảng dạy?
            </span>
            <div className="flex gap-2 shrink-0">
              <Link
                href="/classes"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-xs"
              >
                Xem lớp cần tuyển
              </Link>
              <Link
                href="/tutors/register"
                className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Đăng ký gia sư
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
