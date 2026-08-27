# EduTutor Backend

Backend của EduTutor được xây dựng bằng Django và chuẩn bị cho API REST kết nối MongoDB.

## Công nghệ

- Python
- Django 6.1
- Django REST Framework
- MongoEngine
- MongoDB
- SQLite cho các thành phần nội bộ của Django

## Cấu trúc chính

```text
backend/
├── manage.py             # Lệnh quản lý Django
├── requirements.txt      # Dependencies Python
├── config/
│   ├── settings.py       # Cấu hình Django và MongoDB
│   ├── urls.py           # Khai báo URL
│   ├── asgi.py           # Điểm vào ASGI
│   └── wsgi.py           # Điểm vào WSGI
├── accounts/              # User document và xác thực
├── tutors/                # Hồ sơ gia sư
└── lessons/                # Yêu cầu và lịch học
```

## Danh sách Collection (MongoDB)

| Collection | Công dụng |
|---|---|
| `students` | Lưu thông tin học viên — trung tâm của mọi hoạt động học, mọi request/buổi học/đánh giá đều quy về 1 student cụ thể |
| `parents` | Tài khoản phụ huynh, quản lý 1 hoặc nhiều hồ sơ con, thay con tìm gia sư và gửi yêu cầu học |
| `tutors` | Hồ sơ gia sư — đối tượng chính mà student/parent tìm kiếm, gồm thông tin cá nhân và nghiệp vụ (kinh nghiệm, giá, trạng thái duyệt, rating) |
| `admins` | Tài khoản quản trị hệ thống — duyệt hồ sơ gia sư, xử lý liên hệ, đăng blog |
| `subjects` | Danh mục môn học chuẩn hoá, dùng để tìm kiếm/lọc gia sư theo môn |
| `provinces` | Danh mục tỉnh/thành, gốc để lọc gia sư theo khu vực |
| `districts` | Danh mục quận/huyện thuộc từng tỉnh, lọc khu vực chi tiết hơn |
| `tutor_subjects` | Nối gia sư với môn học họ dạy, kèm cấp độ và giá riêng theo môn |
| `tutor_teaching_areas` | Nối gia sư với khu vực họ nhận dạy, phục vụ tìm kiếm theo khu vực |
| `learning_requests` | Ghi nhận yêu cầu học từ student/parent gửi tới tutor — bước đề nghị trước khi thành buổi học, có trạng thái duyệt |
| `lessons` | Buổi học cụ thể đã xác nhận (ngày giờ, hình thức, giá, trạng thái) |
| `reviews` | Đánh giá của học viên sau buổi học, dùng tính rating trung bình của gia sư |
| `messages` | Trao đổi giữa student/parent và tutor quanh 1 request/buổi học |
| `blog_categories` | Phân loại bài viết blog |
| `blog_posts` | Nội dung blog (chia sẻ kiến thức, SEO, thu hút traffic) |
| `contacts` | Form liên hệ nhanh cho phụ huynh chưa muốn tạo tài khoản — thu thập lead để admin gọi tư vấn |

## Cài đặt

```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
pip install -r requirements.txt
```

Trên macOS/Linux:

```bash
source venv/bin/activate
```

## Cấu hình MongoDB

Tạo file `backend/.env`:

```env
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=edututor
```

Có thể thay `MONGO_URI` bằng connection string của MongoDB Atlas.

## Chạy backend

```bash
python manage.py check
python manage.py migrate
python manage.py runserver
```

Backend chạy tại `http://localhost:8000`.

## Kiểm tra MongoDB

```bash
python manage.py shell -c "from mongoengine import get_connection; print(get_connection().admin.command('ping'))"
```

Kết quả thành công có dạng `{'ok': 1.0}`.

## Làm việc với User MongoDB

User được lưu trong collection `users` thông qua MongoEngine:

```python
from accounts.documents import User

User.objects.all()
```

MongoEngine tự tạo collection khi bản ghi đầu tiên được lưu. Không cần chạy `makemigrations` cho các document MongoDB.

## Trạng thái API

Hiện tại `config/urls.py` mới đăng ký Django Admin tại `/admin/`. Các endpoint REST của `accounts`, `tutors` và `lessons` sẽ được phát triển và nối vào sau.
