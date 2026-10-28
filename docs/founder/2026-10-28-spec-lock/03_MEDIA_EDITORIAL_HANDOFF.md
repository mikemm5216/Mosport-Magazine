# MOSPORT-B Media Intelligence／AI Editor 交付規格

**Founder 鎖定政策**：一般低風險合格內容自動發布；**重大新聞、未證實傳聞、敏感新聞、獨家內容由人核准**。前期新增付費 API = **US$0**。本文件描述未來實作的發布契約，**不代表已啟用發布機制**。

## 1. 四個責任互不混用

| 模組／角色 | Input | Output | 無權做的事 |
| --- | --- | --- | --- |
| News／Social Collectors | 合法可取得的公開來源、許可的 feed/索引、既有額度 | URL、原始來源時間、觀測時間、原文引用、可用的公開互動指標 | 捏造全網流量、繞過付費／授權／robots 與來源限制 |
| Media Intelligence | 收據化來源、去重與實體對照 | `NewsEvent`、趨勢變化、傳聞狀態、候選清單 | 判斷正式勝率、宣告球員心理狀態已改變 |
| MOSPORT AI Editor | 候選事件、事實 Gate、品牌政策、可發布 World Package | 主題選擇、文稿、封面排版方案、審核路由、低風險自動發布 | 把高風險候選自動批准、把熱門等於真實、宣稱非獨家內容為獨家 |
| World Evidence Intake（A 管理） | 分離的 `EventEvidenceCandidate` | 僅研究收件／拒絕；通過 A 的獨立資格後才可能增 Feature | 未經 Feature Contract 將情緒／聲量直接輸入 Psycho 或影響鎖定勝率 |

**重要**：Media 裡的 Editor 可以是自主工作流，但 Editorial Policy／Safety／Rights／QA 的 Gate 不可由同一個生成模型一句話跳過；准入、查核、核准與發布須分開留記錄。

## 2. 資料來源：前期零新增付費

- 官方球隊／聯盟公告、允許讀取及使用的開放新聞頁面、允許商業使用的 RSS／Feed、已准許的免費搜尋與公開趨勢訊號。
- 可追蹤公開 YouTube 頻道／影音更新，引用影片標題、發布時間、原始連結；觀看量等只在實際可合法取得時記錄。
- X／Threads／Facebook 公開討論只在合法且能保留來源與權利的方式下觀察；**不能假設網頁搜尋即能拿到全平台曝光、完整情緒分布或商業再利用權**。
- Grok、Muse／Meta 社群、付費搜尋 API、MCP 嫁接均為**未來可選 Adapter**，不得因預留欄位而啟用付費。
- Google News 等來源是否准許商業用途需逐一查核；不可僅因「公開免費」就直接攝取全文、長期轉載或商用發布。
- 免費來源無法取得真實熱度／觀看／討論量：填 `null + reason`，不可假設為零、不可虛構。

## 3. NewsEvent 與 Source Record（PROPOSED；非已實作）

每個來源單獨保留 `sourceRef`、`originalUrl`、`publisher`、`authorOrAccount?`、`publishedAt?`、`observedAt`、`rightsStatus`、`accessMethod`、`contentFingerprint`、`quotedSpan?`、`language`。

```ts
type NewsEvent = {
  eventId: string;
  kind: 'OFFICIAL_FACT' | 'REPORT' | 'RUMOR' | 'OPINION' | 'SOCIAL_REACTION';
  subjectEntityIds: string[];      // player/team/game with stable identity
  sourceRefs: string[];
  firstObservedAt: string;
  lastObservedAt: string;
  verificationState: 'CONFIRMED' | 'CORROBORATED' | 'UNVERIFIED' | 'DISPUTED' | 'FALSE' | 'RETRACTED';
  storyDraftRef?: string;
  attentionSignals?: Array<{
    provider: string;
    metricName: string;            // views, mentions, searchIndex, engagement...
    observedValue: number | null;
    measuredAt: string;
    scope: string;                 // observed sample, never assume population
    missingReason?: string;
  }>;
  dedupeClusterId: string;
  newsworthinessReason?: string;  // editorial candidate, not model feature
};
```

- 不同媒體引用同一爆料，不等於多個獨立證據；使用 `dedupeClusterId` 與 original-source lineage。
- 情緒分析如需保留，必須是對**被觀測文本樣本**的標籤，不是球員真實心理，也不是全平台代表性民調。
- 已更正／撤稿必須追蹤、保留舊版並撤下錯誤結論，不可靜默覆蓋原來源狀態。

## 4. Editorial Eligibility / Risk Routing

### 4.1 自動發布資格（**所有**條件通過才可走 AUTO）

1. **低風險日常資訊**：例如已確認的官方比分、正式賽程、已完成且官方可核對的連勝／連敗、一般賽事摘要、符合 distribution eligibility 的 World 常規內容之忠實轉述。
2. 對應 `sourceRefs`、發布時點、權利／轉載界線、實體身分全部可驗證；出現矛盾／更正／時間來源不明即不得自動發。
3. Fact QA、language QA、rights QA、數字與 World version consistency（若涉及 World）全通過。
4. 文字不能包含未驗證的指控、人格評價、私領域猜測、仿造引述、誇大因果、虛構獨家或博彩招攬。
5. `publicationPolicyVersion` 已核准、發表目標與內容格式在授權範圍內，寫入 Audit Receipt。
6. 沒有踩到任一 **HUMAN_REQUIRED** 觸發器（下節）。

### 4.2 強制人工核准（Founder LOCKED）

| 觸發器 | 例子 | 流程 |
| --- | --- | --- |
| **MAJOR_NEWS** | 影響重大、快速擴散的新發展，重大交易／重大傷病新聞等 | 停在 `AWAITING_HUMAN_APPROVAL`，編輯查核原始來源後核准／拒絕 |
| **UNVERIFIED_RUMOR** | 教練遭解職傳聞、交易爆料、休息室不合等 | 可以內部追蹤但不得自動發文；若核准報導也必須清楚標示「未獲證實」 |
| **SENSITIVE_NEWS** | 人身指控、隱私、法律風險、歧視、名譽或其他高風險議題 | 人工審核事實、必要性與合法性；不核准就不發布 |
| **EXCLUSIVE_CLAIM** | 標 `MOSPORT EXCLUSIVE` 的稿件 | 證明 MOSPORT 原創或獨家權利，再人工核准 |

**保守預設（PROPOSED）**：分類有歧義、熱度異常、來源衝突、rights 未確認、AI 檢查器分歧、標示 Breaking 而無明確事實依據者全部升級人工或阻擋。定量門檻、人工角色及 SLA 未由 Founder 定義，不要把建議值當成決議。

### 4.3 Public Review 特別規則

即使新聞可自動發布，**Public Postgame Review 在本階段仍需人工核准**，維持 v0.4.1 已核准界線；有官方 FINAL 及合格已鎖定分析才能撰寫公開檢討，不得輸出內部 Lesson。

## 5. 內容與發布狀態機（PROPOSED）

```text
DISCOVERED
  → SOURCE_CAPTURED → EVENT_CLUSTERED → FACT_QA
      → REJECTED / HELD_FOR_EVIDENCE
      → EDITORIAL_DRAFT → LANGUAGE_QA → RIGHTS_QA → POLICY_QA
          ├── [low-risk + all pass] → AUTO_APPROVED → PUBLISHED
          └── [any human trigger]  → AWAITING_HUMAN_APPROVAL
                                        ├── APPROVED → PUBLISHED
                                        └── REJECTED / HELD
PUBLISHED → CORRECTION_PENDING → CORRECTED / WITHDRAWN
```

- 一切 Publish/Correct/Withdraw 均產生不可覆寫的 `publicationReceiptId`，記錄 `sourceRefs[]`、editorialItemId、contentHash、policyVersion、QA 結果、`approvalMode=AUTO|HUMAN`、審核人（人工時）、公開 URL、時間、correction chain。
- 任何下游發現來源錯誤，可提出 `TAKEDOWN_REQUEST` 並撤下／更正；不得暗中修改原文消除追責記錄。
- **自動發布只指將符合資格的內容發布至 MOSPORT 自有雜誌頁面**；自動對外社群貼文／Podcast／影片另需來源權利與新授權。

## 6. Editorial Priority／首頁決策

- 候選事件首先通過**可發布資格**；Editor 再依真正的新聞價值、時效、使用者關注、品牌語氣、自站讀者反應及內容多樣性安排優先級。
- 流量監測只用實際可取得的來源指標，記錄來源／樣本／時間；不可把別家網站的實際流量、X 全平台聲量當作已知。
- 讀者感興趣不代表內容可信；編輯既能把三連敗放封面，也能因熱度不代表價值而不刊登。
- 不為空版位創造 Breaking／Exclusive。沒有合格新聞就隱藏該區塊；首頁沒有「精選」分類。
- `editorOverride` 需附理由、決策時間與 author/agent ID，但**不能覆寫不可突破的事實、權利、人工核准 Gate**。

## 7. Media → World Candidate（**研究性、未獲 scoring 授權**）

提出一條與 UI 上 `External Sources` 展示完全不同的 Evidence Candidate Lane：

```text
Raw Source (preserved) → Event ID / Identity / Time / Verification
 → Candidate Evidence Queue (READ-ONLY to A)
 → A owner decides Feature Contract / acquisition / evaluation
 → only if separately approved: pre-lock eligible feature → Physio/Psycho → PMV/TMV → World
```

建議最小欄位：`eventId`、`subjectEntityIds[]`、`eventType`、`sourceRefs[]`、`assertionAndVerificationState`、`sourcePublishedAt`、`firstObservedAt`、`availableAt`、`rightsStatus`、`dedupeClusterId`、`candidateFeatureFamily`、`missingReasons[]`。

**硬規則**：

1. World 只能考慮鎖定之前已有且符合 `availableAt` 的證據，不能把賽後社群消息拿來解釋先前預測。
2. 同一三連敗事實在 ESPN 結果、媒體新聞、社群傳播裡不能被重複計算成三個表現證據。
3. 未證實傳聞、球迷情緒、模型產生的「球員心態推測」不得直接成為 Psycho 數值／勝率調整。
4. 任何新增 Feature／權重都須正式來源資格、單一 scoring owner、增量／樣本外驗證和 Founder／A 既有 Gate 批准。
5. 不得修改任何已鎖定比賽的分析；公開文章引用 World 時也不能重新判斷勝負。
6. 這是新增研究能力，不解除 v0.4.1 原本 `External Sources → World`（賠率與第三方觀點面板）禁入模型的決議。

## 8. 免費成本與後期擴充

- **現在**：新增付費 API／MCP 預算 US$0；不啟動付費呼叫、不購買社群數據、不自動付費升級。
- **未來**：Provider Adapter 可加入 `SearchAPI`, `X/Grok`, `Meta/Muse`, `YouTube`, `OfficialFeed`，每個需能力清單、商業使用條款、rate limits、provenance、取得成本與失敗模式；**預留 Adapter 不代表已接通**。
- **最小上線內容量**：維持既有「先做穩定的一份主要內容／日」的方向；沒有合格內容可以當天不發。AI Editor 的自動發布不得反過來製造硬性 KPI 或不實新聞。
- **產品指標與模型指標分離**：點擊、閱讀完成、回訪、分享與流量只用於內容／產品優化，不代表 World 模型正確。

## 9. Media 驗收重點

1. 未證實傳聞可以**內部存證**，不可誤標 CONFIRMED，也不能自動發。
2. 明確的普通官方事件能自動發布，出版收據包含 QA 與來源。
3. 重大新聞／敏感／獨家必須看到真人審核憑據；沒有就維持 Hold。
4. 複製貼上同一原始爆料的十個網址不能變成十個獨立證據。
5. `views`／`mentions` 未知時是 null+reason，並標示觀測樣本，不捏造全平台流量。
6. 若 World 沒有合格正式輸出，Media 不能產生帶正式機率的分析文章。
7. Public Review 仍走人工；已鎖定 World 分析不可被改寫。
8. 發布後更正、撤稿、來源失效皆有不可變操作紀錄。
9. 資料來源／內容素材未確認權利，輸出應停住，不把公開免費誤當成可商業發布。
10. 免費來源不可用時能跳過、不付費補抓，當日不產內容亦視為合格失敗降級。
