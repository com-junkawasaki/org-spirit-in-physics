

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const universal = {
  "prerender": true,
  "ssr": false,
  "trailingSlash": "always"
};
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.CFp42BQS.js","_app/immutable/chunks/BfDzqXj_.js","_app/immutable/chunks/C46-1ezO.js","_app/immutable/chunks/Bdl2G0I9.js","_app/immutable/chunks/BLy-Tr7m.js","_app/immutable/chunks/Dim4MYaz.js","_app/immutable/chunks/rbctuFTU.js","_app/immutable/chunks/BcvqufFC.js","_app/immutable/chunks/BWE5czp6.js","_app/immutable/chunks/VRhKX6pk.js","_app/immutable/chunks/DKCXyJPO.js","_app/immutable/chunks/CuA6SRQi.js","_app/immutable/chunks/CrPo3IqN.js","_app/immutable/chunks/BSCKDS0b.js"];
export const stylesheets = ["_app/immutable/assets/0.Bc4PcNEr.css"];
export const fonts = [];
