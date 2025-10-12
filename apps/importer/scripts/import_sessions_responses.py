#!/usr/bin/env python3
# import_sessions_responses.py
# ETL: session_data.json → participants / participant_sessions / participant_session_responses
import argparse, json, os, glob, math, time
from datetime import datetime, timezone
from arango import ArangoClient

def ms_to_iso(ms: int) -> str:
    return datetime.fromtimestamp(ms/1000, tz=timezone.utc).isoformat()

def ensure_db(conn_url: str, db_name: str, username: str|None, password: str|None):
    client = ArangoClient(hosts=conn_url)
    sys_db = client.db("_system", username=username or "root", password=password or "")
    if not sys_db.has_database(db_name):
        sys_db.create_database(db_name)
    return client.db(db_name, username=username or "root", password=password or "")

def ensure_collections(db):
    for name in ["participants", "participant_sessions", "participant_session_responses"]:
        if not db.has_collection(name):
            db.create_collection(name)
    # indexes
    db.collection("participant_sessions").add_hash_index(["participant_id"], unique=False, sparse=False)
    db.collection("participant_session_responses").add_hash_index(["participant_id"], unique=False, sparse=False)
    db.collection("participant_session_responses").add_hash_index(["session_id"], unique=False, sparse=False)
    db.collection("participant_session_responses").add_persistent_index(["event_ts"], unique=False, sparse=False)

def upsert_participant(col, participant_id: str, consent: dict|None, first_ts: int|None):
    doc = {
        "_key": participant_id,
        "created_at": ms_to_iso(first_ts) if first_ts else None,
        "consent": consent or {},
    }
    try:
        result = col.insert(doc, overwrite=True)
        print(f"Inserted participant: {participant_id} -> {result}")
    except Exception as e:
        print(f"Failed to insert participant {participant_id}: {e}")
        print(f"Document: {doc}")

def parse_events_build_sessions_and_responses(session_json: dict):
    participant_id = session_json.get("participantId")
    events = session_json.get("events", [])
    print(f"DEBUG: Processing {len(events)} events for participant {participant_id}")

    sessions = []
    responses = []

    current_session = None
    window_open = False
    last_word = None

    def close_session():
        nonlocal current_session
        if current_session is not None:
            if current_session.get("end_ts") is None:
                current_session["end_ts"] = current_session["last_ts"] or current_session["start_ts"]
            dur = max(0, (current_session["end_ts"] - current_session["start_ts"]))
            current_session["duration_ms"] = dur
            # avg RT
            rts = current_session.get("reaction_times", [])
            current_session["avg_response_time_ms"] = round(sum(rts)/len(rts)) if rts else None
            sessions.append(current_session)
            current_session = None

    for ev in events:
        ts = ev.get("timestamp")
        typ = ev.get("type")
        payload = ev.get("payload") or {}
        if "speech" in typ or "word" in typ or "response" in typ or "session" in typ:
            print(f"DEBUG: Event type={typ}, payload keys={list(payload.keys()) if payload else []}")

        if current_session is not None:
            current_session["last_ts"] = ts

        if typ == "session_started":
            # close previous if any
            close_session()
            current_session = {
                "participant_id": participant_id,
                "session_index": int(payload.get("session", 1)),
                "start_ts": ts,
                "end_ts": None,
                "number_of_words": payload.get("numberOfWords"),
                "total_events": 0,
                "reaction_times": [],
                "last_ts": ts,
            }
            window_open = False
            last_word = None

        elif typ in ("session_ended", "recording_stopped"):
            close_session()
            window_open = False
            last_word = None

        # track words and windows
        if typ == "word_displayed":
            last_word = {
                "word": (payload.get("word") or payload.get("key")),
                "ts": ts,
            }
        elif typ == "response_window_opened":
            window_open = True
        elif typ == "speech_detected":
            print("DEBUG: Entered speech_detected block")
            print("DEBUG: window_open:", window_open)
            print("DEBUG: last_word exists:", last_word is not None)
            print("DEBUG: current_session exists:", current_session is not None)
            # Always create response for speech_detected events
            # Always create response for speech_detected events
            if last_word and current_session is not None:
                print("DEBUG: Condition met, creating response")
                rt = max(0, ts - last_word["ts"])
                # create response (speech_detectedイベントからresponse_wordを取得)
                print(f"DEBUG: Creating response")
                response_word = payload.get("word") or payload.get("key")
                print(f"DEBUG: response_word={response_word}")
                resp = {
                    "participant_id": participant_id,
                    "session_index": current_session["session_index"],
                    "stimulus_word": last_word["word"],
                    "response_word": response_word,
                    "reaction_time_ms": rt,
                    "event_ts": ts,
                }
                responses.append(resp)
                current_session["reaction_times"].append(rt)
            else:
                print(f"DEBUG: Skipping response creation")
        elif typ == "response_window_closed":
            window_open = False

        if current_session is not None:
            current_session["total_events"] += 1

    # finalize
    close_session()
    return sessions, responses

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", required=True, help="path to dataset/participants")
    ap.add_argument("--arangodb-url", default="http://arangodb:8529")
    ap.add_argument("--db", default="spirit_in_physics")
    ap.add_argument("--user", default="root")
    ap.add_argument("--password", default="")
    args = ap.parse_args()

    db = ensure_db(args.arangodb_url, args.db, args.user, args.password)
    print(f"Connected to ArangoDB at {args.arangodb_url}, database: {args.db}")

    # Test connection
    try:
        result = db.aql.execute("RETURN 'test'")
        test_result = list(result)[0]
        print(f"ArangoDB connection test successful: {test_result}")
    except Exception as e:
        print(f"ArangoDB connection test failed: {e}")
        exit(1)

    ensure_collections(db)
    print("Collections ensured")
    col_participants = db.collection("participants")
    col_sessions = db.collection("participant_sessions")
    col_responses = db.collection("participant_session_responses")

    participant_dirs = [p for p in glob.glob(os.path.join(args.dataset, "*")) if os.path.isdir(p)]
    print(f"Found {len(participant_dirs)} participant directories")
    imported_p = imported_s = imported_r = 0

    for pdir in participant_dirs:
        pid = os.path.basename(pdir)
        print(f"Processing participant: {pid}")
        consent_path = os.path.join(pdir, "consent.json")
        session_path = os.path.join(pdir, "session_data.json")

        consent = None
        if os.path.exists(consent_path):
            try:
                consent = json.load(open(consent_path, "r"))
            except Exception:
                consent = None

        if not os.path.exists(session_path):
            continue

        try:
            session_json = json.load(open(session_path, "r"))
        except Exception as e:
            print(f"[WARN] skip {pid}: invalid session_data.json ({e})")
            continue

        events = session_json.get("events", [])
        first_ts = events[0]["timestamp"] if events else None

        # upsert participant
        print(f"About to upsert participant: {pid}")
        upsert_participant(col_participants, pid, consent, first_ts)
        imported_p += 1
        print(f"Successfully upserted participant: {pid}, total imported: {imported_p}")

        # build sessions & responses
        sessions, responses = parse_events_build_sessions_and_responses(session_json)
        print(f"Generated {len(sessions)} sessions and {len(responses)} responses for {pid}")

        # write sessions (derive session_id as '<pid>-<index>')
        for s in sessions:
            sdoc = {
                "_key": f"{s['participant_id']}-{s['session_index']}",
                "participant_id": s["participant_id"],
                "session_index": s["session_index"],
                "start_ts": s["start_ts"],
                "end_ts": s.get("end_ts"),
                "duration_ms": s.get("duration_ms"),
                "number_of_words": s.get("number_of_words"),
                "total_events": s.get("total_events"),
                "avg_response_time_ms": s.get("avg_response_time_ms"),
            }
            col_sessions.insert(sdoc, overwrite=True)
            imported_s += 1

        # write responses
        for r in responses:
            rdoc = {
                # let arango assign _key
                "participant_id": r["participant_id"],
                "session_id": f"{r['participant_id']}-{r['session_index']}",
                "stimulus_word": r.get("stimulus_word"),
                "response_word": r.get("response_word"),
                "reaction_time_ms": r.get("reaction_time_ms"),
                "event_ts": r.get("event_ts"),
                # placeholders for future enrichment from Hume/language.csv:
                "emotion": None,
                "emotion_confidence": None,
            }
            try:
                result = col_responses.insert(rdoc)
                imported_r += 1
                if imported_r <= 3:  # Debug first few insertions
                    print(f"Inserted response: {rdoc['participant_id']} - {rdoc['response_word']}")
            except Exception as e:
                print(f"Failed to insert response: {e}")
                print(f"Response data: {rdoc}")

        # Debug: check if data was actually inserted
        if len(responses) > 0:
            count_after = len(col_responses.all())
            print(f"Debug: responses in collection after insert: {count_after}")
            # Also check by querying
            try:
                sample = col_responses.random()
                if sample:
                    print(f"Debug: sample document found: {sample['participant_id']} - {sample.get('response_word')}")
                else:
                    print("Debug: no sample document found")
            except Exception as e:
                print(f"Debug: error getting sample: {e}")

        print(f"[OK] {pid}: sessions={len(sessions)} responses={len(responses)}")

    print(f"Imported participants={imported_p}, sessions={imported_s}, responses={imported_r}")

    # Verify data was inserted
    p_count = len(col_participants.all())
    s_count = len(col_sessions.all())
    r_count = len(col_responses.all())
    print(f"Verification: participants={p_count}, sessions={s_count}, responses={r_count}")

    # Check sample data
    if r_count > 0:
        sample = col_responses.random()
        print(f"Sample response: participant_id={sample.get('participant_id')}, response_word={sample.get('response_word')}")
    else:
        print("No responses found in collection")

if __name__ == "__main__":
    main()
