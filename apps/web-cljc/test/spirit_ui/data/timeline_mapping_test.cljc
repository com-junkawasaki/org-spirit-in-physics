(ns spirit-ui.data.timeline-mapping-test
  (:require [cljs.test :refer [deftest is testing]]
            [spirit-ui.data.timeline-mapping :as tl]))

(deftest test-point-field-mapping
  (let [raw {:time "2026-07-01T12:00:00.000Z" :word "hello" :reactionTime 0.5
             :hasResponse true :emotions [] :physiological [] :reactionValue 1.5
             :sessionId "p1:0" :eventType "word-response"}
        p (tl/->point raw)]
    (is (= (.getTime (js/Date. "2026-07-01T12:00:00.000Z")) (:timestamp p)))
    (is (= "hello" (:word p)))
    (is (= 500 (:reaction-time p)) "backend seconds -> chart ms")
    (is (= true (:has-response p)))
    (is (= 1.5 (:reaction-value p)))
    (is (= "p1:0" (:session-id p)))
    (is (= "word-response" (:event-type p)))))

(deftest test-point-missing-fields-default-safely
  (let [p (tl/->point {:time "2026-07-01T12:00:00.000Z"})]
    (is (= "" (:word p)))
    (is (= 0 (:reaction-time p)))
    (is (= false (:has-response p)))
    (is (= [] (:emotions p)))
    (is (= [] (:physiological p)))
    (is (= 0 (:reaction-value p)))
    (is (= "" (:event-type p)))))

(deftest test-emotions-and-physiological-key-renaming
  (let [p (tl/->point {:time "2026-07-01T12:00:00.000Z"
                        :emotions [{:name "Joy" :score 0.8}]
                        :physiological [{:value 1.2 :measurementType "Ch3"}]})]
    (is (= [{:name "Joy" :score 0.8}] (:emotions p)))
    (is (= [{:value 1.2 :measurement-type "Ch3"}] (:physiological p)))))

(deftest test-points-filters-out-unparseable-timestamps
  (let [points (tl/->points [{:time "2026-07-01T12:00:00.000Z" :word "a"}
                              {:time "not-a-date" :word "b"}])]
    (is (= 1 (count points)))
    (is (= "a" (:word (first points))))))

(deftest test-analysis-field-mapping-and-defaults
  (is (= {:gap-areas [{:id "gap-1"}] :density-regions [] :duplicates [] :ghost-patterns [] :overall-density 0}
         (tl/->analysis {:gapAreas [{:id "gap-1"}]})))
  (is (= {:gap-areas [] :density-regions [] :duplicates [] :ghost-patterns [] :overall-density 0}
         (tl/->analysis {}))))

(deftest test-extent-time-range
  (is (nil? (tl/extent-time-range [])))
  (is (= {:start 100 :end 300}
         (tl/extent-time-range [{:timestamp 200} {:timestamp 100} {:timestamp 300}]))))

(deftest test-narrow-to-latest-session-single-session-unfiltered
  (let [points [{:session-id "p1:0" :word "a" :timestamp 100}
                {:session-id "p1:0" :word "b" :timestamp 200}]]
    (is (= points (tl/narrow-to-latest-session points)))))

(deftest test-narrow-to-latest-session-picks-most-recently-active-session
  ;; session 0 (Jan) and session 1 (June) both have word data — original
  ;; comment: merging them creates 'massive time gaps'; only session 1
  ;; (the more recently active one) should survive.
  (let [jan {:session-id "p1:0" :word "old-word" :timestamp 1000}
        june-a {:session-id "p1:1" :word "new-word-a" :timestamp 9000}
        june-b {:session-id "p1:1" :word "" :timestamp 9500} ;; blank word still belongs to session 1
        points [jan june-a june-b]]
    (is (= [june-a june-b] (tl/narrow-to-latest-session points)))))

(deftest test-narrow-to-latest-session-ignores-sessions-with-no-word-data
  ;; only ONE session has actual word data (blank-:word points from a
  ;; second session don't count toward "sessions with words"), so no
  ;; narrowing should occur even though 2 distinct session-ids are present.
  (let [points [{:session-id "p1:0" :word "real" :timestamp 100}
                {:session-id "p1:1" :word "" :timestamp 9999}]]
    (is (= points (tl/narrow-to-latest-session points)))))

(deftest test-narrow-to-latest-session-picks-by-latest-point-in-session-not-just-word-points
  ;; the "latest" comparison uses the session's overall max timestamp
  ;; (including non-word points), matching the original's
  ;; `points.filter(p => p.sessionId === a)` (no word filter in that inner
  ;; filter) — not just the max among that session's word-bearing points.
  (let [s0-word {:session-id "s0" :word "w" :timestamp 100}
        s0-late-blank {:session-id "s0" :word "" :timestamp 5000}
        s1-word {:session-id "s1" :word "w2" :timestamp 200}
        points [s0-word s0-late-blank s1-word]]
    (is (= [s0-word s0-late-blank] (tl/narrow-to-latest-session points))
        "s0's overall latest point (5000) beats s1's only point (200), even though s0's word-bearing point is earlier")))
