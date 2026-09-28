# Rà soát API — 28/09/2026

## Kết quả xác minh

- OpenAPI hợp lệ, có 16 đường dẫn nghiệp vụ: tài khoản (8), banner (1), blog (3), liên hệ (1), tuyển dụng (3).
- 94 kiểm thử API, mật khẩu và core/admin chạy thành công bằng MongoDB giả lập trong bộ nhớ. Không tạo/sửa/xóa dữ liệu Atlas thật.
- Frontend production build và ESLint các file recovery đã sửa đều thành công.
- SMTP local kết nối/xác thực thành công trong 3,82 giây, chấp nhận 1 email kiểm thử tới địa chỉ người dùng chỉ định. Đây là email kiểm thử thường, không đổi mật khẩu hay thu hồi phiên của tài khoản thật. Cần người nhận xác nhận Inbox/Spam; SMTP chấp nhận không chứng minh thư đã vào Inbox.
- Ping Atlas chỉ đọc từ máy local: lần mở kết nối 323 ms, kết nối đã mở 39 ms. Không phải số đo latency API Render hay kiểm thử tải production.

## Những lỗi đã sửa

1. Bcrypt: kiểm tra giới hạn 72 **byte**, không chỉ 72 ký tự; giữ nguyên khoảng trắng mật khẩu khi đăng ký/đăng nhập; xác minh PBKDF2 cũ để nâng cấp sang bcrypt khi đăng nhập đúng.
2. JWT: từ chối token thiếu hạn sử dụng, sai loại, sai subject, hết hạn hoặc phiên bị thu hồi; trả 401 thay vì lỗi database/500 do subject sai; không cache phản hồi chứa token/thông tin tài khoản.
3. OAuth: kiểm tra thêm hạn Google/Facebook; kiểm thử đăng ký mới, đăng nhập lại, token hết hạn và sai ứng dụng bằng phản hồi nhà cung cấp giả lập.
4. Quên mật khẩu: khóa gửi lại bằng cập nhật nguyên tử trên User, dùng chung giữa các worker kể cả không có Redis. Chờ 60 giây; tối đa 3 lần gửi/tài khoản/giờ, có thêm giới hạn theo IP.
5. Gửi mail lỗi hoặc backend trả 0: không vô hiệu hóa link cũ đã gửi; ghi nhận lần gửi thất bại để không vượt quota. API trả thông báo **tiếp nhận yêu cầu**, không khẳng định thư đã đến; giữ cùng thông báo với email không tồn tại để không tiết lộ qua nội dung phản hồi. SMTP vẫn đồng bộ, timeout mỗi thao tác tối đa 8 giây; không có hàng đợi nền bền vững.
6. Token reset: lưu digest, hết hạn 300 giây, chỉ dùng một lần; kiểm tra lại thời hạn sau bước hash, cập nhật password/token_version có điều kiện để chống request cạnh tranh. Đổi mật khẩu thành công thu hồi access/refresh JWT cũ. Nếu database lỗi sau khi token đã được nhận xử lý, người dùng cần xin link mới; không khẳng định có transaction xuyên collection.
7. Hai tài khoản local: sửa compound sparse unique index OAuth vốn coi `(local, null)` là trùng. Cần chạy migration index bên dưới với database đã có index cũ.
8. CORS: bật middleware đã có trong requirements, chỉ cho origin được cấu hình, chỉ áp dụng `/api/v1/`, không mở wildcard/cookie credentials.
9. Trang recovery: tách client gọi API công khai khỏi Clerk và mock-data; thêm timeout, hiển thị đúng lỗi validation lồng nhau, chặn nhấn lặp, đếm gửi lại 60 giây, thêm link xin token mới. Trang reset có no-referrer/noindex.
10. Danh sách: gom lấy dữ liệu tham chiếu sau phân trang; giữ nguyên payload/bộ lọc. Kiểm thử đối chiếu 20 tin tuyển dụng cho kết quả giống nhau, số truy vấn **Subject + Province từ 41 xuống 3** (không phải tổng truy vấn của request). Blog 20 bài chỉ cần tối đa 2 truy vấn category. Schema mô tả phân trang và ngày xuất bản đúng kiểu.
11. Database timeout: lỗi API phù hợp được chuyển thành 503 có Retry-After, không trả chi tiết host database.
12. Upload tuyển dụng: ID file ngẫu nhiên tránh đụng file của ứng viên cùng tên/email-local-part và giới hạn chờ upload. Chưa kiểm thử upload Cloudinary thật.

Hai kiểm thử core cũ được hiệu chỉnh, không thay logic admin: trang 2 của 25 bản ghi (20/trang) phải có 5 dòng; kiểm thử số thông báo phải xóa cache giữa các case.

## Hết 5 phút mà chưa thao tác thì sao?

- Token không còn đổi mật khẩu được, kể cả MongoDB chưa dọn bản ghi TTL.
- Mật khẩu và phiên đăng nhập hiện tại không tự thay đổi chỉ vì link hết hạn.
- Không tự gửi thêm email. Người dùng mở Quên mật khẩu để yêu cầu link mới, theo cooldown/quota.
- Kiểm tra Spam; chỉ dùng link mới nhất đã gửi thành công. Nếu SMTP hỏng, admin xem log/kiểm tra kết nối, không yêu cầu người dùng bấm gửi liên tục.

## Cần làm khi triển khai

Trong thư mục backend, sau khi triển khai code và trước khi mở lại đăng ký:

```powershell
python manage.py migrate_user_oauth_index
python manage.py migrate_user_oauth_index --apply
```

Lệnh đầu chỉ xem. Lệnh `--apply` tạo index unique có điều kiện trước, sau đó bỏ đúng index sparse OAuth cũ; không xóa/sửa tài khoản hay bỏ unique email/username. Chưa chạy lệnh thay index trên Atlas trong đợt kiểm tra này. Nếu index mới không tạo được, lệnh dừng trước khi bỏ index cũ.

Cấu hình `FRONTEND_URL` là URL HTTPS website thật để email trỏ đúng trang reset. `CORS_ALLOWED_ORIGINS` là origin frontend được cho phép, phân cách bằng dấu phẩy; không thêm dấu `/` hay đường dẫn ở cuối. Local hiện dùng `http://localhost:3000`.

Kiểm tra SMTP trên môi trường triển khai (không gửi thư nếu không có `--send-to`):

```powershell
python manage.py check_api_mail
```

Render Free chặn SMTP 25/465/587 theo [tài liệu Render](https://render.com/docs/free). Nếu service dùng gói này, Gmail SMTP không thể giải quyết chỉ bằng đổi timeout; cần chọn dịch vụ gửi mail HTTPS hoặc môi trường cho phép SMTP. Chưa đổi gói, đăng ký nhà cung cấp hay cấu hình production thay người dùng.

## Phần chưa thể coi là hoàn tất

- Frontend `/login` đang dùng Clerk; API tài khoản này dùng MongoDB User/JWT. Reset User **không** đổi password Clerk. Chưa tự chuyển hệ thống đăng nhập hoặc đồng bộ hai nơi.
- `api/v1/lessons/urls.py` đã có API đề xuất và đề xuất lại lịch theo phiên bản; chỉ khi học viên và gia sư cùng xác nhận một phương án thì hệ thống mới tạo buổi học. Backend có API lịch rảnh của gia sư và API đề nghị nhận lớp từ bảng lớp. Giao diện Đội ngũ gia sư/Nhận lớp hiện vẫn còn dữ liệu mock/localStorage ở một số đoạn, vì vậy cần hoàn tất đấu nối dữ liệu thật. Frontend Clerk và MongoDB User/JWT vẫn cần được đồng bộ trước khi có thể coi luồng production là hoàn chỉnh.
- OAuth live cần Google/Facebook token thật đúng ứng dụng; trong kiểm thử đã giả lập nhà cung cấp, không giả lập nghiệp vụ lưu User.
- Upload hồ sơ Cloudinary chưa được xác minh live. Hiện hồ sơ lưu URL asset; chưa có endpoint tải tài liệu riêng kiểm tra quyền admin. Cần thiết kế delivery riêng cho CV/CCCD trước khi thu thập tài liệu nhạy cảm trên production.
- SMTP vẫn là bước I/O đồng bộ; chưa có worker/queue gửi email. Latency production còn phụ thuộc Render cold start, region, Atlas, Redis và nhà cung cấp. Không tuyên bố mọi API trên Render đã nhanh hoặc đã load-test.
- Chưa commit, push, deploy hay sửa biến môi trường Render.

## Chạy lại kiểm thử an toàn

```powershell
python -m pip install -r requirements-test.txt
python run_api_tests.py core
```

`run_api_tests.py` ép URI local trước khi Django đọc cấu hình và dùng mongomock; không dùng credentials Atlas từ `.env`. Bộ test kiểm tra kết nối thực sự là mongomock trước khi dọn dữ liệu kiểm thử. Không dùng settings test cho production.
