(ns spirit.routes.health
  (:require [spirit.http :as http]))

(defn health [^js env]
  (js/Promise.resolve
   (http/json-response {:ok true :runtime "cloudflare-worker"
                         :mode (or (.-API_MODE env) "worker-partial")
                         :date "2026-04-12"})))

(defn capabilities [^js env]
  (js/Promise.resolve
   (http/json-response {:ok true :runtime "cloudflare-worker"
                         :available ["health" "capabilities" "auth" "participants" "stimulus-words"
                                     "assessment-events" "assessment-graph" "sessions" "storage"
                                     "timeline" "timeline-graph"]
                         :pending ["preferences" "imports"]
                         :mode (or (.-API_MODE env) "worker-partial")})))
