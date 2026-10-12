---
doc: scope
version: '2.0'
updated: '2026-10-10'
status: implemented-locally-verified-live-ai-and-voice-pending
---
## Current submission status — 2026-10-12

This status supersedes older statements below about unpublished code/video, an unselected Ponto license, and fixed-field exports. Those statements are historical records.

- Public source: https://github.com/t-stinger/ponto ; Ponto is MIT licensed (LICENSE). Dependency notices are in THIRD_PARTY_NOTICES.txt.
- Public final demo: https://youtu.be/li5nsGHeCJ0 ; 72.28 seconds, with 15 published English action captions. It shows manual aggregation, three exports, saving reviewed conditions, and verification records rendered from the actual downloaded workbook, not native Excel footage.
- Reproduction data: fixtures/final-demo (three CSV and two value-only XLSX files). Expected: 3,933,030 integer yen, 945 accepted rows, 3,176 items; 55 cancelled rows excluded.
- The selected submission is the implemented manual workflow. Live runtime AI and microphone recognition remain unconfigured/unverified optional paths; they are not demonstrated. No API key is required for manual aggregation.
- Excel has Result, Summary, Sources, Conditions, and SourceDetails worksheets. CSV and PDF contain the result table.
- Devpost remains DRAFT, with the final video link saved. No final submission has been sent. Human time savings and competitive superiority are unmeasured.
- Learner-written submission copy, final learning reflection/checkpoint evidence, eligibility declarations and final terms/submission approval remain unresolved. Publishing links is not certification of all Skill Pack stages.


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

# Scope — Ponto / ぽんと

## Who It's For
User-confirmed validation scenario (2026-10-10): a company president combines sales from individual stores every day to check overall sales. Actual source files, accounting definitions and manual process duration have not been inspected. This is a supplied scenario, not proof of broad market demand.

## The Core Loop
Choose or drop value-only Excel/UTF-8 CSV files; choose the grouping, amount and optional excluded-row columns; review store totals, overall total and row counts; confirm and download a new Excel. Save the reviewed recipe locally and apply it to the next day's inputs. When a required column name changes, stop and select its replacement; unchanged columns remain selected. A reference/template upload is not required.

## The Unique Kernel
Local calculation, explicit confirmation and repair limited to changed bindings. These features are implemented, but their novelty and advantage over competitors remain unproven. Repeatable group/sum and saved transformations already exist elsewhere.

## What Working Looks Like
Fictional two-store sales: A=15,500; B=12,000; accepted overall=27,500; one cancelled row excluded. Result and Summary worksheets must match independent expectations. Next-day reuse, storage errors, stale versions, changed columns and invalid values must not produce false success.

## POC Boundary
PC browser core; responsive presentation is tested at selected phone viewport sizes, not actual phone devices. Up to 10 files, 5 MiB/file, 20 MiB combined, 5,000 rows, 50 columns; first row headers. One selected sheet per input workbook. Group/sum/count and one exact-match exclusion. Local IndexedDB stores recipes only, not imported files/rows. Saved filter text is local configuration.

## AI Boundary
User selected Codex; API key is intentionally deferred to the final setup. Codex model transport through OpenAI Responses API and explicit review/apply UI are implemented. No real API configuration/call is verified. Existing AI contract permits only column metadata and the user's instruction, then validates a narrow proposal; no free-form code execution. Runtime AI is separate from the required AI-assisted Skill Pack development process. Do not silently substitute another provider.

## Explicitly Cut / Later
No scheduling, email, cloud sync, native mobile app, arbitrary formulas, joins, original-file overwrites or fixed-template uploads. Formula/date/merged/hidden-cell imports are rejected. Real phone support follows PC core. Historical plans are preserved under archive; the above supersedes old reference-upload and Anthropic assumptions.

## Approval and evidence
Implementation approval: 2026-10-09. Subsequent user requests authorize the current name, simplified UI, reference-upload removal, PC layout and Codex direction. The sales scenario was supplied on 2026-10-10. No authority to submit or contact outsiders. [PRD](prd.md), [spec](spec.md), [checklist](checklist.md).

## Award evidence update — 2026-10-10
The entrant reports that daily sales from five stores take about two hours: spreadsheet formulas perform the calculation, but the source figures are typed manually. They confirmed that CSV/XLSX source exports are available. This is a reported workflow, not an observed timing study. The target is to reduce re-entry by importing those exports and explicitly reviewing mappings and conditions. Do not equate processing latency with end-to-end business time saved.

Excel exports now add input-level row counts, metric summaries and effective calculation conditions for checking the result's basis. This does not prove that every expected store submitted, that transactions are unique, or that accounting definitions are correct. CSV/PDF still export only the result table. The existing public repository and demo predate this change and require reconciliation before final submission.
