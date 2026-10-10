# Technical verification — 2026-10-10

This document reports implementation evidence, not entrant submission copy or a completed learning reflection.

## Verified locally
- Type checking, 36 core tests and 16 browser tests passed in the latest implementation verification. Browser AI replies were mocked; no real provider was called.
- Build passed. An isolated source candidate installed with npm ci --ignore-scripts, passed type checking, 36 core tests and build. Browser tests were not repeated in that isolated candidate.
- Production loopback serving was checked with AI disabled: manual CSV aggregation/download matched independent expectations; a missing key prevents a provider request. This is not a public deployment.
- Fictional three-store/1,200-row repeated-run study: five manual-condition runs, five saved-recipe runs and three renamed-column runs all produced independently checked store/overall totals and Excel output. Logical actions were 10, 6 and 7 respectively. First recipe saving requires three extra actions.
- Automated median times were 0.952 seconds for manual conditions and 1.028 seconds for reuse. No automated speed advantage was observed. These exclude human interpretation and file selection; neither human time savings nor competitor superiority is established.

## Still unverified
Live Codex access/model quality/cost; real daily store files and accounting definitions; human and competitor time comparison; physical smartphones; entrant final review and learning reflection; anonymous public repository/video access.

## Limits to review before judging
Source values remain local; column metadata and the entire typed instruction are sent only after consent. A user can type private information into an instruction. Recipes persist locally and can contain exclusion text. No missing-store, duplicate-transaction, date-period or tax check is implemented. Same column names do not prove unchanged meaning. API attempt limits reset at process restart and are not currency budgets.

## Reproduction
Use the commands and Japanese-control translations in [README](../README.en.md), and the [matched-task plan](../evidence/submission-preparation-2026-10-10/validation-plan.md). No paid connection is necessary for the manual core or mocked tests. Original detailed measurement and implementation records are retained privately; this summary does not imply publication or submission.
