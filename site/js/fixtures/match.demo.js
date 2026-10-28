/*
 * DEMO Match Detail content for DEMO-0041 (UI-01-a nine-step analysis).
 * The verdict and the number are NOT here: they come from the World package in
 * issue.demo.js and pass through the eligibility gate. Everything is fictional.
 */
(window.MOSPORT_FIXTURES = window.MOSPORT_FIXTURES || {}).details = {
  "DEMO-0041": {
    "zh": {
      "demo": "真實球隊名稱；球員、來源與數值皆為虛構，不是預測",
      "runhead": "MATCH DETAIL · 例行賽",
      "tip": "台北 週日 11:00 · 場館 週六 19:00 PT",
      "venue": "America/Los_Angeles · 主場：LAL",
      "verBadge": "最終版 · 已確認",
      "snapBadge": "快照 4f9c2a1e",
      "phase": "例行賽",
      "readLabel": "② World · Coach Read",
      "because": "Because",
      "becauseTxt": "勇士背靠背第二晚，賽前移動 560 公里，並缺少 31.5 分鐘的輪替時間；湖人休息兩天、輪替完整。",
      "but": "But",
      "butTxt": "勇士近期外線命中穩定，若比賽節奏加快，差距可能縮小。",
      "watch": "Watch",
      "watchTxt": "開賽前官方傷病報告若更新勇士後衛 B 的狀態，這個判讀會重新確認。",
      "winLbl": "主隊勝率",
      "bandAria": "60% 區間 54% 到 67%，估計值 61%",
      "bandNote": "60% 區間 54–67% · 同列 baseline B0-ELO-HOME",
      "scoreLbl": "預估比分",
      "score": "LAL 114 – 109",
      "marginLbl": "分差",
      "margin": "LAL +5",
      "totalLbl": "總分",
      "notQualified": "尚未合格",
      "fieldNote": "每個數值各自需要正式輸出資格；未合格的欄位保留位置並標明原因，不補數字。",
      "verLabel": "③ 版本狀態",
      "v1": "第一版 · 已鎖定",
      "v1Time": "台北 週日 07:40 · 場館 週六 15:40 PT",
      "v2": "最終版 · 已確認（T−15）",
      "v2Time": "台北 週日 10:45 · 場館 週六 18:45 PT",
      "changes": "變動說明",
      "changesTxt": "最終確認時證據沒有變動，判讀與數值都與第一版相同。",
      "firstShow": "查看第一版",
      "firstHide": "收起第一版",
      "firstSummary": "第一版：湖人主場較有利 · 主隊勝率 61%（60% 區間 54–67%）· 鎖定 15:40 PT",
      "snapLbl": "快照",
      "cutoffLbl": "證據截點",
      "cutoff": "18:45 PT（T−15）",
      "modelLbl": "模型",
      "recoveryNote": "若最終確認未完成，這裡改顯示「第一版 · 最終確認未完成」、原始鎖定時間與原因，不會標成已確認。",
      "facLabel": "④ 核心因素",
      "facNote": "比較條位置來自 World 的結構化輸出；前端不計算方向或強度。",
      "factors": [
        {
          "name": "Player value（PMV）",
          "dir": "略偏湖人",
          "pos": 2
        },
        {
          "name": "Team structure（TMV）",
          "dir": "偏湖人",
          "pos": 3
        },
        {
          "name": "Workload & rest",
          "dir": "明顯偏湖人",
          "pos": 4
        },
        {
          "name": "Game context",
          "dir": "資料部分缺失：排名利害尚無定義",
          "pos": 0,
          "partial": true
        }
      ],
      "pmvLabel": "⑤ PMV 球員影響",
      "pmvNote": "PMV 不是預估得分。數值只在合格、可解釋且允許發布時顯示；刻度待 ENGINE-03 定義，這裡以 [X.X] 佔位。",
      "players": [
        {
          "name": "湖人 · 後衛 A",
          "team": "LAL",
          "avail": "可出賽",
          "level": "關鍵",
          "why": "主要持球者；勇士缺少對位的輪替後衛。",
          "val": true
        },
        {
          "name": "勇士 · 前鋒 A",
          "team": "GSW",
          "avail": "可出賽",
          "level": "重要",
          "why": "背靠背第二晚仍是勇士上場時間最多的球員。",
          "val": true
        },
        {
          "name": "勇士 · 後衛 B",
          "team": "GSW",
          "avail": "出賽成疑（17:30 PT 報告）",
          "level": "待定",
          "why": "官方狀態未定，PMV 本版未評估。",
          "val": false,
          "valNote": "未評估 · NOT_EVALUATED"
        }
      ],
      "tpLabel": "⑥ Turning Point",
      "tpNote": "只來自已鎖定的賽前判讀；比賽中不重新產生。賽後在 Review 標示是否發生。",
      "turns": [
        {
          "k": "第二節勇士替補輪替",
          "v": "若勇士在替補時段沒有掉分，背靠背的體能劣勢影響會比判讀小。"
        },
        {
          "k": "湖人外線出手比例",
          "v": "若湖人外線出手明顯偏多，比賽變數會增加。"
        }
      ],
      "falLabel": "⑦ Falsifier · 什麼會推翻這個判讀",
      "fals": [
        "開賽前官方報告把勇士後衛 B 改為可出賽。",
        "開賽前湖人有兩名以上輪替球員列為不出賽。",
        "比賽改到中立場或改期。"
      ],
      "extLabel": "⑧ 外部來源（非 Mosport 分析）",
      "extNote": "逐來源呈現；不換算隱含機率、不整理一致或分歧，也不與 World 比較。",
      "oddsMeta": "格式：美式 · 報價 18:20 PT · 取得 18:21 PT · 適用 DEMO-0041",
      "atFinal": "最終版當時已可取得",
      "atFirst": "第一版當時已可取得",
      "videoTitle": "「勇士客場背靠背的體能問題」（DEMO 標題）",
      "embed": "官方嵌入播放器",
      "videoMeta": "發布 16:10 PT · 相關時間點 04:12 · 經驗證的賽前觀點：背靠背第二晚的體能是關鍵",
      "analystTitle": "「湖人的板凳深度」（DEMO 標題）",
      "analystMeta": "發布 19:20 PT（開賽後）",
      "later": "後續資訊：鎖定後才發布，不在本次預測內 · 權利只允許連結",
      "origin": "原始連結",
      "evLabel": "⑨ Evidence／Provenance",
      "partial": "完整度：部分",
      "fullProv": "查看完整出處",
      "evidence": [
        [
          "賽程與開賽時間",
          "已觀察 · ESPN 暫定",
          "q"
        ],
        [
          "官方傷病報告",
          "已觀察 · 17:30 PT",
          "q"
        ],
        [
          "主客場",
          "已觀察 · HOME",
          "q"
        ],
        [
          "輪替分鐘",
          "缺失 · SOURCE_NOT_PUBLISHED",
          "na"
        ],
        [
          "系列賽脈絡",
          "不適用（例行賽）",
          "q"
        ],
        [
          "排名利害",
          "封鎖 · BLOCKED_PRODUCT_REQUIREMENT",
          "na"
        ],
        [
          "來源權利",
          "未驗證 · UNVERIFIED",
          "na"
        ]
      ],
      "foot": "DEMO：除球隊名稱外，所有名稱、數字與來源皆為佔位。比賽中只更新比分、節次與狀態，不重新產生判讀。"
    },
    "en": {
      "demo": "Real team names; players, sources and values are fictional. Not a prediction.",
      "runhead": "MATCH DETAIL · Regular season",
      "tip": "Sun 11:00 Taipei · Sat 19:00 PT at venue",
      "venue": "America/Los_Angeles · Home court: LAL",
      "verBadge": "Final · Confirmed",
      "snapBadge": "Snapshot 4f9c2a1e",
      "phase": "Regular season",
      "readLabel": "② World · Coach Read",
      "because": "Because",
      "becauseTxt": "Golden State is on the second night of a back-to-back after 560 km of travel and is missing 31.5 rotation minutes; the Lakers have two days of rest and a full rotation.",
      "but": "But",
      "butTxt": "Golden State’s outside shooting has been steady; a faster pace could narrow the gap.",
      "watch": "Watch",
      "watchTxt": "If the official injury report changes Golden State Guard B’s status before tip-off, this read is checked again.",
      "winLbl": "Home win",
      "bandAria": "Central 60 percent band from 54 to 67 percent, estimate 61 percent",
      "bandNote": "central 60% band 54–67% · same-row baseline B0-ELO-HOME",
      "scoreLbl": "Projected score",
      "score": "LAL 114 – 109",
      "marginLbl": "Margin",
      "margin": "LAL +5",
      "totalLbl": "Total",
      "notQualified": "Not qualified",
      "fieldNote": "Each number needs its own output qualification. An unqualified field keeps its place and states why; no number is filled in.",
      "verLabel": "③ Version",
      "v1": "First read · Locked",
      "v1Time": "Sun 07:40 Taipei · Sat 15:40 PT at venue",
      "v2": "Final · Confirmed (T−15)",
      "v2Time": "Sun 10:45 Taipei · Sat 18:45 PT at venue",
      "changes": "What changed",
      "changesTxt": "No evidence changed at the final check; the read and numbers match the first read.",
      "firstShow": "View first read",
      "firstHide": "Hide first read",
      "firstSummary": "First read: the Lakers at home are favoured · home win 61% (60% band 54–67%) · locked 15:40 PT",
      "snapLbl": "Snapshot",
      "cutoffLbl": "Evidence cutoff",
      "cutoff": "18:45 PT (T−15)",
      "modelLbl": "Model",
      "recoveryNote": "If the final check does not complete, this shows “First read · Final check not completed”, the original lock time and the reason. It is never marked confirmed.",
      "facLabel": "④ Core factors",
      "facNote": "Bar positions come from World’s structured output; the front end does not compute direction or strength.",
      "factors": [
        {
          "name": "Player value (PMV)",
          "dir": "Slightly Lakers",
          "pos": 2
        },
        {
          "name": "Team structure (TMV)",
          "dir": "Lakers",
          "pos": 3
        },
        {
          "name": "Workload & rest",
          "dir": "Clearly Lakers",
          "pos": 4
        },
        {
          "name": "Game context",
          "dir": "Partial: seeding stakes not yet defined",
          "pos": 0,
          "partial": true
        }
      ],
      "pmvLabel": "⑤ PMV player impact",
      "pmvNote": "PMV is not a points projection. A value appears only when qualified, explainable and cleared for release; its scale awaits ENGINE-03, so [X.X] is a placeholder.",
      "players": [
        {
          "name": "Lakers · Guard A",
          "team": "LAL",
          "avail": "Available",
          "level": "Key",
          "why": "Primary ball handler; Golden State lacks the rotation guard to match up.",
          "val": true
        },
        {
          "name": "Warriors · Forward A",
          "team": "GSW",
          "avail": "Available",
          "level": "Major",
          "why": "Still Golden State’s biggest minutes load on the second night.",
          "val": true
        },
        {
          "name": "Warriors · Guard B",
          "team": "GSW",
          "avail": "Questionable (17:30 PT report)",
          "level": "Pending",
          "why": "Official status unsettled; PMV not evaluated in this version.",
          "val": false,
          "valNote": "Not evaluated · NOT_EVALUATED"
        }
      ],
      "tpLabel": "⑥ Turning Point",
      "tpNote": "Comes only from the locked pregame read; never regenerated during play. Review marks whether each one happened.",
      "turns": [
        {
          "k": "Golden State’s second-quarter bench stretch",
          "v": "If Golden State holds even through its bench minutes, the fatigue edge matters less than the read assumes."
        },
        {
          "k": "Lakers’ three-point share",
          "v": "If the Lakers lean heavily on threes, variance in the outcome rises."
        }
      ],
      "falLabel": "⑦ Falsifier · what would overturn this read",
      "fals": [
        "Golden State Guard B is upgraded to available on an official report before tip-off.",
        "The Lakers list two or more rotation players out before tip-off.",
        "The game moves to a neutral site or a new date."
      ],
      "extLabel": "⑧ External sources (not Mosport analysis)",
      "extNote": "Shown source by source; no implied-probability conversion, no consensus or split, no comparison with World.",
      "oddsMeta": "Format: American · quoted 18:20 PT · captured 18:21 PT · applies to DEMO-0041",
      "atFinal": "Available at the final read",
      "atFirst": "Available at the first read",
      "videoTitle": "“Golden State’s back-to-back legs” (DEMO title)",
      "embed": "Official embedded player",
      "videoMeta": "Published 16:10 PT · relevant at 04:12 · verified pregame view: second-night fatigue is the key",
      "analystTitle": "“The Lakers’ bench depth” (DEMO title)",
      "analystMeta": "Published 19:20 PT (after tip-off)",
      "later": "Later information: published after the lock, not part of this read · rights allow a link only",
      "origin": "Original",
      "evLabel": "⑨ Evidence / Provenance",
      "partial": "Completeness: partial",
      "fullProv": "Show full provenance",
      "evidence": [
        [
          "Schedule and tip time",
          "Observed · ESPN provisional",
          "q"
        ],
        [
          "Official injury report",
          "Observed · 17:30 PT",
          "q"
        ],
        [
          "Home court",
          "Observed · HOME",
          "q"
        ],
        [
          "Rotation minutes",
          "Missing · SOURCE_NOT_PUBLISHED",
          "na"
        ],
        [
          "Series context",
          "Not applicable (regular season)",
          "q"
        ],
        [
          "Seeding stakes",
          "Blocked · BLOCKED_PRODUCT_REQUIREMENT",
          "na"
        ],
        [
          "Source rights",
          "Unverified · UNVERIFIED",
          "na"
        ]
      ],
      "foot": "DEMO: apart from team names, every name, number and source is a placeholder. During play only the score, period and status update; the read is not regenerated."
    }
  }
};
