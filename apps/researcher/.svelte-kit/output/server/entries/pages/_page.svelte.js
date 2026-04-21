import { i as escape_html } from "../../chunks/context.js";
import "d3";
import "../../chunks/TimelineVisualization.svelte_svelte_type_style_lang.js";
import "../../chunks/env.svelte.js";
import { l as loading_data } from "../../chunks/messages.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<div class="analyzer-page svelte-1uha8ag">`);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="loading-state svelte-1uha8ag"><div class="spinner svelte-1uha8ag"></div> <p>${escape_html(loading_data())}</p></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
