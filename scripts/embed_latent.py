#!/usr/bin/env python3
"""embed_latent.py — semantic-embedding + latent analysis of the word-association
data, to test the *semantic* energy functional of Eq.(assoc) (not just a
popularity baseline) and to extract latent structure.

Requires a Japanese fastText model (cc.ja.300.bin, subword -> handles OOV
compounds). Reuses assoc_infostat for the reconstructed (w_I -> w_O) pairs with
per-trial latency and skin potential.

Outputs JSON summary. Run with the py3.12 venv (gensim/fasttext/sklearn).
  embed_latent.py <path-to-cc.ja.300.bin>
"""
import sys, os, json, glob
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))
import assoc_infostat as A
import fasttext
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

rng = np.random.default_rng(20260628)
MODEL = sys.argv[1] if len(sys.argv) > 1 else "cc.ja.300.bin"


def pearson(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    if len(a) < 4 or a.std() == 0 or b.std() == 0:
        return np.nan
    return float(np.corrcoef(a, b)[0, 1])


def fisher_within(groups, xk, yk):
    rs = []
    for g in groups:
        r = pearson([t[xk] for t in g], [t[yk] for t in g])
        if r == r:
            rs.append(r)
    if not rs:
        return np.nan, []
    return float(np.tanh(np.arctanh(np.clip(rs, -0.999, 0.999)).mean())), rs


def boot_ci(groups, xk, yk, n=2000):
    vals = []
    for _ in range(n):
        samp = [groups[i] for i in rng.integers(0, len(groups), len(groups))]
        r, _ = fisher_within(samp, xk, yk)
        if r == r:
            vals.append(r)
    return [round(float(np.percentile(vals, 2.5)), 3), round(float(np.percentile(vals, 97.5)), 3)] if vals else [None, None]


def perm_p(groups, xk, yk, obs, n=2000):
    c = 0
    for _ in range(n):
        sh = [[{**t, yk: float(v)} for t, v in zip(g, rng.permutation([t[yk] for t in g]))] for g in groups]
        r, _ = fisher_within(sh, xk, yk)
        if abs(r) >= abs(obs):
            c += 1
    return (c + 1) / (n + 1)


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    parts = {}
    for pd in sorted(glob.glob(os.path.join(root, "dataset/participants/*/"))):
        tr = A.trials_with_phys(pd)
        if not tr:
            continue
        A.attach_responses(pd, tr)
        parts[os.path.basename(pd.rstrip("/"))[:8]] = tr

    pairs = [(t["word"], t["resp"]) for g in parts.values() for t in g if t.get("resp")]
    vocab = sorted(set(wo for _, wo in pairs))
    stimuli = sorted(set(wi for wi, _ in pairs))
    print(f"loading fastText {MODEL} ...", file=sys.stderr)
    ft = fasttext.load_model(MODEL)

    def vec(w):
        v = ft.get_word_vector(w)
        n = np.linalg.norm(v)
        return v / n if n else v

    E = {w: vec(w) for w in set(vocab) | set(stimuli)}
    Vmat = np.array([E[w] for w in vocab])  # [V x 300] unit vectors

    # ---- (A) does SEMANTIC similarity predict the actual response? ----
    vidx = {w: i for i, w in enumerate(vocab)}
    trials = [(wi, wo) for wi, wo in pairs if wi in E and wo in vidx]
    Sem = np.array([E[wi] @ Vmat.T for wi, _ in trials])     # cosine sims [T x V]
    y = np.array([vidx[wo] for _, wo in trials])
    # popularity feature (LOO log-commonality) for comparison + combination
    from collections import Counter, defaultdict
    rbs = defaultdict(Counter)
    for wi, wo in pairs:
        rbs[wi][wo] += 1
    Vn = len(vocab); a = 0.5
    Pop = np.array([[np.log((rbs[wi].get(c, 0) + a) / (sum(rbs[wi].values()) + a * Vn)) for c in vocab]
                    for wi, _ in trials])

    def topk_ll(F, beta):
        z = beta * F; z -= z.max(1, keepdims=True); p = np.exp(z); p /= p.sum(1, keepdims=True)
        ll = np.log(p[np.arange(len(y)), y] + 1e-12).mean()
        acc = float((p.argmax(1) == y).mean())
        return acc, ll

    def fit1(F, grid):
        accs_lls = [topk_ll(F, b) for b in grid]
        lls = [x[1] for x in accs_lls]
        bi = int(np.argmax(lls)); b = grid[bi]
        return b, accs_lls[bi][0], accs_lls[bi][1]

    grid = np.linspace(0, 30, 121)
    b_sem, acc_sem, ll_sem = fit1(Sem, grid)
    b_pop, acc_pop, ll_pop = fit1(Pop, np.linspace(0, 12, 121))
    # combined: grid over (b1 semantic, b2 popularity)
    best = (-1e9, 0, 0, 0)
    for b1 in np.linspace(0, 30, 25):
        for b2 in np.linspace(0, 12, 25):
            z = b1 * Sem + b2 * Pop; z -= z.max(1, keepdims=True); p = np.exp(z); p /= p.sum(1, keepdims=True)
            ll = np.log(p[np.arange(len(y)), y] + 1e-12).mean()
            if ll > best[0]:
                acc = float((p.argmax(1) == y).mean()); best = (ll, b1, b2, acc)
    ll0 = topk_ll(Sem, 0.0)[1]
    chance = 1.0 / len(vocab)

    # ---- (B) SEMANTIC surprisal -> cost (independent semantics) ----
    # per-trial semantic surprisal from the semantic-only fitted model
    z = b_sem * Sem; z -= z.max(1, keepdims=True); P = np.exp(z); P /= P.sum(1, keepdims=True)
    sem_surp = {id(t): None for g in parts.values() for t in g}
    ti = 0
    groups = []
    for pid, g in parts.items():
        gg = []
        for t in g:
            if t.get("resp") and t["word"] in E and t["resp"] in vidx:
                t["sem_surp"] = float(-np.log(P[ti, vidx[t["resp"]]] + 1e-12))
                t["cos_io"] = float(E[t["word"]] @ E[t["resp"]])
                # frequency (popularity) surprisal of this response, for confound control
                cc = rbs[t["word"]]; t["freq_surp"] = float(-np.log((cc.get(t["resp"], 0) + a) / (sum(cc.values()) + a * Vn)))
                gg.append(t); ti += 1
        if len(gg) >= 5:
            groups.append(gg)
    r_surp_rt, _ = fisher_within(groups, "sem_surp", "rt")
    r_surp_dsp, _ = fisher_within(groups, "sem_surp", "dsp")
    r_cos_rt, _ = fisher_within(groups, "cos_io", "rt")

    # ---- confound control: partial within-subject correlations (semantic vs frequency) ----
    def partial_within(groups, yk, ak, bk):
        """Fisher-mean within-subject partial corr r(y, a | b): residualize y and a on b per subject."""
        rs = []
        for g in groups:
            y = np.array([t[yk] for t in g], float); aa = np.array([t[ak] for t in g], float); b = np.array([t[bk] for t in g], float)
            if len(y) < 5 or b.std() == 0:
                continue
            # residualize on [1, b]
            X = np.c_[np.ones_like(b), b]
            ry = y - X @ np.linalg.lstsq(X, y, rcond=None)[0]
            ra = aa - X @ np.linalg.lstsq(X, aa, rcond=None)[0]
            r = pearson(ra, ry)
            if r == r:
                rs.append(r)
        return (float(np.tanh(np.arctanh(np.clip(rs, -0.999, 0.999)).mean())) if rs else np.nan), rs

    # raw within-subject sem-distance->rt and freq->rt, then partials
    r_freq_rt, _ = fisher_within(groups, "freq_surp", "rt")
    r_sem_rt_given_freq, _ = partial_within(groups, "rt", "sem_surp", "freq_surp")
    r_freq_rt_given_sem, _ = partial_within(groups, "rt", "freq_surp", "sem_surp")

    # ---- (C) latent structure ----
    pca = PCA(n_components=10).fit(Vmat)
    evr = pca.explained_variance_ratio_
    # semantic separation of low-E (attractor) vs high-E (interference) words:
    # use response-commonality surprisal per stimulus as energy proxy on stimuli? Instead cluster vocab.
    km = KMeans(n_clusters=6, n_init=10, random_state=0).fit(Vmat)
    sil = float(silhouette_score(Vmat, km.labels_)) if len(set(km.labels_)) > 1 else np.nan

    out = {
        "n_pairs": len(trials), "vocab": len(vocab), "chance": round(chance, 4),
        "semantic_only": {"beta": round(float(b_sem), 2), "top1": round(acc_sem, 3), "ll": round(ll_sem, 3)},
        "popularity_only": {"beta": round(float(b_pop), 2), "top1": round(acc_pop, 3), "ll": round(ll_pop, 3)},
        "combined": {"beta_sem": round(float(best[1]), 2), "beta_pop": round(float(best[2]), 2),
                     "top1": round(best[3], 3), "ll": round(best[0], 3)},
        "semantic_pseudo_r2": round(float(1 - ll_sem / ll0), 3) if ll0 else None,
        "sem_surprisal_to_rt_r": round(r_surp_rt, 3),
        "sem_surprisal_to_dsp_r": round(r_surp_dsp, 3),
        "cos_io_to_rt_r": round(r_cos_rt, 3),
        "freq_surprisal_to_rt_r": round(r_freq_rt, 3),
        "partial_sem_rt_given_freq": round(r_sem_rt_given_freq, 3),
        "partial_freq_rt_given_sem": round(r_freq_rt_given_sem, 3),
        "pca_evr_top5": [round(float(x), 3) for x in evr[:5]],
        "pca_cum10": round(float(evr[:10].sum()), 3),
        "kmeans6_silhouette": round(sil, 3),
    }
    # inferential for the key semantic surprisal -> rt
    out["sem_surprisal_to_rt_ci"] = boot_ci(groups, "sem_surp", "rt")
    out["sem_surprisal_to_rt_p"] = round(perm_p(groups, "sem_surp", "rt", r_surp_rt), 4)
    out["sem_surprisal_to_dsp_ci"] = boot_ci(groups, "sem_surp", "dsp")
    out["sem_surprisal_to_dsp_p"] = round(perm_p(groups, "sem_surp", "dsp", r_surp_dsp), 4)
    print(json.dumps(out, ensure_ascii=False, indent=1))
    json.dump(out, open(os.path.join(root, "scripts", "embed_latent_result.json"), "w"), ensure_ascii=False)


if __name__ == "__main__":
    main()
