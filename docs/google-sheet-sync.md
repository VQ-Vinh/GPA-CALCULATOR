# Cấu hình đồng bộ Google Sheet

Web chỉ bắt đầu gửi dữ liệu sau khi hoàn thành toàn bộ các bước dưới đây. Hãy dùng cùng một tài khoản Google để sở hữu Sheet và Apps Script.

## 1. Tạo Sheet

1. Tạo một Google Sheet mới.
2. Sao chép Spreadsheet ID trong URL, nằm giữa `/d/` và `/edit`.
3. Không bật chia sẻ công khai cho Sheet.

Không cần tạo tab thủ công. Apps Script tự tạo tab tổng hợp (mặc định đặt tên `TỔNG HỢP`) và mỗi lần đồng bộ sẽ tự tạo hoặc cập nhật một tab riêng cho từng sinh viên.

### Cấu trúc dữ liệu trong Sheet

**Tab tổng hợp** — một dòng cho mỗi sinh viên, upsert theo MSSV:

| HỌ TÊN | MSSV | GPA HỆ 4 | GPA HỆ 10 | TỔNG TC | SỐ HỌC KỲ | ĐỒNG BỘ LÚC | TRANG TÍNH |
| --- | --- | --- | --- | --- | --- | --- | --- |

Cột `TRANG TÍNH` là link nhảy thẳng tới tab của sinh viên đó.

**Tab sinh viên** — tên tab dạng `Họ tên-MSSV`, ví dụ `Nguyễn Văn A-2251234`:

- Dòng 1-4: họ tên, MSSV, nguồn dữ liệu, thời điểm đồng bộ.
- Dòng 6-7: GPA Hệ 4, GPA Hệ 10, tổng tín chỉ, số học kỳ, GPA4 trước cải thiện, mức tăng.
- Dòng 9 trở đi: bảng đầy đủ mọi môn học với cột `HỌC KỲ | STT | TÊN MÔN HỌC | TÍN CHỈ | ĐIỂM 10 | ĐIỂM CHỮ | HỆ 4 | GHI CHÚ`. Sau mỗi học kỳ có một dòng tổng kết in đậm.

Cột `GHI CHÚ` có ba giá trị:

- `Cải thiện` — môn học lại, và đây chính là lần điểm cao nhất đang được dùng cho GPA tích lũy.
- `Không tính (đã cải thiện)` — lần học này có điểm thấp hơn một lần khác nên bị loại khỏi GPA tích lũy.
- `Ngoài thang điểm` — điểm không rơi vào khoảng nào trong bảng quy đổi đang dùng.

MSSV là khóa định danh duy nhất. Nếu sinh viên sửa lại họ tên, tab cũ được **đổi tên** chứ không tạo tab mới.

## 2. Triển khai Google Apps Script

1. Mở [Google Apps Script](https://script.google.com/) và tạo project mới.
2. Thay nội dung `Code.gs` bằng mã trong `google-apps-script/Code.gs` của dự án.
3. Mở **Project Settings → Script Properties** và thêm:

| Property | Giá trị |
| --- | --- |
| `SPREADSHEET_ID` | ID của Google Sheet |
| `INDEX_SHEET_NAME` | Tên tab tổng hợp, ví dụ `TỔNG HỢP` |
| `API_SECRET` | Chuỗi bí mật ngẫu nhiên dài tối thiểu 32 ký tự |

4. Chọn **Deploy → New deployment → Web app**.
5. Chọn **Execute as: Me** và quyền truy cập cho phép request từ Cloudflare, sau đó bấm **Deploy**.
6. Chấp nhận quyền truy cập Sheet, rồi sao chép URL kết thúc bằng `/exec`.

Khi thay đổi `Code.gs`, phải tạo version deployment mới trong **Manage deployments**.

> Nếu bạn đang nâng cấp từ phiên bản cũ (ghi file JSON lên Drive): script mới không còn dùng `DriveApp` nên phạm vi quyền giảm xuống chỉ còn Sheets. Google sẽ yêu cầu **cấp quyền lại** khi deploy version mới. Có thể xóa Script Property `DRIVE_FOLDER_ID` và `SHEET_NAME` cũ.

## 3. Tạo Cloudflare Turnstile

1. Trong Cloudflare Dashboard, mở **Turnstile → Add widget**.
2. Thêm hostname Pages đang dùng, ví dụ `gpa-calculator-2p4.pages.dev`, và custom domain nếu có.
3. Sao chép Site Key và Secret Key.
4. Mở `js/constants.js`, gán Site Key công khai:

```js
const TURNSTILE_SITE_KEY = 'site-key-cua-ban';
```

Site Key có thể nằm trong frontend. Không được đưa Secret Key vào repository.

## 4. Cấu hình Cloudflare Pages

Trong project Pages, mở **Settings → Variables and Secrets** và thêm cho Production:

| Tên | Giá trị |
| --- | --- |
| `TURNSTILE_SECRET_KEY` | Secret Key của Turnstile |
| `GOOGLE_APPS_SCRIPT_URL` | URL Web App kết thúc bằng `/exec` |
| `SHEET_SYNC_SECRET` | Giống chính xác `API_SECRET` trong Apps Script |

Đặt `TURNSTILE_SECRET_KEY` và `SHEET_SYNC_SECRET` là **Secret**. Cấu hình lại cho Preview nếu muốn kiểm tra trên deployment preview.

Sau khi thêm biến, tạo deployment mới. Cloudflare Pages tự nhận thư mục `functions/` và cung cấp endpoint `/api/sync`.

## 5. Kiểm tra

1. Dán bảng điểm BKEL có họ tên và MSSV hợp lệ, sau đó bấm **Phân tích**.
2. Kiểm tra giao diện báo **Đồng bộ hoàn tất** kèm tên trang tính vừa tạo.
3. Mở Sheet: phải có tab mới tên `Họ tên-MSSV` chứa đủ mọi học kỳ và môn học, và tab tổng hợp có một dòng mới với link nhảy đúng tab đó.
4. Phân tích lại cùng MSSV; tab cũ phải được ghi đè, không sinh tab thứ hai và không có dòng tổng hợp trùng.
5. Sửa họ tên rồi đồng bộ lại cùng MSSV; tab phải được đổi tên chứ không tạo tab mới.
6. Thử dữ liệu thiếu MSSV; bản xem trước vẫn hiện nhưng web phải báo không đồng bộ.

Không thể kiểm tra endpoint bằng cách mở trực tiếp `index.html`; Pages Function chỉ chạy trong Cloudflare Pages hoặc môi trường Wrangler Pages.
