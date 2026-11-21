# 2026-11-21 Magazine：有效期上限、開賽後狀態、導讀獨立撤下（Level 1）

本任務須遵守 Issue #170 的 Capacity / Boundary / Level 規則與 Beta-0 範圍。

- 基線：`main@c0efc67f9f4d8d9f7208e1f94ee59376c92c206d`（Magazine PR #24 合併後）
- 分支：`beta0/0051-tipoff-states`
- 授權：Founder 於 2026-11-21 10:54（台北）在對話中指派 Claude 負責 Mosport-Magazine，並指定三項範圍（見下）。
- 最高實際影響：**L1**（契約、pipeline public model、顯示邏輯）。不含部署、花費、新 runtime 或 MOSPORT-A 變更。

## 修正的兩個已重現問題（以 #24 程式實測）

| 情境 | #24 行為 | 本 PR |
|---|---|---|
| `validUntil` 晚於開賽一小時，時鐘在開賽後 30 分 | 契約接受；導讀 `CUP_REMATCH` 仍顯示 | `BAD_TIME schedule.validUntil`，整筆拒絕 |
| 只更新賽程收據（observedAt＋指紋），導讀不動 | `EDITORIAL_CHRONOLOGY` → `INVALID`，可顯示場次 1→0 | 賽程保留（`SCHEDULE_ONLY`），只撤導讀 |
| 時鐘到 11:00（tipoff） | `STALE / SCHEDULE_EXPIRED`：「以下是先前的賽程，開賽時間可能有變動。賽前判讀還沒出來。」 | `SCHEDULE_ONLY / PAST_TIPOFF`：「已過原定開賽時間（台北 11:00）。MOSPORT 未發布本場賽前判讀。查看 NBA 官方賽況 →」 |

## 範圍

1. 契約：`validUntil <= game.tipoff`。
2. 開賽後：中英文案分「未發布／曾發布」判讀；狀態標籤「已過原定開賽時間」；不宣稱 LIVE／FINAL／比分。
3. 導讀：`validateScheduleEditorial` 獨立檢查；失敗只撤導讀。

不在範圍：自動重查與來源授權（MOSPORT-A，NBA #172／#173）；官方 FINAL 對回快照（#171）；World issue 路徑（DEMO）的 STALE 文案。

## 截圖（Playwright Chromium，時鐘 2026-11-21T03:05:00Z）

`home-tip-1440-zh.jpg`、`home-tip-1440-en.jpg`、`home-tip-1440-zh-dark.jpg`、`home-tip-390-zh.jpg`、`schedule-tip-1440-zh.jpg`、`match-tip-390-zh.jpg`。
已人工比對：版面結構與開賽前一致（封面＋TODAY、手機封面優先），無溢出；通知文字 17px、官方連結獨立一行。
「曾發布」分支在 production 不可達（`contextPublicRelease` 固定 `BLOCKED_MISSING`），只以既有 isolated projection 做模板測試，非發布證據。

## 驗證

`npm test` 全部通過：unit 177/177；browser 482 + 18 + 50 + 39 + 119 = 708 checks（#24 為 706，新增 2 項開賽後檢查）。
