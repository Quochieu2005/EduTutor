# EduTutor

**EduTutor** là nền tảng web kết nối **gia sư và người học**, hỗ trợ tìm kiếm gia sư, gửi yêu cầu học tập và quản lý lịch học một cách thuận tiện và hiệu quả.

---

## Tính năng chính

* Đăng ký / đăng nhập cho gia sư và người học
* Quản lý hồ sơ gia sư
* Tìm kiếm gia sư theo môn học và khu vực
* Gửi yêu cầu học và đặt lịch học
* Quản lý buổi học và lịch học
* Giao diện thân thiện, hỗ trợ nhiều thiết bị

---

## Công nghệ sử dụng

| Thành phần | Công nghệ             |
| ---------- | --------------------- |
| Frontend   | Next.js               |
| Backend    | Django REST Framework |
| Database   | MySQL                 |
| API        | RESTful JSON API      |

---

## Trạng thái dự án

🚧 **Đang phát triển** — hiện tại dự án đang xây dựng các chức năng cốt lõi như xác thực người dùng, quản lý hồ sơ gia sư và hệ thống đặt lịch học.

---

## Mục tiêu

EduTutor hướng tới việc xây dựng một **nền tảng giáo dục trực tuyến hiện đại**, giúp người học dễ dàng tìm được gia sư phù hợp và hỗ trợ gia sư quản lý hoạt động giảng dạy một cách hiệu quả và chuyên nghiệp.

---
## Cài đặt và chạy dự án

### Backend (Django)
\`\`\`bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
\`\`\`

### Frontend (Next.js)
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`
---
## Cấu trúc dự án
\`\`\`
EduTutor/
├── backend/     # Django REST Framework API
└── frontend/    # Next.js (App Router)
\`\`\`
---
## License
MIT
