# MOSPORT — More than sport

MOSPORT Magazine 是讀者介面與媒體編輯產品。NBA 先行，提供 Today、Schedule、Match Detail 與 Review；所有賽事模型判讀均由 Mosport-NBA 的 World Engine 產生，Magazine 唯讀呈現。

## 目前方向：先上線 NBA 預測 Beta，再用真實賽事持續驗證

2026-11-19 的優先順序是完成一條真實閉環：**賽前資料 → World INITIAL／T−15 FINAL → Magazine → 官方賽果 → 經核准的 Review**。203 項特徵與新特徵研究持續並行，不再作為第一版上線的前置條件。後續完整 MVP 仍包括 Coach Arena、合格 Media 內容與長期 World Engine 能力，並未刪除。

首頁維持每場一個合格主勝率。實驗模型由 World／Research 計算，在 Match Detail／Review 清楚標示與分開計分；Magazine 不自行產生機率，也不因幾場命中就自動升版。

- [當前 roadmap、工作包與完成標準](docs/ROADMAP.md)
- [A→B 契約：現有 v1 與公開版設計範圍](docs/P2_CONTRACT_COMPATIBILITY.md)
- [2026-11-19 計畫與實際狀態，OPEN](docs/reports/2026-11-19-LAUNCH-FIRST-PLAN-VS-ACTUAL.md)
- [Magazine 執行 issue #19](https://github.com/mikemm5216/Mosport-Magazine/issues/19)／[NBA 方向 issue #170](https://github.com/mikemm5216/Mosport-NBA/issues/170)
- [共同主架構與 roadmap：NBA PR #73](https://github.com/mikemm5216/Mosport-NBA/pull/73)，沿用 `docs/architecture/WORLD_ENGINE_MASTER_ROADMAP.md`；本 repo 負責消費端與產品落地，不建立另一套 World 架構。

**可驗證基線：**本次文件以 `main@e4874cba32a7f91c110167bc3ea9e5f779294ed1` 為準。公開頁仍是 DEMO 原型；真實 A v1 封包只在內部 inspector 驗證，不能發布勝率。本次文件更新不代表數值公開契約、雲端傳輸、部署或發布驗收已完成。

## 規格與決策來源

- [Agent 規則](AGENTS.md)
- [Founder 原文與視覺母版](docs/founder/2026-10-28-spec-lock/)及[同日後續決議](docs/FOUNDER_FOLLOWUP_20261028.md)
- [圖片插槽與素材替換](docs/ASSET_SLOTS.md)
- [B-owned 內容契約](docs/contracts/B_CONTRACTS_V1.md)

**架構更新優先順序：**10/28 原文快照保留不改寫；其中 C-1 的 `PMV → TMV` 舊文字，已由 [NBA #59](https://github.com/mikemm5216/Mosport-NBA/issues/59) 與 [#72 記錄的後續 Founder 決策](https://github.com/mikemm5216/Mosport-NBA/pull/72) 修正為 **PMV 與 TMV 獨立，World 整合兩者及環境**。World 唯一判讀、首頁單一主數字、公開 Review 人工核准、既有品牌與視覺規則繼續有效。

## 本機原型

以瀏覽器開啟 `site/index.html`。目前靜態原型沒有 build step；需要讀取本機 JSON 時須以 HTTP 提供檔案。這個開發方式不代表正式 runtime 依賴開發者電腦；目標是可持續運作的雲端服務。

| URL 參數 | 效果 |
|---|---|
| `?lang=en` | 英文版；品牌字樣維持一致 |
| `?theme=dark` | 深色模式，亦會記住切換結果 |
| `?fixture=empty` | 沒有合格內容時移除版位 |
| `?fixture=bypass` / `bypass2` | 未核准、錯誤核准或借用核准，不應呈現 |
| `?fixture=invalid` / `dupid` / `live` | 不支援的 schema、重複 ID、以原型資料製作 LIVE issue，整份拒絕 |
| `?fixture=badtime` / `stale` / `staleapproval` / `retracted` / `slotmismatch` | 時間、有效期限、核准版本、撤回與版位錯配案例 |
| `?fixture=longtitle` / `xss` / `loadfail` | 長標題、文字安全與 provider 失敗案例 |
| `?issue=<name>` | 載入 `data/issues/<name>.json`；僅供以 HTTP 提供的原型 |
| `?slots=1` | 顯示圖片插槽識別、狀態、版本與原因 |
| `?art=fallback` | 預覽素材 fallback，版面不得跳動 |
| `?art=candidate` | 預覽待核准 CANDIDATE 美術；僅限原型 |
| `?zoom=fit` / `?zoom=120` | 桌面閱讀縮放，跨頁保留 |
| `?mode=production` | 測試 production 呈現政策，拒絕 DEMO 與 placeholder art；不是可信發布權限 |

公開原型展示的內容均為 **DEMO**：可使用真實隊名，但判讀與故事是虛構測試內容。

## 測試

需要 Node 18+。第一次使用：

```sh
npm install
npm run setup:browsers
```

執行既有完整檢查：

```sh
npm test
```

測試輸出與瀏覽器截圖須分別核對；通過原型測試不等於公開發布驗收。

## 其他素材

[asset-catalog.html](site/asset-catalog.html) 保留既有素材庫；[CPBL／旗幟來源與驗證](docs/reports/2026-10-28-cpbl-flags/README.md) 可供查核。素材存在不代表該運動已具備資料、World 模型或上線資格；本輪仍為 NBA 先行。
