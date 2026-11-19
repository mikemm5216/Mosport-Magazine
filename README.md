# MOSPORT — More than sport

MOSPORT Magazine 有兩個產品角色：**A 生成文章；B 把 feature 驗證做成媒體／創作者的賽前預測內容。** 這裡的 A／B 是產品角色，與 Mosport-NBA／Mosport-Magazine 的 repository A／B 分工不同。NBA 先行，沿用 Today、Schedule、Match Detail 與 Review。

## 目前方向：2–3 週內完成 Beta-0 真資料閉環

最新 Founder 決定將 **Beta-0 目標設為自 2026-11-19 起 2–3 週，即 12/03–12/10**。這是目標窗口，不是已啟用排程或工期保證。第一版只要求：真實 schedule 或誠實 missing、至少一場真正未來比賽的持久化賽前 snapshot、Magazine 呈現該 snapshot 或明確 missing，以及賽後以同一 game ID 對上官方結果。少數現有 feature 即可，沒有 World 勝率也可以。

**底層至少一筆真 snapshot 與官方結果的證據不可由 missing 取代。** Beta-0 不要求 T−15 雙鎖、多 feature、角色 B 或完整文章流程。Beta-0 真資料跑過且已上線後，Beta-1 才接續 INITIAL／T−15 FINAL、更多 feature 與角色 B；角色 A 可獨立使用已合格來源產文，不新增為 Beta-0 必需條件。

Beta-0 上線前，Research 僅修補能直接解除 Launch 缺口的既有實作，**不新增 feature calculator 或模型實驗**。203 項清單保留，但此階段不再並行擴寫。Launch／Research 是工作線，不增加部門。

角色 A 根據合格來源生成真正可讀的新聞、分析與專題，適用時引用 World。角色 B 讓讀者看到有名字與觀點的 MOSPORT 專欄／創作者預測：看好誰、為什麼、何時發出、過去表現如何；後台將每個角色版本綁定 feature 假設、固定預測規則與實驗紀錄。研究預測可以與正式 World 不同，不必先被 World 採納才能測試。

正式 World 仍是唯一官方賽事判讀來源，首頁每場一個「官方主勝率」槽位；另設的媒體／創作者卡片可以並列不同觀點，不受這個數字槽位限制。預測計算由 NBA 研究服務按版本化規則執行，Magazine 生成表述；只有 pick 的研究不補百分比。角色名稱採 MOSPORT 自有專欄／創作者設定，方法與來源可查閱。後續完整 MVP 的 Coach Arena、影音與通用 World Engine 能力繼續保留。

Magazine 在既有 MEDIA 責任內擔任產品 owner，自排文章、reader flow 與驗收，不必等待完整版 World；共用 API 與數值仍由 NBA 提供，工作同受 Beta-0 範圍及容量限制。先前將雙角色首版與整合預測 Beta 同時列為 M2 的排序已被 Beta-0／Beta-1 取代，兩個產品角色本身保留。

球員評分共用現有 feature 與 World Engine 的正式球員價值：Magazine 呈現及解釋這份分數，Fantasy 後續以同一份價值紀錄作價格依據。這不是另外一套得分／助攻加減分規則；具體換價方式尚未定義，Fantasy 不是 Beta-0／Beta-1 前置條件。

每個 Launch PR 必填 **Existing Implementation Check**：searched、found、reuse／why not reused；缺漏或空泛不能 ready／merge。Capacity／Control 在派出新任務前只讀檢查該紀錄、預估消耗／上限／quota 與 Launch 優先衝突，有開工否決權；無 ALLOW 不開始寫 code。QA 內的 Boundary／Anti-Duplication 角色在開 PR 前檢查 EIC，於 review 阻擋重複實作。Founder 按實際影響採 L0 委派審查、L1 摘要與關鍵 diff、L2 親決；[AGENTS](AGENTS.md) 與 [PR template](.github/pull_request_template.md) 記錄具體要求。

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

**架構更新優先順序：**10/28 原文快照保留不改寫；其中 C-1 的 `PMV → TMV` 舊文字，已由 [NBA #59](https://github.com/mikemm5216/Mosport-NBA/issues/59) 與 [#72 記錄的後續 Founder 決策](https://github.com/mikemm5216/Mosport-NBA/pull/72) 修正為 **PMV 與 TMV 獨立，World 整合兩者及環境**。11/19 的文章／feature 驗證雙角色是產品方向；同日最新 Beta-0／Beta-1 與容量／防重複／分級決策取代早先雙角色首版及 203 並行政策。World 唯一官方判讀、官方主槽單一數字、公開 Review 人工核准及既有品牌視覺規則繼續有效。

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
