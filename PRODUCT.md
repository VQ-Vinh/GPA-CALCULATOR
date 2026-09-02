# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Sinh viên HCMUT cần tổng hợp bảng điểm, theo dõi GPA và lập kế hoạch học tập trên máy tính hoặc điện thoại.

## Product Purpose

GPA Calculator giúp sinh viên nhập bảng điểm BKEL, xem GPA tích lũy theo thang HCMUT, dự phóng GPA tốt nghiệp và tính các phương án học cải thiện. Sản phẩm thành công khi người dùng có thể hiểu kết quả hiện tại và hành động cần thiết mà không phải tự tổng hợp hay tính lại bằng bảng tính.

## Positioning

Đây là công cụ hỗ trợ cá nhân dành riêng cho quy tắc GPA HCMUT, kết hợp import bảng điểm BKEL, xử lý môn học lại và lập kế hoạch GPA trong một luồng. Sản phẩm không phải hệ thống chính thức của HCMUT.

## Operating Context

Người dùng sao chép bảng điểm từ BKEL, dán vào trang, xem kết quả tích lũy, điều chỉnh mục tiêu tốt nghiệp, sau đó có thể sửa chi tiết từng học kỳ. Dữ liệu làm việc được lưu trong trình duyệt. Chức năng đồng bộ hiện có là năng lực nội bộ, không phải tính năng được quảng bá trên giao diện hoặc tài liệu công khai.

## Capabilities and Constraints

- Parse dữ liệu bảng điểm BKEL và hiển thị các học kỳ theo thứ tự thời gian.
- Tính GPA theo thang điểm HCMUT cố định; môn trùng tên chỉ lấy lần có điểm cao nhất vào GPA tích lũy.
- Dự phóng GPA tốt nghiệp từ số tín chỉ còn lại và GPA dự kiến; đề xuất phương án cải thiện theo tổng tín chỉ A, B+ hoặc phối hợp.
- Cho phép chỉnh sửa thông tin sinh viên, học kỳ và môn học trực tiếp.
- Nhập tay tối đa 12 học kỳ và 12 môn mỗi kỳ; import BKEL tối đa 24 học kỳ và 50 môn mỗi kỳ.
- Giữ kiến trúc HTML, CSS và Vanilla JavaScript không có bước build; không thay đổi hợp đồng localStorage, thang điểm HCMUT hoặc luồng đồng bộ khi thực hiện cải tiến giao diện.

## Brand Commitments

- Tên sản phẩm: GPA Calculator.
- Giao diện và nội dung hướng dẫn bằng tiếng Việt.
- Giọng điệu rõ ràng, tin cậy, thực dụng và phù hợp với sinh viên.
- Duy trì nhận diện HCMUT hiện có; cải tiến UI theo hướng tiến hóa, không thay thế toàn bộ hệ thống thiết kế khi chưa có quyết định riêng.

## Evidence on Hand

- Giao diện và luồng tương tác hiện hành trong `index.html`, `css/style.css` và `js/`.
- Bộ regression test dùng Node test runner trong `test/`.
- Không có testimonial, số liệu người dùng, chứng nhận chính thức hay bằng chứng liên kết với HCMUT; các nội dung này không được tự tạo.

## Product Principles

1. Bảo toàn tính đúng đắn của công thức GPA trước mọi thay đổi trình bày.
2. Đưa kết quả và hành động học tập quan trọng lên trước phần chỉnh sửa chi tiết.
3. Giải thích các khái niệm GPA bằng ngôn ngữ ngắn gọn, không gây hiểu nhầm.
4. Dữ liệu không hợp lệ phải được báo rõ và không được tạo ra kết quả cũ hoặc bị cắt bớt âm thầm.
5. Mọi cải tiến giao diện phải giữ luồng thao tác nhanh trên cả desktop và mobile.

## Accessibility & Inclusion

Mục tiêu tuân thủ WCAG 2.1 AA, bao gồm độ tương phản dễ đọc, thao tác bằng bàn phím, trạng thái focus rõ ràng, vùng bấm phù hợp cảm ứng và bố cục không tràn ngang ngoài các bảng cuộn có chủ đích.
