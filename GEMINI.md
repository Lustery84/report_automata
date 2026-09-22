# HỆ THỐNG HUẤN LUYỆN & QUY CHUẨN VIẾT BÁO CÁO HỌC THUẬT (ACADEMIC REPORT TRAINING PROTOCOL)

Quy định này được kích hoạt tự động và áp dụng cho mọi lượt tạo báo cáo, đồ án hoặc đề tài trong không gian làm việc này. Agent bắt buộc phải học tập và tuân thủ các quy tắc từ kho dữ liệu mẫu đã được huấn luyện.

---

## 1. Cơ Sở Dữ Liệu Huấn Luyện (Training Grounding Datasets - 360+ Đề Tài)
Hệ thống học thuật được trang bị kho tri thức gồm **360+ báo cáo nghiên cứu đối sánh chuẩn mực** (90 bài cho mỗi khối ngành) được lập chỉ mục tại `data/academic_corpus_database.json` và bản tổng hợp tại `data/academic_corpus_summary.md`:
- **Khối Công Nghệ Thông Tin (90 đề tài)**: AI/ML, Vision (YOLOv8), NLP (PhoBERT NER), RAG, Web Microservices (Kafka, gRPC), Mobile Clean Architecture, Smart Contract Security, Big Data Lakehouse, QA/Automated Testing (JaCoCo > 88%). Đối sánh: HUST, VNU-UET, PTIT, HCMUT, UIT.
- **Khối Kinh Tế / Quản Trị / Tài Chính (90 đề tài)**: Phân tích tài chính & Định giá DCF (WACC thực tế), Dupont 5 nhân tố, Rủi ro tín dụng Basel II/III, IFRS 16, Marketing số S-O-R (Cronbach's Alpha > 0.8, R² > 0.55), Logistics EOQ, Quản trị nhân sự UWES. Đối sánh: NEU, FTU, UEH, HVTC, BA.
- **Khối Kỹ Thuật / Điện Tử / Tự Động Hóa (90 đề tài)**: Trạm quan trắc IoT LoRaWAN (ESP32/STM32), SCADA Siemens S7-1200 / WinCC, Robot đa hướng AGV Mecanum, Bộ điều khiển Fuzzy-PID, Thuật toán BMS pin EKF, Mô phỏng ANSYS cơ khí. Đối sánh: HCMUT, HUST, HCMUTE, UTC.
- **Khối Khoa Học Xã Hội / Pháp Lý / Truyền Thông (90 đề tài)**: Hội chứng FOMO / Tâm lý học sinh viên, Chuyển dịch sinh kế nông hộ, Báo chí số & Tin giả TikTok, Bảo vệ dữ liệu Nghị định 13 / GDPR, Bản quyền tác giả Generative AI, Ngoại giao Cây tre. Đối sánh: VNU-USSH, DAV, HLU, ULAW, AJC.
- **4 Báo Cáo Toàn Văn Mẫu Benchmark**: Lưu tại `data/sample_reports/` (FPT Financial Analysis, Android Clean Architecture, IoT LoRaWAN Station, TikTok Impulsive Buying).
- **Quy chuẩn định lượng**: Tuân thủ nghiêm ngặt chỉ số mật độ thông tin tại `ACADEMIC_REPORT_STANDARDS.md`.

---

## 2. Tiêu Chuẩn Viết Báo Cáo Điểm Xuất Sắc (Điểm A / 9.0+)

### A. Tuyệt đối không viết hời hợt, sáo rỗng
- Không viết gạch đầu dòng liệt kê cụt lủn ở các phần phân tích chuyên môn.
- Mọi đoạn văn chuyên sâu phải tuân theo **mô hình PEEL (Point - Explanation - Evidence - Link)**:
  1. *Point (Luận điểm)*: Nêu rõ phát hiện hoặc nguyên lý cốt lõi.
  2. *Explanation (Giải thích)*: Diễn giải cơ chế vận hành, lý thuyết khoa học.
  3. *Evidence (Dẫn chứng thực nghiệm)*: Đưa số liệu định lượng cụ thể từ bảng biểu, công thức toán học hoặc mã nguồn.
  4. *Link (Tiểu kết)*: Đánh giá tác động đến toàn bộ đề tài.

### B. Mật độ thông tin & Dữ liệu bắt buộc (Data Density)
- Cứ trung bình 1.5 – 2 trang văn bản phải có ít nhất một bảng số liệu thực tế, sơ đồ kiến trúc hoặc công thức toán học.
- Bảng biểu phải có:
  - Đánh số theo chương: `Bảng 2.1`, `Hình 3.2`.
  - Tiêu đề in đậm đặt phía trên bảng.
  - Đơn vị tính rõ ràng (Tỷ đồng, %, ms, mAh, RPM...).
  - Dòng ghi chú nguồn: `(Nguồn: Báo cáo tài chính kiểm toán 2024 / Kết quả khảo sát thực nghiệm của tác giả)`.

### C. Tỷ trọng vàng dung lượng (20 - 35 - 35 - 10)
- **20% Dung lượng (Chương 1)**: Cơ sở lý luận & Tổng quan (chỉ nêu lý thuyết trực tiếp giải quyết bài toán).
- **35% Dung lượng (Chương 2)**: Khảo sát thực trạng, thu thập và bóc tách số liệu thực nghiệm trong 3-5 năm.
- **35% Dung lượng (Chương 3)**: Hiện thực hóa giải pháp, kiến trúc mô hình, code, mạch điện hoặc chiến lược hành động (trọng tâm chiếm điểm cao nhất).
- **10% Dung lượng (Chương 4 & Kết luận)**: Kiểm thử sai số, đánh giá hạn chế và đề xuất khuyến nghị.

### D. Thể thức văn bản & Trích dẫn
- Tuân thủ Nghị định 30/2020/NĐ-CP: Font Times New Roman 13pt, căn lề Trái 3.0cm, Phải 2.0cm, Trên 2.0cm, Dưới 2.0cm, dãn dòng 1.15 lines.
- Dùng ngôi thứ ba khách quan ("tác giả", "người nghiên cứu", "đề tài").
