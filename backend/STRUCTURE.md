# EduTutor Backend — Cấu trúc thư mục

```text
backend/
├── manage.py                 # Chạy lệnh Django
├── requirements.txt          # Dependency Python
├── package.json              # Dependency Tailwind CSS
├── package-lock.json         # Khóa phiên bản package JavaScript
├── build.sh                  # Script build/deploy
├── .env                      # Biến môi trường thật (không commit)
├── .env.example              # Mẫu biến môi trường
├── config/
│   ├── settings/
│   │   ├── __init__.py       # Mặc định dùng cấu hình dev
│   │   ├── base.py           # Cấu hình dùng chung
│   │   ├── dev.py            # Cấu hình local
│   │   └── prod.py           # Cấu hình production
│   ├── urls.py               # URL gốc của project
│   ├── wsgi.py               # Entry point WSGI (Gunicorn)
│   └── asgi.py               # Entry point ASGI
├── accounts/
│   ├── documents.py          # MongoEngine document User
│   ├── admin.py              # Đăng ký Django admin
│   ├── apps.py               # Django app config
│   └── views.py              # View nội bộ (nếu cần)
├── lessons/
│   ├── documents.py          # MongoEngine document của bài học
│   ├── admin.py
│   ├── apps.py
│   └── views.py
├── tutors/
│   ├── documents.py          # MongoEngine document của gia sư
│   ├── admin.py
│   ├── apps.py
│   └── views.py
├── api/
│   ├── urls.py               # Gộp các phiên bản API
│   ├── exception_handlers.py # Chuẩn hóa lỗi REST API
│   └── v1/
│       ├── urls.py           # Route API v1 theo domain
│       ├── accounts/         # urls.py, serializers.py, views.py, services.py
│       ├── lessons/          # urls.py, serializers.py, views.py, services.py
│       └── tutors/           # urls.py, serializers.py, views.py, services.py
├── core/
│   ├── documents.py          # BaseDocument dùng chung
│   ├── permissions.py        # Permission dùng chung
│   ├── exceptions.py         # Domain exception dùng chung
│   └── pagination.py         # Phân trang API dùng chung
└── templates/
    ├── views.py              # Render dashboard và trang xác thực
    ├── admin/                # dashboard.html, profile.html
    ├── auth/                 # sign-in.html, forgot-password.html, otp.html
    ├── error/                # not-found.html
    ├── components/           # HTML component tái sử dụng
    └── static/admin_ui/      # CSS/JS riêng cho admin dashboard
```

## Quy ước đặt code

- `documents.py`: định nghĩa MongoEngine `Document`; dự án dùng MongoDB nên không dùng `models.py` của Django ORM.
- `api/v1/<domain>/serializers.py`: kiểm tra và chuyển đổi dữ liệu request/response.
- `api/v1/<domain>/views.py`: nhận HTTP request, gọi service và trả HTTP response.
- `api/v1/<domain>/services.py`: business logic và truy vấn document; tránh đặt logic này trong view.
- `api/v1/<domain>/urls.py`: endpoint của riêng domain đó. Hiện các file này là khung rỗng, sẵn sàng thêm endpoint.
- `core/`: chỉ chứa phần tái sử dụng giữa các domain, không đặt logic đặc thù tài khoản/bài học/gia sư ở đây.
- `config/settings/base.py`: mọi cấu hình dùng chung và biến môi trường. `dev.py`/`prod.py` chỉ ghi đè khác biệt môi trường.

## Luồng URL

```text
config/urls.py → api/urls.py → api/v1/urls.py → api/v1/<domain>/urls.py
```

API v1 được mount tại `/api/v1/`; ví dụ endpoint accounts sẽ bắt đầu bằng `/api/v1/accounts/`.
