# arXiv submission package — Spirit in Physics (first installment)

## Files in the tarball (`arxiv-spirit-in-physics.tar.gz`)

| File | Role |
| --- | --- |
| `main.tex` | top-level source (compile with **XeLaTeX**) |
| `main.bbl` | pre-compiled bibliography — arXiv uses it and does **not** run BibTeX |
| `references.bib` | bibliography source (archival; not required since `.bbl` is present) |
| `fig_landscape.pdf` | Figure 1 (3 panels), generated from real pilot data |
| `00README.json` | tells arXiv to use the `xelatex` compiler |

The Japanese glyphs (情緒) use **Harano Aji**, which ships with arXiv's TeX Live,
so no font upload is needed. The preamble is engine-guarded (`iftex`): under
pdfLaTeX it still compiles (romanised "Jōcho"), under XeLaTeX it renders kanji.

## Recommended arXiv metadata

- **Primary category:** `q-bio.NC` (Neurons and Cognition)
- **Cross-list:** `physics.bio-ph` (drop `cond-mat.stat-mech`: no k_BT /
  entropy-production quantity is measured, so a stat-mech cross-list invites
  moderator reclassification)
- **Title:** Spirit in Physics: constructing the self as an information-geometric
  (tensor) space from word association and physiology
- **Authors:** Jun Kawasaki, Kazuki Tainaka, Tomonori Takeuchi
- **License:** choose at submission (recommended: CC BY 4.0). arXiv requires a
  license selection; this package does not embed one.
- **Endorsement:** `q-bio.NC` may require endorsement for a first-time
  submitter — use a co-author with submission history in the category.

## Local build (reproduce the PDF)

```bash
# figure (Python venv with matplotlib/numpy)
python scripts/make_landscape_figure.py        # writes fig_landscape.pdf/.png
# document
tectonic arxiv_submission/main.tex             # or: xelatex + bibtex + xelatex x2
```

## Honest-scope notes (kept in sync with the manuscript)

- Cohort measured: N≈10. Figure uses the **N=5** subset with retrievable,
  task-overlapping continuous skin-potential records (945 trials). 3 skin-
  potential CSVs are git-annex pointers (0 known copies here); 1 participant's
  recording does not overlap the task window; 1 has no CSV.
- The energy proxy `E = z(latency) + z(ΔSP)` makes the low/high-E split
  **definitional** — Fig.1a demonstrates *measurability*, not a confirmed
  prediction. Pilot test–retest is weak (r=0.24).
- **No rubber-hand-illusion data** is present in these event logs (two
  word-association sessions only). RHI appears in the manuscript solely as the
  *conceptual grounding* (Botvinick 1998) for bodily-self malleability and as a
  protocol component "reported separately" — not as analyzed pilot data.
