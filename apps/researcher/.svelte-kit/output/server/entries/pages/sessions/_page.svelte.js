import { h as head } from "../../../chunks/index.js";
import "../../../chunks/env.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    head("98wg7q", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Sessions | Researcher Dashboard</title>`);
      });
    });
    $$renderer2.push(`<div class="page-container svelte-98wg7q">`);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p>Loading sessions...</p>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
