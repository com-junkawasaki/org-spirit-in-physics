# Quality review against the Gene manuscript benchmark

Review date: 2026-08-23

Co-Scientist-style quantitative assessment: see `COSCIENTIST_SCORE.md`. Current
research-program hypothesis score: **80/100**; current empirical support:
**31/100**; manuscript scientific/reporting quality: **86/100**; arXiv
submission readiness: **70/100**.

## Bottom line

The revised Spirit manuscript now meets the Gene manuscript's basic standard
for traceable participant accounting, explicit preprocessing, separation of
exploratory from confirmatory results, ethics disclosure, and limitations.
It is not yet at the Gene package's reproducibility or submission-readiness
level because the Spirit repository is private, the derived analysis table is
not archived, sensor metadata are incomplete, and funding/conflict/author
approval statements remain unconfirmed.

## Comparison

| Dimension | Gene benchmark | Revised Spirit status |
| --- | --- | --- |
| Cohort accounting | Exact case/control counts and QC flow | Exact 11 entered, 5 analyzed, six exclusions by reason |
| Methods-to-code agreement | Models, covariates, thresholds and sensitivity analyses stated | Event windows, latency rule, signal summary, Ch1/Ch2 use, scaling, kernel, tensor and permutations stated |
| Result provenance | Main/SI/Table S1 agree; effect estimates and thresholds are traceable | Reported counts and tensor summaries reproduced from local code/data |
| Claim calibration | Winner's curse, confounding and phenotype limitations disclosed | Physical spirit, response energy, Jungian complexes and collective unconscious retained as explicit falsifiable hypotheses; present evidence is separated from the long-term claims |
| Primary vs exploratory | Prespecified and secondary PGS analyses separated | All inferential analyses explicitly exploratory and not preregistered |
| Ethics | Approval, consent and study scope stated | Project-reported approval 2024-0269 and consent workflow added; original approval and retained consent records still require verification |
| Data/code release | Public reproducibility repository and archival DOI reported | Private repository; no public versioned snapshot or derived-data archive yet |
| Supporting package | MS, SI, cover letter, table and figures | English/Japanese manuscripts, four scientific figures, code and submission manifest; no SI or public derived table yet |
| Administrative completeness | Funding, contributions, conflicts and availability statements present | Contributions drafted; funding, conflicts and final author approval require confirmation |

## Material corrections made

1. Reclassified the old count of 945: it was created by a display-only upper
   2.5% trim, not by physiological-window validity. The revised figure uses all
   970 valid trials.
2. Removed the claim that 851 transcribed associations label the manifold; the
   present tensor uses stimulus words, latency and skin-potential features.
3. Renamed ``inter-subject charge correlation'' to cross-participant latency
   correlation because the plotted matrix contains latency only.
4. Removed unsupported Procrustes results whose producing code was not found in
   the current analysis package.
5. Reframed spectral gap and HOSVD variance as in-sample descriptive summaries,
   not evidence of a dominant collective coordinate.
6. Removed the decorative fifth figure from the scientific argument.
7. Fixed the plotted response-cost channel to Ch2, aligned participant plots
   with the primary analysis, and disclosed that the choice was not preregistered.
8. Restored physical spirit, response energy, Jungian complexes, and collective
   unconscious as the central working hypotheses, with explicit supporting and
   falsifying observations rather than treating them as established results.
9. Added a prospective Stage 2 framework with hypothesis hierarchy, validation
   table, negative controls, leakage prevention, simulation-based sample sizing,
   evidence levels, independent replication, and preregistration requirements.

## Required before arXiv submission

- Confirm the exact author list, affiliations, contributions, funding,
  competing interests, and approval of the final text with all authors.
- Verify the original ethics approval letter and retained consent record for
  every analyzed participant; the reviewed repository documented the workflow
  but did not contain those records.
- Deposit a versioned code snapshot, environment lock, checksums, and an
  ethics-compatible deidentified derived analysis table in a durable public
  archive; add the DOI to the manuscript.
- Recover or formally account for unavailable git-annex objects and preserve a
  machine-readable participant-flow table.
- Add stable sensor placement, calibration, units, sampling, and device metadata.
- Obtain a scientific coauthor/statistician check of the primary channel,
  missing-data strategy, permutation design, and multiple-testing scope.
- Treat the present $p=0.038$ as hypothesis-generating evidence relevant to the
  collective-unconscious hypothesis, not as proof of that hypothesis.
