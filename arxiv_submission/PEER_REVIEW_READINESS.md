> **2026-10-07 update:** The earlier Frontiers-first recommendation below is superseded by the SJP-first plan in [`SJP_SUBMISSION_20261007_ja.md`](SJP_SUBMISSION_20261007_ja.md), following Tainaka’s new feedback. This file is retained as the dated 2026-09-28 decision record.

# Peer-review submission readiness — Spirit in Physics

Japanese companion: `PEER_REVIEW_READINESS_ja.md`.
Journal fee comparison (Japanese): `PUBLICATION_COSTS_20260928_ja.md`.

Audit date: 2026-09-28 (JST). Remote baseline: `com-junkawasaki/main` at
`8d97934a`, fetched on this date. This is a preparation record, not evidence
that a journal has received or accepted a manuscript.

## Recommended route: obtain review of the existing pilot first

On 2026-09-28, Kawasaki clarified advice received from Tainaka and Takeuchi:
submit the current paper for peer review, learn from the reviewers' responses,
and then plan the next study. This is a report of their strategic advice, not
proof that either coauthor has approved the current text. It changes the order
of work recorded in the previous version of this checklist.

**First candidate:** *Frontiers in Psychology*, **Quantitative Psychology and
Measurement**, **Brief Research Report**. This section covers quantitative
methods and measurement of human attributes; the article type explicitly
welcomes concise preliminary findings and negative results. The current pilot
has an abstract, methods, results and discussion, approximately 2,016 words
including references in PDF text extraction, and three figures, within the
article type's 4,000-word and four-figure/table limits. The paper must ask
whether word-linked response profiles can be constructed and how stable the
underlying latency is; it cannot claim to measure self-inclusion. The section's
requirement for a substantive measurement contribution is an editorial-fit
risk, and five analyzable participants plus weak repeatability create a real
chance of a desk rejection before any external review. A submission is not a
guarantee of reviewer feedback.

| Route | Fit to the present manuscript | Main reservation |
| --- | --- | --- |
| **1. Frontiers in Psychology, Quantitative Psychology and Measurement, Brief Research Report** | Explicit preliminary/negative-result article type; measurement-oriented section; current structure and figure count fit. | An editor may judge the five-person feasibility result too narrow or insufficiently validated. Current B-type article-processing charge is CHF 2,500 if accepted; check institutional support and the live fee before submission. |
| **2. Frontiers in Psychology, Consciousness Research and Mindfulness, Brief Research Report** | Stronger thematic link to the long-term self/consciousness question; same brief article type. | The pilot did not measure self/consciousness, so section fit is weaker for this particular manuscript. |
| **3. PLOS ONE, Research Article** | Accepts technically rigorous original and null-result research. | Its criteria require appropriate controls, robust sample size where applicable, ethical documentation, and data availability. The current pilot faces a higher methodological hurdle. |

The formerly recommended *Consciousness and Cognition* Registered Report Stage I
is a **later route for the new self/target study**, after learning from the
current pilot's review. A future hypothesis/theory paper is also separate from
this pilot. Submit only one journal application for the same manuscript at a
time.

Primary journal sources, checked 2026-09-28:

- Section scope and accepted article types: https://www.frontiersin.org/journals/psychology/sections/quantitative-psychology-and-measurement/about
- Brief Research Report requirements: https://www.frontiersin.org/journals/psychology/sections/quantitative-psychology-and-measurement/for-authors/article-types
- Current fees: https://www.frontiersin.org/journals/psychology/for-authors/publishing-fees
- Consciousness Research and Mindfulness scope: https://www.frontiersin.org/journals/psychology/sections/consciousness-research-and-mindfulness/about
- PLOS ONE publication criteria: https://journals.plos.org/plosone/s/criteria-for-publication
- Elsevier Registered Reports for the later study: https://www.elsevier.com/researcher/author/policies-and-guidelines/registered-reports

## Gate register

| Gate | Status on 2026-09-28 | Evidence and action |
| --- | --- | --- |
| Current source and figures | Pilot revision for review | `main.tex` and `main_ja.tex` now describe a feasibility study. The figure carrying “Spirit vector space” and “energy” labels is excluded from the manuscripts; source and asset remain for a separately audited redraw. Confirm every retained figure and number against source analysis before submission. |
| Current English and Japanese PDFs | Built and visually inspected | Both pilot PDFs compiled with Tectonic on 2026-09-28 (five A4 pages each). Text extraction and an all-page visual review found the revised claims and three retained figures. Final content approval remains pending. |
| Central claim calibration | Draft complete; scientific sign-off pending | `r=0.24` is pooled latency repeatability, not map reliability; the mean cross-participant latency correlation is small and exploratory, and the first-PC result is null. There is no matched self/target condition or independent self-inclusion rating in this analysis. Have the investigators/statistician review channel choice, missingness, permutation scheme, and multiplicity. |
| Ethics approval | **Unverified** | The manuscript reports Niigata University approval 2024-0269, dated 2025-03-01. The signed approval letter, approved protocol/version, coverage of recorded modalities, and permission for this analysis/publication were not located in the repository. Verify against the institutional originals. |
| Participant consent | **Partly inspectable, not verified** | Eleven `consent.json` paths exist, but three are unavailable or not parseable locally; eight parse as records with agreement fields. These files do not establish the validity, version, or scope of consent, nor a checked one-to-one match to all five analyzed participants. Verify the originals securely; never publish signatures or raw consent files. |
| Participant accounting | Described; flow artifact missing | The manuscript describes 11 directories, five analyzed participants and 970 retained trials, with six exclusions. Produce a machine-readable, pseudonymous participant-flow table and audit all unavailable annex objects. |
| Sensor provenance | **Unverified** | Stable electrode placement, calibration, units, device version, and acquisition-failure metadata were not established by the reviewed package. Confirm from contemporaneous records or retain this limitation. |
| Reproduction package | **Not public** | No durable public DOI for versioned code, environment, checksums and ethics-compatible derived table is recorded. Do not publish the existing repository wholesale: it contains participant materials and identifiable file names. Prepare a separate disclosure-reviewed snapshot. |
| Prior public version | Disclose and reconcile | The site's older article/PDF contains stronger conclusions than the current manuscript. The new manuscript identifies it as a non-peer-reviewed prior version. Keep the journal cover letter and submission form explicit about its URL, relationship, and corrections. The site source now includes a historical-draft notice; live deployment remains unverified. |
| Coauthor feedback | **Strategic advice reported; text approval pending** | Kawasaki reports that Tainaka and Takeuchi advised sending the present paper to peer review, using the feedback, then progressing to the next study. The supplied 2026-09-25 revision plan also summarizes their earlier comments. Original comments/transcript and approval of this exact version were not supplied or found in the repository; PRs #18 and #21 have zero GitHub reviews/comments. Record each author's final decision before submission. |
| Authorship and declarations | **Pending each author** | Confirm author order, affiliations, contribution wording, final manuscript approval, funding and competing interests. The pilot draft omits unverified author/funding statements; add only verified journal-required declarations. |
| New empirical design | **Proposal only** | `SELF_INCLUSION_STUDY_PROPOSAL.md` outlines same-word self/target conditions, independent ratings and a different-day retest. Resolve construct wording, sample size and analysis; confirm ethics scope before recruitment and preregister the confirmatory design. The old five-person pilot cannot be relabelled as its result. |
| Journal-specific package | **Pending** | Check the live submission instructions for title page, abstract, ethics/data statements, figure formats, preprint disclosure, suggested editors/reviewers, and fee support. Prepare a cover letter after coauthor sign-off. Do not submit to multiple journals simultaneously. |

## Decision

**Prepare this pilot for submission first; not ready to click submit today.**
The pilot is the intended first paper for external review. Confirm approval
and consent originals, secure each author's approval of this version, audit the
figures and values, and prepare an ethics-compatible reproducibility package.
These are submission gates, not reasons to postpone the journal choice until
a new experiment exists. A draft or PR is not a peer-review request until the
journal confirms receipt through its submission system.

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
