本任務須遵守 Issue #170 的 Capacity / Boundary / Level 規則與 Beta-0 範圍。

# 2026-11-20｜入口文案、來源更新與最新版本驗證

## 交付結論

本輪以 PR #21 的 `544709c3a84c92208a13b4e0afa4ca395484eef4` 為起點，實際修補並重新驗證最新程式。首頁、missing 文案與來源更新已完成；完整單元測試 **173/173 通過**。瀏覽器仍在頁面載入前遭環境 socket 權限阻擋，**整個 PR 的瀏覽器／互動驗收仍為 BLOCK**。維持 Draft，沒有 merge 或部署。

另依本次「那就繼續完成」執行真正賽前保存的窄範圍嘗試：兩個身份來源成功，但第三個 ESPN intake 請求連線逾時，依本輪停止條件結束。**capture 呼叫 0、snapshot 0**，沒有將身份紀錄說成賽前紀錄。

## 讀者看到的文字

| 位置 | 本輪文字 |
| --- | --- |
| 封面／今日主卡 | **13 分之差，國王盃賽再戰湖人** |
| 導言 | 上次交手，國王以 103：116 不敵湖人。NBA 盃西區 C 組再碰頭，這次能縮小差距嗎？ |
| 缺賽前分析 | 這場的賽前判讀還沒出來。 |
| 缺檢討 | 這一期的賽後檢討還沒出來。 |
| 賽程來源 | 賽程：NBA · 11/20 10:43 核對（台北） |
| 前次結果來源 | 前次交手：NBA |

英文同步修訂。保留封面、今日主卡、其他比賽與檢討的既有呈現；有內容才顯示，缺內容不補虛構報導。延續前輪實際讀過的分析文章寫法：用具體數字建立比賽焦點，導言只留一個讀者值得追看的問題。改掉「追回」的累計比分歧義、重複提問與重複的「非即時更新」。前次美國日期改稱「上次交手」，避免與首頁台北日期混用。

## 來源重新取得

本輪兩次普通 HTTPS 請求均 HTTP 200；沒有改代理、TLS 或來源 URL。由原始 `script#__NEXT_DATA__` 的 `props.pageProps.game` 核對：

- [本場 NBA 官方頁](https://www.nba.com/game/sac-vs-lal-0022600051)：SAC 客、LAL 主、SCHEDULED，`2026-11-21T03:00:00Z`，NBA 盃西區 C 組。
- [前次 NBA 官方結果](https://www.nba.com/game/lal-vs-sac-0022600185)：LAL 116、SAC 103、FINAL。當前比賽的 `lastFiveMeetings.meetings[0]` 同時確認它是 recencyOrder 1，支持「上次交手」。

取得時間分別為 `2026-11-20T02:43:14.041Z`、`2026-11-20T02:43:20.553Z`；時間依這次回應檔案最後寫入時間記錄。完整 factual receipt、URL、raw-body SHA-256、選取路徑與觀測時間見 [source-observations.json](source-observations.json)。原始頁面只供本地查核，不隨本公開報告轉載文章。

賽程和導言一起更新實際觀測時間與 canonical-facts hashes，沒有單改到期時間。`contextSnapshot` 仍為 null。**維持原有 24 小時有效期，至台北 11/21 10:43:14.041；比開賽早 16 分 45.959 秒。** 開賽前仍需新的來源觀測，本輪沒有假稱資料會持續更新或有效至開賽。

## Existing Implementation Check

- **Searched：**fresh PR #21、remote AGENTS、Issue #170／#171；完整 tree `842361ce366296d44a47c45738529cbf34490a03`。以原工作目錄為來源建立隔離 checkout，**1,150 個 blob 與 mode 全部核對遠端 SHA**。原工作目錄保留。檢查既有 app／home／i18n、schedule contracts／pipeline、來源 JSON、home／schedule unit、E2E 與靜態轉換工具；也讀回 544709c 的九檔變更。
- **Found：**正式來源與導言入口已存在，但完整 Node 測試未執行。實跑發現一個 stale 測試把有效期改到導言觀測之前，導致 INVALID；固定在 11/19 的測試／證據時鐘也不能承接真正的新觀測。原靜態 renderer 不支援新增標題的 CSS clamp，導致證據圖字級錯誤。
- **Reuse / why not reused：**沿用同一 provider → contract → pipeline → renderer，沒有新增 provider、schema、calculator、Gate、queue 或 workflow。修測試時鐘、來源事實與 reader 文字；靜態工具在原函式中將來源 px clamp 精確求值並留 trace。所有適用實作均重用，無另建替代系統。NBA 的多日 `tick` 不適合本輪單場範圍，因此只選它已存在的底層窄函式；未更動 NBA 產品程式。

## 本輪關鍵修補

- stale 測試保留有效來源與導言時間，改以讀取時鐘走到到期點，驗證真正的 STALE 行為。
- 即時來源與隔離 fixture 使用各自合理時鐘；不把舊 fixture 的未來測試日期改造成已發生。
- 禁止假機率的測試檢查欄位／標籤，避免把 ISO 毫秒中的 `0.5` 誤認成機率。
- 正常、導言未到發布時間、已過期、完全沒有導言、缺來源、讀取失敗與中英文顯示仍沿原路徑檢查。
- 公開候選仍不能通過既有發布限制；沒有數字 World、假勝率或假賽前分析。

## 驗證與對照圖

| 驗證 | 實際結果 |
| --- | --- |
| 最新遠端基準完整 Node | 173 項，172 pass、1 fail；失敗原文保留 |
| 修補後完整 Node | **173/173 pass，0 fail、0 skip** |
| Assets／registry | 通過，沒有改素材或授權規則 |
| JS syntax／git diff whitespace | 通過 |
| 靜態圖 | 8 張本輪狀態＋2 張 544709c 前版；10/10 預期文字可讀回 |
| 瀏覽器 | 一次既有 configured Chromium 執行，啟動 `socket() EPERM`；**沒有頁面執行、互動或 browser PASS** |

完整記錄：[本輪 unit](unit-tests.txt)、[基準失敗](baseline-unit-tests.txt)、[瀏覽器阻擋](browser-attempt.txt)、[程式 manifest](code-manifest.json)、[關鍵 diff](key-diff.patch)、[獨立審查](independent-review.md)。

- [桌面前後對照](comparison-desktop.jpg)
- [手機前後對照](comparison-mobile.jpg)
- [缺資料／過期／讀取失敗](comparison-missing-states.jpg)
- [本輪桌面內容區](editorial-desktop.jpg)
- [完整靜態圖與來源 manifest](static/static-visual-evidence.json)

**上述是靜態 HTML/CSS 對照圖，不是瀏覽器截圖。** 原始元件輸出與內容順序保留；既有測試轉換記錄 grid/table、來源寬度、viewport、min/max/clamp 的解析。導覽與縮放控制仍有靜態引擎差異；圖片不得用來證明瀏覽器比例或互動。前後圖用同一轉換規則，完整未裁切原圖也保留。帶隊徽與美術的 prototype 圖沿用既有示意素材；production 圖按既有授權規則顯示文字替代。

## Capacity、權責與停止條件

[Issue #170 Current execution policy](https://github.com/mikemm5216/Mosport-NBA/issues/170#current-execution-policy)，updated_at `2026-11-19T07:32:46Z`，本輪開工前 fresh read。最高影響 **L1**；Founder 本次「那就繼續完成」承接首頁文字、來源、最新測試與真實保存的前輪待辦。作者／整合者 `/root`；獨立 Capacity／Boundary `/root/boundary_continue`；只讀文字協助 `/root/copy_readback`；NBA EIC／操作 `/root/nba_capture_eic`。

Magazine 獨立 Capacity **ALLOW**：`2026-11-20T02:41:16Z`，root70、reviewer15、helper15 tool groups，55k token 預算，50 分鐘，至 `03:31:16Z`；最多兩次必要修正。Quota／reset UNKNOWN；不當作足額保證。

NBA 獨立 runtime Capacity **ALLOW**：`2026-11-20T02:45:17Z`；helper15＋root5＋reviewer5 額外群組、12k token 預算、20 分鐘且最遲 `03:25Z`，三次來源 HTTP、不重試、只捕指定一場。來源失敗即停，沒有擴展到新 calculator、Gate、scheduler、部署、合併或付費。此次來源上限已達，依停止條件保留失敗證據。

獨立 agent 審查不是 GitHub APPROVED。舊版 170/170 與舊 scoped PASS 只屬歷史，不拿來替本輪最新程式背書。

## NBA 真實保存嘗試：明確未完成

在 NBA PR #172 `10d7f45ab209af8c76dde466c3b4d324a2de8dcb` 的 **93 個來源 blob 核對相符**後，建立新的隔離 SQLite，保留舊資料庫原樣。

1. NBA 本場官方頁 HTTP 200。
2. ESPN `scoreboard?dates=20261120&limit=200` HTTP 200；新身份對應保存成功。
3. 原有 intake 的 `scoreboard?dates=20261120` 連線 8 秒逾時。兩個 URL 是不同來源紀錄，沒有挪用前者回應充作後者。

`2026-11-20T02:48:32.994Z` 關閉後新唯讀 handle 查核：身份 1 筆；兩種 ID 指向相同紀錄；observations、current_games、ESPN intake receipt、snapshots、官方結果等均 0。`GAME_IDENTITY_ONLY`／`snapshotEligible:false` 原樣保留。總計三次 HTTP、零重試、零 capture 呼叫。

原始 body、操作 harness、來源比對、錯誤與 SQLite 已封存為私有證據包；SHA-256 `68d1000e0690910dd53cfee348d4837cc568a35c130df119f2c0228f29dd78bb`。沒有把原始頁面或資料庫放入 Magazine 公開來源。

仍待完成：允許環境中的真瀏覽器驗收、成功的開賽前真實 capture／readback，以及真正賽後官方 FINAL。這些完成以前不宣告 Beta-0 閉環通過。
