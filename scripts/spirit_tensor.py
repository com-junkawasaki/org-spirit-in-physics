#!/usr/bin/env python3
"""spirit_tensor.py — cast 'spirit' into physics as a vector space + tensor network.

Staged numeric backend for the langgraph-clj StateGraph actor. Each stage reads
and updates a shared JSON state file, so the orchestrator can checkpoint between
nodes:

  load      parse word-association latencies + skin-potential CSVs (clock-aligned)
  tensorize build the 3-way tensor T[participant x word x feature]
  spectral  RBF-kernel -> graph Laplacian -> spectral embedding (vector space)
  tucker    HOSVD / Tucker decomposition of T (tensor network factors)
  analyze   physics observables (spectral gap, energy landscape, participation)

Usage:
  spirit_tensor.py <stage> <state.json> [dataset_root]

Pure numpy (no tensorly): Tucker via truncated HOSVD of the mode unfoldings.
"""
import sys, os, json, glob, csv
from datetime import datetime, timezone, timedelta
import numpy as np

JST = timezone(timedelta(hours=9))


# ---------- shared helpers ----------
def real_csv(d):
    for f in glob.glob(os.path.join(d, "*.CSV")):
        if not open(f, errors="replace").readline().startswith("/annex"):
            return f
    return None


def load_csv(path):
    date = begin = None
    rows, in_data = [], False
    with open(path, errors="replace") as fh:
        for line in fh:
            if line.startswith("Date,"):
                date = line.strip().split(",", 1)[1]
            elif line.startswith("Begin,"):
                begin = line.strip().split(",", 1)[1]
            elif line.startswith("Time_Sec"):
                in_data = True
                continue
            elif in_data:
                p = line.strip().split(",")
                if len(p) >= 5 and p[0] != "":
                    try:
                        rows.append([float(x) for x in p[:5]])
                    except ValueError:
                        pass
    arr = np.array(rows)
    begin_ms = datetime.strptime(f"{date} {begin}", "%Y-%m-%d %H:%M:%S").replace(tzinfo=JST).timestamp() * 1000
    return arr[:, 0], {f"Ch{i}": arr[:, i] for i in range(1, 5)}, begin_ms


def participant_trials(pdir):
    sd = os.path.join(pdir, "session_data.json")
    csvf = real_csv(pdir)
    if not os.path.exists(sd) or not csvf:
        return None
    try:
        d = json.load(open(sd))
    except Exception:
        return None
    ev = d.get("events", [])
    t, chans, begin_ms = load_csv(csvf)
    dur = t[-1]
    seq, cur, session = [], None, None
    for e in ev:
        ty, pl, ts = e["type"], e.get("payload", {}), e["timestamp"]
        if ty == "session_started":
            session = pl.get("session")
        if ty == "word_displayed":
            cur = {"word": pl.get("word"), "disp": ts, "open": None,
                   "speech": None, "close": None, "session": session}
            seq.append(cur)
        elif ty == "response_window_opened" and cur:
            cur["open"] = ts
        elif ty == "speech_detected" and cur and cur.get("speech") is None:
            cur["speech"] = ts
        elif ty == "response_window_closed" and cur:
            cur["close"] = ts

    def win(lo_ms, hi_ms, ch):
        lo, hi = (lo_ms - begin_ms) / 1000, (hi_ms - begin_ms) / 1000
        m = (t >= lo) & (t <= hi)
        return ch[m] if m.any() else None

    out = []
    for s in seq:
        if not (s["open"] and s["speech"] and s["close"]):
            continue
        rt = (s["speech"] - s["open"]) / 1000
        rel = (s["disp"] - begin_ms) / 1000
        if not (0 < rt < 12) or rel < 0 or rel > dur:
            continue
        rec = {"word": s["word"], "rt": rt, "session": s.get("session")}
        ok = True
        for cn, ch in chans.items():
            base = win(s["disp"] - 3000, s["disp"], ch)
            resp = win(s["open"], s["close"], ch)
            if base is None or resp is None or len(base) == 0 or len(resp) == 0:
                ok = False
                break
            rec[f"dsp_{cn}"] = float(np.max(np.abs(resp - np.mean(base))))
        if ok:
            out.append(rec)
    return out


# ---------- Tucker via truncated HOSVD ----------
def unfold(T, mode):
    return np.moveaxis(T, mode, 0).reshape(T.shape[mode], -1)


def mode_dot(T, M, mode):
    Tu = unfold(T, mode)
    out = M @ Tu
    new = list(T.shape)
    new[mode] = M.shape[0]
    return np.moveaxis(out.reshape([M.shape[0]] + [s for i, s in enumerate(T.shape) if i != mode]), 0, mode)


def hosvd(T, ranks):
    factors = []
    for mode, r in enumerate(ranks):
        U, S, _ = np.linalg.svd(unfold(T, mode), full_matrices=False)
        factors.append(U[:, :r])
    core = T.copy()
    for mode, U in enumerate(factors):
        core = mode_dot(core, U.T, mode)
    return core, factors


# ---------- stages ----------
def stage_load(state, root):
    pdirs = sorted(glob.glob(os.path.join(root, "dataset/participants/*/")))
    parts = {}
    for pdir in pdirs:
        tr = participant_trials(pdir)
        if tr:
            parts[os.path.basename(pdir.rstrip("/"))[:8]] = tr
    state["participants"] = {p: tr for p, tr in parts.items()}
    state["n_participants"] = len(parts)
    state["total_trials"] = sum(len(v) for v in parts.values())
    return state


def stage_tensorize(state):
    parts = state["participants"]
    pids = sorted(parts)
    # shared word set (present for every participant, averaged over sessions)
    wsets = []
    for p in pids:
        wsets.append(set(tr["word"] for tr in parts[p]))
    shared = sorted(set.intersection(*wsets)) if wsets else []
    feats = ["rt", "dsp_Ch1", "dsp_Ch2"]
    P, W, F = len(pids), len(shared), len(feats)
    T = np.full((P, W, F), np.nan)
    widx = {w: i for i, w in enumerate(shared)}
    for pi, p in enumerate(pids):
        agg = {}
        for tr in parts[p]:
            if tr["word"] in widx:
                agg.setdefault(tr["word"], []).append(tr)
        for w, trs in agg.items():
            for fi, f in enumerate(feats):
                T[pi, widx[w], fi] = np.mean([t[f] for t in trs])
    # impute remaining NaN with per-(word,feature) mean, then per-feature mean
    for fi in range(F):
        sl = T[:, :, fi]
        col = np.nanmean(sl, axis=0)
        col = np.where(np.isnan(col), np.nanmean(col), col)
        inds = np.where(np.isnan(sl))
        sl[inds] = np.take(col, inds[1])
        T[:, :, fi] = sl
    # z-score per feature
    for fi in range(F):
        v = T[:, :, fi]
        T[:, :, fi] = (v - v.mean()) / (v.std() + 1e-9)
    state["pids"] = pids
    state["words"] = shared
    state["features"] = feats
    state["tensor_shape"] = [P, W, F]
    state["_tensor"] = T.tolist()
    return state


def stage_spectral(state, sigma_mult=1.0):
    T = np.array(state["_tensor"])
    P, W, F = T.shape
    # word vectors = concat over participants x features  -> X[W, P*F]
    X = np.moveaxis(T, 1, 0).reshape(W, P * F)
    # pairwise distances
    sq = np.sum(X**2, 1)
    D2 = np.maximum(sq[:, None] + sq[None, :] - 2 * X @ X.T, 0)
    med = np.median(np.sqrt(D2[D2 > 0])) if np.any(D2 > 0) else 1.0
    sigma = med * sigma_mult
    Wk = np.exp(-D2 / (sigma**2 + 1e-12))
    np.fill_diagonal(Wk, 0)
    deg = Wk.sum(1)
    Lap = np.diag(deg) - Wk
    # symmetric normalized Laplacian
    dinv = 1.0 / np.sqrt(deg + 1e-12)
    Lsym = np.eye(W) - (dinv[:, None] * Wk * dinv[None, :])
    evals, evecs = np.linalg.eigh(Lsym)
    order = np.argsort(evals)
    evals = evals[order]
    evecs = evecs[:, order]
    emb = evecs[:, 1:4]  # skip trivial first
    state["laplacian_eigenvalues"] = evals[:12].tolist()
    state["spectral_gap"] = float(evals[2] - evals[1])
    state["embedding"] = emb.tolist()
    state["sigma"] = float(sigma)
    return state


def stage_tucker(state, ranks=None):
    T = np.array(state["_tensor"])
    P, W, F = T.shape
    if ranks is None:
        ranks = [min(P, 3), min(W, 6), F]
    core, factors = hosvd(T, ranks)
    # reconstruction + explained variance
    rec = core.copy()
    for m, U in enumerate(factors):
        rec = mode_dot(rec, U, m)
    ev = 1 - np.sum((T - rec) ** 2) / (np.sum(T**2) + 1e-12)
    state["tucker_ranks"] = list(ranks)
    state["tucker_explained_var"] = float(ev)
    state["tucker_core_energy"] = float(np.sum(core**2))
    # word-mode factor (latent spirit modes over words)
    state["word_factors"] = factors[1].tolist()
    state["participant_factors"] = factors[0].tolist()
    state["feature_factors"] = factors[2].tolist()
    state["core_norm_per_mode"] = [float(np.linalg.norm(core[i])) for i in range(core.shape[0])]
    return state


def stage_analyze(state):
    evals = np.array(state["laplacian_eigenvalues"])
    emb = np.array(state["embedding"])
    # participation ratio of the spectrum (effective # of modes)
    lam = evals[1:]  # drop trivial
    pr = (lam.sum() ** 2) / (np.sum(lam**2) + 1e-12)
    # energy per word from embedding radius (distance from centroid = surprisal proxy)
    r = np.linalg.norm(emb - emb.mean(0), axis=1)
    energy = (r - r.mean()) / (r.std() + 1e-9)
    words = state["words"]
    order = np.argsort(energy)
    state["participation_ratio"] = float(pr)
    state["n_words"] = len(words)
    state["attractor_words"] = [words[i] for i in order[:8]]      # low energy
    state["interference_words"] = [words[i] for i in order[-8:]]  # high energy
    state["energy_per_word"] = {words[i]: float(energy[i]) for i in range(len(words))}
    return state


def _pearson(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    if len(a) < 3 or a.std() == 0 or b.std() == 0:
        return float("nan")
    return float(np.corrcoef(a, b)[0, 1])


def _rank(x):
    order = np.argsort(np.argsort(x))
    return order.astype(float)


def stage_infothermo(state):
    """Information-thermodynamics test (non-circular): does processing surprisal
    (response latency, a behavioural/temporal cost) predict physiological/
    thermodynamic cost (skin-potential arousal Delta SP)? Reported within-subject
    (avoids Simpson's paradox), energy-stratified, and via mutual information."""
    parts = state["participants"]
    sp_ch = "dsp_Ch2"
    per_subj_r, per_subj_rho, allz_rt, allz_sp = [], [], [], []
    for p, trs in parts.items():
        rt = np.array([t["rt"] for t in trs if sp_ch in t])
        sp = np.array([t[sp_ch] for t in trs if sp_ch in t])
        if len(rt) < 5:
            continue
        # within-subject z-score (remove per-participant baseline/scale)
        zrt = (rt - rt.mean()) / (rt.std() + 1e-9)
        zsp = (sp - sp.mean()) / (sp.std() + 1e-9)
        per_subj_r.append(_pearson(zrt, zsp))
        per_subj_rho.append(_pearson(_rank(rt), _rank(sp)))
        allz_rt.extend(zrt.tolist())
        allz_sp.extend(zsp.tolist())
    per_subj_r = [r for r in per_subj_r if r == r]
    allz_rt, allz_sp = np.array(allz_rt), np.array(allz_sp)

    # Fisher-z mean of within-subject correlations
    z = np.arctanh(np.clip(np.array(per_subj_r), -0.999, 0.999))
    fisher_mean = float(np.tanh(z.mean())) if len(z) else float("nan")

    # energy-stratified physiological cost (low-energy attractor vs high-energy)
    epw = state.get("energy_per_word", {})
    low_sp, high_sp = [], []
    if epw:
        med = np.median(list(epw.values()))
        for p, trs in parts.items():
            for t in trs:
                if sp_ch in t and t["word"] in epw:
                    (low_sp if epw[t["word"]] <= med else high_sp).append(t[sp_ch])
    low_sp, high_sp = np.array(low_sp), np.array(high_sp)

    # mutual information between latency and Delta SP (within-subject z, 5x5 bins)
    def mutual_info(x, y, bins=5):
        if len(x) < 20:
            return float("nan")
        c, _, _ = np.histogram2d(x, y, bins=bins)
        pxy = c / c.sum()
        px, py = pxy.sum(1, keepdims=True), pxy.sum(0, keepdims=True)
        nz = pxy > 0
        return float(np.sum(pxy[nz] * np.log(pxy[nz] / (px @ py)[nz])))

    state["it_within_subject_r"] = per_subj_r
    state["it_fisher_mean_r"] = fisher_mean
    state["it_pooled_withinz_r"] = _pearson(allz_rt, allz_sp)
    state["it_spearman_per_subj_mean"] = float(np.nanmean(per_subj_rho)) if per_subj_rho else float("nan")
    state["it_mutual_info_nats"] = mutual_info(allz_rt, allz_sp)
    state["it_cost_low_energy_meanSP"] = float(low_sp.mean()) if len(low_sp) else float("nan")
    state["it_cost_high_energy_meanSP"] = float(high_sp.mean()) if len(high_sp) else float("nan")
    state["it_cost_ratio_high_over_low"] = (float(high_sp.mean() / low_sp.mean())
                                            if len(low_sp) and len(high_sp) and low_sp.mean() != 0 else float("nan"))
    state["it_n_trials"] = int(len(allz_rt))
    return state


STAGES = {
    "load": lambda s, root: stage_load(s, root),
    "tensorize": lambda s, root: stage_tensorize(s),
    "spectral": lambda s, root: stage_spectral(s),
    "tucker": lambda s, root: stage_tucker(s),
    "analyze": lambda s, root: stage_analyze(s),
    "infothermo": lambda s, root: stage_infothermo(s),
}


def main():
    stage = sys.argv[1]
    statefile = sys.argv[2]
    root = sys.argv[3] if len(sys.argv) > 3 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    state = json.load(open(statefile)) if os.path.exists(statefile) else {}
    state = STAGES[stage](state, root)
    json.dump(state, open(statefile, "w"))
    # compact summary for the orchestrator; emit as EDN so the
    # langgraph-clj StateGraph nodes can read it with clojure.edn/read-string.
    drop = ("participants", "embedding", "energy_per_word", "word_factors",
            "participant_factors", "feature_factors", "words", "pids")
    summary = {k: v for k, v in state.items() if not k.startswith("_") and k not in drop}

    def edn(v):
        if isinstance(v, bool):
            return "true" if v else "false"
        if v is None:
            return "nil"
        if isinstance(v, (int, float)):
            return repr(v)
        if isinstance(v, str):
            return '"' + v.replace("\\", "\\\\").replace('"', '\\"') + '"'
        if isinstance(v, (list, tuple)):
            return "[" + " ".join(edn(x) for x in v) + "]"
        if isinstance(v, dict):
            return "{" + " ".join(f":{k} {edn(val)}" for k, val in v.items()) + "}"
        return '"' + str(v) + '"'

    print(edn({"stage": stage, "summary": summary}))


if __name__ == "__main__":
    main()
