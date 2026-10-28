# MOSPORT-B — Founder Decision Lock / UI + Media Handoff

**日期**：2026-10-28（Asia/Taipei）  
**本次狀態**：Founder 產品方向已確認；**僅文件定稿，工程相容性與發布能力仍須實測與審核**。  
**任務界線**：只整理規格；**不修改程式、不推 GitHub、不開 PR、不合併、不啟動 CI、不串 API、不啟用付費服務、不部署**。

## 文件

1. `01_FOUNDER_DECISION_LOCK.md` — 已定案與明確保留／待驗證項目、相較 v0.4.1 的覆寫範圍。
2. `02_UI_PRODUCT_HANDOFF.md` — 可交接給 UI/Frontend 的編輯式雜誌規格、欄位與驗收條件。
3. `03_MEDIA_EDITORIAL_HANDOFF.md` — Media 情報採集、AI Editor、審核／發布、日誌及免費來源規格。
4. `04_ACCEPTANCE_AND_DEPENDENCIES.md` — 跨端 E2E 案例、A/B 責任與實作前阻塞事項。
5. `VISUAL_REFERENCE_CURRENT.png` — Founder 最後討論並修訂過的**完整雜誌跨頁＋手機視覺參考圖**；作為排版基準，**不是可直接發表的新聞或正式模型輸出**。圖中的示意新聞與百分比不能直接採用。

## 基準與效力

- 規格依據：Founder 本輪談話、`Mosport Platform Specification v0.4.md`（檔內自述 v0.4.1 方向）、原始 `UI-01-a`、`Mosport_Magazine_UI_v03_20261028.zip` 的既有原型和 Founder 最後指認的**完整版雜誌跨頁／手機視覺母版**。
- **高保真視覺母版優先於既有 v0.3 HTML 原型的排版**：前版 HTML 與母版有差距，不得拿 HTML 當作 Founder 已核准的最終視覺。
- 本次決策僅覆寫**直接衝突的 B 產品／編輯發布政策**；不默默覆寫既有 A 的 Constitution、ADR、Feature Contract、scoringOwner、資料權利或 World Gate。
- 未特別註明的功能及約束延續 v0.4.1：單一跨運動 App Shell（NBA 先行）、Today／Schedule／Review、只做整場賽前預測、鎖定版本、公開與內部 Review 分離、不做賽中預測、不做個別球員 box-score 預測、不做博彩流程、Fantasy Pricing 沿用既有邊界。

## 使用方式

1. UI/Frontend Worker 先閱讀 `01` + `02` + `04`；**先提供視覺與元件對照、差異清單**，經 Founder 同意再實作。
2. Media Worker 先閱讀 `01` + `03` + `04`；先完成資料／發布契約設計，再評估免費來源可行性。
3. MOSPORT-A 對接時只閱讀「Evidence Candidate」契約進行**相容性審查**；不能把候選輿情當成已核准的 Psycho scoring feature。
4. 若未來進入 GitHub 提交流程，仍需另外獲得 Founder 開工授權，並依既有 docs-only PR 治理。

> 注意：此包是可交付給工作者的**規格文件**，不是已實作的網站或具真實資料的服務。
