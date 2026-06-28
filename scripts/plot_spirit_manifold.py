#!/usr/bin/env python3
"""Plot the physics-cast 'spirit' manifold from the langgraph-clj analysis state.

Reads the JSON state produced by scripts/spirit_tensor.py and renders:
  (a) graph-Laplacian eigenvalue spectrum (the "vibrational modes" of the
      spirit manifold; the spectral gap separates coherent modes)
  (b) 3D spectral embedding of the words (the vector space), colored by energy
  (c) Tucker reconstruction error vs rank (tensor-network compressibility)

Usage: plot_spirit_manifold.py <state.json> <out.pdf>
"""
import sys, json
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D  # noqa


def main():
    state = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    evals = np.array(state["laplacian_eigenvalues"])
    emb = np.array(state["embedding"])
    epw = state["energy_per_word"]
    words = state["words"]
    energy = np.array([epw[w] for w in words])

    fig = plt.figure(figsize=(15.5, 4.6))

    # (a) eigenvalue spectrum
    ax = fig.add_subplot(1, 3, 1)
    ax.plot(range(len(evals)), evals, "o-", color="#1f3b73", ms=4)
    gap = state["spectral_gap"]
    ax.axvspan(1, 2, color="orange", alpha=0.15)
    ax.set_xlabel("index")
    ax.set_ylabel(r"normalized Laplacian eigenvalue $\lambda$")
    ax.set_title(f"(a) Spirit-manifold spectrum  (gap={gap:.3f}, eff.modes={state['participation_ratio']:.1f})")

    # (b) 3D spectral embedding = the vector space
    ax = fig.add_subplot(1, 3, 2, projection="3d")
    p = ax.scatter(emb[:, 0], emb[:, 1], emb[:, 2], c=energy, cmap="viridis", s=24)
    fig.colorbar(p, ax=ax, shrink=0.6, label="energy (surprisal proxy)")
    ax.set_title("(b) Spirit vector space (spectral embedding)")
    ax.set_xlabel("e2"); ax.set_ylabel("e3"); ax.set_zlabel("e4")

    # (c) Tucker reconstruction vs rank (recompute curve from the stored tensor if present)
    ax = fig.add_subplot(1, 3, 3)
    T = np.array(state["_tensor"]) if "_tensor" in state else None
    if T is not None:
        P, W, F = T.shape

        def unfold(A, m):
            return np.moveaxis(A, m, 0).reshape(A.shape[m], -1)

        def mode_dot(A, M, m):
            out = M @ unfold(A, m)
            ns = list(A.shape); ns[m] = M.shape[0]
            return np.moveaxis(out.reshape([M.shape[0]] + [s for i, s in enumerate(A.shape) if i != m]), 0, m)

        rs = list(range(1, W // 2, 2))
        evs = []
        for rw in rs:
            ranks = [min(P, 3), rw, F]
            facs = []
            for m, r in enumerate(ranks):
                U, _, _ = np.linalg.svd(unfold(T, m), full_matrices=False)
                facs.append(U[:, :r])
            core = T.copy()
            for m, U in enumerate(facs):
                core = mode_dot(core, U.T, m)
            rec = core.copy()
            for m, U in enumerate(facs):
                rec = mode_dot(rec, U, m)
            evs.append(1 - np.sum((T - rec) ** 2) / np.sum(T ** 2))
        ax.plot(rs, evs, "s-", color="#7f1d1d", ms=4)
        ax.axhline(0.9, color="0.6", ls="--", lw=1)
        ax.set_xlabel("word-mode rank")
        ax.set_ylabel("Tucker explained variance")
        ax.set_title("(c) Tensor-network compressibility (HOSVD)")
    fig.tight_layout()
    fig.savefig(out)
    fig.savefig(out.replace(".pdf", ".png"), dpi=150)
    print("wrote", out)


if __name__ == "__main__":
    main()
