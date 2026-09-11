(ns spirit-ui.state-test
  "Regression test for the reentrant-swap! bug hit during Phase 2 browser
  verification: a registered handler that synchronously triggers a nested
  dispatch! of an action vector (not deferred) has its effect silently
  clobbered by the outer handler's own swap! completing with stale state.
  See spirit-ui.state's dispatch! docstring GOTCHA."
  (:require [cljs.test :refer [deftest is async]]
            [spirit-ui.state :as state]))

(deftest test-deferred-nested-dispatch-is-not-clobbered
  (async done
    (reset! state/app-state {})
    (state/register-handler! :test/outer
      (fn [s]
        ;; correct pattern: defer the nested dispatch
        (state/defer! #(state/dispatch! [:test/inner "value-from-inner"]))
        (assoc s :outer-ran? true)))
    (state/register-handler! :test/inner
      (fn [s v] (assoc s :inner-value v)))
    (state/dispatch! [:test/outer])
    ;; outer's own (synchronous) update must be visible immediately
    (is (true? (:outer-ran? @state/app-state)))
    ;; inner's deferred update must NOT have landed yet on this tick
    (is (nil? (:inner-value @state/app-state)))
    (js/setTimeout
     (fn []
       (is (= "value-from-inner" (:inner-value @state/app-state)))
       ;; the outer update must still be intact too (nothing clobbered)
       (is (true? (:outer-ran? @state/app-state)))
       (done))
     10)))

(deftest test-undeferred-nested-dispatch-is-clobbered
  ;; documents the bug itself, not just the fix: WITHOUT defer!, the nested
  ;; dispatch's effect is lost because the outer handler's swap! finishes
  ;; last with the stale `s` it captured before the nested dispatch ran.
  (async done
    (reset! state/app-state {})
    (state/register-handler! :test/outer-buggy
      (fn [s]
        (state/dispatch! [:test/inner-buggy "value-from-inner"]) ;; NOT deferred
        (assoc s :outer-ran? true)))
    (state/register-handler! :test/inner-buggy
      (fn [s v] (assoc s :inner-value v)))
    (state/dispatch! [:test/outer-buggy])
    (is (true? (:outer-ran? @state/app-state)))
    ;; the bug: inner's update was overwritten by outer's swap! completing
    ;; with the state it captured before the nested dispatch happened.
    (is (nil? (:inner-value @state/app-state)))
    (done)))
