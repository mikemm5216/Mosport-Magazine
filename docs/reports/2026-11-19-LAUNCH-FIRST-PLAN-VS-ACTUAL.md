# 2026-11-19 Magazine：Launch-first 計畫與實際狀態

## 最新決定：Beta-0／Beta-1 與窄範圍治理

**當前狀態：OPEN。** 本輪起始核對時間：2026-11-19T14:55:43+08:00（Asia/Taipei）。來源為 Founder 本輪直接決定；本次按已授權方向修改文件／治理，並非 runtime 完成。

| 當前事項 | 最新生效範圍 |
|---|---|
| Beta-0 目標 | 11/19 起 2–3 週，即 12/03–12/10；不是已排程或工期保證 |
| Beta-0 必要成果 | 真實 schedule 或誠實 missing；至少一場真正未來比賽的持久化賽前 snapshot；Magazine 呈現它或明確 missing；賽後同 game ID 對官方結果 |
| Beta-0 不要求 | World 勝率、T−15 雙鎖、多 feature、角色 B、完整文章流程；但 missing 不能取代至少一筆底層真 snapshot 與官方結果證據 |
| Beta-1 | Beta-0 真資料跑過且上線後，再補 INITIAL／T−15 FINAL、更多 feature 與角色 B |
| Research | Beta-0 上線前只修補直接解除 Launch 缺口的既有東西；禁新 calculator／模型實驗；203 清單保留，不並行擴寫 |
| Magazine owner | 位於既有 MEDIA 責任內，自排文章／reader flow／驗收，不等 World 完整版；API／數值由 NBA 提供，仍守 Beta-0 與容量範圍 |
| 容量與防重複 | Capacity／Control 為有開工否決權的窄只讀守門者；Boundary／Anti-Duplication 是 QA 內窄角色，可阻擋 ready／merge，不寫產品程式或改派工／架構 |
| Founder 分級 | L0 已授權文件／測試／明確修補依指定獨立 review 與委派處理、Founder 抽查；L1 摘要＋關鍵 diff；L2 架構／Gate／公開／付費／權限政策 Founder 親決；按最高實際影響分類 |
| 保留方向 | 文章／研究雙角色、PMV 與 TMV 獨立、同源 World 球員分數→Magazine／Fantasy；Fantasy 非 Beta-0／Beta-1 前置 |

先前「M1 雙角色首版」「M2 雙角色 Beta＋整合數值 Beta」及「203 項並行擴寫」排序已被本節取代。README、roadmap、compatibility 正文同步改寫；下方歷史紀錄保留當時原文，不再當作現行排程。

### Existing Implementation Check（修改前已完成）

- **searched：**一次批次讀取 README、ROADMAP、compatibility、當日日報、AGENTS 與 `.github/pull_request_template.md`；以 `rg -n` 搜尋 EIC／Beta-0／Beta-1／M1／203／CAPACITY／Research／merge／Fantasy；記錄讀取檔案 SHA-256，執行 `git rev-parse HEAD`。既有 PR 為 Magazine #20／NBA #73；本輪禁止 web，沒有宣稱刷新遠端 HEAD。
- **found：**前五檔均存在，仍有雙角色首版／203 並行與雙鎖前置文字；缺完整 EIC／容量否決／QA 邊界／分級規則。PR template 缺少。本機不是 git checkout，local HEAD 無法取得；沿用檔內固定來源 `main@e4874cba32a7f91c110167bc3ea9e5f779294ed1`，不將它冒稱為 PR 最新 HEAD。
- **reuse / why not reused：**直接修改五份現有文件，保留歷史 audit／日報與既有 source／runtime／schema／素材。既有適用文件全部重用，未重用項：無。僅因本 repo 缺少 PR template 新增該模板，不另建治理檔、dashboard、queue 或 workflow。

每個 Launch PR 必須具體填齊同一 EIC 三項；不得以 N/A 或空泛描述取代。開 PR 前由 QA Boundary 檢查，review 抓重複實作，缺漏／未解決重複即不合格，不得 ready／merge。

### 本輪容量／操作範圍

root 已轉述 Capacity 守門對本任務束的 **ALLOW**：只准上述 5 份現有文件與 1 份缺少的模板，一輪修改、最多一次必要修正；供應商 quota **UNKNOWN**，遇限制立即停並保存，不重試碰撞。本輪不跑 npm、不用 web、不開 runtime／新 calculator／新 workflow，也不遠端操作。

政策方向雖以 Markdown 記錄，實際涉及架構／權限政策，按 L2 辨識；本次具體方向已由 Founder 在對話親自授權，不再次詢問。此記錄不是獨立 review PASS、merge 或公開授權；本輪不 merge。指定獨立 review 與整合後實際核對由交付者另記。

驗證範圍限於文件一致性、相對連結、fence、變更路徑及 EIC；不以舊 npm／CI 結果證明本輪產品功能。Beta-0 真 snapshot／官方結果／實際發布仍待工程與 runtime 證據。

## 歷史紀錄（保留原文；排程以本頁最新決定為準）

以下保留 11:39、12:31 與 13:27 各輪決策、檢查及當時的驗收範圍。雙角色與同源球員分數的產品方向仍保留，早先首版排程／203 並行政策已由本頁最新決定取代；歷史 PASS 不代表本輪已獲獨立審查。

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

## 同日補正：引擎球員價值直接支援評分與 Fantasy

補正截至：2026-11-19T13:27:34+08:00（Asia/Taipei）；來源為 Founder 本輪說明：分數結合現有 feature／World Engine，不需額外評分規則，最後作 Fantasy 價格依據。

本輪將關係寫入既有文件及下一步計畫：同一引擎的正式球員價值供 Magazine 展示與未來 Fantasy 定價引用，沿用 ENGINE-03／04 與 SERVE。撤回 assistant 在討論中另建 Rating 再餵回 PMV 的建議，沒有新增加減分權重、循環輸入或價格公式。賽前、賽後更新及當時價格保留時間版本；不從隊伍勝率反推球員分數。

本輪只更新文件與計畫文字，尚未實作球員分數／Fantasy 定價。既有發布順序與能力狀態不升級；Fantasy 不增加首版上線條件。前節測試／CI 僅代表各自記錄的舊 HEAD，本輪驗證範圍另記。

本輪驗證：Markdown 連結／fence／衝突標記與 whitespace 核對通過；NBA registry renderer／validator 通過，JSON 差異僅限下一步計畫欄位。獨立唯讀文件覆核 PASS-with-scope，確認同源分數、時間版本與 Fantasy 接線一致。未重跑與文字變更無關的整套本機 runtime／瀏覽器測試；此結果不是功能或正式 GitHub approval。

### 本輪必要核對與 Boundary 修正

兩 repo 共16份目標文件／模板的連結、fence、衝突標記與 whitespace 核對通過；NBA registry renderer／validator 通過一次，state／evidence／dependencies未變。未跑新feature研究或整套本機runtime／瀏覽器測試；既有PR CI依新HEAD執行一輪，未手動重跑。

Boundary final指出2項實質矛盾：NBA README末尾仍要求Founder逐一merge；Magazine AGENTS第8條與L0列未清楚允許委派合併。已修為最高影響分級、L0指定獨立review後在明確委派範圍處理／合併、禁止自審與全面無範圍自動合併。本輪仍是L2，未執行merge；修正依原review指示逐句核對，無需重跑registry。這是文件治理核對，不是runtime驗收或GitHub正式approval。
