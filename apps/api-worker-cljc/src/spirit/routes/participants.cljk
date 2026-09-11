(ns spirit.routes.participants
  "Port of the /api/participants* routes in src/index.ts."
  (:require [spirit.db :as db]
            [spirit.http :as http]
            [spirit.util :as util]))

(defn- map-participant [row]
  {:id (:id row)
   :email (or (:email row) "")
   :ageGroup (or (:age_group row) "")
   :gender (or (:gender row) "")
   :ethnicity (or (:ethnicity row) "")
   :incomeRange (or (:income_range row) "")
   :medicalHistory (if (:medical_history_json row)
                      (js->clj (js/JSON.parse (:medical_history_json row)))
                      [])
   :isPublic (not= (:is_public row) 0)
   :createdAt (:created_at_ms row)
   :updatedAt (:updated_at_ms row)})

(defn list! [db]
  (-> (db/list-participants db)
      (.then (fn [rows] (http/json-response {:participants (mapv map-participant rows)})))))

(defn by-email! [db ^js url]
  (let [email (util/blank->nil (http/query-param url "email"))]
    (if-not email
      (js/Promise.resolve (http/error-response "email is required" 400))
      (-> (db/find-participant-by-email db email)
          (.then (fn [row] (http/json-response {:participant (when row (map-participant row))})))))))

(defn create-or-update! [db ^js req]
  (-> (http/parse-json-map req)
      (.then
       (fn [payload]
         (let [now (js/Date.now)
               medical-history (if (vector? (:medicalHistory payload)) (:medicalHistory payload) [])
               id (str (or (:id payload) ""))
               values {:id id
                       :email (str (or (:email payload) ""))
                       :age_group (str (or (:ageGroup payload) ""))
                       :gender (str (or (:gender payload) ""))
                       :ethnicity (str (or (:ethnicity payload) ""))
                       :income_range (str (or (:incomeRange payload) ""))
                       :medical_history_json (js/JSON.stringify (clj->js medical-history))
                       :is_public (if (false? (:isPublic payload)) 0 1)
                       :created_at_ms now
                       :updated_at_ms now}]
           (-> (db/upsert-participant! db values)
               (.then (fn [_] (db/find-participant-by-id db id)))
               (.then (fn [row] (http/json-response {:participant (when row (map-participant row))})))))))))
