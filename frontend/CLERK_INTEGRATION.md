# Clerk Integration Guide - EduTutor

## ✅ Tích Hợp Hoàn Thành

Clerk đã được tích hợp vào dự án EduTutor của bạn. Dưới đây là những thay đổi đã thực hiện:

### 📝 Các Tệp Đã Cập Nhật

1. **`frontend/components/Providers.tsx`**
   - Thêm `ClerkProvider` để bao quanh ứng dụng
   - Giữ `AuthProvider` của bạn để tương thích với hệ thống hiện tại

2. **`frontend/app/layout.tsx`**
   - Import `ClerkProvider` để đảm bảo xác thực toàn toàn ứng dụng

3. **`frontend/middleware.ts`** (Tệp Mới)
   - Middleware để bảo vệ các tuyến đường (routes) như `/profile`, `/lessons`, `/tutors`
   - Tự động yêu cầu xác thực cho các tuyến đường được bảo vệ

4. **`frontend/components/Navbar.tsx`**
   - Cập nhật để sử dụng `useUser` từ Clerk
   - Thay thế `logout` bằng `SignOutButton` của Clerk

### 🔐 Biến Môi Trường

Các khóa Clerk của bạn đã được cấu hình trong `.env.local`:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Khóa công khai
- `CLERK_SECRET_KEY` - Khóa bí mật

### 🚀 Các Tính Năng Clerk Có Sẵn

#### 1. **Xác Thực Tự Động**

```typescript
import { useUser } from "@clerk/nextjs";

export default function MyComponent() {
  const { user } = useUser();

  if (user) {
    console.log(user.firstName, user.email);
  }
}
```

#### 2. **Đăng Xuất**

```typescript
import { SignOutButton } from "@clerk/nextjs";

export default function LogoutButton() {
  return (
    <SignOutButton>
      <button>Đăng Xuất</button>
    </SignOutButton>
  );
}
```

#### 3. **Bảo Vệ Tuyến Đường**

Middleware tự động bảo vệ các tuyến đường này:

- `/profile`
- `/lessons`
- `/tutors`

Người dùng chưa xác thực sẽ bị chuyển hướng đến trang đăng nhập Clerk.

#### 4. **Thông Tin Người Dùng**

```typescript
// Truy cập thông tin người dùng Clerk
const { user } = useUser();

if (user) {
  console.log(user.id); // ID duy nhất
  console.log(user.email); // Email
  console.log(user.firstName); // Tên
  console.log(user.lastName); // Họ
  console.log(user.imageUrl); // Ảnh đại diện
  console.log(user.metadata); // Dữ liệu tùy chỉnh
}
```

### 📋 Các Bước Tiếp Theo

1. **Cập Nhật Trang Đăng Nhập**
   - Bạn có thể thay thế trang đăng nhập tùy chỉnh bằng Clerk's `<SignIn />` component:

   ```typescript
   import { SignIn } from "@clerk/nextjs";

   export default function LoginPage() {
     return <SignIn />;
   }
   ```

2. **Cập Nhật Trang Đăng Ký**
   - Tương tự, sử dụng Clerk's `<SignUp />` component:

   ```typescript
   import { SignUp } from "@clerk/nextjs";

   export default function RegisterPage() {
     return <SignUp />;
   }
   ```

3. **Lưu Trữ Dữ Liệu Người Dùng**
   - Sử dụng `user.metadata` để lưu trữ dữ liệu tùy chỉnh như `role` (student/tutor):

   ```typescript
   await user.update({
     unsafeMetadata: {
       role: "tutor",
     },
   });
   ```

4. **Webhook từ Clerk**
   - Trong Clerk Dashboard, thiết lập webhooks để đồng bộ hóa người dùng với cơ sở dữ liệu Django của bạn

### 🔗 Liên Kết Hữu Ích

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk + Next.js](https://clerk.com/docs/quickstarts/nextjs)
- [User Object](https://clerk.com/docs/references/nextjs/user-object)
- [Clerk Webhooks](https://clerk.com/docs/webhooks/overview)

### ✨ Ghi Chú

- Clerk hiện tại đang chạy ở chế độ **Test** (dùng khóa test)
- Khi sẵn sàng for production, thay thế các khóa test bằng khóa production
- AuthProvider tùy chỉnh của bạn vẫn hoạt động cạnh Clerk - bạn có thể giữ lại hoặc loại bỏ tùy vào nhu cầu
