sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], 
function (JSONModel, Device) {
    "use strict";

    return {
        /**
         * Tạo Device Model chứa các thông tin về thiết bị (OS, Trình duyệt, Hệ số tỷ lệ...) 
         * Thiết lập chế độ Binding là OneWay để đảm bảo dữ liệu thiết bị không bị ghi đè từ UI.
         * @returns {sap.ui.model.json.JSONModel} Mô hình dữ liệu JSONModel chứa thông tin Device.
         */
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay"); // Ràng buộc dữ liệu 1 chiều
            return oModel;
        }
    };

});