/**
 * Component.js là file cấu hình khởi tạo cho toàn bộ ứng dụng SAP UI5.
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "materialmanagement/model/models"
    ],
    function (UIComponent, Device, models) {
        "use strict";

        return UIComponent.extend("materialmanagement.Component", {
            // Định nghĩa metadata, chỉ ra manifest file chứa cấu hình chính
            metadata: {
                manifest: "json"
            },

            /**
             * Hàm init() được UI5 framework tự động gọi khi ứng dụng khởi chạy.
             * Hàm này chịu trách nhiệm khởi tạo ứng dụng, cấu hình bộ định tuyến (Router) 
             * và thiết lập các model (mô hình dữ liệu) toàn cục cần thiết cho ứng dụng.
             * Quá trình này diễn ra một lần duy nhất trong vòng đời (Lifecycle) của Component.
             * 
             * @public
             * @override
             */
            init: function () {
                // Bước 1: Gọi hàm init() của class cha (UIComponent) để kế thừa các thiết lập cơ bản.
                // Điều này rất quan trọng để đảm bảo Component framework core hoạt động đúng chuẩn.
                UIComponent.prototype.init.apply(this, arguments);

                // Bước 2: Khởi tạo Router để quản lý việc điều hướng (navigation) giữa các trang.
                // Router sẽ phân tích URL hiện tại và gọi tới View/Controller tương ứng cấu hình trong manifest.json.
                this.getRouter().initialize();

                // Bước 3: Khởi tạo Device Model (Mô hình thiết bị).
                // Chứa thông tin về thiết bị đang chạy app (ví dụ: Desktop, Tablet, Phone, Hệ điều hành, Trình duyệt...).
                // Model này được đặt tên là "device" để các View XML có thể bind dữ liệu responsive
                // (VD: ẩn hiện một số cột trên điện thoại `visible="{device>/system/phone}"`).
                this.setModel(models.createDeviceModel(), "device");
            }
        });
    }
);