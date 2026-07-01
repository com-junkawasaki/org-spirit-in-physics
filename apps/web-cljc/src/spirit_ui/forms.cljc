(ns spirit-ui.forms
  "Form input primitives built on spirit-ui.ir/el — wires :ui/on {:input [...]}
  with the right :target/* extractor (see spirit-ui.dom) for each input
  type, so callers just supply a partial action vector as `on-change` (e.g.
  `[:set-field :email]`) and get the extracted value appended automatically."
  (:require [spirit-ui.ir :as ir]))

(defn text-input
  [{:keys [value on-change placeholder type name id disabled]
    :or {type "text"}}]
  (ir/el :input (cond-> {:type type :value (or value "")
                          :ui/on {:input (conj on-change :target/value)}}
                  placeholder (assoc :placeholder placeholder)
                  name (assoc :name name)
                  id (assoc :id id)
                  disabled (assoc :disabled true))))

(defn textarea
  [{:keys [value on-change placeholder name id]}]
  (ir/el :textarea (cond-> {:value (or value "")
                             :ui/on {:input (conj on-change :target/value)}}
                      placeholder (assoc :placeholder placeholder)
                      name (assoc :name name)
                      id (assoc :id id))
         (or value "")))

(defn checkbox
  [{:keys [checked on-change label id]}]
  (ir/el :label {:class "spirit-checkbox"}
         (ir/el :input {:type "checkbox" :checked (boolean checked) :id id
                        :ui/on {:change (conj on-change :target/checked)}})
         label))

(defn select
  "options: a seq of [value label] pairs."
  [{:keys [value on-change options id]}]
  (ir/el :select {:value (or value "") :id id
                  :ui/on {:change (conj on-change :target/value)}}
         (for [[v label] options]
           (ir/el :option {:key v :value v} label))))

(defn button
  [{:keys [on-click label type disabled]
    :or {type "button"}}
   & children]
  (ir/el :button (cond-> {:type type :ui/on {:click on-click}}
                   disabled (assoc :disabled true))
         (or label children)))

(defn submit-button [{:keys [label disabled]}]
  (ir/el :button (cond-> {:type "submit"} disabled (assoc :disabled true)) label))

(defn form
  "on-submit: an action vector — always wrapped in [:prevent-default! ...]
  since a real form submit must never trigger the browser's native
  full-page-reload POST."
  [{:keys [on-submit class]} & children]
  (apply ir/el :form (cond-> {:ui/on {:submit [:prevent-default! on-submit]}}
                       class (assoc :class class))
         children))
