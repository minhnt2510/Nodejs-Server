# Twitter Social - Educational Research Project

**🔗 Live Demo:** [https://twitter-social-client.pages.dev/](https://twitter-social-client.pages.dev/)

Đây là một dự án ứng dụng mạng xã hội full-stack được phát triển với mục đích **học tập, nghiên cứu và thực hành** các công nghệ Web hiện đại, kiến trúc hệ thống, bảo mật và tự động hóa quy trình DevOps (Docker, CI/CD).

Dự án mô phỏng các nghiệp vụ chính của mạng xã hội (tương tự Twitter/X), gồm RESTful API mạnh mẽ (Node.js/Express) và giao diện người dùng mượt mà (React/Vite).

## 🎯 Trọng Tâm Nghiên Cứu & Công Nghệ Áp Dụng

### 1. Quy Trình DevOps & CI/CD
- **Tự động hóa toàn diện:** Thiết lập GitHub Actions pipelines để tự động kiểm tra code (ESLint, TypeScript Build), đóng gói Docker và triển khai (Deploy).
- **Dockerization:** Backend được "đóng gói" thành Docker Image, đảm bảo tính nhất quán trên mọi môi trường.
- **Triển khai Đám mây (Cloud):**
  - Giao diện (Web) được triển khai tĩnh tự động trên **Cloudflare Pages**.
  - Máy chủ (API) được deploy trên **Render** thông qua Deploy Hooks tự động khi có code mới.

### 2. Kiến Trúc & Bảo Mật (Security)
- **Bảo vệ API:** `Helmet` cho HTTP Headers, `CORS` chặt chẽ, `Rate Limiting` chống Brute-force/DDoS.
- **Bảo mật Dữ liệu:** Mã hóa mật khẩu an toàn trước khi lưu vào MongoDB.
- **Xác thực Đa token (JWT):** Access Token + Refresh Token + Email Verify Token + Forgot Password Token.
- **Bảo mật Môi trường:** 100% biến nhạy cảm qua biến môi trường (`.env`) và GitHub Secrets.

### 3. Xử Lý Đa Phương Tiện
- **Hình ảnh:** Tự động resize client-side trước upload (canvas, max 1920px), nén JPEG quality 0.8, tối ưu bằng `Sharp` backend.
- **Video:** Upload và HLS Streaming qua `FFmpeg`, phân mảnh video để truyền tải nhanh.
- **Lưu trữ:** AWS S3 cho ảnh/video, fallback local nếu chưa cấu hình S3.

### 4. Performance Optimization
- **Redis Cache (Upstash):** Cache user profile 5 phút, tự động invalidate khi update.
- **Database Indexes:** Index cho forgot_password_token, conversations compound, tweets user_id+created_at.
- **Client-side Image Resize:** Giảm dung lượng ảnh 3-5MB → 200-500KB trước upload.

---

## ✨ Tính Năng Cốt Lõi

### 🔐 Authentication
- Đăng ký / Đăng nhập
- Đăng nhập bằng Google OAuth 2.0
- Xác thực Email (verify email link)
- Quên mật khẩu / Đặt lại mật khẩu (hỗ trợ backup link không cần email)
- Refresh Token tự động

### 📝 Tweet (Bài viết)
- Đăng bài (Tweet) với nội dung văn bản + hashtags
- Reply (trả lời), Retweet, Quote Tweet
- Like / Unlike, Bookmark / Unbookmark
- Upload ảnh (tối đa 4 ảnh, resize tự động)
- Upload video (MP4, tối đa 50MB)
- **Copy link** bài viết (share URL)
- Xóa bài viết

### 👥 Social
- Follow / Unfollow người dùng
- Trang cá nhân (Profile) với: Avatar, Cover photo, Bio, Location, Website
- Đếm Following / Followers
- Block / Unblock người dùng
- Search người dùng

### 💬 Chat Real-time (Socket.IO)
- **Nhắn tin text** real-time, hai chiều
- **Gửi ảnh + video** trong tin nhắn
- Emoji **reactions** (👍 ❤️ 😂 😮 😢 🙏) — click lần nữa để thu hồi cảm xúc
- **Menu 3 chấm** trên mỗi tin nhắn:
  - **Reply:** Trả lời tin nhắn (hiển thị indicator + reply_to trong DB)
  - **Select:** Chọn nhiều tin nhắn để xóa hàng loạt
  - **Copy text:** Sao chép nội dung
  - **Recall:** Thu hồi tin nhắn (xóa ảnh/video đi kèm)
  - **Hard delete:** Xóa vĩnh viễn khỏi DB
- **Menu 3 chấm trên cửa sổ chat:**
  - View profile 👤
  - Share contact 🔗
  - Search messages 🔍 (lọc client-side)
  - Delete conversation 🗑️
  - Block / Unblock 🚫
- Danh sách contacts (following + followers)
- Block check hai chiều khi gửi tin nhắn

### 🔍 Search
- Tìm kiếm tweets với text index (hỗ trợ tiếng Việt)
- Lọc theo media type (image / video)
- Lọc theo người đang follow
- Tìm kiếm người dùng

### 🖼️ Media
- Upload image (tối đa 4 ảnh, 5MB/ảnh)
- Upload video (1 video, 50MB)
- HLS video streaming
- Lưu trữ AWS S3 + public read
- Fallback local nếu S3 không khả dụng

---

## 🛠 Tech Stack (Công Nghệ Sử Dụng)

### Backend
| Công nghệ | Mục đích |
|-----------|----------|
| Node.js 20+, Express 5 | Core server |
| TypeScript | Type safety |
| MongoDB (Mongoose) | Database |
| JSON Web Tokens (JWT) | Authentication |
| Socket.IO | Real-time chat |
| Sharp | Image processing |
| FFmpeg | Video encoding (HLS) |
| AWS S3 | Media storage |
| AWS SES | Email sending |
| Upstash Redis | Caching |
| Swagger UI | API documentation |
| Docker | Containerization |

### Frontend
| Công nghệ | Mục đích |
|-----------|----------|
| React 19, TypeScript, Vite | Core UI |
| Tailwind CSS 4 | Styling |
| React Router | Routing |
| Axios | HTTP client |
| Socket.IO Client | Real-time chat |

### DevOps
| Công nghệ | Mục đích |
|-----------|----------|
| GitHub Actions | CI/CD Pipeline |
| Docker | Container |
| Cloudflare Pages | Frontend hosting |
| Render | Backend hosting |

---

## 📦 Cấu trúc Project

```
Nodejs-Server/
├── Twitter_Social/          # Backend (Express + TypeScript)
│   ├── src/
│   │   ├── constants/       # Config, messages, enums
│   │   ├── controllers/     # Route handlers
│   │   ├── middlewares/     # Auth, validation
│   │   ├── models/          # MongoDB schemas
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── utils/           # Helpers (S3, cache, socket, email)
│   ├── uploads/             # Local media storage
│   └── Dockerfile
├── client/                  # Frontend (React + Vite)
│   ├── src/
│   │   ├── apis/            # API clients
│   │   ├── components/      # UI components
│   │   ├── contexts/        # React contexts (Auth, Notification)
│   │   ├── lib/             # Axios instance, storage
│   │   ├── pages/           # Route pages
│   │   ├── types/           # TypeScript definitions
│   │   └── utils/           # Format, image resize
│   └── public/
└── .github/workflows/       # CI/CD pipelines
```

---

## ⚙️ Cài đặt & Khởi chạy (Dành cho Development)

### 1. Backend
```bash
git clone https://github.com/minhnt2510/Nodejs-Server.git
cd Nodejs-Server/Twitter_Social
npm install
Copy-Item .env.example .env
```

👉 **Cấu hình tối thiểu trong `.env`:** MongoDB URI, JWT secrets, SMTP (nếu cần test mail), AWS S3 credentials (nếu cần upload media).

```bash
npm run dev     # Development (hot-reload)
npm run build   # Build TypeScript
npm start       # Production
```

### 2. Frontend
```bash
cd client
npm install
Copy-Item .env.example .env
# Sửa VITE_API_URL=http://localhost:3000
npm run dev
```

---

## 🐳 Khởi chạy bằng Docker
```bash
cd Twitter_Social
Copy-Item .env.example .env
docker compose up --build
```

---

## 📝 API Documentation

Sau khi chạy Backend, truy cập:
`http://localhost:3000/api-docs` (Swagger UI)

### API Endpoints chính

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/users/login` | POST | Đăng nhập |
| `/users/register` | POST | Đăng ký |
| `/users/oauth/google` | GET | Google OAuth |
| `/users/me` | GET/PATCH | Profile cá nhân |
| `/users/:username` | GET | Profile người dùng |
| `/users/follow` | POST | Follow |
| `/users/follow/:user_id` | DELETE | Unfollow |
| `/users/:user_id/following` | GET | Danh sách following |
| `/users/:user_id/followers` | GET | Danh sách followers |
| `/users/forgot-password` | POST | Quên mật khẩu |
| `/users/reset-password` | POST | Đặt lại mật khẩu |
| `/medias/upload-image` | POST | Upload ảnh (max 4) |
| `/medias/upload-video` | POST | Upload video (max 50MB) |
| `/tweets/` | GET/POST | Tweet CRUD |
| `/search/` | GET | Search tweets |
| `/conversations/receivers/:id` | GET/DELETE | Chat messages |
| `/conversations/message/:id` | DELETE | Xóa tin nhắn |

---

## ☁️ Môi trường Production (Render + Cloudflare)

### Biến môi trường cần thiết trên Render

```env
PORT=3000
HOST=https://twitter-social-api.onrender.com
DB_HOST=mongodb+srv://...
JWT_SECRET_ACCESS_TOKEN=...
JWT_SECRET_REFRESH_TOKEN=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=twitter-social-bucket
USE_S3=true
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

### Biến môi trường trên Cloudflare Pages

```env
VITE_API_URL=https://twitter-social-api.onrender.com
```

---

## 🔄 CI/CD Pipeline

- **CI:** `npm run lint` + `npm run build` cho cả Backend và Frontend
- **CD (Render):** Deploy hook tự động khi push lên branch `main`
- **CD (Cloudflare):** Pages auto-deploy từ GitHub repo

---

*Dự án mã nguồn mở phát triển nhằm mục tiêu chia sẻ kiến thức cộng đồng.*
