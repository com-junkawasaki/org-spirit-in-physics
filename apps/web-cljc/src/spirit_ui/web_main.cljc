(ns spirit-ui.web-main
  "Entry point for the `:web` shadow-cljs build (apps/web port). Wires
  router + state + dom together; see spirit-ui.researcher-main for the
  sibling researcher-dashboard app (same core, different views/routes)."
  (:require [spirit-ui.api-client :as api]
            [spirit-ui.dom :as dom]
            [spirit-ui.ir :as ir]
            [spirit-ui.router :as router]
            [spirit-ui.state :as state]
            [spirit-ui.views.shared.nav :as nav]
            [spirit-ui.views.web.consent :as consent]
            [spirit-ui.views.web.privacy :as privacy]
            [spirit-ui.views.web.settings :as settings]
            [spirit-ui.views.web.support :as support]))

(def routes
  [(router/compile-route :consent "/consent")
   (router/compile-route :settings "/settings")
   (router/compile-route :privacy "/privacy")
   (router/compile-route :support "/support")
   (router/compile-route :home "/")])

(def ^:private nav-links
  [[:home "/" "Home"] [:consent "/consent" "Consent"] [:settings "/settings" "Settings"]
   [:privacy "/privacy" "Privacy"] [:support "/support" "Support"]])

(defn- home-view [_state]
  (ir/el :div {:class "home"}
         (ir/el :h1 {} "Spirit in Physics")
         (ir/el :p {} "web-cljc Phase 2 — cljc-ui-IR foundation slice. Force3D/D3/KaTeX pages remain on the legacy SvelteKit app for now.")))

(defn- page-view [state]
  (case (get-in state [:route :name])
    :consent (consent/view state)
    :settings (settings/view state)
    :privacy (privacy/view state)
    :support (support/view state)
    (home-view state)))

(defn- root-view [state]
  (ir/el :div {}
         (nav/view state {:links nav-links :title "Spirit in Physics"})
         (ir/el :main {:class "content"} (page-view state))))

(defn- register-handlers! []
  ;; router/navigate! synchronously fires a nested dispatch! [:route-changed
  ;; ...] via notify! — must defer, see spirit-ui.state's dispatch! docstring
  ;; GOTCHA (a same-tick nested swap! gets clobbered by this handler's own
  ;; swap! completing with stale state right after).
  (state/register-handler! :navigate (fn [s path] (state/defer! #(router/navigate! path)) s))
  (state/register-handler! :route-changed
    (fn [s path]
      (let [{:keys [route params]} (router/match-route routes path)]
        (assoc s :route (merge {:name (:name route)} params)))))
  (state/register-handler! :set-field
    (fn [s field-path value]
      (assoc-in s (into [:form] (if (vector? field-path) field-path [field-path])) value)))
  (state/register-handler! :session-loaded (fn [s user] (assoc s :user user)))
  (state/register-handler! :logout!
    (fn [s]
      (state/dispatch! (fn [_ dispatch!]
                          (-> (api/logout!) (.then (fn [_] (dispatch! [:session-loaded nil]))))))
      s))
  (state/register-handler! :login-prompt
    (fn [s] (state/defer! #(router/navigate! "/consent")) s)))

(defn init! []
  (register-handlers!)
  (swap! state/app-state assoc :form {})
  (dom/mount! (js/document.getElementById "app") root-view state/app-state state/dispatch!)
  (router/on-route-change! (fn [path] (state/dispatch! [:route-changed path])))
  (router/init!)
  (state/dispatch!
   (fn [_ dispatch!]
     (-> (api/me!) (.then (fn [{:keys [body]}] (dispatch! [:session-loaded (:user body)])))))))
