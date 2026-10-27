---
target: the compare page
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/philip./NTNU/TDT4290/healthtech-group1-2026/frontend/app/features/aggregated-exposure/pages/compare-page.tsx"
target_fingerprint: "sha256:043ae0138197506849a401c7f751de36e82eff6217fc58731ed0d1e536949694"
target_path: /Users/philip./NTNU/TDT4290/healthtech-group1-2026/frontend/app/features/aggregated-exposure/pages/compare-page.tsx
timestamp: 2026-10-23T19-39-27Z
slug: ggregated-exposure-pages-compare-page-tsx-24bfa1b6
---
Method: dual-agent (A: design review · B: detector). Browser visualization skipped by user preference.

## Design Health Score: 28/40 (Good), up from 25
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Yard by title shows filter not compared yards; picker says "all added" while loading |
| 2 | Match System / Real World | 2 | Exposure chosen last, invisible before groups are added |
| 3 | User Control and Freedom | 2 | Down-level clears with Back as only undo; mobile Close resets filters |
| 4 | Consistency and Standards | 3 | Exposure in card here, page-level on group page |
| 5 | Error Prevention | 3 | No confirm/undo on down-level clear |
| 6 | Recognition Rather Than Recall | 3 | Mobile level only visible in dialog |
| 7 | Flexibility and Efficiency | 3 | No arrow-key nav in add list; no entry from overview/group page |
| 8 | Aesthetic and Minimalist Design | 3 | Count duplicates slots; yard shown twice |
| 9 | Error Recovery | 3 | Blank chart column when all groups fail |
| 10 | Help and Documentation | 3 | Partly hidden days only explained in dialog |

## Design Specificity
Authored: traceability, shape+colour identity, no ranking. Detector: 0 findings in 7 files (overused-font=inter sanctioned).

## Fixed since last run
Missing-data states, colour-alone identity, period on cards, help text moved to dialog. Not fixed: customer flow order.

## Priority Issues
- [P1] Exposure chosen last / invisible on first load; dust default unlabelled as unvalidated. Fix: exposure first row in setup panel. /impeccable layout
- [P1] Development over the period only as pixels; table has averages/shares only; chartLabel misleading. Fix: development figure + "Show values". /impeccable harden
- [P2] connectNulls bridges privacy-hidden days. Fix: break/dotted line, "n days hidden". /impeccable harden
- [P2] Level change wipes work, Back-only undo; mobile Close resets filters. Fix: Undo in note, don't reset on Close, show level outside dialog. /impeccable harden
- [P2] 1280–1535px chart cramped beside figures (estimated). Fix: figures below chart until ~1536px or one-line side list. /impeccable layout

## Persona Red Flags
- Alex: Tab-only add list, no in-place replace, no entry point from overview.
- Sam: development inaccessible; adding 2nd/3rd group not announced; ThresholdLegend reads labels twice.
- HSE reviewer: no export, no headcount, average tagged "Above action value" may read as compliance verdict.

## Minor Observations
"All added" while loading; dark --series-1 ~2.7:1 (relief via labels/table); in-progress period copy heavy; privacy rule worded differently than overview; shared-link groups dropped silently; only building levels link to details; "23 %" in English.

## Questions to Consider
1. Is exposure the comparison's first question rather than a view?
2. One column per group (figures + sparkline) instead of overlay for meetings?
3. Make the figures table the primary, printable view?
