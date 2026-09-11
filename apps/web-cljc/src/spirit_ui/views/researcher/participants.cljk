(ns spirit-ui.views.researcher.participants
  "Port of apps/researcher/src/routes/participants/+page.svelte +
  ParticipantList.svelte. Drops the decorative (unwired-in-original) CSV
  export / edit / delete buttons; keeps live GET /api/participants + search
  + link-through to the detail page."
  (:require [clojure.string :as str]
            [spirit-ui.forms :as forms]
            [spirit-ui.ir :as ir]))

(defn- matches-search? [q p]
  (or (str/blank? q)
      (str/includes? (str/lower-case (or (:id p) "")) (str/lower-case q))
      (str/includes? (str/lower-case (or (:gender p) "")) (str/lower-case q))))

(defn- row [p]
  (ir/el :tr {:key (:id p)}
         ;; "Status" mirrors the original ParticipantList.svelte's static
         ;; participation badge (participants have no distinct status field,
         ;; unlike sessions) — NOT the same value as the Visibility column.
         (ir/el :td {} "active")
         (ir/el :td {}
                (ir/el :a {:href (str "/participants/" (:id p))
                           :ui/on {:click [:prevent-default! [:navigate (str "/participants/" (:id p))]]}}
                       (:id p)))
         (ir/el :td {} (or (:ageGroup p) "-"))
         (ir/el :td {} (or (:gender p) "-"))
         (ir/el :td {} (if (:isPublic p) "public" "private"))
         (ir/el :td {} (str (:createdAt p)))))

(defn view [state]
  (let [participants (get-in state [:data :participants] [])
        loading? (get-in state [:data :participants-loading?])
        q (get-in state [:form :participant-search] "")
        filtered (filterv (partial matches-search? q) participants)]
    (ir/el :article {:class "participants-page"}
           (ir/el :h1 {} "Participants")
           (forms/text-input {:value q :placeholder "Search by id or gender..."
                               :on-change [:set-field :participant-search]})
           (cond
             loading? (ir/el :p {} "Loading...")
             (empty? filtered) (ir/el :p {} "No participants found.")
             :else
             (ir/el :table {}
                    (ir/el :thead {}
                           (ir/el :tr {}
                                  (ir/el :th {} "Status") (ir/el :th {} "ID") (ir/el :th {} "Age")
                                  (ir/el :th {} "Gender") (ir/el :th {} "Visibility") (ir/el :th {} "Created")))
                    (ir/el :tbody {} (mapv row filtered)))))))
