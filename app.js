/* APP KẾT NỐI – Đào Duy Thanh – Since 2026 */
(function () {
"use strict";
var $ = function (id) { return document.getElementById(id); };
var F = ["name", "phone", "email", "addr", "company", "dept"];
var cur = {}, editId = null, qrText = "", scanned = null;
var cards = [], stream = null, loopId = 0, facing = "environment", detector = null;
var sb = null, user = null, recovering = false, cooldown = 0;

/* ---------- Tiện ích ---------- */
function msg(id, t, err) {
  var e = $(id); e.innerHTML = ""; if (!t) return;
  var d = document.createElement("div"); d.className = "msg" + (err ? " er" : ""); d.textContent = t; e.appendChild(d);
}
function read() { var o = {}; F.forEach(function (k) { o[k] = $("f_" + k).value.trim(); }); return o; }
function write(o) { F.forEach(function (k) { $("f_" + k).value = (o && o[k]) || ""; }); }
function newId() { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function slug(s) {
  return (s || "danh-thiep").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "danh-thiep";
}
function cardHtml(el, o) {
  el.innerHTML = "";
  function p(cls, t) { var x = document.createElement("p"); if (cls) x.className = cls; x.textContent = t; el.appendChild(x); }
  function line(label, v) {
    var x = document.createElement("p"), a = document.createElement("span"), b = document.createElement("span");
    a.className = "ic"; a.textContent = label; b.textContent = v || "—"; x.appendChild(a); x.appendChild(b); el.appendChild(x);
  }
  p("nm", o.name || "Họ tên"); p("co", [o.company, o.dept].filter(Boolean).join(" · ") || "Công ty · Bộ phận");
  line("Điện thoại", o.phone); line("Email", o.email); line("Địa chỉ", o.addr);
}

/* ---------- vCard ---------- */
function esc(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, " "); }
function unesc(s) { return s.replace(/\\([;,nN\\])/g, function (_, c) { return (c === "n" || c === "N") ? " " : c; }); }
function splitSemi(s) { return s.split(/(?<!\\);/); }
function toVcard(o) {
  var L = ["BEGIN:VCARD", "VERSION:3.0", "N:;" + esc(o.name) + ";;;", "FN:" + esc(o.name)];
  if (o.company || o.dept) L.push("ORG:" + esc(o.company) + (o.dept ? ";" + esc(o.dept) : ""));
  if (o.dept) L.push("TITLE:" + esc(o.dept));
  if (o.phone) L.push("TEL;TYPE=CELL:" + esc(o.phone));
  if (o.email) L.push("EMAIL:" + esc(o.email));
  if (o.addr) L.push("ADR;TYPE=WORK:;;" + esc(o.addr) + ";;;;");
  L.push("END:VCARD"); return L.join("\r\n");
}
function fromVcard(t) {
  if (!/BEGIN:VCARD/i.test(t)) return null;
  t = t.replace(/\r?\n[ \t]/g, "");
  var o = { name: "", phone: "", email: "", addr: "", company: "", dept: "" }, n = "";
  t.split(/\r?\n/).forEach(function (line) {
    var i = line.indexOf(":"); if (i < 0) return;
    var key = line.slice(0, i).split(";")[0].toUpperCase(), v = line.slice(i + 1);
    if (key === "FN") o.name = unesc(v);
    else if (key === "N" && !n) { var p = splitSemi(v).map(unesc); n = ((p[1] || "") + " " + (p[0] || "")).trim(); }
    else if (key === "ORG") { var q = splitSemi(v).map(unesc); o.company = q[0] || ""; o.dept = q.slice(1).join(" "); }
    else if (key === "TITLE" && !o.dept) o.dept = unesc(v);
    else if (key === "TEL" && !o.phone) o.phone = unesc(v);
    else if (key === "EMAIL" && !o.email) o.email = unesc(v);
    else if (key === "ADR" && !o.addr) o.addr = splitSemi(v).map(unesc).filter(Boolean).join(", ");
  });
  if (!o.name) o.name = n;
  return (o.name || o.phone) ? o : null;
}

/* ---------- Liên kết công khai (không cần máy chủ) ---------- */
function enc(o) {
  var s = JSON.stringify([o.name, o.phone, o.email, o.addr, o.company, o.dept]);
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function dec(s) {
  try {
    s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
    var a = JSON.parse(decodeURIComponent(escape(atob(s))));
    return { name: a[0] || "", phone: a[1] || "", email: a[2] || "", addr: a[3] || "", company: a[4] || "", dept: a[5] || "" };
  } catch (e) { return null; }
}
function publicUrl(o) { return location.origin + "/?c=" + enc(o); }

/* ---------- Lưu vào danh bạ ---------- */
async function saveContact(o, out) {
  var v = toVcard(o), name = slug(o.name) + ".vcf";
  var f = new File([v], name, { type: "text/vcard" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      await navigator.share({ files: [f], title: o.name });
      msg(out, "Chọn “Danh bạ / Contacts” trong bảng chia sẻ để lưu liên hệ."); return;
    }
  } catch (e) { if (e && e.name === "AbortError") return; }
  var url = URL.createObjectURL(new Blob([v], { type: "text/vcard" })), a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  msg(out, "Đã tải tệp danh bạ (.vcf). Mở tệp này và chọn “Thêm vào danh bạ”.");
}

/* ---------- QR ---------- */
function preview() { cur = read(); cardHtml($("pv"), cur); }
function drawQR(text, canvas) {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];
  var q = qrcode(0, "M"); q.addData(text); q.make();
  var n = q.getModuleCount(), s = 8, m = 4, size = (n + m * 2) * s;
  canvas.width = canvas.height = size;
  var c = canvas.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, size, size); c.fillStyle = "#000";
  for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) if (q.isDark(r, k)) c.fillRect((k + m) * s, (r + m) * s, s, s);
}
function gen() {
  var o = read();
  if (!o.name || !o.phone) { msg("m1", "Vui lòng nhập ít nhất Họ tên và Điện thoại.", true); return false; }
  msg("m1", "");
  try { qrText = toVcard(o); drawQR(qrText, $("qr")); }
  catch (e) { msg("m1", "Nội dung quá dài để tạo QR. Hãy rút gọn thông tin.", true); return false; }
  $("qrHint").textContent = "Camera điện thoại quét mã này sẽ hiện nút “Thêm vào danh bạ”.";
  ["bPng", "bShare", "bLink"].forEach(function (b) { $(b).disabled = false; });
  preview(); return true;
}
function qrBlob() { return new Promise(function (r) { $("qr").toBlob(r, "image/png"); }); }

/* ---------- Lưu trữ: đám mây (Supabase) hoặc thiết bị ---------- */
function loadLocal() { try { return JSON.parse(localStorage.getItem("ketnoi_cards") || "[]"); } catch (e) { return []; } }
function saveLocal() { try { localStorage.setItem("ketnoi_cards", JSON.stringify(cards)); } catch (e) {} }
async function refresh() {
  if (sb && user) {
    var r = await sb.from("cards").select("id,data,updated_at").order("updated_at", { ascending: false });
    if (r.error) { msg("m1", "Không tải được danh sách: " + r.error.message, true); cards = []; }
    else cards = r.data.map(function (x) { var d = x.data || {}; d.id = x.id; d.updated = Date.parse(x.updated_at) || 0; return d; });
  } else cards = sb ? [] : loadLocal();
  renderList(); renderAcct();
}
async function saveCard() {
  var o = read();
  if (!o.name || !o.phone) { msg("m1", "Vui lòng nhập ít nhất Họ tên và Điện thoại.", true); return; }
  var id = editId || newId(); o.id = id; o.updated = Date.now();
  if (sb && user) {
    var d = {}; F.forEach(function (k) { d[k] = o[k]; });
    var r = await sb.from("cards").upsert({ id: id, data: d, updated_at: new Date().toISOString() });
    if (r.error) { msg("m1", "Không lưu được: " + r.error.message, true); return; }
    await refresh(); msg("m1", "Đã lưu vào tài khoản của bạn.");
  } else {
    cards = loadLocal().filter(function (c) { return c.id !== id; }); cards.unshift(o); saveLocal(); renderList();
    msg("m1", "Đã lưu trên thiết bị này.");
  }
  editId = id; $("formTitle").textContent = "Đang sửa danh thiếp";
}
function renderList() {
  var L = $("list"); L.innerHTML = "";
  $("mineNote").textContent = (sb && user) ? "Lưu theo tài khoản " + user.email + ", dùng được trên mọi thiết bị." : "Chế độ lưu trên thiết bị này.";
  if (!cards.length) { var e = document.createElement("p"); e.className = "muted"; e.textContent = "Chưa có danh thiếp nào."; L.appendChild(e); return; }
  cards.forEach(function (c) {
    var d = document.createElement("div"); d.className = "item";
    var t = document.createElement("div"), b = document.createElement("b"), s = document.createElement("div");
    b.textContent = c.name; s.className = "muted"; s.textContent = [c.company, c.phone].filter(Boolean).join(" · "); t.appendChild(b); t.appendChild(s);
    var r = document.createElement("div"); r.className = "row"; r.style.marginTop = "0";
    [["Sửa / Tạo lại QR", "btn ghost sm", function () { edit(c); }], ["Xóa", "btn danger sm", function () { del(c); }]].forEach(function (x) {
      var bt = document.createElement("button"); bt.type = "button"; bt.className = x[1]; bt.textContent = x[0]; bt.onclick = x[2]; r.appendChild(bt);
    });
    d.appendChild(t); d.appendChild(r); L.appendChild(d);
  });
}
function edit(c) { editId = c.id; write(c); $("formTitle").textContent = "Đang sửa danh thiếp"; show("create"); preview(); gen(); }
async function del(c) {
  if (!confirm("Xóa danh thiếp “" + c.name + "”?")) return;
  if (sb && user) { var r = await sb.from("cards").delete().eq("id", c.id); if (r.error) { alert(r.error.message); return; } await refresh(); }
  else { cards = loadLocal().filter(function (x) { return x.id !== c.id; }); saveLocal(); renderList(); }
}
function resetForm() {
  editId = null; write({}); $("formTitle").textContent = "Thông tin"; $("qr").width = $("qr").height = 10; qrText = "";
  ["bPng", "bShare", "bLink"].forEach(function (b) { $(b).disabled = true; });
  $("qrHint").textContent = "Nhấn “Tạo QR” để tạo mã."; preview(); msg("m1", ""); msg("m2", "");
}

/* ---------- Màn hình ---------- */
function screen(name) {
  ["pub", "auth", "app"].forEach(function (s) { $(s).classList.toggle("hide", s !== name); });
  if (name !== "app") stopCam();
  window.scrollTo(0, 0);
}
function renderAcct() {
  var cloud = !!(sb && user);
  $("acct").textContent = cloud ? user.email : "Danh thiếp QR · quét là lưu vào danh bạ";
  $("acctInfo").textContent = cloud ? "Đang đăng nhập bằng " + user.email + ". Danh thiếp được lưu theo tài khoản và đồng bộ trên mọi thiết bị."
    : "Tài khoản đám mây chưa được bật nên danh thiếp đang lưu trên thiết bị này.";
  $("bOut").classList.toggle("hide", !cloud); $("pwBox").classList.toggle("hide", !cloud);
}

/* ---------- Xác thực ---------- */
function authView(v) {
  var map = { login: "fLogin", signup: "fSignup", forgot: "fForgot", recover: "fRecover" };
  Object.keys(map).forEach(function (k) { $(map[k]).classList.toggle("hide", k !== v); });
  $("authSeg").classList.toggle("hide", v === "forgot" || v === "recover");
  Array.prototype.forEach.call($("authSeg").children, function (b) { b.classList.toggle("on", b.dataset.a === v); });
  msg("mAuth", "");
}
function viMsg(e) {
  var m = (e && e.message || "").toLowerCase();
  if (m.indexOf("invalid login") >= 0) return "Email hoặc mật khẩu không đúng.";
  if (m.indexOf("not confirmed") >= 0) return "Email chưa được xác nhận. Hãy bấm liên kết trong email đã gửi cho bạn.";
  if (m.indexOf("rate limit") >= 0 || m.indexOf("too many") >= 0 || e && e.status === 429) return "Bạn thao tác quá nhanh. Vui lòng đợi vài phút rồi thử lại.";
  if (m.indexOf("same password") >= 0) return "Mật khẩu mới phải khác mật khẩu cũ.";
  if (m.indexOf("weak") >= 0 || m.indexOf("at least") >= 0) return "Mật khẩu quá yếu. Hãy dùng ít nhất 8 ký tự, có cả chữ và số.";
  if (m.indexOf("session") >= 0 && m.indexOf("missing") >= 0) return "Liên kết đã hết hạn hoặc đã dùng rồi. Hãy yêu cầu liên kết mới.";
  return "Có lỗi xảy ra: " + (e && e.message || "không rõ") + ".";
}
function pwCheck(a, b) {
  if (a.length < 8) return "Mật khẩu cần có ít nhất 8 ký tự.";
  if (!/[A-Za-z]/.test(a) || !/[0-9]/.test(a)) return "Mật khẩu cần có cả chữ và số.";
  if (a !== b) return "Hai mật khẩu nhập lại chưa khớp.";
  return "";
}
function busy(form, on) { Array.prototype.forEach.call(form.querySelectorAll("button"), function (b) { if (on) b.setAttribute("disabled", ""); else if (b.id !== "bForgot" || !cooldown) b.removeAttribute("disabled"); }); }
function startCooldown() {
  cooldown = 60; var b = $("bForgot");
  (function tick() { if (cooldown <= 0) { b.textContent = "Gửi liên kết đặt lại"; b.removeAttribute("disabled"); return; }
    b.setAttribute("disabled", ""); b.textContent = "Gửi lại sau " + cooldown + " giây"; cooldown--; setTimeout(tick, 1000); })();
}
function bindAuth() {
  $("authSeg").onclick = function (e) { var a = e.target.dataset && e.target.dataset.a; if (a) authView(a); };
  $("goForgot").onclick = function () { $("f_mail").value = $("l_email").value; authView("forgot"); };
  $("backLogin").onclick = function () { authView("login"); };
  document.addEventListener("click", function (e) {
    var id = e.target.dataset && e.target.dataset.eye; if (!id) return;
    var i = $(id), show = i.type === "password"; i.type = show ? "text" : "password"; e.target.textContent = show ? "Ẩn" : "Hiện";
  });

  $("fLogin").onsubmit = async function (e) {
    e.preventDefault(); busy(this, true);
    var r = await sb.auth.signInWithPassword({ email: $("l_email").value.trim(), password: $("l_pass").value });
    busy(this, false);
    if (r.error) { msg("mAuth", viMsg(r.error), true); return; }
    $("l_pass").value = "";
  };
  $("fSignup").onsubmit = async function (e) {
    e.preventDefault(); var bad = pwCheck($("s_pass").value, $("s_pass2").value);
    if (bad) { msg("mAuth", bad, true); return; }
    busy(this, true);
    var r = await sb.auth.signUp({ email: $("s_email").value.trim(), password: $("s_pass").value, options: { emailRedirectTo: location.origin + "/" } });
    busy(this, false);
    if (r.error) { msg("mAuth", viMsg(r.error), true); return; }
    $("s_pass").value = $("s_pass2").value = "";
    if (!(r.data && r.data.session)) msg("mAuth", "Gần xong rồi! Hãy mở email và bấm liên kết xác nhận, sau đó quay lại đăng nhập.");
  };
  $("fForgot").onsubmit = async function (e) {
    e.preventDefault(); if (cooldown > 0) return;
    busy(this, true);
    var r = await sb.auth.resetPasswordForEmail($("f_mail").value.trim(), { redirectTo: location.origin + "/" });
    busy(this, false);
    if (r.error && (r.error.status === 429 || /rate|too many/i.test(r.error.message || ""))) { msg("mAuth", viMsg(r.error), true); return; }
    // Luôn trả lời giống nhau để không lộ email nào đã đăng ký
    msg("mAuth", "Nếu email này đã đăng ký, một liên kết đặt lại mật khẩu vừa được gửi. Hãy kiểm tra hộp thư (cả mục Spam).");
    startCooldown();
  };
  $("fRecover").onsubmit = async function (e) {
    e.preventDefault(); var bad = pwCheck($("r_pass").value, $("r_pass2").value);
    if (bad) { msg("mAuth", bad, true); return; }
    busy(this, true);
    var r = await sb.auth.updateUser({ password: $("r_pass").value });
    busy(this, false);
    if (r.error) { msg("mAuth", viMsg(r.error), true); return; }
    $("r_pass").value = $("r_pass2").value = ""; recovering = false;
    history.replaceState(null, "", location.pathname); user = r.data.user; await refresh(); show("acct"); screen("app");
    msg("mChg", "Đã đặt mật khẩu mới thành công.");
  };
  $("fChange").onsubmit = async function (e) {
    e.preventDefault(); var bad = pwCheck($("c_pass").value, $("c_pass2").value);
    if (bad) { msg("mChg", bad, true); return; }
    var r = await sb.auth.updateUser({ password: $("c_pass").value });
    if (r.error) { msg("mChg", viMsg(r.error), true); return; }
    $("c_pass").value = $("c_pass2").value = ""; msg("mChg", "Đã đổi mật khẩu.");
  };
  $("bOut").onclick = async function () { await sb.auth.signOut(); };
}

/* ---------- Camera + quét ---------- */
function showScan(o) { scanned = o; cardHtml($("sv"), o); $("bOk").disabled = $("bToForm").disabled = false; }
function handleText(t) {
  var o = null;
  try { var u = new URL(t); var c = u.searchParams.get("c"); if (c) o = dec(c); } catch (e) {}
  if (!o) o = fromVcard(t);
  if (!o) { msg("m3", "Mã QR này không phải danh thiếp của APP KẾT NỐI hoặc vCard.", true); return false; }
  msg("m3", "Đã đọc danh thiếp. Kiểm tra rồi nhấn “Đồng ý – lưu vào danh bạ”."); showScan(o); return true;
}
function stopCam() {
  loopId++; if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
  $("vid").srcObject = null; $("camwrap").classList.remove("on");
}
async function startCam() {
  stopCam(); msg("m3", "");
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    msg("m3", "Trình duyệt không hỗ trợ camera hoặc trang chưa chạy HTTPS. Hãy dùng “Chọn ảnh QR” để chụp mã.", true); return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } } });
  } catch (e) {
    var m = e && e.name === "NotAllowedError" ? "Bạn chưa cho phép dùng camera. Hãy bật quyền Camera cho trang này trong cài đặt trình duyệt rồi thử lại."
          : e && e.name === "NotFoundError" ? "Không tìm thấy camera trên thiết bị này." : "Không mở được camera: " + (e && e.message || e);
    msg("m3", m + " Hoặc dùng “Chọn ảnh QR”.", true); return;
  }
  var v = $("vid"); v.srcObject = stream; await v.play().catch(function () {}); $("camwrap").classList.add("on");
  var my = ++loopId, cv = document.createElement("canvas"), cx = cv.getContext("2d", { willReadFrequently: true });
  if (!detector && "BarcodeDetector" in window) { try { detector = new BarcodeDetector({ formats: ["qr_code"] }); } catch (e) { detector = null; } }
  (async function tick() {
    if (my !== loopId) return;
    if (v.videoWidth) {
      try {
        var txt = null;
        if (detector) { var r = await detector.detect(v); if (r.length) txt = r[0].rawValue; }
        else {
          cv.width = v.videoWidth; cv.height = v.videoHeight; cx.drawImage(v, 0, 0);
          var im = cx.getImageData(0, 0, cv.width, cv.height), q = jsQR(im.data, im.width, im.height); if (q) txt = q.data;
        }
        if (txt && handleText(txt)) { stopCam(); return; }
      } catch (e) {}
    }
    setTimeout(tick, 200);
  })();
}

/* ---------- Tab ---------- */
function show(t) {
  ["create", "mine", "scan", "acct"].forEach(function (x) { $("t-" + x).classList.toggle("hide", x !== t); });
  Array.prototype.forEach.call($("tabs").children, function (b) { b.classList.toggle("on", b.dataset.t === t); });
  if (t !== "scan") stopCam();
  window.scrollTo(0, 0);
}

/* ---------- Gắn sự kiện ---------- */
function bind() {
  $("tabs").onclick = function (e) { var b = e.target.closest("button"); if (b && b.dataset.t) show(b.dataset.t); };
  F.forEach(function (k) { $("f_" + k).addEventListener("input", preview); });
  $("bGen").onclick = gen; $("bSave").onclick = saveCard; $("bNew").onclick = resetForm;
  $("bPng").onclick = async function () {
    var b = await qrBlob(), name = "QR-" + slug(cur.name) + ".png";
    var url = URL.createObjectURL(b), a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    msg("m2", "Đã tải ảnh QR (PNG). Nếu thiết bị không tự lưu, hãy nhấn “Chia sẻ QR”.");
  };
  $("bShare").onclick = async function () {
    var b = await qrBlob(), f = new File([b], "QR-" + slug(cur.name) + ".png", { type: "image/png" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: "Danh thiếp " + cur.name }); return; }
      if (navigator.share) { await navigator.share({ title: "Danh thiếp " + cur.name, url: publicUrl(cur) }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    msg("m2", "Thiết bị chưa hỗ trợ chia sẻ trực tiếp. Hãy dùng “Tải QR (PNG)” hoặc “Chia sẻ đường dẫn”.", true);
  };
  $("bLink").onclick = async function () {
    var u = publicUrl(cur);
    try { if (navigator.share) { await navigator.share({ title: "Danh thiếp " + cur.name, url: u }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(u); msg("m2", "Đã sao chép đường dẫn công khai. Ai mở được đường dẫn này sẽ thấy danh thiếp và lưu được vào danh bạ."); }
    catch (e) { msg("m2", "Đường dẫn: " + u); }
  };
  $("bCam").onclick = startCam; $("bStop").onclick = stopCam;
  $("bFlip").onclick = function () { facing = facing === "environment" ? "user" : "environment"; if (stream) startCam(); };
  $("fImg").onchange = function (e) {
    var f = e.target.files[0]; if (!f) return;
    var img = new Image(); img.onload = function () {
      var c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      var x = c.getContext("2d"); x.drawImage(img, 0, 0);
      var d = x.getImageData(0, 0, c.width, c.height), r = jsQR(d.data, d.width, d.height);
      if (r && r.data) handleText(r.data); else msg("m3", "Không tìm thấy mã QR trong ảnh.", true);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f); e.target.value = "";
  };
  $("bToForm").onclick = function () { write(scanned); editId = null; $("formTitle").textContent = "Thông tin"; preview(); show("create"); };
  $("bOk").onclick = function () { if (scanned) saveContact(scanned, "m4"); };
}

/* ---------- Khởi động ---------- */
async function init() {
  bind(); preview(); cardHtml($("sv"), {});

  var c = new URLSearchParams(location.search).get("c"), pubO = c && dec(c);
  if (pubO) {
    cardHtml($("pubCard"), pubO);
    $("pubSave").onclick = function () { saveContact(pubO, "mPub"); };
    $("pubOwn").onclick = function () { history.replaceState(null, "", "/"); boot(); };
    screen("pub"); register(); return;
  }
  boot(); register();
}
function register() {
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("/sw.js").catch(function () {});
}
async function boot() {
  var cfg = window.APP_CONFIG || {};
  if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
    bindAuth();
    recovering = /type=recovery/.test(location.hash);
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" } });
    sb.auth.onAuthStateChange(function (ev, sess) {
      setTimeout(async function () {
        user = sess ? sess.user : null;
        if (ev === "PASSWORD_RECOVERY") { recovering = true; authView("recover"); screen("auth"); return; }
        if (recovering) { authView("recover"); screen("auth"); return; }
        if (user) { await refresh(); screen("app"); }
        else { cards = []; renderList(); renderAcct(); resetForm(); authView("login"); screen("auth"); }
      }, 0);
    });
    var s = await sb.auth.getSession(); user = s.data && s.data.session ? s.data.session.user : null;
    if (recovering) { authView("recover"); screen("auth"); }
    else if (user) { await refresh(); screen("app"); }
    else { authView("login"); screen("auth"); }
  } else {
    await refresh(); screen("app");
  }
}
init();
})();
