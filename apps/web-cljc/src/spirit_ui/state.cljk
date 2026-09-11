(ns spirit-ui.state
  "App-wide state atom + a single dispatch fn routing actions to registered
  pure reducer functions (extends cloud-murakumo's single-atom + one giant
  `case` core.cljs with a registry, so each views/* namespace can register
  its own handlers instead of one god-file growing unbounded).

  Async work (API calls) goes through the same dispatch! as a thunk: a plain
  function `(fn [state dispatch!] ...)` instead of an action vector — it runs
  once, does not itself update state, and calls dispatch! again with the
  result when ready (classic redux-thunk shape).

  GOTCHA: a registered handler must NEVER synchronously trigger another
  dispatch! of an action vector (only thunks, or deferred via `defer!`).
  `dispatch!` wraps action-vector handlers in `swap!`; ClojureScript's
  `swap!` is `(reset! atom (f @atom args))` with no CAS/retry (JS is
  single-threaded, so none is needed) — a NESTED synchronous swap! from
  inside another swap!'s function body completes and updates the atom, but
  then the OUTER swap! finishes by resetting the atom to ITS OWN return
  value, computed from the STALE state it started with — silently
  overwriting whatever the nested dispatch just did. Symptom actually hit
  during Phase 2 browser verification: a :navigate handler that called
  `router/navigate!` (which synchronously fires `notify!` ->
  `dispatch! [:route-changed ...]`) changed the URL via pushState but the
  rendered page never updated, because the outer :navigate swap! immediately
  clobbered the :route key the inner route-changed swap! had just set. Fix:
  use `defer!` (or a thunk, or an async/Promise boundary) so the nested
  dispatch runs in a later task, after the outer swap! has fully returned.")

(defonce app-state (atom {}))

(defonce ^:private handlers (atom {}))

(defn register-handler!
  "action-key: the keyword at the head of an action vector, e.g. :navigate.
  handler-fn: (fn [state & args] new-state) — pure, called with current state
  and the action's remaining args, must return the new state."
  [action-key handler-fn]
  (swap! handlers assoc action-key handler-fn))

(defn defer!
  "Run `f` (a no-arg fn, typically `#(dispatch! ...)` or a side effect like
  `router/navigate!`) after the current dispatch!/swap! call stack has fully
  unwound — see the GOTCHA above. A thin, named wrapper around
  `js/setTimeout ... 0` so call sites document intent instead of sprinkling
  bare setTimeout calls."
  [f]
  #?(:cljs (js/setTimeout f 0)
     :clj (f)))

(defn dispatch!
  "action: a vector [action-key & args], a bare keyword (no args), or a thunk
  fn (state dispatch!) for async/side-effecting work."
  [action]
  (if (fn? action)
    (action @app-state dispatch!)
    (let [[k & args] (if (vector? action) action [action])]
      (if-let [f (get @handlers k)]
        (swap! app-state (fn [s] (apply f s args)))
        #?(:cljs (js/console.warn "spirit-ui.state: no handler for" (pr-str k))
           :clj (println "spirit-ui.state: no handler for" (pr-str k)))))))
