// Để null thì game chạy "chế độ thử" (chỉ chơi giữa các tab cùng một trình duyệt).
// Muốn chơi online: tạo dự án Firebase, bật Realtime Database, dán cấu hình vào đây (xem README.md).
//
// window.FIREBASE_CONFIG = {
//   apiKey: "...",
//   authDomain: "ten-du-an.firebaseapp.com",
//   databaseURL: "https://ten-du-an-default-rtdb.asia-southeast1.firebasedatabase.app",
//   projectId: "ten-du-an",
//   appId: "..."
// };
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDe_ex5yppH0NdI2-V4sHXJsjPFoHVcxls",
  authDomain: "mazoo-2e275.firebaseapp.com",
  databaseURL: "https://mazoo-2e275-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mazoo-2e275",
  appId: "1:719000258250:web:a5eaf3e197b7bbf24b9633"
};

// ---- Tab "Ủng hộ 1 bát ramen" ----
// Bật/tắt tab: false = ẩn hẳn khỏi thanh bên và trang đầu (link ?game=donate cũng không mở được). Đổi thành true để hiện lại.
window.SHOW_DONATE = false;
// Tab "Ngủ đêm": false = ẩn hẳn (đổi thành true để hiện lại).
window.SHOW_NGU = false;
window.SHOW_MENU = false;   // true thì hiện tab Thực đơn
// Điền thông tin NHẬN ỦNG HỘ CỦA CHÍNH BẠN. Để trống thì tab hiện "Tác giả chưa thêm cách ủng hộ".
// Lưu ý: file này công khai nếu bạn đăng repo công khai lên GitHub, số tài khoản sẽ ai cũng thấy.
window.DONATE = {
  message: '',                 // lời nhắn (để trống dùng câu mặc định)
  coderImage: 'coder-cho.png',              // ảnh coder ngồi chờ, ví dụ 'coder-cho.jpg' (đặt cạnh index.html) hoặc link https
  coderCaption: '',            // chú thích dưới ảnh (để trống dùng câu mặc định)
  subMessage: '',              // dòng nhắn thêm dưới lời nhắn (để trống: "Không nhất thiết phải cả 1 bát đâu, 1 đũa ramen cũng được!")
  consentText: '',             // câu tick trước khi hiện mã QR (để trống dùng câu mặc định)
  qrLabel: '',                 // tiêu đề thẻ QR, ví dụ 'Quét mã PayPay' (để trống: 'Quét mã QR')
  qrImage: '',                 // ví dụ 'donate-qr.png' (đặt file ảnh cạnh index.html) hoặc link https
  accounts: [
    // { label: 'Vietcombank', value: '0123456789', note: 'Chủ tài khoản: NGUYEN VAN A' },
  ],
  links: [
    // { label: 'PayPal', url: 'https://paypal.me/tenban' },
  ]
};
