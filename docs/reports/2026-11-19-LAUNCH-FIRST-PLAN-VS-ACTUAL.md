# 2026-11-19 Magazine：Launch-first 計畫與實際狀態

**狀態：OPEN**  
As-of：2026-11-19T12:31:36+08:00，Asia/Taipei；先前基線檢查截至 11:39:20。  
Magazine 基線：`main@e4874cba32a7f91c110167bc3ea9e5f779294ed1`。本報告記錄文件改寫範圍，不是當日全部工程結案。

## 決策與工作範圍

Founder 要求重新編寫 roadmap 與架構，先交付 NBA／Magazine Beta，再用真實賽事持續驗證；203 項與新特徵研究並行。後續在同日明確修正 Magazine 有兩個產品角色：A 生成文章，B 以媒體／創作者預測呈現 feature 驗證。更新沿用 [Magazine PR #20](https://github.com/mikemm5216/Mosport-Magazine/pull/20)、[B #19](https://github.com/mikemm5216/Mosport-Magazine/issues/19)、[NBA #170](https://github.com/mikemm5216/Mosport-NBA/issues/170) 與 [NBA PR #73](https://github.com/mikemm5216/Mosport-NBA/pull/73) 的 `docs/architecture/WORLD_ENGINE_MASTER_ROADMAP.md`。

本輪對應 **B-P0-02** 文件更新，並重新排序 **B-P2-01b／B-P2-03／B-P3-01/02** 的首版範圍。不建立第二套 World 架構、研究 registry 或派工系統。

## 計畫與實際

| 項目 | 本次文件實際處理 | 工程狀態／下一步 |
|---|---|---|
| Launch-first | M1 同時交付第一篇文章與第一個研究角色預測，M2 兩角色可用，M3 擴大驗證 | 首輪不等待全特徵、實驗有效性或研究被 World 採納 |
| 原架構矛盾 | 指出 10/28 C-1 的 PMV→TMV 已由 A #59／#72 修正；保留原文快照 | A 既有架構／engine 工作負責版本與實作，B 不重算 |
| 角色 A：文章生成 | 從合格新聞／事實生成文章，適用時引用 World；不將所有文章綁定預測 | B-P2-02/03、B-P3-01/02/03 與 #18 既有文章能力接真實發布 |
| 角色 B：feature 驗證 | 前台為 MOSPORT 媒體／創作者預測；後台綁定 persona 版本、假設、規則、experiment／cohort／forecast | NBA 研究 payload 與 Magazine 角色內容仍待實作；不是現有 UI 已有功能 |
| 官方／研究區分 | World 唯一官方判讀；官方主槽單一勝率不限制獨立角色欄目；研究可有不同觀點 | pick-only 不補百分比；機率指標只用合格數值輸出；研究不用先被正式 World 採納 |
| A v1 相容性 | 保留內部 NOT_ISSUED／null／INTERNAL；加入公開版需求，歷史稽核仍可回查 | 待 A 版本化 schema、真實樣本、發布／撤回 transport |
| 時間與結算 | cutoff、compute、lock、publish 分開；forecast、官方結果與 evaluation 分開保管 | 以真實未來賽事完成端到端證據；晚鎖不得追認準時 |
| 公開 Review | 明確包含 scorecard 仍需人工核准；自動計分不等於自動公開 | B-P3-01/02：可信身分／權限與發布工作流 |
| 既有 PR | B #14/15/16 為內部／離線接線候選；#18 文章能力可承接角色 A 首輪；#17 Arena、影音延續後續範圍 | 每次實作前核對實際 HEAD／相依堆疊，未將 PR 提升為已部署 |
| 組織與容量 | Founder 直接管理部門；CONTROL／CAPACITY 是操作支援；目標 runtime 雲端運作 | 延伸既有 ledger；不以大型 dashboard、本機模型或設備購買阻擋 Beta |
| Grok C1 | 不再列為 launch dependency；停止工作指令與外部停用狀態分開 | 沒有聲稱本次關閉外部 Routine |

## 檔案與基線證據

- [README](../../README.md)：產品目標、最新決策優先順序與原型狀態。
- [ROADMAP](../ROADMAP.md)：分階段交付、既有 WP、目前缺口與容量責任。
- [P2_CONTRACT_COMPATIBILITY](../P2_CONTRACT_COMPATIBILITY.md)：當前 v1 與公開版規劃，保留 10/29、10/30 稽核。
- [`world-a1.js`](../../site/js/contracts/world-a1.js) 與[內部 inspector](../../site/internal/a-package.html)：目前 main 的內部讀取能力。
- [ADR-B002](../adr/ADR-B002-RENDER-ONLY-ELIGIBLE-CONTENT.md) 與 [ADR-B003](../adr/ADR-B003-EDITORIAL-WORKFLOW-AND-RECEIPTS.md)：prototype gate／DEMO workflow 的信任界線。
- [Founder 10/28 原文快照](../founder/2026-10-28-spec-lock/)：保留不修改；後續架構優先來源為 [A #59](https://github.com/mikemm5216/Mosport-NBA/issues/59) 與 [A #72](https://github.com/mikemm5216/Mosport-NBA/pull/72)。

## 2026-11-19 12:31:36：Founder 雙角色修正

來源是本次對話的直接澄清：「A是生成文章 B是feature驗證(但是是假裝成媒體或YR網紅預測)」。此為 Magazine 的產品角色，不是 repository A／B 的代號。文件使用媒體／創作者專欄描述其呈現方式，名稱採 MOSPORT 自有設定，方法及來源可查閱；沒有擅自確定最終角色名稱。

先前版本將 Magazine 主要寫成正式 World 展示頁與 Challenger 比較表，並將首個真實 Challenger 延後 M3。這是文件作者的假設，已被此項 Founder 說明取代：

- M1 同時交付角色 A 第一篇真實文章及角色 B 第一個真實賽前預測／紀錄／結算；M2 兩角色有用，M3 擴大角色與驗證證據。
- 角色 B 讓讀者看到有名字與觀點的專欄、pick、理由、時間及過去紀錄；後台才是固定假設／規則與完整 ledger，不縮減成通用研究表格。
- 研究預測在 NBA 研究服務按版本化規則計算，無須先被正式 World 採納或與其一致；Magazine 生成表述，不任意改 pick／機率。
- 單一 feature 可以只輸出 pick，不補百分比；Brier／log loss 限有合格數值機率的紀錄。編輯是否選稿不改變研究母體。
- 官方 World 主槽每場一個主勝率，角色預測另有欄目／卡片，可呈現不同觀點。公開 Review 仍人工核准；內部 Research／QA 使用完整 ledger。
- 本次仍只修改 README、roadmap、compatibility 與本報告；未改程式、schema、AGENTS 或 Founder 歷史快照，也未建立另一套 registry。

### 本次文字修正的核對範圍

重新核對兩角色定義、M1／M2／M3 排序、官方／研究邊界、pick-only 指標、內容與實驗紀錄關聯；4 份文件的相對連結均存在、Markdown fence 成對。此次未重跑 npm／E2E。以下 npm／E2E 紀錄屬 **11:39:20 前的基線檢查**，不能宣稱已驗證本次新增產品語意或完成角色功能。

## 修正前的驗證紀錄（截至 11:39:20）

本次文件編輯已讀 AGENTS、現有 roadmap／compatibility、Founder 規格與發布 ADR，並確認上述檔案與現有 consumer 路徑。此次沒有修改程式、schema、圖片、registry 或 Founder 快照。

- Node 22.23.5 執行 `npm test`：assets check、registry check 通過；**145 unit tests passed／0 failed**。
- 瀏覽器 E2E 在啟動時停止：環境缺少 Playwright 所需 `chromium_headless_shell-1243` 執行檔。**完整 npm test 並未通過**，沒有本次新瀏覽器截圖／視覺驗收，不拿歷史截圖代替。
- Markdown 相對連結、fence、衝突標記檢查通過。對固定 main tree 的 blob hash 核對顯示執行程式、測試、schema、素材及規格均未改動；本機唯讀快照缺少視覺母版二進位檔，遠端原檔保持不變，沒有把空檔寫回。
- 先前獨立文件審查確認內部 Research／QA 應直接使用完整 evaluation ledger、不等公開 Review 核准。該輪採用的「第一個 Challenger 延後 M3／B-L3」排序，現已被上面的 Founder 雙角色修正取代，不能再當作產品政策。
- 未宣稱 GitHub formal approval、模型有效或公開服務驗收完成。以上是本次文件及未修改基線程式的檢查範圍。

## 尚未完成的產品證據

真實文章生成與發布、研究角色／規則版本綁定、公開研究 payload、官方 World 公開數值契約、賽前鎖定與發布時間、官方結算、可信人工 Review 核准、production host 與發布／回復演練，仍需對應工程與真實 runtime 證據。本次沒有部署、合併、啟用付費服務、購買設備或發布預測；此處狀態維持 OPEN。

### 同輪交付範圍核對

M2 分別記錄兩項交付：**Magazine 雙角色 Beta** 可先發布已合格的文章與角色 B 預測，完成賽前鎖定、發布及官方結算；**NBA 整合預測 Beta** 另須正式 World 數值、INITIAL／T−15 FINAL 與其公開閉環。正式 World 尚未合格，不阻擋已具自身發布資格的 A／B；Magazine 先完成也不代表整合 World 已完成。這是同一 roadmap 的範圍記錄，不新增 gate。

鎖定流程統一為固定研究計算→持久化鎖定→角色內容發布；公開敘事不能先發布再補收據。角色整體成績與 feature 對 World 的增益分開記錄，後者保留同場固定條件對照要求。

獨立唯讀文件覆核結果：PASS-with-scope。確認雙角色、發布先鎖定、M1 排序、兩種 Beta 交付範圍與 feature 增益條件一致；此結論不代表 GitHub 正式 approval、功能實作、模型有效或 runtime 驗收。
