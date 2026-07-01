(ns spirit-ui.views.web.privacy
  "Port of apps/web/src/routes/privacy/+page.svelte. Condensed to section
  headings + gist per section (the original is a full legal document;
  reproducing every sentence verbatim is not the point of proving the
  cljc-ui-IR pattern) — full legal text should be copied over verbatim in a
  follow-up pass before this page is user-facing."
  (:require [spirit-ui.ir :as ir]))

(def ^:private sections
  [["Introduction" "\"Extended Evaluation of Human Illusions using Jungian Psychology and Computational Models\" (Niigata University)."]
   ["Data Controller" "PI: Jun Kawasaki. Supervisor: Kazutaka Tainaka. Contact: support@spirit-in-physics.com"]
   ["Research Purpose" "Jung Word Association Embedding Test."]
   ["Data We Collect" "Account (email/display name/WebAuthn passkeys, no password), optional demographics, experimental data (audio, reaction times, Hume AI facial video, physiological signals), consent records."]
   ["Camera and Microphone Usage" "Camera -> Hume AI emotion analysis; microphone -> speech/reaction time. Permission is revocable."]
   ["How We Use Your Data" "Research only. No marketing, no ads, no sale."]
   ["Data Protection" "Anonymization, TLS, access control, Cloudflare D1/R2 storage."]
   ["Third-Party Services" "Cloudflare (Workers/D1/R2/DNS, hosts auth) and Hume AI (facial analysis)."]
   ["Data Sharing" "Anonymized data only, shared with the Niigata University team / journals / conferences."]
   ["Data Retention" "Duration of study + 5-10 years post-publication; deletable on request."]
   ["Your Rights" "Voluntary participation; access/rectify/erase/withdraw/portability."]
   ["Account Deletion" "Email support; account/passkeys/sessions deleted within 30 days. Anonymized research data may be retained."]
   ["Children's Privacy" "Not for participants under 18."]
   ["Ethics Approval" "Approval Number 2024-0269, dated 2025-03-01, ICH-GCP compliant."]
   ["Contact Us" "support@spirit-in-physics.com — Systems Brain Pathology Laboratory (Tainaka Lab)."]
   ["Changes to This Policy" "Standard update clause."]])

(defn view [_state]
  (ir/el :article {:class "privacy-policy"}
         (ir/el :h1 {} "Privacy Policy")
         (ir/el :p {:class "updated"} "Last updated: February 2026")
         (for [[i [heading body]] (map-indexed vector sections)]
           (ir/el :section {:key i}
                  (ir/el :h2 {} (str (inc i) ". " heading))
                  (ir/el :p {} body)))))
