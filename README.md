# Twitter Social - Educational Research Project

**🔗 Live Demo:** [https://twitter-social-client.pages.dev/](https://twitter-social-client.pages.dev/)

Đây là một dự án ứng dụng mạng xã hội full-stack được phát triển với mục đích **học tập, nghiên cứu và thực hành** các công nghệ Web hiện đại, kiến trúc hệ thống, bảo mật và tự động hóa quy trình DevOps (Docker, CI/CD). 

Dự án mô phỏng các nghiệp vụ chính của mạng xã hội (tương tự Twitter/X), gồm RESTful API mạnh mẽ (Node.js/Express) và giao diện người dùng mượt mà (React/Vite).

## 🎯 Trọng Tâm Nghiên Cứu & Công Nghệ Áp Dụng

### 1. Quy Trình DevOps & CI/CD
- **Tự động hóa toàn diện:** Thiết lập GitHub Actions pipelines để tự động kiểm tra code (ESLint), build, đóng gói Docker và triển khai (Deploy).
- **Dockerization:** Backend được "đóng gói" thành Docker Image (chạy trên Docker Hub), đảm bảo tính nhất quán trên mọi môi trường và hệ điều hành.
- **Triển khai Đám mây (Cloud):** 
  - Giao diện (Web) được triển khai tĩnh tự động trên **Cloudflare Pages**.
  - Máy chủ (API) được deploy ngầm trên **Render** thông qua Deploy Hooks tự động mỗi khi có code mới.

### 2. Kiến Trúc & Bảo Mật (Security)
- **Bảo vệ API:** Áp dụng `Helmet` cho HTTP Headers, thiết lập `CORS` chặt chẽ theo domain, và sử dụng `Rate Limiting` để phòng chống Brute-force/DDoS.
- **Bảo mật Dữ liệu:** Mã hóa mật khẩu an toàn với Password Secret và các thuật toán băm (Hashing) trước khi lưu vào MongoDB.
- **Xác thực Đa token (JWT):** Áp dụng luồng xác thực bảo mật với `Access Token` (thời gian ngắn) và `Refresh Token` (làm mới token an toàn), cùng với token xác thực Email/Quên mật khẩu riêng biệt.
- **Bảo mật Môi trường:** 100% các biến nhạy cảm, API Keys được quản lý qua biến môi trường (`.env`) và GitHub Secrets, không bao giờ lộ ra mã nguồn.

### 3. Xử Lý Đa Phương Tiện Khối Lượng Lớn
- Cắt xén, nén và tối ưu hóa file Ảnh bằng `Sharp`.
- Chuyển mã và phân mảnh Video (HLS Streaming) thông qua `FFmpeg`, giúp truyền tải video nhanh chóng không cần tải toàn bộ file.

---

## ✨ Tính Năng Cốt Lõi

- **Tài khoản:** Đăng nhập, Đăng ký, Đăng nhập bằng Google OAuth, Xác thực Email, Lấy lại mật khẩu.
- **Mạng xã hội:** Xem Feed, Đăng bài (Tweet), Reply, Like, Bookmark và Repost.
- **Media:** Tải ảnh, Video và tự động tối ưu hiển thị.
- **Tương tác:** Follow/Unfollow, xem trang cá nhân (Profile) người dùng khác.
- **Realtime:** Chat trực tiếp thời gian thực với `Socket.IO`.

---

## 🛠 Tech Stack (Công Nghệ Sử Dụng)

### Backend
- **Core:** Node.js 20+, Express 5, TypeScript
- **Database:** MongoDB (Mongoose)
- **Authentication:** JSON Web Tokens (JWT)
- **Realtime:** Socket.IO
- **Media/Files:** Sharp, FFmpeg
- **Tài liệu:** Swagger UI
- **Khác:** AWS S3/SES (Sẵn sàng tích hợp)

### Frontend
- **Core:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS 4
- **Routing:** React Router
- **Networking:** Axios, Socket.IO Client

---

## ⚙️ Cài đặt & Khởi chạy (Dành cho Development)

### 1. Backend
```bash
git clone https://github.com/minhnt2510/Nodejs-Server.git
cd Nodejs-Server/Twitter_Social
npm install
Copy-Item .env.example .env
```
👉 Cấu hình tối thiểu trong `.env` để chạy thử: `PORT`, `HOST`, MongoDB URI, các chuỗi Secret JWT và Email SMTP (nếu cần test mail).

```bash
npm run dev
```

### 2. Frontend
Mở một cửa sổ Terminal khác:
```bash
cd client
npm install
Copy-Item .env.example .env
```
👉 Cấu hình `VITE_API_URL` trong `.env` trỏ về API Backend (Mặc định `http://localhost:3000`).

```bash
npm run dev
```

---

## 🐳 Khởi chạy bằng Docker (Dành cho Production)
```bash
cd Twitter_Social
Copy-Item .env.example .env
docker compose up --build
```
Dự án được cấu hình sẵn Docker Compose giúp tự động build image và chạy Server ngầm mà không cần cài đặt Node.js/MongoDB thủ công.

---

## 📝 API Documentation
Sau khi chạy Backend, toàn bộ tài liệu API (Swagger) có thể truy cập tại:
`http://localhost:3000/api-docs`

---
*Dự án mã nguồn mở phát triển nhằm mục tiêu chia sẻ kiến thức cộng đồng.*
