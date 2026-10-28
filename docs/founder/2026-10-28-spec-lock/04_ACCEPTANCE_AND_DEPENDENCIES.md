# MOSPORT-B 跨工作流交接驗收／依賴清單

## 1. 主線分工與開工邊界

| 工作流 | 可以依本規格規劃 | 此輪不得做 |
| --- | --- | --- |
| MOSPORT-B UI / Frontend | 參考視覺母版、元件拆解、首頁資格／編輯排版契約、RWD／語言／資產 QA 計畫 | 未經 Founder 另行授權就改現有 repo 或部署 |
| MOSPORT-B Media | 免費來源審查、事件／來源／出版收據 schema、風險路由、AI Editor 設計 | 自動發布真新聞、付費 API、第三方違規抓取、外部帳號發文 |
| MOSPORT-A / NBA | 審閱候選證據是否符合資料架構、Identity/Source Receipt/availableAt；提出研究工作項 | 接受 Media 文字為正式模型特徵、修改模型權重、覆蓋 Psycho Constitution |
| Founder / Editorial | 決定新聞價值、首頁排序／封面選題，核准重大／傳聞／敏感／獨家與未來預算 | 無須親自審每則通過低風險自動 Gate 的日常稿 |

## 2. 端到端驗收案例（實作後才執行）

| Case | 模擬輸入 | 期待行為 |
| --- | --- | --- |
| U-01 | 當天無新聞／無合格 World 判讀 | 不生出 BREAKING／EXCLUSIVE／勝率占位；Schedule 仍可查賽程 |
| U-02 | 官方結果證實某隊三連勝 | 可形成新聞候選；通過 Policy 後 Editor 可決定封面是否刊出 |
| U-03 | 三連勝新聞有流量，World 只有舊表現數據 | 社群流量不直接改勝率，不重複計分 |
| U-04 | 有合格 World 61%／另一個 60% 區間說明 | Today 只顯示 `61%`；Match Detail 依版本與資格揭露進階細節 |
| U-05 | Wordmark/Logo 遠端載入失敗 | 雜誌品牌字樣與球隊縮寫 fallback 可讀；頁面不崩潰 |
| U-06 | 切換 EN／繁中／Dark／Mobile | 品牌固定、語言一致、無橫向溢出；不混中文稿到英文封面 |
| U-07 | 無球員圖片 | 封面維持原創器材／球場幾何，不被改為模仿真實球員照片 |
| M-01 | 一般已確認、來源可用、權利合格新聞 | Fact／Language／Rights／Policy 全綠 → AUTO_APPROVED → PUBLISHED + Receipt |
| M-02 | 未核實教練解職傳聞 | 保存 RUMOR，等待人工核准；不可自動發或當已確認事實 |
| M-03 | 重大正式傷病／交易新聞 | 即使屬確認資訊，仍 HUMAN_REQUIRED；無簽核不發布 |
| M-04 | `MOSPORT EXCLUSIVE` 其實只是轉載 | 標籤失格，不能自動發；人工核准前不可宣稱獨家 |
| M-05 | Public Review 資料齊全 | 仍人工核准；不因 AI Editor 一般新聞自動化而旁路 |
| M-06 | 原文被撤回／來源矛盾 | Block 或進入更正／撤稿；留 immutable audit trail |
| M-07 | News source 只有關注度、沒有商業使用權 | 可保存合法的引用／收據，不可全文重製或對外違規刊載 |
| A-01 | Media 擬送熱度、傳聞、情緒資料給 Psycho | A 的研究隊列收件但不算正式 feature；不得影響 locked snapshot |
| A-02 | 缺少外部社群資料、免費配額用盡 | typed missing；不改用付費 API 或杜撰指標 |

## 3. 正式進入實作前需有的證據

- **UI**：Founder 參考視覺圖／asset 清單、雜誌高保真版型對照、Desktop/Mobile 斷點、頁面資料狀態設計。
- **Media**：免費來源的商業許可評估與 Provider Adapter 清單、Editorial Policy 初版、符合人工審核要求的操作介面、可重現測試 fixture。
- **A 相容性**：只讀確認 `World Analysis Package`、read/distribution eligibility、source receipt、`availableAt`、identity、Feature Ownership；所有新 proposal 明確不侵入主線 A 現有工程。
- **權利**：隊徽／球場／背景圖／媒體原文／TTS／影片來源資料的合法使用根據和記錄；不得因 AI 產生即認為所有元素已授權。
- **產品發布**：新聞、World 分析、Review、External Sources 的每一種內容具有自己的 release eligibility；沒有就 `BLOCKED` 或 `NOT_EVALUATED`，不顯示假正式資料。

## 4. 不該阻擋既有 A 目標的工作

這一套 UI/Media 文件不應使 A 暫停「完成一場真實賽事端到端判讀」的路徑：新聞輿情研究／Grok／Muse 接入是**以後的可選擴充**，不是第一場 World 真實判讀的前置必要條件。

## 5. 後續尚未拍板的實作細節

- 真人 Editor 審核 UI 的確切角色、身分系統、SLA 與 escalation 等級。
- 新聞來源清單及每個來源的可商用條款；各類高風險判斷的量化門檻。
- Media AI 模型與免費額度的每日配額、排程、運行環境及現有成本歸屬。
- 各類 `Story` 的優先級演算法、A/B 測試方式與自動排版算法（不能把人氣變成真實性分數）。
- MOSPORT Almanac 的歷史查詢互動與正式資料可用性。
- 所有實際 source receipt/Feature Contract 欄位需與 A 目前主線相容性核對後定案。

**結論**：Founder 已核准 B 的產品方向與 AI Editor 的基本發布政策；這份文件**不是程式碼開工、發布自動化、付費串接或模型 Feature 啟用授權**。
