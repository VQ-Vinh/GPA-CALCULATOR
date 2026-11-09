---
name: GPA Calculator
description: Bảng học vụ tối giản kiểu Swiss dành cho sinh viên HCMUT
colors:
  accent: "#4338ca"
  accent-hover: "#3730a3"
  accent-soft: "#eef2ff"
  accent-surface: "#f6f7ff"
  accent-line: "#c7d2fe"
  series-2: "#0f766e"
  ink: "#0f172a"
  ink-soft: "#334155"
  muted-ink: "#5f6b7e"
  muted-on-tint: "#475569"
  border: "#e2e8f0"
  border-strong: "#cbd5e1"
  surface: "#ffffff"
  surface-subtle: "#f8fafc"
  surface-sunken: "#f1f5f9"
  canvas: "#f3f6fc"
  success: "#047857"
  success-soft: "#ecfdf5"
  warning: "#b45309"
  warning-soft: "#fffbeb"
  error: "#b91c1c"
  error-soft: "#fef2f2"
colors-dark:
  accent: "#a5b4fc"
  on-accent: "#0b1020"
  ink: "#e2e8f0"
  muted-ink: "#94a3b8"
  surface: "#111a2c"
  canvas: "#0b1020"
  border: "#243049"
typography:
  display:
    fontFamily: "'Be Vietnam Pro', system-ui, 'Segoe UI', Roboto, Arial, sans-serif"
    fontSize: "clamp(1.375rem, 5.5vw, 1.875rem)"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "'Be Vietnam Pro', system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "'Be Vietnam Pro', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "'Be Vietnam Pro', system-ui, sans-serif"
    fontSize: "15px (16px dưới 40rem)"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "'Be Vietnam Pro', system-ui, sans-serif"
    fontSize: "12-13px"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  control: "8px"
  compact: "10px"
  panel: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  xxxl: "48px"
motion:
  fast: "120ms"
  base: "200ms"
  ease-out: "cubic-bezier(0.22, 1, 0.36, 1)"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "on-accent"
    rounded: "{rounded.compact}"
    height: "44px (48px cho btn-lg)"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.compact}"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "44px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  metric-primary:
    backgroundColor: "{colors.accent-surface}"
    textColor: "{colors.accent}"
    rounded: "{rounded.compact}"
---

# Design System: GPA Calculator

## Overview

**Creative North Star: "Bảng học vụ tối giản"**

Phong cách Minimalism / Swiss: lưới rõ, khoảng trắng có chủ đích, tương phản cao và một màu nhấn duy nhất. Con số GPA là trung tâm; màu sắc chỉ xuất hiện khi mang nghĩa (hành động, trạng thái, mức điểm).

**Key Characteristics:**

- GPA hệ 4 là chỉ số chính, lớn nhất trang, kèm thanh tiến độ trên thang 4.
- Một accent indigo cho CTA, focus, trạng thái được chọn và chuỗi dữ liệu chính.
- Panel trắng trung tính; không phân khu bằng tint màu theo section.
- Thanh điều hướng 3 mục dính trên đầu trang, `scroll-padding-top` để focus và anchor không bị che.
- Hỗ trợ light và dark mode qua `prefers-color-scheme`, chỉ bằng cách đổi token.

## Colors

### Accent

- **Indigo:** CTA chính, focus ring, số bước, GPA hệ 4, học kỳ đang mở, đường GPA hệ 4 trên biểu đồ.

### Data series

- **Teal (`--series-2`):** chỉ dùng cho chuỗi GPA hệ 10 trên biểu đồ (đường đứt nét) để phân biệt với hệ 4.

### Neutral

- **Ink / ink-soft / muted:** nội dung, nhãn, chú thích. `--muted-on-tint` dùng trên nền tint.
- **Surface / subtle / sunken / canvas:** panel trắng, header học kỳ và hàng tóm tắt, input nằm trong bảng, nền trang.

### Semantic

- Xanh lá, cam, đỏ chỉ dùng cho thành công, cảnh báo, lỗi và delta GPA. Luôn đi kèm chữ, không chỉ dựa vào màu.

### Grade scale

- 8 mức Hệ 4 (`.g-4` … `.g-0`) khai báo `--g-fg` / `--g-bg`; ô Chữ và Hệ 4 áp dụng qua `.data-table td.cell-letter[class*="g-"]`. Giá trị hex trùng với `GRADE_TONES` trong `google-apps-script/Code.gs` — đổi cả hai cùng lúc. Ở dark mode ô điểm đảo vai: chữ dùng màu nền của mức (`--g-bg`), nền là `--g-bg` pha 16% vào surface, để giữ phân biệt theo màu mà không chói.

### Named Rules

**One Accent Rule.** Không thêm màu nhấn thứ hai cho giao diện; teal chỉ tồn tại như chuỗi dữ liệu.

**Token Only Rule.** Sau mốc `/* ---------- shell ---------- */` trong CSS không có hex hay rgba ngoài thang điểm; mọi màu đi qua token để dark mode hoạt động.

## Typography

**Font:** Be Vietnam Pro (Google Fonts, `display=swap`), thiết kế cho dấu tiếng Việt; fallback system-ui. Dữ liệu paste BKEL dùng UI monospace.

- **Display:** tên sản phẩm, 800, tracking âm.
- **Headline:** tiêu đề panel, 700, đi cùng ô số bước màu accent.
- **Metric:** GPA chính 44px / 800; metric phụ 26px / 700; luôn `tabular-nums`.
- **Body / Label:** body 15-16px, nhãn 12-13px weight 600.

## Layout

Container tối đa 72rem. Mobile-first với mốc 40rem, 48rem, 56rem, 64rem. Dưới 48rem các bảng chuyển thành card có nhãn `data-label`; từ 48rem trở lên là bảng thật. Khoảng cách theo nhịp 4/8/12/16/24/32/48px.

## Elevation & Depth

Phẳng theo mặc định. Chỉ panel cấp cao nhất có `--shadow-panel`; khối con dùng viền 1px và surface tonal. CTA chính có `--shadow-action` khi hover. Toast feedback dùng `--shadow-feedback`.

## Shapes

Panel 16px, card và button 10px, input 8px, badge/chip dạng pill. Góc lồng bên trong luôn nhỏ hơn cha.

## Components

- **Buttons:** cao tối thiểu 44px; primary nền accent; ghost nền surface viền slate; danger chữ đỏ. Nhấn có `scale(0.98)`; trạng thái `.is-busy` hiện spinner. Icon SVG nét 2px, `aria-hidden`.
- **Section nav:** 3 anchor, dính trên cùng, ẩn số bước dưới 26rem.
- **Import:** ô paste viền đứt khi rỗng, liền khi focus; kết quả import có header xanh lá kèm dấu tích.
- **Metrics:** ba thẻ đều có thanh tiến độ cùng màu mã hóa với biểu đồ: hệ 4 indigo (trên 4), hệ 10 teal (trên 10), tín chỉ trung tính (trên tổng tín chỉ mục tiêu, cập nhật khi sửa ô mục tiêu); card GPA hệ 4 nổi bật bằng accent-surface; thanh `metric-meter` dùng `transform: scaleX(var(--fill))`.
- **Semester accordion:** học kỳ đang mở có viền accent-line và header accent-surface; tổng kết học kỳ dạng chip, chip Hệ 4 dùng accent.
- **Biểu đồ xu hướng:** 3 ô thống kê (kỳ gần nhất kèm ▲/▼, cao nhất, thấp nhất); trục Y tự zoom; dải xếp loại tô accent đậm dần theo mức; đường Hệ 4 liền 3px, Hệ 10 đứt nét teal; đường tích lũy (gạch) và mục tiêu (chấm) có nhãn chữ; chú thích là nút bật/tắt chuỗi. Chiều cao 220/260/280px theo breakpoint; dưới 40rem nhãn trục X rút gọn "HK1 / 23-24".
- **Inputs:** nền surface, viền slate, focus viền accent + `--focus-ring`; trong bảng môn học input nền sunken để giảm nhiễu.

## Motion

Mọi chuyển động nằm trong `js/motion.js` (Web Animations API) và token `--dur-fast` 120ms, `--dur` 200ms, `--dur-slow` 320ms, `--ease-out`, `--ease-in`. Mỗi chuyển động phải diễn tả quan hệ nhân quả:

- **Reveal:** panel và khối kết quả trượt lên 16px khi vào viewport, lệch nhau 60ms; chỉ chạy một lần, không chạy lại khi summary render lại.
- **Count-up:** chỉ số GPA đếm từ 0 khi có dữ liệu lần đầu, từ giá trị cũ khi sửa điểm; thanh tiến độ trượt theo.
- **Biểu đồ:** vùng vẽ lộ dần từ trái sang phải, chấm bật lên đúng lúc đường đi qua, đường tham chiếu và nhãn giá trị cuối hiện sau cùng. Tooltip trượt theo con trỏ; các điểm không được chọn mờ đi.
- **Accordion:** mở 320ms ease-out, đóng 200ms ease-in (đóng nhanh hơn mở).
- **Thêm môn/học kỳ:** hàng mới trượt vào kèm nền accent nhạt rồi tắt, focus nhảy vào ô tên.
- **Xóa:** hàng trượt sang phải 180ms rồi mới bị xóa; vẫn có hoàn tác.
- **Điểm chữ đổi:** ô điểm nảy nhẹ.
- **Nav:** mục đang xem được tô accent (`aria-current`), có bóng khi dính.
- **Dán bảng điểm:** nút "Tính GPA" phát xung hai lần để gợi ý bước tiếp theo.
- `prefers-reduced-motion` tắt toàn bộ.

## Do's and Don'ts

### Do:

- Giữ indigo là màu nhấn và focus duy nhất.
- Thêm màu mới dưới dạng token trên `:root` và giá trị dark tương ứng.
- Giữ `prefers-reduced-motion`, focus-visible và vùng bấm ≥44px.

### Don't:

- Không thêm gradient, icon font, utility CSS hay framework.
- Không tô tint màu riêng cho từng section.
- Không dùng xanh lá, cam, đỏ để trang trí.
