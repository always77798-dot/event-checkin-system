# 部署指南

## 建議架構

目前最穩的正式部署方式是：

- GAS Web App：正式簽到系統，負責前端頁面、試算表、Drive 簽名圖、token 權限。
- GitHub：保存原始碼與版本。
- Cloudflare Pages：發布靜態展示頁、說明頁或純前端預覽版。

原因：`google.script.run` 只能在 Apps Script 的 HtmlService 頁面內使用。若要讓 Cloudflare Pages 成為正式前端，就需要把 GAS 改成 HTTP JSON API，並額外處理 CORS、token、錯誤回應與安全性。

## GAS 部署

1. 到目標 Google 試算表，開啟「擴充功能」->「Apps Script」。
2. 建立或替換下列檔案：
   - `Code.gs`：使用 `gas/Code.gs`
   - `appsscript.json`：使用 `gas/appsscript.json`
   - `admin.html`：使用 `gas/admin.html`
   - `host.html`：使用 `gas/host.html`
   - `checkin.html`：使用 `gas/checkin.html`
   - `styles.html`：使用 `gas/styles.html`
   - `gas-adapter.html`：使用 `gas/gas-adapter.html`
   - `app.html`：使用 `gas/app.html`
3. 儲存專案。
4. 部署為 Web App。
5. 第一次進入管理頁：
   ```text
   WebAppURL?page=admin&token=admin-change-me
   ```
6. 進入後立刻重新產生：
   - 簽到驗證碼
   - 主持人權杖
   - 管理者權杖
7. 儲存設定，再使用管理頁產生的新連結。

## GitHub

```powershell
git init
git add .
git commit -m "Initial activity check-in system prototype"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPO.git
git push -u origin main
```

## Cloudflare Pages

1. 到 Cloudflare Pages 建立專案。
2. 連接 GitHub repository。
3. Framework preset 選 None 或 Static HTML。
4. Build command 留空。
5. Output directory 使用專案根目錄 `/`。
6. 部署完成後，Cloudflare 會提供一個 Pages 網址。

## 重要提醒

Cloudflare Pages 上的版本只能作為靜態預覽。正式簽到請使用 GAS Web App 連結，否則無法直接使用 `google.script.run` 讀寫試算表。
