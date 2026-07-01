(ns spirit-ui.views.web.consent
  "Simplified port of apps/web/src/lib/components/ConsentForm.svelte (shared
  by experiment/consent and participant/consent). The original is a 4-step
  wizard with an illness-code autosuggest+chips UI; this Phase 2 slice
  collapses it to a single-page form with the same fields, to prove
  forms.cljc + the real POST /api/participants round-trip against
  api-worker-cljc — the multi-step wizard UX and autosuggest are a follow-up
  visual-parity pass, not a data-shape change (illness-codes data itself is
  already ported, see spirit-ui.data.illness-codes)."
  (:require [spirit-ui.api-client :as api]
            [spirit-ui.data.illness-codes :as illness]
            [spirit-ui.forms :as forms]
            [spirit-ui.ir :as ir]))

(def ^:private age-groups ["18-24" "25-34" "35-44" "45-54" "55-64" "65+"])
(def ^:private genders [["male" "Male"] ["female" "Female"] ["non-binary" "Non-binary"]
                         ["prefer-not-to-say" "Prefer not to say"]])
(def ^:private ethnicities [["" "-- select --"] ["asian" "Asian"] ["black" "Black"]
                             ["hispanic" "Hispanic"] ["native" "Native"] ["pacific" "Pacific Islander"]
                             ["white" "White"] ["multiple" "Multiple"] ["other" "Other"]
                             ["prefer-not-to-say" "Prefer not to say"]])
(def ^:private income-ranges [["" "-- select --"] ["under-25k" "Under $25k"] ["25k-50k" "$25k-$50k"]
                               ["50k-75k" "$50k-$75k"] ["75k-100k" "$75k-$100k"]
                               ["100k-150k" "$100k-$150k"] ["over-150k" "Over $150k"]
                               ["prefer-not-to-say" "Prefer not to say"]])
(def ^:private medical-history-options
  (into [["" "None"]] (map (fn [c] [(:code c) (str (:name-en c) " (" (:code c) ")")])) illness/illness-codes))

(def ^:private agreement-fields
  [[:understand "I understand the purpose and procedures of this study."]
   [:voluntary "My participation is voluntary."]
   [:withdraw "I may withdraw at any time without penalty."]
   [:recording "I consent to audio/video recording during sessions."]])

(defn- agreements-complete? [form]
  (every? #(get-in form [:agreements (first %)]) agreement-fields))

(defn- demographics-complete? [form]
  (and (seq (get-in form [:demographics :age-group]))
       (seq (get-in form [:demographics :gender]))))

(defn- consent-payload [{:keys [form user]}]
  (let [d (:demographics form)]
    {:id (or (:id form) (:id user) (str (random-uuid)))
     :email (or (:email user) (:email form))
     :ageGroup (:age-group d)
     :gender (:gender d)
     :ethnicity (:ethnicity d)
     :incomeRange (:income-range d)
     :medicalHistory (if (seq (:medical-history d)) [(:medical-history d)] [])
     :isPublic true}))

(defn- submit-consent! [state dispatch!]
  (dispatch! [:set-field :submitting? true])
  (-> (api/upsert-participant! (consent-payload state))
      (.then (fn [{:keys [body]}] (dispatch! [:set-field :submitted (:participant body)])))
      (.catch (fn [^js err] (dispatch! [:set-field :submit-error (.-message err)])))))

(defn view [state]
  (let [form (get state :form {})
        user (:user state)
        submitting? (:submitting? form)
        submitted (:submitted form)]
    (if submitted
      (ir/el :div {:class "consent-done"}
             (ir/el :h1 {} "Thank you")
             (ir/el :p {} (str "Participant registered: " (:id submitted))))
      (forms/form
       {:on-submit submit-consent!}
       (ir/el :h1 {} "Consent Form")

       (ir/el :section {}
              (ir/el :h2 {} "Agreements")
              (for [[k label] agreement-fields]
                (forms/checkbox {:key (name k)
                                  :checked (get-in form [:agreements k])
                                  :on-change [:set-field [:agreements k]]
                                  :label label})))

       (ir/el :section {}
              (ir/el :h2 {} "About You")
              (ir/el :label {} "Age group")
              (forms/select {:value (get-in form [:demographics :age-group])
                              :on-change [:set-field [:demographics :age-group]]
                              :options (mapv (fn [g] [g g]) age-groups)})
              (ir/el :label {} "Gender")
              (forms/select {:value (get-in form [:demographics :gender])
                              :on-change [:set-field [:demographics :gender]]
                              :options genders})
              (ir/el :label {} "Ethnicity")
              (forms/select {:value (get-in form [:demographics :ethnicity])
                              :on-change [:set-field [:demographics :ethnicity]]
                              :options ethnicities})
              (ir/el :label {} "Income range")
              (forms/select {:value (get-in form [:demographics :income-range])
                              :on-change [:set-field [:demographics :income-range]]
                              :options income-ranges})
              (ir/el :label {} "Relevant medical history (optional)")
              (forms/select {:value (get-in form [:demographics :medical-history])
                              :on-change [:set-field [:demographics :medical-history]]
                              :options medical-history-options}))

       (when-not user
         (ir/el :section {}
                (ir/el :h2 {} "Electronic Signature")
                (ir/el :label {} "Email")
                (forms/text-input {:type "email" :value (:email form) :placeholder "your@email.com"
                                    :on-change [:set-field :email]})))

       (forms/submit-button
        {:label (if submitting? "Submitting..." "Agree and start")
         :disabled (or submitting?
                        (not (agreements-complete? form))
                        (not (demographics-complete? form))
                        (and (not user) (empty? (:email form))))})))))
