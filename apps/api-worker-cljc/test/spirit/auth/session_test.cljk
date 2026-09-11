(ns spirit.auth.session-test
  (:require [cljs.test :refer [deftest is async]]
            [spirit.auth.session :as session]))

(deftest test-base64url-roundtrip
  (let [bytes (js/Uint8Array. #js [1 2 3 250 251 252 0 255])
        encoded (session/base64url-encode bytes)
        decoded (session/base64url-decode encoded)]
    (is (not (re-find #"[+/=]" encoded)))
    (is (= (vec (js/Array.from bytes)) (vec (js/Array.from decoded))))))

(deftest test-cookie-building
  (let [secure-cookie (session/build-session-cookie "abc.def" true 2592000)
        plain-cookie (session/build-session-cookie "abc.def" false 2592000)]
    (is (re-find #"^sip_session=abc\.def" secure-cookie))
    (is (re-find #"Secure" secure-cookie))
    (is (re-find #"HttpOnly" secure-cookie))
    (is (not (re-find #"Secure" plain-cookie)))))

(deftest test-clear-cookie
  (is (re-find #"Max-Age=0" (session/build-clear-session-cookie true))))

(deftest test-read-cookie
  (is (= "abc.def" (session/read-cookie "foo=bar; sip_session=abc.def; other=1" "sip_session")))
  (is (nil? (session/read-cookie "foo=bar" "sip_session")))
  (is (nil? (session/read-cookie nil "sip_session"))))

(deftest test-sign-and-verify
  (async done
    (-> (session/sign-session "my-session-id" "a-very-secret-key-1234567890")
        (.then (fn [signed]
                 (is (re-find #"^my-session-id\." signed))
                 (-> (session/verify-signed signed "a-very-secret-key-1234567890")
                     (.then (fn [session-id]
                              (is (= "my-session-id" session-id))
                              (-> (session/verify-signed signed "wrong-secret-wrong-secret")
                                  (.then (fn [bad]
                                           (is (nil? bad))
                                           (done))))))))))))

(deftest test-verify-signed-malformed
  (async done
    (-> (session/verify-signed "no-dot-here" "any-secret-value")
        (.then (fn [result]
                 (is (nil? result))
                 (done))))))
