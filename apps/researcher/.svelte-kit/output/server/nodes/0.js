

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const universal = {
  "prerender": true,
  "ssr": false,
  "trailingSlash": "always"
};
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.Bk4EYbb7.js","_app/immutable/chunks/nHswCQZx.js","_app/immutable/chunks/DEpBLujf.js","_app/immutable/chunks/X85b30ev.js","_app/immutable/chunks/BOZeZj-W.js","_app/immutable/chunks/Di-glOuo.js","_app/immutable/chunks/BUNe9wIg.js","_app/immutable/chunks/DS5k_dA6.js","_app/immutable/chunks/DJ75HRMa.js","_app/immutable/chunks/LO8wr3KC.js","_app/immutable/chunks/BJra4_d6.js","_app/immutable/chunks/CBdA3llX.js","_app/immutable/chunks/O9-cXlKV.js","_app/immutable/chunks/BSCKDS0b.js"];
export const stylesheets = ["_app/immutable/assets/0.dKp5w91h.css"];
export const fonts = [];
