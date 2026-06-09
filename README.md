# Twitter Social

Ứng dụng mạng xã hội full-stack mô phỏng các luồng chính của Twitter/X. Dự án gồm REST API viết bằng Node.js + Express + TypeScript và giao diện React + Tailwind CSS, hỗ trợ xác thực JWT, đăng bài, tương tác, hồ sơ người dùng, tìm kiếm, upload media và chat thời gian thực.

## Tính năng

- Đăng ký, đăng nhập, đăng xuất và tự động làm mới access token.
- Xác minh email, quên mật khẩu và đặt lại mật khẩu.
- Đăng nhập Google OAuth.
- Xem news feed và trang chi tiết bài viết.
- Đăng, sửa và xóa bài viết hoặc reply của chính mình.
- Like, Save và Repost; các thao tác đều có thể hoàn tác.
- Trang profile hiển thị bài viết của người dùng.
- Cập nhật thông tin cá nhân, avatar và ảnh bìa bằng file ảnh.
- Tìm kiếm bài viết, tìm tài khoản và follow/unfollow.
- Upload ảnh, video và xử lý video HLS.
- Nhắn tin thời gian thực bằng Socket.IO.
- Swagger/OpenAPI cho backend.
- Helmet, CORS, rate limiting và validation đầu vào.

## Công nghệ

### Backend

- Node.js 20+
- Express 5
- TypeScript
- MongoDB
- JWT
- Socket.IO
- Swagger UI
- Sharp và FFmpeg
- AWS S3/SES
- Docker, Docker Compose và PM2

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- React Router
- Axios
- Socket.IO Client

## Cấu trúc chính

```text
.
|-- client/                 # React frontend
|   |-- src/apis/           # HTTP clients
|   |-- src/components/     # UI và tweet components
|   |-- src/contexts/       # Trạng thái xác thực
|   `-- src/pages/          # Các trang của ứng dụng
|-- Twitter_Social/         # Express backend
|   |-- src/controllers/
|   |-- src/middlewares/
|   |-- src/models/
|   |-- src/routes/
|   |-- src/services/
|   `-- src/utils/
`-- README.md
```

`Nodejs-Ts/` và `ServerNodejs/` là các thư mục bài tập/phiên bản cũ trong repository. Ứng dụng Twitter hiện tại sử dụng `Twitter_Social/` và `client/`.

## Yêu cầu

- Node.js 20 trở lên.
- npm.
- MongoDB local hoặc MongoDB Atlas.
- FFmpeg nếu dùng upload/chuyển mã video ngoài Docker.
- Tài khoản SMTP, Google OAuth hoặc AWS chỉ cần thiết khi sử dụng các tích hợp tương ứng.

## Cài đặt

### 1. Clone repository

```bash
git clone https://github.com/minhnt2510/Nodejs-Server.git
cd Nodejs-Server
```

### 2. Cấu hình backend

```powershell
cd Twitter_Social
npm install
Copy-Item .env.example .env
```

Điền các giá trị cần thiết trong `Twitter_Social/.env`. Tối thiểu cần cấu hình MongoDB và các JWT secret:

| Nhóm | Biến |
| --- | --- |
| Server | `PORT`, `HOST`, `CLIENT_URL`, `CLIENT_REDIRECT_CALLBACK` |
| MongoDB | `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `DB_HOST` |
| JWT | `JWT_SECRET_ACCESS_TOKEN`, `JWT_SECRET_REFRESH_TOKEN`, `JWT_SECRET_EMAIL_VERIFY_TOKEN`, `JWT_SECRET_FORGOT_PASSWORD_TOKEN` |
| Email | `SMTP_SERVICE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| AWS | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME`, `SES_FROM_ADDRESS` |
| Khác | `PASSWORD_SECRET`, `GEMINI_API_KEY` |

Khởi động backend:

```bash
npm run dev
```

Backend mặc định chạy tại `http://localhost:3000`.

### 3. Cấu hình frontend

Mở terminal khác tại thư mục gốc:

```powershell
cd client
npm install
Copy-Item .env.example .env
npm run dev
```

Frontend mặc định chạy tại `http://localhost:5173`.

## Lệnh thường dùng

### Backend

```bash
npm run dev       # Chạy development với nodemon
npm run build     # Biên dịch TypeScript vào dist
npm start         # Chạy bản đã build
npm run lint      # Chạy ESLint
npm run prettier  # Kiểm tra format
```

### Frontend

```bash
npm run dev       # Chạy Vite development server
npm run build     # Type-check và build production
npm run lint      # Chạy ESLint
npm run preview   # Xem thử production build
```

## API

Swagger UI:

```text
http://localhost:3000/api-docs
```

Các nhóm endpoint chính:

| Prefix | Chức năng |
| --- | --- |
| `/users` | Xác thực, profile, follow và tìm người dùng |
| `/tweets` | Feed, bài viết, reply, repost, cập nhật và xóa |
| `/likes` | Like và unlike |
| `/bookmarks` | Save và unsave |
| `/medias` | Upload ảnh/video và trạng thái HLS |
| `/static` | Phục vụ media local |
| `/search` | Tìm kiếm bài viết |
| `/conversations` | Lịch sử hội thoại |

Các route được bảo vệ yêu cầu header:

```http
Authorization: Bearer <access_token>
```

## Docker

Backend có thể chạy bằng Docker Compose:

```powershell
cd Twitter_Social
Copy-Item .env.example .env
docker compose up --build
```

Docker nhận biến môi trường qua `env_file`; `.env` không được copy vào image.

## Kiểm tra trước khi commit

```powershell
cd Twitter_Social
npm run build

cd ..\client
npm run lint
npm run build
```

## Bảo mật cấu hình

- Không commit `.env`, token, password, private key hoặc credential thật.
- Chỉ commit `.env.example` với giá trị mẫu.
- Dùng secret dài, ngẫu nhiên và khác nhau cho từng JWT token.
- Xoay vòng ngay credential nếu đã từng xuất hiện trong Git history.
- Cấu hình CORS theo domain cụ thể khi deploy production.
- Lưu secret trên GitHub Actions Secrets hoặc secret manager của nền tảng deploy.

## Giấy phép

Backend hiện khai báo giấy phép ISC trong `Twitter_Social/package.json`.
