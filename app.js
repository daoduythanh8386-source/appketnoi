/* APP KẾT NỐI – Đào Duy Thanh – Since 2026 */
(function () {
"use strict";
var $ = function (id) { return document.getElementById(id); };
var F = ["name", "phone", "email", "addr", "company", "dept"];
var cur = {}, editId = null, qrText = "", scanned = null;
var cards = [], stream = null, loopId = 0, facing = "environment", detector = null;
var sb = null, user = null;

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
  p("nm", o.name || "—"); p("co", [o.company, o.dept].filter(Boolean).join(" · ") || "—");
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
function preview() {
  cur = read(); cardHtml($("pv"), cur);
}
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
  } else cards = loadLocal();
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
    msg("m1", "Đã lưu trên thiết bị này. Đăng nhập để lưu theo tài khoản.");
  }
  editId = id; $("formTitle").textContent = "Đang sửa danh thiếp";
}
function renderList() {
  var L = $("list"); L.innerHTML = "";
  $("mineNote").textContent = (sb && user) ? "Lưu theo tài khoản " + user.email + ", dùng được trên mọi thiết bị." : "Chưa đăng nhập: danh thiếp chỉ lưu trên thiết bị này.";
  if (!cards.length) { var e = document.createElement("p"); e.className = "muted"; e.textContent = "Chưa có danh thiếp nào."; L.appendChild(e); return; }
  cards.forEach(function (c) {
    var d = document.createElement("div"); d.className = "item";
    var t = document.createElement("div"), b = document.createElement("b"), s = document.createElement("div");
    b.textContent = c.name; s.className = "muted"; s.textContent = [c.company, c.phone].filter(Boolean).join(" · "); t.appendChild(b); t.appendChild(s);
    var r = document.createElement("div"); r.className = "row"; r.style.marginTop = "0";
    [["Sửa / Tạo lại QR", "btn sec sm", function () { edit(c); }], ["Xóa", "btn dng sm", function () { del(c); }]].forEach(function (x) {
      var bt = document.createElement("button"); bt.className = x[1]; bt.textContent = x[0]; bt.onclick = x[2]; r.appendChild(bt);
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

/* ---------- Tài khoản ---------- */
function renderAcct() {
  $("acct").textContent = (sb && user) ? "Đã đăng nhập: " + user.email : "Danh thiếp QR · quét là lưu vào danh bạ";
  $("bAcct").textContent = (sb && user) ? "Đăng xuất / Tài khoản" : "Tài khoản";
}
function openAcct() {
  var B = $("dBody"); B.innerHTML = "";
  function el(tag, props, txt) { var x = document.createElement(tag); Object.assign(x, props || {}); if (txt) x.textContent = txt; return x; }
  if (!sb) {
    B.appendChild(el("p", { className: "muted" }, "Tài khoản đám mây chưa được bật. Danh thiếp đang lưu trên thiết bị này. Chủ app bật tài khoản theo hướng dẫn trong README (Supabase)."));
  } else if (user) {
    B.appendChild(el("p", {}, "Đang đăng nhập: " + user.email));
    var o = el("button", { type: "button", className: "btn dng" }, "Đăng xuất");
    o.onclick = async function () { await sb.auth.signOut(); user = null; await refresh(); $("dlg").close(); };
    B.appendChild(o);
  } else {
    var em = el("input", { type: "email", placeholder: "Email", autocomplete: "email" });
    var pw = el("input", { type: "password", placeholder: "Mật khẩu (từ 6 ký tự)", autocomplete: "current-password" });
    var out = el("div", {}); var row = el("div", { className: "row" });
    function go(kind) {
      return async function () {
        var r = kind === "in" ? await sb.auth.signInWithPassword({ email: em.value.trim(), password: pw.value })
                              : await sb.auth.signUp({ email: em.value.trim(), password: pw.value });
        out.innerHTML = "";
        if (r.error) { var m = el("div", { className: "msg er" }, r.error.message); out.appendChild(m); return; }
        if (kind === "up" && !r.data.session) { out.appendChild(el("div", { className: "msg" }, "Đã gửi email xác nhận. Hãy bấm liên kết trong email rồi đăng nhập.")); return; }
        user = r.data.user || (r.data.session && r.data.session.user); await refresh(); $("dlg").close();
      };
    }
    var a = el("button", { type: "button", className: "btn" }, "Đăng nhập"), b = el("button", { type: "button", className: "btn sec" }, "Đăng ký");
    a.onclick = go("in"); b.onclick = go("up");
    [em, pw].forEach(function (i) { i.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); go("in")(); } }); });
    row.appendChild(a); row.appendChild(b);
    B.appendChild(el("label", {}, "Email")); B.appendChild(em); B.appendChild(el("label", {}, "Mật khẩu")); B.appendChild(pw); B.appendChild(row); B.appendChild(out);
  }
  $("dlg").showModal();
}

/* ---------- Camera + quét ---------- */
function showScan(o) {
  scanned = o; cardHtml($("sv"), o); $("bOk").disabled = $("bToForm").disabled = false;
}
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
  ["create", "mine", "scan"].forEach(function (x) { $("t-" + x).classList.toggle("hide", x !== t); });
  Array.prototype.forEach.call($("tabs").children, function (b) { b.classList.toggle("on", b.dataset.t === t); });
  if (t !== "scan") stopCam();
}

/* ---------- Gắn sự kiện ---------- */
function bind() {
  $("tabs").onclick = function (e) { var t = e.target.dataset && e.target.dataset.t; if (t) show(t); };
  F.forEach(function (k) { $("f_" + k).addEventListener("input", preview); });
  $("bGen").onclick = gen; $("bSave").onclick = saveCard; $("bAcct").onclick = openAcct;
  $("bNew").onclick = function () {
    editId = null; write({}); $("formTitle").textContent = "Thông tin"; $("qr").width = $("qr").height = 10; qrText = "";
    ["bPng", "bShare", "bLink"].forEach(function (b) { $(b).disabled = true; });
    $("qrHint").textContent = "Nhấn “Tạo QR” để tạo mã."; preview(); msg("m1", ""); msg("m2", "");
  };
  $("bPng").onclick = async function () {
    var b = await qrBlob(), name = "QR-" + slug(cur.name) + ".png", f = new File([b], name, { type: "image/png" });
    var url = URL.createObjectURL(b), a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    msg("m2", "Đã tải ảnh QR (PNG). Nếu thiết bị không tự lưu, hãy nhấn “Chia sẻ QR”."); void f;
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
  bind(); preview();

  var c = new URLSearchParams(location.search).get("c"), pubO = c && dec(c);
  if (pubO) {
    $("app").classList.add("hide"); $("pub").classList.remove("hide"); cardHtml($("pubCard"), pubO);
    $("pubSave").onclick = function () { saveContact(pubO, "mPub"); };
    $("pubOwn").onclick = function () { history.replaceState(null, "", "/"); $("pub").classList.add("hide"); $("app").classList.remove("hide"); };
  }

  var cfg = window.APP_CONFIG || {};
  if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    var s = await sb.auth.getSession(); user = s.data && s.data.session ? s.data.session.user : null;
    sb.auth.onAuthStateChange(function (_e, sess) { user = sess ? sess.user : null; refresh(); });
  }
  await refresh();
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("/sw.js").catch(function () {});
}
init();
})();
