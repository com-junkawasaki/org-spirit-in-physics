(ns spirit-ui.researcher-main
  "Entry point for the `:researcher` shadow-cljs build (apps/researcher
  port). Same cljc-ui-IR core as spirit-ui.web-main, different routes/views —
  matches the existing separate-domain deployment
  (researcher.spirit-in-physics.com)."
  (:require [spirit-ui.api-client :as api]
            [spirit-ui.dom :as dom]
            [spirit-ui.ir :as ir]
            [spirit-ui.router :as router]
            [spirit-ui.state :as state]
            [spirit-ui.views.researcher.dashboard-shell :as dashboard]
            [spirit-ui.views.researcher.participant-detail :as participant-detail]
            [spirit-ui.views.researcher.participants :as participants]
            [spirit-ui.views.researcher.sessions :as sessions]
            [spirit-ui.views.researcher.settings :as settings]
            [spirit-ui.views.shared.nav :as nav]
            [spirit-ui.views.shared.timeline-visualization :as timeline-viz]))

(def routes
  [(router/compile-route :participant-detail "/participants/:id")
   (router/compile-route :participants "/participants")
   (router/compile-route :sessions "/sessions")
   (router/compile-route :settings "/settings")
   (router/compile-route :dashboard "/")])

(def ^:private nav-links
  [[:dashboard "/" "Overview"] [:participants "/participants" "Participants"]
   [:sessions "/sessions" "Sessions"] [:settings "/settings" "Settings"]])

(defn- page-view [state]
  (case (get-in state [:route :name])
    :participants (participants/view state)
    :participant-detail (participant-detail/view state)
    :sessions (sessions/view state)
    :settings (settings/view state)
    (dashboard/view state)))

(defn- root-view [state]
  (ir/el :div {}
         (nav/view state {:links nav-links :title "Researcher Dashboard"})
         (ir/el :main {:class "content"} (page-view state))))

(defn- load-participants! [_state dispatch!]
  (dispatch! [:set-data-loading :participants true])
  (-> (api/list-participants!)
      (.then (fn [{:keys [body]}] (dispatch! [:set-data :participants (:participants body)])))))

(defn- load-sessions! [_state dispatch!]
  (dispatch! [:set-data-loading :sessions true])
  (-> (api/list-sessions!)
      (.then (fn [{:keys [body]}] (dispatch! [:set-data :sessions (:sessions body)])))))

(defn- register-handlers! []
  ;; must defer — see spirit-ui.state/dispatch!'s GOTCHA docstring (nested
  ;; synchronous dispatch! from inside a swap!-wrapped handler gets clobbered)
  (state/register-handler! :navigate (fn [s path] (state/defer! #(router/navigate! path)) s))
  (state/register-handler! :route-changed
    (fn [s path]
      (let [{:keys [route params]} (router/match-route routes path)]
        (assoc s :route (merge {:name (:name route)} params)))))
  (state/register-handler! :set-field
    (fn [s field-path value]
      (assoc-in s (into [:form] (if (vector? field-path) field-path [field-path])) value)))
  (state/register-handler! :set-data-loading
    (fn [s k v] (assoc-in s [:data (keyword (str (name k) "-loading?"))] v)))
  (state/register-handler! :set-data
    (fn [s k v]
      (-> s (assoc-in [:data k] v) (assoc-in [:data (keyword (str (name k) "-loading?"))] false))))
  (state/register-handler! :select-participant
    (fn [s id] (assoc-in s [:form :selected-participant-id] id)))
  (state/register-handler! :session-loaded (fn [s user] (assoc s :user user)))
  (timeline-viz/register-handlers!)
  (state/register-handler! :logout!
    (fn [s]
      (state/dispatch! (fn [_ dispatch!]
                          (-> (api/logout!) (.then (fn [_] (dispatch! [:session-loaded nil]))))))
      s))
  (state/register-handler! :login-prompt
    ;; researcher has no /consent-equivalent registration page — prompt the
    ;; WebAuthn passkey login ceremony directly (no email hint -> browser
    ;; shows any registered passkey).
    (fn [s]
      (state/dispatch!
       (fn [_ dispatch!]
         (-> (api/login! nil)
             (.then (fn [{:keys [body]}] (dispatch! [:session-loaded (:user body)])))
             (.catch (fn [^js err] (js/console.error "login failed:" (.-message err)))))))
      s)))

(defn- on-navigate! [path]
  (state/dispatch! [:route-changed path])
  (case (get-in @state/app-state [:route :name])
    :dashboard (state/dispatch! load-participants!)
    :participants (state/dispatch! load-participants!)
    :sessions (state/dispatch! load-sessions!)
    :participant-detail (state/dispatch! (timeline-viz/load-timeline! (get-in @state/app-state [:route :id])))
    nil))

(defn init! []
  (register-handlers!)
  (swap! state/app-state assoc :form {} :data {})
  (dom/mount! (js/document.getElementById "app") root-view state/app-state state/dispatch!)
  (router/on-route-change! on-navigate!)
  (router/init!)
  (state/dispatch!
   (fn [_ dispatch!]
     (-> (api/me!) (.then (fn [{:keys [body]}] (dispatch! [:session-loaded (:user body)])))))))
