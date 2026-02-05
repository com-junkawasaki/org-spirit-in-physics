export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.CL5GGHvL.js",app:"_app/immutable/entry/app.C5_SKyj-.js",imports:["_app/immutable/entry/start.CL5GGHvL.js","_app/immutable/chunks/BJra4_d6.js","_app/immutable/chunks/DEpBLujf.js","_app/immutable/chunks/DS5k_dA6.js","_app/immutable/entry/app.C5_SKyj-.js","_app/immutable/chunks/DEpBLujf.js","_app/immutable/chunks/X85b30ev.js","_app/immutable/chunks/nHswCQZx.js","_app/immutable/chunks/DS5k_dA6.js","_app/immutable/chunks/Di-glOuo.js","_app/immutable/chunks/Cit7x81O.js","_app/immutable/chunks/DJ75HRMa.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:true},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js'))
		],
		remotes: {
			
		},
		routes: [
			
		],
		prerendered_routes: new Set(["/","/participants/","/sessions/","/settings/"]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
