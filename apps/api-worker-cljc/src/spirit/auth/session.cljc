(ns spirit.auth.session
  "HMAC-signed session cookie + auth_sessions CRUD. Port of src/auth/session.ts
  using `js/crypto.subtle` (Web Crypto) interop directly — standard on the
  Workers runtime, no library needed."
  (:require [kotoba.lang.text :as str]
            [spirit.db :as db]))

(def session-cookie-name "sip_session")
(def session-ttl-ms (* 1000 60 60 24 30)) ;; 30 days

(defn- replace-all [s pattern replacement]
  (.replace s (js/RegExp. pattern "g") replacement))

(defn base64url-encode
  "^js Uint8Array -> base64url string."
  [^js bytes]
  (let [n (.-length bytes)
        s (loop [i 0 acc ""]
            (if (< i n)
              (recur (inc i) (str acc (js/String.fromCharCode (aget bytes i))))
              acc))]
    (-> (js/btoa s)
        (replace-all "\\+" "-")
        (replace-all "/" "_")
        (.replace (js/RegExp. "=+$") ""))))

(defn base64url-decode
  "base64url string -> ^js Uint8Array."
  [s]
  (let [r (mod (.-length s) 4)
        pad (if (zero? r) "" (apply str (repeat (- 4 r) "=")))
        std (-> s (replace-all "-" "+") (replace-all "_" "/") (str pad))
        bin (js/atob std)
        n (.-length bin)
        out (js/Uint8Array. n)]
    (dotimes [i n] (aset out i (.charCodeAt bin i)))
    out))

(defn random-token
  ([] (random-token 32))
  ([byte-length]
   (let [bytes (js/Uint8Array. byte-length)]
     (.getRandomValues js/crypto bytes)
     (base64url-encode bytes))))

(defn- hmac
  "-> Promise<base64url HMAC-SHA256 signature>."
  [secret message]
  (let [encoder (js/TextEncoder.)
        subtle (.-subtle js/crypto)]
    (-> (.importKey subtle "raw" (.encode encoder secret)
                     #js {:name "HMAC" :hash "SHA-256"} false #js ["sign"])
        (.then (fn [^js key] (.sign subtle "HMAC" key (.encode encoder message))))
        (.then (fn [sig] (base64url-encode (js/Uint8Array. sig)))))))

(defn- timing-safe-equal? [a b]
  (if (not= (.-length a) (.-length b))
    false
    (loop [i 0 diff 0]
      (if (< i (.-length a))
        (recur (inc i) (bit-or diff (bit-xor (.charCodeAt a i) (.charCodeAt b i))))
        (zero? diff)))))

(defn sign-session
  "-> Promise<\"sessionId.signature\">."
  [session-id secret]
  (-> (hmac secret session-id)
      (.then (fn [sig] (str session-id "." sig)))))

(defn verify-signed
  "-> Promise<sessionId | nil>."
  [value secret]
  (let [idx (.indexOf value ".")]
    (if (<= idx 0)
      (js/Promise.resolve nil)
      (let [session-id (subs value 0 idx)
            sig (subs value (inc idx))]
        (-> (hmac secret session-id)
            (.then (fn [expected] (if (timing-safe-equal? sig expected) session-id nil))))))))

(defn read-cookie [cookie-header name]
  (when cookie-header
    (some (fn [part]
            (let [trimmed (.trim part)
                  eq (.indexOf trimmed "=")]
              (when (and (pos? eq) (= (subs trimmed 0 eq) name))
                (js/decodeURIComponent (subs trimmed (inc eq))))))
          (.split cookie-header ";"))))

(defn build-session-cookie [value secure? max-age-seconds]
  (let [parts (cond-> [(str session-cookie-name "=" (js/encodeURIComponent value))
                        "Path=/" "HttpOnly" "SameSite=Lax"
                        (str "Max-Age=" max-age-seconds)]
                secure? (conj "Secure"))]
    (str/join "; " parts)))

(defn build-clear-session-cookie [secure?]
  (let [parts (cond-> [(str session-cookie-name "=") "Path=/" "HttpOnly" "SameSite=Lax" "Max-Age=0"]
                secure? (conj "Secure"))]
    (str/join "; " parts)))

(defn create-session!
  "-> Promise<{:session-id ... :expires-at-ms ...}>."
  [db user-id user-agent]
  (let [session-id (random-token 32)
        now (js/Date.now)
        expires-at-ms (+ now session-ttl-ms)]
    (-> (db/insert-auth-session! db {:id session-id :user_id user-id
                                      :expires_at_ms expires-at-ms
                                      :created_at_ms now :last_seen_at_ms now
                                      :user_agent user-agent})
        (.then (fn [_] {:session-id session-id :expires-at-ms expires-at-ms})))))

(defn- expired? [row now] (< (:expires_at_ms row) now))

(defn- load-session-user [db session-id]
  (-> (db/find-auth-session db session-id)
      (.then (fn [row]
               (cond
                 (nil? row) nil
                 (expired? row (js/Date.now))
                 (-> (db/delete-auth-session! db session-id) (.then (constantly nil)))
                 :else
                 (-> (db/touch-auth-session! db session-id (js/Date.now))
                     (.then (fn [_] (db/find-user-by-id db (:user_id row))))))))))

(defn resolve-session-user
  "-> Promise<user-row | nil>."
  [db cookie-header secret]
  (let [cookie-value (read-cookie cookie-header session-cookie-name)]
    (if-not cookie-value
      (js/Promise.resolve nil)
      (-> (verify-signed cookie-value secret)
          (.then (fn [session-id] (if session-id (load-session-user db session-id) nil)))))))

(defn destroy-session!
  "-> Promise<nil>."
  [db cookie-header secret]
  (let [cookie-value (read-cookie cookie-header session-cookie-name)]
    (if-not cookie-value
      (js/Promise.resolve nil)
      (-> (verify-signed cookie-value secret)
          (.then (fn [session-id]
                   (if session-id
                     (-> (db/delete-auth-session! db session-id) (.then (constantly nil)))
                     nil)))))))
