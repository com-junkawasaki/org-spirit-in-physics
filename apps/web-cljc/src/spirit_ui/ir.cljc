(ns spirit-ui.ir
  "Hiccup-like UI-IR tree constructors. Extends cloud-murakumo's `el`
  (orgs/gftdcojp/cloud-murakumo/src/cloud_murakumo/ui/views.cljc) with a
  usable :ui/key (cloud-murakumo defined the attr but its renderer ignored
  it — full-subtree-rebuild doesn't need keys) and child-list flattening so
  `(el :ul {} (for [x xs] (item x)))` works with a single seq argument.

  A node is `{:ui/tag :div :ui/attrs {...} :ui/key nil-or-key :ui/children [...]}`.
  A child may also be a plain string/number (rendered as a text node).")

(defn- flatten-children [children]
  (into []
        (mapcat (fn [c] (cond (nil? c) [] (sequential? c) c :else [c])))
        children))

(defn el
  "attrs may include :key (diffing identity, stripped before becoming a real
  DOM attribute) and :ui/on {event-name action-spec} (see spirit-ui.dom for
  how action-spec is dispatched)."
  ([tag] (el tag nil))
  ([tag attrs & children]
   {:ui/tag tag
    :ui/attrs (dissoc (or attrs {}) :key)
    :ui/key (:key attrs)
    :ui/children (flatten-children children)}))
