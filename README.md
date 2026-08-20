# GPA Calculator

Tính GPA học kỳ và tích lũy cho sinh viên **ĐH Bách Khoa TPHCM (HCMUT)**. Dán bảng điểm BKEL là xong — tự phát hiện môn cải thiện, vẽ biểu đồ, đồng bộ Google Sheet.

## Tính năng

### 📋 Dán là xong
- Sao chép bảng điểm từ BKEL, dán vào, bấm **Phân tích**
- Tự nhận Họ tên, MSSV, toàn bộ học kỳ và môn học
- Tự lọc các dòng RT/DT/KD/VP/CH/CT và môn 0 tín chỉ
- Thang điểm HCMUT áp dụng sẵn, không phải cấu hình gì

### 🔄 Môn cải thiện
- Tự phát hiện môn trùng tên giữa các học kỳ, gắn nhãn **Cải thiện**
- GPA tích lũy chỉ lấy **điểm cao nhất** của mỗi môn
- So sánh GPA trước và sau cải thiện

### 📈 Kết quả
- GPA tích lũy Hệ 4 và Hệ 10, tổng tín chỉ
- Biểu đồ xu hướng qua từng học kỳ
- Tính GPA cần đạt cho số tín chỉ còn lại

### ✏️ Sửa tay
- Thêm/sửa/xóa học kỳ và môn học bất cứ lúc nào
- Tối đa 12 học kỳ, mỗi kỳ 12 môn

### 💾 Lưu trữ
- Tự động lưu vào **localStorage** trình duyệt
- **Google Sheet**: sau khi phân tích, dữ liệu được đồng bộ lên Google Sheet
  - Mỗi sinh viên có **một Trang tính riêng** (tên dạng `Họ tên-MSSV`)
  - Trang tính chứa đầy đủ học kỳ, môn học, tín chỉ, điểm hệ 10/chữ/hệ 4, GPA từng kỳ và GPA tích lũy
  - Một tab **tổng hợp** liệt kê mọi sinh viên kèm link tới trang tính của họ

## Công nghệ

- **HTML** + **CSS** thuần, không framework, không bước build
- **JavaScript** thuần (Vanilla JS)
- **Cloudflare Pages Functions + Turnstile** — API đồng bộ và chống lạm dụng
- **Google Apps Script** — ghi Trang tính cho từng sinh viên
- **localStorage** — lưu dữ liệu trình duyệt
- **Cloudflare Pages** — hosting

## Sử dụng

Clone repo và mở file `index.html` để dùng các tính năng GPA cục bộ:
```bash
git clone https://github.com/VQ-Vinh/GPA-CALCULATOR.git
cd GPA-CALCULATOR
start index.html
```

## Cấu trúc thư mục

```
GPA-CALCULATOR/
├── css/                 # Giao diện
├── docs/                # Hướng dẫn triển khai
├── functions/           # Cloudflare Pages Functions
├── google-apps-script/  # Mã ghi Google Sheet
├── js/                  # Logic GPA và giao diện
├── index.html
└── README.md
```

Xem [hướng dẫn đồng bộ Google Sheet](docs/google-sheet-sync.md) để cấu hình Turnstile, Pages Function và Apps Script.
