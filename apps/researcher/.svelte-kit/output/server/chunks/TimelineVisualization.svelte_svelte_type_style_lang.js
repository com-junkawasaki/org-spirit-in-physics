import * as THREE from "three";
import { REVISION, DefaultLoadingManager, Vector3, Sphere, Matrix4, Ray, Object3D, Vector2, Box3, UniformsLib, ShaderLib, UniformsUtils, Vector4, Line3, Mesh, ShaderChunk, OrthographicCamera, BufferGeometry, Float32BufferAttribute, MeshBasicMaterial } from "three";
import { g as get, w as writable, d as derived } from "./index2.js";
import { f as bind_props } from "./index.js";
import { h as getContext, s as setContext } from "./context.js";
function fromStore(store) {
  if ("set" in store) {
    return {
      get current() {
        return get(store);
      },
      set current(v) {
        store.set(v);
      }
    };
  }
  return {
    get current() {
      return get(store);
    }
  };
}
const signal = /* @__PURE__ */ Symbol();
const isStore = (dep) => {
  return typeof dep?.subscribe === "function";
};
const runObserve = (dependencies, callback, pre) => {
  const stores = dependencies().map((d) => {
    if (isStore(d)) {
      return fromStore(d);
    }
    return signal;
  });
  dependencies().map((d, i) => {
    if (stores[i] === signal) return d;
    return stores[i].current;
  });
};
const observePost = (dependencies, callback) => {
  return runObserve(dependencies);
};
const observePre = (dependencies, callback) => {
  return runObserve(dependencies);
};
Object.assign(observePost, { pre: observePre });
REVISION.replace("dev", "");
const currentWritable = (value) => {
  const store = writable(value);
  const extendedWritable = {
    set: (value2) => {
      extendedWritable.current = value2;
      store.set(value2);
    },
    subscribe: store.subscribe,
    update: (fn) => {
      const newValue = fn(extendedWritable.current);
      extendedWritable.current = newValue;
      store.set(newValue);
    },
    current: value
  };
  return extendedWritable;
};
const resolvePropertyPath = (target, propertyPath) => {
  if (propertyPath.includes(".")) {
    const path = propertyPath.split(".");
    const key = path.pop();
    for (let i = 0; i < path.length; i += 1) {
      target = target[path[i]];
    }
    return {
      target,
      key
    };
  } else {
    return {
      target,
      key: propertyPath
    };
  }
};
const useDOM = () => {
  const context = getContext("threlte-dom-context");
  if (!context) {
    throw new Error("useDOM can only be used in a child component to <Canvas>.");
  }
  return context;
};
const useScheduler = () => {
  const context = getContext("threlte-scheduler-context");
  if (!context) {
    throw new Error("useScheduler can only be used in a child component to <Canvas>.");
  }
  return context;
};
const useCamera = () => {
  const context = getContext("threlte-camera-context");
  if (!context) {
    throw new Error("useCamera can only be used in a child component to <Canvas>.");
  }
  return context;
};
const parentContextKey = /* @__PURE__ */ Symbol("threlte-parent-context");
const createParentContext = (parent) => {
  const ctx = currentWritable(parent);
  setContext(parentContextKey, ctx);
  return ctx;
};
const useParent = () => {
  const parent = getContext(parentContextKey);
  return parent;
};
const parentObject3DContextKey = /* @__PURE__ */ Symbol("threlte-parent-object3d-context");
const createParentObject3DContext = (object) => {
  const parentObject3D = getContext(parentObject3DContextKey);
  const object3D = writable(object);
  const ctx = derived([object3D, parentObject3D], ([object3D2, parentObject3D2]) => {
    return object3D2 ?? parentObject3D2;
  });
  setContext(parentObject3DContextKey, ctx);
  return object3D;
};
const useParentObject3D = () => {
  return getContext(parentObject3DContextKey);
};
const useScene = () => {
  const context = getContext("threlte-scene-context");
  if (!context) {
    throw new Error("useScene can only be used in a child component to <Canvas>.");
  }
  return context;
};
const useRenderer = () => {
  const context = getContext("threlte-renderer-context");
  if (!context) {
    throw new Error("useRenderer can only be used in a child component to <Canvas>.");
  }
  return context;
};
const useThrelte = () => {
  const schedulerCtx = useScheduler();
  const rendererCtx = useRenderer();
  const cameraCtx = useCamera();
  const sceneCtx = useScene();
  const domCtx = useDOM();
  const context = {
    advance: schedulerCtx.advance,
    autoRender: schedulerCtx.autoRender,
    autoRenderTask: rendererCtx.autoRenderTask,
    camera: cameraCtx.camera,
    colorManagementEnabled: rendererCtx.colorManagementEnabled,
    colorSpace: rendererCtx.colorSpace,
    dpr: rendererCtx.dpr,
    invalidate: schedulerCtx.invalidate,
    mainStage: schedulerCtx.mainStage,
    renderer: rendererCtx.renderer,
    renderMode: schedulerCtx.renderMode,
    renderStage: schedulerCtx.renderStage,
    scheduler: schedulerCtx.scheduler,
    shadows: rendererCtx.shadows,
    shouldRender: schedulerCtx.shouldRender,
    dom: domCtx.dom,
    canvas: domCtx.canvas,
    size: domCtx.size,
    toneMapping: rendererCtx.toneMapping,
    get scene() {
      return sceneCtx.scene;
    },
    set scene(scene) {
      sceneCtx.scene = scene;
    }
  };
  return context;
};
const useAttach = (getRef, getAttach) => {
  const { invalidate } = useThrelte();
  fromStore(useParent());
  fromStore(useParentObject3D());
  createParentContext();
  createParentObject3DContext();
};
const contextName = /* @__PURE__ */ Symbol("threlte-disposable-object-context");
const useSetDispose = (getDispose) => {
  const parentDispose = getContext(contextName);
  const mergedDispose = getDispose() ?? parentDispose?.() ?? true;
  setContext(contextName, () => mergedDispose);
};
const useEvents = (getRef, propKeys, props) => {
  for (const key of propKeys) {
    props[key];
    if (key.startsWith("on")) ;
  }
};
let currentIs;
const setIs = (is) => {
  currentIs = is;
};
const useIs = () => {
  const is = currentIs;
  currentIs = void 0;
  return is;
};
const pluginContextKey = "threlte-plugin-context";
const usePlugins = (args) => {
  const plugins = getContext(pluginContextKey);
  if (!plugins)
    return;
  const pluginsProps = [];
  const pluginsArray = Object.values(plugins);
  if (pluginsArray.length > 0) {
    const pluginArgs = args();
    for (let i = 0; i < pluginsArray.length; i++) {
      const plugin = pluginsArray[i];
      const p = plugin(pluginArgs);
      if (p && p.pluginProps) {
        pluginsProps.push(...p.pluginProps);
      }
    }
  }
  return {
    pluginsProps
  };
};
const ignoredProps = /* @__PURE__ */ new Set(["$$scope", "$$slots", "type", "args", "attach", "instance"]);
const updateProjectionMatrixKeys = /* @__PURE__ */ new Set([
  "fov",
  "aspect",
  "near",
  "far",
  "left",
  "right",
  "top",
  "bottom",
  "zoom"
]);
const memoizeProp = (value) => {
  if (typeof value === "string")
    return true;
  if (typeof value === "number")
    return true;
  if (typeof value === "boolean")
    return true;
  if (typeof value === "undefined")
    return true;
  if (value === null)
    return true;
  return false;
};
const createSetter = (target, key, value) => {
  if (!Array.isArray(value) && typeof value === "number" && typeof target[key] === "object" && target[key] !== null && typeof target[key]?.setScalar === "function" && // colors do have a setScalar function, but we don't want to use it, because
  // the hex notation (i.e. 0xff0000) is very popular and matches the number
  // type. So we exclude colors here.
  !target[key]?.isColor) {
    return (target2, key2, value2) => {
      target2[key2].setScalar(value2);
    };
  } else {
    if (typeof target[key]?.set === "function" && typeof target[key] === "object" && target[key] !== null) {
      if (Array.isArray(value)) {
        return (target2, key2, value2) => {
          target2[key2].set(...value2);
        };
      } else {
        return (target2, key2, value2) => {
          target2[key2].set(value2);
        };
      }
    } else {
      return (target2, key2, value2) => {
        target2[key2] = value2;
      };
    }
  }
};
const useProps = () => {
  const { invalidate } = useThrelte();
  const memoizedProps = /* @__PURE__ */ new Map();
  const memoizedSetters = /* @__PURE__ */ new Map();
  const setProp = (instance, propertyPath, value, manualCamera) => {
    if (memoizeProp(value)) {
      const memoizedProp = memoizedProps.get(propertyPath);
      if (memoizedProp && memoizedProp.instance === instance && memoizedProp.value === value) {
        return;
      }
      memoizedProps.set(propertyPath, {
        instance,
        value
      });
    }
    const { key, target } = resolvePropertyPath(instance, propertyPath);
    if (value !== void 0 && value !== null) {
      const memoizedSetter = memoizedSetters.get(propertyPath);
      if (memoizedSetter) {
        memoizedSetter(target, key, value);
      } else {
        const setter = createSetter(target, key, value);
        memoizedSetters.set(propertyPath, setter);
        setter(target, key, value);
      }
    } else {
      createSetter(target, key, value)(target, key, value);
    }
    if (manualCamera)
      return;
    if (updateProjectionMatrixKeys.has(key) && (target.isPerspectiveCamera || target.isOrthographicCamera)) {
      target.updateProjectionMatrix();
    }
  };
  const updateProp = (instance, key, value, pluginsProps, manualCamera) => {
    if (!ignoredProps.has(key) && !pluginsProps?.includes(key)) {
      setProp(instance, key, value, manualCamera);
    }
    invalidate();
  };
  return {
    updateProp
  };
};
const isClass = (input) => {
  return typeof input === "function" && Function.prototype.toString.call(input).startsWith("class ");
};
const determineRef = (is, args) => {
  if (isClass(is)) {
    if (Array.isArray(args)) {
      return new is(...args);
    } else {
      return new is();
    }
  }
  return is;
};
function T($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      is = useIs(),
      args,
      attach,
      manual = false,
      makeDefault = false,
      dispose,
      ref = void 0,
      oncreate,
      children,
      $$slots,
      $$events,
      ...props
    } = $$props;
    const internalRef = determineRef(is, args);
    usePlugins(() => ({
      get ref() {
        return internalRef;
      },
      get args() {
        return args;
      },
      get attach() {
        return attach;
      },
      get manual() {
        return manual;
      },
      get makeDefault() {
        return makeDefault;
      },
      get dispose() {
        return dispose;
      },
      get props() {
        return props;
      }
    }));
    const propKeys = Object.keys(props);
    useProps();
    propKeys.forEach((key) => {
      props[key];
    });
    useAttach();
    useSetDispose(() => dispose);
    useEvents(() => internalRef, propKeys, props);
    children?.($$renderer2, { ref: internalRef });
    $$renderer2.push(`<!---->`);
    bind_props($$props, { ref });
  });
}
const catalogue = {};
new Proxy(T, {
  get(_target, is) {
    if (typeof is !== "string") {
      return T;
    }
    const module = catalogue[is] || THREE[is];
    if (module === void 0) {
      throw new Error(`No Three.js module found for ${is}. Did you forget to extend the catalogue?`);
    }
    setIs(module);
    return T;
  }
});
const toCurrentReadable = (store) => {
  return {
    subscribe: store.subscribe,
    get current() {
      return store.current;
    }
  };
};
let previousTotalLoaded = 0;
const finishedOnce = currentWritable(false);
const activeStore = currentWritable(false);
const itemStore = currentWritable(void 0);
const loadedStore = currentWritable(0);
const totalStore = currentWritable(0);
const errorsStore = currentWritable([]);
const progressStore = currentWritable(0);
const { onStart, onLoad, onError } = DefaultLoadingManager;
DefaultLoadingManager.onStart = (url, loaded, total) => {
  onStart?.(url, loaded, total);
  activeStore.set(true);
  itemStore.set(url);
  loadedStore.set(loaded);
  totalStore.set(total);
  const progress = (loaded - previousTotalLoaded) / (total - previousTotalLoaded);
  progressStore.set(progress);
  if (progress === 1)
    finishedOnce.set(true);
};
DefaultLoadingManager.onLoad = () => {
  onLoad?.();
  activeStore.set(false);
};
DefaultLoadingManager.onError = (url) => {
  onError?.(url);
  errorsStore.update((errors) => {
    return [...errors, url];
  });
};
DefaultLoadingManager.onProgress = (url, loaded, total) => {
  if (loaded === total) {
    previousTotalLoaded = total;
  }
  activeStore.set(true);
  itemStore.set(url);
  loadedStore.set(loaded);
  totalStore.set(total);
  const progress = (loaded - previousTotalLoaded) / (total - previousTotalLoaded) || 1;
  progressStore.set(progress);
  if (progress === 1)
    finishedOnce.set(true);
};
({
  active: toCurrentReadable(activeStore),
  item: toCurrentReadable(itemStore),
  loaded: toCurrentReadable(loadedStore),
  total: toCurrentReadable(totalStore),
  errors: toCurrentReadable(errorsStore),
  progress: toCurrentReadable(progressStore),
  finishedOnce: toCurrentReadable(finishedOnce)
});
new Vector3();
new Vector3();
new Vector3();
new Sphere();
new Matrix4();
new Ray();
new Vector3();
new Vector3();
new Matrix4();
new Vector3();
new Vector3();
new Object3D();
new Vector3();
new Vector3();
new Vector3();
new Vector2();
const gt$1 = "Right", ot = "Top", yt$1 = "Front", _t$1 = "Left", rt = "Bottom", vt$1 = "Back";
[
  gt$1,
  ot,
  yt$1,
  _t$1,
  rt,
  vt$1
].map((s) => s.toLocaleLowerCase());
new Box3();
new Vector3();
UniformsLib.line = {
  worldUnits: { value: 1 },
  linewidth: { value: 1 },
  resolution: { value: new Vector2(1, 1) },
  dashOffset: { value: 0 },
  dashScale: { value: 1 },
  dashSize: { value: 1 },
  gapSize: { value: 1 }
  // todo FIX - maybe change to totalSize
};
ShaderLib.line = {
  uniforms: UniformsUtils.merge([
    UniformsLib.common,
    UniformsLib.fog,
    UniformsLib.line
  ]),
  vertexShader: (
    /* glsl */
    `
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		void trimSegment( const in vec4 start, inout vec4 end ) {

			// trim end segment so it terminates between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
			float nearEstimate = - 0.5 * b / a;

			float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

			end.xyz = mix( start.xyz, end.xyz, alpha );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
				vUv = uv;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					trimSegment( start, end );

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					trimSegment( end, start );

				}

			}

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`
  ),
  fragmentShader: (
    /* glsl */
    `
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			float alpha = opacity;

			#ifdef WORLD_UNITS

				// Find the closest points on the view ray and the line segment
				vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
				vec3 lineDir = worldEnd - worldStart;
				vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

				vec3 p1 = worldStart + lineDir * params.x;
				vec3 p2 = rayEnd * params.y;
				vec3 delta = p1 - p2;
				float len = length( delta );
				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`
  )
};
new Vector4();
new Vector3();
new Vector3();
new Vector4();
new Vector4();
new Vector4();
new Vector3();
new Matrix4();
new Line3();
new Vector3();
new Box3();
new Sphere();
new Vector4();
new Matrix4();
new Matrix4();
new Mesh();
`
    #include <common>
    ${ShaderChunk.logdepthbuf_pars_vertex}
    ${ShaderChunk.fog_pars_vertex}

    attribute vec3 previous;
    attribute vec3 next;
    attribute float side;
    attribute float width;
    attribute float counters;

    uniform vec2 resolution;
    uniform float lineWidth;
    uniform vec3 color;
    uniform float opacity;
    uniform float sizeAttenuation;
    uniform float scaleDown;

    varying vec2 vUV;
    varying vec4 vColor;
    varying float vCounters;

    vec2 intoScreen(vec4 i) {
        return resolution * (0.5 * i.xy / i.w + 0.5);
    }

    void main() {
        float aspect = resolution.y / resolution.x;

        mat4 m = projectionMatrix * modelViewMatrix;

        vec4 currentClip = m * vec4( position, 1.0 );
        vec4 prevClip = m * vec4( previous, 1.0 );
        vec4 nextClip = m * vec4( next, 1.0 );

        vec4 currentNormed = currentClip / currentClip.w;
        vec4 prevNormed = prevClip / prevClip.w;
        vec4 nextNormed = nextClip / nextClip.w;

        vec2 currentScreen = intoScreen(currentNormed);
        vec2 prevScreen = intoScreen(prevNormed);
        vec2 nextScreen = intoScreen(nextNormed);

        float actualWidth = lineWidth * width;

        vec2 dir;
        if(nextScreen == currentScreen) {
            dir = normalize( currentScreen - prevScreen );
        } else if(prevScreen == currentScreen) {
            dir = normalize( nextScreen - currentScreen );
        } else {
            vec2 inDir = currentScreen - prevScreen;
            vec2 outDir = nextScreen - currentScreen;
            vec2 fullDir = nextScreen - prevScreen;

            if(length(fullDir) > 0.0) {
                dir = normalize(fullDir);
            } else if(length(inDir) > 0.0){
                dir = normalize(inDir);
            } else {
                dir = normalize(outDir);
            }
        }

        vec2 normal = vec2(-dir.y, dir.x);

        if(sizeAttenuation != 0.0) {
            normal /= currentClip.w;
            normal *= min(resolution.x, resolution.y);
        }

        if (scaleDown > 0.0) {
            float dist = length(nextNormed - prevNormed);
            normal *= smoothstep(0.0, scaleDown, dist);
        }

        vec2 offsetInScreen = actualWidth * normal * side * 0.5;

        vec2 withOffsetScreen = currentScreen + offsetInScreen;
        vec3 withOffsetNormed = vec3((2.0 * withOffsetScreen/resolution - 1.0), currentNormed.z);

        vCounters = counters;
        vColor = vec4( color, opacity );
        vUV = uv;

        gl_Position = currentClip.w * vec4(withOffsetNormed, 1.0);

        ${ShaderChunk.logdepthbuf_vertex}
        ${ShaderChunk.fog_vertex}
    }
`;
`
uniform vec3 glowColor;
uniform float falloffAmount;
uniform float glowSharpness;
uniform float glowInternalRadius;

varying vec3 vPosition;
varying vec3 vNormal;

void main()
{
	// Normal
	vec3 normal = normalize(vNormal);
	if(!gl_FrontFacing)
			normal *= - 1.0;
	vec3 viewDirection = normalize(cameraPosition - vPosition);
	float fresnel = dot(viewDirection, normal);
	fresnel = pow(fresnel, glowInternalRadius + 0.1);
	float falloff = smoothstep(0., falloffAmount, fresnel);
	float fakeGlow = fresnel;
	fakeGlow += fresnel * glowSharpness;
	fakeGlow *= falloff;
	gl_FragColor = vec4(clamp(glowColor * fresnel, 0., 1.0), clamp(fakeGlow, 0., 1.0));

	${ShaderChunk.tonemapping_fragment}
	${ShaderChunk.colorspace_fragment}
}`;
`
uniform sampler2D pointTexture;
uniform float fade;
uniform float opacity;

varying vec3 vColor;
void main() {
	float pointOpacity = 1.0;
	if (fade == 1.0) {
		float d = distance(gl_PointCoord, vec2(0.5, 0.5));
		pointOpacity = 1.0 / (1.0 + exp(16.0 * (d - 0.25)));
	}
	gl_FragColor = vec4(vColor, pointOpacity * opacity);

	${ShaderChunk.tonemapping_fragment}
	${ShaderChunk.colorspace_fragment}
}`;
const common_functions = (
  /* glsl */
  `

// A stack of uint32 indices can can store the indices for
// a perfectly balanced tree with a depth up to 31. Lower stack
// depth gets higher performance.
//
// However not all trees are balanced. Best value to set this to
// is the trees max depth.
#ifndef BVH_STACK_DEPTH
#define BVH_STACK_DEPTH 60
#endif

#ifndef INFINITY
#define INFINITY 1e20
#endif

// Utilities
uvec4 uTexelFetch1D( usampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

ivec4 iTexelFetch1D( isampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

vec4 texelFetch1D( sampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

vec4 textureSampleBarycoord( sampler2D tex, vec3 barycoord, uvec3 faceIndices ) {

	return
		barycoord.x * texelFetch1D( tex, faceIndices.x ) +
		barycoord.y * texelFetch1D( tex, faceIndices.y ) +
		barycoord.z * texelFetch1D( tex, faceIndices.z );

}

void ndcToCameraRay(
	vec2 coord, mat4 cameraWorld, mat4 invProjectionMatrix,
	out vec3 rayOrigin, out vec3 rayDirection
) {

	// get camera look direction and near plane for camera clipping
	vec4 lookDirection = cameraWorld * vec4( 0.0, 0.0, - 1.0, 0.0 );
	vec4 nearVector = invProjectionMatrix * vec4( 0.0, 0.0, - 1.0, 1.0 );
	float near = abs( nearVector.z / nearVector.w );

	// get the camera direction and position from camera matrices
	vec4 origin = cameraWorld * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec4 direction = invProjectionMatrix * vec4( coord, 0.5, 1.0 );
	direction /= direction.w;
	direction = cameraWorld * direction - origin;

	// slide the origin along the ray until it sits at the near clip plane position
	origin.xyz += direction.xyz * near / dot( direction, lookDirection );

	rayOrigin = origin.xyz;
	rayDirection = direction.xyz;

}
`
);
const bvh_ray_functions = (
  /* glsl */
  `

#ifndef TRI_INTERSECT_EPSILON
#define TRI_INTERSECT_EPSILON 1e-5
#endif

// Raycasting
bool intersectsBounds( vec3 rayOrigin, vec3 rayDirection, vec3 boundsMin, vec3 boundsMax, out float dist ) {

	// https://www.reddit.com/r/opengl/comments/8ntzz5/fast_glsl_ray_box_intersection/
	// https://tavianator.com/2011/ray_box.html
	vec3 invDir = 1.0 / rayDirection;

	// find intersection distances for each plane
	vec3 tMinPlane = invDir * ( boundsMin - rayOrigin );
	vec3 tMaxPlane = invDir * ( boundsMax - rayOrigin );

	// get the min and max distances from each intersection
	vec3 tMinHit = min( tMaxPlane, tMinPlane );
	vec3 tMaxHit = max( tMaxPlane, tMinPlane );

	// get the furthest hit distance
	vec2 t = max( tMinHit.xx, tMinHit.yz );
	float t0 = max( t.x, t.y );

	// get the minimum hit distance
	t = min( tMaxHit.xx, tMaxHit.yz );
	float t1 = min( t.x, t.y );

	// set distance to 0.0 if the ray starts inside the box
	dist = max( t0, 0.0 );

	return t1 >= dist;

}

bool intersectsTriangle(
	vec3 rayOrigin, vec3 rayDirection, vec3 a, vec3 b, vec3 c,
	out vec3 barycoord, out vec3 norm, out float dist, out float side
) {

	// https://stackoverflow.com/questions/42740765/intersection-between-line-and-triangle-in-3d
	vec3 edge1 = b - a;
	vec3 edge2 = c - a;
	norm = cross( edge1, edge2 );

	float det = - dot( rayDirection, norm );
	float invdet = 1.0 / det;

	vec3 AO = rayOrigin - a;
	vec3 DAO = cross( AO, rayDirection );

	vec4 uvt;
	uvt.x = dot( edge2, DAO ) * invdet;
	uvt.y = - dot( edge1, DAO ) * invdet;
	uvt.z = dot( AO, norm ) * invdet;
	uvt.w = 1.0 - uvt.x - uvt.y;

	// set the hit information
	barycoord = uvt.wxy; // arranged in A, B, C order
	dist = uvt.z;
	side = sign( det );
	norm = side * normalize( norm );

	// add an epsilon to avoid misses between triangles
	uvt += vec4( TRI_INTERSECT_EPSILON );

	return all( greaterThanEqual( uvt, vec4( 0.0 ) ) );

}

bool intersectTriangles(
	// geometry info and triangle range
	sampler2D positionAttr, usampler2D indexAttr, uint offset, uint count,

	// ray
	vec3 rayOrigin, vec3 rayDirection,

	// outputs
	inout float minDistance, inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord,
	inout float side, inout float dist
) {

	bool found = false;
	vec3 localBarycoord, localNormal;
	float localDist, localSide;
	for ( uint i = offset, l = offset + count; i < l; i ++ ) {

		uvec3 indices = uTexelFetch1D( indexAttr, i ).xyz;
		vec3 a = texelFetch1D( positionAttr, indices.x ).rgb;
		vec3 b = texelFetch1D( positionAttr, indices.y ).rgb;
		vec3 c = texelFetch1D( positionAttr, indices.z ).rgb;

		if (
			intersectsTriangle( rayOrigin, rayDirection, a, b, c, localBarycoord, localNormal, localDist, localSide )
			&& localDist < minDistance
		) {

			found = true;
			minDistance = localDist;

			faceIndices = uvec4( indices.xyz, i );
			faceNormal = localNormal;

			side = localSide;
			barycoord = localBarycoord;
			dist = localDist;

		}

	}

	return found;

}

bool intersectsBVHNodeBounds( vec3 rayOrigin, vec3 rayDirection, sampler2D bvhBounds, uint currNodeIndex, out float dist ) {

	uint cni2 = currNodeIndex * 2u;
	vec3 boundsMin = texelFetch1D( bvhBounds, cni2 ).xyz;
	vec3 boundsMax = texelFetch1D( bvhBounds, cni2 + 1u ).xyz;
	return intersectsBounds( rayOrigin, rayDirection, boundsMin, boundsMax, dist );

}

// use a macro to hide the fact that we need to expand the struct into separate fields
#define	bvhIntersectFirstHit(		bvh,		rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist	)	_bvhIntersectFirstHit(		bvh.position, bvh.index, bvh.bvhBounds, bvh.bvhContents,		rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist	)

bool _bvhIntersectFirstHit(
	// bvh info
	sampler2D bvh_position, usampler2D bvh_index, sampler2D bvh_bvhBounds, usampler2D bvh_bvhContents,

	// ray
	vec3 rayOrigin, vec3 rayDirection,

	// output variables split into separate variables due to output precision
	inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord,
	inout float side, inout float dist
) {

	// stack needs to be twice as long as the deepest tree we expect because
	// we push both the left and right child onto the stack every traversal
	int pointer = 0;
	uint stack[ BVH_STACK_DEPTH ];
	stack[ 0 ] = 0u;

	float triangleDistance = INFINITY;
	bool found = false;
	while ( pointer > - 1 && pointer < BVH_STACK_DEPTH ) {

		uint currNodeIndex = stack[ pointer ];
		pointer --;

		// check if we intersect the current bounds
		float boundsHitDistance;
		if (
			! intersectsBVHNodeBounds( rayOrigin, rayDirection, bvh_bvhBounds, currNodeIndex, boundsHitDistance )
			|| boundsHitDistance > triangleDistance
		) {

			continue;

		}

		uvec2 boundsInfo = uTexelFetch1D( bvh_bvhContents, currNodeIndex ).xy;
		bool isLeaf = bool( boundsInfo.x & 0xffff0000u );

		if ( isLeaf ) {

			uint count = boundsInfo.x & 0x0000ffffu;
			uint offset = boundsInfo.y;

			found = intersectTriangles(
				bvh_position, bvh_index, offset, count,
				rayOrigin, rayDirection, triangleDistance,
				faceIndices, faceNormal, barycoord, side, dist
			) || found;

		} else {

			uint leftIndex = currNodeIndex + 1u;
			uint splitAxis = boundsInfo.x & 0x0000ffffu;
			uint rightIndex = currNodeIndex + boundsInfo.y;

			bool leftToRight = rayDirection[ splitAxis ] >= 0.0;
			uint c1 = leftToRight ? leftIndex : rightIndex;
			uint c2 = leftToRight ? rightIndex : leftIndex;

			// set c2 in the stack so we traverse it later. We need to keep track of a pointer in
			// the stack while we traverse. The second pointer added is the one that will be
			// traversed first
			pointer ++;
			stack[ pointer ] = c2;

			pointer ++;
			stack[ pointer ] = c1;

		}

	}

	return found;

}
`
);
const bvh_struct_definitions = (
  /* glsl */
  `
struct BVH {

	usampler2D index;
	sampler2D position;

	sampler2D bvhBounds;
	usampler2D bvhContents;

};
`
);
const shaderStructs = bvh_struct_definitions;
const shaderIntersectFunction = `
	${common_functions}
	${bvh_ray_functions}
`;
`#define ENVMAP_TYPE_CUBE_UV
precision highp isampler2D;
precision highp usampler2D;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying mat4 vModelMatrixInverse;

#ifdef USE_INSTANCING_COLOR
	varying vec3 vInstanceColor;
#endif

#ifdef ENVMAP_TYPE_CUBEM
	uniform samplerCube envMap;
#else
	uniform sampler2D envMap;
#endif

uniform float bounces;
${shaderStructs}
${shaderIntersectFunction}
uniform BVH bvh;
uniform float ior;
uniform bool correctMips;
uniform vec2 resolution;
uniform float fresnel;
uniform mat4 modelMatrix;
uniform mat4 projectionMatrixInverse;
uniform mat4 viewMatrixInverse;
uniform float aberrationStrength;
uniform vec3 color;

float fresnelFunc(vec3 viewDirection, vec3 worldNormal) {
	return pow( 1.0 + dot( viewDirection, worldNormal), 10.0 );
}

vec3 totalInternalReflection(vec3 ro, vec3 rd, vec3 normal, float ior, mat4 modelMatrixInverse) {
	vec3 rayOrigin = ro;
	vec3 rayDirection = rd;
	rayDirection = refract(rayDirection, normal, 1.0 / ior);
	rayOrigin = vWorldPosition + rayDirection * 0.001;
	rayOrigin = (modelMatrixInverse * vec4(rayOrigin, 1.0)).xyz;
	rayDirection = normalize((modelMatrixInverse * vec4(rayDirection, 0.0)).xyz);
	for(float i = 0.0; i < bounces; i++) {
		uvec4 faceIndices = uvec4( 0u );
		vec3 faceNormal = vec3( 0.0, 0.0, 1.0 );
		vec3 barycoord = vec3( 0.0 );
		float side = 1.0;
		float dist = 0.0;
		bvhIntersectFirstHit( bvh, rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist );
		vec3 hitPos = rayOrigin + rayDirection * max(dist - 0.001, 0.0);
		vec3 tempDir = refract(rayDirection, faceNormal, ior);
		if (length(tempDir) != 0.0) {
			rayDirection = tempDir;
			break;
		}
		rayDirection = reflect(rayDirection, faceNormal);
		rayOrigin = hitPos + rayDirection * 0.01;
	}
	rayDirection = normalize((modelMatrix * vec4(rayDirection, 0.0)).xyz);
	return rayDirection;
}

#include <common>
#include <cube_uv_reflection_fragment>

#ifdef ENVMAP_TYPE_CUBEM
	vec4 textureGradient(samplerCube envMap, vec3 rayDirection, vec3 directionCamPerfect) {
		return textureGrad(envMap, rayDirection, dFdx(correctMips ? directionCamPerfect: rayDirection), dFdy(correctMips ? directionCamPerfect: rayDirection));
	}
#else
	vec4 textureGradient(sampler2D envMap, vec3 rayDirection, vec3 directionCamPerfect) {
		vec2 uvv = equirectUv( rayDirection );
		vec2 smoothUv = equirectUv( directionCamPerfect );
		return textureGrad(envMap, uvv, dFdx(correctMips ? smoothUv : uvv), dFdy(correctMips ? smoothUv : uvv));
	}
#endif

void main() {
	vec2 uv = gl_FragCoord.xy / resolution;
	vec3 directionCamPerfect = (projectionMatrixInverse * vec4(uv * 2.0 - 1.0, 0.0, 1.0)).xyz;
	directionCamPerfect = (viewMatrixInverse * vec4(directionCamPerfect, 0.0)).xyz;
	directionCamPerfect = normalize(directionCamPerfect);
	vec3 normal = vNormal;
	vec3 rayOrigin = cameraPosition;
	vec3 rayDirection = normalize(vWorldPosition - cameraPosition);
	vec3 finalColor;
	#ifdef CHROMATIC_ABERRATIONS
		vec3 rayDirectionG = totalInternalReflection(rayOrigin, rayDirection, normal, max(ior, 1.0), vModelMatrixInverse);
		#ifdef FAST_CHROMA
			vec3 rayDirectionR = normalize(rayDirectionG + 1.0 * vec3(aberrationStrength / 2.0));
			vec3 rayDirectionB = normalize(rayDirectionG - 1.0 * vec3(aberrationStrength / 2.0));
		#else
			vec3 rayDirectionR = totalInternalReflection(rayOrigin, rayDirection, normal, max(ior * (1.0 - aberrationStrength), 1.0), vModelMatrixInverse);
			vec3 rayDirectionB = totalInternalReflection(rayOrigin, rayDirection, normal, max(ior * (1.0 + aberrationStrength), 1.0), vModelMatrixInverse);
		#endif
		float finalColorR = textureGradient(envMap, rayDirectionR, directionCamPerfect).r;
		float finalColorG = textureGradient(envMap, rayDirectionG, directionCamPerfect).g;
		float finalColorB = textureGradient(envMap, rayDirectionB, directionCamPerfect).b;
		finalColor = vec3(finalColorR, finalColorG, finalColorB);
	#else
		rayDirection = totalInternalReflection(rayOrigin, rayDirection, normal, max(ior, 1.0), vModelMatrixInverse);
		finalColor = textureGradient(envMap, rayDirection, directionCamPerfect).rgb;
	#endif

	finalColor *= color;
	#ifdef USE_INSTANCING_COLOR
		finalColor *= vInstanceColor;
	#endif

	vec3 viewDirection = normalize(vWorldPosition - cameraPosition);
	float nFresnel = fresnelFunc(viewDirection, normal) * fresnel;
	gl_FragColor = vec4(mix(finalColor, vec3(1.0), nFresnel), 1.0);
	${ShaderChunk.tonemapping_fragment}
	${ShaderChunk.colorspace_fragment}
}`;
new Box3();
typeof window !== "undefined" ? document.createElement("div") : void 0;
for (let t = 0; t < 256; t++)
  (t < 16 ? "0" : "") + t.toString(16);
new OrthographicCamera(-1, 1, 1, -1, 0, 1);
class tt extends BufferGeometry {
  constructor() {
    super(), this.setAttribute("position", new Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3)), this.setAttribute("uv", new Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
  }
}
new tt();
var te = { exports: {} };
te.exports = G;
te.exports.default = G;
function G(t, i, e) {
  e = e || 2;
  var n = i && i.length, r = n ? i[0] * e : t.length, s = de(t, 0, r, e, true), a = [];
  if (!s || s.next === s.prev)
    return a;
  var l, u, o, h, g, c, f;
  if (n && (s = gt(t, i, s, e)), t.length > 80 * e) {
    l = o = t[0], u = h = t[1];
    for (var m = e; m < r; m += e)
      g = t[m], c = t[m + 1], g < l && (l = g), c < u && (u = c), g > o && (o = g), c > h && (h = c);
    f = Math.max(o - l, h - u), f = f !== 0 ? 32767 / f : 0;
  }
  return I(s, a, e, l, u, f, 0), a;
}
function de(t, i, e, n, r) {
  var s, a;
  if (r === X(t, i, e, n) > 0)
    for (s = i; s < e; s += n)
      a = me(s, t[s], t[s + 1], a);
  else
    for (s = e - n; s >= i; s -= n)
      a = me(s, t[s], t[s + 1], a);
  return a && Z(a, a.next) && (E(a), a = a.next), a;
}
function F(t, i) {
  if (!t)
    return t;
  i || (i = t);
  var e = t, n;
  do
    if (n = false, !e.steiner && (Z(e, e.next) || M(e.prev, e, e.next) === 0)) {
      if (E(e), e = i = e.prev, e === e.next)
        break;
      n = true;
    } else
      e = e.next;
  while (n || e !== i);
  return i;
}
function I(t, i, e, n, r, s, a) {
  if (t) {
    !a && s && _t(t, n, r, s);
    for (var l = t, u, o; t.prev !== t.next; ) {
      if (u = t.prev, o = t.next, s ? ht(t, n, r, s) : mt(t)) {
        i.push(u.i / e | 0), i.push(t.i / e | 0), i.push(o.i / e | 0), E(t), t = o.next, l = o.next;
        continue;
      }
      if (t = o, t === l) {
        a ? a === 1 ? (t = pt(F(t), i, e), I(t, i, e, n, r, s, 2)) : a === 2 && dt(t, i, e, n, r, s) : I(F(t), i, e, n, r, s, 1);
        break;
      }
    }
  }
}
function mt(t) {
  var i = t.prev, e = t, n = t.next;
  if (M(i, e, n) >= 0)
    return false;
  for (var r = i.x, s = e.x, a = n.x, l = i.y, u = e.y, o = n.y, h = r < s ? r < a ? r : a : s < a ? s : a, g = l < u ? l < o ? l : o : u < o ? u : o, c = r > s ? r > a ? r : a : s > a ? s : a, f = l > u ? l > o ? l : o : u > o ? u : o, m = n.next; m !== i; ) {
    if (m.x >= h && m.x <= c && m.y >= g && m.y <= f && V(r, l, s, u, a, o, m.x, m.y) && M(m.prev, m, m.next) >= 0)
      return false;
    m = m.next;
  }
  return true;
}
function ht(t, i, e, n) {
  var r = t.prev, s = t, a = t.next;
  if (M(r, s, a) >= 0)
    return false;
  for (var l = r.x, u = s.x, o = a.x, h = r.y, g = s.y, c = a.y, f = l < u ? l < o ? l : o : u < o ? u : o, m = h < g ? h < c ? h : c : g < c ? g : c, p = l > u ? l > o ? l : o : u > o ? u : o, d = h > g ? h > c ? h : c : g > c ? g : c, w = W(f, m, i, e, n), _ = W(p, d, i, e, n), x = t.prevZ, v = t.nextZ; x && x.z >= w && v && v.z <= _; ) {
    if (x.x >= f && x.x <= p && x.y >= m && x.y <= d && x !== r && x !== a && V(l, h, u, g, o, c, x.x, x.y) && M(x.prev, x, x.next) >= 0 || (x = x.prevZ, v.x >= f && v.x <= p && v.y >= m && v.y <= d && v !== r && v !== a && V(l, h, u, g, o, c, v.x, v.y) && M(v.prev, v, v.next) >= 0))
      return false;
    v = v.nextZ;
  }
  for (; x && x.z >= w; ) {
    if (x.x >= f && x.x <= p && x.y >= m && x.y <= d && x !== r && x !== a && V(l, h, u, g, o, c, x.x, x.y) && M(x.prev, x, x.next) >= 0)
      return false;
    x = x.prevZ;
  }
  for (; v && v.z <= _; ) {
    if (v.x >= f && v.x <= p && v.y >= m && v.y <= d && v !== r && v !== a && V(l, h, u, g, o, c, v.x, v.y) && M(v.prev, v, v.next) >= 0)
      return false;
    v = v.nextZ;
  }
  return true;
}
function pt(t, i, e) {
  var n = t;
  do {
    var r = n.prev, s = n.next.next;
    !Z(r, s) && ge(r, n, n.next, s) && O(r, s) && O(s, r) && (i.push(r.i / e | 0), i.push(n.i / e | 0), i.push(s.i / e | 0), E(n), E(n.next), n = t = s), n = n.next;
  } while (n !== t);
  return F(n);
}
function dt(t, i, e, n, r, s) {
  var a = t;
  do {
    for (var l = a.next.next; l !== a.prev; ) {
      if (a.i !== l.i && Dt(a, l)) {
        var u = xe(a, l);
        a = F(a, a.next), u = F(u, u.next), I(a, i, e, n, r, s, 0), I(u, i, e, n, r, s, 0);
        return;
      }
      l = l.next;
    }
    a = a.next;
  } while (a !== t);
}
function gt(t, i, e, n) {
  var r = [], s, a, l, u, o;
  for (s = 0, a = i.length; s < a; s++)
    l = i[s] * n, u = s < a - 1 ? i[s + 1] * n : t.length, o = de(t, l, u, n, false), o === o.next && (o.steiner = true), r.push(Tt(o));
  for (r.sort(xt), s = 0; s < r.length; s++)
    e = vt(r[s], e);
  return e;
}
function xt(t, i) {
  return t.x - i.x;
}
function vt(t, i) {
  var e = yt(t, i);
  if (!e)
    return i;
  var n = xe(e, t);
  return F(n, n.next), F(e, e.next);
}
function yt(t, i) {
  var e = i, n = t.x, r = t.y, s = -1 / 0, a;
  do {
    if (r <= e.y && r >= e.next.y && e.next.y !== e.y) {
      var l = e.x + (r - e.y) * (e.next.x - e.x) / (e.next.y - e.y);
      if (l <= n && l > s && (s = l, a = e.x < e.next.x ? e : e.next, l === n))
        return a;
    }
    e = e.next;
  } while (e !== i);
  if (!a)
    return null;
  var u = a, o = a.x, h = a.y, g = 1 / 0, c;
  e = a;
  do
    n >= e.x && e.x >= o && n !== e.x && V(r < h ? n : s, r, o, h, r < h ? s : n, r, e.x, e.y) && (c = Math.abs(r - e.y) / (n - e.x), O(e, t) && (c < g || c === g && (e.x > a.x || e.x === a.x && wt(a, e))) && (a = e, g = c)), e = e.next;
  while (e !== u);
  return a;
}
function wt(t, i) {
  return M(t.prev, t, i.prev) < 0 && M(i.next, t, t.next) < 0;
}
function _t(t, i, e, n) {
  var r = t;
  do
    r.z === 0 && (r.z = W(r.x, r.y, i, e, n)), r.prevZ = r.prev, r.nextZ = r.next, r = r.next;
  while (r !== t);
  r.prevZ.nextZ = null, r.prevZ = null, Mt(r);
}
function Mt(t) {
  var i, e, n, r, s, a, l, u, o = 1;
  do {
    for (e = t, t = null, s = null, a = 0; e; ) {
      for (a++, n = e, l = 0, i = 0; i < o && (l++, n = n.nextZ, !!n); i++)
        ;
      for (u = o; l > 0 || u > 0 && n; )
        l !== 0 && (u === 0 || !n || e.z <= n.z) ? (r = e, e = e.nextZ, l--) : (r = n, n = n.nextZ, u--), s ? s.nextZ = r : t = r, r.prevZ = s, s = r;
      e = n;
    }
    s.nextZ = null, o *= 2;
  } while (a > 1);
  return t;
}
function W(t, i, e, n, r) {
  return t = (t - e) * r | 0, i = (i - n) * r | 0, t = (t | t << 8) & 16711935, t = (t | t << 4) & 252645135, t = (t | t << 2) & 858993459, t = (t | t << 1) & 1431655765, i = (i | i << 8) & 16711935, i = (i | i << 4) & 252645135, i = (i | i << 2) & 858993459, i = (i | i << 1) & 1431655765, t | i << 1;
}
function Tt(t) {
  var i = t, e = t;
  do
    (i.x < e.x || i.x === e.x && i.y < e.y) && (e = i), i = i.next;
  while (i !== t);
  return e;
}
function V(t, i, e, n, r, s, a, l) {
  return (r - a) * (i - l) >= (t - a) * (s - l) && (t - a) * (n - l) >= (e - a) * (i - l) && (e - a) * (s - l) >= (r - a) * (n - l);
}
function Dt(t, i) {
  return t.next.i !== i.i && t.prev.i !== i.i && !At(t, i) && // dones't intersect other edges
  (O(t, i) && O(i, t) && bt(t, i) && // locally visible
  (M(t.prev, t, i.prev) || M(t, i.prev, i)) || // does not create opposite-facing sectors
  Z(t, i) && M(t.prev, t, t.next) > 0 && M(i.prev, i, i.next) > 0);
}
function M(t, i, e) {
  return (i.y - t.y) * (e.x - i.x) - (i.x - t.x) * (e.y - i.y);
}
function Z(t, i) {
  return t.x === i.x && t.y === i.y;
}
function ge(t, i, e, n) {
  var r = H(M(t, i, e)), s = H(M(t, i, n)), a = H(M(e, n, t)), l = H(M(e, n, i));
  return !!(r !== s && a !== l || r === 0 && z(t, e, i) || s === 0 && z(t, n, i) || a === 0 && z(e, t, n) || l === 0 && z(e, i, n));
}
function z(t, i, e) {
  return i.x <= Math.max(t.x, e.x) && i.x >= Math.min(t.x, e.x) && i.y <= Math.max(t.y, e.y) && i.y >= Math.min(t.y, e.y);
}
function H(t) {
  return t > 0 ? 1 : t < 0 ? -1 : 0;
}
function At(t, i) {
  var e = t;
  do {
    if (e.i !== t.i && e.next.i !== t.i && e.i !== i.i && e.next.i !== i.i && ge(e, e.next, t, i))
      return true;
    e = e.next;
  } while (e !== t);
  return false;
}
function O(t, i) {
  return M(t.prev, t, t.next) < 0 ? M(t, i, t.next) >= 0 && M(t, t.prev, i) >= 0 : M(t, i, t.prev) < 0 || M(t, t.next, i) < 0;
}
function bt(t, i) {
  var e = t, n = false, r = (t.x + i.x) / 2, s = (t.y + i.y) / 2;
  do
    e.y > s != e.next.y > s && e.next.y !== e.y && r < (e.next.x - e.x) * (s - e.y) / (e.next.y - e.y) + e.x && (n = !n), e = e.next;
  while (e !== t);
  return n;
}
function xe(t, i) {
  var e = new Y(t.i, t.x, t.y), n = new Y(i.i, i.x, i.y), r = t.next, s = i.prev;
  return t.next = i, i.prev = t, e.next = r, r.prev = e, n.next = e, e.prev = n, s.next = n, n.prev = s, n;
}
function me(t, i, e, n) {
  var r = new Y(t, i, e);
  return n ? (r.next = n.next, r.prev = n, n.next.prev = r, n.next = r) : (r.prev = r, r.next = r), r;
}
function E(t) {
  t.next.prev = t.prev, t.prev.next = t.next, t.prevZ && (t.prevZ.nextZ = t.nextZ), t.nextZ && (t.nextZ.prevZ = t.prevZ);
}
function Y(t, i, e) {
  this.i = t, this.x = i, this.y = e, this.prev = null, this.next = null, this.z = 0, this.prevZ = null, this.nextZ = null, this.steiner = false;
}
G.deviation = function(t, i, e, n) {
  var r = i && i.length, s = r ? i[0] * e : t.length, a = Math.abs(X(t, 0, s, e));
  if (r)
    for (var l = 0, u = i.length; l < u; l++) {
      var o = i[l] * e, h = l < u - 1 ? i[l + 1] * e : t.length;
      a -= Math.abs(X(t, o, h, e));
    }
  var g = 0;
  for (l = 0; l < n.length; l += 3) {
    var c = n[l] * e, f = n[l + 1] * e, m = n[l + 2] * e;
    g += Math.abs(
      (t[c] - t[m]) * (t[f + 1] - t[c + 1]) - (t[c] - t[f]) * (t[m + 1] - t[c + 1])
    );
  }
  return a === 0 && g === 0 ? 0 : Math.abs((g - a) / a);
};
function X(t, i, e, n) {
  for (var r = 0, s = i, a = e - n; s < e; s += n)
    r += (t[a] - t[s]) * (t[s + 1] + t[a + 1]), a = s;
  return r;
}
G.flatten = function(t) {
  for (var i = t[0][0].length, e = { vertices: [], holes: [], dimensions: i }, n = 0, r = 0; r < t.length; r++) {
    for (var s = 0; s < t[r].length; s++)
      for (var a = 0; a < i; a++)
        e.vertices.push(t[r][s][a]);
    r > 0 && (n += t[r - 1].length, e.holes.push(n));
  }
  return e;
};
new Vector2();
new Vector2();
var J;
((t) => {
  function i(r) {
    let s = r.slice();
    return s.sort(t.POINT_COMPARATOR), t.makeHullPresorted(s);
  }
  t.makeHull = i;
  function e(r) {
    if (r.length <= 1)
      return r.slice();
    let s = [];
    for (let l = 0; l < r.length; l++) {
      const u = r[l];
      for (; s.length >= 2; ) {
        const o = s[s.length - 1], h = s[s.length - 2];
        if ((o.x - h.x) * (u.y - h.y) >= (o.y - h.y) * (u.x - h.x))
          s.pop();
        else
          break;
      }
      s.push(u);
    }
    s.pop();
    let a = [];
    for (let l = r.length - 1; l >= 0; l--) {
      const u = r[l];
      for (; a.length >= 2; ) {
        const o = a[a.length - 1], h = a[a.length - 2];
        if ((o.x - h.x) * (u.y - h.y) >= (o.y - h.y) * (u.x - h.x))
          a.pop();
        else
          break;
      }
      a.push(u);
    }
    return a.pop(), s.length == 1 && a.length == 1 && s[0].x == a[0].x && s[0].y == a[0].y ? s : s.concat(a);
  }
  t.makeHullPresorted = e;
  function n(r, s) {
    return r.x < s.x ? -1 : r.x > s.x ? 1 : r.y < s.y ? -1 : r.y > s.y ? 1 : 0;
  }
  t.POINT_COMPARATOR = n;
})(J || (J = {}));
new MeshBasicMaterial();
new Vector3();
new Matrix4();
new Ray();
new Sphere();
new Box3();
new Vector3();
new Vector3();
