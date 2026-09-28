# Peer-review submission readiness — Spirit in Physics

Audit date: 2026-09-28 (JST). Remote baseline: `com-junkawasaki/main` at
`8d97934a`, fetched on this date. This is a preparation record, not evidence
that a journal has received or accepted a manuscript.

## Recommended route

The latest review changes the first empirical aim to **target-specific
self-inclusion**. The current five-person data cannot answer that question.
For a **peer-review request before new data collection**, the best fit to
develop is a Stage I **Registered Report** at *Consciousness and Cognition*.
Its scope includes scientific approaches to self; Elsevier currently lists the
journal among Registered Report participants. Stage I examines the question,
methods, analyses and ethics before the confirmatory experiment. This is a
recommendation, not an editor invitation or a submission-ready package.

| Route, in order | Why consider it | Main condition |
| --- | --- | --- |
| *Consciousness and Cognition*, Registered Report Stage I | Direct fit to self/cognition and early design review | Finalize construct, stimuli, exclusions, power/precision, analyses, feasibility and ethics status before submission. |
| *Frontiers in Psychology*, Consciousness Research and Mindfulness, Registered Report | Section explicitly accepts Registered Reports; permits pilot observations in Stage I | Its Stage I length is 3,000 words and two figures/tables; confirm feasibility of the Stage II timeline and public data requirements. An article-processing charge applies upon publication. |
| *PLOS ONE*, Registered Report Protocol | Broad empirical route with design review before participant recruitment | Stronger method and data-management package; verify the current protocol/ethics requirements and publication model before selection. |

The earlier *Frontiers* **Hypothesis and Theory** route may suit a separate
theoretical article, but it is not the first route for the empirical question.
The five-person pilot may be submitted separately only after its own scientific,
ethics and reproducibility gates are met. Do not submit the same manuscript to
multiple journals simultaneously.

- Section scope: https://www.frontiersin.org/journals/psychology/sections/consciousness-research-and-mindfulness/about
- Article type: https://www.frontiersin.org/journals/psychology/sections/consciousness-research-and-mindfulness/for-authors/article-types
- Current fee page (check again at submission): https://www.frontiersin.org/journals/psychology/for-authors/publishing-fees
- *Consciousness and Cognition* scope: https://shop.elsevier.com/journals/consciousness-and-cognition/1053-8100
- Elsevier participating journals and Stage I process: https://www.elsevier.com/researcher/author/policies-and-guidelines/registered-reports
- Elsevier Stage I author guidelines: https://www.elsevier.com/en-gb/researcher/author/policies-and-guidelines/registered-reports/author-guidelines
- PLOS ONE Registered Reports: https://journals.plos.org/plosone/s/what-we-publish

## Gate register

| Gate | Status on 2026-09-28 | Evidence and action |
| --- | --- | --- |
| Current source and figures | Pilot revision for review | `main.tex` and `main_ja.tex` now describe a feasibility study. The figure carrying “Spirit vector space” and “energy” labels is excluded from the manuscripts; source and asset remain for a separately audited redraw. Confirm every retained figure and number against source analysis before submission. |
| Current English and Japanese PDFs | Built and visually inspected | Both pilot PDFs compiled with Tectonic on 2026-09-28 (five A4 pages each). Text extraction and an all-page visual review found the revised claims and three retained figures. Final content approval remains pending. |
| Central claim calibration | Draft complete; scientific sign-off pending | `r=0.24` is pooled latency repeatability, not map reliability; the mean cross-participant latency correlation is small and exploratory, and the first-PC result is null. There is no matched self/target condition or independent self-inclusion rating in this analysis. Have the investigators/statistician review channel choice, missingness, permutation scheme, and multiplicity. |
| Ethics approval | **Unverified** | The manuscript reports Niigata University approval 2024-0269, dated 2025-03-01. The signed approval letter, approved protocol/version, coverage of recorded modalities, and permission for this analysis/publication were not located in the repository. Verify against the institutional originals. |
| Participant consent | **Partly inspectable, not verified** | Eleven \`consent.json\` paths exist, but three are unavailable or not parseable locally; eight parse as records with agreement fields. These files do not establish the validity, version, or scope of consent, nor a checked one-to-one match to all five analyzed participants. Verify the originals securely; never publish signatures or raw consent files. |
| Participant accounting | Described; flow artifact missing | The manuscript describes 11 directories, five analyzed participants and 970 retained trials, with six exclusions. Produce a machine-readable, pseudonymous participant-flow table and audit all unavailable annex objects. |
| Sensor provenance | **Unverified** | Stable electrode placement, calibration, units, device version, and acquisition-failure metadata were not established by the reviewed package. Confirm from contemporaneous records or retain this limitation. |
| Reproduction package | **Not public** | No durable public DOI for versioned code, environment, checksums and ethics-compatible derived table is recorded. Do not publish the existing repository wholesale: it contains participant materials and identifiable file names. Prepare a separate disclosure-reviewed snapshot. |
| Prior public version | Disclose and reconcile | The site's older article/PDF contains stronger conclusions than the current manuscript. The new manuscript identifies it as a non-peer-reviewed prior version. Keep the journal cover letter and submission form explicit about its URL, relationship, and corrections. The site source now includes a historical-draft notice; live deployment remains unverified. |
| Coauthor feedback | **Indirect review synthesis received; originals and approval pending** | The supplied 2026-09-25 revision plan attributes points to Takeuchi's shared comments and Tainaka's explanation of the intended construct. The original comment/transcript was not supplied or found in this repository; PRs #18 and #21 have zero GitHub reviews/comments. `REVIEW_RESPONSE_20260925.md` records disposition. Obtain original feedback and each author's final decision without equating the plan with approval. |
| Authorship and declarations | **Pending each author** | Confirm author order, affiliations, contribution wording, final manuscript approval, funding and competing interests. The pilot draft omits unverified author/funding statements; add only verified journal-required declarations. |
| New empirical design | **Proposal only** | `SELF_INCLUSION_STUDY_PROPOSAL.md` outlines same-word self/target conditions, independent ratings and a different-day retest. Resolve construct wording, sample size and analysis; confirm ethics scope before recruitment and preregister the confirmatory design. The old five-person pilot cannot be relabelled as its result. |
| Journal-specific package | **Pending** | Check the live submission instructions for title page, abstract, ethics/data statements, figure formats, preprint disclosure, suggested editors/reviewers, and fee support. Prepare a cover letter after coauthor sign-off. Do not submit to multiple journals simultaneously. |

## Decision

**No-go for journal submission today.** Circulate the revised pilot and new
design proposal to coauthors for scientific review. Original feedback and final
sign-off, approval/consent verification, and a safe reproducibility package
remain open. A draft
submission is not a peer-review request until the journal confirms receipt
through its submission system.

## Verification performed

- Tectonic compiled both current pilot manuscripts; `pdfinfo` confirms five
  pages each. Text extraction confirms that the self-inclusion limitation is
  present and unverified author/funding statements and the misleading figure
  labels are absent. Every page was rendered and inspected.
- `git diff --check` passed after the source edits.
- The web application check could not run from this clean worktree:
  `pnpm install --frozen-lockfile` fails because the existing workspace lockfile
  is out of sync with `apps/api-worker-cljc/package.json`. This is a baseline
  dependency issue, not evidence that the edited page builds.
