(ns spirit-ui.views.web.support
  "Port of apps/web/src/routes/support/+page.svelte."
  (:require [spirit-ui.ir :as ir]))

(def ^:private faqs
  [["What is Spirit in Physics?" "A research app studying selfhood via Jung word-association, reaction time, and physiological signals."]
   ["How long does the experiment take?" "Two sessions of 100 words each, about 15-20 minutes total."]
   ["Why do you need camera and microphone access?" "Camera for Hume AI facial emotion analysis, microphone for speech/reaction time."]
   ["How is my data protected?" "See our Privacy Policy for full details."]
   ["Can I withdraw from the study?" "Yes, participation is voluntary and you may withdraw at any time."]
   ["How do I delete my account?" "Email support; deletion is processed within 30 days."]])

(def ^:private troubleshooting
  ["Check your internet connection"
   "Check camera/microphone permissions"
   "Update to the latest iOS version"
   "Restart the app"
   "Check available storage space"])

(defn view [_state]
  (ir/el :article {:class "support-page"}
         (ir/el :h1 {} "Support")
         (ir/el :section {}
                (ir/el :h2 {} "Contact Us")
                (ir/el :p {} "support@spirit-in-physics.com — we respond within 48 hours."))
         (ir/el :section {}
                (ir/el :h2 {} "FAQ")
                (for [[i [q a]] (map-indexed vector faqs)]
                  (ir/el :div {:key i :class "faq-item"}
                         (ir/el :h3 {} q)
                         (ir/el :p {} a))))
         (ir/el :section {}
                (ir/el :h2 {} "Troubleshooting")
                (ir/el :ul {}
                       (for [[i item] (map-indexed vector troubleshooting)]
                         (ir/el :li {:key i} item)))
                (ir/el :p {} "Still stuck? Contact support@spirit-in-physics.com."))))
