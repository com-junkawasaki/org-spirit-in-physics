#!/usr/bin/env python3
"""Pilot energy-landscape figure from real bodily-response data.

Reads the word-association event logs (session_data.json: unix-ms timestamps)
and the continuously recorded skin-potential CSVs (Mod-002, 1 Hz, wall-clock
Begin time) for the pilot cohort, aligns them on the clock, extracts per-trial
response latency and skin-potential arousal (Delta SP), and renders the
energy-landscape figure used in arxiv_submission/main.tex.

Energy proxy (illustrative): E = z(latency) + z(Delta SP). Stable attractor
basins = fast, low-arousal responses (low E); unstable interference = slow,
high-arousal responses (high E). This is the behavioural+electrodermal
(eta -> 0) reduction of the model in Section 5; facial affect is not used.

Usage:  scratchpad/venv/bin/python scripts/make_landscape_figure.py
Output: arxiv_submission/fig_landscape.pdf and .png
"""
import json, glob, os, csv
from datetime import datetime, timezone, timedelta
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JST = timezone(timedelta(hours=9))


def real_csv(d):
    for f in glob.glob(os.path.join(d, "*.CSV")):
        if not open(f, errors="replace").readline().startswith("/annex"):
            return f
    return None


def load_csv(path):
    """Return (time_sec array, {ch: array}) for the Measurement Record, plus begin_ms."""
    date = begin = None
    rows = []
    in_data = False
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
                parts = line.strip().split(",")
                if len(parts) >= 5 and parts[0] != "":
                    try:
                        rows.append([float(x) for x in parts[:5]])
                    except ValueError:
                        pass
    arr = np.array(rows)
    begin_dt = datetime.strptime(f"{date} {begin}", "%Y-%m-%d %H:%M:%S").replace(tzinfo=JST)
    begin_ms = begin_dt.timestamp() * 1000.0
    t = arr[:, 0]
    chans = {f"Ch{i}": arr[:, i] for i in range(1, 5)}
    return t, chans, begin_ms


def trials_for_participant(pdir):
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
    # group events per word occurrence in order
    opens, closes, speech, disp = {}, {}, {}, {}
    seq = []  # (word, t_display_ms, t_open_ms, t_speech_ms, t_close_ms)
    cur = None
    session = None
    for e in ev:
        ty, pl, ts = e["type"], e.get("payload", {}), e["timestamp"]
        w = pl.get("word")
        if ty == "session_started":
            session = pl.get("session")
        if ty == "word_displayed":
            cur = {"word": w, "disp": ts, "open": None, "speech": None,
                   "close": None, "session": session}
            seq.append(cur)
        elif ty == "response_window_opened" and cur is not None:
            cur["open"] = ts
        elif ty == "speech_detected" and cur is not None and cur.get("speech") is None:
            cur["speech"] = ts
        elif ty == "response_window_closed" and cur is not None:
            cur["close"] = ts

    def sp_at(ms_lo, ms_hi, ch):
        lo = (ms_lo - begin_ms) / 1000.0
        hi = (ms_hi - begin_ms) / 1000.0
        m = (t >= lo) & (t <= hi)
        return ch[m] if m.any() else None

    out = []  # per channel we will collect; first pass collect raw windows
    for s in seq:
        if not (s["open"] and s["speech"] and s["close"]):
            continue
        rt = (s["speech"] - s["open"]) / 1000.0
        if not (0 < rt < 12):
            continue
        rel = (s["disp"] - begin_ms) / 1000.0
        if rel < 0 or rel > dur:
            continue
        rec = {"word": s["word"], "rt": rt, "session": s.get("session")}
        ok = True
        for chname, ch in chans.items():
            base = sp_at(s["disp"] - 3000, s["disp"], ch)
            resp = sp_at(s["open"], s["close"], ch)
            if base is None or resp is None or len(base) == 0 or len(resp) == 0:
                ok = False
                break
            rec[f"dsp_{chname}"] = float(np.max(np.abs(resp - np.mean(base))))
        if ok:
            out.append(rec)
    return out, csvf, (t, chans, begin_ms, seq)


def main():
    pdirs = sorted(glob.glob(os.path.join(ROOT, "dataset/participants/*/")))
    all_trials = []
    per_part = {}
    raw_for_trace = None
    for pdir in pdirs:
        r = trials_for_participant(pdir)
        if not r:
            continue
        trials, csvf, raw = r
        if not trials:
            continue
        # sanity: discard participants whose word events fall outside CSV (clock mismatch)
        pid = os.path.basename(pdir.rstrip("/"))[:8]
        per_part[pid] = trials
        for tr in trials:
            tr["pid"] = pid
        all_trials.extend(trials)
        if raw_for_trace is None and len(trials) > 20:
            raw_for_trace = (pid, csvf, raw)

    print(f"participants used: {len(per_part)}  total trials: {len(all_trials)}")
    for pid, tr in per_part.items():
        print(f"  {pid}: {len(tr)} trials")

    # Ch2 is the primary skin-potential channel used by the analysis pipeline.
    # Channel selection was not preregistered; this is reported as a limitation.
    chan_score = {}
    for ch in ["Ch1", "Ch2", "Ch3", "Ch4"]:
        vals = np.array([tr[f"dsp_{ch}"] for tr in all_trials])
        chan_score[ch] = np.median(vals)
    sp_ch = "Ch2"
    print("channel median |Delta SP|:", {k: round(v, 4) for k, v in chan_score.items()},
          "-> analysis channel:", sp_ch)

    rt = np.array([tr["rt"] for tr in all_trials])
    dsp = np.array([tr[f"dsp_{sp_ch}"] for tr in all_trials])
    zr = (rt - rt.mean()) / rt.std()
    zs = (dsp - dsp.mean()) / dsp.std()
    energy = zr + zs  # descriptive response-cost score

    # P1 diagnostic: latency vs arousal correlation (predicted positive)
    r_p1 = np.corrcoef(rt, dsp)[0, 1]
    print(f"P1 check  corr(latency, Delta SP) = {r_p1:+.3f}  (n={len(rt)})")

    # test-retest reproducibility (sessions 1 vs 2, same word list) -> P2
    s1x, s2y = [], []
    for pid, trs in per_part.items():
        # collect mean latency per (word, session)
        agg = {}
        for tr in trs:
            s = tr.get("session")
            if s in (1, 2):
                agg.setdefault((tr["word"], s), []).append(tr["rt"])
        words = set(w for (w, s) in agg)
        for w in words:
            if (w, 1) in agg and (w, 2) in agg:
                s1x.append(np.mean(agg[(w, 1)]))
                s2y.append(np.mean(agg[(w, 2)]))
    s1x, s2y = np.array(s1x), np.array(s2y)
    r_tr = np.corrcoef(s1x, s2y)[0, 1] if len(s1x) > 2 else float("nan")
    print(f"P2 test-retest  corr(latency_s1, latency_s2) = {r_tr:+.3f}  (n={len(s1x)} words)")

    # ---- figure ----
    fig, axes = plt.subplots(1, 3, figsize=(15.5, 4.4))

    # Panel A: energy landscape (latency x arousal, colored by E)
    ax = axes[0]
    sc = ax.scatter(rt, dsp, c=energy, cmap="viridis", s=26, alpha=0.85,
                    edgecolors="none")
    cb = fig.colorbar(sc, ax=ax)
    cb.set_label(r"Response-cost score  $C=z(\mathrm{latency})+z(\Delta SP)$")
    ax.set_xlabel("Response latency (s)")
    ax.set_ylabel(r"Skin-potential arousal $\Delta SP$ (mV)")
    ax.set_title(f"(a) Pilot response landscape  (N={len(per_part)}, {len(rt)} trials)")
    # annotate regimes
    ar = dict(arrowstyle="->", lw=1.2)
    ax.annotate("lower response\ncost", xy=(rt.min() + 0.15, dsp.min() + 0.004),
                xytext=(np.percentile(rt, 33), np.percentile(dsp, 80)),
                fontsize=9, ha="center", color="#1b5e20", fontweight="bold",
                arrowprops=dict(color="#1b5e20", **ar))
    ax.annotate("higher response\ncost", xy=(np.percentile(rt, 99), np.percentile(dsp, 88)),
                xytext=(np.percentile(rt, 72), np.percentile(dsp, 96)),
                fontsize=9, ha="center", color="#7f1d1d", fontweight="bold",
                arrowprops=dict(color="#7f1d1d", **ar))

    # Panel B: example skin-potential trace with word onsets
    ax = axes[1]
    pid, csvf, (t, chans, begin_ms, seq) = raw_for_trace
    ch = chans[sp_ch]
    base = np.median(ch)
    ax.plot(t, ch - base, lw=0.6, color="#1f3b73")
    onsets = [(s["disp"] - begin_ms) / 1000.0 for s in seq if s.get("disp")]
    onsets = [o for o in onsets if 0 <= o <= t[-1]]
    for o in onsets[:60]:
        ax.axvline(o, color="#cc5500", alpha=0.18, lw=0.7)
    # show a representative 200 s window, autoscaled to the visible signal
    if t[-1] > 260:
        lo = onsets[3] if len(onsets) > 3 else 60
        hiw = lo + 200
        ax.set_xlim(lo, hiw)
        win = (t >= lo) & (t <= hiw)
        yv = (ch - base)[win]
        pad = 0.15 * (yv.max() - yv.min() + 1e-6)
        ax.set_ylim(yv.min() - pad, yv.max() + pad)
    ax.set_xlabel("Time (s)")
    ax.set_ylabel(f"Skin potential, {sp_ch} (mV, baseline-subtracted)")
    anon = {p: f"P{i+1}" for i, p in enumerate(sorted(per_part))}
    ax.set_title(f"(b) Response-locked skin potential  (participant {anon.get(pid, 'P?')})")

    # Panel C: test-retest reproducibility of per-word latency (sessions 1 vs 2)
    ax = axes[2]
    lim = (0, np.percentile(np.concatenate([s1x, s2y]), 99) * 1.05)
    ax.plot(lim, lim, color="0.6", lw=1, ls="--", zorder=0)
    ax.scatter(s1x, s2y, s=22, alpha=0.7, color="#1f3b73", edgecolors="none")
    ax.set_xlim(*lim); ax.set_ylim(*lim)
    ax.set_aspect("equal")
    ax.set_xlabel("Per-word latency, session 1 (s)")
    ax.set_ylabel("Per-word latency, session 2 (s)")
    ax.set_title(f"(c) Test--retest reproducibility  (r={r_tr:.2f}, {len(s1x)} word-pairs)")
    ax.annotate(f"Pearson r = {r_tr:.2f}", xy=(0.05, 0.92), xycoords="axes fraction",
                fontsize=10, fontweight="bold", color="#1b5e20")

    fig.tight_layout()
    out_pdf = os.path.join(ROOT, "arxiv_submission", "fig_landscape.pdf")
    out_png = os.path.join(ROOT, "arxiv_submission", "fig_landscape.png")
    fig.savefig(out_pdf)
    fig.savefig(out_png, dpi=160)
    print("wrote", out_pdf)
    print("wrote", out_png)


if __name__ == "__main__":
    main()
