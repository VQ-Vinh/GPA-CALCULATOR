# GPA Calculator

Tính điểm trung bình học kỳ và tích lũy đại học. Hỗ trợ quy đổi thang điểm, phát hiện môn cải thiện, biểu đồ GPA trực quan.

## Tính năng

### 🎓 Quản lý học kỳ
- Tối đa **12 học kỳ**
- Mỗi học kỳ tối đa **10 môn học**
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
- **Xuất dữ liệu**: tải file `.json` về máy
- **Nhập dữ liệu**: khôi phục từ file `.json`
- **Sao lưu qua email**: tự động gửi dữ liệu đến email quản trị khi xuất file

### 🎨 Giao diện
- Thiết kế hiện đại, gradient, hiệu ứng hover
- Tailwind CSS qua CDN
- Chuyển tab mượt mà
- Responsive (mobile/desktop)

## Công nghệ

- **HTML** + **CSS** (Tailwind CSS CDN)
- **JavaScript** thuần (Vanilla JS)
- **EmailJS** — gửi email sao lưu
- **localStorage** — lưu dữ liệu trình duyệt
- **GitHub Pages** — hosting

## Sử dụng

Mở trực tiếp trên trình duyệt tại:
```
https://vq-vinh.github.io/GPA-CALCULATOR/
```

Hoặc clone repo và mở file `index.html`:
```bash
git clone https://github.com/VQ-Vinh/GPA-CALCULATOR.git
cd GPA-CALCULATOR
start index.html
```

## Cấu trúc thư mục

```
GPA-CALCULATOR/
├── index.html           # Toàn bộ web (HTML + CSS + JS)
└── README.md            # File này
```
