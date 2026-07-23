sap.ui.define(
    [
        "sap/ui/core/mvc/Controller"
    ],
    function(BaseController) {
      "use strict";
  
      /**
       * App Controller
       * Đây là controller gốc (root) của ứng dụng, thường gắn với App.view.xml.
       * Nó chứa logic tổng thể và cấu trúc khung của app (nếu có).
       */
      return BaseController.extend("materialmanagement.controller.App", {
        
        /**
         * Hàm onInit được gọi khi view App được khởi tạo lần đầu tiên.
         * Dùng để setup các model hoặc event listener cần thiết cho toàn app.
         */
        onInit: function() {
            // Khởi tạo các logic toàn cục tại đây nếu cần
        }
      });
    }
);