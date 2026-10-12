# Build checklist — factual status on 2026-10-10

## Current submission status — 2026-10-12

This status supersedes older statements below about unpublished code/video, an unselected Ponto license, and fixed-field exports. Those statements are historical records.

- Public source: https://github.com/t-stinger/ponto ; Ponto is MIT licensed (LICENSE). Dependency notices are in THIRD_PARTY_NOTICES.txt.
- Public final demo: https://youtu.be/li5nsGHeCJ0 ; 72.28 seconds, with 15 published English action captions. It shows manual aggregation, three exports, saving reviewed conditions, and verification records rendered from the actual downloaded workbook, not native Excel footage.
- Reproduction data: fixtures/final-demo (three CSV and two value-only XLSX files). Expected: 3,933,030 integer yen, 945 accepted rows, 3,176 items; 55 cancelled rows excluded.
- The selected submission is the implemented manual workflow. Live runtime AI and microphone recognition remain unconfigured/unverified optional paths; they are not demonstrated. No API key is required for manual aggregation.
- Excel has Result, Summary, Sources, Conditions, and SourceDetails worksheets. CSV and PDF contain the result table.
- Submitted to Build With AI: Basics on 2026-10-12 with entrant consent: https://devpost.com/software/ponto . Devpost displayed “Project submitted!” and the correct competition. Human time savings and competitive superiority are unmeasured.
- Entrant approved the submitted content, eligibility declarations, terms and public information scope. Submission-copy authorship and final learner reflection/checkpoint evidence remain unresolved; successful submission is not certification of all Skill Pack stages.


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


## Official six stages
1. Start: Skill Pack installed; user decisions and experience supplied. Registration/eligibility and private learner-profile completeness still require verification; no certification of completion.
2. Scope: current scope.md aligned to user-approved changes and daily store-sales scenario. Advantage over competitors remains a hypothesis.
3. PRD: current prd.md aligned; no unsupported AI/reference-upload promises.
4. Spec: current spec.md reflects actual code, limits and pending Codex path.
5. Build: manual real-file import, deterministic aggregation, grand total, checked XLSX, recipe persistence, changed-column correction and failure handling implemented. Tests and clean-checkout evidence must be recorded in the completion report. The Codex transport and consent/review UI are implemented; real AI model/account verification, user final trial, learning reflection and human/competitor timing remain open.
6. Ship: technical setup documents, validation materials and app map prepared. Public repository, public demo video, learner-written fields/exit survey and final submission are open. Do not mark submitted or fully ready.

## Mechanical checks
- [x] CSV newline assertion fixed without changing CSV cell semantics.
- [x] Save/reopen/reuse and changed-column repair implemented.
- [x] Version conflict and storage failure handled.
- [x] Daily fictional store sales and overall total supported.
- [x] Latest clean local publication-candidate install, typecheck, 36 core tests and build passed; 16 browser tests passed in the working app. See [technical verification](technical-verification.md). Live AI remains untested.

## Learner / publication checkpoints
- [ ] API key, Codex access method, allowed model and charge ceiling finalized; boundary and actual call verified.
- [ ] User tries real daily sales, confirms same-day inputs, amount meaning and totals.
- [ ] Equivalent manual/competitor baseline and end-to-end time recorded.
- [ ] Final kick-the-tires feedback and learning reflection completed.
- [x] app-map.html prepared from current code (reading it is not proof of a completed learner activity).
- [ ] Public repository/history reviewed and publication explicitly approved; URL verified anonymously.
- [ ] Demo recording approved; human narration/English access prepared; upload authorized and public URL verified.
- [x] Technical English action-caption VTT prepared locally; full video translation and caption attachment remain pending.
- [x] English action captions render in local Chromium; four representative frames and playback/caption switching checked. Actual video is 70.6 seconds; the final caption end is corrected. Full UI translation/public-video verification remain open.
- [x] Production dependency notices refreshed after overriding unzipper to 0.12.3; binary/buffers/chainsaw removed. 36 core tests, 16 browser tests and build pass after the dependency change. Ponto's own public license is still unselected.
- [ ] Actual Devpost form prompts read; learner writes required answers and exit survey.
- [ ] Final submission reviewed and explicitly approved. NO submission sent.

Historical v1.0 documents are preserved under archive/2026-10-09; old unfinished reference-upload plans do not define current completion.

2026-10-10: Codex proposal transport and explicit consent/review/apply path implemented; local no-key behavior and mocked responses tested. Live API/model access, cost and quality remain unverified. No provider call or submission occurred.

Licensing addition (v2): full distributed grants for pdf-lib/standard-fonts/upng/tslib, inherited fontkit notices and the Noto font OFL were appended to THIRD_PARTY_NOTICES.txt. **The @pdf-lib/fontkit 1.1.1 package grant provenance is unresolved**: inspected distribution/repository had an MIT declaration but no full package license text. No blanket license clearance is claimed; external release remains pending this review and Ponto owner license selection.


License review correction — 2026-10-10: the earlier fontkit publication-blocker statement is superseded. Official @pdf-lib/fontkit 1.1.1 metadata declares MIT, identifies its author/contributor, and its README links to standard MIT terms. THIRD_PARTY_NOTICES.txt preserves this provenance, the standard terms and inherited notices without inventing a copyright year. A missing standalone LICENSE file alone is not treated as a blocker. This is not blanket rights certification. The Ponto owner license and authorization to make the repository public are still pending. A reviewed source snapshot is now stored in the private tando-sys/ponto repository; a public repository URL and video URL are still pending.


Sharing update — 2026-10-10: the owner redirected publication to the t-stinger account. This source snapshot is licensed under MIT; see LICENSE for Ponto and THIRD_PARTY_NOTICES.txt for dependencies. The intended submission repository is https://github.com/t-stinger/ponto. Live runtime AI and microphone verification remain pending. The demonstration recorded on 2026-10-10 at 19:14 JST includes the v2 flexible metrics, column mapping, XLSX/CSV/PDF exports and next-day recipe reuse. No application-source changes followed this recording.
