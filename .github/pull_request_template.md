本任務須遵守 Issue #170 的 Capacity / Boundary / Level 規則與 Beta-0 範圍。

Policy: [#170 Current execution policy](https://github.com/mikemm5216/Mosport-NBA/issues/170#current-execution-policy)

- Policy read at / issue updated_at:
- Implementer / independent reviewer / merge executor (actual IDs):

## Purpose and scope

- Problem and resulting behaviour:
- Work-package ID:
- Launch scope: Beta-0 / Beta-1 / later; explain the exact contribution:
- Depends on:
- Blocks:

Beta-0 requires real schedule or honest missing, at least one persistent pregame
snapshot for a genuinely future game, Magazine display or explicit missing, and
the official result joined by the same game ID. UI missing cannot substitute for
the underlying snapshot/result evidence. World probability, T−15 double lock,
new features, role B and a complete article workflow are not Beta-0 prerequisites.

## Existing Implementation Check

Required for every Launch PR. Fill all three parts with concrete evidence.
Missing/vague content or `N/A` is not qualified for ready/merge.

### searched

- Paths and existing PRs inspected:
- HEAD / ref actually inspected, or the specific access limitation:
- Commands / searches:

### found

- Existing implementation, tests and contracts:
- Existing overlap and the remaining gap:

### reuse / why not reused

- Existing work reused, extended or repaired:
- Each non-reused item and reason; if all applicable work is reused, explicitly
  write that there are no non-reused items:

## Capacity Check

- Task / owner / reviewer / checked at:
- EIC 完成？ Y / N + link:
- 預估消耗 / 估算依據 / 硬上限:
- Quota 狀態 / reset 證據（未知填 UNKNOWN）:
- Launch 優先衝突？ Y / N + reason（含 Research 凍結與其他寫入工作）:
- 判定：ALLOW / DENY + reason:
- 允許範圍與停止條件:

EIC 未完成、已知 quota 不足或有優先衝突即 DENY；未 ALLOW 不開始寫 code。
UNKNOWN 不代表足額；限定允許範圍、上限與停止點。範圍或估算增加須重查。

## Boundary Check

- Reviewer / checked at / exact reviewed HEAD:
- EIC 三段是否完整且非空泛？ Y / N + evidence:
- Diff 是否有未說明的重複實作？ Y / N + paths / findings:
- 判定：PASS / BLOCK + reason:
- Remaining blockers / resolution links / review scope:

EIC 缺漏或空泛、未說明的重複實作、未解決阻擋均為 BLOCK，不得 ready／merge。
實作者不得擔任自己的獨立 reviewer；HEAD 變更後覆核受影響差異並更新收據。
PASS 只覆蓋所記錄的範圍，不能代替必要測試、Founder L1／L2 決定或發布授權。

## Founder level and authority

- Highest actual impact: L0 / L1 / L2; explain why:
- L0: existing scope/delegation and designated independent review evidence:
- L1: Founder summary and key diff supplied for the decision, if applicable:
- L2: Founder personal decision reference, if applicable:
- Actual operation authorised now (implementation / review / merge / release):

L0 covers already-authorised documentation, tests and explicit repairs with
independent review and Founder spot checks. L1 covers contracts, calculators and
display logic. L2 covers architecture, Gates, public release, spend and permission
policy. Use the highest actual impact; a `.md` extension does not downgrade
policy. Record an existing applicable decision instead of asking for it again.

## Validation and evidence limits

- Commands run and actual results:
- Checks not run, with scope/capacity reasons:
- New screenshots reviewed when UI changed:
- Runtime / publication / model claims supported by actual receipts:
- Remaining work and next work-package ID:

State separately what was documented, implemented, reviewed and deployed. Do not
reuse another HEAD's tests as proof for this change. Keep the daily report OPEN
until a genuine day-end record; document-only work does not complete runtime.

Use the named Level 0 execution and review procedure in AGENTS.md. Do not implement
Dispatcher automatic interception for the current Beta-0 policy task.
