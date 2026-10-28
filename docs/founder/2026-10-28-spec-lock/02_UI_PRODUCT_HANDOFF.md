# MOSPORT-B UI／產品交接規格

**版本**：Founder UI Direction Lock 2026-10-28；**性質**：產品規格，不是可運行程式或資料上線證明。

## 1. 視覺唯一基準

- 以本交付包 `VISUAL_REFERENCE_CURRENT.png`（Founder 最後討論並修訂的完整雜誌構圖）為視覺母版：桌面左封面＋右完整 Today 內頁；手機同系列封面再往下延伸 Today。
- 沿用原圖的 editorial composition、海報式大刊頭、藍／白主色、節制籃球橘及隊伍 Logo；**不要再回到 v0.3 簡化的 HTML Dashboard 版面**。
- 圖面只作視覺參考，示意數字／新聞不能當真實產品資料；落地時品牌文案、Logo、新聞標籤、比分、勝率、按鈕都必須是**可編輯的 HTML／資料元件**，不可烙在背景圖裡。
- 原型既有 `index.html`、`match.html`、`js/assets.manifest.js`、`js/teams.nba.js`、`mo-team-logo`、`mo-cover-artwork` 等可參考其資料插槽與狀態規則，但不擅自假定版型已符合 Founder 最後視覺。

## 2. 品牌／中英文字契約

| 元素 | 規則 |
| --- | --- |
| Master masthead | `MOSPORT`；封面最醒目，固定，不加 `Magazine` 當刊名。 |
| Permanent slogan | `More than sport`；固定置刊名之下。 |
| Reader proposition | `Be Your Own Coach`；英文品牌主張，可顯示於封面適當位置。 |
| Issue/topic | `NBA GAME DAY` 或當期真實主題；由 Editor 決策替換，不得覆蓋 MOSPORT 刊名。 |
| Cover labels | `BREAKING NEWS`、`MOSPORT EXCLUSIVE`、`STREAK WATCH` 等**只在內容真的符合時出現**。 |
| English | 封面／導覽／日期和內文 UI 同層皆英文，不能拼接中文占位稿；繁中版內頁以繁中呈現。固定英文品牌詞仍維持原樣。 |
| Themes | 日間預設，可手動切夜間且記住偏好；跨運動不重設。 |
| Sports | 共用 Shell；NBA active，Baseball/Football Coming Soon；不暗示其他運動已提供正式預測。 |

## 3. 首頁「資格規則」與排版

**不建立「精選」欄位，也不設固定 Breaking／Exclusive 填空題。**

### 3.1 內容上首頁的必要條件（機器 Gate）

每筆 `EditorialItem` 需滿足：

1. `publishState=PUBLISHED` 且有可對應的 `publicationId`；未通過 QA 不可上首頁。
2. `homeEligible=true`：由已核准內容類型、鮮度／有效期限、事實證據、權利及安全資格推導，**不得由 UI 自己判斷**。
3. 原始來源／事實／時間可查證；未證實的新聞若尚未經人工核准，連標示傳聞的公開報導也不可發。
4. World 數字只有 `ISSUED` 且 `distributionEligibility=PUBLIC`、版本鎖定符合契約才能展示；否則隱藏數字，不能用示意值或 0 填位。
5. 不應把**只有賽程、沒有可讀分析或報導**的比賽塞進 Magazine 主版；仍可在完整 Schedule 查詢。
6. 延期／取消可成為真正新聞事件時的新聞故事，但不是放一張「沒有判讀」的空白賽事卡。
7. 無合格候選就縮版／改版；首頁可少內容，不能虛構頭條或注水。

### 3.2 誰決定版位？

- **MOSPORT Editor** 決定封面主故事、排序、露出形式和替換當期主題；可人工覆寫有審核紀錄的排序。
- Media Engine 回傳 `attentionSignals`／研究結果只是供 Editor 參考，**高流量不是強制上首頁，也不是比賽勝率**。
- 版面 renderer 僅依**已核准的內容清單＋Editor 的 layout plan**渲染，不自行產生新聞、判讀、機率或 Editor 決策。
- 自動化 Editor 對低風險項目可自行產生 `layout plan`；四類高風險必須有人工核准，之後才可能出現。

### 3.3 版位類型（非必填清單）

| 類型 | 可以承載 | 不可承載 |
| --- | --- | --- |
| Lead Story / Cover Headline | 已核准的今日主題、熱門賽事、連勝／連敗、真實新聞 | 假新聞、沒有內容的占位主題 |
| Breaking News | 有時間與可信來源的真正重要新發展；若重大／敏感，先人工核准 | 純猜測、舊聞、單純高互動貼文 |
| MOSPORT Exclusive | 原創採訪、真正獨家資訊或具有獨家使用資格的內容，且人工核准 | 一般資料彙整、非獨家的 World 常規判讀 |
| League News / Stories | 官方確認的連勝／連敗、交易、教練調整等經查證事件 | 把球迷情緒當球員真實心理診斷 |
| Game Analysis | 合格鎖定 World 分析與來源可追溯的解釋 | 模型尚未合格的假數字 |
| Postgame Review | 取得公開資格**且已人工核准**的 Review | 內部 Lesson 或尚未確認的比賽結果 |

## 4. 主要頁面

### 4.1 Magazine Home／Today

- 桌面第一屏：左側完整封面、右側 Today 內頁，保留貼合書脊與雜誌紙面閱讀感；封面不擠壓內頁資訊。
- 手機第一屏：單張 MOSPORT 雜誌封面；Today 向下捲動呈現。品牌層級與桌面一致，但換行及排版可 RWD 重排。
- 內頁優先給「可讀的故事、重點賽事、已合格判讀及明確連結」，移除「World／Evidence／External 三層肉」教學區塊。
- 新聞 `Breaking`、`Exclusive`、`streak` 等為可隱藏的編輯內容元件；沒有資格就**不產生 DOM 卡片與佔位高度**。
- 只在真正具備 World 公開資格時顯示單一 `homeWinProbability` 主數字（例如原型 `61%` 只能保留 DEMO 標示；正式沒有就不顯示）；首頁不再列另一個 `60%` 區間百分比。
- 連勝三場、連敗三場等故事必須由正式結果衍生或提供核對證據；不能把故事性敘述視為下一場必勝或必敗預測。

### 4.2 Schedule

- 仍是**全部賽事**的日期／狀態瀏覽，包括尚未合格、延期、取消、未知、缺資料；不得反向滲入封面候選清單。
- Date/status/identity 仍依 A 的真實資料與時間契約；NBA 先行。

### 4.3 Match Detail

- 維持 UI-01-a 已定的 Verdict → Because → But → Watch，連同版本、快照、PMV（合格時）、Turning Point、Falsifier、Evidence、External Sources 的揭露規則。
- 合格數值與版本可顯示詳細定義及適當的不確定性說明；**首頁簡潔只顯示一個主勝率數字不代表刪除 Detail 的合格解釋**。
- 不加入即時重新預測、個別球員 PTS/REB/AST/PRA、投注或 ROI。

### 4.4 Review

- 公開 Review 與內部 Audit／Lesson 分開。只能評估已鎖定原分析與合格賽後結果，不回溯改寫原判讀。
- **初期仍需人工核准**，不能因一般新聞開放自動發布而直接改成自動上線。

### 4.5 Almanac

- 僅保留清楚標示的歷史資料庫入口／Coming Later；未建置的歷史查詢與統計不要做成可點開假資料。

## 5. 前端收到的資料契約（PROPOSED）

以下是提議的最小展示 schema，**不是宣稱後端已存在**：

```ts
type EditorialItem = {
  id: string;
  locale: 'zh-Hant' | 'en';
  type: 'NEWS' | 'STREAK' | 'GAME_ANALYSIS' | 'REVIEW' | 'FEATURE';
  headline: string;
  summary?: string;
  sourceRefs: string[];
  coverImageRef?: string;          // 只能是已合格的素材資產
  publishedAt: string;
  validUntil?: string;
  publishState: 'PUBLISHED';
  homeEligible: true;
  editorialRank?: number;          // Editor 設定的排序，不等於模型權重
  editorialLabel?: 'BREAKING_NEWS' | 'MOSPORT_EXCLUSIVE' | 'STREAK_WATCH';
  verifiedFacts: string[];
  approvalReceiptRef: string;
  linkedGameIds?: string[];
  worldAnalysisRef?: string;       // 僅當該內容消費合格 World 輸出時
};
```

**層級要求**：`Editor` 決定 headlines/layout，`World` 決定賽事判讀；UI 不自行生產數據。對外文章必須保留 immutable `sourceRefs` 與 publication receipt。

## 6. 資產與可及性

- 不用真實球員肖像、比賽轉播截圖、仿真球星合成圖；AI 原創運動器材／球場視覺仍須標註來源與生成紀錄。
- 球隊 Logo 一律獨立 CSS `object-fit: contain`，對應 canonical team code；載入失敗退回可讀縮寫。需來源與合法使用依據查核。
- 英文與繁中要有等價資訊，差別不應造成可讀資格、數字、方向或判讀語意漂移。
- 需實測 desktop 1440/1280、mobile 390/360、light/dark、zh/en、長標題、無標題／無新聞狀態、沒有肖像、低網速及 Logo failover。
- Demo 絕不能未標識地混入 production；Production 沒有合格判讀數字時不顯示假的 `61%`。

## 7. UI 驗收（不得以單張 AI mockup 宣告完成）

1. 首頁截圖視覺與 Founder 指定完整雜誌母版對齊，不退回簡化格狀版面。
2. 刊名 MOSPORT 最大，固定 slogan `More than sport`，保留 `Be Your Own Coach`。
3. 未合格或空內容不出現、且無空白佔位；Schedule 仍能找到全部場次。
4. 未核准重大／傳聞／敏感／獨家文章**不會出現在首頁或全文頁**。
5. 首頁只出一個合格主勝率數字；無資格則不顯示，不生成示意數值。
6. Breaking／Exclusive 真正有資格才顯示，且標籤不可由 UI 自行推算。
7. 雜誌主視覺無球員照片、可辨識真人或仿真球星；Logo 不合成進背景圖。
8. 繁中與英文語言一致、RWD 無橫向卷軸、Light/Dark 正確、互動可操作。
9. World 版本／證據／公開 Review 等原有契約沒有被雜誌化設計破壞。
10. 最終交付必須有**實際瀏覽器 render 截圖與動作驗證**，不是只給 AI 生成的示意圖。
