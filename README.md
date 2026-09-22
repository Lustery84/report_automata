# Academic & Technical Outline Studio (Universal Report Hub)

> **Hệ Thống Khởi Tạo Đề Cương & Kiến Trúc Báo Cáo Học Thuật Đa Ngành**  
> Tích hợp kho tri thức huấn luyện **360+ đề tài báo cáo đối sánh chuẩn mực** (90 bài cho mỗi khối ngành: CNTT, Kinh Tế, Kỹ Thuật, Xã Hội) từ các trường đại học hàng đầu: HUST, NEU, VNU, HCMUT, FTU, UEH, DAV, HLU...

---

## 1. Cấu Trúc Thư Mục Chuẩn Production

Dự án được cấu trúc theo mô hình phân tách độc lập (Separation of Concerns), sẵn sàng để triển khai ngay lập tức:

```text
.
├── index.html                          # Trang chủ ứng dụng (Entry point thuần chuẩn)
├── vercel.json                         # Cấu hình tối ưu nén Gzip & Caching cho Vercel
├── netlify.toml                        # Cấu hình triển khai cho Netlify
├── package.json                        # Cấu hình lệnh chạy Node/NPM
├── .gitignore                          # Loại bỏ tệp tạm thời
├── assets/                             # Tài nguyên tĩnh của ứng dụng web
│   ├── css/
│   │   └── studio.css                  # Toàn bộ giao diện Cold Luxury (Anti-slop design)
│   └── js/
│       ├── data-templates.js           # Bộ máy sinh đề cương & Quản lý 360 đề tài
│       └── studio-app.js               # Bộ điều khiển giao diện & tương tác người dùng
├── data/                               # Cơ sở dữ liệu học thuật
│   ├── academic_corpus_database.json   # 360 đề tài (90 bài/ngành với metrics, models, outlines)
│   ├── academic_corpus_summary.md      # Mục lục chi tiết 360 đề tài
│   └── sample_reports/                 # 4 báo cáo toàn văn benchmark xuất sắc điểm A
├── deploy/                             # Công cụ triển khai Container
│   ├── Dockerfile                      # Nginx Alpine siêu nhẹ (<25MB)
│   ├── nginx.conf                      # Cấu hình Gzip compression & Security headers
│   └── docker-compose.yml              # Khởi chạy Docker bằng 1 câu lệnh
├── scripts/                            # Bộ công cụ sinh dữ liệu & biên tập tự động
│   ├── generate_academic_corpus.py     # Script tạo cơ sở dữ liệu 360 đề tài
│   ├── build_report_standard.py        # Script xuất báo cáo Word
│   ├── render_and_embed_all.py         # Script tự động chụp màn hình & nhúng ảnh
│   └── generate_files.py               # Script tiện ích
└── reports/                            # Thư mục lưu trữ sản phẩm báo cáo (.docx / .html)
```

---

## 2. Hướng Dẫn Triển Khai (Deployment Guide)

### Cách 1: Triển khai lên Vercel (Khuyên dùng - Nhanh nhất)
1. Đẩy mã nguồn lên kho lưu trữ **GitHub / GitLab**.
2. Đăng nhập [Vercel](https://vercel.com/) -> Chọn **Add New Project** -> Chọn kho lưu trữ này.
3. Nhấn **Deploy** (Không cần cấu hình Build Command hay Output Directory vì đã có `vercel.json`).
4. Trang web sẽ hoạt động ngay lập tức với domain miễn phí dạng `https://ten-du-an.vercel.app`.

### Cách 2: Triển khai lên Netlify
1. Đăng nhập [Netlify](https://netlify.com/).
2. Kéo thả toàn bộ thư mục dự án vào mục **"Sites"** (hoặc liên kết với GitHub).
3. Netlify tự động nhận diện `netlify.toml` và hoàn tất triển khai trong 10 giây.

### Cách 3: Triển khai lên GitHub Pages
1. Tạo một repository trên GitHub và đẩy mã nguồn lên nhánh `main`:
   ```bash
   git init
   git add .
   git commit -m "feat: release academic outline studio"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```
2. Vào **Settings** của repository -> Chọn **Pages** (cột trái).
3. Tại mục **Build and deployment** -> **Source**: Chọn `Deploy from a branch` -> Nhánh `main` / Thư mục `/(root)` -> Nhấn **Save**.
4. Sau 1 phút, trang web sẽ online tại: `https://<username>.github.io/<repo>/`.

### Cách 4: Triển khai bằng Docker / VPS riêng
Nếu bạn có VPS Linux/Ubuntu hoặc muốn chạy trong Docker container:
```bash
# Khởi chạy container bằng docker-compose
docker compose -f deploy/docker-compose.yml up -d --build
```
Truy cập ứng dụng tại: `http://localhost:8080` (hoặc IP VPS của bạn).
Container chạy trên nền **Nginx Alpine** siêu nhẹ (<25MB RAM), tích hợp nén Gzip tối ưu cho file dữ liệu 360 đề tài.

### Cách 5: Chạy thử nghiệm trên máy cục bộ (Local Server)
- **Bằng Python**:
  ```bash
  python -m http.server 3000
  ```
- **Bằng NPM / Node.js**:
  ```bash
  npm start
  ```
Truy cập tại: `http://localhost:3000`.

---

## 3. Các Tính Năng Nổi Bật

1. **Khởi Tạo Đề Cương Theo Yêu Cầu (On-Demand)**:
   - Nhập bất kỳ chủ đề nào, chọn chuyên ngành và thể loại báo cáo (Đồ án, Thực hành, Thực tập, Khóa luận).
   - Hệ thống tự động phân rã thành sườn bài 4-5 chương đạt tỷ lệ vàng dung lượng `20 - 35 - 35 - 10%`.
2. **Kho Dữ Liệu Huấn Luyện 360 Đề Tài**:
   - 90 bài cho mỗi khối ngành với đầy đủ chỉ số định lượng ($R^2$, F1-score, $WACC$, độ trễ...), mô hình lý thuyết và trích dẫn chuẩn IEEE / APA 7th.
   - Tìm kiếm trực tiếp theo từ khóa, lọc theo chuyên ngành hẹp.
   - Nút **"Áp Dụng Cho Studio"** tự động chuyển đổi bất kỳ đề tài mẫu nào thành đề cương thực tế.
3. **Trình Tạo Prompt Chuẩn Cho AI**:
   - Xuất prompt chứa đầy đủ vai trò chuyên gia, sườn bài chi tiết, quy chuẩn Nghị định 30/2020/NĐ-CP và mô hình đoạn văn PEEL để đưa vào Claude, Gemini hoặc ChatGPT viết bài hoàn chỉnh.
