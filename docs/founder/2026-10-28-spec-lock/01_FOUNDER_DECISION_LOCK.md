# MOSPORT-B Founder Decision Lock — 2026-10-28

**狀態詞**：`LOCKED`＝Founder 已明確拍板的 B 產品決策；`PRESERVED`＝既有契約繼續有效；`PROPOSED`＝為可執行性新增的設計建議，需工程核對，非 Founder 授權實作；`DEFERRED`＝刻意不在目前 MVP 實作。

## A. LOCKED／產品定位與視覺

| ID | 決策 | 禁止誤解 |
| --- | --- | --- |
| B-01 | **MOSPORT** 是運動雜誌刊名，為封面最大固定刊頭；永久 Slogan **More than sport**，置於刊名下方。 | 不能把 Sports Magazine、Sports Almanac 或 NBA GAME DAY 當主品牌。 |
| B-02 | **Be Your Own Coach** 是封面讀者主張／可持續的品牌訊息；`NBA GAME DAY` 等是可更換的當期主題。 | 不等同於 Coach Engine 已實作；封面刊名與主張不是每期變更的新聞標題。 |
| B-03 | 桌面是**攤開的完整運動雜誌跨頁**：左封面、右 Today 內容；手機是同系列封面，下滑接 Today。Founder 指定的完整高保真構圖為視覺母版。 | 不能再退回簡化 Dashboard 或只在既有年鑑 HTML 換文案。 |
| B-04 | 封面使用原創籃球、球場／器材／幾何等非真人素材；**不使用球員照片、球星肖像、可辨識球員仿製形象**。保留真實球隊 Logo 的獨立插槽與身分對照。 | 使用 Logo 仍需來源／授權或適用使用依據查核；Founder 的偏好不等於自動取得商業商標授權。 |
| B-05 | 英文版封面與介面文案**全部英文**；繁中版保持繁中介面。`MOSPORT`、`More than sport`、`Be Your Own Coach` 為固定英文品牌字串。 | 禁止英文標題混入中文摘要、或 UI 內用假中英混排填位。 |
| B-06 | **MOSPORT Almanac** 是歷史資料庫／歷史檔案入口，與現刊 Magazine 分開。 | 不是雜誌的副刊名，也不假裝歷史查詢功能已完成。 |
| B-07 | Breaking News、Exclusive、連勝、連敗、傷病、重大對戰等可成為雜誌故事；**內容由 MOSPORT 編輯決定**。 | 不預設每天都有 BREAKING／EXCLUSIVE，不為填版位編造新聞。 |
| B-08 | 首頁不需要「精選」分類或三層說明教學；建立上首頁資格規則後，**有內容才出現**，排序與封面重要性由編輯決定。 | 不能把 Schedule 全量列表或未合格預測機械式填入首頁。 |
| B-09 | 首頁勝率只展示**一個合格主數字**；不用同時放 `61%` 與 `60% 區間` 造成混淆。 | 示意 `61%` 不是已合格的正式預測；Match Detail 可依既有契約解釋已合格的不確定性。 |

## B. LOCKED／Media 與 AI Editor

| ID | 決策 | 禁止誤解 |
| --- | --- | --- |
| M-01 | **AI Editor 採方案 A**：一般、低風險、已通過資格的日常內容**可以自動發布**。 | AI 產稿 ≠ 自動通過事實、權利、時間與發布資格 Gate。 |
| M-02 | **重大新聞、未證實傳聞、敏感新聞、獨家內容**必須**人工核准**才能發布。 | 即使流量高、AI 很有把握、社群多方轉載，也不能繞過人工核准。 |
| M-03 | Media Engine 偵測外部新聞、熱門話題與輿情，形成資料化候選；**MOSPORT Editor** 才有選題、封面主題與報導排序決策權。 | World Engine 不選新聞；Grok／Muse 不是主編。 |
| M-04 | 未證實的傳聞**可蒐集與追蹤**，但要分級，不能宣稱已確認或讓 World 直接將傳聞當作事實。 | 未證實也不是可忽略時間／原始來源的匿名文字。 |
| M-05 | 未來以 Grok（X）及 Muse／Meta 社群能力補強情報，但**前期只用合法可用的免費來源／現有額度，不新增付費 API 或付費 MCP**。 | 不能假設 Muse 對 Meta 全社群有外部 API；不能把私人訂閱視為免費 API 授權。 |
| M-06 | Media 情報可通往 World **候選證據研究管道**；正式進入 Psycho／Physio 等計分必須由 A 完成時間、來源、Feature Contract、權限及樣本外驗證。 | 新聞人氣／互動量不能直接改 World 勝率，也不能回寫鎖定版本。 |

## C. PRESERVED／既有產品與工程契約

1. **World 唯一正式賽事判讀權威**。Physio／Psycho → PMV → TMV → World 不變。Media 可以敘事、編排、傳播，不得重算、補算、改權重、捏造 World 推論。
2. **只做整場賽前判讀**；比賽中只顯示事實比分／狀態及原已鎖定判讀，不做走地或即時機率更新。
3. 一切數字須有 World producer、provenance、version、read eligibility、distribution eligibility；不合格就不顯示數字。Demo 數字必須清楚標 DEMO。
4. **Public Postgame Review 初期人工核准仍有效**。新決策 M-01 僅覆寫「一般合格日常新聞／文章一律人工核准」的舊限制；不是授權所有 Review、World 分析或影音無條件自動發布。
5. 舊契約的 `External Sources`（賠率／外部創作者與分析師的逐來源展示）仍不直接進 World，也不混為共識模型。**新增的社群／新聞候選證據**是另一個需獨立核准的研究資料通道；兩者不是同一資料權限。
6. 保留 World/Media/Coach 三角產品關係；Coach 的使用者判斷／資料也不直接回寫 World。
7. 同一套 App Shell／Design System、NBA active，其他運動 Coming Soon；語言／日夜模式可切換；Today／Schedule／Review 主導覽。
8. 不啟用投注、ROI、賠率推薦、球員 PTS／REB／AST／PRA 個別預測等既有排除事項。

## D. 舊文件差異與優先順序

| 舊文件表述 | 本輪處理 |
| --- | --- |
| v0.4.1 E-4 `WORK-MEDIA` 所有內容皆必經 `Human Approval` | **部分覆寫**：低風險合格的日常新聞可 `AUTO_APPROVED`；高風險內容走 `AWAITING_HUMAN_APPROVAL`。公開 Review 仍人工。 |
| v0.4.1 「Media → World：觸及數據只回饋產品層，不進模型」 | **保留正式模型隔離**，新增 **候選新聞事件／輿情證據研究出口**（尚未核准 scoring）。平台流量仍不直接當 World 輸入。 |
| v0.4.1 「External Sources → World 不存在」 | **完全保留**賠率／第三方觀點逐來源的發布型 External Sources 管線禁入模型；不要用這句阻斷獨立的可驗證新聞事實候選研究管道。 |
| 原型「SPORTS ALMANAC」、三層教學、示意 Breaking／Exclusive 永久擺放 | 以 B-01、B-06、B-07、B-08 改正。無內容就不顯示；Demo 僅原型。 |
| 舊原型/設計圖的 `61%` 與 `60% interval` 同列 | 首頁只保留合格主數字；深入不確定性解釋留 Match Detail。 |

## E. DEFERRED／不得自行補定義

- AI Editor 重大新聞的具體數值門檻／自動排程頻率／模型選型；先給保守規則與可調設定，不虛構 Founder 已核准門檻。
- Grok／Muse 付費 API、MCP、Meta 社群授權與商用抓取；需後續另行核准費用、資料權限、條款與部署。
- 新聞／情緒／社群候選特徵進入 Psycho 的 scoring 權限、因果主張、權重、效益；須 A 發起獨立工程／研究流程。
- Almanac 查詢功能、Fantasy/Coach 新玩法、訂閱／收費機制；現階段均不因此啟動。
- 新聞內容自動發表至外部社群帳號、Podcast／短影音全自動發布：目前**未取得單獨的無人審批授權**，保留既有工作流程與權利 Gate。

**治理紀錄**：此文件鎖定「產品決策與交接要求」，不是本身授權建 repo、連付費服務或改寫 World Constitution。
