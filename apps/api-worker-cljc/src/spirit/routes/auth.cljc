(ns spirit.routes.auth
  "Port of the /api/auth/* routes in src/index.ts (WebAuthn register/login,
  logout, me). Each async stage is a small named function threaded via .then
  rather than deeply-nested inline lambdas, to keep the Promise chains legible."
  (:require [spirit.auth.session :as session]
            [spirit.auth.webauthn :as webauthn]
            [spirit.db :as db]
            [spirit.http :as http]
            [spirit.util :as util]))

(defn- require-session-secret [^js env]
  (let [secret (.-SESSION_SECRET env)]
    (if (or (not secret) (< (.-length secret) 16))
      (throw (js/Error. "SESSION_SECRET is not configured (use `wrangler secret put SESSION_SECRET`)."))
      secret)))

(defn- https? [^js url] (= (.-protocol url) "https:"))

(defn- origin-for [^js req ^js url]
  (or (.get (.-headers req) "origin") (.-origin url)))

(defn- user->json [user]
  {:id (:id user) :email (:email user) :displayName (:display_name user) :role (:role user)
   :createdAt (:created_at_ms user) :updatedAt (:updated_at_ms user)})

(defn- set-session-cookie! [^js response signed secure?]
  (.set (.-headers response) "Set-Cookie"
        (session/build-session-cookie signed secure? (js/Math.floor (/ session/session-ttl-ms 1000))))
  response)

(defn- issue-session!
  "Create an auth_sessions row, sign it, and attach it as a Set-Cookie header
  on `response`. -> Promise<response>."
  [db user-id ^js req ^js env ^js url ^js response]
  (-> (session/create-session! db user-id (.get (.-headers req) "user-agent"))
      (.then (fn [{:keys [session-id]}] (session/sign-session session-id (require-session-secret env))))
      (.then (fn [signed] (set-session-cookie! response signed (https? url))))))

(defn- extract-challenge
  "base64url clientDataJSON -> challenge string, or nil."
  [client-data-json-base64]
  (try
    (let [std (-> client-data-json-base64
                  (.replace (js/RegExp. "-" "g") "+")
                  (.replace (js/RegExp. "_" "g") "/"))
          pad-len (mod (- 4 (mod (.-length std) 4)) 4)
          padded (str std (apply str (repeat pad-len "=")))
          json (js/atob padded)
          ^js data (js/JSON.parse json)]
      (.-challenge data))
    (catch :default _ nil)))

(defn- create-user! [db email display-name]
  (-> (db/count-users db)
      (.then (fn [n]
               (let [now (js/Date.now)
                     new-user {:id (util/gen-uuid) :email email :display_name display-name
                               :role (if (zero? n) "researcher" "participant")
                               :created_at_ms now :updated_at_ms now}]
                 (-> (db/insert-user! db new-user)
                     (.then (fn [_] (db/find-user-by-id db (:id new-user))))))))))

(defn- find-or-create-user! [db email display-name]
  (-> (db/find-user-by-email db email)
      (.then (fn [existing] (or existing (create-user! db email display-name))))))

;; ---------- POST /api/auth/register/options ----------

(defn- send-registration-options! [db ^js req ^js url user]
  (-> (db/list-credential-ids-for-user db (:id user))
      (.then (fn [existing-ids]
               (let [rp (webauthn/relying-party-for-origin (origin-for req url))]
                 (webauthn/generate-registration-challenge
                  db rp {:id (:id user) :email (:email user)
                         :display-name (or (:display_name user) (:email user))}
                  existing-ids))))
      (.then (fn [options] (http/json-response {:options options})))))

(defn register-options! [db ^js req ^js url]
  (-> (http/parse-json req)
      (.then (fn [^js body]
               (let [email (-> (or (.-email body) "") .trim .toLowerCase)
                     display-name (-> (or (.-displayName body) "") .trim)]
                 (if (or (empty? email) (empty? display-name))
                   (http/error-response "email and displayName are required" 400)
                   (-> (find-or-create-user! db email display-name)
                       (.then (fn [user] (send-registration-options! db req url user))))))))))

;; ---------- POST /api/auth/register/verify ----------

(defn- store-credential-and-issue-session!
  [db ^js req ^js url ^js env ^js body user verified]
  (let [now (js/Date.now)]
    (-> (db/insert-credential! db
          {:id (:credential-id verified) :user_id (:id user)
           :public_key (:public-key verified) :counter (:counter verified)
           :transports (js/JSON.stringify (:transports verified))
           :device_type (:device-type verified)
           :backed_up (if (:backed-up verified) 1 0)
           :nickname (or (.-nickname body) nil)
           :created_at_ms now :last_used_at_ms now})
        (.then (fn [_]
                 (issue-session! db (:id user) req env url
                                  (http/json-response {:user (user->json user)})))))))

(defn- finish-registration! [db ^js req ^js url ^js env ^js body response user challenge]
  (let [rp (webauthn/relying-party-for-origin (origin-for req url))]
    (-> (webauthn/verify-registration rp challenge response)
        (.then (fn [verified] (store-credential-and-issue-session! db req url env body user verified)))
        (.catch (fn [^js err]
                  (http/error-response (str "registration verification failed: " (.-message err)) 400))))))

(defn- consume-registration-challenge! [db ^js req ^js url ^js env ^js body response user]
  (let [^js inner (.-response response)
        client-data-json (when inner (.-clientDataJSON inner))
        challenge (when client-data-json (extract-challenge client-data-json))]
    (if-not challenge
      (js/Promise.resolve (http/error-response "cannot extract challenge from response" 400))
      (-> (webauthn/consume-challenge! db challenge "registration")
          (.then (fn [consumed]
                   (if (or (not consumed) (not= (:user-id consumed) (:id user)))
                     (http/error-response "challenge invalid or expired" 400)
                     (finish-registration! db req url env body response user challenge))))))))

(defn- verify-registration-for-email! [db ^js req ^js url ^js env ^js body response email]
  (-> (db/find-user-by-email db email)
      (.then (fn [user]
               (if-not user
                 (http/error-response "user not found, request registration options first" 404)
                 (consume-registration-challenge! db req url env body response user))))))

(defn register-verify! [db ^js req ^js url ^js env]
  (-> (http/parse-json req)
      (.then (fn [^js body]
               (let [email (-> (or (.-email body) "") .trim .toLowerCase)
                     response (.-response body)]
                 (if (or (empty? email) (not response))
                   (http/error-response "email and response are required" 400)
                   (verify-registration-for-email! db req url env body response email)))))))

;; ---------- POST /api/auth/login/options ----------

(defn- send-authentication-options! [db ^js req ^js url allow-ids]
  (let [rp (webauthn/relying-party-for-origin (origin-for req url))]
    (-> (webauthn/generate-authentication-challenge db rp allow-ids)
        (.then (fn [options] (http/json-response {:options options}))))))

(defn login-options! [db ^js req ^js url]
  (-> (http/parse-json-lenient req)
      (.then (fn [^js body]
               (let [email (-> (or (.-email body) "") .trim .toLowerCase)]
                 (if (empty? email)
                   (send-authentication-options! db req url [])
                   (-> (db/find-user-by-email db email)
                       (.then (fn [user]
                                (if user (db/list-credential-ids-for-user db (:id user)) [])))
                       (.then (fn [allow-ids] (send-authentication-options! db req url allow-ids))))))))))

;; ---------- POST /api/auth/login/verify ----------

(defn- finish-authentication! [db ^js req ^js url ^js env response challenge credential]
  (let [rp (webauthn/relying-party-for-origin (origin-for req url))]
    (-> (webauthn/verify-authentication rp challenge response credential)
        (.then (fn [result]
                 (-> (db/touch-credential! db {:id (:id credential) :counter (:new-counter result)
                                                :last_used_at_ms (js/Date.now)})
                     (.then (fn [_] (db/find-user-by-id db (:user_id credential))))
                     (.then (fn [user]
                              (if-not user
                                (http/error-response "user not found" 404)
                                (issue-session! db (:id user) req env url
                                                 (http/json-response {:user (user->json user)}))))))))
        (.catch (fn [^js err]
                  (http/error-response (str "authentication verification failed: " (.-message err)) 400))))))

(defn- verify-credential! [db ^js req ^js url ^js env response challenge credential-id]
  (-> (db/find-credential-by-id db credential-id)
      (.then (fn [credential]
               (if-not credential
                 (http/error-response "unknown credential" 404)
                 (finish-authentication! db req url env response challenge credential))))))

(defn login-verify! [db ^js req ^js url ^js env]
  (-> (http/parse-json req)
      (.then
       (fn [^js body]
         (let [^js response (.-response body)
               credential-id (when response (.-id response))
               ^js inner (when response (.-response response))
               client-data-json (when inner (.-clientDataJSON inner))]
           (if (or (not response) (not credential-id) (not client-data-json))
             (http/error-response "response is required" 400)
             (let [challenge (extract-challenge client-data-json)]
               (if-not challenge
                 (http/error-response "cannot extract challenge" 400)
                 (-> (webauthn/consume-challenge! db challenge "authentication")
                     (.then (fn [consumed]
                              (if-not consumed
                                (http/error-response "challenge invalid or expired" 400)
                                (verify-credential! db req url env response challenge credential-id)))))))))))))

;; ---------- POST /api/auth/logout, GET /api/auth/me ----------

(defn logout! [db ^js req ^js url ^js env]
  (-> (session/destroy-session! db (.get (.-headers req) "cookie") (require-session-secret env))
      (.then (fn [_]
               (let [^js response (http/json-response {:ok true})]
                 (.set (.-headers response) "Set-Cookie" (session/build-clear-session-cookie (https? url)))
                 response)))))

(defn me! [db ^js req ^js env]
  (-> (session/resolve-session-user db (.get (.-headers req) "cookie") (require-session-secret env))
      (.then (fn [user] (http/json-response {:user (when user (user->json user))})))))
