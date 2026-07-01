(ns spirit-ui.data.timeline-mapping-test
  (:require [cljs.test :refer [deftest is testing]]
            [spirit-ui.data.timeline-mapping :as tl]))

(deftest test-point-field-mapping
  (let [raw {:time "2026-07-01T12:00:00.000Z" :word "hello" :reactionTime 0.5
             :hasResponse true :emotions [] :physiological [] :reactionValue 1.5 :eventType "word-response"}
        p (tl/->point raw)]
    (is (= (.getTime (js/Date. "2026-07-01T12:00:00.000Z")) (:timestamp p)))
    (is (= "hello" (:word p)))
    (is (= 500 (:reaction-time p)) "backend seconds -> chart ms")
    (is (= true (:has-response p)))
    (is (= 1.5 (:reaction-value p)))
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
