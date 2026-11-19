# B-P2-01 — World 契約相容性與 NBA Beta 公開版接線

## 2026-11-19：目前結論與工程方向

**現有 v1 仍只供內部使用；公開數值版為待實作的版本化契約。** 這次 roadmap 更新沒有修改 schema、validator、`publicProjection` 或發布權限，也沒有將離線 consumer 宣稱為真實線上服務。

文件基線：Magazine `main@e4874cba32a7f91c110167bc3ea9e5f779294ed1`。工程優先順序依 [B #19](https://github.com/mikemm5216/Mosport-Magazine/issues/19)、[A #170](https://github.com/mikemm5216/Mosport-NBA/issues/170) 與 [A #73 共同主 roadmap](https://github.com/mikemm5216/Mosport-NBA/pull/73)。10/29、10/30 的相容性稽核保留在本文件後半，所有其中的「today／current／blocked」均指當時檢查範圍，不能單獨引用為 11/19 的全系統狀態。

| 對象 | 目前能證明的範圍 | NBA Beta 的接續 |
|---|---|---|
| A `mosport-a/world-analysis-package@1` | `NOT_ISSUED`、數值 `null`、`INTERNAL`、權利 `UNVERIFIED`；B 有嚴格 consumer 與內部 inspector | 保持不變；不以 UI 開關或改布林值公開 |
| B #14／#15 | 內部球隊事實與球員觀測的候選讀取工作 | 核對實際 HEAD／相依性；過去出場觀測不能當成當場確認名單 |
| [B #16](https://github.com/mikemm5216/Mosport-Magazine/pull/16) | lockedWorld 離線 consumer 的候選工作 | 重用驗證邏輯，補實際傳輸、發布者身分、撤回與公開資格 |
| [A #168](https://github.com/mikemm5216/Mosport-NBA/pull/168) | PMV／獨立 TMV／World 的內部數值候選 | 模型 release 與公開契約須分別完成；不能將 INTERNAL_CANDIDATE 直接公開 |
| 公開版契約（暫稱 v2） | 本節是需求設計，不是已存在的 schema | A 定義正式版本與 producer；B 嚴格依已發布 schema 增加 consumer，舊 v1 語意保持封閉 |

### A／B 責任與模型關係

A 擁有 World 計算、模型版本、輸入時序與鎖定。PMV 與 TMV 獨立，World 整合兩者及環境；這是 [A #59](https://github.com/mikemm5216/Mosport-NBA/issues/59) 與 [#72 後續 Founder 決策](https://github.com/mikemm5216/Mosport-NBA/pull/72) 對 10/28 C-1 舊 `PMV → TMV` 文字的更新。歷史 Founder 原文不修改。

B 只讀 A 發出的已核准輸出，不能計算、修正、補值或按新聞重調機率。這同時適用於 Current World 與 Experimental Challenger。Elo 比較結果也由 A 的評估工作提供；B 不以它替代缺失 World。

### 公開版需要表達的最小語意

以下是欄位需求與驗收條件，不是允許 B 先接受未知欄位的 schema 草案。A 應在正式契約中確定名稱、型別、狀態與相容性；B 配對版本實作。

| 類別 | 必要語意 | B 必須避免 |
|---|---|---|
| 識別／版本 | game、forecast、INITIAL／FINAL stage、模型／參數／特徵版本、快照指紋；實驗另有 experiment／cohort 識別 | 只用隊名或畫面時間串接；將兩個模型的預測覆蓋為同一筆 |
| 角色／成熟度 | Current 或 Challenger、Beta 或 Experimental；各自的公開資格 | 把「實驗中」解讀成不需資料／來源／時序資格 |
| 時序 | 賽程版本與 tipoff、資料 cutoff、觀測／取得 receipt、computed、locked、published 時間各自存在 | 把早取得的資料當成晚鎖定／晚發布的準時證明 |
| 數值／缺失 | 合格機率或 typed missing；棄權、逾時、未結算、延期／取消的明確狀態 | 補 0、50%、平均值或舊版數值偽裝新 FINAL |
| 來源／發布 | 權利與發布決策、release receipt、發行者身分、允許公開的來源揭露 | 只驗 hash 就相信任意 JSON 是 A 正式發行 |
| 保管／撤回 | 不可覆寫的 forecast ID／hash、FINAL 連結 INITIAL、完整 revision／撤回狀態及 correction event | 以較新值抹去原預測；以 stale 逾期刪除歷史成績證據 |
| 結算／評估 | 官方結果版本、forecast 引用、計分規則與 evaluation 版本、母體與覆蓋率 | 將賽後資料塞回賽前封包；混合不同模型／stage 的命中率 |

### INITIAL、T−15 FINAL 與實際發布

- INITIAL 與 FINAL 分別保存，FINAL 指向自己的 INITIAL；更新資料不能回寫已鎖定版本。
- T−15 的依據包含已使用的賽程版本與 cutoff。延期、取消與改期需由 A 明定重鎖／不計分規則，B 顯示實際狀態。
- `evidenceCutoffAt`、`computedAt`、`lockedAt`、`publishedAt` 不能互相代用。晚於 T−15 才鎖定，即使使用早前資料，也不能標成準時 FINAL；發布晚到另有實際紀錄，不能追溯宣稱讀者當時已可見。
- 沒有合格 FINAL 時，可保留有資格的 INITIAL 並明示版本，不能把它冒充 FINAL。
- 現時讀取的 freshness 與歷史紀錄可讀性分開：預測記錄可供賽後檢討，但不能以過期快照偽裝最新消息。撤回／權利限制適用於公開存取，內部稽核仍保留依法可保管的事件。

### 傳輸與信任邊界

公開服務必須提供可驗證的 A 發行身分、穩定版本選取與撤回資訊；B 依正式 transport 契約處理失聯、錯版、future timestamp、撤回與重複接收。需要從實際目標服務取得證據，離線 fixture PASS 或 worker ACK 不等於消費者已收到可公開成品。

發布資格由受控服務端決定，瀏覽器 gate 是第二層防護。自填 `approverId`、`?mode=production` 或 hash 都不是身分驗證。正式公開資料只包含讀者需要且可公開的內容；不把內部帳號、完整原始 payload 或未核准來源資料交給前端。

正式排程、鎖定、傳輸及結算以雲端運行為目標，不依賴 MichaelPC、互動式對話或 LLM 剩餘額度。延伸既有 provider → validator → gate → public model 路徑，不建立平行 consumer／dispatcher。

### 實驗預測、Review 與升版

Current 與 Challenger 均由 A 產生且各自鎖定，後者在 Match Detail／Review 明示「實驗中」與相對 Current 的差異；首頁仍只出一個合格主數字。正式與實驗成績分開，對共同可評分賽事進行比較，另列所有預先納入場次、棄權、逾時與覆蓋率。

官方賽果與 evaluation 不改寫 forecast。官方結果修訂建立新的結算／評估版本，保留原因與舊版本。公開 Review（含 scorecard）沿用 HUMAN approval，計分可以先在內部自動完成。Media 不能因一批命中就把實驗升為正式模型；World 升版需新的時間外證據、獨立 QA 與 release 決策，只套用未來賽事。

### 接線驗收與相容性策略

1. A 提供正式 schema、producer、具 provenance 的真實樣本及 release／撤回契約；B 不自行猜 endpoint 或狀態名稱。
2. 保留 v1 既有負測與封閉 public projection。新版本用明確版本分派，未知版本／欄位拒絕，不用寬鬆解析兜底。
3. 在真實未來賽事完成 INITIAL／FINAL → A 發布 → B 讀取 → 官方 settlement → 核准 Review，分別記錄鎖定與發布時間。
4. 對此次接線的具體風險檢查：錯模型／錯 game、晚鎖／晚發布、撤回、過期、錯誤核准、重複送達、缺失與實驗／正式混用；核對手機與既有主頁單一數字規則。
5. 以實際程式、服務與 receipt 更新本節狀態；本次文件改寫不更動 capability，也不宣稱上述工程已完成。

---

## 歷史稽核：2026-10-30，v1 consumed internally（PARTIAL）

以下保留原始稽核文字與來源，供回查當時的相容性結論。

Re-audited 2026-10-30 (Asia/Taipei). Read-only towards MOSPORT-A; nothing in A was changed.

**Result:** A now publishes a game-level package, `mosport-a/world-analysis-package@1`
(A PR #55, `main` at `4e56f0dc9aa180364b61d2062784e4e16ef6ea85`). B has a read-only consumer for
it and an internal inspector. v1 deliberately cannot carry a judgment: `world.state` is only
`NOT_ISSUED`, every number is `null`, distribution is `INTERNAL`, rights are `UNVERIFIED` and the
schedule is not publicly eligible. So **nothing from A reaches the public reader**, and that is the
correct display state, not a gap B should fill.

### What B checks (`site/js/contracts/world-a1.js`)

- Strict wire shape mirrored from A's schema: unknown fields and versions fail at every level.
- Canonical UTC instants with milliseconds and real calendar dates.
- Fingerprint (SHA-256 of canonical JSON without `fingerprint` and `revision`) and revision.
  B's recomputation matches A's for the authentic sample.
- Chronology (receipt ≤ lock < tipoff, lock ≤ as-of), game id, ESPN provenance URL, venue
  local date in the venue zone, `validUntil = min(tipoff, receipt + 15 min)`, snapshot chronology
  and its typed missing reason, lifecycle and supersession rules.
- `readState(pkg, now)` on every read: ACTIVE until `validUntil`, then STALE; WITHDRAWN and
  SUPERSEDED win over expiry; a package from the future is refused.
- `select(revisions, now)`: the complete A revision set for one game; mixed, future, conflicting
  or invalid revisions refuse the set with no fallback.
- `publicProjection` is the only door to the public reader and is always closed for v1, with typed
  blockers (`WORLD_NOT_ISSUED`, `WORLD_INTERNAL`, `SCHEDULE_NOT_PUBLIC_ELIGIBLE`,
  `RIGHTS_UNVERIFIED`, and `READ_STALE` / `READ_WITHDRAWN` / `READ_SUPERSEDED`).

What B **cannot** verify and does not claim (`CONSUMER_LIMITS`): who issued the file, A's
franchise/venue registry digests and A's identity resolution (ESPN team id → franchise →
display code at tipoff; venue zone and alias windows), which need A replay; the source
bytes; and live withdrawal
(A has no revocation transport; a saved file cannot announce a later withdrawal).

### One real game: CLE at ATL, `espn:401909893`

| Item | State |
|---|---|
| Fixture | Byte-exact copy of A `docs/contracts/samples/real-401909893-20261029.json`, SHA-256 `7c3d76ac…6eea` (`tests/fixtures/a-world/PROVENANCE.json`) |
| Validation | PASS; B fingerprint `5aa4f3ef…c25e` equals A's |
| Pre-lock evidence | ESPN scoreboard receipt observed 2026-10-29T08:47:37.799Z, snapshot captured at the lock 08:47:38.081Z, tipoff 2026-10-30T00:00:00Z |
| World | NOT_ISSUED · FEATURE_PIPELINE_NOT_CONNECTED; engine and why BLOCKED_MISSING · SOURCE_NOT_PUBLISHED |
| Read state | ACTIVE from as-of until 09:02:37.799Z on 2026-10-29, STALE afterwards (STALE today) |
| Public reader | Not rendered; the game does not appear on Today, Schedule or Match |
| Internal inspector | `site/internal/a-package.html` shows the typed state above, no %, interval or verdict |
| Follow (status, score, settlement) | BLOCKED_MISSING; A does not place a final score into a pregame package |

### Field mapping

| B prototype field | A v1 field | B behaviour |
|---|---|---|
| `gameId` | `game.canonicalId` (`espn:<id>`); `espnGameId` kept | Internal only. `nbaGameId` is BLOCKED_MISSING · IDENTITY_UNRESOLVED |
| `away`, `home` | `franchiseId` for joins, `displayCode` for display | ESPN display codes are not promised to be NBA tricodes |
| `tipoff`, `venueTz` | `game.tipoffAt`, `game.venue.timeZone`, `localDate` | Checked against each other |
| `world.state` | `NOT_ISSUED` only | Passed through |
| `world.distributionEligibility` | `INTERNAL` only | Public door closed |
| `world.version` | none in v1 | Not guessed |
| `world.snapshotId` | `evidence.snapshot` SHA + `capturedAt` (or typed missing) | Shown internally; it is not a full World lock |
| `world.homeWinProbability`, `interval60`, `verdict`, `why` | null / typed missing | No field exists in the internal view |
| `status`, `score` | `follow.*` typed missing | Not shown |

### Still blocked, and on whom

- **Public rendering (B-P2-01b):** A ENGINE-04 (real World judgment), SERVE-01/02, REL-00 release
  qualification, rights, and a delivery transport with revocation. B's `worldSource` stays
  `PROTOTYPE_FIXTURE`, so a LIVE issue still cannot be built.
- **States B expects but v1 does not have:** INITIAL / FINAL_CONFIRMED / FINAL_UPDATED.
- Questions 1, 2, 3 (partly), 7 and 9 below are answered by A's contract doc
  (`docs/contracts/WORLD-ANALYSIS-PACKAGE-V1.md` in Mosport-NBA). Questions 4, 5, 6 and 8 stay open.

## 歷史稽核：2026-10-29（BLOCKED，已由 10/30 稽核部分取代）

Re-audited 2026-10-29 (Asia/Taipei). Read-only. Nothing in MOSPORT-A was changed.

**Result:** MOSPORT-A has no game-level World Analysis Package yet. There is no schema, no
producer, no sample and no release rules for B to map against. A real A integration is
**BLOCKED**. B keeps its prototype adapter and labels it as such everywhere.

### What was inspected

MOSPORT-A `mikemm5216/Mosport-NBA`:
- `main` at `8b83093bb03fc9d661c4be9e88ddfbf731dcda0c` (committed 2026-10-28 13:53 +08:00).
  This is the same commit as the first audit; `main` has not moved since.
- Open PRs #43, #44, #45 and #47. Their diffs against `main` add no World, snapshot, serving,
  package or distribution file.

Searches over the full `main` tree (192 files):

| Looked for | Where | Found |
|---|---|---|
| File paths matching world / snapshot / package / serve / distribut / publish / pregame / release / export / lock | `git ls-tree -r origin/main` | Only `src/domain/identity/teamAtLock.ts`, `docs/adr/ADR-004-PREGAME-CHRONOLOGY.md`, `docs/operations/PREGAME-SCHEDULE-FEATURES.md` and their tests. None defines a game package |
| WinProbability, distributionEligibility, AnalysisPackage, World Analysis, homeWin, verdict, FINAL_CONFIRMED, ISSUED | `git grep` over `docs`, `src`, `registry` | Planning text only (`docs/operations/ROADMAP-PR-PLAN.md`, `registry/capabilities.json`). No type, no producer |
| Snapshot / lock types | `src/` | `src/domain/engine/readContract.ts` (feature-read contract), `src/domain/evidence/*` (Evidence, chronology), `src/domain/identity/teamAtLock.ts` (team membership at lock) |

### Direct evidence

1. `src/domain/engine/readContract.ts` defines `nba-feature-read-contract.v1`. That is a
   **feature-read** contract: how one declared feature may be read. Every read is CONTRACT_ONLY
   and its engine read site NOT_IMPLEMENTED. It is not a game package and must not be relabelled
   as one.
2. `registry/capabilities.json` and `docs/operations/ROADMAP-PR-PLAN.md` list the work that would
   produce a game package, all PLANNED:
   - SNAP-01: immutable analysis snapshot and prediction lock. Its acceptance says "尚無引擎則
     verdict typed blocked、probability null".
   - ENGINE-04: World consumes TMV and persists a real analysis result.
   - SERVE-01: read-only persisted-snapshot view.
   - SERVE-02: Coach Read from persisted World analysis.
3. `docs/operations/PRODUCTION-LAUNCH-PLAN.md` lists REL-00 (the first release contract: audience,
   data eligibility, freshness) as PLANNED.
4. `docs/operations/PREGAME-SCHEDULE-FEATURES.md:22`: "The overall analysis remains
   `BLOCKED_MISSING` and probability remains null".
5. A's lock and chronology rule (ADR-004): a pregame input for game G needs
   `availableAt < lockAt(G)`. Evidence status is OBSERVED, PRIOR_DERIVED, EXPLICIT_PROXY or
   BLOCKED_MISSING (`src/domain/evidence/evidenceStatus.ts`). These will constrain the package but
   do not define it.

### Field-by-field status of what B renders

| B prototype field (`mosport-b/prototype-game@0`) | A source today | Status |
|---|---|---|
| `gameId` | A has ESPN/NBA game ids in intake (`src/pipeline/*`), not a published game identity contract | NO CONTRACT |
| `away`, `home` (tricodes) | Franchise registry (`src/domain/identity/franchiseRegistry.ts`); no export to B | NO CONTRACT |
| `tipoff`, `venueTz` | Venue registry and timing (`src/domain/identity/venueRegistry.ts`, `src/domain/pipeline/timing.ts`); internal | NO CONTRACT |
| `status`, `score` | Scoreboard and official box intake; internal | NO CONTRACT |
| `world.state` (ISSUED / NOT_ISSUED) | — | NOT DEFINED IN A |
| `world.distributionEligibility` (PUBLIC / INTERNAL) | — | NOT DEFINED IN A |
| `world.version` (INITIAL / FINAL_CONFIRMED / FINAL_UPDATED) | — | NOT DEFINED IN A |
| `world.snapshotId` | SNAP-01 (planned) | PLANNED |
| `world.homeWinProbability` | ENGINE-04 (planned); A currently keeps it null | PLANNED |
| `world.interval60` | — | NOT DEFINED IN A |
| `world.verdict`, `world.why` | SERVE-02 Coach Read (planned) | PLANNED |
| `world.missingReason` | A has typed MissingEvidenceReason for features, not for a game read | PARTIAL / NO CONTRACT |

So no mapping can be written yet. Every left-hand field is a **B expectation**, not an A promise.

### What B does meanwhile

- `worldSource` in every MagazineIssue is `PROTOTYPE_FIXTURE`, the only allowed value. A LIVE issue
  carrying it is refused (`PROTOTYPE_WORLD_IN_LIVE`). So nothing built on prototype data can pass as
  live.
- `site/js/data/providers.js` has no A provider. There is no guessed endpoint.
- The gate and the renderer only remove or pass through World values; they never compute one.

### Questions for MOSPORT-A

Proposed for an issue in Mosport-NBA (not filed from this repo):

1. **Package schema.** What is the versioned schema id for a game-level World Analysis Package, and
   where will its TypeScript type and JSON schema live?
2. **Identity.** Which game id is canonical for consumers (NBA game id, ESPN id, or an A id)? How
   are teams identified: tricode, franchise id, or both?
3. **Lock and version.** What states does a read pass through (for example first lock and final
   confirmation)? What are their names, and what are `lockAt` and the evidence cutoff for each?
   Can a FINAL be superseded, and how is that represented without mutating the original (ADR-007)?
4. **Eligibility.** Who decides that a read may be shown publicly, and with what field? Is that
   separate from internal read eligibility? What is the reason vocabulary when it is not public?
5. **Numbers.** Which numbers are published per game (home win probability, interval, score,
   margin)? What is each one's own qualification flag? Is a missing number `null` plus a typed
   reason?
6. **Narrative.** Will verdict and "why" text come from A (SERVE-02), with what languages, and with
   per-sentence evidence links?
7. **Provenance.** What provenance travels with a package: snapshot fingerprint, model version,
   feature-vector fingerprint, source families? Is there a release receipt?
8. **Delivery.** Is it a file, an API or a database view? What freshness and availability can B
   expect, and how should B detect a stale or withdrawn package?
9. **Sample.** Can A publish one authentic eligible sample, or a redacted one per its data policy,
   for B to build the adapter and contract tests against?

### Status

- B-P2-01 **BLOCKED** on A (SNAP-01, ENGINE-04, SERVE-01/02, REL-00).
- Issue #3 stays open.
- B-P2-02 and B-P2-03 proceed against B-owned contracts and a prototype adapter only.
