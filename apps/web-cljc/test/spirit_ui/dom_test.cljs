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

(deftest test-child-key-unkeyed-optional-child-shifts-positional-siblings
  ;; The bug this guards against (found live, browser-testing
  ;; views/web/paper.cljc's TOC toggle): an unkeyed `(when cond? ...)`
  ;; optional child among unkeyed siblings changes the SIBLING LIST LENGTH
  ;; between renders — sibling B's positional key shifts from index 1 to
  ;; index 2 the moment the optional child at index 1 appears, so
  ;; patch-children!'s old-map (keyed by the OLD render's positions) matches
  ;; the wrong old node against B's new position, and everything after the
  ;; insertion point misreads a differently-tagged node as itself (see
  ;; dom.cljs's ns docstring's unkeyed-list CALLER CONTRACT). Explicit keys
  ;; (paper.cljc's fix) keep each sibling's key stable regardless of what's
  ;; inserted/removed around it.
  (let [sibling-b {:ui/tag :nav :ui/attrs {}}]
    (is (not= (dom/child-key sibling-b 1) (dom/child-key sibling-b 2))
        "unkeyed: B's identity changes when its position shifts — the bug")
    (let [keyed-b (assoc sibling-b :ui/key :toc-sidebar)]
      (is (= (dom/child-key keyed-b 1) (dom/child-key keyed-b 2))
          "keyed: B's identity survives a position shift — the fix"))))
