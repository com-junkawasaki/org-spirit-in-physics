

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const universal = {
  "prerender": true,
  "ssr": false,
  "trailingSlash": "always"
};
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.C1w6w8WK.js","_app/immutable/chunks/D5qc3Ll_.js","_app/immutable/chunks/Cjdl2KBY.js","_app/immutable/chunks/B_F8-sC1.js","_app/immutable/chunks/C6GoI_NV.js","_app/immutable/chunks/Bootf8az.js","_app/immutable/chunks/DrshIYFJ.js","_app/immutable/chunks/BY_Gcec3.js","_app/immutable/chunks/D16Edq2H.js","_app/immutable/chunks/CWRW4yL0.js","_app/immutable/chunks/CO8SiW_b.js","_app/immutable/chunks/DeSrDAbH.js","_app/immutable/chunks/CrPo3IqN.js","_app/immutable/chunks/BSCKDS0b.js"];
export const stylesheets = ["_app/immutable/assets/0.Bc4PcNEr.css"];
export const fonts = [];
