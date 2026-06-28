#!/usr/bin/env python3
"""plot_individual_spirit.py — visualize each individual's constructed spirit
space, and the shared (collective) component across individuals.

Outputs:
  fig_individual_spirit.pdf  -- one panel per participant: their own spectral
                                spirit space, nodes coloured by energy (charge);
                                high-energy nodes = candidate complexes.
  fig_collective.pdf         -- (a) inter-subject correlation of per-word charge,
                                (b) individual vs collective variance split,
                                (c) collective-component (shared) energy spectrum.

Pure numpy + matplotlib. No Japanese text in the figures (energy colour carries
the structure); complex word lists are reported in the paper text.
"""
import sys, os, glob
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import spirit_tensor as ST

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def per_word(trials, feats=("rt", "dsp_Ch1", "dsp_Ch2")):
    agg = {}
    for t in trials:
        if all(f in t for f in feats):
            agg.setdefault(t["word"], []).append(t)
    words = sorted(agg)
    X = np.array([[np.mean([t[f] for t in agg[w]]) for f in feats] for w in words])
    return words, X


def spectral(X, k=2):
    Xz = (X - X.mean(0)) / (X.std(0) + 1e-9)
    sq = (Xz ** 2).sum(1)
    D2 = np.maximum(sq[:, None] + sq[None, :] - 2 * Xz @ Xz.T, 0)
    med = np.median(np.sqrt(D2[D2 > 0])) if np.any(D2 > 0) else 1.0
    Wk = np.exp(-D2 / (med ** 2 + 1e-12)); np.fill_diagonal(Wk, 0)
    d = Wk.sum(1); dinv = 1 / np.sqrt(d + 1e-12)
    L = np.eye(len(Xz)) - dinv[:, None] * Wk * dinv[None, :]
    ev, V = np.linalg.eigh(L)
    emb = V[:, 1:1 + k]
    energy = (Xz[:, 0] + Xz[:, 1])  # z(latency)+z(dSP_Ch1) proxy of node charge
    energy = (energy - energy.mean()) / (energy.std() + 1e-9)
    return emb, energy


def main():
    pdirs = sorted(glob.glob(os.path.join(ROOT, "dataset/participants/*/")))
    parts = {}
    for pd in pdirs:
        tr = ST.participant_trials(pd)
        if tr:
            parts[os.path.basename(pd.rstrip("/"))[:8]] = tr
    pids = sorted(parts)
    anon = {p: f"P{i+1}" for i, p in enumerate(pids)}

    # ---- Figure 1: per-individual spirit spaces ----
    n = len(pids)
    fig, axes = plt.subplots(1, n, figsize=(3.0 * n, 3.2))
    if n == 1:
        axes = [axes]
    for ax, p in zip(axes, pids):
        words, X = per_word(parts[p])
        emb, energy = spectral(X)
        sc = ax.scatter(emb[:, 0], emb[:, 1], c=energy, cmap="viridis", s=22, alpha=0.85, edgecolors="none")
        ax.set_title(f"{anon[p]}  ({len(words)} nodes)", fontsize=10)
        ax.set_xticks([]); ax.set_yticks([])
        ax.set_xlabel("spectral 1", fontsize=8)
    fig.suptitle("Individual spirit spaces (spectral embedding; colour = node energy / charge). "
                 "High-energy nodes = candidate complexes.", fontsize=10)
    cb = fig.colorbar(sc, ax=axes, fraction=0.012, pad=0.01)
    cb.set_label("node energy E", fontsize=8)
    fig.savefig(os.path.join(ROOT, "arxiv_submission", "fig_individual_spirit.pdf"))
    fig.savefig(os.path.join(ROOT, "arxiv_submission", "fig_individual_spirit.png"), dpi=150)
    print("wrote fig_individual_spirit.pdf")

    # ---- Figure 2: collective component ----
    words = sorted(set(t["word"] for g in parts.values() for t in g))
    widx = {w: i for i, w in enumerate(words)}

    def mat(feat):
        M = np.full((len(pids), len(words)), np.nan)
        for i, p in enumerate(pids):
            agg = {}
            for t in parts[p]:
                if feat in t:
                    agg.setdefault(t["word"], []).append(t[feat])
            for w, v in agg.items():
                M[i, widx[w]] = np.mean(v)
        return M

    Mrt = mat("rt")
    # inter-subject correlation matrix (over commonly present words)
    C = np.eye(len(pids))
    for i in range(len(pids)):
        for j in range(i + 1, len(pids)):
            m = ~np.isnan(Mrt[i]) & ~np.isnan(Mrt[j])
            if m.sum() >= 10:
                C[i, j] = C[j, i] = np.corrcoef(Mrt[i, m], Mrt[j, m])[0, 1]
    # variance split via SVD of standardized matrix
    def pc1_share(Mx):
        Z = (Mx - np.nanmean(Mx, 1, keepdims=True)) / (np.nanstd(Mx, 1, keepdims=True) + 1e-9)
        Z = np.nan_to_num(Z); s = np.linalg.svd(Z, compute_uv=False)
        return s[0] ** 2 / (s ** 2).sum()

    def inter_r(Mx):
        rs = []
        for i in range(len(pids)):
            for j in range(i + 1, len(pids)):
                m = ~np.isnan(Mx[i]) & ~np.isnan(Mx[j])
                if m.sum() >= 10:
                    rs.append(np.corrcoef(Mx[i, m], Mx[j, m])[0, 1])
        return np.mean(rs)

    rng = np.random.default_rng(7)
    obs_pc, obs_r = pc1_share(Mrt), inter_r(Mrt)
    npc, nr = [], []
    for _ in range(2000):
        Ms = np.array([rng.permutation(Mrt[i]) for i in range(len(pids))])
        npc.append(pc1_share(Ms)); nr.append(inter_r(Ms))
    npc, nr = np.array(npc), np.array(nr)
    p_pc = (np.sum(npc >= obs_pc) + 1) / 2001
    p_r = (np.sum(np.abs(nr) >= abs(obs_r)) + 1) / 2001
    share = (np.linalg.svd((np.nan_to_num((Mrt-np.nanmean(Mrt,1,keepdims=True))/(np.nanstd(Mrt,1,keepdims=True)+1e-9))), compute_uv=False))**2
    share = share / share.sum()

    fig2, ax = plt.subplots(1, 3, figsize=(13, 3.6))
    im = ax[0].imshow(C, cmap="RdBu_r", vmin=-0.4, vmax=0.4)
    ax[0].set_xticks(range(len(pids))); ax[0].set_yticks(range(len(pids)))
    ax[0].set_xticklabels([anon[p] for p in pids]); ax[0].set_yticklabels([anon[p] for p in pids])
    ax[0].set_title(f"(a) Inter-subject charge correlation\n(mean off-diag r={obs_r:+.2f}, perm p={p_r:.3f})", fontsize=9)
    fig2.colorbar(im, ax=ax[0], fraction=0.046)

    ax[1].bar(["observed\n1st PC", "shuffled\nnull"], [obs_pc, npc.mean()],
              yerr=[0, npc.std()], color=["#7f1d1d", "#999999"])
    ax[1].set_ylim(0, 0.5); ax[1].set_ylabel("1st-PC variance share")
    ax[1].set_title(f"(b) Shared component vs null\n(obs {obs_pc*100:.0f}% ~ null {npc.mean()*100:.0f}%, p={p_pc:.2f})", fontsize=9)

    ax[2].plot(range(1, len(share) + 1), share, "o-", color="#1f3b73")
    ax[2].set_xlabel("component"); ax[2].set_ylabel("variance share")
    ax[2].set_title("(c) Shared-structure spectrum", fontsize=9)
    fig2.tight_layout()
    fig2.savefig(os.path.join(ROOT, "arxiv_submission", "fig_collective.pdf"))
    fig2.savefig(os.path.join(ROOT, "arxiv_submission", "fig_collective.png"), dpi=150)
    print("wrote fig_collective.pdf  (collective share = %.0f%%)" % (share[0] * 100))


if __name__ == "__main__":
    main()
