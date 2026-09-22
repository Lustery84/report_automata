# TRƯỜNG ĐẠI HỌC BÁCH KHOA - ĐHQG TP.HCM
## KHOA ĐIỆN - ĐIỆN TỬ | BỘ MÔN ĐIỆN TỬ & TỰ ĐỘNG HÓA

---

# THIẾT KẾ VÀ CHẾ TẠO TRẠM QUAN TRẮC MÔI TRƯỜNG THÔNG MINH SỬ DỤNG VI ĐIỀU KHIỂN ESP32 VÀ CHUẨN TRUYỀN THÔNG LORAWAN

- **Sinh viên thực hiện:** Trần Quốc Bảo (MSSV: 2011899)
- **Giảng viên hướng dẫn:** TS. Nguyễn Hoàng Nam
- **Niên khóa:** 2021 - 2025

---

## CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI & CHỈ TIÊU KỸ THUẬT

### 1.1. Bảng chỉ tiêu kỹ thuật đầu vào (Specifications)

| Thông số kỹ thuật | Yêu cầu thiết kế | Kết quả thực nghiệm đạt được |
| :--- | :--- | :--- |
| **Vi điều khiển trung tâm** | ESP32-WROOM-32 (Dual Core 240MHz) | ESP32-WROOM-32E (4MB Flash) |
| **Tầm xa truyền sóng LoRa** | ≥ 5.0 km (Khu vực bán đô thị) | **6.8 km** (Không vật cản) |
| **Dải đo nồng độ bụi mịn PM2.5**| 0 – 500 ug/m³ (Sai số < 10%) | 0.3 – 1.000 ug/m³ (Sai số 6.2%) |
| **Công suất tiêu thụ chế độ Deep Sleep** | < 25 uA | **18.5 uA** |
| **Thời lượng pin dự phòng** | ≥ 48 giờ không có ánh sáng | **74 giờ** (Pin 18650 5200mAh) |

---

## CHƯƠNG 2: THIẾT KẾ PHẦN CỨNG & TÍNH TOÁN LINH KIỆN (BOM)

### 2.1. Danh mục linh kiện phần cứng (Bill of Materials - BOM)

| STT | Tên linh kiện | Mã Part Number | Nhà sản xuất | Đơn giá (VNĐ) | Chức năng |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Module MCU | ESP32-WROOM-32E | Espressif Systems | 75.000 | Xử lý trung tâm |
| 2 | Module RF LoRa | SX1278 (433MHz) | Semtech | 95.000 | Thu phát sóng vô tuyến |
| 3 | Cảm biến bụi mịn | PMS7003 | Plantower | 210.000 | Tán xạ laser đo PM2.5 |
| 4 | Cảm biến nhiệt ẩm | SHT31-DIS | Sensirion | 65.000 | Giao tiếp số I2C |
| 5 | IC nguồn xung Buck | MP1584EN | Monolithic Power | 15.000 | Hạ áp 5V -> 3.3V (Hiệu suất 92%) |

### 2.2. Tính toán năng lượng tiêu thụ & Thời lượng pin
- Dòng tiêu thụ khi truyền gói tin ($I_{TX}$): $120	ext{ mA}$ trong $1.2	ext{ giây}$.
- Dòng tiêu thụ khi đọc cảm biến ($I_{Sense}$): $45	ext{ mA}$ trong $3.0	ext{ giây}$.
- Dòng tiêu thụ chế độ ngủ sâu ($I_{Sleep}$): $0.0185	ext{ mA}$ trong $55.8	ext{ giây}$.
- $\Rightarrow$ Dòng điện trung bình chu kỳ 1 phút ($I_{avg}$):
$$I_{avg} = rac{(120 	imes 1.2) + (45 	imes 3.0) + (0.0185 	imes 55.8)}{60} = rac{144 + 135 + 1.03}{60} pprox 4.67	ext{ mA}$$
- Thời lượng hoạt động với bộ pin $5.200	ext{ mAh}$: $T = rac{5.200	ext{ mAh} 	imes 0.8}{4.67	ext{ mA}} pprox 890	ext{ giờ} pprox 37	ext{ ngày}$.

---

## CHƯƠNG 3: THIẾT KẾ THUẬT TOÁN & MÃ NGUỒN NHÚNG

### 3.1. Thuật toán lọc trung bình động (Moving Average Filter) loại bỏ nhiễu cảm biến

```c
#define FILTER_WINDOW_SIZE 10
uint16_t pm25_history[FILTER_WINDOW_SIZE];
uint8_t filter_index = 0;

uint16_t applyMovingAverage(uint16_t new_val) {
    pm25_history[filter_index] = new_val;
    filter_index = (filter_index + 1) % FILTER_WINDOW_SIZE;
    
    uint32_t sum = 0;
    for (uint8_t i = 0; i < FILTER_WINDOW_SIZE; i++) {
        sum += pm25_history[i];
    }
    return (uint16_t)(sum / FILTER_WINDOW_SIZE);
}
```

---

## CHƯƠNG 4: KẾT QUẢ ĐO ĐẠC THỰC NGHIỆM

**Bảng 4.1: Đo khoảng cách truyền sóng LoRa SX1278 (Băng tần 433MHz, SF=10, BW=125kHz)**

| Khoảng cách (km) | RSSI (dBm) | SNR (dB) | Tỷ lệ mất gói tin PER (%) | Đánh giá chất lượng tín hiệu |
| :--- | :--- | :--- | :--- | :--- |
| 1.0 km | -82 dBm | +8.5 dB | 0.0% | Tín hiệu cực mạnh (Excellent) |
| 3.0 km | -98 dBm | +4.2 dB | 0.0% | Tín hiệu tốt (Good) |
| 5.0 km | -112 dBm | -1.5 dB | 1.2% | Đạt chuẩn truyền thông tin cậy |
| 6.8 km | -124 dBm | -6.8 dB | 4.8% | Giới hạn ngưỡng nhận Semtech |

---

## TÀI LIỆU THAM KHẢO (IEEE STANDARD)
1. [1] Semtech Corporation, "SX1276/77/78/79 Transceiver Datasheet," Rev. 7, May 2020.
2. [2] Espressif Systems, "ESP32 Series Datasheet," Version 4.1, 2023.
3. [3] F. Adelantado et al., "Understanding the Limits of LoRaWAN," *IEEE Communications Magazine*, vol. 55, no. 9, pp. 34-40, Sep. 2017.