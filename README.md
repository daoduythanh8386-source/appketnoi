# APP KẾT NỐI – Kết nối · Hợp tác · Thành công

Tạo danh thiếp QR, quét bằng camera và lưu thẳng vào danh bạ.
Chạy trên Android, iOS, máy tính bảng và máy tính (PWA – cài được như app, icon là ảnh `icons/icon-512.png`).

Được làm bởi **Đào Duy Thanh** · Since 2026

## Tính năng
1. Form: họ tên, điện thoại, email, địa chỉ, công ty, bộ phận
2. Nút **Tạo QR** (mã chứa vCard: camera mặc định của điện thoại quét là hiện "Thêm vào danh bạ")
3. Xem trước danh thiếp
4. Tải QR dạng PNG
5. Chia sẻ ảnh QR hoặc **đường dẫn công khai** (`/?c=...`, không cần máy chủ)
6. **Tài khoản tự tạo** (email + mật khẩu), lưu / sửa / tạo lại / xóa danh thiếp
7. **Quên mật khẩu** tự lấy lại qua email, đổi mật khẩu trong mục Tài khoản
8. **Quét QR** bằng camera của thiết bị → tự điền → bấm "Đồng ý" để lưu vào danh bạ

## Icon app
Ảnh icon nằm trong `icons/`: `icon-192.png`, `icon-512.png`, `maskable-512.png` (Android), `apple-touch-icon.png` (iPhone/iPad), `favicon-48.png`.
Khai báo trong `manifest.webmanifest` và `index.html`, nên khi "Thêm vào màn hình chính" / "Cài đặt ứng dụng", icon trên máy chính là ảnh này.
Muốn đổi icon: thay các tệp cùng tên (giữ nguyên kích thước), push lại. Máy đã cài có thể cần gỡ và cài lại để đổi icon.

## Chạy thử trên máy
```bash
npx serve .
```
Camera chỉ hoạt động trên HTTPS hoặc `localhost`. Lên Vercel là có HTTPS sẵn.

## Đưa lên GitHub
```bash
cd app-ket-noi
git init
git add .
git commit -m "APP KẾT NỐI v2"
git branch -M main
git remote add origin https://github.com/<ten-tai-khoan>/app-ket-noi.git
git push -u origin main
```
(Tạo trước repo trống `app-ket-noi` trên github.com.)

## Triển khai Vercel
1. vercel.com → **Add New… → Project** → chọn repo → **Deploy** (site tĩnh, không cần Build Command).
2. Mỗi lần `git push`, Vercel tự triển khai lại.
3. Mở `https://<ten>.vercel.app` trên điện thoại:
   - iPhone (Safari): Chia sẻ → **Thêm vào Màn hình chính**
   - Android (Chrome): Menu ⋮ → **Cài đặt ứng dụng**

## Bật tài khoản + quên mật khẩu (Supabase, miễn phí)
1. Tạo project tại supabase.com.
2. **SQL Editor** → dán `supabase.sql` → Run.
3. **Project Settings → API**: chép *Project URL* và khóa *anon public* vào `config.js`, rồi push.
4. **Authentication → URL Configuration**:
   - *Site URL* = địa chỉ Vercel của bạn (ví dụ `https://app-ket-noi.vercel.app`)
   - *Redirect URLs* = thêm đúng địa chỉ đó (và `http://localhost:3000` nếu thử trên máy)
5. **Authentication → Providers → Email**: giữ bật *Confirm email*. Nên đặt độ dài mật khẩu tối thiểu 8.
6. **Quan trọng khi dùng thật:** email mặc định của Supabase bị giới hạn rất ít thư mỗi giờ.
   Vào **Authentication → SMTP Settings** gắn dịch vụ gửi mail riêng (Resend, Brevo, Gmail SMTP…) để email xác nhận và đặt lại mật khẩu gửi ổn định.
7. (Tùy chọn) **Authentication → Email Templates**: dịch nội dung "Reset Password" sang tiếng Việt.

Chưa cấu hình Supabase thì app vẫn chạy, lưu danh thiếp trên từng thiết bị và không hiện màn đăng nhập.

### Cách quên mật khẩu hoạt động (và vì sao an toàn)
- Người dùng nhập email → app gọi Supabase gửi liên kết đặt lại. App luôn báo cùng một câu dù email có tồn tại hay không, để không ai dò được email đã đăng ký.
- Liên kết trong email có thời hạn, mở ra màn **Đặt mật khẩu mới**; mật khẩu cần ≥ 8 ký tự, có chữ và số.
- Nút gửi lại bị khóa 60 giây; Supabase có giới hạn tần suất phía máy chủ.
- Mật khẩu không bao giờ lưu trong app hay mã nguồn; Supabase tự băm và lưu. Khóa `anon` là khóa công khai, dữ liệu được bảo vệ bằng chính sách RLS trong `supabase.sql` (mỗi người chỉ thấy danh thiếp của mình).
- `vercel.json` bật CSP, HSTS, chặn nhúng khung (X-Frame-Options) và chỉ cho phép camera trên chính trang này.

## Cấu trúc
```
index.html  styles.css  app.js  config.js  sw.js  manifest.webmanifest
vercel.json  supabase.sql  lib/  icons/
```
