(ns spirit-ui.dom
  "Keyed-diff DOM renderer for spirit-ui.ir trees. Unlike cloud-murakumo's
  dom.cljs (which calls `(.replaceChildren root (render-node! tree))` on
  every state change — full subtree rebuild), this patches only what
  changed: attribute diffing, keyed child reconciliation with node
  reuse+reorder, and a persistent-listener event-handling scheme (one native
  addEventListener per DOM node per event type; the listener reads whatever
  action-spec is CURRENTLY stored on the node, so re-renders that change a
  handler never need to add/removeEventListener).")

;; ---------- events ----------

(def ^:private target-extractors
  {:target/value (fn [^js e] (.. e -target -value))
   :target/checked (fn [^js e] (.. e -target -checked))
   :target/int (fn [^js e] (js/parseInt (.. e -target -value) 10))
   :target/float (fn [^js e] (js/parseFloat (.. e -target -value)))})

(defn- resolve-event-action
  "If action-spec is a vector ending in a recognized :target/* keyword,
  replace that keyword with the extracted event value; otherwise dispatch
  action-spec unchanged."
  [action-spec ^js event]
  (if (and (vector? action-spec) (contains? target-extractors (peek action-spec)))
    (conj (pop action-spec) ((target-extractors (peek action-spec)) event))
    action-spec))

(defn- handlers-slot [^js dom-node]
  (or (unchecked-get dom-node "spiritHandlers")
      (let [h (js-obj)] (unchecked-set dom-node "spiritHandlers" h) h)))

(defn- set-event-handler!
  "action-spec may be wrapped `[:prevent-default! inner-spec]` — generic
  escape hatch (not routing-specific) for SPA nav links / form submits that
  must not trigger the browser's native navigation/submit."
  [^js dom-node event-name action-spec dispatch!]
  (let [handlers (handlers-slot dom-node)
        bound-key (str "bound_" (name event-name))]
    (unchecked-set handlers (name event-name) action-spec)
    (when-not (unchecked-get handlers bound-key)
      (unchecked-set handlers bound-key true)
      (.addEventListener dom-node (name event-name)
        (fn [e]
          (when-let [spec (unchecked-get (handlers-slot dom-node) (name event-name))]
            (let [prevent? (and (vector? spec) (= :prevent-default! (first spec)))
                  spec (if prevent? (second spec) spec)]
              (when prevent? (.preventDefault e))
              (dispatch! (resolve-event-action spec e)))))))))

(defn- remove-event-handler! [^js dom-node event-name]
  (unchecked-set (handlers-slot dom-node) (name event-name) nil))

;; ---------- attributes ----------

(def ^:private prop-keys #{:value :checked :disabled :selected})

(defn- set-attr! [^js dom-node k v]
  (cond
    (= k :value) (when (not= (.-value dom-node) v) (set! (.-value dom-node) (str v)))
    (= k :checked) (set! (.-checked dom-node) (boolean v))
    (= k :disabled) (set! (.-disabled dom-node) (boolean v))
    (= k :selected) (set! (.-selected dom-node) (boolean v))
    (nil? v) (.removeAttribute dom-node (name k))
    (false? v) (.removeAttribute dom-node (name k))
    (true? v) (.setAttribute dom-node (name k) "")
    :else (.setAttribute dom-node (name k) (str v))))

(defn- remove-attr! [^js dom-node k]
  (if (contains? prop-keys k)
    (set-attr! dom-node k (if (= k :value) "" false))
    (.removeAttribute dom-node (name k))))

(defn- diff-attrs! [^js dom-node old-attrs new-attrs dispatch!]
  (let [old-on (:ui/on old-attrs)
        new-on (:ui/on new-attrs)
        old-plain (dissoc old-attrs :ui/on)
        new-plain (dissoc new-attrs :ui/on)]
    (doseq [[k v] new-plain]
      (when (not= (get old-plain k) v) (set-attr! dom-node k v)))
    (doseq [k (keys old-plain)]
      (when-not (contains? new-plain k) (remove-attr! dom-node k)))
    (doseq [[event-name action-spec] new-on]
      (set-event-handler! dom-node event-name action-spec dispatch!))
    (doseq [event-name (keys old-on)]
      (when-not (contains? new-on event-name) (remove-event-handler! dom-node event-name)))))

;; ---------- create / patch ----------

(defn- ir-text? [v] (or (string? v) (number? v)))

(defn- create-dom! [ir dispatch!]
  (cond
    (nil? ir) nil
    (ir-text? ir) (js/document.createTextNode (str ir))
    :else
    (let [{:ui/keys [tag attrs children]} ir
          ^js node (js/document.createElement (name tag))]
      (diff-attrs! node {} attrs dispatch!)
      (doseq [child children]
        (when-let [child-node (create-dom! child dispatch!)]
          (.appendChild node child-node)))
      node)))

(defn- child-key [ir idx]
  (if (and (map? ir) (some? (:ui/key ir))) (:ui/key ir) idx))

(declare patch!)

(defn- reorder!
  "Ensure parent's children appear in `ordered-nodes` order, moving existing
  nodes (insertBefore on an already-attached node relocates it) rather than
  recreating them."
  [^js parent-node ordered-nodes]
  (loop [prev nil nodes (seq ordered-nodes)]
    (when nodes
      (let [^js node (first nodes)]
        (when node
          (let [^js expected-after (if prev (.-nextSibling prev) (.-firstChild parent-node))]
            (when (not= expected-after node)
              (.insertBefore parent-node node expected-after))))
        (recur (if node node prev) (next nodes))))))

(defn- patch-children! [^js parent-node old-children new-children dispatch!]
  (let [dom-nodes (vec (array-seq (.-childNodes parent-node)))
        old-map (into {}
                       (map-indexed (fn [i c] [(child-key c i) {:ir c :node (nth dom-nodes i nil)}]))
                       old-children)
        used (volatile! #{})
        new-nodes
        (mapv (fn [idx new-ir]
                (let [k (child-key new-ir idx)
                      match (get old-map k)]
                  (if match
                    (do (vswap! used conj k)
                        (patch! (:node match) (:ir match) new-ir dispatch!))
                    (create-dom! new-ir dispatch!))))
              (range) new-children)]
    (doseq [[k {:keys [node]}] old-map]
      (when (and node (not (contains? @used k)))
        (.remove node)))
    (reorder! parent-node new-nodes)))

(defn patch!
  "Reconcile `dom-node` (currently rendering `old-ir`) to render `new-ir`.
  Returns the DOM node now representing `new-ir` (may be a different node
  than `dom-node` if the tag/text-vs-element type changed — the old node is
  removed/replaced in place, so callers never need to re-attach the result
  themselves unless dom-node was never attached)."
  [dom-node old-ir new-ir dispatch!]
  (cond
    (nil? new-ir)
    (do (when dom-node (.remove dom-node)) nil)

    (nil? old-ir)
    (create-dom! new-ir dispatch!)

    (or (ir-text? old-ir) (ir-text? new-ir))
    (if (and (ir-text? old-ir) (ir-text? new-ir))
      (do (when (not= (str old-ir) (str new-ir)) (set! (.-nodeValue dom-node) (str new-ir)))
          dom-node)
      (let [^js new-node (create-dom! new-ir dispatch!)]
        (when (and dom-node (.-parentNode dom-node)) (.replaceWith dom-node new-node))
        new-node))

    (not= (:ui/tag old-ir) (:ui/tag new-ir))
    (let [^js new-node (create-dom! new-ir dispatch!)]
      (when (and dom-node (.-parentNode dom-node)) (.replaceWith dom-node new-node))
      new-node)

    :else
    (do
      (diff-attrs! dom-node (:ui/attrs old-ir) (:ui/attrs new-ir) dispatch!)
      (patch-children! dom-node (:ui/children old-ir) (:ui/children new-ir) dispatch!)
      dom-node)))

(defn mount!
  "root-el: real DOM element to mount into.
  render-fn: (fn [state]) -> ir-tree.
  state-atom: re-renders (diffing against the previous tree) on every change.
  dispatch!: (fn [action]) called by :ui/on event handlers."
  [root-el render-fn state-atom dispatch!]
  (let [prev-ir (volatile! nil)
        prev-node (volatile! nil)]
    (letfn [(render! [state]
              (let [new-ir (render-fn state)]
                (if @prev-node
                  (vreset! prev-node (patch! @prev-node @prev-ir new-ir dispatch!))
                  (let [node (create-dom! new-ir dispatch!)]
                    (.appendChild root-el node)
                    (vreset! prev-node node)))
                (vreset! prev-ir new-ir)))]
      (render! @state-atom)
      (add-watch state-atom ::render (fn [_ _ _ new-state] (render! new-state))))))
