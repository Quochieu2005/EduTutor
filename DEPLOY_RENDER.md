# Deploy EduTutor lên Render với MongoDB Atlas

## 1. Bảo vệ thông tin đăng nhập

- Không commit file `.env`, `atlas-credentials.env` hoặc connection string Atlas.
- Tạo lại mật khẩu Database User nếu connection string từng được chia sẻ.
- Trong Atlas, Database User chỉ nên có quyền đọc/ghi database `edututor`.

## 2. Tạo Web Service bằng Blueprint

1. Push code lên nhánh cần deploy trên GitHub.
2. Mở Render Dashboard, chọn **New > Blueprint**.
3. Chọn repository và nhánh chứa `render.yaml`.
4. Khi Render yêu cầu các biến `sync: false`, nhập:

| Key | Value |
| --- | --- |
| `MONGODB_URI` | Connection string `mongodb+srv://...` từ Atlas |
| `EMAIL_HOST_USER` | Địa chỉ Gmail gửi OTP |
| `EMAIL_HOST_PASSWORD` | Google App Password 16 ký tự |
| `DEFAULT_FROM_EMAIL` | `EduTutor <your-email@gmail.com>` |

`SECRET_KEY` được Render tự tạo. `MONGO_DB_NAME` đã được đặt là `edututor`.

## 3. Cho phép Render truy cập Atlas

Sau khi Render tạo service:

1. Mở service trên Render.
2. Chọn **Connect > Outbound** và sao chép toàn bộ dải IP CIDR.
3. Trong Atlas mở **Security > Network Access > Add IP Address**.
4. Thêm từng dải IP của Render.
5. Chọn **Manual Deploy > Deploy latest commit** trên Render.

Có thể tạm thêm `0.0.0.0/0` để kiểm tra kết nối, nhưng nên thay bằng các dải
Outbound IP của Render ngay sau đó.

## 4. Kiểm tra sau deploy

- Build phải hoàn tất bước `collectstatic`.
- Log khởi động phải có Gunicorn lắng nghe trên `$PORT`.
- Mở `/admin/sign-in` trên domain Render.
- Thử đăng nhập và gửi OTP quên mật khẩu.

Nếu Atlas chưa có dữ liệu local, cần sao chép các collection cần thiết sang
database `edututor` trên Atlas trước khi có thể đăng nhập bằng tài khoản hiện tại.
