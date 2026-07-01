# Scrape Movie

電影資料收集工作台。基於 Next.js 建置，從多個來源爬取並展示電影資訊，支援分類篩選、分頁瀏覽與 REST API。
## Demo網址:https://scrape-movie-web.vercel.app/

## 功能

- **多來源切換** - 在 Scrape Center 與 @movies 開眼電影網之間切換
- **分類篩選** - 依電影類別（剧情 / 喜剧 / 动作等）快速過濾
- **模式切換** - @movies 提供本周新片 / 本期首輪 / 近期上映三種視圖
- **分頁瀏覽** - 每頁 10 筆，含完整頁碼導航
- **電影卡片** - 顯示海報、片名、分類標籤、片長、上映日期與評分
- **REST API** - `/api/movies` 提供 JSON 格式的電影資料端點
- **客服機器人** - 右下角浮動問答助手，可查分頁、分類與 API 用法

## 技術棧

| 類別 | 技術 |
|----------|------------|
| 框架 | Next.js 15 (App Router) |
| 介面 | React 19 + Tailwind CSS 3.4 + shadcn/ui |
| 圖示 | lucide-react |
| 語言 | TypeScript 5.7 |
| 爬取 | Node.js `https` 模組（僅伺服器端） |
| 套件 | npm workspaces (monorepo) |

## 專案結構

```
scrape_movie/
  apps/
    web/
      src/
        app/
          api/movies/           GET /api/movies 端點
          globals.css           Tailwind + 設計令牌
          layout.tsx            根佈局
          page.tsx              主儀表板頁面
        components/
          ui/                   Button / Card / Badge (shadcn)
          customer-chatbot.tsx  浮動客服對話框
        lib/
          scrapers/             爬取邏輯 (atmovies / scrape-center / types)
          utils.ts              cn() 工具函式
      tailwind.config.ts
      components.json           shadcn/ui 設定
      package.json
  package.json                  工作區根目錄
  .gitignore
```

## 快速開始

```bash
npm install
npm run dev
```

瀏覽器開啟 http://localhost:3000。

## 指令

| 指令 | 說明 |
|---------|-------------|
| `npm run dev` | 啟動開發伺服器（含 HMR） |
| `npm run build` | 生產環境建置 |
| `npm run lint` | ESLint 檢查 |
| `npm run typecheck` | TypeScript 型別檢查 |

## API

### GET /api/movies

| 參數 | 類型 | 說明 | 預設值 |
|-------|------|-------------|---------|
| `source` | string | 資料來源 (`scrape-center` 或 `atmovies`) | `scrape-center` |
| `page` | number | 頁碼 | `1` |
| `category` | string | 分類篩選（僅 Scrape Center） | -- |
| `view` | string | @movies 模式 (`new`、`now`、`next`) | `new` |

範例：

```
GET /api/movies?source=atmovies&view=now
GET /api/movies?page=2&category=剧情
```

## 資料來源

| 來源 | 網址 | 模式 |
|--------|-----|-------|
| Scrape Center | https://ssr1.scrape.center | 分類瀏覽 |
| @movies 開眼電影網 | https://www.atmovies.com.tw | new / now / next |

> 本專案僅爬取公開頁面的電影基本資訊，並於每筆資料保留原始頁面連結。
