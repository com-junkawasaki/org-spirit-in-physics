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
		client: {start:"_app/immutable/entry/start.CPcFImPi.js",app:"_app/immutable/entry/app.B--ZULvD.js",imports:["_app/immutable/entry/start.CPcFImPi.js","_app/immutable/chunks/CO8SiW_b.js","_app/immutable/chunks/Cjdl2KBY.js","_app/immutable/chunks/BY_Gcec3.js","_app/immutable/entry/app.B--ZULvD.js","_app/immutable/chunks/Cjdl2KBY.js","_app/immutable/chunks/B_F8-sC1.js","_app/immutable/chunks/D5qc3Ll_.js","_app/immutable/chunks/BY_Gcec3.js","_app/immutable/chunks/Bootf8az.js","_app/immutable/chunks/DJrl-gaL.js","_app/immutable/chunks/D16Edq2H.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:true},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/participants",
				pattern: /^\/participants\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/participants/[id]",
				pattern: /^\/participants\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/sessions",
				pattern: /^\/sessions\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/settings",
				pattern: /^\/settings\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
