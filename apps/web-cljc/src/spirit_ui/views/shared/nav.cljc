(ns spirit-ui.views.shared.nav
  "Simplified port of apps/{web,researcher}/src/routes/+layout.svelte's nav
  shell (auth-state header + link list). Deliberately drops paraglide i18n,
  the researcher sidebar's role-gating (ResearcherGuard), and the bottom-tab
  vs sidebar visual distinction — Phase 2 proves the routing/state/API
  plumbing on a single simple nav component shared by both apps; a follow-up
  phase can restyle to match the original web (bottom tabs) vs researcher
  (sidebar) layouts exactly."
  (:require [spirit-ui.forms :as forms]
            [spirit-ui.ir :as ir]))

(defn- nav-link [current-route-name [route-name path label]]
  (ir/el :a {:key route-name
             :href path
             :class (when (= route-name current-route-name) "active")
             :ui/on {:click [:prevent-default! [:navigate path]]}}
         label))

(defn- auth-controls [{:keys [user]}]
  (if user
    (ir/el :span {:class "auth-controls"}
           (ir/el :span {:class "user-email"} (:email user))
           (forms/button {:label "Log out" :on-click [:logout!]}))
    (forms/button {:label "Log in" :on-click [:login-prompt]})))

(defn view [state {:keys [links title]}]
  (let [current-route-name (get-in state [:route :name])]
    (ir/el :header {:class "spirit-nav"}
           (ir/el :div {:class "brand"} (or title "Spirit in Physics"))
           (ir/el :nav {}
                  (mapv (partial nav-link current-route-name) links))
           (auth-controls state))))
