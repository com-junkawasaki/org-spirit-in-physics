(ns spirit-ui.d3-interop-test
  "Only the pure (non-DOM) parts of d3-interop are exercised here — see
  dom_test.cljs's docstring for why DOM-mutating fns need a real browser."
  (:require [cljs.test :refer [deftest is]]
            [spirit-ui.d3-interop :as d3]))

(deftest test-sparkline-path-empty
  (is (= "" (d3/sparkline-path []))))

(deftest test-sparkline-path-nonempty-returns-svg-path-string
  (let [path (d3/sparkline-path [1 2 3 2 1])]
    (is (string? path))
    (is (re-find #"^M" path) "d3.line's default path starts with a moveto command")))

(deftest test-to-date-nil-and-nan-fall-back-to-now
  (is (instance? js/Date (d3/to-date nil)))
  (is (instance? js/Date (d3/to-date js/NaN))))

(deftest test-to-date-epoch-ms-passthrough
  (let [ms 1782900000000]
    (is (= ms (.getTime (d3/to-date ms))))))
