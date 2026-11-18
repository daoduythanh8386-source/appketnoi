# APP KẾT NỐI – Danh thiếp QR

Tạo danh thiếp QR, quét bằng camera và lưu thẳng vào danh bạ.
Chạy trên Android, iOS, máy tính bảng và máy tính (PWA: có thể "Thêm vào màn hình chính").

Được làm bởi **Đào Duy Thanh** · Since 2026

## Tính năng
1. Form: họ tên, điện thoại, email, địa chỉ, công ty, bộ phận
2. Nút **Tạo QR** (mã chứa vCard, camera mặc định của điện thoại quét là hiện "Thêm vào danh bạ")
3. Xem trước danh thiếp
4. Tải QR dạng PNG
5. Chia sẻ ảnh QR hoặc **đường dẫn công khai** (`/?c=...`, không cần máy chủ)
6. Tài khoản để lưu, sửa, tạo lại, xóa danh thiếp (Supabase, tùy chọn)
7. **Quét QR** bằng camera của thiết bị → tự điền → bấm "Đồng ý" để lưu vào danh bạ

## Chạy thử trên máy
```bash
npx serve .
```
Camera chỉ hoạt động trên HTTPS hoặc `localhost`. Khi lên Vercel sẽ có HTTPS sẵn.

## Đưa lên GitHub
```bash
cd app-ket-noi
git init
git add .
git commit -m "APP KẾT NỐI v1"
git branch -M main
git remote add origin https://github.com/<ten-tai-khoan>/app-ket-noi.git
git push -u origin main
```
(Tạo trước một repo trống tên `app-ket-noi` trên github.com.)

## Triển khai Vercel
1. Vào vercel.com → **Add New… → Project** → chọn repo `app-ket-noi` → **Deploy**.
2. Không cần Build Command, không cần thư mục Output (đây là site tĩnh). Để mặc định.
3. Mỗi lần `git push`, Vercel tự triển khai lại.
4. Mở địa chỉ `https://<ten>.vercel.app` trên điện thoại:
   - iPhone (Safari): Chia sẻ → **Thêm vào Màn hình chính**
   - Android (Chrome): Menu ⋮ → **Cài đặt ứng dụng**

## Bật tài khoản (Supabase, miễn phí)
1. Tạo project tại supabase.com.
2. SQL Editor → dán nội dung `supabase.sql` → Run.
3. Project Settings → API: chép **Project URL** và khóa **anon public** vào `config.js`.
4. Authentication → URL Configuration: đặt Site URL là địa chỉ Vercel của bạn.
5. `git commit` + `git push`.

Khóa `anon` là khóa công khai; dữ liệu được bảo vệ bởi chính sách RLS trong `supabase.sql`.
Chưa cấu hình thì app vẫn chạy, lưu danh thiếp trên thiết bị.

## So sánh với các app có sẵn (tham khảo, giá có thể đã đổi)
| App | Điểm mạnh | Hạn chế |
|---|---|---|
| Blinq | App mượt nhất, chữ ký email, tích hợp doanh nghiệp | Bỏ logo, đồng bộ CRM, font riêng phải trả phí |
| HiHello | Gói miễn phí tốt, 4 danh thiếp | Gói free có thương hiệu HiHello, phân tích là gói trả phí |
| Popl | Thu lead tại sự kiện, thẻ NFC | Không công bố giá, phải qua báo giá |
| Wave Connect | Chạy trên trình duyệt, không cần cài app | Tiếng Việt và hỗ trợ địa phương hạn chế |
| CamCard | Quét danh thiếp giấy | Hướng chụp thẻ giấy, không phải tạo QR |

Vì sao tự làm APP KẾT NỐI: tiếng Việt chuẩn có dấu, không thương hiệu bên thứ ba, không bắt người nhận cài app,
dữ liệu của bạn, chi phí hạ tầng gần như 0 (Vercel + Supabase gói miễn phí).

## Cách xây hiệu quả nhất (đã áp dụng)
- **PWA thay vì 3 app riêng:** một mã nguồn chạy Android, iOS, tablet, máy tính. Không cần Google Play / App Store.
- **QR chứa vCard:** quét bằng camera mặc định là lưu được ngay, không cần cài app.
- **Đường dẫn công khai mã hóa trong URL:** không cần backend cho phần chia sẻ.
- **Thư viện đóng gói sẵn trong `/lib`:** chạy ổn định, hoạt động lại được khi mạng yếu nhờ service worker.
- **Supabase tùy chọn:** chỉ bật khi cần tài khoản đồng bộ nhiều thiết bị.
- Khi cần có mặt trên App Store / Google Play: bọc bằng Capacitor hoặc PWABuilder từ chính mã nguồn này.

## Cấu trúc
```
index.html  styles.css  app.js  config.js  sw.js  manifest.webmanifest
vercel.json  supabase.sql  lib/  icons/
```
