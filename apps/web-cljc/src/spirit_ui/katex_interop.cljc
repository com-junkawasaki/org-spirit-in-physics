(ns spirit-ui.katex-interop
  "Interop wrap for katex's auto-render contrib module, mirroring
  api-client.cljc's @simplewebauthn wrap (ADR-2606290000 exemption clause:
  TS-only libraries are interop-wrapped, not reimplemented). katex.min.css +
  its woff2 fonts are copied into public/web/katex/ (see package.json's
  `postinstall`); this namespace only drives the JS render call."
  (:require ["katex/dist/contrib/auto-render.mjs" :default renderMathInElement]))

(defn render-math-in!
  "Scans `el` (a real DOM element) for $...$/$$...$$/\\(...\\)/\\[...\\]
  delimited LaTeX and replaces each match in place with rendered markup.
  Matches PaperView.svelte's onMount delimiters/throwOnError config exactly."
  [^js el]
  (when el
    (renderMathInElement el
      #js {:delimiters #js [#js {:left "$$" :right "$$" :display true}
                             #js {:left "\\[" :right "\\]" :display true}
                             #js {:left "$" :right "$" :display false}
                             #js {:left "\\(" :right "\\)" :display false}]
           :throwOnError false})))
