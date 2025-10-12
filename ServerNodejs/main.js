const http = require("http");

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    if (req.url === "/") res.end("Trang chủ");
    else if (req.url === "/about") res.end("Giới thiệu");
    else res.end("404 - Không tìm thấy");
  })
  .listen(3000, () => console.log("Server chạy ở http://localhost:3000"));
