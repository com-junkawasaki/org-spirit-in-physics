# arXiv submission package — Spirit in Physics

## Scientific scope

This revision combines a Stage 1 pilot feasibility result with a prospective
Stage 2 validation framework. Spirit is hypothesized to be a physically
realized information-bearing organization; response energy, Jungian complexes,
and a collective-unconscious component are testable targets. The framework
defines hierarchy, comparators, validation endpoints, falsifiers, evidence
levels, leakage control, simulation-based sample sizing, independent
replication, and preregistration requirements. It is not itself a completed
registration and does **not yet** claim that the four hypotheses are proven.

## Source package

| File | Role |
| --- | --- |
| `main.tex` | English manuscript; arXiv top-level source |
| `main.bbl` | precompiled bibliography |
| `references.bib` | bibliography source |
| `fig_landscape.pdf` | 970-trial response landscape and test–retest panel |
| `fig_individual_spirit.pdf` | participant-specific response embeddings |
| `fig_collective.pdf` | exploratory cross-participant latency statistics |
| `fig_spirit_manifold.pdf` | descriptive graph/tensor summaries |
| `00README.json` | requests XeLaTeX |

`main_ja.tex` and `main_ja.pdf` are a Japanese companion and are not required
in the English arXiv source archive.

## Recommended metadata

- Primary category: `q-bio.NC`
- Cross-list: `physics.bio-ph`
- Title: *Spirit in Physics: A falsifiable physical hypothesis of spirit, pilot
  feasibility study, and prospective validation framework*
- Authors: Jun Kawasaki, Kazuki Tainaka, Tomonori Takeuchi
- License: confirm with all authors at submission.

## Reproduce locally

```bash
python scripts/make_landscape_figure.py
python scripts/plot_individual_spirit.py
python scripts/spirit_tensor.py
cd arxiv_submission
xelatex main.tex
bibtex main
xelatex main.tex
xelatex main.tex
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
- Before public submission, archive a versioned code snapshot, environment,
  checksums, and an ethics-compatible deidentified derived dataset. The current
  GitHub repository returns 404 to unauthenticated users and must not be cited
  as a public reproducibility resource.
- Confirm funding, competing interests, author contributions, and final approval
  with every author before submission.
