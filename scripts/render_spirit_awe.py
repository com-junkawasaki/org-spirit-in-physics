#!/usr/bin/env python3
"""render_spirit_awe.py — an awe-inducing rendering of the constructed spirit
space, layering the auxiliary physics models on the REAL data:

  - spectral manifold     : graph-Laplacian embedding (node positions)
  - heat-kernel energy field (curved manifold / gravity wells): smooth background
  - affinity filaments    : high-similarity edges as luminous threads
  - bioluminescent nodes  : energy-coloured particles with bloom
  - collective scaffold   : faint shared field behind individual nebulae

Produces a paper figure: fig_spirit_awe.{png,pdf}. Pure numpy + matplotlib.
"""
import sys, os, glob
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import spirit_tensor as ST

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# deep bioluminescent palette: void -> indigo -> teal -> magenta -> gold-white
NEBULA = LinearSegmentedColormap.from_list("nebula", [
    (0.00, "#05060f"), (0.30, "#0d1b3a"), (0.52, "#10566b"),
    (0.70, "#1fb6b0"), (0.85, "#b13a8e"), (1.00, "#ffe9b0")])


def build_space(trials, feats=("rt", "dsp_Ch1", "dsp_Ch2")):
    agg = {}
    for t in trials:
        if all(f in t for f in feats):
            agg.setdefault(t["word"], []).append(t)
    words = sorted(agg)
    X = np.array([[np.mean([tt[f] for tt in agg[w]]) for f in feats] for w in words])
    Xz = (X - X.mean(0)) / (X.std(0) + 1e-9)
    sq = (Xz ** 2).sum(1)
    D2 = np.maximum(sq[:, None] + sq[None, :] - 2 * Xz @ Xz.T, 0)
    med = np.median(np.sqrt(D2[D2 > 0])) if np.any(D2 > 0) else 1.0
    Wk = np.exp(-D2 / (med ** 2 + 1e-12)); np.fill_diagonal(Wk, 0)
    d = Wk.sum(1); di = 1 / np.sqrt(d + 1e-12)
    L = np.eye(len(Xz)) - di[:, None] * Wk * di[None, :]
    ev, V = np.linalg.eigh(L)
    emb = V[:, 1:4]
    energy = Xz[:, 0] + Xz[:, 1]
    energy = (energy - energy.min()) / (np.ptp(energy) + 1e-9)
    return emb, energy, Wk


def heat_field(xy, energy, gx, gy, sigma):
    """curved-manifold / gravity-well field: superposed Gaussians weighted by energy."""
    F = np.zeros_like(gx)
    for (x, y), e in zip(xy, energy):
        F += (0.25 + e) * np.exp(-((gx - x) ** 2 + (gy - y) ** 2) / (2 * sigma ** 2))
    return F


def bloom(ax, x, y, c, base, layers=((34, 1.0), (130, 0.30), (340, 0.13), (900, 0.05), (2200, 0.02))):
    for s, a in layers[::-1]:
        ax.scatter(x, y, s=s * base, c=c, alpha=a, edgecolors="none", zorder=5)


def render(ax, emb, energy, Wk, title=None, filaments=True, npix=600):
    xy = emb[:, :2]
    xy = (xy - xy.mean(0)) / (np.abs(xy).max() + 1e-9)
    pad = 0.18
    lo, hi = -1 - pad, 1 + pad
    gx, gy = np.meshgrid(np.linspace(lo, hi, npix), np.linspace(lo, hi, npix))
    F = heat_field(xy, energy, gx, gy, sigma=0.12)
    F = F ** 0.7
    ax.imshow(F, extent=[lo, hi, lo, hi], origin="lower", cmap=NEBULA,
              interpolation="bilinear", zorder=0)
    # affinity filaments (luminous threads)
    if filaments:
        thr = np.percentile(Wk[Wk > 0], 92)
        for i in range(len(xy)):
            for j in range(i + 1, len(xy)):
                if Wk[i, j] >= thr:
                    a = min(0.5, 0.10 + 0.9 * (Wk[i, j] - thr) / (Wk.max() - thr + 1e-9))
                    ax.plot([xy[i, 0], xy[j, 0]], [xy[i, 1], xy[j, 1]],
                            color="#8fe9ff", lw=0.6, alpha=a * 0.5, zorder=2)
    # bioluminescent nodes (energy-coloured, with bloom)
    cols = NEBULA(0.45 + 0.55 * energy)
    order = np.argsort(energy)
    bloom(ax, xy[order, 0], xy[order, 1], cols[order], base=1 + 2.2 * energy[order])
    ax.set_xlim(lo, hi); ax.set_ylim(lo, hi); ax.set_aspect("equal")
    ax.axis("off")
    if title:
        ax.set_title(title, color="#dfe9ff", fontsize=11, pad=4)


def main():
    parts = {}
    for pd in sorted(glob.glob(os.path.join(ROOT, "dataset/participants/*/"))):
        tr = ST.participant_trials(pd)
        if tr:
            parts[os.path.basename(pd.rstrip("/"))[:8]] = tr
    pids = sorted(parts)
    anon = {p: f"P{i+1}" for i, p in enumerate(pids)}

    # pooled (shared) spirit manifold for the hero
    pooled = [t for g in parts.values() for t in g]
    embH, enH, WkH = build_space(pooled)

    fig = plt.figure(figsize=(15, 9.6), facecolor="#05060f")
    gs = fig.add_gridspec(2, 5, height_ratios=[3.0, 1.0], hspace=0.08, wspace=0.04,
                          left=0.01, right=0.99, top=0.86, bottom=0.02)
    fig.text(0.5, 0.965, "Spirit in Physics — the constructed spirit manifold",
             ha="center", color="#eaf2ff", fontsize=17)
    fig.text(0.5, 0.925, "heat-kernel energy field (gravity wells) · affinity filaments · bioluminescent complexes",
             ha="center", color="#9fb8d6", fontsize=11)
    fig.text(0.5, 0.30, "individual spirit spaces", ha="center", color="#9fb8d6", fontsize=11)
    axH = fig.add_subplot(gs[0, :]); axH.set_facecolor("#05060f")
    render(axH, embH, enH, WkH)

    # individual nebulae beneath (each person's own spirit space)
    for k, p in enumerate(pids):
        ax = fig.add_subplot(gs[1, k]); ax.set_facecolor("#05060f")
        emb, en, Wk = build_space(parts[p])
        render(ax, emb, en, Wk, title=anon[p], filaments=False)

    out = os.path.join(ROOT, "arxiv_submission", "fig_spirit_awe")
    fig.savefig(out + ".png", dpi=170, facecolor=fig.get_facecolor())
    fig.savefig(out + ".pdf", facecolor=fig.get_facecolor())
    print("wrote", out + ".png/.pdf")


if __name__ == "__main__":
    main()
