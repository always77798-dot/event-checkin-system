# GAS 橋接部署草稿

目前本機原型仍使用 `localStorage`。第 5 步先補上橋接材料與權限模型：

- `gas-adapter.js`：前端呼叫 `google.script.run` 的 async adapter 草稿。
- `gas/Code.gs`：Apps Script 後端範本，提供設定、名單、簽到、清空紀錄、備份還原等函式。

## Token 權限模型

正式網址建議使用：

```text
checkin.html?code=簽到驗證碼
host.html?token=主持人權杖
admin.html?token=管理者權杖
```

後端規則：

- 來賓簽到：檢查活動是否開放與 `authCode`。
- 主持人操作：檢查 `hostToken` 或 `adminToken`。
- 管理操作：只接受 `adminToken`。

## 下一個整合點

目前 `app.js` 已改成可切換資料服務：

```js
window.gasDataService && google.script.run -> GAS
otherwise -> localStorage
```

所以部署到 Apps Script 後，只要 `gas-adapter.js` 載入且 `google.script.run` 存在，就會改用 GAS/試算表。`localStorage` 會變成本機預覽 fallback。

## GAS 檔案建議

Apps Script 專案可以包含：

- `Code.gs`：使用 `gas/Code.gs`。
- `admin.html`：管理頁。
- `host.html`：主持人頁。
- `checkin.html`：來賓簽到頁。
- `styles.html`：放 `styles.css` 內容。
- `app.html`：放 `app.js` 內容。
- `gas-adapter.html`：放 `gas-adapter.js` 內容。

HTML 內可用 Apps Script template include：

```html
<?!= include('styles'); ?>
<?!= include('gas-adapter'); ?>
<?!= include('app'); ?>
```

或先維持外部靜態檔預覽，等要正式部署時再轉成 GAS HTML。

## GAS 後端函式

`gas/Code.gs` 目前提供：

- `getAppState()`
- `saveSettings(settings)`
- `importGuests(guests)`
- `addGuest(guest)`
- `submitCheckin(record)`
- `clearRecords()`
- `replaceAll(nextState)`
- `resetDemoData()`

它會使用目前綁定試算表中的：

- `Settings`
- `GuestList`
- `CheckIn`

簽名圖會存到 Drive 的 `活動簽名檔/簽名檔_活動名稱`。
