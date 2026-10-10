# Daily store-sales validation plan — 2026-10-10

## Supplied scenario and unknowns
User says a president aggregates each store's sales daily and checks overall sales. Unknown: store count, spreadsheet layout, row definition, tax/currency/refund treatment, period selection, current Excel technique and actual duration. Do not infer these. No real files received.

## Correctness task (fictional)
A store: 12,000 + 3,500; cancelled 800 excluded. B store: 9,800 + 2,200. Independent expected A 15,500; B 12,000; overall 27,500; input 5, accepted 4, excluded 1. Browser test checks display and Summary worksheet. Daily rerun test uses unseen/reordered columns. Changed amount column stops until repaired. Invalid numeric value stops export. A saved-version conflict does not overwrite another update.

## Matched time study
Use the same fictional or approved anonymized files and exact task on each tool. Baselines: the user's current method; Excel manual aggregation; Power Query when available. MACROMAN only if actually available and comparable. Count setup/training separately from recurring use; record both.

For each method complete at least three reruns, in counterbalanced order where possible. Time starts when files are available and ends at a correctly verified exported workbook. Include column correction, error recovery and confirmation. Record wrong totals, omitted/duplicated rows, rework and whether the method was already familiar. Do not exclude unsuccessful runs from the report.

|Run|Method|First setup sec|Routine sec|Correction sec|Total sec|Correct A/B/overall?|Errors/rework|Evidence|
|---|---|---|---|---|---|---|---|---|
|1|User current method|unmeasured|unmeasured|unmeasured|unmeasured|unchecked|unmeasured|pending|
|1|Ponto|unmeasured|unmeasured|unmeasured|unmeasured|unchecked by user|unmeasured|pending|
|1|Available competitor|unmeasured|unmeasured|unmeasured|unmeasured|unchecked|unmeasured|pending|

Only report a measured paired difference after equal correctness. Automation/test-suite duration is machine processing evidence, not proof a president saves time. No competitor UI operation or human timesaving measurement is claimed here.

## Conditions where value/differentiation fails
Existing workflow already consolidates safely with fewer steps; required source formats are rejected; daily period/store completeness/duplicates cause mistakes; user cannot understand confirmation; saving is unavailable; correction is more burdensome. Group/sum alone is insufficient novelty. Stronger evidence needs actual recurring workload, matched comparison and user-observed benefit.

## Additional automated study on 2026-10-10
The local Ponto manual-reentry path and saved-recipe path were each measured five times, with three renamed-column runs. All 13 downloaded results matched independent expected values for three stores/1,200 rows. Logical actions were 10 versus 6 (7 for repair). Median automated times were 0.952s versus 1.028s; no automated time reduction was observed. This is not a human or competitor study. See the [technical summary](../../devpost/technical-verification.md). Original detailed method and rejected unequal-wait preliminary data are retained locally outside the publication candidate. Human/competitor table above remains unmeasured.
