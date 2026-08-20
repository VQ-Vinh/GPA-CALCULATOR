# GPA Calculator

Tính điểm trung bình học kỳ và tích lũy đại học. Hỗ trợ quy đổi thang điểm, phát hiện môn cải thiện, biểu đồ GPA trực quan.

## Tính năng

### 🎓 Quản lý học kỳ
- Tối đa **12 học kỳ**
- Mỗi học kỳ tối đa **12 môn học**
- Accordion thu gọn/mở rộng
- Nhập Họ tên + MSSV trước khi nhập điểm (MSSV: 7-12 chữ số)

### 📊 Bảng quy đổi điểm
- Người dùng tự định nghĩa khoảng điểm Hệ 10 → Điểm chữ + Hệ 4
- Mặc định theo thang điểm đại học Việt Nam
- Thêm/xóa dòng, đặt lại mặc định

### 🔄 Phát hiện môn cải thiện
- Tự động phát hiện môn trùng tên giữa các học kỳ
- Hiển thị badge **"Cải thiện"** bên cạnh môn đã học lại
- Khi tính GPA tích lũy: chỉ lấy **điểm cao nhất** của mỗi môn

### 📈 Tổng kết & Biểu đồ
- GPA từng học kỳ (Hệ 4 và Hệ 10)
- GPA tích lũy **trước cải thiện** vs **sau cải thiện** → mức tăng
- Biểu đồ SVG 2 đường: Hệ 4 (nét liền) và Hệ 10 (nét đứt) trên cùng thang 0-4

### 💾 Lưu trữ
- Tự động lưu vào **localStorage** trình duyệt
- **Google Sheet**: sau khi phân tích bảng điểm BKEL, dữ liệu được đồng bộ lên Google Sheet
  - Mỗi sinh viên có **một Trang tính riêng** (tên dạng `Họ tên-MSSV`)
  - Trang tính chứa đầy đủ học kỳ, môn học, tín chỉ, điểm hệ 10/chữ/hệ 4, GPA từng kỳ và GPA tích lũy
  - Một tab **tổng hợp** liệt kê mọi sinh viên kèm link tới trang tính của họ

### 🎨 Giao diện
- Thiết kế hiện đại, gradient, hiệu ứng hover
- Tailwind CSS qua CDN
- Chuyển tab mượt mà
- Responsive (mobile/desktop)

## Công nghệ

- **HTML** + **CSS** (Tailwind CSS CDN)
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
