# 🎬 AniStore - Web Xem & Lưu Trữ Anime Cá Nhân (Google Drive)

Trang web lưu trữ và phát trực tuyến anime cá nhân được xây dựng với **Next.js**, **Tailwind CSS**, tối ưu giao diện chuẩn Dark Mode AnimeVietsub (mượt mà trên cả Mobile & PC).

---

## 🚀 Khởi chạy dự án trên máy

1. Mở terminal tại thư mục này:
   ```bash
   npm run dev
   ```
2. Truy cập web tại trình duyệt:
   - **Trang chủ:** [http://localhost:3000](http://localhost:3000)
   - **Trang Quản trị & Upload:** [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 📂 Hướng dẫn Upload Video bằng Google Drive (`lethanhtaicute2k6@gmail.com`)

1. **Upload video:** Tải file phim (`.mp4`, `.mkv`) lên Google Drive của bạn.
2. **Bật quyền xem:** Chuột phải vào file video > chọn **Chia sẻ (Share)** > chuyển mục *Quyền truy cập chung* thành **"Bất kỳ ai có đường liên kết" (Anyone with the link)**.
3. **Thêm vào Web:**
   - Vào [Trang Quản trị](/admin) > **Thêm Anime Mới** (Nhập tên phim, link ảnh bìa poster).
   - Chọn mục **Tập Phim** > Dán link chia sẻ Google Drive (hệ thống sẽ tự động chuyển đổi thành link phát video tốc độ cao).
   - Hỗ trợ thêm hàng loạt tập cùng lúc (Bulk Paste).

---

## 🌐 Hướng dẫn Public Web ra ngoài Internet (Miễn Phí)

Để bạn và bạn bè có thể xem được trên điện thoại từ bất kỳ đâu:
1. Đẩy mã nguồn lên **GitHub** (tạo repository mới).
2. Truy cập [Vercel.com](https://vercel.com) > Đăng nhập > Chọn **Add New Project** > Chọn Repository vừa tạo.
3. Bấm **Deploy** > Bạn sẽ nhận được 1 link dạng `https://ten-web-cua-ban.vercel.app` có thể mở trên mọi thiết bị máy tính lẫn điện thoại.
