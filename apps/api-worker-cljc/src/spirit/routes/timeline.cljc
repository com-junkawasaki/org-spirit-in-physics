(ns spirit.routes.timeline
  "Port of src/graph/timeline.ts. The StateGraph is replaced by a plain
  sequential Promise pipeline (see spirit.graph-log); the pure analysis
  functions (buildAnalysis/buildWordStatistics/buildWordAggregates/
  buildEmotionVectors) are ported 1:1. Known parity caveat: `duplicates` /
  `ghostPatterns` / `densityRegions` are grouped via `group-by` (hash-map
  iteration order), so their array ORDER may differ from the TS `Map`
  insertion-order equivalents even though the VALUES are identical — compare
  parity as sets, not as ordered JSON, for these three fields."
  (:require [clojure.string :as str]
            [spirit.db :as db]
            [spirit.graph-log :as glog]
            [spirit.http :as http]
            [spirit.stimulus-words :as sw]
            [spirit.util :as util]))

;; ---------- pure analysis functions (1:1 port of the TS buildX functions) ----------

(defn- stimulus-word-label [stimulus-word-id]
  (let [id (js/Number stimulus-word-id)
        word (first (filter #(= (:id %) id) sw/stimulus-words))]
    (or (:japanese word) (str (or stimulus-word-id "")))))

(defn build-timeline-points [events requested-session-index]
  (into []
        (keep (fn [event]
                (when-let [payload (util/parse-json-safe (:payload_json event))]
                  (let [session-index (util/session-index-of payload)]
                    (when (and (or (nil? requested-session-index) (= session-index requested-session-index))
                               (= (:event_type event) "word-response"))
                      (let [reaction-time-ms (js/Number (or (:reactionTimeMs payload) 0))
                            reaction-value (if (pos? reaction-time-ms)
                                             (js/Number (.toFixed (/ 1 reaction-time-ms) 6))
                                             0)
                            word (-> (or (:responseWord payload) (stimulus-word-label (:stimulusWordId payload)))
                                     str .trim)]
                        {:time (.toISOString (js/Date. (:created_at_ms event)))
                         :participantId (:participant_id event)
                         :sessionId (str (:participant_id event) ":" session-index)
                         :word word
                         :reactionTime (/ reaction-time-ms 1000)
                         :hasResponse (js/Boolean (:responseWord payload))
                         :emotions []
                         :physiological []
                         :reactionValue reaction-value
                         :eventType (:event_type event)}))))))
        events))

(defn- ts [point] (.getTime (js/Date. (:time point))))

(defn- gap-areas [sorted-points]
  (let [n (count sorted-points)]
    (loop [i 1 acc []]
      (if (>= i n)
        acc
        (let [prev (nth sorted-points (dec i)) cur (nth sorted-points i)
              diff (- (ts cur) (ts prev))]
          (recur (inc i)
                 (if (> diff 15000)
                   (conj acc {:id (str "gap-" i) :start (:time prev) :end (:time cur) :durationMs diff})
                   acc)))))))

(defn- duplicates-and-ghosts [points]
  (let [by-word (group-by :word (remove #(str/blank? (:word %)) points))
        total (max (count points) 1)]
    {:duplicates (into [] (keep (fn [[word entries]]
                                   (when (> (count entries) 1)
                                     {:id (str "dup-" word) :word word :count (count entries)})))
                        by-word)
     :ghost-patterns (into [] (keep (fn [[word entries]]
                                       (when (>= (count entries) 3)
                                         {:id (str "ghost-" word) :word word
                                          :intensity (js/Number (.toFixed (/ (count entries) total) 4))})))
                            by-word)}))

(defn- density-regions+overall [points]
  (let [buckets (group-by (fn [p] (* 30000 (js/Math.floor (/ (ts p) 30000)))) points)
        regions (into [] (map (fn [[bucket entries]]
                                 {:id (str "density-" bucket)
                                  :start (.toISOString (js/Date. bucket))
                                  :end (.toISOString (js/Date. (+ bucket 30000)))
                                  :pointCount (count entries)
                                  :isOvercrowded (>= (count entries) 5)}))
                       buckets)]
    {:density-regions regions
     :overall-density (/ (count points) (max (count buckets) 1))}))

(defn build-analysis [points]
  (let [sorted (vec (sort-by ts points))
        {:keys [duplicates ghost-patterns]} (duplicates-and-ghosts points)
        {:keys [density-regions overall-density]} (density-regions+overall points)]
    {:gapAreas (gap-areas sorted)
     :densityRegions density-regions
     :duplicates duplicates
     :ghostPatterns ghost-patterns
     :overallDensity overall-density}))

(defn- mean [xs] (/ (reduce + 0.0 xs) (count xs)))
(defn- variance [xs avg] (/ (reduce + 0.0 (map (fn [x] (js/Math.pow (- x avg) 2)) xs)) (count xs)))

(defn build-word-statistics [points]
  (let [groups (group-by (fn [p] (str (:sessionId p) ":" (:word p))) points)]
    (into []
          (map (fn [[_ entries]]
                 (let [sample (first entries)
                       reaction-times (mapv :reactionTime entries)
                       reaction-values (mapv :reactionValue entries)
                       avg-rt (mean reaction-times)
                       avg-rv (mean reaction-values)
                       var-rt (variance reaction-times avg-rt)
                       var-rv (variance reaction-values avg-rv)]
                   {:participantId (:participantId sample) :sessionId (:sessionId sample) :word (:word sample)
                    :count (count entries)
                    :avgReactionTime avg-rt :stdReactionTime (js/Math.sqrt var-rt) :varReactionTime var-rt
                    :avgReactionValue avg-rv :stdReactionValue (js/Math.sqrt var-rv) :varReactionValue var-rv
                    :avgPhysiological 0 :stdPhysiological 0 :varPhysiological 0
                    :speedIndex (if (pos? avg-rt) (js/Number (.toFixed (/ 1 avg-rt) 6)) 0)
                    :physSeries [] :rtSeries reaction-times})))
          groups)))

(defn build-word-aggregates [points]
  (mapv (fn [stat]
          {:participantId (:participantId stat) :sessionId (:sessionId stat) :word (:word stat) :count (:count stat)
           :avgReactionValue (:avgReactionValue stat) :sumReactionValue (* (:avgReactionValue stat) (:count stat))
           :avgReactionTime (:avgReactionTime stat) :sumReactionTime (* (:avgReactionTime stat) (:count stat))
           :avgPhysiological 0 :sumPhysAbs 0 :physSeries [] :rtSeries (:rtSeries stat)
           :rvSeries (vec (repeat (:count stat) (:avgReactionValue stat)))})
        (build-word-statistics points)))

(defn build-emotion-vectors [points]
  (let [groups (group-by (fn [p] (str (:sessionId p) ":" (:word p))) points)]
    (into []
          (map (fn [[_ entries]]
                 (let [sample (first entries)
                       intensity (reduce + 0.0 (map :reactionValue entries))]
                   {:participantId (:participantId sample) :sessionId (:sessionId sample) :word (:word sample)
                    :joySum intensity :sadnessSum 0 :angerSum 0 :fearSum 0
                    :surpriseSum (/ intensity (max (count entries) 1))
                    :disgustSum 0 :calmSum 0 :focusSum intensity :excitementSum intensity
                    :confusionSum 0 :emotionEntryCount 0})))
          groups)))

;; ---------- pipeline (was a StateGraph; see spirit.graph-log) ----------

(defn- snapshot-session-id [participant-id session-index]
  (if (nil? session-index) (str participant-id ":all") (str participant-id ":" session-index)))

(defn- persist-snapshot! [db participant-id session-id aggregate-type payload points now-ms]
  (let [times (into [] (comp (map (fn [p] (.getTime (js/Date. (:time p))))) (filter js/Number.isFinite)) points)]
    (db/upsert-aggregate-snapshot! db
      {:id (util/gen-uuid) :participant_id participant-id :session_id session-id :aggregate_type aggregate-type
       :payload_json (js/JSON.stringify (clj->js payload))
       :first_ts_ms (when (seq times) (apply min times))
       :last_ts_ms (when (seq times) (apply max times))
       :updated_at_ms now-ms})))

(defn- load-events [db {:keys [run-id participant-id] :as state}]
  (-> (db/list-assessment-events db participant-id)
      (.then (fn [events]
               (let [output {:events events :status "events-loaded"}]
                 (-> (glog/record-node-event! db run-id 1 "loadAssessmentEvents"
                                               {:participantId participant-id} {:count (count events)})
                     (.then (fn [_] (glog/record-checkpoint! db run-id 1 (merge state output))))
                     (.then (constantly (merge state output)))))))))

(defn- project-timeline [db {:keys [run-id events session-index] :as state}]
  (let [points (build-timeline-points events session-index)
        output {:points points :status "timeline-projected"}]
    (-> (glog/record-node-event! db run-id 2 "projectTimeline"
                                  {:eventCount (count events)} {:pointCount (count points)})
        (.then (fn [_] (glog/record-checkpoint! db run-id 2 (merge state output))))
        (.then (constantly (merge state output))))))

(defn- analyze-timeline [db {:keys [run-id points] :as state}]
  (let [analysis (build-analysis points)
        word-statistics (build-word-statistics points)
        word-aggregates (build-word-aggregates points)
        emotion-vectors (build-emotion-vectors points)
        output {:analysis analysis :word-statistics word-statistics :word-aggregates word-aggregates
                :emotion-vectors emotion-vectors :status "timeline-analyzed"}]
    (-> (glog/record-node-event! db run-id 3 "analyzeTimeline"
                                  {:pointCount (count points)}
                                  {:wordStatisticsCount (count word-statistics)
                                   :wordAggregatesCount (count word-aggregates)
                                   :emotionVectorsCount (count emotion-vectors)})
        (.then (fn [_] (glog/record-checkpoint! db run-id 3 (merge state output))))
        (.then (constantly (merge state output))))))

(defn- persist-snapshots [db {:keys [run-id participant-id session-id points analysis word-statistics
                                      word-aggregates emotion-vectors now-ms] :as state}]
  (-> (js/Promise.all
       #js [(persist-snapshot! db participant-id session-id "integrated" {:points points :analysis analysis} points now-ms)
            (persist-snapshot! db participant-id session-id "analysis" analysis points now-ms)
            (persist-snapshot! db participant-id session-id "word_statistics" word-statistics points now-ms)
            (persist-snapshot! db participant-id session-id "word_aggregates" word-aggregates points now-ms)
            (persist-snapshot! db participant-id session-id "emotion_vectors" emotion-vectors points now-ms)])
      (.then (fn [_]
               (let [output {:status "snapshots-persisted"}]
                 (-> (glog/record-node-event! db run-id 4 "persistSnapshot" {:sessionId session-id} {:snapshotCount 5})
                     (.then (fn [_] (glog/record-checkpoint! db run-id 4 (merge state output))))
                     (.then (constantly (merge state output)))))))))

(defn run-timeline-graph!
  "-> Promise<{:run-id :participant-id :session-id :points :analysis :word-statistics :word-aggregates :emotion-vectors}>."
  [db participant-id session-index]
  (let [run-id-p (glog/start-run! db {:graph-name "timeline" :participant-id participant-id
                                       :session-id (snapshot-session-id participant-id session-index)
                                       :input {:participantId participant-id :sessionIndex session-index}})
        now-ms (js/Date.now)
        session-id (snapshot-session-id participant-id session-index)]
    (-> run-id-p
        (.then (fn [run-id]
                 (-> (load-events db {:run-id run-id :participant-id participant-id :session-index session-index
                                       :session-id session-id :now-ms now-ms :events [] :points []
                                       :analysis (build-analysis []) :word-statistics [] :word-aggregates []
                                       :emotion-vectors [] :status "received"})
                     (.then (fn [state] (project-timeline db state)))
                     (.then (fn [state] (analyze-timeline db state)))
                     (.then (fn [state] (persist-snapshots db state)))
                     (.then (fn [{:keys [points analysis word-statistics word-aggregates emotion-vectors]}]
                              (let [output {:run-id run-id :participant-id participant-id :session-id session-id
                                            :points points :analysis analysis :word-statistics word-statistics
                                            :word-aggregates word-aggregates :emotion-vectors emotion-vectors}]
                                (-> (glog/complete-run! db run-id
                                      {:participantId participant-id :sessionId session-id :pointCount (count points)})
                                    (.then (constantly output))))))
                     (.catch (fn [^js err]
                               (-> (glog/fail-run! db run-id (.-message err))
                                   (.then (fn [_] (throw err))))))))))))

;; ---------- routes ----------

(defn- run-timeline! [db ^js url response-fn]
  (let [participant-id (http/query-param url "participantId")]
    (if-not participant-id
      (js/Promise.resolve (http/error-response "participantId is required" 400))
      (let [session-index (util/parse-session-index (http/query-param url "sessionId"))]
        (-> (run-timeline-graph! db participant-id session-index)
            (.then response-fn))))))

(defn integrated! [db ^js url]
  (run-timeline! db url (fn [{:keys [points analysis]}] (http/json-response {:points points :analysis analysis}))))

(defn analysis! [db ^js url]
  (run-timeline! db url (fn [{:keys [analysis]}] (http/json-response analysis))))

(defn word-statistics! [db ^js url]
  (run-timeline! db url (fn [{:keys [word-statistics]}] (http/json-response {:statistics word-statistics}))))

(defn word-aggregates! [db ^js url]
  (run-timeline! db url (fn [{:keys [word-aggregates]}] (http/json-response {:aggregates word-aggregates}))))

(defn emotion-vectors! [db ^js url]
  (run-timeline! db url (fn [{:keys [emotion-vectors]}] (http/json-response {:vectors emotion-vectors}))))
