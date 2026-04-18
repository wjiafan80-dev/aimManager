# AI 工具管理系統

用來集中管理 AI 工具授權、使用人員、成本報表與單位成熟度，適合做內部治理與主管簡報展示。

## 目前重點

- 首頁直接呈現主管最關心的指標與風險
- 報表頁補上高成本工具、閒置授權、近期到期清單
- 內建展示資料模式，正式資料失敗時仍可 demo

## 開發

```bash
npm install
npm run dev
```

## 環境變數

建立 `.env` 並填入：

```bash
VITE_GAS_URL=你的 Google Apps Script Web App URL
VITE_GOOGLE_CLIENT_ID=你的 Google OAuth Client ID
```

## Demo 建議

- 明天對主管展示時，優先看 `儀表板`、`費用報表`、`AI 成熟度評估`
- 如果正式資料一時載入失敗，可直接切換成 `展示資料`
