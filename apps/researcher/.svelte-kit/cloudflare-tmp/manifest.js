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
		client: {start:"_app/immutable/entry/start.dxK6VqaB.js",app:"_app/immutable/entry/app.CZr-X_d5.js",imports:["_app/immutable/entry/start.dxK6VqaB.js","_app/immutable/chunks/CuA6SRQi.js","_app/immutable/chunks/C46-1ezO.js","_app/immutable/chunks/BcvqufFC.js","_app/immutable/entry/app.CZr-X_d5.js","_app/immutable/chunks/C46-1ezO.js","_app/immutable/chunks/Bdl2G0I9.js","_app/immutable/chunks/BfDzqXj_.js","_app/immutable/chunks/BcvqufFC.js","_app/immutable/chunks/Dim4MYaz.js","_app/immutable/chunks/DyhJgU3m.js","_app/immutable/chunks/BWE5czp6.js","_app/immutable/chunks/VRhKX6pk.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:true},
		nodes: [
			__memo(() => import('../output/server/nodes/0.js')),
			__memo(() => import('../output/server/nodes/1.js'))
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

export const prerendered = new Set(["/","/participants/","/sessions/","/settings/"]);

export const base_path = "";
