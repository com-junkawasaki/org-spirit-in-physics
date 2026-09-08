(ns spirit-ui.router
  "History-API routing with path params (e.g. \"/participants/:id\").
  Unlike cloud-murakumo's router (hash-based, 3 flat routes, no params),
  this supports the dynamic segment the original SvelteKit tree has
  (`researcher/participants/[id]`) via plain path matching + pushState.

  The pure matching functions (split-path/match-route) are .cljc and unit
  tested without a browser; the History-API glue (current-path!/navigate!/
  on-route-change!/init!) touches js/window and only runs in cljs."
  (:require [kotoba.lang.text :as str]))

;; ---------- pure matching ----------

(defn split-path [path]
  (into [] (remove empty?) (str/split path #"/")))

(defn- segment-pattern [segment]
  (if (str/starts-with? segment ":")
    {:param (keyword (subs segment 1))}
    {:literal segment}))

(defn compile-route
  "name: a keyword identifying the route. pattern: a path template like
  \"/participants/:id\". -> {:name :pattern :segments [...]}."
  [name pattern]
  {:name name :pattern pattern :segments (mapv segment-pattern (split-path pattern))})

(def ^:private no-match ::no-match)

(defn- match-segments [pattern-segments path-segments]
  (if (not= (count pattern-segments) (count path-segments))
    no-match
    (reduce (fn [params [pseg pathseg]]
              (cond
                (:param pseg) (assoc params (:param pseg) pathseg)
                (= (:literal pseg) pathseg) params
                :else (reduced no-match)))
            {} (map vector pattern-segments path-segments))))

(defn match-route
  "routes: a seq of compile-route results, checked in order (first match
  wins — put more specific/literal routes before params that could shadow
  them). -> {:route route :params {...}} or nil."
  [routes path]
  (let [path-segs (split-path path)]
    (reduce (fn [_ route]
              (let [m (match-segments (:segments route) path-segs)]
                (when-not (= m no-match)
                  (reduced {:route route :params m}))))
            nil routes)))

;; ---------- History API glue (cljs runtime only) ----------

#?(:cljs
   (do
     (defn current-path []
       (.. js/window -location -pathname))

     (defonce ^:private listeners (atom []))

     (defn on-route-change!
       "f: (fn [path]) called on every navigation (pushState or back/forward)."
       [f]
       (swap! listeners conj f))

     (defn- notify! [path]
       (doseq [f @listeners] (f path)))

     (defn navigate!
       "Push a new path onto history and notify listeners (no full page load).
       CALLER GOTCHA: `notify!` synchronously calls every `on-route-change!`
       listener, which typically calls `state/dispatch!` with an action
       vector — if THIS function is itself called synchronously from inside
       a spirit-ui.state registered handler (which dispatch! wraps in
       swap!), that nested dispatch! gets clobbered by the outer swap!
       completing with stale state (see spirit-ui.state's dispatch!
       docstring GOTCHA). Callers inside a registered handler MUST wrap this
       call in `state/defer!` — see web_main.cljc/researcher_main.cljc's
       :navigate handlers for the pattern."
       [path]
       (when (not= path (current-path))
         (.pushState js/history nil "" path))
       (notify! path))

     (defn replace!
       "Like navigate! but replaces the current history entry (no back-button
       stop) — for redirects, e.g. post-login. Same `state/defer!` GOTCHA as
       navigate! applies (currently unused/dead code in this PR, so it has
       never needed the wrapper — but a future caller from inside a
       registered handler will reproduce the bug navigate! had until it was
       fixed)."
       [path]
       (.replaceState js/history nil "" path)
       (notify! path))

     (defn init!
       "Wire up popstate (back/forward) and fire an initial route-change for
       the current URL. Call once at app startup, after on-route-change!
       listeners are registered."
       []
       (.addEventListener js/window "popstate" (fn [_] (notify! (current-path))))
       (notify! (current-path)))))
