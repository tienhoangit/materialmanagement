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
    "sap/m/Toolbar",
    "sap/m/Table",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    "sap/m/ObjectNumber",
    "sap/ui/model/json/JSONModel"
],
// eslint-disable-next-line max-params
function (Controller, Filter, FilterOperator, Dialog, Label, Input, Button, MessageToast, MessageBox, VBox, ToolbarSpacer, Toolbar, Table, Column, ColumnListItem, Text, ObjectNumber, JSONModel) {
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
                                items: {path: "poItems>/items", template: new ColumnListItem({type: "Active", press: this._openGoodsReceiptForItem.bind(this), cells: [
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
                    buttons: [
                        new Button({text: "{i18n>editPurchaseOrder}", press: function () {
                            this._oPoDetailDialog.close();
                            this.onOpenEditPurchaseOrder(this._oSelectedPurchaseOrder);
                        }.bind(this)}),
                        new Button({text: "{i18n>postGoodsReceipt}", type: "Emphasized", press: function () {
                            this._oPoDetailDialog.close();
                            this.onOpenGoodsReceipt(this._oSelectedPurchaseOrder.Ebeln);
                        }.bind(this)}),
                        new Button({text: "{i18n>cancel}", press: function () { this._oPoDetailDialog.close(); }.bind(this)})
                    ]
                });
                this._oPoDetailDialog.setModel(new JSONModel({items: []}), "poItems");
                this.getView().addDependent(this._oPoDetailDialog);
            }
            this._oSelectedPurchaseOrder = oPurchaseOrder;
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

        _openGoodsReceiptForItem: function (oEvent) {
            var oItem = oEvent.getSource().getBindingContext("poItems").getObject();
            this._oPoDetailDialog.close();
            this.onOpenGoodsReceipt({Ebeln: oItem.Ebeln, Ebelp: oItem.Ebelp});
        },

        onOpenCreateOrder: function () {
            if (!this._oCreateDialog) {
                this._oCompanyCodeInput = new Input({value: "1000", maxLength: 4});
                this._oSupplierInput = new Input({placeholder: "{i18n>supplierPlaceholder}", maxLength: 10});
                this._oDocumentTypeInput = new Input({value: "NB", maxLength: 4});
                this._oPurchasingOrgInput = new Input({placeholder: "{i18n>purchasingOrgPlaceholder}", maxLength: 4});
                this._oPurchasingGroupInput = new Input({maxLength: 3});
                this._oCurrencyInput = new Input({value: "EUR", maxLength: 5});
                this._oCreateItemsModel = new JSONModel({items: []});
                this._oCreateDialog = new Dialog({
                    title: this.getResourceBundle().getText("createOrder"),
                    contentWidth: "64rem",
                    content: new VBox({
                        class: "sapUiSmallMargin",
                        items: [
                            new Label({text: "{i18n>companyCode}"}), this._oCompanyCodeInput,
                            new Label({text: "{i18n>supplier}"}), this._oSupplierInput,
                            new Label({text: "{i18n>documentType}"}), this._oDocumentTypeInput,
                            new Label({text: "{i18n>purchasingOrg}"}), this._oPurchasingOrgInput,
                            new Label({text: "{i18n>purchasingGroup}"}), this._oPurchasingGroupInput,
                            new Label({text: "{i18n>currency}"}), this._oCurrencyInput,
                            new Table({
                                width: "100%",
                                headerToolbar: new Toolbar({content: [
                                    new Text({text: "{i18n>poItems}"}), new ToolbarSpacer(),
                                    new Button({text: "{i18n>addItem}", icon: "sap-icon://add", press: this._addPoItem.bind(this)})
                                ]}),
                                items: {path: "createItems>/items", template: new ColumnListItem({cells: [
                                    new Input({value: "{createItems>Matnr}", placeholder: "{i18n>material}", maxLength: 40}),
                                    new Input({value: "{createItems>Txz01}", placeholder: "{i18n>materialDescription}", maxLength: 40}),
                                    new Input({value: "{createItems>Werks}", placeholder: "{i18n>plant}", maxLength: 4}),
                                    new Input({value: "{createItems>Lgort}", placeholder: "{i18n>storageLocation}", maxLength: 4}),
                                    new Input({value: "{createItems>Menge}", placeholder: "{i18n>quantity}", type: "Number"}),
                                    new Input({value: "{createItems>Meins}", placeholder: "{i18n>quantityUnit}", maxLength: 3}),
                                    new Input({value: "{createItems>Netpr}", placeholder: "{i18n>netPrice}", type: "Number"}),
                                    new Button({icon: "sap-icon://decline", type: "Transparent", tooltip: "{i18n>removeItem}", press: this._removePoItem.bind(this)})
                                ]})},
                                columns: [
                                    new Column({header: new Text({text: "{i18n>material}"})}), new Column({header: new Text({text: "{i18n>itemDescription}"}), minScreenWidth: "Tablet", demandPopin: true}),
                                    new Column({header: new Text({text: "{i18n>plant}"}), minScreenWidth: "Tablet", demandPopin: true}), new Column({header: new Text({text: "{i18n>storageLocation}"}), minScreenWidth: "Tablet", demandPopin: true}),
                                    new Column({header: new Text({text: "{i18n>quantity}"})}), new Column({header: new Text({text: "{i18n>quantityUnit}"})}),
                                    new Column({header: new Text({text: "{i18n>netPrice}"}), minScreenWidth: "Tablet", demandPopin: true}), new Column({header: new Text({text: ""})})
                                ]
                            })
                        ]
                    }),
                    beginButton: new Button({text: "{i18n>save}", type: "Emphasized", press: this.onCreateOrder.bind(this)}),
                    endButton: new Button({text: "{i18n>cancel}", press: function () { this._oCreateDialog.close(); }.bind(this)})
                });
                this._oCreateDialog.setModel(this._oCreateItemsModel, "createItems");
                this.getView().addDependent(this._oCreateDialog);
            }
            this._oCreateItemsModel.setProperty("/items", []);
            this._addPoItem();
            this._oCreateDialog.open();
        },

        _addPoItem: function () {
            var aItems = this._oCreateItemsModel.getProperty("/items");
            aItems.push({Matnr: "", Txz01: "", Werks: "", Lgort: "", Menge: "", Meins: "", Netpr: ""});
            this._oCreateItemsModel.setProperty("/items", aItems);
        },

        _removePoItem: function (oEvent) {
            var sPath = oEvent.getSource().getBindingContext("createItems").getPath();
            var iIndex = Number(sPath.split("/").pop());
            var aItems = this._oCreateItemsModel.getProperty("/items");
            aItems.splice(iIndex, 1);
            this._oCreateItemsModel.setProperty("/items", aItems);
        },

        onCreateOrder: function () {
            var oPayload = {
                Bukrs: this._oCompanyCodeInput.getValue(),
                Lifnr: this._oSupplierInput.getValue(),
                Bsart: this._oDocumentTypeInput.getValue(),
                Ekorg: this._oPurchasingOrgInput.getValue(),
                Ekgrp: this._oPurchasingGroupInput.getValue(),
                Waers: this._oCurrencyInput.getValue(),
                Bedat: new Date().toISOString().slice(0, 10),
                ToItems: this._oCreateItemsModel.getProperty("/items")
            };
            if (!oPayload.Bukrs || !oPayload.Lifnr || !oPayload.Bsart || !oPayload.Ekorg || !oPayload.Ekgrp || !oPayload.Waers) {
                MessageBox.warning(this.getResourceBundle().getText("requiredFields"));
                return;
            }
            if (!oPayload.ToItems.length || oPayload.ToItems.some(function (oItem) {
                return !oItem.Matnr || !oItem.Txz01 || !oItem.Werks || !oItem.Lgort || !oItem.Menge || !oItem.Meins || !oItem.Netpr;
            })) {
                MessageBox.warning(this.getResourceBundle().getText("createOrderItemsRequired"));
                return;
            }
            this._oModel.create("/PurchaseOrderSet", oPayload, {
                success: function (oData) {
                    this._oCreateDialog.close();
                    this._oModel.refresh(true);
                    MessageToast.show(this.getResourceBundle().getText("orderCreated", [oData.Ebeln || ""]));
                }.bind(this),
                error: function (oError) {
                    MessageBox.error(this._getODataErrorMessage(oError, "createOrderDeepError"));
                }.bind(this)
            });
        },

        onOpenEditPurchaseOrder: function (oPurchaseOrder) {
            this._oEditPurchaseOrder = oPurchaseOrder;
            if (!this._oEditDialog) {
                this._oEditSupplierInput = new Input({maxLength: 10});
                this._oEditDocumentTypeInput = new Input({maxLength: 4});
                this._oEditPurchasingOrgInput = new Input({maxLength: 4});
                this._oEditPurchasingGroupInput = new Input({maxLength: 3});
                this._oEditCurrencyInput = new Input({maxLength: 5});
                this._oEditDialog = new Dialog({
                    title: this.getResourceBundle().getText("editPurchaseOrder"),
                    contentWidth: "25rem",
                    content: new VBox({class: "sapUiSmallMargin", items: [
                        new Text({id: this.getView().createId("editPoNumber")}),
                        new Label({text: "{i18n>supplier}"}), this._oEditSupplierInput,
                        new Label({text: "{i18n>documentType}"}), this._oEditDocumentTypeInput,
                        new Label({text: "{i18n>purchasingOrg}"}), this._oEditPurchasingOrgInput,
                        new Label({text: "{i18n>purchasingGroup}"}), this._oEditPurchasingGroupInput,
                        new Label({text: "{i18n>currency}"}), this._oEditCurrencyInput
                    ]}),
                    beginButton: new Button({text: "{i18n>save}", type: "Emphasized", press: this.onUpdatePurchaseOrder.bind(this)}),
                    endButton: new Button({text: "{i18n>cancel}", press: function () { this._oEditDialog.close(); }.bind(this)})
                });
                this.getView().addDependent(this._oEditDialog);
            }
            this.byId("editPoNumber").setText(this.getResourceBundle().getText("poSelected", [oPurchaseOrder.Ebeln]));
            this._oEditSupplierInput.setValue(oPurchaseOrder.Lifnr);
            this._oEditDocumentTypeInput.setValue(oPurchaseOrder.Bsart);
            this._oEditPurchasingOrgInput.setValue(oPurchaseOrder.Ekorg);
            this._oEditPurchasingGroupInput.setValue(oPurchaseOrder.Ekgrp);
            this._oEditCurrencyInput.setValue(oPurchaseOrder.Waers);
            this._oEditDialog.open();
        },

        onUpdatePurchaseOrder: function () {
            var oPayload = {
                Lifnr: this._oEditSupplierInput.getValue(),
                Bsart: this._oEditDocumentTypeInput.getValue(),
                Ekorg: this._oEditPurchasingOrgInput.getValue(),
                Ekgrp: this._oEditPurchasingGroupInput.getValue(),
                Waers: this._oEditCurrencyInput.getValue()
            };
            if (!oPayload.Lifnr || !oPayload.Bsart || !oPayload.Ekorg || !oPayload.Ekgrp || !oPayload.Waers) {
                MessageBox.warning(this.getResourceBundle().getText("requiredFields"));
                return;
            }
            this._oModel.update("/PurchaseOrderSet('" + this._oEditPurchaseOrder.Ebeln + "')", oPayload, {
                success: function () {
                    this._oEditDialog.close();
                    this._oModel.refresh(true);
                    MessageToast.show(this.getResourceBundle().getText("purchaseOrderUpdated"));
                }.bind(this),
                error: function (oError) { MessageBox.error(this._getODataErrorMessage(oError, "updateOrderError")); }.bind(this)
            });
        },

        onOpenGoodsReceipt: function (sPurchaseOrder) {
            var oPreselectedItem = typeof sPurchaseOrder === "string" ? {Ebeln: sPurchaseOrder, Ebelp: ""} :
                (sPurchaseOrder && sPurchaseOrder.Ebeln ? sPurchaseOrder : {Ebeln: "", Ebelp: ""});
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
            this._oGrPoInput.setValue(oPreselectedItem.Ebeln);
            this._oGrItemInput.setValue(oPreselectedItem.Ebelp);
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
                error: function (oError) { MessageBox.error(this._getODataErrorMessage(oError, "goodsReceiptError")); }.bind(this)
            });
        },

        _getODataErrorMessage: function (oError, sFallbackKey) {
            try {
                var oResponse = JSON.parse(oError.responseText);
                return oResponse.error && oResponse.error.message && oResponse.error.message.value ?
                    oResponse.error.message.value : this.getResourceBundle().getText(sFallbackKey);
            } catch (oException) {
                return this.getResourceBundle().getText(sFallbackKey);
            }
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        }
    });
});
