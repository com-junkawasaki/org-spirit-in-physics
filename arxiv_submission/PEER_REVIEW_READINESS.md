# Peer-review submission readiness — Spirit in Physics

Audit date: 2026-09-28 (JST). Remote baseline: \`com-junkawasaki/main\` at
\`8d97934a\`, fetched on this date. This is a preparation record, not evidence
that a journal has received or accepted a manuscript.

## Recommended route

First target: *Frontiers in Psychology*, Consciousness Research and Mindfulness,
article type **Hypothesis and Theory**. This type permits a testable new model
and original pilot data. The manuscript must frame the 970 trials as a
construction-feasibility illustration, not a confirmatory test of physical
energy, Jungian complexes, or the collective unconscious.

- Section scope: https://www.frontiersin.org/journals/psychology/sections/consciousness-research-and-mindfulness/about
- Article type: https://www.frontiersin.org/journals/psychology/sections/consciousness-research-and-mindfulness/for-authors/article-types
- Current fee page (check again at submission): https://www.frontiersin.org/journals/psychology/for-authors/publishing-fees

## Gate register

| Gate | Status on 2026-09-28 | Evidence and action |
| --- | --- | --- |
| Current source and figures | Prepared for review | \`main.tex\`, \`main_ja.tex\`, and four scientific figure PDFs are in this folder. Confirm every figure caption and value against a fresh analysis run before submission. |
| Current English and Japanese PDFs | Built and visually inspected | The previously committed \`main.pdf\` was a June 2026 version and did not match the August 2026 TeX. Both PDFs were rebuilt from the current sources with Tectonic on 2026-09-28 (English 8 pages; Japanese 7 pages); all pages were rendered and inspected. Final content approval remains pending. |
| Central claim calibration | Draft complete; scientific sign-off pending | The manuscript labels Stage 1 as Level 0 constructibility; \`r=0.24\` is weak, the mean cross-participant latency correlation is small and exploratory, and the first-PC result is null. Have the investigators/statistician review channel choice, missingness, permutation scheme, and multiplicity. |
| Ethics approval | **Unverified** | The manuscript reports Niigata University approval 2024-0269, dated 2025-03-01. The signed approval letter, approved protocol/version, coverage of recorded modalities, and permission for this analysis/publication were not located in the repository. Verify against the institutional originals. |
| Participant consent | **Partly inspectable, not verified** | Eleven \`consent.json\` paths exist, but three are unavailable or not parseable locally; eight parse as records with agreement fields. These files do not establish the validity, version, or scope of consent, nor a checked one-to-one match to all five analyzed participants. Verify the originals securely; never publish signatures or raw consent files. |
| Participant accounting | Described; flow artifact missing | The manuscript describes 11 directories, five analyzed participants and 970 retained trials, with six exclusions. Produce a machine-readable, pseudonymous participant-flow table and audit all unavailable annex objects. |
| Sensor provenance | **Unverified** | Stable electrode placement, calibration, units, device version, and acquisition-failure metadata were not established by the reviewed package. Confirm from contemporaneous records or retain this limitation. |
| Reproduction package | **Not public** | No durable public DOI for versioned code, environment, checksums and ethics-compatible derived table is recorded. Do not publish the existing repository wholesale: it contains participant materials and identifiable file names. Prepare a separate disclosure-reviewed snapshot. |
| Prior public version | Disclose and reconcile | The site's older article/PDF contains stronger conclusions than the current manuscript. The new manuscript identifies it as a non-peer-reviewed prior version. Keep the journal cover letter and submission form explicit about its URL, relationship, and corrections. The site source now includes a historical-draft notice; live deployment remains unverified. |
| Coauthor feedback | **Not evidenced in repo** | Remote manuscript history and repository text did not contain identifiable feedback from Kazuki Tainaka or Tomonori Takeuchi; PRs #18 and #21 each have zero GitHub reviews and comments. Feedback in email or other systems may exist; obtain it and record each point, disposition, and approval without treating the names on the title page as approval. |
| Authorship and declarations | **Pending each author** | Confirm author order, affiliations, contribution wording, final manuscript approval, funding and competing interests. Replace the provisional wording in \`main.tex\` only with verified declarations. |
| Journal-specific package | **Pending** | Check the live submission instructions for title page, abstract, ethics/data statements, figure formats, preprint disclosure, suggested editors/reviewers, and fee support. Prepare a cover letter after coauthor sign-off. Do not submit to multiple journals simultaneously. |

## Decision

**No-go for journal submission today.** The research story can be circulated to
coauthors for scientific review, but approval/consent verification, coauthor
feedback and sign-off, and a safe reproducibility package remain open. A draft
submission is not a peer-review request until the journal confirms receipt
through its submission system.

## Verification performed

- Tectonic compiled both manuscripts; text extraction confirms the revised
  public-version and declaration sections appear in the generated PDFs.
- Every PDF page was rendered for a visual layout check (8 English, 7 Japanese).
- \`git diff --check\` passed.
- The web application check could not run from this clean worktree:
  \`pnpm install --frozen-lockfile\` fails because the existing workspace lockfile
  is out of sync with \`apps/api-worker-cljc/package.json\`. This is a baseline
  dependency issue, not evidence that the edited page builds.
