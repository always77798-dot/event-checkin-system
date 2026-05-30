# Cloudflare Pages + D1 部署指南

這份專案已改成 Cloudflare 架構：

- 前端：Cloudflare Pages
- 後端 API：Cloudflare Pages Functions
- 資料庫：Cloudflare D1
- 正式網域建議：`checkin.pysentia.com` 或 `event.pysentia.com`

## 1. 推到 GitHub

在本機專案資料夾執行：

```powershell
cd C:\Users\alway\Documents\Codex\2026-05-30\google-gas
git init
git branch -M main
git add .
git commit -m "Build Cloudflare D1 event check-in system"
git remote add origin https://github.com/你的帳號/event-checkin-system.git
git push -u origin main
```

## 2. 建立 Cloudflare Pages / Workers 專案

1. 進入 Cloudflare Dashboard。
2. 開啟 `Workers & Pages`。
3. 點 `Create application`。
4. 選 `Pages` 或以 Cloudflare 自動偵測的 Workers + Assets 模式部署。
5. 選 `Connect to Git`。
6. 選你的 GitHub repo。
7. 設定：

```text
Framework preset: None
Build command: 留空
Build output directory: .
Production branch: main
```

8. 點 `Save and Deploy`。

如果第一次部署出現「Missing entry-point to Worker script or assets directory」之類錯誤，先不用重建專案。請繼續完成 D1 建立，然後把最新版 repo 推上 GitHub；目前專案已包含 `src/index.js`、`[assets]` 與 `.assetsignore`，可支援 Cloudflare 的 Workers + Assets 部署流程。

## 3. 建立 D1 資料庫

1. 在 Cloudflare Dashboard 進入 `Workers & Pages`。
2. 找到 `D1 SQL Database`。
3. 點 `Create database`。
4. 建議資料庫名稱：

```text
event-checkin-system
```

5. 建立後，Cloudflare 會顯示 database id。
6. 把 `wrangler.toml` 內這行換成你的 database id。這一步完成前，不要急著重新部署，因為 placeholder id 不能連到真正資料庫：

```toml
database_id = "replace-with-cloudflare-d1-database-id"
```

## 4. 匯入資料表 schema

在 D1 資料庫頁面找到 `Console` 或 `Query`，把 `schema.sql` 的內容貼上執行。

本機檔案位置：

```text
C:\Users\alway\Documents\Codex\2026-05-30\google-gas\schema.sql
```

執行成功後，D1 會建立：

```text
settings
guests
records
audit_logs
```

## 5. 綁定 D1 到 Pages

1. 回到你的 Pages 專案。
2. 進入 `Settings`。
3. 找到 `Functions`。
4. 找到 `D1 database bindings`。
5. 新增 binding：

```text
Variable name: DB
D1 database: event-checkin-system
```

6. 儲存。
7. 重新部署 Pages。

## 6. 第一次登入管理頁

部署完成後，先進：

```text
https://你的pages網址/admin.html?token=admin-change-me
```

進入後立刻重新產生：

```text
簽到驗證碼
主持人權杖
管理者權杖
```

然後按 `儲存`。

之後請改用頁面產生的新管理者連結。

## 7. 綁定 pysentia.com 子網域

建議正式網址：

```text
https://checkin.pysentia.com
```

Cloudflare Pages 設定方式：

1. 進入 Pages 專案。
2. 點 `Custom domains`。
3. 點 `Set up a custom domain`。
4. 輸入：

```text
checkin.pysentia.com
```

5. 如果 `pysentia.com` 已經在同一個 Cloudflare 帳號，Cloudflare 通常會自動建立 DNS。
6. 等狀態變成 `Active`。

正式連結就會變成：

```text
https://checkin.pysentia.com/checkin.html?code=你的簽到驗證碼
https://checkin.pysentia.com/host.html?token=你的主持人權杖
https://checkin.pysentia.com/admin.html?token=你的管理者權杖
```

## 8. 目前限制

目前簽名圖會先以 base64 文字存在 D1 簽到紀錄內。這對小型活動最簡單、免費、好部署。

如果未來活動人數很多，建議下一階段改成：

```text
簽名圖片存 Cloudflare R2
簽到紀錄存 D1
```
