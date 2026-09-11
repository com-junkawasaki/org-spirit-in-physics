(ns spirit.routes.storage
  "Port of /api/storage/object/* and /api/storage/upload in src/index.ts."
  (:require [spirit.db :as db]
            [spirit.http :as http]
            [spirit.util :as util]))

(def ^:private object-prefix "/api/storage/object/")

(defn get-object! [^js env ^js url]
  (let [object-key (js/decodeURIComponent (subs (.-pathname url) (count object-prefix)))
        ^js bucket (.-ARTIFACTS env)]
    (if-not bucket
      (js/Promise.resolve (http/error-response "R2 binding `ARTIFACTS` is not configured." 500))
      (-> (.get bucket object-key)
          (.then (fn [^js object]
                   (if-not object
                     (http/error-response "artifact not found" 404)
                     (js/Response. (.-body object)
                                   #js {:headers #js {"Content-Type"
                                                       (or (some-> (.-httpMetadata object) .-contentType)
                                                           "application/octet-stream")}}))))))))

(defn- record-artifact! [db ^js url object-key content-type participant-id session-index artifact-type file-name]
  (let [public-url (str (.-origin url) object-prefix (js/encodeURIComponent object-key))]
    (-> (db/insert-artifact! db {:id (util/gen-uuid) :participant_id participant-id
                                  :session_index session-index :artifact_type artifact-type
                                  :file_name file-name :content_type content-type
                                  :object_key object-key :public_url public-url
                                  :created_at_ms (js/Date.now)})
        (.then (fn [_] (http/json-response {:publicUrl public-url}))))))

(defn- put-and-record! [db ^js bucket ^js url object-key file-bytes content-type
                         participant-id session-index artifact-type file-name]
  (-> (.put bucket object-key file-bytes #js {:httpMetadata #js {:contentType content-type}})
      (.then (fn [_] (record-artifact! db url object-key content-type
                                        participant-id session-index artifact-type file-name)))))

(defn upload! [db ^js env ^js req ^js url]
  (-> (http/parse-json-map req)
      (.then
       (fn [{:keys [participantId fileName fileDataBase64 contentType artifactType sessionIndex]}]
         (if-not (and (util/blank->nil participantId) (util/blank->nil fileName)
                      (util/blank->nil fileDataBase64) (util/blank->nil artifactType))
           (http/error-response
            "participantId, fileName, fileDataBase64, and artifactType are required" 400)
           (let [^js bucket (.-ARTIFACTS env)
                 session-index (or sessionIndex 0)
                 binary (js/atob fileDataBase64)
                 n (.-length binary)
                 file-bytes (js/Uint8Array. n)
                 content-type (or contentType "application/octet-stream")
                 object-key (str participantId "/session-" session-index "/" artifactType "/"
                                  (js/Date.now) "-" fileName)]
             (dotimes [i n] (aset file-bytes i (.charCodeAt binary i)))
             (put-and-record! db bucket url object-key file-bytes content-type
                               participantId session-index artifactType fileName)))))))
