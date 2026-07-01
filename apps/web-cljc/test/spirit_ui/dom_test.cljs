(ns spirit-ui.dom-test
  "dom.cljs's DOM-mutating functions need a real DOM (no jsdom dependency in
  this project yet) so aren't exercised by :node-test — but child-key is
  pure data logic and is regression-tested here directly. See its docstring
  for the concrete corrupted-render scenario this key-collision fix
  prevents (found during PR review: an explicit `:key 0` sibling colliding
  with another sibling's positional fallback index `0`)."
  (:require [cljs.test :refer [deftest is]]
            [spirit-ui.dom :as dom]))

(deftest test-child-key-explicit-key-used-as-is
  (is (= "abc" (dom/child-key {:ui/key "abc"} 0)))
  (is (= 42 (dom/child-key {:ui/key 42} 5))))

(deftest test-child-key-positional-fallback-is-tagged
  ;; must NOT be the bare integer, or it could collide with an explicit
  ;; :ui/key that happens to be that same integer (see docstring).
  (is (not= 0 (dom/child-key {:ui/attrs {}} 0)))
  (is (vector? (dom/child-key {:ui/attrs {}} 0))))

(deftest test-child-key-no-collision-between-explicit-and-positional
  ;; the regression this fix targets: sibling A has no :key (falls back to
  ;; its position, 0); sibling B explicitly sets :key 0. Before the fix both
  ;; resolved to the bare integer 0 and collided in old-map's `into {}`.
  (let [sibling-a {:ui/attrs {}}         ;; no :ui/key -> positional fallback
        sibling-b {:ui/key 0}]           ;; explicit key 0
    (is (not= (dom/child-key sibling-a 0) (dom/child-key sibling-b 0)))))

(deftest test-child-key-text-node-children-use-positional
  (is (not= (dom/child-key "some text" 0) (dom/child-key "some text" 1))))
