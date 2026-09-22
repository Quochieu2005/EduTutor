# EduTutor

> Database schema and collection rules: [README_DATABASE_EDUTUTOR.md](README_DATABASE_EDUTUTOR.md).

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
| Database   | MongoDB qua MongoEngine; SQLite cho Django nội bộ |
| API        | RESTful JSON API        |

---

## Cấu trúc dự án

```
EduTutor/
├── README.md                    # Tài liệu dự án
├── backend/                     # Django backend
│   ├── manage.py                 # Lệnh quản lý Django
│   ├── requirements.txt          # Dependencies Python
│   ├── .env                      # Biến môi trường local, không commit
│   ├── config/
│   │   ├── settings.py           # Cấu hình Django và kết nối MongoDB
│   │   ├── urls.py               # Khai báo URL backend
│   │   ├── asgi.py               # Điểm vào ASGI
│   │   └── wsgi.py               # Điểm vào WSGI/Render
│   ├── accounts/                 # User document và xác thực
│   ├── tutors/                   # Model và API hồ sơ gia sư
│   └── lessons/                  # Model và API buổi học
└── frontend/                    # Next.js frontend
	├── app/
	│   ├── layout.tsx            # Layout dùng chung
	│   ├── page.tsx              # Trang chính
	│   └── globals.css           # CSS toàn cục
	├── public/                   # Tài nguyên tĩnh
	├── package.json              # Scripts và dependencies Node.js
	├── next.config.ts            # Cấu hình Next.js
	└── tsconfig.json             # Cấu hình TypeScript
```

## Thành phần backend

### `accounts`

Chứa document `User` lưu trong collection MongoDB `users`. Mật khẩu được lưu dưới dạng hash thông qua `make_password`, không lưu plaintext.

### `tutors`

Khu vực dành cho hồ sơ gia sư, môn học và khu vực hoạt động. Các model và API sẽ được mở rộng tại đây.

### `lessons`

Khu vực dành cho yêu cầu học, lịch học và thông tin buổi học.

### `config`

`settings.py` đọc `MONGO_URI` và `MONGO_DB_NAME` từ `backend/.env`, sau đó mở kết nối MongoDB bằng MongoEngine. Django ORM hiện vẫn dùng SQLite cho các thành phần nội bộ như admin, session và migration.

MongoEngine tạo collection khi bản ghi đầu tiên được lưu, vì vậy các document MongoDB không cần chạy `makemigrations` hoặc `migrate`.

## Luồng hoạt động

1. Người dùng truy cập frontend Next.js tại cổng `3000`.
2. Frontend gọi backend bằng biến `NEXT_PUBLIC_API_URL`.
3. Django nhận request tại backend và xử lý logic API.
4. Dữ liệu nghiệp vụ được lưu vào MongoDB thông qua MongoEngine.
5. Django dùng SQLite cho các bảng nội bộ của chính Django.

## Các lệnh thường dùng

### Kiểm tra backend

```bash
cd backend
python manage.py check
```

### Mở Django shell để làm việc với MongoDB

```bash
python manage.py shell
```

Ví dụ đọc user từ collection `users`:

```python
from accounts.models import User

User.objects.all()
```

### Kiểm tra kết nối MongoDB

```bash
python manage.py shell -c "from mongoengine import get_connection; print(get_connection().admin.command('ping'))"
```

Kết quả thành công có dạng `{'ok': 1.0}`.

---

## Cài đặt và chạy dự án

### Yêu cầu
* Python 3.12+
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

Hiện tại backend đã có cấu hình kết nối MongoDB và document `User`. File `backend/config/urls.py` mới đăng ký đường dẫn Django Admin; các endpoint REST của `accounts`, `tutors` và `lessons` sẽ được nối thêm trong các bước phát triển tiếp theo.

---

## Mục tiêu

EduTutor hướng tới việc xây dựng một **nền tảng giáo dục trực tuyến hiện đại**, giúp người học dễ dàng tìm được gia sư phù hợp và hỗ trợ gia sư quản lý hoạt động giảng dạy một cách hiệu quả và chuyên nghiệp.

---

## License

MIT
