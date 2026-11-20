# Ma sói online (bản B: mỗi người một máy)

Một trang web tĩnh (`index.html`), dữ liệu phòng chơi lưu trên **Firebase Realtime Database** nên không cần tự chạy server.

## Chạy thử ngay (không cần Firebase)

Chạy `python3 -m http.server 8000` trong thư mục này rồi vào `http://localhost:8000`. (Không mở trực tiếp bằng `file://` được, vì trang dùng module `rules.js`.)
Khi `config.js` để `null`, game chạy **chế độ thử**: chỉ chơi được giữa các tab cùng một trình duyệt. Dùng để xem luật và giao diện.

## Chơi online với bạn bè

Cần 2 thứ: **Firebase** (lưu phòng chơi) và **bot quản trò** (chạy luật, xem `../masoi-bot/README.md`). Không có bot thì ván không tự chuyển bước.

1. Vào <https://console.firebase.google.com>, bấm **Add project** (đặt tên bất kỳ, tắt Google Analytics cho gọn).
2. Menu **Build → Realtime Database → Create Database**, chọn khu vực gần (ví dụ `asia-southeast1`), chọn **Start in test mode**.
3. Tab **Rules**: dán nội dung file `database.rules.json` rồi **Publish**.
4. **Project settings (biểu tượng bánh răng) → General → Your apps → Web (`</>`)**: đăng ký ứng dụng, copy đoạn `firebaseConfig`.
5. Mở `config.js`, bỏ dấu `//` và dán cấu hình vào (phải có dòng `databaseURL`).
6. Đưa thư mục lên hosting tĩnh để mọi người vào cùng một link: GitHub Pages, Netlify (kéo thả thư mục) hoặc Cloudflare Pages.

## Tab Cờ caro ⭕

Ngoài Ma sói, trang có tab **Cờ caro** (nút ở thanh bên trái và ở trang đầu). Hai người đánh luân phiên **X** và **O** trên bàn 15×15, ai xếp đủ **5 ô liền nhau** (ngang, dọc, chéo) trước thì thắng, bàn đầy thì hòa.
- Vào bằng **số phòng** như Ma sói: phòng chưa có thì tạo, **người thứ hai vào là ván bắt đầu** và hệ thống chọn ngẫu nhiên ai là X (X đi trước). Link mời có dạng `…/?game=caro&room=1234`.
- Ô vừa đánh có viền vàng, dãy thắng tô xanh. Có nút **Chơi lại** (đổi quân X/O), **Xin thua**, **Mời bạn bè**.
- Có khung **💬 Chat** cho **mọi người trong phòng, kể cả khán giả** (nhắn được cả lúc đang chờ đối thủ). Tin của khán giả có nhãn "khán giả". Người thứ ba trở đi vào **khán đài**: xem bàn cờ và chat nhưng không đánh được. (Riêng Ma sói, khán giả vẫn không chat được để không lộ thông tin.)
- Không cho trùng tên, có nhịp tim online như Ma sói; lỡ thoát thì nhập đúng tên cũ để vào lại.
- Dữ liệu ở `caro/<số phòng>` trong Firebase (luật trong `database.rules.json` đã có mục `caro`). Bot quản trò dọn phòng caro quá 12 giờ. Cờ caro không cần bot để chơi: mỗi nước đi do máy người đánh ghi lên và tự kiểm tra thắng.

## Tài khoản, thành tích và bảng xếp hạng cờ caro 🏆

Muốn chơi cờ caro phải **đăng ký / đăng nhập bằng tên và mật khẩu** (Ma sói thì không cần).
- **Tên không được trùng**, không phân biệt hoa thường và khoảng trắng thừa ("Lan Anh", "lan  anh" là cùng một tên). Tên gồm 2 đến 16 ký tự: chữ (có dấu), số, gạch dưới hoặc khoảng trắng. Mật khẩu từ 4 ký tự.
- Mật khẩu không lưu nguyên văn: trình duyệt băm bằng **PBKDF2-SHA256** (150.000 vòng, muối ngẫu nhiên) rồi mới lưu ở `users/<tên>`. Đăng nhập xong máy nhớ phiên, lần sau vào lại tự đăng nhập; nút **Đăng xuất** để đổi tài khoản.
- Trong phòng, người chơi được nhận diện bằng tài khoản nên **không ai chiếm chỗ của ai**; lỡ thoát thì vào lại cùng số phòng bằng chính tài khoản đó.
- Hết mỗi ván (thắng, thua, hòa, xin thua) thành tích của cả hai người được ghi vào `scores/<tên>`: **thắng 3 điểm, hòa 1, thua 0**. **🏆 Bảng xếp hạng** xếp theo điểm, rồi số trận thắng, rồi ít trận hơn. Xem 10 người đầu ở trang đầu cờ caro và nút Xếp hạng (thanh bên) để xem 50 người đầu, ngay cả khi đang trong phòng.
- **Giới hạn bảo mật cần biết** (trang web tĩnh, không có máy chủ riêng): luật database đang mở nên ai biết mở công cụ nhà phát triển có thể **sửa điểm của mình hoặc người khác**, và có thể đọc `users` để thử đoán mật khẩu ngoại tuyến (mật khẩu càng yếu càng dễ). Dùng cho nhóm bạn bè thì ổn; **đừng dùng mật khẩu quan trọng của bạn** ở đây. Muốn chặt hơn thì đổi sang **Firebase Authentication** kèm luật database theo từng người dùng (cần làm thêm).
- Không có chức năng đổi mật khẩu hay xóa tài khoản (muốn xóa thì xóa nút `users/<tên>` và `scores/<tên>` trong Firebase Console).
- Phải mở trang qua `https://` hoặc `localhost` thì trình duyệt mới cho băm mật khẩu (GitHub Pages và Netlify đều là `https`).

## Tab 🍜 Ủng hộ 1 bát ramen

**Hiện đang ẨN** (`window.SHOW_DONATE = false` trong `config.js`): tab không hiện ở thanh bên và trang đầu, link `?game=donate` cũng quay về trang Ma sói. Muốn hiện lại, đổi thành `window.SHOW_DONATE = true;`. Khung lời nhắn cho tác giả nằm trong tab này nên cũng bị ẩn theo. Mọi thiết lập bên dưới vẫn giữ nguyên.

Thanh bên trái và các chip ở trang đầu có tab **Ủng hộ 1 bát ramen**. Tab này chỉ **hiển thị cách ủng hộ**, trang không xử lý tiền (mọi giao dịch diễn ra ở ngân hàng hoặc dịch vụ bạn chọn). Link trực tiếp: `…/?game=donate`.

Thông tin nhận ủng hộ **do bạn tự điền** trong `config.js`, mục `window.DONATE`:
```js
window.DONATE = {
  message: 'Cảm ơn bạn đã chơi!',        // lời nhắn, để trống dùng câu mặc định
  qrImage: 'donate-qr.png',              // ảnh QR đặt cạnh index.html, hoặc một link https
  accounts: [ { label: 'Vietcombank', value: '0123456789', note: 'Chủ tài khoản: NGUYEN VAN A' } ],
  links:    [ { label: 'PayPal', url: 'https://paypal.me/tenban' } ]
};
```
- Ảnh **coder nghèo khổ ngồi chờ ramen** (`coder-cho.png`, nền trong suốt) hiện ở bên phải biểu ngữ; cấu hình bằng `coderImage` (và chú thích `coderCaption`) trong `config.js`. Để `coderImage: ''` thì biểu ngữ dùng hình bát ramen. Ảnh này tạo bằng Google Flow (Nano Banana 2.1) rồi xóa nền bằng công cụ xóa nền có sẵn của macOS.
- Dưới lời nhắn có dòng "🥢 Không nhất thiết phải cả 1 bát đâu, 1 đũa ramen cũng được!" (đổi bằng `subMessage` trong `config.js`).
- **Mã QR chỉ hiện sau khi người xem tick** vào ô "Tôi hoàn toàn tự nguyện trao tặng vài yên cho người code game khổ sở kia" (đổi câu này bằng `consentText` trong `config.js`). Chưa tick thì ảnh QR không được đưa vào trang; rời tab thì ô tick tự bỏ. Tiêu đề thẻ QR đổi bằng `qrLabel` (ví dụ `'Quét mã PayPay'`). Ô tick chỉ che mã QR; số tài khoản và link ở các thẻ khác vẫn hiện sẵn. Đây chỉ là cho vui và nhắc tự nguyện, không phải bảo vệ: ai mở file ảnh `donate-qr.png` trực tiếp trên mạng vẫn thấy.
- Mỗi tài khoản có nút **📋 Sao chép** số tài khoản. Chỉ link bắt đầu bằng `https://` mới hiện (link khác bị bỏ để tránh link độc).
- Để trống tất cả thì tab hiện "Tác giả chưa thêm cách ủng hộ".
- **Lưu ý riêng tư**: nếu bạn đăng repo công khai lên GitHub thì số tài khoản và ảnh QR trong repo ai cũng thấy. Chỉ điền thông tin của chính bạn, và nếu ngại thì dùng liên kết của dịch vụ (PayPal, Ko-fi...) thay vì số tài khoản ngân hàng.

## 💌 Lời nhắn cho tác giả

Cuối tab Ủng hộ có khung **Để lại lời nhắn cho tác giả**: **tên người gửi** (không bắt buộc, tối đa 30 ký tự) và **lời nhắn** (bắt buộc, tối đa 500 ký tự). Mỗi người gửi cách nhau ít nhất 30 giây.
- Lời nhắn lưu ở `messages/<mã>` trong Firebase, mỗi tin gồm `text` (lời nhắn), `t` (giờ gửi, mili giây), và `name` (tên người gửi) nếu có.
- **Chỉ tác giả đọc được.** Luật database cho phép ai cũng **gửi** (tạo mới) nhưng **không cho đọc, sửa hay xóa** tin của người khác (`.read: false`, chỉ ghi khi chưa có dữ liệu, giới hạn độ dài và chỉ cho đúng các trường trên).
- **Cách đọc lại sau này**: vào Firebase Console, mục Realtime Database, tab **Data**, mở nhánh `messages` (xếp theo thời gian gửi). Muốn lưu ra file thì dùng menu ba chấm, chọn **Export JSON** (có thể xuất riêng nhánh `messages`). Đọc bằng Console là đọc với quyền chủ dự án nên không bị luật chặn.
- Ở chế độ thử (chưa có Firebase) lời nhắn chỉ nằm trong trình duyệt của người gửi và trang có ghi chú nói rõ.
- Chưa thử luật `messages` trên Firebase thật (mình chỉ kiểm tra cú pháp JSON). Sau khi dán luật, bạn thử gửi một lời nhắn rồi kiểm tra ở Console.

## Dữ liệu và sao lưu

Tài khoản và điểm nằm riêng trong Firebase, tách khỏi mã giao diện, nên đổi giao diện không làm mất. Cấu trúc dữ liệu và các quy tắc khi sửa giao diện ở `DU_LIEU.md`. Có công cụ sao lưu và khôi phục ra file JSON trong `masoi-bot` (`backup.mjs`, `restore.mjs`).

## Im lặng tuyệt đối

Trang web **không phát bất kỳ âm thanh nào**: không nhạc, không tiếng báo, không đọc to, không rung, không thông báo của trình duyệt, không hộp thoại bật lên. Mọi phản hồi (đã sao chép lời mời, lỗi nhập…) đều hiện ngay trên trang bằng chữ. Trong code không có `Audio`, `Notification`, `vibrate`, `speechSynthesis`, `alert` hay `prompt`. Nếu thêm âm thanh sau này, hãy giữ tắt mặc định.

## Giao diện

Giao diện làm theo trang mazii.net (xem trực tiếp để lấy màu, cỡ và bố cục):
- **Thanh bên** xanh chuyển sắc `#1371E2` đến `#0A3E7C`, rộng 68px, nút ☰ ở trên để mở rộng có nhãn, biểu tượng nét mảnh 24px, đường kẻ ngăn nhóm.
- **Đầu trang** trắng cao 56px: logo chữ, lời chào đậm, nút xanh/xanh nhạt bo 12px, ảnh đại diện tròn có viền.
- **Nền** `#F0F2F5`, **thẻ** trắng bo 16px đổ bóng nhẹ, tiêu đề có vạch xanh 3px bên trái, liên kết "Xem thêm" ở góc phải.
- **Trang đầu** theo bố cục trang chủ Mazii: thẻ nhập liệu giống ô tìm từ (ô số phòng, ô tên dạng xám, nút Vào phòng), hàng chip lựa chọn, hai thẻ thông tin, biểu ngữ xanh lớn có nút đỏ, cột phải gọn.
- Ván chơi chia hai cột (nội dung chính và khung chat). Trên điện thoại thanh bên ẩn và mọi thứ xếp một cột.
- Font Inter (tải từ Google Fonts, không có thì dùng font hệ thống). Biểu tượng là hình vẽ lại, không dùng ảnh hay logo của Mazii.
- Màu và cỡ chỉnh ở các biến đầu phần `<style>` trong `index.html` (`--pri`, `--bg`, …).

## Cách chơi

Giao diện được làm cho người mới: trên cùng luôn có **một câu nói rõ bạn cần làm gì lúc này** (ví dụ "Chọn một người để cắn", "Chờ mọi người…"), nút to dễ bấm, thẻ vai nhấp nháy ở lần đầu để bạn biết chạm vào xem. Nút **📨 Mời bạn bè** ở phòng chờ mở bảng chia sẻ của điện thoại (hoặc sao chép lời mời) kèm link dạng `…/?room=1234`; ai bấm link thì số phòng được điền sẵn.

Trong game có nút **📖 Cách chơi** ở góc trên (màn hình đầu, phòng chờ và lúc đang chơi) giới thiệu trò chơi và luật cho người chưa biết Ma sói.

- Chỉ có một ô **Số phòng** (2–8 chữ hoặc số). Phòng đã có thì bạn vào chơi, chưa có thì phòng mới được tạo với số đó (người tạo là chủ phòng). Rủ bạn bè nhập đúng số phòng. Cần 4–12 người.
- Mỗi người vào phòng, nhập tên rồi bấm **Sẵn sàng**. Khi đủ người và **tất cả đã sẵn sàng** thì ván tự bắt đầu, không cần chủ phòng. Bấm **Bỏ sẵn sàng** nếu muốn chờ thêm. Chủ phòng vẫn có nút **Bắt đầu ngay** nếu chưa muốn chờ ai chưa bấm.
- Chia vai: 4–5 người có 1 Sói, 6–8 người có 2 Sói và thêm Bảo vệ, 9–12 người có 3 Sói. Luôn có 1 Tiên tri, còn lại là Dân.
- **Chờ lâu thì tự thêm người máy**: nếu phòng còn thiếu người (dưới 4), mọi người thật đã bấm **Sẵn sàng** và suốt **60 giây** không ai vào thêm hay đổi trạng thái, bot tự thêm người máy cho đủ 4 rồi bắt đầu ván. Màn hình phòng chờ có đồng hồ đếm ngược. Có người mới vào hoặc ai đó bấm Bỏ sẵn sàng thì tính lại. Sửa số giây ở `LOBBY_WAIT` trong `rules.js`.
- **Người máy**: ở phòng chờ, chủ phòng bấm **🤖 Thêm người máy** (bấm **Xóa** cạnh tên để bỏ). Người máy luôn sẵn sàng, tự chơi đúng vai (Sói cùng chọn một mục tiêu và không cắn đồng bọn, Tiên tri soi người chưa soi và bỏ phiếu cho Sói đã soi ra, Bảo vệ chọn người, Dân bỏ phiếu theo số đông hoặc ngẫu nhiên), hành động sau độ trễ ngẫu nhiên vài giây cho giống người. Người máy chưa biết chat. Có thể chơi 1 người thật với 3 người máy.
- Mỗi bước có đồng hồ đếm ngược (đêm 45 giây, ngày 120 giây, bỏ phiếu 60 giây). Mọi người xong sớm thì chuyển ngay, hết giờ thì bot tự chuyển và ai chưa chọn tính là bỏ qua.
- **Đêm**: Sói chọn người cắn, Tiên tri soi một người, Bảo vệ che chở một người (cứu được nếu trùng mục tiêu Sói).
- **Ngày**: công bố ai chết, thảo luận (nói chuyện trực tiếp hoặc qua nhóm chat), mọi người bấm **Sẵn sàng bỏ phiếu** (hoặc hết giờ).
- **Chat trong game**: ở phòng chờ ai cũng chat được để rủ nhau bắt đầu (tin ở phòng chờ được xóa khi vào ván). Trong ván có 3 kênh:
  - **Chung**: người còn sống nói chuyện ban ngày và lúc bỏ phiếu. Ban đêm bị khóa. Hết ván thì ai cũng chat được.
  - **Sói**: chỉ Sói thấy và chỉ viết được ban đêm, để bàn nhau chọn người cắn.
  - **Người chết**: chỉ người đã chết thấy và viết. Người sống không thấy kênh này. Người chết đọc được kênh Chung nhưng không viết vào đó.
- Người nhiều phiếu nhất bị treo cổ và lộ vai. Hòa phiếu thì không ai chết.
- **Khán đài 👀** (chế độ ngồi xem): vào phòng đã đủ 12 người, hoặc phòng đang chơi (với tên chưa từng chơi trong ván đó) thì bạn thành **khán giả**. Khán giả thấy hết: vai của mọi người, hành động ban đêm, phiếu bầu và cả ba kênh chat (Chung, Sói, Người chết), nhưng **không chat được** và không ảnh hưởng ván. **Chủ phòng bật hoặc tắt Khán đài** bằng nút "👀 Khán đài: Bật/Tắt" (ở phòng chờ và trong ván). Tắt thì khán giả đang xem bị mời ra và người mới vào phòng đầy hoặc đang chơi bị từ chối. Mặc định là Bật. Người chơi thấy chip "👀 n khán giả". Khán giả không tự thành người chơi giữa ván; hết ván và về phòng chờ thì vào lại bằng số phòng.
- **Trùng tên**: ở phòng chờ không cho hai người cùng tên (không phân biệt hoa thường, bỏ khoảng trắng đầu cuối). Đang chơi, nhập tên của một người chơi đang online thì bị từ chối, để người khác không chiếm vai của họ (muốn xem thì dùng tên khác để vào Khán đài). Mỗi máy báo "còn online" 10 giây một lần; quá 30 giây không có tín hiệu thì coi là đã ngắt kết nối. Lỡ thoát giữa ván: mở lại link (máy cũ tự vào lại ngay), hoặc nhập **đúng tên cũ** và số phòng: bấm Thoát thì vào lại được liền, mất mạng đột ngột thì chờ khoảng 30 giây. Không có mật khẩu: ai biết tên của người đã ngắt kết nối quá 30 giây thì vào thay được.
- Dân thắng khi hết Sói. Sói thắng khi số Sói bằng hoặc nhiều hơn số người còn lại.

## Giới hạn cần biết

- **Ai chạy luật?** Bot quản trò (`masoi-bot`) nếu đang chạy. **Không có bot thì máy của chủ phòng tự chạy luật thay** (trang tự nhận ra khi nhịp tim của bot cũ hơn 20 giây và hiện thông báo). Bot chạy lại thì chủ phòng thôi. Khi chủ phòng chạy luật, ai thoát hoặc mất mạng cũng không làm ván dừng, trừ chính chủ phòng: chủ phòng thoát thì ván đứng. Chủ phòng vẫn chơi bình thường, nhưng máy họ có dữ liệu luật nên về kỹ thuật xem được vai người khác bằng công cụ nhà phát triển.
- Vai được ẩn trên giao diện, nhưng dữ liệu nằm trong database. Ai biết mở công cụ nhà phát triển có thể xem. Tin nhắn kênh Sói và kênh Người chết cũng bị ẩn kiểu đó. Chơi với bạn bè thì ổn, không dùng cho thi đấu.
- Quy tắc test mode của Firebase cho phép mọi người đọc/ghi phòng có mã. Đừng đưa dữ liệu quan trọng vào đó.
