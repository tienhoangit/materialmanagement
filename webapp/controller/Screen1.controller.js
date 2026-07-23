sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/FilterType",
    "sap/m/SelectDialog",
    "sap/m/StandardListItem",
    "sap/ui/core/ValueState",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/m/ColumnListItem",
    "sap/m/ObjectIdentifier",
    "sap/m/Text"
],
// eslint-disable-next-line max-params
function (Controller, Fragment, Filter, FilterOperator, FilterType, SelectDialog, StandardListItem, ValueState, MessageToast, MessageBox, JSONModel, ColumnListItem, ObjectIdentifier, Text) {
    "use strict";

    return Controller.extend("materialmanagement.controller.Screen1", {
        /**
         * Hàm onInit() - Vòng đời (Lifecycle Hook) của Controller.
         * Được UI5 framework gọi một lần duy nhất khi View tương ứng (`Screen1.view.xml`) được khởi tạo.
         * Nơi lý tưởng để thiết lập các Models, khởi tạo dữ liệu mặc định và gán event listener.
         */
        onInit: function () {
            // Lấy tham chiếu đến OData Model chính (thường định nghĩa trong manifest.json với tên rỗng "")
            this._oModel = this.getOwnerComponent().getModel();

            // Khởi tạo một JSONModel (Model cục bộ ở phía Client) có tên là "viewModel".
            // Model này đóng vai trò như một State Management lưu trữ các biến đếm hiển thị trên UI.
            // Bằng cách bind dữ liệu này vào View, giao diện sẽ tự động cập nhật khi các con số này thay đổi.
            var oViewModel = new JSONModel({
                materialCount: 0, // Tổng số lượng Vật tư
                stockCount: 0,    // Tổng số lượng Tồn kho
                poCount: 0        // Tổng số lượng Đơn mua hàng (PO)
            });
            this.getView().setModel(oViewModel, "viewModel");

            // Khởi tạo một JSONModel khác có tên "createItems".
            // Model này dùng riêng cho chức năng Tạo mới Đơn mua hàng (Create Purchase Order)
            // để lưu trữ tạm thời danh sách các Dòng chi tiết (Items) người dùng vừa thêm vào trước khi Submit.
            this._oCreateItemsModel = new JSONModel({ items: [] });
            this.getView().setModel(this._oCreateItemsModel, "createItems");

            // Gọi hàm đếm dữ liệu tổng quan từ Backend SAP
            this._loadSummaryCounts();
        },

        /**
         * Xử lý sự kiện khi người dùng nhấn nút Refresh.
         * Tải lại toàn bộ dữ liệu OData và cập nhật lại bộ đếm.
         */
        onRefresh: function () {
            this._oModel.refresh(true);
            this._loadSummaryCounts();
            MessageToast.show(this.getResourceBundle().getText("refreshed"));
        },

        /**
         * Gọi OData API với tham số `$count` để đếm tổng số lượng bản ghi của 3 thực thể (Material, Stock, PO).
         * Dữ liệu trả về sẽ được dùng để cập nhật các biến đếm trong `viewModel`, từ đó hiển thị lên các 
         * thẻ tóm tắt (Summary Cards) trên giao diện Overview.
         */
        _loadSummaryCounts: function () {
            var oViewModel = this.getView().getModel("viewModel");
            var oModel = this.getOwnerComponent().getModel();
            
            // Kiểm tra an toàn xem OData model có tồn tại và có phương thức read() hay không
            if (!oModel || typeof oModel.read !== "function") {
                return;
            }

            // --- 1. Đếm số lượng Vật tư (Material) ---
            // Gửi GET request tới đường dẫn `/MaterialSet/$count`
            oModel.read("/MaterialSet/$count", {
                success: function (iCount) {
                    // Nếu Backend trả về số lượng thành công, tiến hành parse sang số nguyên
                    // và ghi đè vào thuộc tính `/materialCount` của viewModel.
                    if (iCount !== undefined && iCount !== null) {
                        oViewModel.setProperty("/materialCount", parseInt(iCount, 10) || 0);
                    }
                },
                error: function () {
                    // Nếu lỗi (ví dụ rớt mạng), bỏ qua. Tổng số sẽ được cập nhật lại 
                    // khi Table tải xong dữ liệu (thông qua hàm updateFinished).
                }
            });
            
            // --- 2. Đếm số lượng Tồn kho (Stock) ---
            oModel.read("/StockSet/$count", {
                success: function (iCount) {
                    if (iCount !== undefined && iCount !== null) {
                        oViewModel.setProperty("/stockCount", parseInt(iCount, 10) || 0);
                    }
                },
                error: function () {}
            });
            
            // --- 3. Đếm số lượng Đơn mua hàng (Purchase Order) ---
            oModel.read("/PurchaseOrderSet/$count", {
                success: function (iCount) {
                    if (iCount !== undefined && iCount !== null) {
                        oViewModel.setProperty("/poCount", parseInt(iCount, 10) || 0);
                    }
                },
                error: function () {
                    // Fallback handled by table updateFinished
                }
            });
        },

        onOrderTableUpdateFinished: function (oEvent) {
            var iTotal = oEvent.getParameter("total");
            if (typeof iTotal === "number" && iTotal >= 0) {
                this.getView().getModel("viewModel").setProperty("/poCount", iTotal);
            }
        },

        onMaterialTableUpdateFinished: function (oEvent) {
            var iTotal = oEvent.getParameter("total");
            if (typeof iTotal === "number" && iTotal >= 0) {
                this.getView().getModel("viewModel").setProperty("/materialCount", iTotal);
            }
        },

        onStockTableUpdateFinished: function (oEvent) {
            var iTotal = oEvent.getParameter("total");
            if (typeof iTotal === "number" && iTotal >= 0) {
                this.getView().getModel("viewModel").setProperty("/stockCount", iTotal);
            }
        },

        /**
         * Tìm kiếm trong danh sách Tồn kho (Stock).
         * Lọc dữ liệu Local dựa trên trường Matnr.
         */
        onStockSearch: function (oEvent) {
            var sValue = oEvent.getParameter("newValue");
            var oBinding = this.byId("stockTable").getBinding("items");
            var aFilters = sValue ? [new Filter("Matnr", FilterOperator.Contains, sValue)] : [];
            if (oBinding) {
                oBinding.filter(aFilters, FilterType.Control);
                oBinding.filter(aFilters, FilterType.Application);
            }
        },

        /**
         * Tìm kiếm trong danh sách Vật tư (Material).
         * Lọc dữ liệu Local dựa trên trường Matnr.
         */
        onMaterialSearch: function (oEvent) {
            var sValue = oEvent.getParameter("newValue");
            var oBinding = this.byId("materialTable").getBinding("items");
            var aFilters = sValue ? [new Filter("Matnr", FilterOperator.Contains, sValue)] : [];
            if (oBinding) {
                oBinding.filter(aFilters, FilterType.Control);
                oBinding.filter(aFilters, FilterType.Application);
            }
        },

        /**
         * Xử lý sự kiện tìm kiếm Đơn mua hàng (Purchase Order).
         * Lấy từ khóa và lưu vào viewModel, sau đó gọi hàm _applyPOFilters để fetch từ server.
         */
        onPOSearch: function (oEvent) {
            var oSearchControl = this.byId("searchPoInput");
            var sQuery = oSearchControl ? oSearchControl.getValue() : "";
            if (oEvent && oEvent.getParameter("query") !== undefined) {
                sQuery = oEvent.getParameter("query");
            } else if (oEvent && oEvent.getParameter("newValue") !== undefined) {
                sQuery = oEvent.getParameter("newValue");
            }
            this._sPoQuery = String(sQuery || "").trim();
            this._applyPOFilters();
        },

        /**
         * Thực thi tìm kiếm Purchase Order bằng cách gọi OData request ().
         * Do backend có giới hạn, hàm này xử lý filter eq (exact match) thay vì contains.
         */
        _applyPOFilters: function () {
            var sSearchTarget = this._sPoQuery ? String(this._sPoQuery).trim() : null;
            var oSelectControl = this.byId("selectPoSearchField");
            var sSelectedField = oSelectControl ? oSelectControl.getSelectedKey() : "Ebeln";
            var oTable = this.byId("orderTable");
            var that = this;

            if (!oTable) {
                return;
            }

            if (!sSearchTarget) {
                this._restorePurchaseOrderBinding(oTable);
                return;
            }

            // A PO number can use the single-entity endpoint.
            var bIsKeyRead = sSelectedField === "Ebeln" && sSearchTarget &&
                (/^\d{10}$/.test(sSearchTarget) || /^(45|25)\d+$/.test(sSearchTarget));

            if (bIsKeyRead) {
                // Direct Key Read: GET /PurchaseOrderSet('4500004141')
                this._sPoSearchRequest = sSelectedField + "|" + sSearchTarget;
                var sKeyRequest = this._sPoSearchRequest;
                this._oModel.read("/PurchaseOrderSet('" + sSearchTarget + "')", {
                    success: function (oData) {
                        if (that._sPoSearchRequest !== sKeyRequest) {
                            return;
                        }
                        if (oData && oData.Ebeln) {
                            that._bindPurchaseOrderResults(oTable, [oData]);
                        }
                    },
                    error: function () {
                        if (that._sPoSearchRequest !== sKeyRequest) {
                            return;
                        }
                        that._bindPurchaseOrderResults(oTable, []);
                        MessageToast.show("PO " + sSearchTarget + " not found.");
                    }
                });
                return;
            }

            // Call the collection endpoint directly so Supplier uses
            // GET .../PurchaseOrderSet?$filter=Lifnr eq '50000006'.
            var sFilterField = ["Ebeln", "Lifnr", "Bukrs"].indexOf(sSelectedField) >= 0 ? sSelectedField : "Ebeln";
            var sFilterValue = sFilterField === "Bukrs" ? sSearchTarget.toUpperCase() : sSearchTarget;
            var sODataFilter = sFilterField + " eq '" + sFilterValue.replace(/'/g, "''") + "'";

            this._sPoSearchRequest = sSelectedField + "|" + sSearchTarget;
            var sCollectionRequest = this._sPoSearchRequest;
            this._oModel.read("/PurchaseOrderSet", {
                // Keep the URL identical to the backend endpoint verified manually:
                // ?$filter=Lifnr eq '50000006'
                urlParameters: {
                    "$filter": sODataFilter
                },
                success: function (oData) {
                    if (that._sPoSearchRequest !== sCollectionRequest) {
                        return;
                    }
                    var aResults = oData.results || oData.value || [];

                    // The remote service currently ignores $filter on the
                    // collection endpoint. Keep the result shown in the UI
                    // consistent with the user's selected search field until
                    // the backend implements filter handling.
                    aResults = aResults.filter(function (oPurchaseOrder) {
                        return String(oPurchaseOrder[sFilterField] || "") === sFilterValue;
                    });

                    that._bindPurchaseOrderResults(oTable, aResults);
                },
                error: function () {
                    if (that._sPoSearchRequest !== sCollectionRequest) {
                        return;
                    }
                    that._bindPurchaseOrderResults(oTable, []);
                    MessageToast.show("Could not load purchase orders.");
                }
            });
        },

        _bindPurchaseOrderResults: function (oTable, aPurchaseOrders) {
            this._bSinglePoBound = true;
            oTable.setModel(new JSONModel({ items: aPurchaseOrders }), "singlePO");
            oTable.unbindItems();
            oTable.bindItems({
                path: "singlePO>/items",
                template: new ColumnListItem({
                    type: "Active",
                    press: this.onPurchaseOrderPress.bind(this),
                    cells: [
                        new ObjectIdentifier({ title: "{singlePO>Ebeln}", titleActive: true, titlePress: this.onPurchaseOrderPress.bind(this) }),
                        new Text({ text: "{singlePO>Lifnr}" }),
                        new Text({ text: "{singlePO>Bukrs}" }),
                        new Text({ text: "{singlePO>Bedat}" })
                    ]
                })
            });
        },

        _restorePurchaseOrderBinding: function (oTable) {
            this._sPoSearchRequest = null;
            if (!this._bSinglePoBound) {
                return;
            }
            this._bSinglePoBound = false;
            oTable.setModel(null, "singlePO");
            oTable.unbindItems();
            oTable.bindItems({
                path: "/PurchaseOrderSet",
                growing: true,
                growingThreshold: 10,
                template: new ColumnListItem({
                    type: "Active",
                    press: this.onPurchaseOrderPress.bind(this),
                    cells: [
                        new ObjectIdentifier({ title: "{Ebeln}", titleActive: true, titlePress: this.onPurchaseOrderPress.bind(this) }),
                        new Text({ text: "{Lifnr}" }),
                        new Text({ text: "{Bukrs}" }),
                        new Text({ text: "{Bedat}" })
                    ]
                })
            });
        },

        /**
         * Tìm kiếm trong danh sách Nhập kho (Goods Receipt).
         * Lọc Local trên 3 trường Ebeln, Belnr và Ebelp.
         */
        onGRSearch: function (oEvent) {
            var sValue = oEvent.getParameter("newValue") || "";
            var oBinding = this.byId("goodsReceiptTable").getBinding("items");
            if (!oBinding) {
                return;
            }
            var aFilters = [];
            if (sValue.trim()) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("Ebeln", FilterOperator.Contains, sValue),
                        new Filter("Belnr", FilterOperator.Contains, sValue),
                        new Filter("Ebelp", FilterOperator.Contains, sValue)
                    ],
                    and: false
                }));
            }
            oBinding.filter(aFilters, FilterType.Control);
            oBinding.filter(aFilters, FilterType.Application);
        },

        /**
         * Xử lý khi người dùng click vào một dòng Purchase Order.
         * Mở popup hiển thị chi tiết PO và danh sách các Item bên trong.
         */
        onPurchaseOrderPress: function (oEvent) {
            if (!oEvent) {
                return;
            }
            var oSource = typeof oEvent.getSource === "function" ? oEvent.getSource() : null;
            var oContext = null;
            if (oSource) {
                oContext = oSource.getBindingContext("singlePO") || oSource.getBindingContext();
                if (!oContext && typeof oSource.getParent === "function" && oSource.getParent()) {
                    oContext = oSource.getParent().getBindingContext("singlePO") || oSource.getParent().getBindingContext();
                }
            }
            var oData = oContext ? oContext.getObject() : null;
            if (oData) {
                this._openPurchaseOrderDetails(oData);
            } else if (this._sPoQuery) {
                this._openPurchaseOrderDetails({ Ebeln: this._sPoQuery });
            }
        },

        /**
         * Dynamic SAP F4 Value Help Dialog
         */
        /**
         * Hàm dùng chung để mở dialog Value Help (F4) cho các trường nhập liệu.
         * Lấy dữ liệu từ entity set truyền vào và hiển thị danh sách chọn.
         */
        onValueHelp: function (oEvent, sEntitySet, sKeyField, sTitle, sDescField) {
            var oInput = oEvent.getSource();
            this._oModel.read(sEntitySet, {
                success: function (oData) {
                    var aResults = oData.results || [];
                    var mUnique = {};
                    var aUniqueItems = [];
                    aResults.forEach(function (oRec) {
                        var sKey = oRec[sKeyField];
                        if (sKey && !mUnique[sKey]) {
                            mUnique[sKey] = true;
                            aUniqueItems.push({
                                key: sKey,
                                title: sKey,
                                description: sDescField ? (oRec[sDescField] || "") : ""
                            });
                        }
                    });

                    var oValueHelpDialog = new SelectDialog({
                        title: sTitle,
                        items: {
                            path: "vhModel>/items",
                            template: new StandardListItem({
                                title: "{vhModel>title}",
                                description: "{vhModel>description}"
                            })
                        },
                        search: function (oEvt) {
                            var sVal = oEvt.getParameter("value");
                            var oFilter = new Filter("title", FilterOperator.Contains, sVal);
                            oEvt.getSource().getBinding("items").filter(sVal ? [oFilter] : []);
                        },
                        confirm: function (oEvt) {
                            var oSelectedItem = oEvt.getParameter("selectedItem");
                            if (oSelectedItem) {
                                oInput.setValue(oSelectedItem.getTitle());
                                oInput.setValueState(ValueState.None);
                            }
                            oValueHelpDialog.destroy();
                        },
                        cancel: function () {
                            oValueHelpDialog.destroy();
                        }
                    });
                    oValueHelpDialog.setModel(new JSONModel({ items: aUniqueItems }), "vhModel");
                    oValueHelpDialog.open();
                },
                error: function () {
                    MessageToast.show("Could not load Value Help data from backend.");
                }
            });
        },

        // Helper Value Help methods for XML Fragments
        onValueHelpCompanyCode: function (oEvt) {
            this.onValueHelp(oEvt, "/PurchaseOrderSet", "Bukrs", "Select Company Code");
        },
        onValueHelpSupplier: function (oEvt) {
            this.onValueHelp(oEvt, "/PurchaseOrderSet", "Lifnr", "Select Supplier");
        },
        onValueHelpPurchasingOrg: function (oEvt) {
            this.onValueHelp(oEvt, "/PurchaseOrderSet", "Ekorg", "Select Purchasing Organization");
        },
        onValueHelpPurchasingGroup: function (oEvt) {
            this.onValueHelp(oEvt, "/PurchaseOrderSet", "Ekgrp", "Select Purchasing Group");
        },
        onValueHelpEditSupplier: function (oEvt) {
            this.onValueHelp(oEvt, "/PurchaseOrderSet", "Lifnr", "Select Supplier");
        },
        onValueHelpEditPurchasingOrg: function (oEvt) {
            this.onValueHelp(oEvt, "/PurchaseOrderSet", "Ekorg", "Select Purchasing Organization");
        },
        onValueHelpEditPurchasingGroup: function (oEvt) {
            this.onValueHelp(oEvt, "/PurchaseOrderSet", "Ekgrp", "Select Purchasing Group");
        },
        onValueHelpItemMaterial: function (oEvt) {
            this.onValueHelp(oEvt, "/MaterialSet", "Matnr", "Select Material", "Mtart");
        },
        onValueHelpItemPlant: function (oEvt) {
            this.onValueHelp(oEvt, "/StockSet", "Werks", "Select Plant");
        },
        onValueHelpItemStorageLocation: function (oEvt) {
            this.onValueHelp(oEvt, "/StockSet", "Lgort", "Select Storage Location");
        },

        onInputLiveChange: function (oEvent) {
            oEvent.getSource().setValueState(ValueState.None);
        },

        // --- PO DETAIL DIALOG ---
        _openPurchaseOrderDetails: function (oPurchaseOrder) {
            if (!oPurchaseOrder) {
                return;
            }
            this._oSelectedPurchaseOrder = oPurchaseOrder;
            var sEbeln = oPurchaseOrder.Ebeln;
            var that = this;

            if (!this._pPoDetailDialog) {
                this._pPoDetailDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "materialmanagement.view.fragment.PODetailDialog",
                    controller: this
                }).then(function (oDialog) {
                    that.getView().addDependent(oDialog);
                    oDialog.setModel(new JSONModel({ header: {}, items: [] }), "poItems");
                    return oDialog;
                });
            }

            this._pPoDetailDialog.then(function (oDialog) {
                var oPoModel = oDialog.getModel("poItems");
                oPoModel.setProperty("/header", oPurchaseOrder);
                oPoModel.setProperty("/items", []);
                oDialog.open();

                if (!sEbeln) {
                    return;
                }

                // 1. First try: GET /PurchaseOrderSet('ebeln')?$expand=POItemSet
                that._oModel.read("/PurchaseOrderSet('" + sEbeln + "')", {
                    urlParameters: { "$expand": "POItemSet" },
                    success: function (oData) {
                        if (oData) {
                            // Merge expanded data with original PO to preserve Lifnr and other fields
                            var oMergedHeader = Object.assign({}, oPurchaseOrder, oData);
                            oPoModel.setProperty("/header", oMergedHeader);
                            var aItems = (oData.POItemSet && oData.POItemSet.results) ? oData.POItemSet.results : (oData.POItemSet || []);
                            if (Array.isArray(aItems) && aItems.length > 0) {
                                oPoModel.setProperty("/items", aItems);
                                return;
                            }
                        }
                        // 2. Second try: GET /PurchaseOrderSet('ebeln')/POItemSet navigation
                        that._loadPoItemsNavigation(sEbeln, oPoModel);
                    },
                    error: function () {
                        // 2. Second try: GET /PurchaseOrderSet('ebeln')/POItemSet navigation
                        that._loadPoItemsNavigation(sEbeln, oPoModel);
                    }
                });
            });
        },

        _loadPoItemsNavigation: function (sEbeln, oPoModel) {
            var that = this;
            this._oModel.read("/PurchaseOrderSet('" + sEbeln + "')/POItemSet", {
                success: function (oResult) {
                    var aItems = oResult.results || [];
                    if (aItems.length > 0) {
                        oPoModel.setProperty("/items", aItems);
                    } else {
                        that._loadPoItemsDirect(sEbeln, oPoModel);
                    }
                },
                error: function () {
                    that._loadPoItemsDirect(sEbeln, oPoModel);
                }
            });
        },

        _loadPoItemsDirect: function (sEbeln, oPoModel) {
            this._oModel.read("/POItemSet", {
                success: function (oResult) {
                    var aItems = (oResult.results || []).filter(function (oItem) {
                        return oItem.Ebeln === sEbeln;
                    });
                    oPoModel.setProperty("/items", aItems);
                }
            });
        },

        onClosePoDetailDialog: function () {
            this.byId("poDetailDialog").close();
        },

        onPostGrFromDetail: function () {
            this.onClosePoDetailDialog();
            this.onOpenGoodsReceipt(this._oSelectedPurchaseOrder ? this._oSelectedPurchaseOrder.Ebeln : "");
        },

        _openGoodsReceiptForItem: function (oEvent) {
            var oItem = oEvent.getSource().getBindingContext("poItems").getObject();
            this.onClosePoDetailDialog();
            this.onOpenGoodsReceipt({ Ebeln: oItem.Ebeln, Ebelp: oItem.Ebelp });
        },

        // --- CREATE ORDER DIALOG ---
        /**
         * Mở Fragment (Dialog) để tạo mới Đơn mua hàng (Purchase Order).
         * Reset lại dữ liệu khởi tạo ban đầu.
         */
        onOpenCreateOrder: function () {
            this._oCreateItemsModel.setProperty("/items", []);
            this._addPoItem();

            if (!this._pCreateDialog) {
                this._pCreateDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "materialmanagement.view.fragment.CreateOrderDialog",
                    controller: this
                }).then(function (oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }

            this._pCreateDialog.then(function (oDialog) {
                this.byId("createCompanyCodeInput").setValue("").setValueState(ValueState.None);
                this.byId("createSupplierInput").setValue("").setValueState(ValueState.None);
                this.byId("createPurchasingOrgInput").setValue("").setValueState(ValueState.None);
                this.byId("createPurchasingGroupInput").setValue("").setValueState(ValueState.None);
                this.byId("createDocumentTypeSelect").setSelectedKey("NB");
                this.byId("createCurrencySelect").setSelectedKey("EUR");
                oDialog.open();
            }.bind(this));
        },

        onCloseCreateDialog: function () {
            this.byId("createOrderDialog").close();
        },

        /**
         * Thêm một dòng (Item) trắng mới vào bảng chi tiết khi tạo Purchase Order.
         */
        _addPoItem: function () {
            var aItems = this._oCreateItemsModel.getProperty("/items");
            aItems.push({ Matnr: "", Txz01: "", Werks: "", Lgort: "", Menge: "", Meins: "EA", Netpr: "" });
            this._oCreateItemsModel.setProperty("/items", aItems);
        },

        /**
         * Xóa một dòng (Item) khỏi bảng chi tiết khi tạo Purchase Order.
         */
        _removePoItem: function (oEvent) {
            var sPath = oEvent.getSource().getBindingContext("createItems").getPath();
            var iIndex = Number(sPath.split("/").pop());
            var aItems = this._oCreateItemsModel.getProperty("/items");
            aItems.splice(iIndex, 1);
            this._oCreateItemsModel.setProperty("/items", aItems);
        },

        /**
         * Xử lý sự kiện Lưu (Create) Purchase Order.
         * Xác thực dữ liệu đầu vào và gửi OData POST request (Deep Insert) tới server.
         */
        onCreateOrder: function () {
            var oCompanyCodeInput = this.byId("createCompanyCodeInput");
            var oSupplierInput = this.byId("createSupplierInput");
            var oPurchasingOrgInput = this.byId("createPurchasingOrgInput");
            var oPurchasingGroupInput = this.byId("createPurchasingGroupInput");

            var aRawItems = this._oCreateItemsModel.getProperty("/items");
            var aFormattedItems = aRawItems.map(function (oItem) {
                return {
                    Matnr: oItem.Matnr,
                    Txz01: oItem.Txz01,
                    Werks: oItem.Werks,
                    Lgort: oItem.Lgort,
                    Menge: String(oItem.Menge || "0"),
                    Meins: oItem.Meins,
                    Netpr: String(oItem.Netpr || "0")
                };
            });

            var oPayload = {
                Bukrs: oCompanyCodeInput.getValue(),
                Lifnr: oSupplierInput.getValue(),
                Bsart: this.byId("createDocumentTypeSelect").getSelectedKey(),
                Ekorg: oPurchasingOrgInput.getValue(),
                Ekgrp: oPurchasingGroupInput.getValue(),
                Waers: this.byId("createCurrencySelect").getSelectedKey(),
                POItemSet: aFormattedItems
            };

            var bValid = true;
            bValid = this._validateField(oCompanyCodeInput, oPayload.Bukrs) && bValid;
            bValid = this._validateField(oSupplierInput, oPayload.Lifnr) && bValid;
            bValid = this._validateField(oPurchasingOrgInput, oPayload.Ekorg) && bValid;
            bValid = this._validateField(oPurchasingGroupInput, oPayload.Ekgrp) && bValid;

            if (!bValid) {
                MessageBox.warning(this.getResourceBundle().getText("requiredFields"));
                return;
            }

            if (!aFormattedItems.length || aFormattedItems.some(function (oItem) {
                return !oItem.Matnr || !oItem.Txz01 || !oItem.Werks || !oItem.Lgort || !oItem.Menge || !oItem.Meins || !oItem.Netpr;
            })) {
                MessageBox.warning(this.getResourceBundle().getText("createOrderItemsRequired"));
                return;
            }

            this._oModel.create("/PurchaseOrderSet", oPayload, {
                success: function (oData) {
                    this.onCloseCreateDialog();
                    this._oModel.refresh(true);
                    this._loadSummaryCounts();
                    MessageToast.show(this.getResourceBundle().getText("orderCreated", [oData.Ebeln || ""]));
                }.bind(this),
                error: function (oError) {
                    MessageBox.error(this._getODataErrorMessage(oError, "createOrderDeepError"));
                }.bind(this)
            });
        },

        // --- GOODS RECEIPT DIALOG ---
        /**
         * Mở Dialog Nhập kho (Goods Receipt).
         * Cho phép truyền sẵn mã PO (sPurchaseOrder) vào ô nhập liệu.
         */
        onOpenGoodsReceipt: function (sPurchaseOrder) {
            var sEbeln = "";
            var sEbelp = "";
            if (typeof sPurchaseOrder === "string") {
                sEbeln = sPurchaseOrder;
            } else if (sPurchaseOrder && sPurchaseOrder.Ebeln) {
                sEbeln = sPurchaseOrder.Ebeln;
                sEbelp = sPurchaseOrder.Ebelp || "";
            }

            if (!this._pGoodsReceiptDialog) {
                this._pGoodsReceiptDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "materialmanagement.view.fragment.GoodsReceiptDialog",
                    controller: this
                }).then(function (oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }

            this._pGoodsReceiptDialog.then(function (oDialog) {
                this.byId("grPoInput").setValue(sEbeln).setValueState(ValueState.None);
                this.byId("grItemInput").setValue(sEbelp).setValueState(ValueState.None);
                this.byId("grQuantityInput").setValue("").setValueState(ValueState.None);
                oDialog.open();
            }.bind(this));
        },

        onCloseGoodsReceiptDialog: function () {
            this.byId("goodsReceiptDialog").close();
        },

        /**
         * Xử lý Ghi sổ Nhập kho (Post Goods Receipt).
         * Gửi OData POST request tới GoodsReceiptSet.
         */
        onPostGoodsReceipt: function () {
            var oPoInput = this.byId("grPoInput");
            var oItemInput = this.byId("grItemInput");
            var oQuantityInput = this.byId("grQuantityInput");

            var sRawQty = String(oQuantityInput.getValue() || "").trim();
            var sFormattedQty = sRawQty;
            if (sRawQty && !isNaN(Number(sRawQty)) && !sRawQty.includes(".")) {
                sFormattedQty = parseFloat(sRawQty).toFixed(3);
            }

            var oPayload = {
                Ebeln: String(oPoInput.getValue() || "").trim(),
                Ebelp: String(oItemInput.getValue() || "").trim(),
                Menge: sFormattedQty || "0"
            };

            var bValid = true;
            bValid = this._validateField(oPoInput, oPayload.Ebeln) && bValid;
            bValid = this._validateField(oItemInput, oPayload.Ebelp) && bValid;
            bValid = this._validateField(oQuantityInput, oPayload.Menge) && bValid;

            if (!bValid) {
                MessageBox.warning(this.getResourceBundle().getText("goodsReceiptRequired"));
                return;
            }

            this._oModel.create("/GoodsReceiptSet", oPayload, {
                success: function () {
                    this.onCloseGoodsReceiptDialog();
                    this._oModel.refresh(true);
                    this._loadSummaryCounts();
                    MessageToast.show(this.getResourceBundle().getText("goodsReceiptCreated"));
                }.bind(this),
                error: function (oError) {
                    MessageBox.error(this._getODataErrorMessage(oError, "goodsReceiptError"));
                }.bind(this)
            });
        },

        /**
         * Hàm tiện ích kiểm tra tính hợp lệ của trường nhập liệu.
         * Nếu trống, set trạng thái lỗi (Error) màu đỏ.
         */
        _validateField: function (oControl, sValue) {
            if (!sValue || !String(sValue).trim()) {
                if (oControl && oControl.setValueState) {
                    oControl.setValueState(ValueState.Error);
                    oControl.setValueStateText("Field is required.");
                }
                return false;
            }
            if (oControl && oControl.setValueState) {
                oControl.setValueState(ValueState.None);
            }
            return true;
        },

        /**
         * Trích xuất thông báo lỗi từ response trả về của OData.
         * Nếu không parse được, dùng message mặc định.
         */
        _getODataErrorMessage: function (oError, sFallbackKey) {
            try {
                var oResponse = JSON.parse(oError.responseText);
                return oResponse.error && oResponse.error.message && oResponse.error.message.value ?
                    oResponse.error.message.value : this.getResourceBundle().getText(sFallbackKey);
            // eslint-disable-next-line no-unused-vars
            } catch (e) {
                return this.getResourceBundle().getText(sFallbackKey);
            }
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        }
    });
});
