# Giao ước làm việc bắt buộc - EduTutor

Tài liệu này là quy tắc bắt buộc đối với Antigravity khi đọc, tạo hoặc chỉnh
sửa mã nguồn trong dự án EduTutor. Các quy tắc này áp dụng cho mọi nhiệm vụ,
trừ khi người dùng trực tiếp đưa ra yêu cầu mới thay thế một quy tắc cụ thể.

## 1. Tuân thủ đúng yêu cầu của người dùng

- Chỉ thực hiện đúng phạm vi mà người dùng yêu cầu.
- Không tự ý thêm tính năng, trang, component, nội dung, dữ liệu hoặc hành vi.
- Không tự ý sửa, tối ưu, tái cấu trúc hay xóa phần nằm ngoài phạm vi nhiệm vụ.
- Không tự đổi công nghệ, dependency, phiên bản package, kiến trúc hoặc quy ước
  của dự án.
- Không được diễn giải một yêu cầu hẹp thành quyền thay đổi toàn bộ hệ thống.
- Nếu yêu cầu chưa rõ và các cách hiểu có thể tạo ra kết quả khác nhau, phải
  hỏi người dùng trước khi thực hiện thay đổi không thể hoàn tác.
- Phải giữ nguyên các thay đổi sẵn có của người dùng không thuộc nhiệm vụ.

## 2. Tuân thủ quy định giao diện của người dùng

- Giao diện phải bám sát nội dung, bố cục, màu sắc, kích thước, khoảng cách,
  hình ảnh và hành vi mà người dùng quy định.
- Không tự thêm section, nút, menu, modal, hiệu ứng, animation, biểu tượng,
  thông báo hoặc nội dung quảng cáo.
- Không tự thay đổi phong cách thiết kế hoặc viết lại nội dung do người dùng
  cung cấp.
- Phải bảo đảm giao diện không bị vỡ trên các kích thước màn hình thuộc phạm
  vi người dùng yêu cầu.
- Khi chưa có thiết kế hoặc thông số cụ thể, chỉ tạo cấu trúc tối thiểu cần
  thiết và chờ yêu cầu tiếp theo.

## 3. Luôn bảo đảm các kết nối hoạt động

- Mọi import, export, route, component, asset, kiểu dữ liệu và nguồn dữ liệu
  phải được kết nối chính xác.
- Không để lại import lỗi, route chết, component không tồn tại, liên kết sai
  hoặc tham chiếu đến tệp đã xóa.
- Không thay đổi hợp đồng dữ liệu hoặc đường dẫn API thật nếu người dùng chưa
  yêu cầu.
- Sau khi sửa code, phải chạy các kiểm tra phù hợp với phạm vi thay đổi, tối
  thiểu gồm lint và build đối với frontend khi môi trường cho phép.
- Không được báo hoàn thành khi kiểm tra vẫn còn lỗi do thay đổi vừa thực hiện.
- Không được âm thầm bỏ qua lỗi. Nếu không thể kiểm tra do thiếu dependency,
  dịch vụ hoặc cấu hình môi trường, phải báo đúng lỗi thực tế.

## 4. Tách biệt frontend và backend

- Khi nhiệm vụ chỉ liên quan đến frontend, tuyệt đối không chỉnh sửa bất kỳ
  tệp backend nào.
- Không sửa API, database, MongoDB document, Django settings, URL backend,
  xác thực backend, template Django hoặc cấu hình triển khai backend trong một
  nhiệm vụ frontend.
- Nếu frontend cần dữ liệu để xây dựng hoặc kiểm thử nhưng API chưa sẵn sàng,
  chỉ được tạo mock data ở phía frontend.
- Mock data phải được tách riêng, có kiểu dữ liệu rõ ràng và có thể thay bằng
  API thật mà không phải viết lại giao diện.
- Không được lấy lý do backend hoặc API chưa hoàn thiện để tự mở rộng phạm vi
  và chỉnh sửa backend.
- Chỉ được thay đổi đồng thời frontend và backend khi người dùng nói rõ rằng
  nhiệm vụ bao gồm cả hai phần.

## 5. An toàn khi thay đổi mã nguồn

- Trước thao tác xóa, phải xác định chính xác tệp và thư mục nằm trong phạm vi
  người dùng yêu cầu.
- Không dùng lệnh xóa đệ quy tại thư mục gốc dự án.
- Không chạy `git reset --hard`, `git clean` hoặc thao tác có thể làm mất thay
  đổi của người dùng nếu chưa được người dùng yêu cầu rõ ràng.
- Không xóa tệp môi trường, Git history, dependency hoặc cấu hình công nghệ
  khi người dùng yêu cầu giữ nguyên công nghệ hiện tại.
- Sau khi hoàn thành, phải báo cáo trung thực các tệp đã thêm, sửa hoặc xóa và
  kết quả kiểm tra đã chạy.

## 6. Thứ tự ưu tiên

Khi thực hiện nhiệm vụ, Antigravity phải ưu tiên theo thứ tự:

1. Yêu cầu trực tiếp và mới nhất của người dùng.
2. Bản giao ước này.
3. Quy ước kỹ thuật hiện có của từng thư mục trong dự án.
4. Giải pháp tối thiểu cần thiết để hoàn thành nhiệm vụ.

Nếu phát hiện xung đột có thể làm thay đổi đáng kể kết quả, phải dừng phần bị
xung đột và hỏi người dùng thay vì tự lựa chọn.
