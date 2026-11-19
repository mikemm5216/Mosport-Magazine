# 2026-11-19 Magazine：Launch-first 計畫與實際狀態

**狀態：OPEN**  
As-of：2026-11-19T11:39:20+08:00，Asia/Taipei。  
Magazine 基線：`main@e4874cba32a7f91c110167bc3ea9e5f779294ed1`。本報告記錄文件改寫範圍，不是當日全部工程結案。

## 決策與工作範圍

Founder 要求重新編寫 roadmap 與架構，改為先交付 NBA／Magazine 預測 Beta，再用真實賽事持續驗證；203 項與新特徵研究並行。依據為 [B #19](https://github.com/mikemm5216/Mosport-Magazine/issues/19)、[A #170](https://github.com/mikemm5216/Mosport-NBA/issues/170)。共用主架構沿用 [NBA PR #73](https://github.com/mikemm5216/Mosport-NBA/pull/73) 的 `docs/architecture/WORLD_ENGINE_MASTER_ROADMAP.md`。

本輪對應 **B-P0-02** 文件更新，並重新排序 **B-P2-01b／B-P2-03／B-P3-01/02** 的首版範圍。不建立第二套 World 架構、研究 registry 或派工系統。

## 計畫與實際

| 項目 | 本次文件實際處理 | 工程狀態／下一步 |
|---|---|---|
| Launch-first | roadmap 明確區分 NBA 預測 Beta 與後續完整 MVP；不再等待全特徵研究 | B-P2-01b：完成真實公開契約接線與第一場數值閉環 |
| 原架構矛盾 | 指出 10/28 C-1 的 PMV→TMV 已由 A #59／#72 修正；保留原文快照 | A 既有架構／engine 工作負責版本與實作，B 不重算 |
| Magazine 驗證平台 | Current／Challenger 分別標示與計分；首頁一個主勝率，實驗進 Match／Review | A 契約加 B consumer／view 仍待實作；不是現有 UI 已有該功能 |
| A v1 相容性 | 保留內部 NOT_ISSUED／null／INTERNAL；加入公開版需求，歷史稽核仍可回查 | 待 A 版本化 schema、真實樣本、發布／撤回 transport |
| 時間與結算 | cutoff、compute、lock、publish 分開；forecast、官方結果與 evaluation 分開保管 | 以真實未來賽事完成端到端證據；晚鎖不得追認準時 |
| 公開 Review | 明確包含 scorecard 仍需人工核准；自動計分不等於自動公開 | B-P3-01/02：可信身分／權限與發布工作流 |
| 既有 PR | B #14/15/16 作為內部／離線接線候選；#17 Arena、#18 內容草稿接續於後續階段 | 每次實作前核對實際 HEAD／相依堆疊，未將 PR 提升為已部署 |
| 組織與容量 | Founder 直接管理部門；CONTROL／CAPACITY 是操作支援；目標 runtime 雲端運作 | 延伸既有 ledger；不以大型 dashboard、本機模型或設備購買阻擋 Beta |
| Grok C1 | 不再列為 launch dependency；停止工作指令與外部停用狀態分開 | 沒有聲稱本次關閉外部 Routine |

## 檔案與基線證據

- [README](../../README.md)：產品目標、最新決策優先順序與原型狀態。
- [ROADMAP](../ROADMAP.md)：分階段交付、既有 WP、目前缺口與容量責任。
- [P2_CONTRACT_COMPATIBILITY](../P2_CONTRACT_COMPATIBILITY.md)：當前 v1 與公開版規劃，保留 10/29、10/30 稽核。
- [`world-a1.js`](../../site/js/contracts/world-a1.js) 與[內部 inspector](../../site/internal/a-package.html)：目前 main 的內部讀取能力。
- [ADR-B002](../adr/ADR-B002-RENDER-ONLY-ELIGIBLE-CONTENT.md) 與 [ADR-B003](../adr/ADR-B003-EDITORIAL-WORKFLOW-AND-RECEIPTS.md)：prototype gate／DEMO workflow 的信任界線。
- [Founder 10/28 原文快照](../founder/2026-10-28-spec-lock/)：保留不修改；後續架構優先來源為 [A #59](https://github.com/mikemm5216/Mosport-NBA/issues/59) 與 [A #72](https://github.com/mikemm5216/Mosport-NBA/pull/72)。

## 驗證紀錄

本次文件編輯已讀 AGENTS、現有 roadmap／compatibility、Founder 規格與發布 ADR，並確認上述檔案與現有 consumer 路徑。此次沒有修改程式、schema、圖片、registry 或 Founder 快照。

- Node 22.23.5 執行 `npm test`：assets check、registry check 通過；**145 unit tests passed／0 failed**。
- 瀏覽器 E2E 在啟動時停止：環境缺少 Playwright 所需 `chromium_headless_shell-1243` 執行檔。**完整 npm test 並未通過**，沒有本次新瀏覽器截圖／視覺驗收，不拿歷史截圖代替。
- Markdown 相對連結、fence、衝突標記檢查通過。對固定 main tree 的 blob hash 核對顯示執行程式、測試、schema、素材及規格均未改動；本機唯讀快照缺少視覺母版二進位檔，遠端原檔保持不變，沒有把空檔寫回。
- 獨立文件審查修正了兩個跨 repo 問題：內部 Research／QA 直接使用完整 evaluation ledger、不等公開 Review 核准；第一個真實 Challenger 對齊 NBA M3／B-L3，首輪保留可區分角色的契約與畫面，不加額外模型前置條件。
- 未宣稱 GitHub formal approval、模型有效或公開服務驗收完成。以上是本次文件及未修改基線程式的檢查範圍。

## 尚未完成的產品證據

公開數值契約與傳輸、真實 INITIAL／T−15 FINAL／發布時間、官方結算、可信人工 Review 核准、production host 與發布／回復演練，仍需對應工程與真實 runtime 證據。本次沒有部署、合併、啟用付費服務、購買設備或發布預測；此處狀態維持 OPEN。
