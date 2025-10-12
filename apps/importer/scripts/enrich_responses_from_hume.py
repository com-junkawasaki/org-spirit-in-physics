#!/usr/bin/env python3
# enrich_responses_from_hume.py
# ETL: participant_session_responses ← participant_session_hume（近傍集約）
from arango import ArangoClient
import math

WINDOW_MS = 1500

def dominant(scores):
    # find emotion with max score
    name, val = None, -1.0
    for k, v in scores.items():
        if v > val:
            name, val = k, v
    return name, val

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--arangodb-url", default="http://arangodb:8529")
    ap.add_argument("--db", default="spirit_in_physics")
    ap.add_argument("--user", default="root")
    ap.add_argument("--password", default="")
    args = ap.parse_args()

    client = ArangoClient(hosts=args.arangodb_url)
    db = client.db(args.db, username=args.user, password=args.password)
    col_r = db.collection("participant_session_responses")

    enriched = 0

    # process by participant for memory efficiency
    participants = set([d["participant_id"] for d in col_r.all()])

    for pid in participants:
        # Get all responses for this participant
        responses = list(col_r.find({"participant_id": pid}))

        for r in responses:
            session_id = r["session_id"]
            r_ts = r["event_ts"]
            t0 = r_ts - WINDOW_MS
            t1 = r_ts + WINDOW_MS

            # Use AQL to find Hume entries in time window
            query = f"""
            FOR h IN participant_session_hume
                FILTER h.participant_id == "{pid}"
                AND h.session_id == "{session_id}"
                AND h.t_ms >= {t0}
                AND h.t_ms <= {t1}
                RETURN h
            """

            window = list(db.aql.execute(query))
            if not window:
                continue

            # weighted average (weight by confidence, fallback to 1)
            agg = {}
            wsum = 0.0
            for h in window:
                w = h.get("confidence", 0.0) or 1.0
                for k, v in h["scores"].items():
                    agg[k] = agg.get(k, 0.0) + w * float(v)
                wsum += w

            if wsum > 0:
                for k in agg.keys():
                    agg[k] /= wsum

            name, val = dominant(agg)
            if name and val > 0:
                col_r.update_match({"_key": r["_key"]}, {"emotion": name, "emotion_confidence": float(val)})
                enriched += 1

    print(f"Enriched {enriched} responses with emotion data")

if __name__ == "__main__":
    import argparse
    main()
