# MOSPORT-B：10/28 後續決議與 PR #1 覆核

原始 `2026-10-28-spec-lock/` 是不可改寫的 Founder 原文快照。
本附錄集中記錄同日後續指示，避免把 PR #1 早期規格誤認為全部最新工程狀態。

## 覆核結論

PR #1 核心規格未發現與目前可驗證 Founder 決議直接衝突：
MOSPORT 刊名、More than sport、Be Your Own Coach；跨頁／手機封面；
無球員肖像；Logo 獨立元件；首頁單一合格 World 數字；空內容移除；
World 唯讀；低風險日常內容可自動發布，高風險與公開 Review 人工核准；
NBA 先行、其他運動 Coming Soon；中英／日夜模式；新增付費預算為零。

PR #1 的 Codex review 在 `bac86c8` 無 findings；後續 `f922c96` 加入 CLAUDE.md 指向 AGENTS.md。
本次另行覆核目前文件。歷史 review 不代表後續工程或視覺已驗收。

## 後續要求與實作位置

| 項目 | 最新要求 | 工程證據 |
|---|---|---|
| Reader Zoom | 桌面預設 Fit Width、上限 100%；Fit Page 可切換；手動 50–200%；W/F、跨頁記憶；手機原生 pinch | PR #6，reader.js、READER_DEFAULT_ZOOM.md |
| 圖片插槽 | 五個 art slot、版本、尺寸、雜湊、RWD crop、安全區；品牌／文案／Logo 不烙在圖中 | PR #6，ASSET_SLOTS.md、asset-registry.json |
| 幾何圖 | Founder 要求直接把現有 Drive v2 組圖試放候選版；不再停在「是否試放」 | PR #6，native-illustration-v2；不是最終視覺核可 |
| Logo 重用 | 先查 GitHub 現成素材並接入內部原型；記錄來源、身分對照與檔案 hash | NBA 原型接線；多運動庫盤點；不虛構第三方商業授權 |
| 工作接續 | 實作完成即跑檢查、review、修正，再接依賴安全的下一項；不等待每小時例行檢查 | MOSPORT-B 每小時監控已停用 |
| 合併與發布 | 本輪授權圖片／Logo 候選整合與工程接續 | 不自動推定 PR #1/#6 merge、公開發布或付費授權 |

## 執行方式

- 候選整合、測試、修正可直接繼續；不以例行監控代替實作。
- 完成證據集中到 PR 和 reports；只回報實質成果與具體待決問題。
- P1 視覺決策與正式發布資格分開；未決的最終美術不阻擋依賴安全的 P2 契約準備。
- 不改 MOSPORT-A；A 契約只能讀取核對，不從 B 重新定義或計算 World。
- Logo 檔案存在、內部原型選用與第三方授權三者各自如實記錄。

## Soccer 命名與聯賽補齊（同日後續指示）

Founder 明確要求足球英文與程式命名使用 soccer，避免和 NFL 混淆。
英文 UI 改為 Soccer；key/group/path/team id 使用 soccer / SOCCER。
素材補齊五大聯賽 96 隊，另加葡超與荷甲共 132 隊；歷史額外素材 5 隊
獨立標示。隊伍隸屬按來源目錄快照明列，不從舊 EPL/UCL 檔名推定。
