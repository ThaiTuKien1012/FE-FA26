# Kiểm tra và bổ sung ảnh catalogue — 28/11/2026

Dữ liệu đã được cập nhật trên **môi trường local đang chạy**: Docker MySQL, Backend `localhost:8080`, Frontend `localhost:3000`. Các thay đổi dữ liệu đi qua API F01/F02 thật. Không sửa source Backend, không dùng mock API và không push Git.

| Phạm vi | Kết quả đọc lại sau cập nhật |
| --- | --- |
| Sản phẩm không bị xóa, cả 3 Store | 69/69 có `imageUrl` và mô tả |
| Sản phẩm ACTIVE được public F09 | 66/66 ảnh giải mã thành công trong Chrome |
| Sản phẩm INACTIVE | 3/3 có ảnh; vẫn không xuất hiện ở catalogue public |
| Icon Store | 3/3 upload PNG, public GET 200 |
| Banner Store | 3/3 upload JPEG, public GET 200 |
| Tên, SKU, giá bán/giá vốn, category, đơn vị, expiry flag, trạng thái, tồn kho | Đối chiếu trước/sau: giữ nguyên cho cả 69 sản phẩm |

Store A có 60 sản phẩm public, Store B có 1, Store QA có 5. Hai sản phẩm ngừng bán thông thường vẫn có ảnh đúng loại hàng. Mặt hàng kiểm thử `Mặt hàng ngừng bán QA` dùng biểu tượng hộp hàng ghi rõ “NGỪNG BÁN”, vì dữ liệu không xác định loại hàng thực tế.

## Nội dung ảnh và nguồn

Ảnh được gán theo tên và loại hàng: bơ lạt Anchor, sữa hạt óc chó, sữa yến mạch, sữa chua nha đam, mì ly bò, mì tôm chua cay, dầu hào, bột giặt cửa trước, bàn chải, dầu gội và các nhóm còn lại. Có 53 nhóm ảnh cho 69 bản ghi; các bản ghi cùng loại hàng có thể dùng chung ảnh. Ảnh cho SKU demo tên chung mang tính minh họa đúng loại hàng; bao bì, nhãn hiệu hoặc quy cách trên ảnh có thể khác dữ liệu demo.

Đã tải 41 ảnh sản phẩm và 1 banner về `public/images/catalogue-2026/`, đồng thời tái sử dụng các asset phù hợp đã có. Ảnh không phụ thuộc đường dẫn hotlink của nhà cung cấp khi chạy app. Ba icon Store được thiết kế bằng SVG, xuất PNG 256×256 để phù hợp hợp đồng upload F01.

Danh sách ánh xạ, tên sản phẩm, đường dẫn asset và trang nguồn được lưu tại [catalogue-media-2026-11-28.json](../../scripts/data/catalogue-media-2026-11-28.json). Các ảnh sản phẩm lấy từ trang bán lẻ là tư liệu minh họa catalogue demo, không có tuyên bố cấp quyền thương mại chung.

- Ảnh [Anchor New Zealand unsalted butter](https://commons.wikimedia.org/wiki/File:Anchor_New_Zealand_unsalted_butter.jpg): CC0, theo metadata nguồn.
- Banner [Green tea 11](https://commons.wikimedia.org/wiki/File:Green_tea_11.jpg), tác giả **BogTar201213**, giấy phép [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0). Asset tải về không chỉnh sửa nội dung; giao diện có thể cắt khung bằng CSS.
- Nguồn của các ảnh tái sử dụng trong project không được xác minh lại trong đợt này.

## Kiểm chứng

- `node scripts/audit-catalogue-media.mjs --live`: PASS. Chrome giải mã 59/59 asset (53 nhóm sản phẩm + 6 ảnh Store), kiểm tra đầy đủ 66 sản phẩm public qua API thật. Không chặn request hoặc thay response.
- Trang `/customer-home`: 32 ảnh được tải, 0 ảnh lỗi.
- Trang `/storefront?store=f02-demo-store-a-1`: 22 ảnh được tải, 0 ảnh lỗi.
- Trang `/product/64?store=qa-f07-f11-mwztnod1`: ảnh sữa yến mạch đúng loại, 0 ảnh lỗi. Đã xem screenshot của cả ba trang và bảng đối chiếu ảnh/tên.
- Public GET của cả 6 ảnh Store: HTTP 200, đúng MIME PNG/JPEG.
- `node --check scripts/audit-catalogue-media.mjs`, `npm run lint`, `npm run build`, `git diff --check`: PASS. Build còn cảnh báo kích thước bundle và Vite config đã có từ trước.
- `npm test`: PASS, 808 test (744 Node test + 27 F11 + 37 F09/F10).

Ảnh kiểm chứng và JSON browser audit của lượt chạy hoàn tất nằm tại `/var/folders/xh/49tf3mqn7dq_hr6pj74lmyjc0000gn/T/paspm-catalogue-media-1sB9CQ/`.

## Bản sao dữ liệu và phạm vi sử dụng

- [Metadata trước cập nhật](CATALOGUE_MEDIA_BEFORE_2026-11-28.json): dữ liệu sản phẩm và Store trước khi gắn ảnh, không chứa credential.
- [Metadata sau cập nhật](CATALOGUE_MEDIA_AFTER_2026-11-28.json): ảnh, mô tả, kết quả đối chiếu trường nghiệp vụ và kiểm tra public image, không chứa credential.
- Manifest có `assetOrigin: http://localhost:3000`, vì F02 bắt buộc URL tuyệt đối HTTP(S). Khi đưa dữ liệu sang môi trường deploy, cần đổi origin ảnh sang domain FE/CDN thực tế qua API. Thay đổi dữ liệu local không tự đồng bộ sang database khác.
- Store icon/banner được API lưu dưới media root của Backend. Cần giữ media storage cùng database khi di chuyển môi trường.
- Script audit chỉ đọc API; nó xuất ba PNG icon trong FE và các artifact kiểm tra tạm. Chạy bằng Node 22, Chrome, FE và Backend đang bật: `node scripts/audit-catalogue-media.mjs --live`.

Không chạy lại toàn bộ browser suite F07–F11 trong đợt bổ sung ảnh; kiểm tra browser lần này tập trung vào media và các trang customer.
