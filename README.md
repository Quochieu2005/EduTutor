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

| Thành phần | Công nghệ              |
| ---------- | ----------------------- |
| Frontend   | Next.js (App Router)    |
| Backend    | Django REST Framework   |
| Database   | MongoDB                 |
| API        | RESTful JSON API        |

---

## Cấu trúc dự án

```
EduTutor/
├── backend/          # Django REST Framework API
│   ├── accounts/     # Đăng ký / đăng nhập, User model
│   ├── tutors/       # Hồ sơ gia sư, môn học, khu vực
│   ├── lessons/      # Yêu cầu học, buổi học
│   └── config/       # Settings, URL chính
└── frontend/         # Next.js + TypeScript + Tailwind
```

---

## Cài đặt và chạy dự án

### Yêu cầu
* Python 3.10+
* Node.js 18+
* MongoDB (chạy local hoặc dùng MongoDB Atlas)

### Backend (Django)

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
```

Tạo file `.env` trong `backend/` với thông tin kết nối MongoDB:

```
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=edututor
```

Chạy migrate và khởi động server:

```bash
python manage.py migrate
python manage.py runserver
```

### Frontend (Next.js)

```bash
cd frontend
npm install
```

Tạo file `.env.local` trong `frontend/`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Chạy dev server:

```bash
npm run dev
```

Frontend chạy tại `http://localhost:3000`, backend API tại `http://localhost:8000`.

---

## Trạng thái dự án

🚧 **Đang phát triển** — hiện tại dự án đang xây dựng các chức năng cốt lõi như xác thực người dùng, quản lý hồ sơ gia sư và hệ thống đặt lịch học.

---

## Mục tiêu

EduTutor hướng tới việc xây dựng một **nền tảng giáo dục trực tuyến hiện đại**, giúp người học dễ dàng tìm được gia sư phù hợp và hỗ trợ gia sư quản lý hoạt động giảng dạy một cách hiệu quả và chuyên nghiệp.

---

## License

MIT
