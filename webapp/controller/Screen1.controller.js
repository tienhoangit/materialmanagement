sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/Dialog",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/Button",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/VBox",
    "sap/m/ToolbarSpacer",
    "sap/m/Table",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    "sap/m/ObjectNumber",
    "sap/ui/model/json/JSONModel"
],
// eslint-disable-next-line max-params
function (Controller, Filter, FilterOperator, Dialog, Label, Input, Button, MessageToast, MessageBox, VBox, ToolbarSpacer, Table, Column, ColumnListItem, Text, ObjectNumber, JSONModel) {
    "use strict";

    return Controller.extend("materialmanagement.controller.Screen1", {
        onInit: function () {
            this._oModel = this.getOwnerComponent().getModel();
        },

        onRefresh: function () {
            this._oModel.refresh(true);
            MessageToast.show(this.getResourceBundle().getText("refreshed"));
        },

        onStockSearch: function (oEvent) {
            var sValue = oEvent.getParameter("newValue");
            var oBinding = this.byId("stockTable").getBinding("items");
            oBinding.filter(sValue ? [new Filter("Matnr", FilterOperator.Contains, sValue)] : []);
        },

        onMaterialSearch: function (oEvent) {
            var sValue = oEvent.getParameter("newValue");
            var oBinding = this.byId("materialTable").getBinding("items");
            oBinding.filter(sValue ? [new Filter("Matnr", FilterOperator.Contains, sValue)] : []);
        },

        onPurchaseOrderPress: function (oEvent) {
            var oData = oEvent.getSource().getBindingContext().getObject();
            this._openPurchaseOrderDetails(oData);
        },

        _openPurchaseOrderDetails: function (oPurchaseOrder) {
            if (!this._oPoDetailDialog) {
                this._oPoDetailDialog = new Dialog({
                    title: this.getResourceBundle().getText("purchaseOrderDetails"),
                    contentWidth: "48rem",
                    content: new VBox({
                        class: "sapUiSmallMargin",
                        items: [
                            new Text({id: this.getView().createId("poDetailHeader")}),
                            new Table({
                                width: "100%",
                                noDataText: "{i18n>noPurchaseOrderItems}",
                                items: {path: "poItems>/items", template: new ColumnListItem({cells: [
                                    new Text({text: "{poItems>Ebelp}"}), new Text({text: "{poItems>Matnr}"}),
                                    new Text({text: "{poItems>Txz01}"}), new ObjectNumber({number: "{poItems>Menge}", unit: "{poItems>Meins}"}),
                                    new ObjectNumber({number: "{poItems>Netpr}"})
                                ]})},
                                columns: [
                                    new Column({header: new Text({text: "{i18n>poItem}"})}), new Column({header: new Text({text: "{i18n>material}"})}),
                                    new Column({header: new Text({text: "{i18n>itemDescription}"})}), new Column({header: new Text({text: "{i18n>orderQuantity}"}), hAlign: "End"}),
                                    new Column({header: new Text({text: "{i18n>netPrice}"}), hAlign: "End"})
                                ]
                            })
                        ]
                    }),
                    beginButton: new Button({text: "{i18n>postGoodsReceipt}", type: "Emphasized", press: function () {
                        this._oPoDetailDialog.close();
                        this.onOpenGoodsReceipt(oPurchaseOrder.Ebeln);
                    }.bind(this)}),
                    endButton: new Button({text: "{i18n>cancel}", press: function () { this._oPoDetailDialog.close(); }.bind(this)})
                });
                this._oPoDetailDialog.setModel(new JSONModel({items: []}), "poItems");
                this.getView().addDependent(this._oPoDetailDialog);
            }
            this.byId("poDetailHeader").setText(this.getResourceBundle().getText("poSelected", [oPurchaseOrder.Ebeln]));
            this._oPoDetailDialog.getModel("poItems").setProperty("/items", []);
            this._oPoDetailDialog.open();
            this._oModel.read("/POItemSet", {
                success: function (oResult) {
                    var aItems = (oResult.results || []).filter(function (oItem) { return oItem.Ebeln === oPurchaseOrder.Ebeln; });
                    this._oPoDetailDialog.getModel("poItems").setProperty("/items", aItems);
                }.bind(this),
                error: function () { MessageBox.error(this.getResourceBundle().getText("createOrderError")); }.bind(this)
            });
        },

        onOpenCreateOrder: function () {
            if (!this._oCreateDialog) {
                this._oCreateDialog = new Dialog({
                    title: this.getResourceBundle().getText("createOrder"),
                    contentWidth: "25rem",
                    content: new VBox({
                        class: "sapUiSmallMargin",
                        items: [
                            new Label({text: "{i18n>companyCode}", labelFor: "companyCodeInput"}),
                            new Input("companyCodeInput", {value: "1000", maxLength: 4}),
                            new Label({text: "{i18n>supplier}", labelFor: "supplierInput"}),
                            new Input("supplierInput", {placeholder: "{i18n>supplierPlaceholder}", maxLength: 10}),
                            new Label({text: "{i18n>documentType}", labelFor: "documentTypeInput"}),
                            new Input("documentTypeInput", {value: "NB", maxLength: 4}),
                            new Label({text: "{i18n>purchasingOrg}", labelFor: "purchasingOrgInput"}),
                            new Input("purchasingOrgInput", {placeholder: "{i18n>purchasingOrgPlaceholder}", maxLength: 4})
                        ]
                    }),
                    beginButton: new Button({text: "{i18n>save}", type: "Emphasized", press: this.onCreateOrder.bind(this)}),
                    endButton: new Button({text: "{i18n>cancel}", press: function () { this._oCreateDialog.close(); }.bind(this)})
                });
                this.getView().addDependent(this._oCreateDialog);
            }
            this._oCreateDialog.open();
        },

        onCreateOrder: function () {
            var oPayload = {
                Bukrs: sap.ui.getCore().byId("companyCodeInput").getValue(),
                Lifnr: sap.ui.getCore().byId("supplierInput").getValue(),
                Bsart: sap.ui.getCore().byId("documentTypeInput").getValue(),
                Ekorg: sap.ui.getCore().byId("purchasingOrgInput").getValue(),
                Bedat: new Date().toISOString().slice(0, 10)
            };
            if (!oPayload.Bukrs || !oPayload.Lifnr || !oPayload.Ekorg) {
                MessageBox.warning(this.getResourceBundle().getText("requiredFields"));
                return;
            }
            this._oModel.create("/PurchaseOrderSet", oPayload, {
                success: function (oData) {
                    this._oCreateDialog.close();
                    this._oModel.refresh(true);
                    MessageToast.show(this.getResourceBundle().getText("orderCreated", [oData.Ebeln || ""]));
                }.bind(this),
                error: function () {
                    MessageBox.error(this.getResourceBundle().getText("createOrderError"));
                }.bind(this)
            });
        },

        onOpenGoodsReceipt: function (sPurchaseOrder) {
            var sPreselectedPurchaseOrder = typeof sPurchaseOrder === "string" ? sPurchaseOrder : "";
            if (!this._oGoodsReceiptDialog) {
                this._oGrPoInput = new Input({maxLength: 10});
                this._oGrItemInput = new Input({maxLength: 5});
                this._oGrQuantityInput = new Input({type: "Number"});
                this._oGoodsReceiptDialog = new Dialog({
                    title: this.getResourceBundle().getText("goodsReceiptTitle"),
                    contentWidth: "25rem",
                    content: new VBox({class: "sapUiSmallMargin", items: [
                        new Text({text: "{i18n>goodsReceiptHint}"}),
                        new Label({text: "{i18n>poNumber}"}), this._oGrPoInput,
                        new Label({text: "{i18n>poItem}"}), this._oGrItemInput,
                        new Label({text: "{i18n>quantity}"}), this._oGrQuantityInput
                    ]}),
                    beginButton: new Button({text: "{i18n>save}", type: "Emphasized", press: this.onPostGoodsReceipt.bind(this)}),
                    endButton: new Button({text: "{i18n>cancel}", press: function () { this._oGoodsReceiptDialog.close(); }.bind(this)})
                });
                this.getView().addDependent(this._oGoodsReceiptDialog);
            }
            this._oGrPoInput.setValue(sPreselectedPurchaseOrder);
            this._oGrItemInput.setValue("");
            this._oGrQuantityInput.setValue("");
            this._oGoodsReceiptDialog.open();
        },

        onPostGoodsReceipt: function () {
            var oPayload = {
                Ebeln: this._oGrPoInput.getValue(),
                Ebelp: this._oGrItemInput.getValue(),
                Menge: this._oGrQuantityInput.getValue()
            };
            if (!oPayload.Ebeln || !oPayload.Ebelp || !oPayload.Menge) {
                MessageBox.warning(this.getResourceBundle().getText("goodsReceiptRequired"));
                return;
            }
            this._oModel.create("/GoodsReceiptFromPOSet", oPayload, {
                success: function () {
                    this._oGoodsReceiptDialog.close();
                    this._oModel.refresh(true);
                    MessageToast.show(this.getResourceBundle().getText("goodsReceiptCreated"));
                }.bind(this),
                error: function () { MessageBox.error(this.getResourceBundle().getText("goodsReceiptError")); }.bind(this)
            });
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        }
    });
});
