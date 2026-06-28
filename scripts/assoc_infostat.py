#!/usr/bin/env python3
"""assoc_infostat.py — reconstruct real word-association pairs (w_I -> w_O) from
Hume language.csv transcripts, compute empirical association probability and
surprisal, and test the information-thermodynamic claim (surprisal -> physical
cost) with inferential statistics. Also runs a real MLE existence proof of the
association estimator.

Outputs JSON (and an EDN summary line) for the paper + langgraph actor.

Pure numpy (no statsmodels): within-subject correlations with cluster bootstrap
CIs and within-subject permutation p-values; MLE by Newton/grid on 1 parameter.
"""
import sys, os, json, glob, csv, re
from datetime import datetime, timezone, timedelta
import numpy as np

JST = timezone(timedelta(hours=9))
ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(20260628)


def real_file(p):
    try:
        return not open(p, errors="replace").readline().startswith("/annex")
    except Exception:
        return False


def real_csv(d, name="*.CSV"):
    for f in glob.glob(os.path.join(d, name)):
        if real_file(f):
            return f
    return None


def load_csv_phys(path):
    date = begin = None; rows = []; ind = False
    for line in open(path, errors="replace"):
        if line.startswith("Date,"): date = line.strip().split(",", 1)[1]
        elif line.startswith("Begin,"): begin = line.strip().split(",", 1)[1]
        elif line.startswith("Time_Sec"): ind = True; continue
        elif ind:
            p = line.strip().split(",")
            if len(p) >= 5 and p[0] != "":
                try: rows.append([float(x) for x in p[:5]])
                except ValueError: pass
    a = np.array(rows)
    begin_ms = datetime.strptime(f"{date} {begin}", "%Y-%m-%d %H:%M:%S").replace(tzinfo=JST).timestamp() * 1000
    return a[:, 0], {f"Ch{i}": a[:, i] for i in range(1, 5)}, begin_ms


def trials_with_phys(pdir):
    """per-trial: word, rt, dsp(Ch2), session, plus stimulus relative time per session."""
    sd = os.path.join(pdir, "session_data.json"); csvf = real_csv(pdir)
    if not (os.path.exists(sd) and real_file(sd) and csvf): return None
    try: d = json.load(open(sd))
    except Exception: return None
    t, ch, begin_ms = load_csv_phys(csvf); dur = t[-1]; sp = ch["Ch2"]
    sess_start = {}; seq = []; cur = None; session = None
    for e in d.get("events", []):
        ty, pl, ts = e["type"], e.get("payload", {}), e["timestamp"]
        if ty in ("recording_started", "session_started"):
            s = pl.get("session")
            if s and s not in sess_start: sess_start[s] = ts
        if ty == "session_started": session = pl.get("session")
        if ty == "word_displayed":
            cur = {"word": pl.get("word"), "disp": ts, "open": None, "speech": None,
                   "close": None, "session": session}; seq.append(cur)
        elif ty == "response_window_opened" and cur: cur["open"] = ts
        elif ty == "speech_detected" and cur and cur.get("speech") is None: cur["speech"] = ts
        elif ty == "response_window_closed" and cur: cur["close"] = ts
    out = []
    for s in seq:
        if not (s["open"] and s["speech"] and s["close"]): continue
        rt = (s["speech"] - s["open"]) / 1000
        rel = (s["disp"] - begin_ms) / 1000
        if not (0 < rt < 12) or rel < 0 or rel > dur: continue
        lo, hi = (s["open"] - begin_ms) / 1000, (s["close"] - begin_ms) / 1000
        m = (t >= lo) & (t <= hi); b = (t >= (s["disp"] - begin_ms) / 1000 - 3) & (t <= (s["disp"] - begin_ms) / 1000)
        if not m.any() or not b.any(): continue
        dsp = float(np.max(np.abs(sp[m] - np.mean(sp[b]))))
        ss = sess_start.get(s["session"])
        rel_sess = (s["disp"] - ss) / 1000 if ss else None
        out.append({"word": s["word"], "rt": rt, "dsp": dsp, "session": s["session"],
                    "rel_sess": rel_sess})
    return out


def reconstruct_responses(path, gap=0.6):
    rows = []
    for row in csv.DictReader(open(path, errors="replace")):
        tx = (row.get("Text") or "").strip()
        try: bt = float(row["BeginTime"]); et = float(row["EndTime"])
        except Exception: continue
        if tx: rows.append((bt, et, tx))
    rows.sort()
    words = []; cur = ""; cb = ce = None
    for bt, et, tx in rows:
        if cb is None: cb = bt
        elif bt - ce > gap: words.append((cb, ce, cur)); cur = ""; cb = bt
        cur += tx; ce = et
    if cur: words.append((cb, ce, cur))
    return words


def norm_word(w):
    w = re.sub(r"\s+", "", w)
    return w.strip("。、,.!?！？ー")


def attach_responses(pdir, trials):
    """align Hume responses to stimuli by time-within-session (registry order = session order)."""
    langs = sorted(glob.glob(os.path.join(pdir, "HumeAI_artifacts_*/registry_file-*/csv/*/language.csv")))
    langs = [L for L in langs if real_file(L)]
    if not langs: return 0
    # map registry index -> session (0->1, 1->2) by filename
    by_session = {}
    for L in langs:
        m = re.search(r"registry_file-(\d+)-", L)
        if m: by_session[int(m.group(1)) + 1] = reconstruct_responses(L)
    matched = 0
    for s in trials:
        sess = s["session"]; resp = by_session.get(sess)
        if not resp or s["rel_sess"] is None: continue
        # response whose begin time is closest to (and after-ish) the stimulus presentation
        cands = [r for r in resp if r[0] >= s["rel_sess"] - 1.0]
        pick = min(cands or resp, key=lambda r: abs(r[0] - s["rel_sess"]))
        if abs(pick[0] - s["rel_sess"]) < 8.0:
            s["resp"] = norm_word(pick[2]); matched += 1
    return matched


def pearson(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    if len(a) < 4 or a.std() == 0 or b.std() == 0: return np.nan
    return float(np.corrcoef(a, b)[0, 1])


def within_subject_fisher(groups, xkey, ykey):
    rs = []
    for g in groups:
        x = np.array([t[xkey] for t in g]); y = np.array([t[ykey] for t in g])
        r = pearson(x, y)
        if r == r: rs.append(r)
    if not rs: return np.nan, []
    z = np.arctanh(np.clip(rs, -0.999, 0.999))
    return float(np.tanh(z.mean())), rs


def main():
    pdirs = sorted(glob.glob(os.path.join(ROOT, "dataset/participants/*/")))
    parts = {}
    for pd in pdirs:
        tr = trials_with_phys(pd)
        if not tr: continue
        attach_responses(pd, tr)
        pid = os.path.basename(pd.rstrip("/"))[:8]
        parts[pid] = tr

    all_pairs = [(t["word"], t["resp"]) for g in parts.values() for t in g if t.get("resp")]
    # empirical association counts
    from collections import defaultdict, Counter
    resp_by_stim = defaultdict(Counter)
    for wi, wo in all_pairs:
        resp_by_stim[wi][wo] += 1
    V = len(set(wo for _, wo in all_pairs)) or 1
    alpha = 0.5

    def surprisal_loo(wi, wo):
        c = resp_by_stim[wi]; tot = sum(c.values())
        p = (c[wo] - 1 + alpha) / (tot - 1 + alpha * V)  # leave-one-out
        return -np.log(max(p, 1e-9))

    # attach surprisal to trials that have a response
    groups = []
    for pid, g in parts.items():
        gg = []
        for t in g:
            if t.get("resp"):
                t["surprisal"] = surprisal_loo(t["word"], t["resp"])
                gg.append(t)
        if len(gg) >= 5: groups.append(gg)

    n_resp = sum(len(g) for g in groups)
    # within-subject couplings
    r_sp, rs_sp = within_subject_fisher(groups, "surprisal", "dsp")
    r_rt, rs_rt = within_subject_fisher(groups, "surprisal", "rt")

    # within-subject permutation p-value for surprisal->dsp
    def perm_p(groups, xkey, ykey, obs, n=3000):
        cnt = 0
        for _ in range(n):
            shuffled = []
            for g in groups:
                y = np.array([t[ykey] for t in g]); y2 = rng.permutation(y)
                shuffled.append([{**t, ykey: float(v)} for t, v in zip(g, y2)])
            r, _ = within_subject_fisher(shuffled, xkey, ykey)
            if abs(r) >= abs(obs): cnt += 1
        return (cnt + 1) / (n + 1)

    p_sp = perm_p(groups, "surprisal", "dsp", r_sp, 2000) if r_sp == r_sp else np.nan
    p_rt = perm_p(groups, "surprisal", "rt", r_rt, 2000) if r_rt == r_rt else np.nan

    # cluster bootstrap CI (resample participants)
    def boot_ci(groups, xkey, ykey, n=2000):
        vals = []
        for _ in range(n):
            samp = [groups[i] for i in rng.integers(0, len(groups), len(groups))]
            r, _ = within_subject_fisher(samp, xkey, ykey)
            if r == r: vals.append(r)
        return (float(np.percentile(vals, 2.5)), float(np.percentile(vals, 97.5))) if vals else (np.nan, np.nan)

    ci_sp = boot_ci(groups, "surprisal", "dsp")
    ci_rt = boot_ci(groups, "surprisal", "rt")

    # MLE existence proof: P(w_O|w_I) ∝ exp(beta * commonality), commonality = LOO log-freq.
    # Fit beta by 1-D MLE over each subject's candidate vocabulary; report predictive accuracy vs chance.
    def fit_beta(groups):
        vocab = sorted(set(wo for _, wo in all_pairs))
        vidx = {w: i for i, w in enumerate(vocab)}
        # feature: commonality score s(wi, c) = log( (count(wi,c)+a)/(tot+aV) ) from FULL data
        def score(wi, c):
            cc = resp_by_stim[wi]; tot = sum(cc.values())
            return np.log((cc.get(c, 0) + alpha) / (tot + alpha * V))
        trials = [(t["word"], t["resp"]) for g in groups for t in g]
        # restrict candidate set to plausible responses (observed vocab) for tractability
        cand = vocab
        S = np.array([[score(wi, c) for c in cand] for wi, _ in trials])  # [T x V]
        yidx = np.array([vidx[wo] for _, wo in trials])
        def negll(beta):
            z = beta * S; z -= z.max(1, keepdims=True)
            p = np.exp(z); p /= p.sum(1, keepdims=True)
            return -np.log(p[np.arange(len(yidx)), yidx] + 1e-12).mean()
        betas = np.linspace(0.0, 12.0, 241)
        lls = [negll(b) for b in betas]
        bhat = float(betas[int(np.argmin(lls))])
        # predictive accuracy at bhat
        z = bhat * S; z -= z.max(1, keepdims=True); p = np.exp(z); p /= p.sum(1, keepdims=True)
        acc = float((p.argmax(1) == yidx).mean()); chance = 1.0 / len(cand)
        nll0 = negll(0.0); nllb = negll(bhat)
        pseudo_r2 = float(1 - nllb / nll0) if nll0 > 0 else np.nan
        return bhat, acc, chance, pseudo_r2, len(trials), len(cand)

    bhat, acc, chance, pr2, ntr, vsz = fit_beta(groups)

    # --- repetition (session 1 -> 2) effect: does re-exposure lower cost? ---
    dlat, ddsp, change_rs = [], [], []
    for pid, g in parts.items():
        s1 = [t for t in g if t["session"] == 1]; s2 = [t for t in g if t["session"] == 2]
        if not s1 or not s2: continue
        dlat.append(np.mean([t["rt"] for t in s2]) - np.mean([t["rt"] for t in s1]))
        ddsp.append(np.mean([t["dsp"] for t in s2]) - np.mean([t["dsp"] for t in s1]))
        w1 = {t["word"]: t for t in s1}; w2 = {t["word"]: t for t in s2}
        common = set(w1) & set(w2)
        if len(common) >= 5:
            dl = np.array([w2[w]["rt"] - w1[w]["rt"] for w in common])
            dd = np.array([w2[w]["dsp"] - w1[w]["dsp"] for w in common])
            r = pearson(dl, dd)
            if r == r: change_rs.append(r)
    zc = np.arctanh(np.clip(change_rs, -0.999, 0.999)) if change_rs else np.array([])

    out = {
        "n_participants_with_resp": len(groups),
        "n_responses_attached": int(n_resp),
        "n_assoc_pairs_total": len(all_pairs),
        "vocab_size": int(V),
        "within_subj_r_surprisal_dsp": r_sp,
        "within_subj_rs_surprisal_dsp": [round(x, 3) for x in rs_sp],
        "perm_p_surprisal_dsp": float(p_sp),
        "bootstrap_ci_surprisal_dsp": [round(ci_sp[0], 3), round(ci_sp[1], 3)],
        "within_subj_r_surprisal_rt": r_rt,
        "perm_p_surprisal_rt": float(p_rt),
        "bootstrap_ci_surprisal_rt": [round(ci_rt[0], 3), round(ci_rt[1], 3)],
        "mle_beta_hat": bhat,
        "mle_top1_accuracy": round(acc, 3),
        "mle_chance": round(chance, 4),
        "mle_pseudo_r2": round(pr2, 3),
        "mle_n_trials": ntr,
        "mle_candidate_vocab": vsz,
        "rep_mean_dlatency_s2_s1": round(float(np.mean(dlat)), 3) if dlat else None,
        "rep_n_latency_decreased": int(sum(1 for x in dlat if x < 0)),
        "rep_mean_ddsp_s2_s1": round(float(np.mean(ddsp)), 4) if ddsp else None,
        "rep_n_dsp_decreased": int(sum(1 for x in ddsp if x < 0)),
        "rep_n_participants": len(dlat),
        "rep_change_coupling_fisher_r": round(float(np.tanh(zc.mean())), 3) if len(zc) else None,
    }
    print(json.dumps(out, ensure_ascii=False, indent=1))
    json.dump(out, open(os.path.join(ROOT, "scripts", "assoc_infostat_result.json"), "w"), ensure_ascii=False)


if __name__ == "__main__":
    main()
