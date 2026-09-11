(ns spirit-ui.ir-test
  (:require [cljs.test :refer [deftest is]]
            [spirit-ui.ir :as ir]))

(deftest test-el-basic
  (let [node (ir/el :div {:class "foo"} "hello")]
    (is (= :div (:ui/tag node)))
    (is (= {:class "foo"} (:ui/attrs node)))
    (is (= ["hello"] (:ui/children node)))))

(deftest test-el-key-stripped-from-attrs
  (let [node (ir/el :li {:key "item-1" :class "row"})]
    (is (= "item-1" (:ui/key node)))
    (is (= {:class "row"} (:ui/attrs node)))
    (is (not (contains? (:ui/attrs node) :key)))))

(deftest test-el-flattens-seq-children
  (let [items (for [i (range 3)] (ir/el :li {:key i} (str "item-" i)))
        node (ir/el :ul {} items)]
    (is (= 3 (count (:ui/children node))))
    (is (= :li (:ui/tag (first (:ui/children node)))))))

(deftest test-el-removes-nil-children
  (let [node (ir/el :div {} "a" nil "b" nil)]
    (is (= ["a" "b"] (:ui/children node)))))

(deftest test-el-mixed-seq-and-scalar-children
  (let [node (ir/el :div {} "before" (for [i (range 2)] (ir/el :span {:key i} i)) "after")]
    (is (= 4 (count (:ui/children node))))
    (is (= "before" (first (:ui/children node))))
    (is (= "after" (last (:ui/children node))))))
