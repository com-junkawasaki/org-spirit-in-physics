#!/usr/bin/env python3
"""export_spirit_json.py — export the shared spirit manifold AND each individual
spirit space (for the immersive tour): 3D spectral positions, node energy,
affinity edges, and low Laplacian eigenmodes (+ eigenvalues for sonification).

Output: arxiv_submission/viz/spirit_data.json
  { shared: <space>, individuals: [<space>, ...] }
where <space> = {label, n, nodes:[{p,e}], edges:[[i,j,w]], modes:[{vec,f,lambda}]}
"""
import sys, os, glob, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import spirit_tensor as ST

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FEATS = ("rt", "dsp_Ch1", "dsp_Ch2")


def build_space(trials, label):
    agg = {}
    for t in trials:
        if all(f in t for f in FEATS):
            agg.setdefault(t["word"], []).append(t)
    words = sorted(agg)
    if len(words) < 8:
        return None
    X = np.array([[np.mean([tt[f] for tt in agg[w]]) for f in FEATS] for w in words])
    Xz = (X - X.mean(0)) / (X.std(0) + 1e-9)
    sq = (Xz ** 2).sum(1)
    D2 = np.maximum(sq[:, None] + sq[None, :] - 2 * Xz @ Xz.T, 0)
    med = np.median(np.sqrt(D2[D2 > 0]))
    Wk = np.exp(-D2 / (med ** 2 + 1e-12)); np.fill_diagonal(Wk, 0)
    d = Wk.sum(1); di = 1 / np.sqrt(d + 1e-12)
    L = np.eye(len(Xz)) - di[:, None] * Wk * di[None, :]
    ev, V = np.linalg.eigh(L)
    emb = V[:, 1:4]; emb = emb / (np.abs(emb).max() + 1e-9)
    energy = Xz[:, 0] + Xz[:, 1]; energy = (energy - energy.min()) / (np.ptp(energy) + 1e-9)
    thr = np.percentile(Wk[Wk > 0], 90)
    edges = [[int(i), int(j), round(float(Wk[i, j]), 3)]
             for i in range(len(words)) for j in range(i + 1, len(words)) if Wk[i, j] >= thr]
    modes = []
    for k in range(1, 8):
        vec = V[:, k]; vec = vec / (np.abs(vec).max() + 1e-9)
        modes.append({"vec": [round(float(x), 4) for x in vec],
                      "f": round(float(0.04 + 0.10 * np.sqrt(max(ev[k], 0))), 4),
                      "lambda": round(float(ev[k]), 5)})
    return {"label": label, "n": len(words),
            "nodes": [{"p": [round(float(emb[i, j]), 4) for j in range(3)],
                       "e": round(float(energy[i]), 4)} for i in range(len(words))],
            "edges": edges, "modes": modes}


def main():
    pdirs = sorted(glob.glob(os.path.join(ROOT, "dataset/participants/*/")))
    parts = {}
    for pd in pdirs:
        tr = ST.participant_trials(pd)
        if tr:
            parts[os.path.basename(pd.rstrip("/"))[:8]] = tr
    pooled = [t for g in parts.values() for t in g]
    shared = build_space(pooled, "shared manifold")
    individuals = []
    for i, p in enumerate(sorted(parts)):
        sp = build_space(parts[p], f"individual P{i+1}")
        if sp:
            individuals.append(sp)
    out = {"shared": shared, "individuals": individuals}
    os.makedirs(os.path.join(ROOT, "arxiv_submission", "viz"), exist_ok=True)
    pth = os.path.join(ROOT, "arxiv_submission", "viz", "spirit_data.json")
    json.dump(out, open(pth, "w"))
    print("wrote", pth, "| shared n=%d, individuals=%d" % (shared["n"], len(individuals)))


if __name__ == "__main__":
    main()
