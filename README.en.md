# Ponto — technical run instructions

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


Ponto runs in a PC browser and consolidates value-only Excel/CSV tables by a selected group and numeric amount. It exports store/group totals and an overall summary. The Codex proposal API and review UI are implemented; real API access is **not configured or verified**. Imported table values are never passed to the proposal endpoint. Saved recipes stay in IndexedDB on the same browser origin; imported files/rows are not persisted.

## Run
Requires Node.js 24 and npm. From the repository root:

```sh
npm ci
npm run verify:core
npx playwright install chromium
npm run test:browser
npm run build
npm run dev
```
Open http://127.0.0.1:4180/ locally. This localhost address is not a public judging link.

## Controls (Japanese UI)
- 表を入れる: select/drop source spreadsheets. For a workbook with multiple sheets, select one sheet.
- まとめ方を選ぶ: select grouping and amount columns; optionally an exact-match excluded status.
- 集計する: calculate and validate the exported workbook by reading it back.
- 全体合計: total from accepted original values, rounded once. It can differ from a sum of individually rounded groups.
- 条件と結果を確認しました: confirm conditions and output. Required before saving/export.
- Excelを保存: download a new workbook; Result contains group totals/counts, Summary the overall total and row counts.
- このまとめ方を保存 / 保存したまとめ方: save/reopen a recipe; add new files to reuse it. Changed columns require re-selection. A new save and a version update are distinct operations.

CSV must be UTF-8; first row headers. Formula/date/merged/hidden cells are not supported and fail visibly. Max 10 files, 5 MiB/file, 20 MiB total, 5,000 rows, 50 columns. Input files are not overwritten. Missing-store, duplicate-transaction, accounting-period and tax checks are not implemented. Keep the intended day and amount meaning consistent yourself.

## Validation and status
Fictional test data is not real customer evidence. Automated elapsed time is not human time savings. See devpost/scope.md, prd.md, spec.md and checklist.md; evidence/submission-preparation-2026-10-10/ contains the preparation record and matched-task validation procedure.

Required AI-assisted learning resources are from https://github.com/challengepost/learn-ai-basics (installed locally using `npx skills add challengepost/learn-ai-basics --all -y`). Installed tool bundles are not authored application code. Submission text must be written by the entrant; this document is technical setup information.

## Dependencies and licensing
THIRD_PARTY_NOTICES.txt contains notice/grant texts for the locked production dependencies. ExcelJS 4.4.0 uses an explicitly overridden unzipper 0.12.3 (outside its original ^0.10.11 range) to remove the old binary/buffers/chainsaw dependency chain whose distribution license texts were incomplete. The supported local CSV/XLSX workflow is regression-tested; all upstream ExcelJS streaming/extraction APIs are not certified. The Ponto project's own public license is still awaiting owner selection; the notices file does not license Ponto itself.

## Codex configuration (final setup only)
Runtime AI uses an explicitly selected Codex model through OpenAI Responses API, not the desktop coding-agent session/CLI. There are no file, shell or browser tools. Final setup requires authorized model access and spending approval; no model alias is selected automatically.

Copy .env.example to .env only at final setup; set OPENAI_API_KEY and OPENAI_CODEX_MODEL on the server. Set PONTO_AI_ENABLED=true and an approved PONTO_AI_MAX_CALLS only then. Leave both disabled/zero while preparing. Never use a VITE_ prefix, commit .env or place a key in browser storage. A call cap counts failed attempts, is per process and resets on restart; it is not a monetary billing cap. There are no automatic retries. Confirm actual model availability/pricing and account billing controls before live calls.

`npm run dev` runs the local Vite UI with the API handler; `npm run build && npm start` serves dist and the same handler using Node, on 127.0.0.1:4180. Deployment beyond localhost is not part of this setup. Static-file hosting alone does not provide the API.

Choose 文章で指定する on the conditions screen, enter instructions, explicitly consent to sending column names/instructions, and request a proposal. Review bindings before selecting このまとめ方を使う. The app applies conditions, not a calculation; check conditions and run the normal local calculation. Unsupported/ambiguous instructions can produce a clarification question. Without configuration, no provider request is made and manual selection remains available. Test-only mocked AI replies are not runtime fallbacks or evidence of model quality.

Licensing addition (v2): full distributed grants for pdf-lib/standard-fonts/upng/tslib, inherited fontkit notices and the Noto font OFL were appended to THIRD_PARTY_NOTICES.txt. **The @pdf-lib/fontkit 1.1.1 package grant provenance is unresolved**: inspected distribution/repository had an MIT declaration but no full package license text. No blanket license clearance is claimed; external release remains pending this review and Ponto owner license selection.
