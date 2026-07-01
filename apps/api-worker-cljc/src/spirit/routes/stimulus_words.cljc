(ns spirit.routes.stimulus-words
  (:require [spirit.http :as http]
            [spirit.stimulus-words :as sw]))

(defn list-words []
  (js/Promise.resolve (http/json-response {:words sw/stimulus-words})))
