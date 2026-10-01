# EduTutor Frontend

Frontend của EduTutor được xây dựng bằng Next.js, React và TypeScript.

## Công nghệ

- Next.js 16 với App Router
- React 19
- TypeScript
- Tailwind CSS
- Axios để gọi API backend

## Cấu trúc chính

```text
frontend/
├── app/
│   ├── layout.tsx       # Layout dùng chung
│   ├── page.tsx         # Trang chính
│   └── globals.css      # CSS toàn cục
├── public/              # Hình ảnh và tài nguyên tĩnh
├── package.json         # Scripts và dependencies
├── next.config.ts       # Cấu hình Next.js
└── tsconfig.json        # Cấu hình TypeScript
```

## Cài đặt

```bash
cd frontend
npm install
```

Tạo file `.env.local` trong thư mục `frontend`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
NEXT_PUBLIC_FACEBOOK_APP_ID=your-facebook-app-id
```

Để đăng nhập Google/Facebook không qua dịch vụ trung gian, dùng cùng Google Client ID và Facebook App ID đã cấu hình ở backend. Facebook App Secret chỉ được đặt ở backend, tuyệt đối không đưa sang frontend.

## Chạy môi trường phát triển

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trên trình duyệt.

## Các lệnh khác

```bash
npm run lint     # Kiểm tra lint
npm run build    # Build production
npm run start    # Chạy bản build production
```

Backend mặc định chạy tại `http://localhost:8000`. Khi deploy, đặt `NEXT_PUBLIC_BACKEND_URL` bằng URL HTTPS của Django backend để điều hướng trang Admin (`/admin`), và `NEXT_PUBLIC_API_URL` bằng URL API.

