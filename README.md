# 活動簽到退系統

這是獨立網站化的活動簽到退系統。現在支援兩種模式：

- 本機用 `file://` 開啟時，使用瀏覽器 `localStorage` 方便預覽。
- 正式部署到 Cloudflare Pages 時，使用 Pages Functions + D1 作為後端。

## 開啟方式

直接用瀏覽器開啟入口頁：

```text
C:\Users\alway\Documents\Codex\2026-05-30\google-gas\index.html
```

目前拆成三個入口：

- `checkin.html`：來賓簽到頁。
- `host.html`：主持人後台。
- `admin.html`：管理設定頁。

正式部署時，`checkin.html` 與 `host.html` 不顯示入口返回；只有管理端可進入入口頁。真正上線時仍需加上後端權限控管，避免只靠前端隱藏連結。

## 目前功能

- 來賓簽到頁：單位、職稱、姓名、彈性欄位、簽名板。簽到頁不顯示應到、實到、出席率等後台統計。
- 主持人頁：應到、實到、未到、出席率、重複簽到數、名單搜尋、狀態篩選、手動簽到。
- 主持人頁：簽到流水紀錄、非名單標示與簽名檔預覽。
- 設定頁：活動名稱、模式、主題色、必填欄位、隱藏欄位、驗證碼、彈性欄位。必填/隱藏欄位使用勾選設定。
- 活動控制：管理頁可開放/關閉簽到，並重新產生驗證碼使舊 QR Code 失效。
- 權限連結：主持人頁與管理頁使用不同 token。Cloudflare 版會在後端檢查 token。
- 發布連結：管理頁會依驗證碼產生簽到網址、主持人網址與 QR Code。
- 名單匯入：管理頁可貼上 CSV/TSV 三欄資料，批次建立來賓名單。
- 清空紀錄：管理頁可清空目前簽到流水紀錄，保留活動設定與名單。
- 匯出 CSV：依目前名單與簽到狀態產生報到名單。
- 備份還原：管理頁可匯出/還原完整 JSON，包含設定、名單、簽到紀錄與簽名圖。

## Cloudflare 後端

Cloudflare 版已新增：

```text
functions/api/*
functions/_lib/data.js
schema.sql
wrangler.toml
```

主要 API：

```text
GET  /api/state
POST /api/settings
POST /api/guests
POST /api/guests/import
POST /api/checkin
POST /api/manual-checkin
POST /api/records/clear
POST /api/replace-all
GET  /api/export.csv
```

部署流程請看：

```text
CLOUDFLARE_D1_GUIDE.md
```

舊版 GAS 檔案仍保留在 `gas/`，但正式版建議改走 Cloudflare。
