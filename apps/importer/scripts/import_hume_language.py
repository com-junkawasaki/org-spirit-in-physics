#!/usr/bin/env python3
# import_hume_language.py
# ETL: Hume language.csv → participant_session_hume
from arango import ArangoClient
import csv, os, glob, json, math

EMOTION_COLS = [
  "Admiration","Adoration","Aesthetic Appreciation","Amusement","Anger","Annoyance","Anxiety","Awe","Awkwardness","Boredom","Calmness","Concentration","Confusion","Contemplation","Contempt","Contentment","Craving","Determination","Disappointment","Disapproval","Disgust","Distress","Doubt","Ecstasy","Embarrassment","Empathic Pain","Enthusiasm","Entrancement","Envy","Excitement","Fear","Gratitude","Guilt","Horror","Interest","Joy","Love","Nostalgia","Pain","Pride","Realization","Relief","Romance","Sadness","Sarcasm","Satisfaction","Desire","Shame","Surprise (negative)","Surprise (positive)","Sympathy","Tiredness","Triumph","1","2","3","4","5","6","7","8","9","toxic","severe_toxic","obscene","threat","insult","identity_hate"
]

def ensure_collection(db, name):
    if not db.has_collection(name):
        db.create_collection(name)
        # indexes
        db.collection(name).add_hash_index(["participant_id"], unique=False, sparse=False)
        db.collection(name).add_hash_index(["session_id"], unique=False, sparse=False)
        db.collection(name).add_persistent_index(["t_ms"], unique=False, sparse=False)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", required=True, help="path to dataset/participants")
    ap.add_argument("--arangodb-url", default="http://arangodb:8529")
    ap.add_argument("--db", default="spirit_in_physics")
    ap.add_argument("--user", default="root")
    ap.add_argument("--password", default="")
    args = ap.parse_args()

    client = ArangoClient(hosts=args.arangodb_url)
    db = client.db(args.db, username=args.user, password=args.password)
    ensure_collection(db, "participant_session_hume")
    col_h = db.collection("participant_session_hume")
    col_s = db.collection("participant_sessions")

    imported = 0

    for pdir in glob.glob(os.path.join(args.dataset, "*")):
        pid = os.path.basename(pdir)
        if not os.path.isdir(pdir):
            continue

        # find all language.csv files
        for csv_path in glob.glob(os.path.join(pdir, "**", "language.csv"), recursive=True):
            # get sessions for this participant
            sessions = list(col_s.find({"participant_id": pid}))
            if not sessions:
                continue

            # process csv rows
            with open(csv_path, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                rows = list(reader)

            for r in rows:
                try:
                    bt = float(r.get("BeginTime") or 0)
                    et = float(r.get("EndTime") or 0)
                    conf = float(r.get("Confidence") or 0)
                except (ValueError, TypeError):
                    continue

                # find best session match
                mid = (bt + et) / 2.0
                best_sess = None
                best_dist = float('inf')

                for s in sessions:
                    start_ms = s["start_ts"]
                    end_ms = s.get("end_ts") or (start_ms + 60*60*1000)  # 1 hour fallback
                    t_ms = start_ms + int(mid * 1000)

                    # prefer in-range, then closest
                    if t_ms >= start_ms and t_ms <= end_ms:
                        dist = 0
                    else:
                        dist = min(abs(t_ms - start_ms), abs(t_ms - end_ms))

                    if dist < best_dist:
                        best_dist, best_sess = dist, s

                if not best_sess or best_dist > 5*60*1000:  # >5min away
                    continue

                # extract emotion scores
                scores = {}
                for col in EMOTION_COLS:
                    val = r.get(col, "")
                    try:
                        scores[col] = float(val) if val else 0.0
                    except ValueError:
                        scores[col] = 0.0

                doc = {
                    "participant_id": pid,
                    "session_id": best_sess["_key"],
                    "t_ms": best_sess["start_ts"] + int(mid * 1000),
                    "text": r.get("Text") or "",
                    "confidence": conf,
                    "scores": scores,
                }
                col_h.insert(doc)
                imported += 1

    print(f"Imported {imported} Hume language entries")

if __name__ == "__main__":
    import argparse
    main()
