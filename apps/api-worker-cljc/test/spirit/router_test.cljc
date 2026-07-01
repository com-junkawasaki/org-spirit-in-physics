(ns spirit.router-test
  "Router-level smoke tests, modeled on app-aozora's router_test.cljc: real
  js/Request instances against a fake env, asserting on the returned
  js/Response. Covers the DB-independent routes plus CORS/OPTIONS/404 dispatch
  (routes that touch D1/R2/WebAuthn are exercised via parity testing against
  wrangler dev, not unit tests, per the ADR's verification plan)."
  (:require [cljs.test :refer [deftest is async]]
            [spirit.router :as router]))

(defn- fake-env []
  #js {:API_MODE "worker-partial"})

(defn- get! [path]
  (router/handle (js/Request. (str "https://example.com" path)) (fake-env)))

(deftest test-health
  (async done
    (-> (get! "/api/health")
        (.then (fn [^js response]
                 (is (= 200 (.-status response)))
                 (-> (.json response)
                     (.then (fn [^js body]
                              (is (true? (.-ok body)))
                              (is (= "worker-partial" (.-mode body)))
                              (done)))))))))

(deftest test-capabilities
  (async done
    (-> (get! "/api/capabilities")
        (.then (fn [^js response]
                 (is (= 200 (.-status response)))
                 (done))))))

(deftest test-unknown-path-404
  (async done
    (-> (get! "/totally/unknown")
        (.then (fn [^js response]
                 (is (= 404 (.-status response)))
                 (done))))))

(deftest test-health-rejects-non-get-method
  ;; regression: /api/health and /api/capabilities used to match on path alone
  ;; (no method guard), so POST/PUT/DELETE would incorrectly return 200.
  (async done
    (-> (router/handle (js/Request. "https://example.com/api/health" #js {:method "POST"}) (fake-env))
        (.then (fn [^js response]
                 (is (= 501 (.-status response)))
                 (done))))))

(deftest test-unmatched-api-path-501
  (async done
    (-> (get! "/api/not-a-real-endpoint")
        (.then (fn [^js response]
                 (is (= 501 (.-status response)))
                 (done))))))

(deftest test-cors-preflight
  (async done
    (-> (router/handle
         (js/Request. "https://example.com/api/health"
                      #js {:method "OPTIONS" :headers #js {"origin" "https://spirit-in-physics.com"}})
         (fake-env))
        (.then (fn [^js response]
                 (is (= 204 (.-status response)))
                 (is (= "GET, POST, OPTIONS" (.get (.-headers response) "access-control-allow-methods")))
                 (done))))))

(deftest test-cors-headers-on-api-response
  (async done
    (-> (router/handle
         (js/Request. "https://example.com/api/health"
                      #js {:headers #js {"origin" "https://spirit-in-physics.com"}})
         (fake-env))
        (.then (fn [^js response]
                 (is (= "https://spirit-in-physics.com"
                        (.get (.-headers response) "access-control-allow-origin")))
                 (is (= "true" (.get (.-headers response) "access-control-allow-credentials")))
                 (done))))))

(deftest test-missing-db-binding-returns-500
  (async done
    (-> (get! "/api/participants")
        (.then (fn [^js response]
                 (is (= 500 (.-status response)))
                 (done))))))
