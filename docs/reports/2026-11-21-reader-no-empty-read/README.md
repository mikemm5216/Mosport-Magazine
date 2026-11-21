# 2026-11-21 Magazine：沒有可顯示判讀時，隱藏空區塊（Level 1）

本任務須遵守 Issue #170 的 Capacity / Boundary / Level 規則與 Beta-0 範圍。

- 基線：`main@66360c8665296abf8626be68abc693c60b79836e`（#25 合併後）
- 開工收據與獨立 Capacity ALLOW：[#19 comment 7057386470](https://github.com/mikemm5216/Mosport-Magazine/issues/19#issuecomment-7057386470)
- 讀者原則（Michael）：沒有就沒有。

## 改了什麼

| 位置 | 之前（無公開 snapshot、開賽前或提早過期） | 之後 |
|---|---|---|
| `app.js::pregameRecord`（三頁共用） | 輸出「這場的賽前判讀還沒出來。」 | 不輸出；開賽後仍是 #25 的通知＋NBA 連結 |
| 首頁封面 `cv-status` | 「這場的賽前判讀還沒出來。」 | 沒有可顯示內容時不出現；開賽後仍是「已過原定開賽時間」 |
| 首頁 TODAY 主卡標題 | 「賽前看點」（底下空） | 有導讀顯示導讀標題；沒有導讀顯示真實對戰「國王 @ 湖人」；開賽後仍是「比賽資訊」 |
| Match「賽前看點」卡 | 固定出現，裡面只有缺稿句 | 沒有內容時整張卡不出現 |
| 過期提示 `state_scheduleStale` | 「以下是先前的賽程，開賽時間可能有變動。賽前判讀還沒出來。」 | 「以下是先前的賽程，開賽時間可能有變動。」（英文同步） |
| `state_scheduleOnly` | 句尾帶缺稿句 | 移除缺稿句 |

保留：真實對戰、時間、來源與核對時間、有效導讀、過期提示、#25 開賽後通知與 NBA 連結、既有導覽。契約、pipeline、資料來源都沒有改。World issue（DEMO）路徑的 `noRead_*` 原因句不在本輪範圍；Match 卡少掉重複的缺稿句，原因句照舊。

## 截圖（Playwright Chromium，production）

開賽前（時鐘 02:30Z，導讀可見）：`home-pre-1440-zh`、`home-pre-1440-en`、`home-pre-390-zh`、`schedule-pre-1440-zh`、`match-pre-390-zh`、`match-pre-1440-en`。
提早過期（`validUntil` 10:30、時鐘 10:40 台北）：`home-stale-1440-zh`、`match-stale-390-en`。
已人工核對：沒有空卡或缺稿句，版面無溢出。

## 驗證

`npm test` exit 0：unit 178/178；browser 482 + 18 + 50 + 39 + 134 = 723 checks（`main` 為 717；新增 6 項「不得出現空區塊」的檢查）。
不在 `npm test` 內的靜態證據腳本（`home-spread-static.js`、`schedule-context-static.js`、`render-schedule-static.py`）同步改了 MISSING 狀態的期望值；只做語法檢查，未重跑。
