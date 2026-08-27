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
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

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

Backend mặc định chạy tại `http://localhost:8000`. Khi deploy, thay `NEXT_PUBLIC_API_URL` bằng URL HTTPS của backend.
