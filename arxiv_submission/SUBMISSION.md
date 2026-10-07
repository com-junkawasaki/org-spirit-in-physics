# Pilot manuscript source package

Current first-choice journal and submission gates: `SJP_SUBMISSION_20261007_ja.md`.
Japanese revision materials: `REVISION_MATERIALS_JA.md`.

For the journal-route decision and current go/no-go evidence, see
`PEER_REVIEW_READINESS.md`. arXiv is a preprint service and does not conduct
journal peer review. Rebuild the English and Japanese PDFs after every source
change and inspect the result before circulation.
The older project website article/PDF must be disclosed as a related prior
public version; it is not the current analysis.

## Scientific scope

This revision is a five-person exploratory feasibility report on word-linked
latency and skin-potential response profiles. It does not measure target-specific
self-inclusion, thermodynamic energy, Jungian complexes, or a collective
unconscious. `SELF_INCLUSION_STUDY_PROPOSAL.md` is a separate, unapproved proposal
for a new experiment. `REVIEW_RESPONSE_20260925.md` maps the latest review points
to this revision and records unresolved evidence.

## Source package

| File | Role |
| --- | --- |
| `main.tex` | English manuscript; arXiv top-level source |
| `main.bbl` | precompiled bibliography |
| `references.bib` | bibliography source |
| `fig_landscape.pdf` | 970-trial response landscape and test–retest panel |
| `fig_individual_spirit.pdf` | participant-specific response embeddings |
| `fig_collective.pdf` | exploratory cross-participant latency statistics |
| `fig_spirit_manifold.pdf` | retained source asset, excluded from the pilot manuscript pending neutral figure labels |
| `REVIEW_RESPONSE_20260925.md` | disposition of the latest review synthesis |
| `SELF_INCLUSION_STUDY_PROPOSAL.md` | separate future empirical-study proposal, not a result |
| `00README.json` | requests XeLaTeX |

`main_ja.tex` and `main_ja.pdf` are a Japanese companion and are not required
in the English arXiv source archive.

## Recommended metadata

- Primary category: `q-bio.NC`
- Cross-list: `physics.bio-ph`
- Title: *Spirit in Physics: Word-association latency and skin-potential response profiles in a five-participant pilot study*
- Authors: Jun Kawasaki, Kazuki Tainaka, Tomonori Takeuchi
- License: confirm with all authors at submission.

## Reproduce locally

```bash
python scripts/make_landscape_figure.py
python scripts/plot_individual_spirit.py
cd arxiv_submission
tectonic main.tex
tectonic main_ja.tex
```

## Verified accounting and unresolved release items

- Eleven participant directories were present. Five yielded clock-aligned
  records and 970 valid trials (198, 181, 195, 199, 197).
- Exclusions: three unavailable git-annex CSV objects, two directories without
  physiological CSV, and one recording with no task-window overlap.
- The revised landscape shows all 970 trials. The old count of 945 was created
  by a display-only upper-2.5% trim and was not a valid-window count.
- Semantic response transcripts and rubber-hand-illusion data are not used.
- Channel 2 is primary in the current code but was not preregistered; sensor
  placement and calibration metadata remain incomplete.
- No self/other-target comparison or independent target-specific self-inclusion
  rating is included in the analysed pilot. The new study proposal requires
  separate author decisions and ethics review before data collection.
- Before public submission, archive a versioned code snapshot, environment,
  checksums, and an ethics-compatible deidentified derived dataset. The current
  GitHub repository returns 404 to unauthenticated users and must not be cited
  as a public reproducibility resource.
- Confirm funding, competing interests, author contributions, and final approval
  with every author before submission.
