本任務須遵守 Issue #170 的 Capacity / Boundary / Level 規則與 Beta-0 範圍。

# Magazine 入口文案 — 額外一輪，2026-11-19

本輪把入口改成讀者看得懂的體育雜誌文字，保留封面、TODAY 主卡、其他比賽與賽後檢討。這是原 PR #21 的延續。Founder 明確要求「再加一輪」，並要求實際學習先前提供的分析文章。

## 執行與權限

- [Issue #170 Current execution policy](https://github.com/mikemm5216/Mosport-NBA/issues/170#current-execution-policy)：updated_at `2026-11-19T07:32:46Z`；開工前已讀，收尾重新取得並於 `2026-11-19T10:19:13Z` 記錄仍為同版。
- Impact **L1**：首頁／缺內容狀態的顯示文案；包含既有 DEMO 示例文章與靜態證據工具修正。
- Implementer / integration：`/root`；independent reviewer：`/root/boundary_review`；read-only state helper：`/root/magazine_state`。
- Capacity ALLOW：`/root/boundary_review` 於 `2026-11-19T09:59:13Z` 核准一輪 bounded L1 copy/evidence，75 tool groups / 45k tokens / 35 minutes，上限 `2026-11-19T10:34:13Z`。quota / reset / token balance **UNKNOWN**；工具可用不代表額度足夠。遇到範圍、HEAD 衝突或額度上限停止。
- 前一輪 2/2 的用量紀錄保留；本次是 Founder 新增的一輪，未重設舊紀錄。
- 無 merge、公開部署、新付費服務或新 runtime 授權。PR 維持 Draft。

## Existing Implementation Check

**Searched.** 遠端 PR #21、branch `beta0/171-schedule-context-template`、base HEAD `c1b19c42968914dea1dbf959c2233a5cfb32136f`、tree `5e1724b5b17c4bd118efee2f2e7e9faf87836c2c`；本機以 `rg`、`git diff` 檢查 `site/js/pages/home.js`、`site/js/app.js`、`site/js/i18n.js`、`site/js/pages/review.js`、既有 fixture、unit/e2e/static 工具與 Founder 視覺基準。沒有另開首頁 PR。

**Found.** 原首頁已具有封面與 TODAY 結構，但 shared helper、missing 文案、game ID／UTC、DEMO 導言仍帶有系統說明。原 `evidence.js` 的裸首頁 URL 現在會走 saved default；應明確選 DEMO。既有 WeasyPrint 工具對巢狀 grid/flex 寬度的轉譯使主卡與其他比賽文字重疊。

**Reuse.** 延用原首頁 renderer、shared helper（新增首頁 reader 選項）、i18n、DEMO fixture、review empty 分支、原 unit/e2e/static 工具；沒有未重用的適用實作，沒有第二套 provider、calculator、registry 或資料流程。原工作目錄沒有改寫。隔離工作目錄先以遠端 1,103 個 blob 的 Git hash 全數比對一致，再從同一 base 編修；遠端提交使用真正的 c1b19c4 parent。

## 文案決策

| 位置 | 本輪文字／處理 |
| --- | --- |
| 封面導語 | 賽前看局勢。場上看變化。賽後看關鍵。 |
| 真實場次封面 | 國王 @ 湖人；既有開賽時間；缺判讀時誠實說明 |
| 賽前 missing | 這場的賽前判讀還沒出來。 |
| 賽後 missing | 這一期的賽後檢討還沒出來。 |
| 讀取失敗 | 這一期暫時打不開。請稍後再試。 |
| 未發布 | 這一期尚未發布。 |
| 過期 | 這一期的判讀已不適用。請查看最新賽程。 |
| 零場次 | 這一天暫無賽程。 |
| TODAY 沒有判讀 | 本期暫無賽前判讀。先看賽程。 |
| 首頁有場地資料 | 只陳述主場／中立場地事實，標題「比賽資訊」，不把場地事實說成已發布分析 |
| 資料註記 | 保留 NBA 來源連結與「非即時更新」；首頁不展示 game ID、UTC 或內部版本欄位 |

英文同步調整。入口不再解釋 World、Evidence、External、snapshot、receipt、公開資格或分層。原視覺基準中的「三層內容分開看」不帶入入口。封面或 TODAY 無內容時省略無內容區塊；既有詳情頁的資料追溯保留。

## 實際讀過的參考文章

本輪重新取得原文，學習切入與鋪陳；沒有搬用文章內容作為 NBA 場次事實。

1. [SportsVision：獵鷹客場踢館，高國豪助陣](https://www.sportsv.net/articles/129211)（2026-10-25）：標題先給對戰看點，內文用比賽轉折串起數字與人物說法。
2. [報導者：WBC 台灣三大捕手解析單膝蹲捕](https://www.twreporter.org/a/data-reporter-2026-wbc-team-taiwan-one-knee-down-catching-stance)（2026-03-04）：先問讀者能理解的問題，再說技術、證據與限制。
3. [報導者：大數據揭開全壘打祕密](https://www.twreporter.org/a/data-reporter-2026-wbc-team-taiwan-home-run)（2026-03-03）：先有可感知的比賽畫面，再解釋數字意味什麼。

對應到既有 **DEMO**：封面改為「湖勇交手，傷兵牽動戰局」與「勇士新陣容，變化在哪裡？」；主卡用勇士背靠背、移動距離與輪替缺口串起既有數字；檢討改為「太陽守住主場，賽前看準了什麼？」並對照當時的理由與結果。沒有改動 fixture 的機率、比分或場次 ID；沒有把示例移入真實賽程。

## 對照圖

所有圖都清楚標示 **靜態文案對照／非瀏覽器截圖**。以下複合圖僅裁切既有渲染輸出、加標題並排或上下比較；沒有重畫頁內文字。

- [本輪完整示例](editorial-demo-desktop.jpg)
- [DEMO 桌面前後對照](comparison-demo-desktop.jpg)
- [真實 missing 桌面前後對照](comparison-missing-desktop.jpg)
- [真實 missing 手機前後對照](comparison-missing-mobile.jpg)
- [既有視覺基準與本輪](comparison-reference.jpg)
- 完整未裁切圖、HTML、文字抽取、來源 hash、CSS 轉譯與 warnings：`static/`（7 個情境），`before/`（3 個同基底比較）。

這一輪只做文字與必要的顯示分支修正，產品 CSS 沒有變更。WeasyPrint 不等同瀏覽器：巢狀 grid/flex 在測試工具內轉為來源尺寸推導的 table/block、漸層字用來源首色、橫向卡片裁切；導覽列與縮放控制的排版仍非完整瀏覽器重現。完整原圖保留這些限制，複合圖的雜誌頁裁切只用於閱讀文案。原基準中的三層說明僅保留在「原基準」一側。

之前已記錄瀏覽器啟動 EPERM／雲端本機頁安全阻擋。本輪沒有啟動瀏覽器或繞過限制；**沒有 browser E2E、互動、完整視覺或上線驗收 PASS**。

## 驗證與獨立檢查

- 全部 unit：**170 / 170 PASS**，無 skip／fail；原始輸出 `unit-tests.txt`。
- `check:assets`、`check:registry`：PASS；變更 JS syntax、`git diff --check`：PASS。
- 靜態證據：7 個 after、3 個 before 成功渲染，預期文字抽取皆找到。
- `npm run evidence` 的來源 selector 已修正為明確 DEMO，**沒有執行瀏覽器命令，不能稱該命令 PASS**。
- Independent reviewer 重跑限定 unit：**34 / 34 PASS**；最終 15 個程式 blob／SHA-256、22 個來源 hash、7 個 HTML hash 一致，並檢視全部 7 張 after 圖。收據見 `independent-review.md`。
- QA 發現並修正：其他比賽靜態卡片溢出、零場次誤稱未更新、封面有報導時 TODAY 誤稱報導未刊出、stale 狀態遺失賽程 CTA。後兩項有回歸斷言。

`site/js/data/`、`site/js/contracts/`、`site/js/editorial/`、`site/js/reader.js`、`site/css/`、`site/data/` 與 base 相同。沒有放寬資料條件、核准要求、素材權利或 production 拒絕 DEMO 的規則。真實場次仍無賽前判讀與機率；本輪不代表 Beta-0 所需真實賽前紀錄或官方賽後結果已完成。

## 提交綁定

`code-manifest.json` SHA-256：`bc158779babde18d3aff731ce46ac6690ff81105aa34ad1a2174a19a26b13913`。獨立 PASS 綁定這 15 個精確程式 blobs。整合者須將遠端 commit 的對應 blobs 與 manifest 核對；PR body 記錄實際 commit SHA。`artifact-manifest.json` 記錄本輪交付檔 hash（不包含它自己）。獨立 agent 收據不是 GitHub APPROVED review；維持原 PR Draft，未 merge／部署。
