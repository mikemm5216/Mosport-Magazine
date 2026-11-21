# 2026-11-21 Magazine：同場官方終場顯示（B-P2-01b，L1）

本任務須遵守 Issue #170 的 Capacity / Boundary / Level 規則與 Beta-0 範圍。

- 基線 `main@ce98e5e`；ALLOW：[#19 comment 7058136808](https://github.com/mikemm5216/Mosport-Magazine/issues/19#issuecomment-7058136808)；Founder 決定：#19 7058071476／7058111873。
- **本場 0022600051 目前沒有任何終場顯示**：production pin 為空，`site/data/results/` 不存在，畫面維持 #26。

## 設計
| 層 | 內容 |
|---|---|
| 公開投影 `mosport-b/game-result@1` | 只放讀者需要的：雙方三碼、比分、`status: FINAL`、NBA 官方賽況 URL、NBA 與 ESPN 的讀取時間、A 收據參照 ID。不收任何自帶 hash 或公開資格欄位（未知欄位整筆拒絕）。私有佐證（原始回應、雜湊、snapshot 對帳）留在 A。 |
| 信任根 `site/js/data/result-pins.js` | B 自己計算投影的 canonical SHA-256，必須等於這裡依 game ID 釘選的 digest，且收據參照相同。釘選只能經審查過的 PR，依 A 的 #174 收據（`OFFICIAL_FINAL_VERIFIED`＋`SCORE_MATCH`）加入。**目前為空。** |
| provider | 讀完賽程後，另讀 `data/results/<id>.json`；不存在或讀不到就當作沒有。 |
| pipeline | 結果有效時：`status FINAL`、帶入比分、撤導讀，取代 `PAST_TIPOFF`／過期；無效時與沒有結果完全相同（同一個 model），diagnostics 記原因。 |
| 讀者頁（三頁、中英） | 「終場 湖人 112：101 國王」／「Final: Lakers 112–101 Kings」加「查看 NBA 官方賽況 →」。沒有任何方法或證據文字。 |

會退回的情況（單元測試逐一驗證「model 與沒有結果時相同」）：缺檔、非物件、錯場、主客對調、官方 URL 不符、讀取時間早於開賽、讀取時間在未來、只有單一來源、和局、未釘選、釘選後被改、釘選收據不符、自帶 hash、自帶公開資格。

## 截圖（隔離：合成 0022600999 ＋ 測試 pin，**不是本場真實終場**）
`isolated-final-home-1440-zh`、`-home-1440-en`、`-home-390-zh`、`-schedule-1440-zh`、`-match-390-en`。

## 第 1 輪窄修（boundary_review 7058286056）
- 賽程已有有效的 ESPN 身分（`contextSnapshot` 通過驗證）時，結果的 `espnGameId` 必須相同，否則 `RESULT_GAME_MISMATCH`、完整退回。正例改成 `401999999`，新增「ESPN 場次不符」負例。
- provider 先用賽程立即渲染；只有已釘選的場次才請求結果檔，結果晚到、失敗或缺席都不影響賽程。沒有 pin 時不送出結果請求。
- 截圖未重拍：畫面只顯示比分與連結，不受 `espnGameId` 影響。

## 驗證
第一版：unit 183/183；browser 725。第 1 輪窄修後：`npm test` exit 0，unit 183/183；browser 482 + 18 + 50 + 39 + 136 = 725（既有 2 組 e2e 加強：未釘選不送結果請求；結果請求卡住時三頁先可讀、放行後顯示終場）。
