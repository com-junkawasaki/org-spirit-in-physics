(ns spirit.auth.webauthn
  "WebAuthn/passkey ceremonies. Port of src/auth/webauthn.ts — `@simplewebauthn/server`
  is interop-wrapped via shadow-cljs npm require rather than reimplemented in
  CLJS (COSE/CBOR/attestation verification is security-critical; see ADR:
  90-docs/adr/2607011800-org-spirit-in-physics-api-worker-cljc-port, exemption
  clause of ADR-2606290000).

  The client-submitted WebAuthn response payloads (`^js` RegistrationResponseJSON /
  AuthenticationResponseJSON) are passed through to the library untouched —
  never round-tripped through js->clj/clj->js — to avoid any risk of mangling
  their nested base64url fields."
  (:require ["@simplewebauthn/server" :as webauthn]
            [clojure.string :as str]
            [spirit.db :as db]))

(def rp-name "Spirit in Physics")
(def challenge-ttl-ms (* 1000 60 5)) ;; 5 minutes

(defn relying-party-for-origin
  "origin-header -> {:rp-id ... :origin ...}."
  [origin-header]
  (if (empty? origin-header)
    {:rp-id "localhost" :origin "http://localhost"}
    (try
      (let [url (js/URL. origin-header)
            host (.-hostname url)
            rp-id (cond
                    (or (= host "spirit-in-physics.com") (str/ends-with? host ".spirit-in-physics.com"))
                    "spirit-in-physics.com"
                    (or (= host "localhost") (= host "127.0.0.1")) "localhost"
                    :else host)]
        {:rp-id rp-id :origin (str (.-protocol url) "//" (.-host url))})
      (catch :default _ {:rp-id "localhost" :origin origin-header}))))

(defn persist-challenge!
  "-> Promise<nil>."
  [db challenge ceremony user-id]
  (let [now (js/Date.now)]
    (-> (db/insert-challenge! db {:id challenge :user_id user-id :ceremony ceremony
                                   :expires_at_ms (+ now challenge-ttl-ms) :created_at_ms now})
        (.then (fn [_] (db/gc-expired-challenges! db now)))
        (.then (constantly nil)))))

(defn consume-challenge!
  "-> Promise<{:user-id ...} | nil>."
  [db challenge ceremony]
  (-> (db/find-challenge db challenge ceremony)
      (.then (fn [row]
               (if-not row
                 nil
                 (-> (db/delete-challenge! db challenge)
                     (.then (fn [_]
                              (if (< (:expires_at_ms row) (js/Date.now))
                                nil
                                {:user-id (:user_id row)})))))))))

(defn- credential-descriptors [ids]
  (clj->js (mapv (fn [id] {:id id :type "public-key" :transports ["internal" "hybrid"]}) ids)))

(defn generate-registration-challenge
  "user: {:id :email :display-name}. -> Promise<js options object>."
  [db rp {:keys [id email display-name]} existing-credential-ids]
  (let [opts #js {:rpName rp-name
                   :rpID (:rp-id rp)
                   :userID (.encode (js/TextEncoder.) id)
                   :userName email
                   :userDisplayName display-name
                   :attestationType "none"
                   :authenticatorSelection #js {:residentKey "preferred"
                                                 :userVerification "preferred"
                                                 :authenticatorAttachment "platform"}
                   :excludeCredentials (credential-descriptors existing-credential-ids)}]
    (-> (webauthn/generateRegistrationOptions opts)
        (.then (fn [^js options]
                 (-> (persist-challenge! db (.-challenge options) "registration" id)
                     (.then (constantly options))))))))

(defn generate-authentication-challenge
  "-> Promise<js options object>."
  [db rp allow-credential-ids]
  (let [opts #js {:rpID (:rp-id rp)
                   :userVerification "preferred"
                   :allowCredentials (credential-descriptors allow-credential-ids)}]
    (-> (webauthn/generateAuthenticationOptions opts)
        (.then (fn [^js options]
                 (-> (persist-challenge! db (.-challenge options) "authentication" nil)
                     (.then (constantly options))))))))

(defn verify-registration
  "response: raw ^js RegistrationResponseJSON from the client (untouched).
  -> Promise<{:credential-id :public-key :counter :device-type :backed-up :transports}>."
  [rp expected-challenge response]
  (let [opts #js {:response response
                   :expectedChallenge expected-challenge
                   :expectedOrigin (:origin rp)
                   :expectedRPID (:rp-id rp)
                   :requireUserVerification false}]
    (-> (webauthn/verifyRegistrationResponse opts)
        (.then (fn [^js verification]
                 (if (or (not (.-verified verification)) (not (.-registrationInfo verification)))
                   (throw (js/Error. "Registration could not be verified"))
                   (let [^js info (.-registrationInfo verification)
                         ^js cred (.-credential info)]
                     {:credential-id (.-id cred)
                      :public-key (.-publicKey cred)
                      :counter (.-counter cred)
                      :device-type (.-credentialDeviceType info)
                      :backed-up (.-credentialBackedUp info)
                      :transports (or (.-transports cred) #js [])})))))))

(defn verify-authentication
  "response: raw ^js AuthenticationResponseJSON from the client (untouched).
  credential: our DB row (map, :public_key is a BLOB value from D1).
  -> Promise<{:new-counter ...}>."
  [rp expected-challenge response credential]
  (let [transports (when (:transports credential) (js/JSON.parse (:transports credential)))
        opts #js {:response response
                   :expectedChallenge expected-challenge
                   :expectedOrigin (:origin rp)
                   :expectedRPID (:rp-id rp)
                   :requireUserVerification false
                   :credential #js {:id (:id credential)
                                     :publicKey (:public_key credential)
                                     :counter (:counter credential)
                                     :transports transports}}]
    (-> (webauthn/verifyAuthenticationResponse opts)
        (.then (fn [^js verification]
                 (if-not (.-verified verification)
                   (throw (js/Error. "Authentication could not be verified"))
                   {:new-counter (.-newCounter (.-authenticationInfo verification))}))))))
