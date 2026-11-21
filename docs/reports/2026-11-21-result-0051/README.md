# 2026-11-21 Magazine：0022600051 真實終場（L1 單場資料）

本任務須遵守 Issue #170 的 Capacity / Boundary / Level 規則與 Beta-0 範圍。

- 基線 `main@cd19be4`（#27 合併後）；ALLOW：[#19 7058353321](https://github.com/mikemm5216/Mosport-Magazine/issues/19#issuecomment-7058353321)。
- 只新增 `site/data/results/0022600051.json`（公開投影，逐字照交件值、保留毫秒），並在 `result-pins.js` 加一筆 pin（digest `370e676a…`、`NBA-0022600051-R1`）。renderer、契約、A 都沒有改；沒有複製私有來源；不發 Review。
- 依據：NBA #171 [13:58 採集](https://github.com/mikemm5216/Mosport-NBA/issues/171#issuecomment-7058302226)、[#175 收據交付](https://github.com/mikemm5216/Mosport-NBA/issues/171#issuecomment-7058329334)、[Claude 覆核](https://github.com/mikemm5216/Mosport-NBA/issues/171#issuecomment-7058351609)。

## 時間行為
`validateGameResult` 要求兩份來源的讀取時間都不晚於 now。所以 ESPN 讀取時間（`2026-11-21T05:58:09.273Z`）之前，頁面維持 #26／#25 的樣子；從那一刻起顯示「終場 湖人 106：104 國王」。既有依日期時間的測試都用固定時鐘（全部早於這個時間點），所以結果不變、仍可重現。

## 截圖（真實資料，固定時鐘 2026-11-21T06:00:00Z，正式 pin 與資料檔，無 route 替換）
`final-home-1440-zh`、`final-home-1440-en`、`final-home-390-zh`、`final-schedule-1440-zh`、`final-match-390-en`。
npm test exit 0：unit 186/186；browser 482 + 18 + 50 + 39 + 139 = 728。
