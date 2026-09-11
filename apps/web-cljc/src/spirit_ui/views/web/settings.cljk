(ns spirit-ui.views.web.settings
  "Simplified port of apps/web/src/routes/settings/+page.svelte. Keeps the
  theme toggle (client-only, no backend); drops the paraglide multi-language
  selector (i18n routing is a separate concern, not ported in Phase 2)."
  (:require [spirit-ui.forms :as forms]
            [spirit-ui.ir :as ir]))

(def ^:private themes [["light" "Light"] ["dark" "Dark"] ["system" "System"]])

(defn view [state]
  (let [current-theme (get-in state [:settings :theme] "system")]
    (ir/el :article {:class "settings-page"}
           (ir/el :h1 {} "Settings")
           (ir/el :section {}
                  (ir/el :h2 {} "Appearance")
                  (ir/el :div {:class "theme-buttons"}
                         (for [[value label] themes]
                           (forms/button
                            {:label label
                             :on-click [:set-theme value]
                             :disabled false}))))
           (ir/el :p {:class "current-theme"} (str "Current: " current-theme))
           (forms/button {:label "Back" :on-click [:navigate "/"]}))))
