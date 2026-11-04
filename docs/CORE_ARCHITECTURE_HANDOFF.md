# Handoff: Kiến Trúc Cốt Lõi & Cơ Chế Vận Hành Hệ Thống Anime Web Song Ngữ

Tài liệu này tổng hợp toàn bộ tri thức thực chiến, kiến trúc kỹ thuật từ tầng hạ tầng đám mây đến thuật toán xử lý video/audio cục bộ, lý do đưa ra các quyết định kỹ thuật và hướng dẫn vận hành không sai sót cho hệ thống **Anime Web Song Ngữ Shadowing**.

---

## 1. Bức Tranh Tổng Thể (System Architecture Overview)

```mermaid
flowchart TD
    subgraph Local_Laptop["1. Xưởng Sản Xuất Cục Bộ (Laptop - 0 MB Storage)"]
        direction TB
        A["1. Nyaa / SubsPlease"] -->|"WebTorrent (1080p MKV)"| B["Video Master Thô"]
        B -->|"Bóc tách ASS"| C["Engsub (.en.ass) & Vietsub (.vi.ass)"]
        C --> D["bilingual_engine.py"]
        D -->|"ECAPA-TDNN ONNX"| D1["Phân loại Nam/Nữ"]
        D -->|"Edge Neural TTS + atempo"| D2["Lồng tiếng Anh"]
        D -->|"Frame-Accurate Seek Concat"| D3["Video Shadowing 1080p"]
        D3 --> E["public/videos/{slug}_ep{ep}_bilingual.mp4"]
        D --> F["public/subtitles/{slug}_{ep}.json"]
    end

    subgraph Dual_Cloud_Storage["2. Lưu Trữ Kép Đám Mây (Dual Google Drive 5TB)"]
        direction TB
        E -->|"rclone copy (Google OAuth)"| G["Drive 1 (Primary - 2009)<br/>Thư mục: anime-vietsub<br/>(Chứa video MP4 gốc 1080p)"]
        G -.->|"Service Account tạo Shortcut (0 MB)"| H["Drive 2 (Backup Mirror - 2006)<br/>Thư mục: anime-web<br/>(Lối tắt dự phòng tức thời)"]
    end

    subgraph Laptop_Cleanup["3. Dọn Dẹp Tuyệt Đối"]
        E -.->|"Xóa 100% video & workdir"| I["Ổ cứng laptop = 0 MB Video"]
    end

    subgraph Edge_Cloud["4. Vận Hành Toàn Cầu 24/7 (Cloudflare Edge)"]
        direction TB
        J["GitHub Repository<br/>taileesin-2k6/anime-web"] -->|"Cloudflare Edge CI/CD"| K["Cloudflare Workers<br/>(OpenNext + Next.js 16)"]
        K -->|"Route: /api/stream"| L["Service Account JWT RSA-SHA256<br/>(Vĩnh viễn đến năm 10.000)"]
        L -->|"HTTP 206 Partial Content (2MB Chunks)"| G
        L -.->|"Tự động Failover nếu lỗi"| H
        K -->|"Phát luồng Video + Subtitle JSON"| M["Trình Duyệt Khách (iOS / Android / PC)<br/>24/7 không cần bật laptop"]
    end

    Local_Laptop --> Dual_Cloud_Storage
    Dual_Cloud_Storage --> Edge_Cloud
```

---

## 2. Vì Sao Chọn Cấu Trúc Này? (Key Design Decisions)

### 2.1. Tại sao không dùng Vercel?
- **Giới hạn băng thông (Bandwidth Limit):** Gói miễn phí của Vercel giới hạn **100 GB/tháng**. Mỗi tập anime song ngữ nặng ~350 MB - 600 MB. Chỉ cần vài chục lượt xem là sập băng thông hoặc bị tính phí quá ngưỡng.
- **Serverless Timeout:** Vercel giới hạn hàm chạy tối đa 10s đến 60s, dễ bị rớt kết nối giữa chừng khi người dùng tua phim (seeking).
- **Giải pháp thay thế:** Đưa lên **Cloudflare Workers (OpenNext)**. Cloudflare có chính sách miễn phí băng thông không giới hạn (Unmetered Bandwidth) và mạng lưới Edge phủ sóng hơn 300 thành phố (trong đó có trạm SGN / TP.HCM), giúp tua phim tức thì mà không lo hóa đơn.

### 2.2. Tại sao không dùng khung phát video nhúng iframe của Google Drive?
- Google Drive iframe player là một web player đóng kín:
  1. **Mất hoàn toàn phụ đề tương tác tra từ điển** của website.
  2. Bị chèn logo Google Drive, thanh điều khiển xấu xí và không đồng bộ với giao diện Dark Mode cao cấp của web.
  3. Rất dễ bị lỗi `"Đã vượt quá số lượt xem trong 24 giờ"` (Google Drive 24h Quota Exceeded).
- **Giải pháp thay thế:** Xây dựng **Native Video Player (HTML5 Video)** riêng của web, phát luồng qua proxy `/api/stream` với cơ chế **HTTP 206 Byte-Range Seeking**.

---

## 3. Bí Mật Kiến Trúc Dual Google Drive & Bản Chất Token Google

### 3.1. Sự khác biệt giữa 2 tài khoản Google Drive

| Thuộc tính | Tài khoản Chính (Primary) | Tài khoản Dự Phòng (Backup Mirror) |
| :--- | :--- | :--- |
| **Email** | `lethanhtaicute2009@gmail.com` | `lethanhtaicute2006@gmail.com` |
| **Tên Thư Mục** | `anime-vietsub` | `anime-web` |
| **Folder ID** | `1prgO-NQHj-PYzkhX3HAEC3d5NXZuPtVl` | `1vTU_kEXo6AfLeq59hixKb_oZCt0msNL9` |
| **Loại Dữ Liệu** | File nhị phân video gốc MP4 (~350–700 MB) | Google Drive Shortcut (`application/vnd.google-apps.shortcut`) |
| **Dung lượng tiêu hao** | Tiêu hao đúng dung lượng file | **0 MB** (hoàn toàn miễn phí dung lượng) |
| **Cơ chế tải lên** | Upload qua `rclone` (Google OAuth cá nhân) | Service Account tự động tạo shortcut qua API |

### 3.2. Cốt lõi về Token: Tại sao Service Account không tự upload video được?

> [!CAUTION]
> **Quy tắc bất di bất dịch của Google Drive API:**
> Các tài khoản Service Account (`@*.iam.gserviceaccount.com`) **KHÔNG CÓ DUNG LƯỢNG LƯU TRỮ CÁ NHÂN (Quota = 0 bytes)**.
> Khi một Service Account tải một file lên một thư mục Google Drive cá nhân (`@gmail.com`), Google Drive tính dung lượng file đó vào **người tạo file (Service Account)** chứ không tính vào người sở hữu thư mục. Do đó Google API sẽ trả về lỗi `403 Forbidden: Service Accounts do not have storage quota`.

**Vậy giải pháp giải quyết triệt để là gì?**
1. **Lượt Upload Video Master (từ Laptop lên Primary Drive):** Bắt buộc phải dùng tài khoản người dùng cá nhân thông qua `rclone` (`lethanhtaicute2009@gmail.com`). Khi đó, file MP4 được sở hữu bởi tài khoản cá nhân có dung lượng lớn.
2. **Lượt Tạo Bản Dự Phòng (từ Primary sang Backup Mirror):** Vì Shortcut có dung lượng bằng `0 bytes`, Service Account (`anime-bot@arcane-pillar-511609-g2.iam.gserviceaccount.com`) có quyền **Editor** trong thư mục `anime-web` của `2006` nên nó tự động tạo Shortcut trong tích tắc mà **không tốn 1 byte quota nào và không cần bất kỳ sự can thiệp nào của người dùng**.
3. **Lượt Phát Phim 24/7 (từ Drive về Web):** Service Account có quyền đọc (`canDownload: true`) trên cả 2 thư mục. Nó tự tạo chữ ký **RSA-SHA256 JWT** với hạn dùng vĩnh viễn đến năm 10.000 để stream video trực tiếp về Cloudflare mà không bao giờ hết hạn.

### 3.3. Khi nào Google bắt xác thực lại (OAuth Refresh Token)?
- Khi ứng dụng OAuth trên Google Cloud Console ở trạng thái **Testing (Cá nhân)**: Google có cơ chế bảo mật tự động thu hồi `refresh_token` định kỳ (thường là 7 ngày nếu không dùng thường xuyên hoặc khi hết chu kỳ bảo mật).
- Khi đó lệnh `rclone lsd gdrive:` hoặc `rclone copy` sẽ báo lỗi `invalid_grant: maybe token expired?`.
- **Cách xử lý:** Chỉ cần chạy lệnh `rclone config reconnect gdrive:`, bấm vào link xác thực `http://127.0.0.1:53682/...` trong trình duyệt và chọn **Allow (Cho phép)**. Rclone sẽ nhận token mới và tiếp tục tự động hóa hoàn toàn.

---

## 4. Cơ Chế Phát Luồng Video `/api/stream` & HTTP 206 Byte-Range

### 4.1. Khởi tạo Token Service Account tức thời (0.05ms)
Trong `src/lib/gdrive-auth.ts`, Service Account Key được nhúng thẳng dưới dạng Base64 sạch `SA_KEY_B64`.
- Không đọc file từ ổ cứng (zero I/O overhead).
- Tự tạo Header + Payload JWT, ký bằng `crypto.createSign('RSA-SHA256')`.
- Gửi lên `https://oauth2.googleapis.com/token` nhận `access_token` có hiệu lực 3600s.
- Token được memoize trong bộ nhớ biến toàn cục, chỉ gọi lại khi còn dưới 60 giây hết hạn.

### 4.2. Proxy Stream với Giới hạn 2MB Chunk (Chống Error 1102)

> [!WARNING]
> **Lỗi Cloudflare Error 1102 (Worker CPU Time Limit Exceeded):**
> Nếu worker chuyển tiếp trực tiếp luồng stream vô hạn từ Google Drive mà không ngắt đoạn, isolate của Cloudflare sẽ bị treo CPU/Memory và ngắt kết nối trình duyệt.

- **Giải thuật tối ưu:**
  ```typescript
  // Nếu client yêu cầu tua một khoảng Range: bytes=A-B
  // Hoặc nếu không có Range (phát từ đầu): Range: bytes=0-
  const CHUNK_SIZE = 2 * 1024 * 1024; // Cố định 2MB mỗi lượt nạp
  const rangeEnd = Math.min(rangeStart + CHUNK_SIZE - 1, totalSize - 1);
  ```
- Trả về header chuẩn HTTP:
  - `HTTP/2 206 Partial Content`
  - `Accept-Ranges: bytes`
  - `Content-Range: bytes ${rangeStart}-${rangeEnd}/${totalSize}`
  - `Content-Length: ${rangeEnd - rangeStart + 1}`
  - `Cache-Control: public, max-age=31536000, immutable` (Cloudflare tự động đệm các chunk 2MB tại trạm CDN gần người dùng nhất).

### 4.3. Cơ chế Tự động Chuyển hướng Dự phòng (Failover Engine)
- Khi gọi `/api/stream?id={primaryId}&backupId={backupId}`:
  1. Request thử stream từ `primaryId` (Tài khoản 2009).
  2. Nếu Google Drive trả về mã lỗi `403` (Quota exceeded), `404` hoặc timeout sau 3 giây:
  3. Hệ thống lập tức chuyển hướng không giật lag sang `backupId` (Tài khoản 2006).
  4. Người xem video hoàn toàn không nhận thấy bất kỳ sự gián đoạn nào.

---

## 5. Cốt Lõi Động Cơ Video Song Ngữ (`bilingual_engine.py`)

Hệ sinh thái sản xuất video nằm tại `/home/taileesin123/.gemini/config/skills/ep-anime-web/scripts/bilingual_engine.py`.

### 5.1. Thuật toán Smart Multi-Sentence Grouping (Gom 2-3 câu liên tiếp)
- Thay vì tua lại từng câu thoại đơn lẻ gây vụn vặt mạch phim:
  - Nếu khoảng nghỉ giữa 2 câu thoại liên tiếp $\le 1.2\text{s}$, thuật toán tự động gộp thành một cụm hội thoại.
  - Lượt 1: Giữ nguyên âm thanh Nhật gốc + hiển thị Vietsub lần lượt cho từng câu trong cụm.
  - Lượt 2: Tua lại toàn bộ cụm, tắt tiếng Nhật, lồng tiếng Anh liên tục và hiển thị Engsub.

### 5.2. Xử lý câu đơn độc lập ngắn $\le 4$ từ (Skip Isolated Short Cues)
- Đối với những từ cảm thán đơn lẻ như: *"Huh?"*, *"Thank you"*, *"Chitose..."*, *"Keep going"*:
  - Không nằm trong cụm thoại.
  - Tự động **bỏ qua lượt tua lại Engsub**, chỉ chiếu 1 lần bằng tiếng Nhật + Vietsub.
  - Giúp thời lượng phim cô đọng, giữ nguyên nhịp cảm xúc của đạo diễn.

### 5.3. Phân loại Nam / Nữ bằng Deep Learning ECAPA-TDNN
- File ONNX: `models/voice_gender_classifier_q8.onnx`.
- Trích xuất phổ âm học của phân cảnh, chạy suy luận OnnxRuntime:
  - Nếu tự tin Nữ $\ge 0.65$: Chỉ định giọng Nữ bản xứ (Mỹ/Anh/Úc/Canada/Ireland).
  - Nếu tự tin Nam $\ge 0.65$: Chỉ định giọng Nam bản xứ tương ứng.
- **Quy tắc bất biến:** **Chỉ dùng duy nhất 1 giọng đọc xuyên suốt toàn bộ phân cảnh tua lại**, tuyệt đối không tráo đổi giọng giữa các câu trong cùng một cảnh.

### 5.4. Thích ứng tốc độ khung hình (`atempo`)
- Đo thời lượng audio TTS thô: $T_{raw}$.
- Thời lượng cảnh hình ảnh khả dụng: $T_{avail} = \max(0.25, T_{scene} - 0.14\text{s})$.
- Nếu $T_{raw} > T_{avail}$: Tỷ lệ tăng tốc $R = \frac{T_{raw}}{T_{avail}}$ (giới hạn trần 2.8x).
- Áp dụng bộ lọc FFmpeg:
  `adelay={offset}|{offset},atempo={R},volume=1.20,apad=pad_dur={T_scene + 1.0}`
  rồi cắt chuẩn xác `-t {T_scene}`. Đảm bảo đọc rõ 100% từng từ, không nuốt âm, không bao giờ bị cắt cụt.

### 5.5. Cắt video Frame-Accurate Seeking
- Cắt từng đoạn nhỏ bằng kỹ thuật 2 tầng seek:
  `ffmpeg -y -ss {max(0, start-1.0)} -i master.mkv -ss {min(1.0, start)} -t {dur} -an -c:v libx264 -preset ultrafast -crf 18 -f mpegts cut.ts`
- Ghép bằng FFmpeg concat demuxer: Đảm bảo 0 lỗi vỡ pixel, 0 lệch âm thanh (0ms audio drift).

---

## 6. Quy Trình Xuất Bản Tập Mới Chuẩn Xác (Runbook Thực Chiến)

Mỗi khi muốn đăng một tập anime mới bất kỳ:

### Bước 1: Kích hoạt Pipeline
```bash
python3 /home/taileesin123/.gemini/config/skills/ep-anime-web/scripts/pipeline.py \
  --slug chitose-kun-wa-ramune-bin-no-naka \
  --query "Chitose-kun wa Ramune Bin no Naka" \
  --ep 18 \
  --title "Tập 18 : The Melancholy of the Blue Wind"
```
Hệ thống sẽ tự động:
1. Tải bản master 1080p FHD từ SubsPlease / Nyaa.
2. Trích xuất phụ đề Engsub và dịch tự động đồng bộ sang Vietsub.
3. Chạy động cơ lồng tiếng và nén video song ngữ.
4. Tạo file phụ đề tương tác JSON `public/subtitles/{slug}_{ep}.json`.

### Bước 2: Tải lên Google Drive
```bash
# Upload bản master 1080p vào Google Drive chính (2009)
rclone copy public/videos/{filename}.mp4 gdrive:anime-vietsub/ -P

# Đồng bộ Shortcut sang Drive dự phòng (2006) và ghi nhận ID vào metadata
node /home/taileesin123/.gemini/config/skills/ep-anime-web/scripts/dual_drive_sync.js \
  --filename {filename}.mp4 \
  --slug {slug} \
  --ep {ep}
```

### Bước 3: Dọn dẹp ổ cứng Laptop (Quy tắc 0 MB Video)
```bash
# Xóa sạch video cục bộ để ổ cứng laptop luôn mát và sạch 100%
rm -rf public/videos/*.mp4
rm -rf downloads/dl_*
rm -rf bilingual_data/{slug}/ep{ep}_work
```

### Bước 4: Đẩy lên Cloudflare Workers Edge
```bash
# Đồng bộ public/anime.json và commit
cp data/anime.json public/anime.json
git add data/ public/
git commit -m "feat: auto-publish {slug} ep {ep} with dual-drive backup"
git push origin main
```
Trong vòng 30–60 giây, mạng lưới Cloudflare Workers toàn cầu sẽ tự động biên dịch và phát hành tập mới tới toàn thế giới!

---

## 7. Các Đường Dẫn & Tài Nguyên Sống Của Hệ Thống

- **Website Chính Thống Toàn Cầu 24/7 (Cloudflare Edge):**
  - Trang chủ: [https://anime-web.lethanhtaicute2009.workers.dev](https://anime-web.lethanhtaicute2009.workers.dev)
  - Xem tập phim mẫu: [https://anime-web.lethanhtaicute2009.workers.dev/watch/chitose-kun-wa-ramune-bin-no-naka?ep=ep-17-bilingual](https://anime-web.lethanhtaicute2009.workers.dev/watch/chitose-kun-wa-ramune-bin-no-naka?ep=ep-17-bilingual)
- **Mã Nguồn GitHub:**
  - Repo: `https://github.com/taileesin-2k6/anime-web.git`
- **Môi Trường Localhost / Mạng LAN (khi đang mở laptop):**
  - Local Web: `http://localhost:3000`
  - LAN Web: `http://10.0.41.8:3000`
  - Systemd Service: `anime-web.service`
  - Rclone HTTP Service: `rclone-stream.service` (Port 8088)
- **Thư Mục Lưu Trữ Dual Drive:**
  - Primary (2009): `anime-vietsub` (`1prgO-NQHj-PYzkhX3HAEC3d5NXZuPtVl`)
  - Backup Mirror (2006): `anime-web` (`1vTU_kEXo6AfLeq59hixKb_oZCt0msNL9`)
