(ns spirit.db-test
  "Exercises spirit.db against a minimal in-memory fake D1Database (prepare/
  bind/all/first/run), focused on the row->map shallow-conversion behavior —
  a real bug was caught here: a naive recursive js->clj over a row containing
  a BLOB (Uint8Array) column shreds it into an index->byte map instead of
  leaving it as a binary value."
  (:require [cljs.test :refer [deftest is async]]
            [spirit.db :as db]))

(defn- fake-statement
  "rows: vector of plain JS objects (already snake_case-keyed, as D1 would
  return them). Ignores SQL/bind args entirely — good enough to exercise the
  ^js interop plumbing in spirit.db, not real query semantics."
  [rows]
  (let [all-fn (fn [] (js/Promise.resolve #js {:results (clj->js rows)}))
        first-fn (fn [] (js/Promise.resolve (if (seq rows) (first rows) nil)))
        run-fn (fn [] (js/Promise.resolve #js {:success true}))]
    #js {:all all-fn :first first-fn :run run-fn}))

(defn- fake-d1 [rows]
  (let [bind-fn (fn [& _args] (fake-statement rows))
        prepare-fn (fn [_sql] #js {:bind bind-fn})]
    #js {:prepare prepare-fn}))

(deftest test-query-all-basic
  (async done
    (let [d1 (fake-d1 [#js {:id "1" :participant_id "p1" :created_at_ms 100}
                       #js {:id "2" :participant_id "p2" :created_at_ms 200}])]
      (-> (db/query-all d1 "SELECT * FROM sessions" [])
          (.then (fn [rows]
                   (is (= 2 (count rows)))
                   (is (= "p1" (:participant_id (first rows))))
                   (is (= 200 (:created_at_ms (second rows))))
                   (done)))))))

(deftest test-query-first-preserves-blob
  (async done
    (let [public-key (js/Uint8Array. #js [10 20 30 255])
          d1 (fake-d1 [#js {:id "cred-1" :user_id "u1" :public_key public-key :counter 0}])]
      (-> (db/query-first d1 "SELECT * FROM webauthn_credentials" [])
          (.then (fn [row]
                   (is (= "cred-1" (:id row)))
                   ;; the critical assertion: public_key must survive as the SAME
                   ;; Uint8Array, not get shredded into a {0 10, 1 20, ...} map.
                   (is (instance? js/Uint8Array (:public_key row)))
                   (is (= (vec (js/Array.from public-key)) (vec (js/Array.from (:public_key row)))))
                   (done)))))))

(deftest test-query-first-nil-on-empty
  (async done
    (let [d1 (fake-d1 [])]
      (-> (db/query-first d1 "SELECT * FROM users WHERE id = ?" ["missing"])
          (.then (fn [row]
                   (is (nil? row))
                   (done)))))))
