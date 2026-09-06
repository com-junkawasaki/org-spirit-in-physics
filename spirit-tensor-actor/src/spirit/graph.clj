(ns spirit.graph
  "langgraph-clj StateGraph that casts 'spirit' into physics as a vector space +
  tensor network, computed from the real CSV / measurement data.

  Pipeline (one node per stage; numeric backend = scripts/spirit_tensor.py):

    load -> tensorize -> spectral -> tucker -> analyze

  The heavy linear algebra lives in the Python sidecar (numpy); each node shells
  out, threads the shared JSON state file, and merges the stage's EDN summary
  into the :results channel. Checkpointed via langgraph.checkpoint so the run is
  auditable and resumable (actor pattern: bounded run, state on a ledger).

  JVM-only: each stage shells out to a Python numpy sidecar via
  `clojure.java.shell/sh` and reads back a state file via
  `clojure.java.io`. kotoba-lang/shell's connector is a framed one-value IPC
  boundary (invoke! returns a decoded value, not sh's {:exit :out :err}) and
  its sidecar namespace is a companion-process manifest — neither is a
  faithful replacement for this "run python, take the last EDN line of stdout"
  pattern. kotoba.lang.fs is capability root-confined and its read returns a
  UTF-8 String, so the JSON state file here stays on java.io. This is a
  JVM-only langgraph-clj research pipeline; there is no kotoba-lang head for
  it yet."
  (:require [langgraph.graph :as g]
            [langgraph.checkpoint :as cp]
            [kotoba.lang.process :as proc]
            [clojure.edn :as edn]
            [clojure.string :as str]
            [clojure.java.io :as io]))

(def py     (or (System/getenv "SPIRIT_PY") "python3"))
(def script (or (System/getenv "SPIRIT_SCRIPT") "scripts/spirit_tensor.py"))
(def root   (or (System/getenv "SPIRIT_ROOT") "."))

(defn run-stage
  "Invoke one numeric stage; return its summary map (parsed from the EDN line)."
  [stage statefile]
  (let [{:keys [status stdout stderr]} (proc/exec [py script stage statefile root])]
    (when-not (zero? status)
      (throw (ex-info (str "stage " stage " failed (exit " status ")")
                      {:stage stage :err stderr})))
    (let [line (->> (str/split-lines stdout) (remove str/blank?) last)]
      (:summary (edn/read-string line)))))

(defn stage-node [stage]
  (fn [{:keys [statefile]}]
    (let [summary (run-stage stage statefile)]
      (println "  [node]" stage "->" (count summary) "keys")
      {:log     [stage]
       :results summary})))

(defn build [statefile]
  (-> (g/state-graph {:channels {:statefile {:default statefile}
                                 :log       {:reducer (fnil into []) :default []}
                                 :results   {:reducer merge :default {}}}})
      (g/add-node :load      (stage-node "load"))
      (g/add-node :tensorize (stage-node "tensorize"))
      (g/add-node :spectral  (stage-node "spectral"))
      (g/add-node :tucker    (stage-node "tucker"))
      (g/add-node :analyze    (stage-node "analyze"))
      (g/add-node :infothermo (stage-node "infothermo"))
      (g/set-entry-point :load)
      (g/add-edge :load      :tensorize)
      (g/add-edge :tensorize :spectral)
      (g/add-edge :spectral  :tucker)
      (g/add-edge :tucker    :analyze)
      (g/add-edge :analyze   :infothermo)
      (g/set-finish-point :infothermo)
      (g/compile-graph {:checkpointer (cp/mem-checkpointer)})))

(defn -main [& args]
  (let [statefile (or (first args) "/tmp/spirit_state.json")]
    (io/delete-file statefile true)
    (println "=== Spirit-in-Physics :: tensor/vector-space analysis via langgraph-clj ===")
    (let [actor (build statefile)
          final (g/invoke actor {:statefile statefile} {:thread-id "spirit-1"})
          r     (:results final)]
      (println)
      (println "graph path :" (:log final))
      (println "participants:" (:n_participants r) " shared words:" (:n_words r)
               " tensor:" (:tensor_shape r) " features:" (:features r))
      (println "Laplacian eigenvalues[:6]:" (mapv #(Double/parseDouble (format "%.3f" %))
                                                  (take 6 (:laplacian_eigenvalues r))))
      (println "spectral gap (lambda2 - lambda1):" (format "%.4f" (:spectral_gap r)))
      (println "participation ratio (effective modes):" (format "%.2f" (:participation_ratio r)))
      (println "Tucker ranks:" (:tucker_ranks r)
               " explained variance:" (format "%.3f" (:tucker_explained_var r)))
      (println "attractor   (low-E)  words:" (str/join " " (:attractor_words r)))
      (println "interference(high-E) words:" (str/join " " (:interference_words r)))
      (println "--- information-thermodynamics (surprisal/processing cost vs physiological cost) ---")
      (println "within-subject r(latency,dSP) Fisher-mean:" (format "%.3f" (:it_fisher_mean_r r))
               " pooled-within-z:" (format "%.3f" (:it_pooled_withinz_r r)))
      (println "mutual info I(RT;dSP) nats:" (format "%.4f" (:it_mutual_info_nats r)))
      (println "mean dSP  low-energy:" (format "%.4f" (:it_cost_low_energy_meanSP r))
               "  high-energy:" (format "%.4f" (:it_cost_high_energy_meanSP r))
               "  ratio:" (format "%.3f" (:it_cost_ratio_high_over_low r)))
      (shutdown-agents))))
