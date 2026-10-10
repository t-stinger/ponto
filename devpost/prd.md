---
doc: prd
version: '2.0'
updated: '2026-10-10'
status: implemented-locally-verified-live-ai-and-voice-pending
---
## v2 implemented supplement — 2026-10-10
This supplement supersedes the fixed one-group/one-sum/Excel-only statements below. Expansion code is implemented; type checking, 51 core tests, 20 browser tests and the production build pass. Earlier test counts refer to v1, not evidence that this expansion passes.

- Import constraints are unchanged. **列名をそろえる** explicitly maps source headers to common names; mapping changes invalidate output and do not modify original files. Matching names do not establish matching units, tax or business meaning.
- **集計項目を選ぶ**: 0–3 grouping columns; 1–8 metrics; sum / count / average / min / max. Edit labels and item order for the output table. Grouping columns precede metrics. Count means all accepted rows, without a numeric column. Average uses accepted valid numeric rows; blank/non-numeric numeric cells fail, including excluded rows. No accepted rows makes average/min/max invalid.
- **話す・書く** opens editable instructions. Browser speech recognition is optional and limited by browser support and microphone permissions. A separate confirmation precedes recognition because audio may go to the browser provider. No audio-storage/privacy guarantee is made. Recognition errors/non-support leave text entry available. Actual microphone/recognition has not been verified.
- AI sends only column metadata and the complete typed/transcribed instruction after separate explicit consent. Source rows/files are not sent. Review proposed columns, operations, exclusion and labels, explicitly apply, then calculate locally. No key/model is configured; no live calls, costs or model quality verified.
- Confirm conditions and the final table before downloading **Excel / CSV / PDF**. All formats use the same calculated rows. XLSX Result and Summary are read back; groups/IDs and counts do not get metric decimal formatting. CSV has UTF-8 BOM/CRLF; dangerous text gets a leading apostrophe for spreadsheet formula safety, while typed negative numbers stay numeric. CSV/PDF contain the result table; XLSX additionally has overall metric summaries.
- PDF: Japanese Noto Sans JP full embedding (~9.6 MB font), landscape A4, repeated headings and wrapped/multipage cells. Up to 11 columns/5,000 rows, 10,000 characters/cell, 1,000 PDF pages. Unsupported glyphs (including unsupported emoji) error explicitly; choose CSV/Excel. Font source and OFL are in public/fonts.
- Existing saved v1 recipes remain intact; v2 recipes are saved explicitly. Per-file header mappings are volatile and must be checked for new inputs; they are not saved as permanent source-file aliases.
- API setup remains the final optional step for natural-language interpretation. Manual v2 calculation/export requires no AI API. No public deployment, repository publication or submission has occurred. Human time saving, broad demand and novelty remain unproven.

# PRD — Ponto

## Problem and goal
A president checks sales across stores every day. Reduce repeated consolidation and avoid wrong columns, invalid amounts and stale results. Actual daily workload, input formats, time savings and competitor advantage still require user validation. No award/effect guarantee.

## Core journey
1. Drop or select store files. If a workbook has multiple sheets, select the relevant sheet.
2. Choose a recipe, or select grouping/amount and optional exclusion manually.
3. Review store totals, overall total and counts. Confirm before download or recipe saving.
4. Reopen next day, choose the saved recipe and add new files.
5. Changed column names require only those bindings to be selected again. Updating the saved recipe and saving a separate recipe are distinct choices.

## Functional requirements and acceptance
- F01: UTF-8 CSV and value-only XLSX inputs, drag/drop, limits and errors. No mandatory reference upload.
- F02: Deterministic decimal sum/count; exclude only exact status matches. Validate all amounts, including excluded rows.
- F03: Overall total is calculated from accepted original values before output rounding; it can differ from a sum of independently rounded store figures. No currency/tax interpretation is inferred.
- F04: Separate file/conditions/result screens; PC side panels; paginated files/results. No page scrolling at the tested viewport sizes. Large text/browser zoom remains unverified.
- F05: New XLSX with Result store rows and Summary overall total/accepted/excluded counts, reread before enabling output. Input files unchanged.
- F06: Confirmation is invalidated whenever conditions/input/output format change. Unconfirmed, invalid or pending output cannot download.
- F07: IndexedDB recipe persistence, versioned updates, explicit deletion, storage failures surfaced, stale version rejected.
- F08: Missing required binding stops execution; unchanged bindings survive. Semantic changes retaining the same column name are not automatically detected.
- F09: Codex proposal transport and consent/review/apply UI implemented. A proposal cannot run calculation by itself. Live model/account verification remains pending final key/model/spending setup. Mocked test replies do not establish model quality.

## Safety and limits
See [spec](spec.md). No duplicate-transaction detection, date-period check, tax normalization or missing-store detection exists. User must select the intended day/files and understand what a source row represents. These are practical validation risks, not hidden guarantees.

## Validation and impact
Automated fictional data verifies arithmetic and export. [Validation plan](../evidence/submission-preparation-2026-10-10/validation-plan.md) defines matched tasks and time/error measurements. Measure acquisition through checked Excel output, including correction and confirmation. A comparison is valid only on the same inputs, task and verification standard. No measured human time saving yet.

## Sharing
Required official repository/video links and human-authored submission fields are outstanding. Localhost cannot serve as a public judging URL. Publication and submission need explicit user approval. [Checklist](checklist.md).
# Evidence refinement — 2026-10-10

The reported audience is a company owner reviewing five stores daily. Their existing Excel formulas calculate automatically, but figures are manually re-entered; the entrant reports about two hours and confirms that CSV/Excel exports are available. This supports testing import instead of re-entry, not claiming a measured two-hour saving.

Additional acceptance: Excel export includes source-by-source input/accepted/excluded counts and metric values, plus the effective calculation conditions. Separate identical filenames by input number; do not invent missing-store checks or transactions deduplication. Validate exported records by re-reading them. The original Result/Summary and CSV/PDF values remain consistent.

Measure initial setup, next-day reuse, changed-column repair, correct output and human time separately. Compare configured Power Query fairly; major aggregation features already exist there. Competition-facing prose must distinguish reported baseline, fictional-data validation and measured human outcomes.
