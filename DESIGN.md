---
name: GPA Calculator
description: Sổ tay học vụ hiện đại dành cho sinh viên HCMUT
colors:
  action-indigo: "#4f46e5"
  action-indigo-soft: "#eef2ff"
  action-indigo-line: "#c7d2fe"
  achievement-teal: "#0f766e"
  achievement-teal-soft: "#f0fdfa"
  achievement-teal-line: "#99f6e4"
  progress-amber: "#b45309"
  progress-amber-soft: "#fffbeb"
  progress-amber-line: "#fde68a"
  editor-sky: "#0369a1"
  editor-sky-soft: "#f0f9ff"
  editor-sky-line: "#bae6fd"
  ink: "#0f172a"
  muted-ink: "#64748b"
  border: "#e2e8f0"
  border-strong: "#cbd5e1"
  surface: "#ffffff"
  surface-subtle: "#f8fafc"
  canvas: "#f3f6fc"
  success: "#047857"
  success-soft: "#ecfdf5"
  warning: "#b45309"
  warning-soft: "#fffbeb"
  error: "#b91c1c"
  error-soft: "#fef2f2"
typography:
  display:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"
    fontSize: "clamp(26px, 3vw, 34px)"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 750
    lineHeight: 1.3
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 750
    lineHeight: 1.3
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.55
rounded:
  control: "8px"
  compact: "10px"
  panel: "14px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action-indigo}"
    textColor: "{colors.surface}"
    rounded: "{rounded.compact}"
    padding: "9px 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.compact}"
    padding: "9px 16px"
    height: "40px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 11px"
    height: "42px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "28px 24px"
  metric-primary:
    backgroundColor: "{colors.action-indigo-soft}"
    textColor: "{colors.action-indigo}"
    rounded: "{rounded.compact}"
    padding: "18px 16px"
---

# Design System: GPA Calculator

## Overview

**Creative North Star: "Sổ tay học vụ hiện đại"**

Giao diện mang cảm giác của một công cụ học tập được tổ chức cẩn thận: rõ ràng, có hệ thống và đủ gần gũi để sinh viên sử dụng thường xuyên. Dữ liệu GPA được ưu tiên, trong khi màu sắc giúp phân nhóm nhiệm vụ thay vì trang trí.

Component gọn gàng và tự tin, với mật độ vừa phải cho một công cụ nhiều dữ liệu. Hệ thống tránh cảm giác dashboard doanh nghiệp nặng nề và không dùng màu sắc theo kiểu game hóa.

**Key Characteristics:**

- Phân cấp dữ liệu rõ, GPA hệ 4 là chỉ số chính.
- Màu học vụ rõ nét và có vai trò nhất quán.
- Bề mặt phẳng, viền nhẹ, shadow chỉ dành cho panel ngoài.
- Khoảng cách đều đặn và responsive theo hướng xếp chồng tự nhiên.
- Tương tác rõ ràng trên chuột, bàn phím và cảm ứng.

## Colors

Bảng màu học vụ rõ nét dùng các tint nhạt để phân khu và màu đậm để dẫn hướng sự chú ý.

### Primary

- **Indigo Chủ động:** dành cho CTA chính, import, GPA hệ 4, focus ring và trạng thái được chọn.

### Secondary

- **Teal Thành tích:** dành cho GPA hệ 10, biểu đồ và kết quả học tập.
- **Amber Tiến độ:** dành cho tín chỉ, tổng kết học kỳ và thông tin tiến độ.

### Tertiary

- **Sky Biên tập:** dành cho khu vực chỉnh sửa học kỳ và thao tác thêm dữ liệu.

### Neutral

- **Mực đậm:** nội dung chính và con số cần đọc nhanh.
- **Mực phụ:** nhãn, chú thích và thông tin bổ trợ.
- **Giấy trắng và canvas lam nhạt:** tách panel khỏi nền mà không tạo tương phản gắt.
- **Viền slate:** chia cấu trúc và trạng thái control.

### Named Rules

**The Role Before Decoration Rule.** Indigo, teal, amber và sky chỉ xuất hiện theo vai trò học vụ đã định; không hoán đổi chỉ để tạo sự mới lạ.

**The Semantic State Rule.** Xanh lá, cam và đỏ chỉ dùng cho thành công, cảnh báo và lỗi; không dùng làm accent trang trí.

## Typography

**Display Font:** System UI (với Segoe UI, Roboto và Arial fallback)  
**Body Font:** System UI (với Segoe UI, Roboto và Arial fallback)  
**Label/Mono Font:** UI Monospace (với SFMono-Regular, Menlo và Consolas fallback cho dữ liệu import)

**Character:** Kiểu chữ trung tính và quen thuộc giúp dữ liệu học tập dễ đọc trên nhiều hệ điều hành. Phân cấp dựa trên kích thước, weight và màu thay vì thay nhiều font.

### Hierarchy

- **Display:** tiêu đề trang, đậm, gọn và có tracking âm nhẹ.
- **Headline:** tiêu đề section, luôn đi cùng màu vai trò của section.
- **Title:** heading trong các khối tóm tắt và kế hoạch.
- **Body:** nội dung chính với line-height thoáng để đọc nhanh.
- **Label:** nhãn field và metadata, nhỏ hơn nhưng không nhạt đến mức khó đọc.

### Named Rules

**The Number Leads Rule.** Chỉ số GPA quan trọng được phép lớn hơn heading xung quanh; nhãn luôn giữ vai trò hỗ trợ.

## Layout

Trang dùng một luồng cuộn với container desktop tối đa 1180px. Ba panel chính có cùng hệ căn lề. Khoảng cách tuân theo nhịp 4, 8, 12, 16, 24 và 32px; khoảng cách lớn phân tách concern, khoảng cách nhỏ gắn nhãn với dữ liệu.

Dashboard dùng grid theo tỷ lệ nội dung: GPA chính rộng hơn metric phụ; biểu đồ rộng hơn bảng tóm tắt; cột phương án cải thiện có bề rộng ổn định. Dưới 1020px các insight xếp một cột; dưới 900px mục tiêu và phương án xếp dọc; dưới 640px metric, control và thao tác chính chuyển thành một cột.

Bảng môn học giữ chiều rộng nội dung tối thiểu và cuộn ngang có chủ đích; không ép tên môn hoặc nút thao tác thành kích thước khó dùng.

## Elevation & Depth

Hệ thống phẳng theo mặc định. Panel ngoài dùng một shadow ambient nhẹ để tách khỏi canvas; card lồng bên trong dùng viền và tonal surface. Shadow tương tác chỉ xuất hiện trên CTA khi hover và phải bị loại bỏ khi `prefers-reduced-motion` yêu cầu.

### Shadow Vocabulary

- **Panel ambient:** bóng rộng, độ đậm thấp cho ba panel cấp cao nhất.
- **CTA response:** bóng indigo nhỏ chỉ báo hiệu control có thể tương tác.
- **Inset role marker:** vạch màu mỏng bên trái dùng để nhận diện section hoặc phương án, không mang nghĩa elevation.

### Named Rules

**The Flat by Default Rule.** Chỉ panel ngoài có shadow lúc nghỉ; khối con phải dùng viền, màu nền hoặc khoảng trắng để phân cấp.

## Shapes

Panel dùng góc bo 14px; card và button dùng 10px; input dùng 8px. Badge có thể dùng dạng pill khi nội dung ngắn. Viền 1px là ngôn ngữ cấu trúc chính, với màu viền đậm hơn cho control và màu viền theo vai trò cho khối dữ liệu.

**The Nested Radius Rule.** Góc của thành phần lồng bên trong luôn nhỏ hơn panel cha; không tạo chuỗi card bo tròn có trọng lượng ngang nhau.

## Components

Component mang cảm giác gọn gàng và tự tin, với trạng thái rõ nhưng chuyển động tiết chế.

### Buttons

- **Shape:** bo góc gọn (10px), chiều cao tối thiểu 40px và 44px cho control chính trên mobile.
- **Primary:** nền Indigo Chủ động, chữ trắng, weight 600.
- **Hover / Focus:** hover đậm hơn và nâng 1px; focus-visible dùng outline indigo 2px có offset.
- **Secondary / Ghost:** nền trắng và viền slate; hover chuyển viền và chữ sang indigo.
- **Danger:** chỉ dùng đỏ cho thao tác xóa, hover dùng nền đỏ rất nhạt.

### Chips

- **Style:** badge học lại dùng nền xanh lá nhạt, chữ xanh lá đậm và hình pill.
- **State:** chỉ dùng cho metadata ngắn, không thay thế nút thao tác.

### Cards / Containers

- **Corner Style:** panel 14px; card con 10px.
- **Background:** panel trắng; khối con có thể dùng tint rất nhạt theo vai trò.
- **Shadow Strategy:** chỉ panel ngoài có shadow ambient.
- **Border:** 1px, trung tính hoặc theo màu vai trò.
- **Internal Padding:** 16px cho card gọn, 24px cho khối tóm tắt, 28px theo chiều dọc cho panel body desktop.

### Inputs / Fields

- **Style:** nền trắng, viền slate, bo 8px, chiều cao tối thiểu 42px.
- **Focus:** viền và outline chuyển sang indigo; focus không được chỉ biểu đạt bằng màu nền.
- **Error / Disabled:** error dùng viền đỏ và thông báo kèm chữ; disabled giảm saturation nhưng vẫn đọc được.

### Semester Accordion

- Header dùng Sky Biên tập nhạt, tên học kỳ co giãn và nhóm thao tác giữ kích thước ổn định.
- Footer tổng kết dùng Teal Thành tích nhạt; thông tin tổng không lặp lại trong header.
- Trên mobile, nhóm thao tác xuống hàng thay vì chèn ép tên học kỳ.

## Do's and Don'ts

### Do:

- **Do** giữ Indigo Chủ động là màu CTA và focus duy nhất.
- **Do** dùng tint teal, amber và sky để phân nhóm dữ liệu theo đúng vai trò.
- **Do** giữ cấp bậc GPA hệ 4, GPA hệ 10 và tín chỉ rõ ràng ở mọi breakpoint.
- **Do** duy trì focus-visible, vùng bấm thân thiện cảm ứng và `prefers-reduced-motion`.

### Don't:

- **Don't** biến giao diện thành dashboard doanh nghiệp nặng số liệu hoặc ứng dụng game hóa nhiều màu.
- **Don't** thêm gradient, icon font, utility CSS hoặc framework trình bày.
- **Don't** thêm shadow cho card lồng bên trong hoặc hiệu ứng nâng cho phần tử không tương tác.
- **Don't** dùng xanh lá, cam hay đỏ làm màu trang trí không mang ý nghĩa trạng thái.
