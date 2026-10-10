---
doc: spec
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

# Technical specification — Ponto

## Architecture
Vite/TypeScript browser UI in src/browser/main.ts. Each file/calculation request creates a Web Worker (src/browser/worker.ts); worker parses, aggregates, writes Excel and rereads it. A local Node server and Vite middleware expose the same Codex proposal endpoint; live AI access is not configured. UI changes invalidate pending work and previous output. A request exceeding 20 seconds is terminated.

## Import
src/io/tables.ts: strict UTF-8 CSV/PapaParse, ExcelJS XLSX, ZIP expansion validation. Table headers normalized NFC/trim; duplicate or empty headers rejected. Formula, date, merged or hidden cells, ambiguous numeric representations and zero-padded numeric identifiers fail visibly. Ten inputs maximum; individual 5 MiB, combined 20 MiB, expanded ZIP 40 MiB; 5,000 total rows and 50 columns. Multiple worksheets require selection. Original files remain in volatile memory and are never overwritten.

## Recipe and calculation
src/domain/aggregate.ts FixedRecipe: groupColumn, amountColumn, statusColumn, excludedStatus, excludeEnabled, outputHeaders (three distinct names), decimalPlaces (0..10). Only named common columns may be selected. Decimal.js precision 40, half-up rounding; reject quantities/intermediate totals beyond 15 significant digits. Accepted original values contribute to the grand total; independently rounded store rows must not be summed to reconstruct it. Output order follows first encounter, no implicit date or currency meaning.

## Result and export
Result contains headers/rows/grandTotal and input/accepted/excluded/unprocessed/output counts. UI shows the grand total plus paginated store rows. Result worksheet stores group/sum/count; Summary stores total/accepted/excluded counts. Worker reads both sheets back and compares before returning bytes. Download uses a local Blob only after user confirmation.

## Persistence and changes
src/domain/jobs.ts: IndexedDB ponto-jobs version 1, store jobs keyed by id. Schema includes name, positive version, recipe and update timestamp. New saves create UUID/version 1. Updates compare stored version inside a readwrite transaction and increment it; mismatch aborts. Delete also checks version. Resolves only after transaction completion. No files or source rows persisted; recipes can contain user-entered exclusion text. Saving failures keep prior records; schema errors stop listing rather than silently dropping entries. No full historical-version restore is provided.

## AI contract and pending setup
src/ai/contract.ts validates metadata/proposals. src/server/ai.ts sends only validated metadata/instructions to OpenAI Responses API with an explicitly configured Codex model, empty tools, no tool choice and store=false. It does not launch the Codex SDK/CLI or access source files for inference. Runtime live verification remains pending final key/model/charge setup. API key must never enter browser code or public repository. Do not use an existing desktop login as a bypass. A read-only agent sandbox alone is insufficient to prove an agent cannot read source files. Only metadata plus instructions may be transmitted under the proposed boundary. Real API correctness, model quality, delay and costs are untested. The local handler requires a loopback host, same-origin JSON POST and explicit action header; 32 KiB request cap, 40-second provider timeout, 256 KiB response cap, strict result validation, sanitized errors and no retries. Disabled settings reject before sending. A per-process attempt cap includes failed attempts and resets on restart; it is not a currency budget. Proposal application is explicit and invalidates prior results.

## Verification and known gaps
Tests: tests/core.test.ts, tests/compare.test.ts, tests/ai-contract.test.ts, tests/browser/workflow.spec.ts. Fictional results and independent expectations are used, including changed columns, saved recipes, conflict and storage failure. No real store data inspected; no human time measurements; no actual smartphone/browser matrix or production AI test. [Validation plan](../evidence/submission-preparation-2026-10-10/validation-plan.md).

Licensing maintenance: ExcelJS 4.4.0's unzipper is overridden to 0.12.3, outside the upstream ^0.10.11 range, to remove binary/buffers/chainsaw with incomplete distributed license texts. The lock and production notices are updated. Verify the supported app workflow after this change; no claim covers every upstream streaming API. Ponto's own license awaits owner approval.

## Setup and sharing
Node 24; npm ci; npm run verify:core; npx playwright install chromium; npm run test:browser; npm run build; npm run dev (127.0.0.1:4180); npm run build followed by npm start serves the production bundle and local API. See [English run instructions](../README.en.md) and [app map](app-map.html). Public repository/video links: not yet created. Publication and final submission are awaiting explicit user confirmation.

Licensing addition (v2): full distributed grants for pdf-lib/standard-fonts/upng/tslib, inherited fontkit notices and the Noto font OFL were appended to THIRD_PARTY_NOTICES.txt. **The @pdf-lib/fontkit 1.1.1 package grant provenance is unresolved**: inspected distribution/repository had an MIT declaration but no full package license text. No blanket license clearance is claimed; external release remains pending this review and Ponto owner license selection.


License review correction — 2026-10-10: the earlier fontkit publication-blocker statement is superseded. Official @pdf-lib/fontkit 1.1.1 metadata declares MIT, identifies its author/contributor, and its README links to standard MIT terms. THIRD_PARTY_NOTICES.txt preserves this provenance, the standard terms and inherited notices without inventing a copyright year. A missing standalone LICENSE file alone is not treated as a blocker. This is not blanket rights certification. The Ponto owner license and authorization to make the repository public are still pending. A reviewed source snapshot is now stored in the private tando-sys/ponto repository; a public repository URL and video URL are still pending.
# Source verification records — 2026-10-10

The fixed and flexible results include sourceAudit with input index, filename, selected sheet when applicable, original and mapped headers, input/accepted/excluded rows, reader-removed blank rows, and source-level metrics. Distinguish inputs with equal filenames by index. Empty input average/min/max is null; sum/count is zero.

XLSX output adds Sources, Conditions and SourceDetails to Result/Summary. SourceDetails records original-to-common header mapping and selected sheet. Conditions records schema-validated effective recipe including defaults, plus notes for blank-row counting and rounding. Worker re-reads all five sheets before returning a downloadable result. CSV/PDF still contain only result rows.

Reader blankRows is not a physical CSV blank-line count. Source metrics are individually rounded; global values use accepted original values and round once, so adding rounded source values can differ. These records are explanatory, not tamper-proof audit logs. They do not detect missing stores, duplicate transactions or incorrect accounting periods.
