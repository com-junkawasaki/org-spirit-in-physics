(ns spirit-ui.router-test
  (:require [cljs.test :refer [deftest is]]
            [spirit-ui.router :as router]))

(def routes
  [(router/compile-route :participants "/participants")
   (router/compile-route :participant-detail "/participants/:id")
   (router/compile-route :sessions "/sessions")
   (router/compile-route :home "/")])

(deftest test-split-path
  (is (= ["participants" "42"] (router/split-path "/participants/42")))
  (is (= [] (router/split-path "/")))
  (is (= ["a" "b"] (router/split-path "/a/b/"))))

(deftest test-match-literal-route
  (let [m (router/match-route routes "/sessions")]
    (is (= :sessions (:name (:route m))))
    (is (= {} (:params m)))))

(deftest test-match-param-route
  (let [m (router/match-route routes "/participants/abc-123")]
    (is (= :participant-detail (:name (:route m))))
    (is (= {:id "abc-123"} (:params m)))))

(deftest test-match-root
  (let [m (router/match-route routes "/")]
    (is (= :home (:name (:route m))))))

(deftest test-no-match
  (is (nil? (router/match-route routes "/totally/unknown/path"))))

(deftest test-literal-route-precedence-over-param
  ;; :participants (literal, 1 segment) should not be confused with
  ;; :participant-detail (2 segments) — different segment counts don't clash,
  ;; this checks route order doesn't accidentally shadow the literal route.
  (let [m (router/match-route routes "/participants")]
    (is (= :participants (:name (:route m))))))
