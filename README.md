# MOSPORT — More than sport

MOSPORT Magazine 有兩個產品角色：**A 生成文章；B 把 feature 驗證做成媒體／創作者的賽前預測內容。** 這裡的 A／B 是產品角色，與 Mosport-NBA／Mosport-Magazine 的 repository A／B 分工不同。NBA 先行，沿用 Today、Schedule、Match Detail 與 Review。

## 目前方向：先上線 NBA 預測 Beta，再用真實賽事持續驗證

2026-11-19 的首版同時交付兩條路徑：**合格新聞／事實 → 生成文章 → 發布**，以及 **feature 假設與固定規則 → 研究計算 → 持久化鎖定 → 媒體／創作者預測發布 → 官方結果 → 驗證**。第一篇真實文章與第一個可結算的角色預測並行實作，203 項特徵研究持續進行，不等全部驗證完或先證明實驗有效才上線。

角色 A 根據合格來源生成真正可讀的新聞、分析與專題，適用時引用 World。角色 B 讓讀者看到有名字與觀點的 MOSPORT 專欄／創作者預測：看好誰、為什麼、何時發出、過去表現如何；後台將每個角色版本綁定 feature 假設、固定預測規則與實驗紀錄。研究預測可以與正式 World 不同，不必先被 World 採納才能測試。

正式 World 仍是唯一官方賽事判讀來源，首頁每場一個「官方主勝率」槽位；另設的媒體／創作者卡片可以並列不同觀點，不受這個數字槽位限制。預測計算由 NBA 研究服務按版本化規則執行，Magazine 生成表述；只有 pick 的研究不補百分比。角色名稱採 MOSPORT 自有專欄／創作者設定，方法與來源可查閱。後續完整 MVP 的 Coach Arena、影音與通用 World Engine 能力繼續保留。

M2 分別記錄兩項交付：**Magazine 雙角色 Beta** 可先發布已合格的文章與角色 B 預測，完成賽前鎖定、發布及官方結算；**NBA 整合預測 Beta** 另須正式 World 數值、INITIAL／T−15 FINAL 與其公開閉環。正式 World 尚未合格，不阻擋已具自身發布資格的 A／B；Magazine 先完成也不代表整合 World 已完成。這是同一 roadmap 的範圍記錄，不新增 gate。

- [當前 roadmap、工作包與完成標準](docs/ROADMAP.md)
- [跨 repo 契約：文章、官方 World 與研究預測](docs/P2_CONTRACT_COMPATIBILITY.md)
- [2026-11-19 計畫與實際狀態，OPEN](docs/reports/2026-11-19-LAUNCH-FIRST-PLAN-VS-ACTUAL.md)
- [Magazine 文件 PR #20](https://github.com/mikemm5216/Mosport-Magazine/pull/20)／[執行 issue #19](https://github.com/mikemm5216/Mosport-Magazine/issues/19)／[NBA 方向 issue #170](https://github.com/mikemm5216/Mosport-NBA/issues/170)
- [共同主架構與 roadmap：NBA PR #73](https://github.com/mikemm5216/Mosport-NBA/pull/73)，沿用 `docs/architecture/WORLD_ENGINE_MASTER_ROADMAP.md`；本 repo 負責消費端與產品落地，不建立另一套 World 架構。

**可驗證基線：**本次文件以 `main@e4874cba32a7f91c110167bc3ea9e5f779294ed1` 為準。公開頁仍是 DEMO 原型；真實 A v1 封包只在內部 inspector 驗證，不能發布勝率。本次文件更新不代表數值公開契約、雲端傳輸、部署或發布驗收已完成。

## 規格與決策來源

- [Agent 規則](AGENTS.md)
- [Founder 原文與視覺母版](docs/founder/2026-10-28-spec-lock/)及[同日後續決議](docs/FOUNDER_FOLLOWUP_20261028.md)
- [圖片插槽與素材替換](docs/ASSET_SLOTS.md)
- [B-owned 內容契約](docs/contracts/B_CONTRACTS_V1.md)

**架構更新優先順序：**10/28 原文快照保留不改寫；其中 C-1 的 `PMV → TMV` 舊文字，已由 [NBA #59](https://github.com/mikemm5216/Mosport-NBA/issues/59) 與 [#72 記錄的後續 Founder 決策](https://github.com/mikemm5216/Mosport-NBA/pull/72) 修正為 **PMV 與 TMV 獨立，World 整合兩者及環境**。11/19 Founder 進一步明確指定 Magazine 的文章／feature 驗證雙角色，取代先前將它縮成 World 展示頁與 Challenger 表格的解讀。World 唯一官方判讀、官方主槽單一數字、公開 Review 人工核准及既有品牌視覺規則繼續有效。

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
