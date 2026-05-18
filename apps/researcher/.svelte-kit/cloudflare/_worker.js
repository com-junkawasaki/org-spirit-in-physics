var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// .svelte-kit/output/server/chunks/false.js
var dev;
var init_false = __esm({
  ".svelte-kit/output/server/chunks/false.js"() {
    dev = false;
  }
});

// ../../node_modules/.pnpm/@sveltejs+kit@2.50.2_@sveltejs+vite-plugin-svelte@6.2.4_svelte@5.49.2_vite@7.3.1_@types_7b24b5d0d469dd33a89119d54e695b21/node_modules/@sveltejs/kit/src/exports/internal/remote-functions.js
var init_remote_functions = __esm({
  "../../node_modules/.pnpm/@sveltejs+kit@2.50.2_@sveltejs+vite-plugin-svelte@6.2.4_svelte@5.49.2_vite@7.3.1_@types_7b24b5d0d469dd33a89119d54e695b21/node_modules/@sveltejs/kit/src/exports/internal/remote-functions.js"() {
  }
});

// ../../node_modules/.pnpm/@sveltejs+kit@2.50.2_@sveltejs+vite-plugin-svelte@6.2.4_svelte@5.49.2_vite@7.3.1_@types_7b24b5d0d469dd33a89119d54e695b21/node_modules/@sveltejs/kit/src/exports/internal/index.js
var HttpError, Redirect, SvelteKitError, ActionFailure;
var init_internal = __esm({
  "../../node_modules/.pnpm/@sveltejs+kit@2.50.2_@sveltejs+vite-plugin-svelte@6.2.4_svelte@5.49.2_vite@7.3.1_@types_7b24b5d0d469dd33a89119d54e695b21/node_modules/@sveltejs/kit/src/exports/internal/index.js"() {
    init_remote_functions();
    HttpError = class {
      /**
       * @param {number} status
       * @param {{message: string} extends App.Error ? (App.Error | string | undefined) : App.Error} body
       */
      constructor(status, body2) {
        this.status = status;
        if (typeof body2 === "string") {
          this.body = { message: body2 };
        } else if (body2) {
          this.body = body2;
        } else {
          this.body = { message: `Error: ${status}` };
        }
      }
      toString() {
        return JSON.stringify(this.body);
      }
    };
    Redirect = class {
      /**
       * @param {300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308} status
       * @param {string} location
       */
      constructor(status, location) {
        this.status = status;
        this.location = location;
      }
    };
    SvelteKitError = class extends Error {
      /**
       * @param {number} status
       * @param {string} text
       * @param {string} message
       */
      constructor(status, text2, message) {
        super(message);
        this.status = status;
        this.text = text2;
      }
    };
    ActionFailure = class {
      /**
       * @param {number} status
       * @param {T} data
       */
      constructor(status, data) {
        this.status = status;
        this.data = data;
      }
    };
  }
});

// ../../node_modules/.pnpm/@sveltejs+kit@2.50.2_@sveltejs+vite-plugin-svelte@6.2.4_svelte@5.49.2_vite@7.3.1_@types_7b24b5d0d469dd33a89119d54e695b21/node_modules/@sveltejs/kit/src/runtime/server/constants.js
var IN_WEBCONTAINER;
var init_constants = __esm({
  "../../node_modules/.pnpm/@sveltejs+kit@2.50.2_@sveltejs+vite-plugin-svelte@6.2.4_svelte@5.49.2_vite@7.3.1_@types_7b24b5d0d469dd33a89119d54e695b21/node_modules/@sveltejs/kit/src/runtime/server/constants.js"() {
    IN_WEBCONTAINER = !!globalThis.process?.versions?.webcontainer;
  }
});

// ../../node_modules/.pnpm/@sveltejs+kit@2.50.2_@sveltejs+vite-plugin-svelte@6.2.4_svelte@5.49.2_vite@7.3.1_@types_7b24b5d0d469dd33a89119d54e695b21/node_modules/@sveltejs/kit/src/exports/internal/event.js
function with_request_store(store, fn) {
  try {
    sync_store = store;
    return als ? als.run(store, fn) : fn();
  } finally {
    if (!IN_WEBCONTAINER) {
      sync_store = null;
    }
  }
}
var sync_store, als;
var init_event = __esm({
  "../../node_modules/.pnpm/@sveltejs+kit@2.50.2_@sveltejs+vite-plugin-svelte@6.2.4_svelte@5.49.2_vite@7.3.1_@types_7b24b5d0d469dd33a89119d54e695b21/node_modules/@sveltejs/kit/src/exports/internal/event.js"() {
    init_constants();
    sync_store = null;
    import("node:async_hooks").then((hooks) => als = new hooks.AsyncLocalStorage()).catch(() => {
    });
  }
});

// ../../node_modules/.pnpm/@sveltejs+kit@2.50.2_@sveltejs+vite-plugin-svelte@6.2.4_svelte@5.49.2_vite@7.3.1_@types_7b24b5d0d469dd33a89119d54e695b21/node_modules/@sveltejs/kit/src/exports/internal/server.js
function merge_tracing(event_like, current2) {
  return {
    ...event_like,
    tracing: {
      ...event_like.tracing,
      current: current2
    }
  };
}
var init_server = __esm({
  "../../node_modules/.pnpm/@sveltejs+kit@2.50.2_@sveltejs+vite-plugin-svelte@6.2.4_svelte@5.49.2_vite@7.3.1_@types_7b24b5d0d469dd33a89119d54e695b21/node_modules/@sveltejs/kit/src/exports/internal/server.js"() {
    init_event();
  }
});

// .svelte-kit/output/server/chunks/utils.js
function base64_encode(bytes) {
  if (globalThis.Buffer) {
    return globalThis.Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
function base64_decode(encoded) {
  if (globalThis.Buffer) {
    const buffer = globalThis.Buffer.from(encoded, "base64");
    return new Uint8Array(buffer);
  }
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
var text_encoder2, text_decoder2;
var init_utils = __esm({
  ".svelte-kit/output/server/chunks/utils.js"() {
    text_encoder2 = new TextEncoder();
    text_decoder2 = new TextDecoder();
  }
});

// .svelte-kit/output/server/chunks/utils2.js
function is_primitive(thing) {
  return Object(thing) !== thing;
}
function is_plain_object(thing) {
  const proto = Object.getPrototypeOf(thing);
  return proto === Object.prototype || proto === null || Object.getPrototypeOf(proto) === null || Object.getOwnPropertyNames(proto).sort().join("\0") === object_proto_names;
}
function get_type(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}
function get_escaped_char(char) {
  switch (char) {
    case '"':
      return '\\"';
    case "<":
      return "\\u003C";
    case "\\":
      return "\\\\";
    case "\n":
      return "\\n";
    case "\r":
      return "\\r";
    case "	":
      return "\\t";
    case "\b":
      return "\\b";
    case "\f":
      return "\\f";
    case "\u2028":
      return "\\u2028";
    case "\u2029":
      return "\\u2029";
    default:
      return char < " " ? `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}` : "";
  }
}
function stringify_string(str) {
  let result = "";
  let last_pos = 0;
  const len = str.length;
  for (let i = 0; i < len; i += 1) {
    const char = str[i];
    const replacement = get_escaped_char(char);
    if (replacement) {
      result += str.slice(last_pos, i) + replacement;
      last_pos = i + 1;
    }
  }
  return `"${last_pos === 0 ? str : result + str.slice(last_pos)}"`;
}
function enumerable_symbols(object) {
  return Object.getOwnPropertySymbols(object).filter(
    (symbol) => Object.getOwnPropertyDescriptor(object, symbol).enumerable
  );
}
function stringify_key(key2) {
  return is_identifier.test(key2) ? "." + key2 : "[" + JSON.stringify(key2) + "]";
}
var escaped, DevalueError, object_proto_names, is_identifier;
var init_utils2 = __esm({
  ".svelte-kit/output/server/chunks/utils2.js"() {
    escaped = {
      "<": "\\u003C",
      "\\": "\\\\",
      "\b": "\\b",
      "\f": "\\f",
      "\n": "\\n",
      "\r": "\\r",
      "	": "\\t",
      "\u2028": "\\u2028",
      "\u2029": "\\u2029"
    };
    DevalueError = class extends Error {
      /**
       * @param {string} message
       * @param {string[]} keys
       * @param {any} [value] - The value that failed to be serialized
       * @param {any} [root] - The root value being serialized
       */
      constructor(message, keys, value, root2) {
        super(message);
        this.name = "DevalueError";
        this.path = keys.join("");
        this.value = value;
        this.root = root2;
      }
    };
    object_proto_names = /* @__PURE__ */ Object.getOwnPropertyNames(
      Object.prototype
    ).sort().join("\0");
    is_identifier = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
  }
});

// .svelte-kit/output/server/chunks/context.js
function run_all(arr) {
  for (var i = 0; i < arr.length; i++) {
    arr[i]();
  }
}
function deferred() {
  var resolve2;
  var reject;
  var promise = new Promise((res, rej) => {
    resolve2 = res;
    reject = rej;
  });
  return { promise, resolve: resolve2, reject };
}
function lifecycle_outside_component(name) {
  {
    throw new Error(`https://svelte.dev/e/lifecycle_outside_component`);
  }
}
function escape_html2(value, is_attr) {
  const str = String(value ?? "");
  const pattern2 = is_attr ? ATTR_REGEX : CONTENT_REGEX;
  pattern2.lastIndex = 0;
  let escaped2 = "";
  let last = 0;
  while (pattern2.test(str)) {
    const i = pattern2.lastIndex - 1;
    const ch = str[i];
    escaped2 += str.substring(last, i) + (ch === "&" ? "&amp;" : ch === '"' ? "&quot;" : "&lt;");
    last = i + 1;
  }
  return escaped2 + str.substring(last);
}
function set_ssr_context(v) {
  ssr_context = v;
}
function getContext(key2) {
  const context_map = get_or_init_context_map();
  const result = (
    /** @type {T} */
    context_map.get(key2)
  );
  return result;
}
function setContext(key2, context2) {
  get_or_init_context_map().set(key2, context2);
  return context2;
}
function get_or_init_context_map(name) {
  if (ssr_context === null) {
    lifecycle_outside_component();
  }
  return ssr_context.c ??= new Map(get_parent_context(ssr_context) || void 0);
}
function push(fn) {
  ssr_context = { p: ssr_context, c: null, r: null };
}
function pop() {
  ssr_context = /** @type {SSRContext} */
  ssr_context.p;
}
function get_parent_context(ssr_context2) {
  let parent = ssr_context2.p;
  while (parent !== null) {
    const context_map = parent.c;
    if (context_map !== null) {
      return context_map;
    }
    parent = parent.p;
  }
  return null;
}
var is_array, index_of, includes, array_from, define_property, get_descriptor, object_prototype, array_prototype, get_prototype_of, is_extensible, noop, DERIVED, EFFECT, RENDER_EFFECT, MANAGED_EFFECT, BLOCK_EFFECT, BRANCH_EFFECT, ROOT_EFFECT, BOUNDARY_EFFECT, CONNECTED, CLEAN, DIRTY, MAYBE_DIRTY, INERT, DESTROYED, EFFECT_RAN, EFFECT_TRANSPARENT, EAGER_EFFECT, HEAD_EFFECT, EFFECT_PRESERVED, USER_EFFECT, WAS_MARKED, REACTION_IS_UPDATING, ASYNC, ERROR_VALUE, STATE_SYMBOL, LEGACY_PROPS, STALE_REACTION, COMMENT_NODE, HYDRATION_START, HYDRATION_START_ELSE, HYDRATION_END, HYDRATION_ERROR, ELEMENT_IS_NAMESPACED, ELEMENT_PRESERVE_ATTRIBUTE_CASE, ELEMENT_IS_INPUT, UNINITIALIZED, ATTR_REGEX, CONTENT_REGEX, ssr_context;
var init_context = __esm({
  ".svelte-kit/output/server/chunks/context.js"() {
    is_array = Array.isArray;
    index_of = Array.prototype.indexOf;
    includes = Array.prototype.includes;
    array_from = Array.from;
    define_property = Object.defineProperty;
    get_descriptor = Object.getOwnPropertyDescriptor;
    object_prototype = Object.prototype;
    array_prototype = Array.prototype;
    get_prototype_of = Object.getPrototypeOf;
    is_extensible = Object.isExtensible;
    noop = () => {
    };
    DERIVED = 1 << 1;
    EFFECT = 1 << 2;
    RENDER_EFFECT = 1 << 3;
    MANAGED_EFFECT = 1 << 24;
    BLOCK_EFFECT = 1 << 4;
    BRANCH_EFFECT = 1 << 5;
    ROOT_EFFECT = 1 << 6;
    BOUNDARY_EFFECT = 1 << 7;
    CONNECTED = 1 << 9;
    CLEAN = 1 << 10;
    DIRTY = 1 << 11;
    MAYBE_DIRTY = 1 << 12;
    INERT = 1 << 13;
    DESTROYED = 1 << 14;
    EFFECT_RAN = 1 << 15;
    EFFECT_TRANSPARENT = 1 << 16;
    EAGER_EFFECT = 1 << 17;
    HEAD_EFFECT = 1 << 18;
    EFFECT_PRESERVED = 1 << 19;
    USER_EFFECT = 1 << 20;
    WAS_MARKED = 1 << 15;
    REACTION_IS_UPDATING = 1 << 21;
    ASYNC = 1 << 22;
    ERROR_VALUE = 1 << 23;
    STATE_SYMBOL = /* @__PURE__ */ Symbol("$state");
    LEGACY_PROPS = /* @__PURE__ */ Symbol("legacy props");
    STALE_REACTION = new class StaleReactionError extends Error {
      name = "StaleReactionError";
      message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
    }();
    COMMENT_NODE = 8;
    HYDRATION_START = "[";
    HYDRATION_START_ELSE = "[!";
    HYDRATION_END = "]";
    HYDRATION_ERROR = {};
    ELEMENT_IS_NAMESPACED = 1;
    ELEMENT_PRESERVE_ATTRIBUTE_CASE = 1 << 1;
    ELEMENT_IS_INPUT = 1 << 2;
    UNINITIALIZED = /* @__PURE__ */ Symbol();
    ATTR_REGEX = /[&"<]/g;
    CONTENT_REGEX = /[&<]/g;
    ssr_context = null;
  }
});

// .svelte-kit/output/server/chunks/index.js
function uneval(value, replacer) {
  const counts = /* @__PURE__ */ new Map();
  const keys = [];
  const custom = /* @__PURE__ */ new Map();
  function walk(thing) {
    if (!is_primitive(thing)) {
      if (counts.has(thing)) {
        counts.set(thing, counts.get(thing) + 1);
        return;
      }
      counts.set(thing, 1);
      if (replacer) {
        const str2 = replacer(thing, (value2) => uneval(value2, replacer));
        if (typeof str2 === "string") {
          custom.set(thing, str2);
          return;
        }
      }
      if (typeof thing === "function") {
        throw new DevalueError(`Cannot stringify a function`, keys, thing, value);
      }
      const type = get_type(thing);
      switch (type) {
        case "Number":
        case "BigInt":
        case "String":
        case "Boolean":
        case "Date":
        case "RegExp":
        case "URL":
        case "URLSearchParams":
          return;
        case "Array":
          thing.forEach((value2, i) => {
            keys.push(`[${i}]`);
            walk(value2);
            keys.pop();
          });
          break;
        case "Set":
          Array.from(thing).forEach(walk);
          break;
        case "Map":
          for (const [key2, value2] of thing) {
            keys.push(
              `.get(${is_primitive(key2) ? stringify_primitive2(key2) : "..."})`
            );
            walk(value2);
            keys.pop();
          }
          break;
        case "Int8Array":
        case "Uint8Array":
        case "Uint8ClampedArray":
        case "Int16Array":
        case "Uint16Array":
        case "Int32Array":
        case "Uint32Array":
        case "Float32Array":
        case "Float64Array":
        case "BigInt64Array":
        case "BigUint64Array":
          walk(thing.buffer);
          return;
        case "ArrayBuffer":
          return;
        case "Temporal.Duration":
        case "Temporal.Instant":
        case "Temporal.PlainDate":
        case "Temporal.PlainTime":
        case "Temporal.PlainDateTime":
        case "Temporal.PlainMonthDay":
        case "Temporal.PlainYearMonth":
        case "Temporal.ZonedDateTime":
          return;
        default:
          if (!is_plain_object(thing)) {
            throw new DevalueError(
              `Cannot stringify arbitrary non-POJOs`,
              keys,
              thing,
              value
            );
          }
          if (enumerable_symbols(thing).length > 0) {
            throw new DevalueError(
              `Cannot stringify POJOs with symbolic keys`,
              keys,
              thing,
              value
            );
          }
          for (const key2 in thing) {
            keys.push(stringify_key(key2));
            walk(thing[key2]);
            keys.pop();
          }
      }
    }
  }
  walk(value);
  const names = /* @__PURE__ */ new Map();
  Array.from(counts).filter((entry) => entry[1] > 1).sort((a, b) => b[1] - a[1]).forEach((entry, i) => {
    names.set(entry[0], get_name(i));
  });
  function stringify2(thing) {
    if (names.has(thing)) {
      return names.get(thing);
    }
    if (is_primitive(thing)) {
      return stringify_primitive2(thing);
    }
    if (custom.has(thing)) {
      return custom.get(thing);
    }
    const type = get_type(thing);
    switch (type) {
      case "Number":
      case "String":
      case "Boolean":
        return `Object(${stringify2(thing.valueOf())})`;
      case "RegExp":
        return `new RegExp(${stringify_string(thing.source)}, "${thing.flags}")`;
      case "Date":
        return `new Date(${thing.getTime()})`;
      case "URL":
        return `new URL(${stringify_string(thing.toString())})`;
      case "URLSearchParams":
        return `new URLSearchParams(${stringify_string(thing.toString())})`;
      case "Array":
        const members = (
          /** @type {any[]} */
          thing.map(
            (v, i) => i in thing ? stringify2(v) : ""
          )
        );
        const tail = thing.length === 0 || thing.length - 1 in thing ? "" : ",";
        return `[${members.join(",")}${tail}]`;
      case "Set":
      case "Map":
        return `new ${type}([${Array.from(thing).map(stringify2).join(",")}])`;
      case "Int8Array":
      case "Uint8Array":
      case "Uint8ClampedArray":
      case "Int16Array":
      case "Uint16Array":
      case "Int32Array":
      case "Uint32Array":
      case "Float32Array":
      case "Float64Array":
      case "BigInt64Array":
      case "BigUint64Array": {
        let str2 = `new ${type}`;
        if (counts.get(thing.buffer) === 1) {
          const array2 = new thing.constructor(thing.buffer);
          str2 += `([${array2}])`;
        } else {
          str2 += `([${stringify2(thing.buffer)}])`;
        }
        const a = thing.byteOffset;
        const b = a + thing.byteLength;
        if (a > 0 || b !== thing.buffer.byteLength) {
          const m = +/(\d+)/.exec(type)[1] / 8;
          str2 += `.subarray(${a / m},${b / m})`;
        }
        return str2;
      }
      case "ArrayBuffer": {
        const ui8 = new Uint8Array(thing);
        return `new Uint8Array([${ui8.toString()}]).buffer`;
      }
      case "Temporal.Duration":
      case "Temporal.Instant":
      case "Temporal.PlainDate":
      case "Temporal.PlainTime":
      case "Temporal.PlainDateTime":
      case "Temporal.PlainMonthDay":
      case "Temporal.PlainYearMonth":
      case "Temporal.ZonedDateTime":
        return `${type}.from(${stringify_string(thing.toString())})`;
      default:
        const keys2 = Object.keys(thing);
        const obj = keys2.map((key2) => `${safe_key(key2)}:${stringify2(thing[key2])}`).join(",");
        const proto = Object.getPrototypeOf(thing);
        if (proto === null) {
          return keys2.length > 0 ? `{${obj},__proto__:null}` : `{__proto__:null}`;
        }
        return `{${obj}}`;
    }
  }
  const str = stringify2(value);
  if (names.size) {
    const params = [];
    const statements = [];
    const values = [];
    names.forEach((name, thing) => {
      params.push(name);
      if (custom.has(thing)) {
        values.push(
          /** @type {string} */
          custom.get(thing)
        );
        return;
      }
      if (is_primitive(thing)) {
        values.push(stringify_primitive2(thing));
        return;
      }
      const type = get_type(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
          values.push(`Object(${stringify2(thing.valueOf())})`);
          break;
        case "RegExp":
          values.push(thing.toString());
          break;
        case "Date":
          values.push(`new Date(${thing.getTime()})`);
          break;
        case "Array":
          values.push(`Array(${thing.length})`);
          thing.forEach((v, i) => {
            statements.push(`${name}[${i}]=${stringify2(v)}`);
          });
          break;
        case "Set":
          values.push(`new Set`);
          statements.push(
            `${name}.${Array.from(thing).map((v) => `add(${stringify2(v)})`).join(".")}`
          );
          break;
        case "Map":
          values.push(`new Map`);
          statements.push(
            `${name}.${Array.from(thing).map(([k, v]) => `set(${stringify2(k)}, ${stringify2(v)})`).join(".")}`
          );
          break;
        case "ArrayBuffer":
          values.push(
            `new Uint8Array([${new Uint8Array(thing).join(",")}]).buffer`
          );
          break;
        default:
          values.push(
            Object.getPrototypeOf(thing) === null ? "Object.create(null)" : "{}"
          );
          Object.keys(thing).forEach((key2) => {
            statements.push(
              `${name}${safe_prop(key2)}=${stringify2(thing[key2])}`
            );
          });
      }
    });
    statements.push(`return ${str}`);
    return `(function(${params.join(",")}){${statements.join(
      ";"
    )}}(${values.join(",")}))`;
  } else {
    return str;
  }
}
function get_name(num) {
  let name = "";
  do {
    name = chars[num % chars.length] + name;
    num = ~~(num / chars.length) - 1;
  } while (num >= 0);
  return reserved.test(name) ? `${name}0` : name;
}
function escape_unsafe_char(c2) {
  return escaped[c2] || c2;
}
function escape_unsafe_chars(str) {
  return str.replace(unsafe_chars, escape_unsafe_char);
}
function safe_key(key2) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key2) ? key2 : escape_unsafe_chars(JSON.stringify(key2));
}
function safe_prop(key2) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key2) ? `.${key2}` : `[${escape_unsafe_chars(JSON.stringify(key2))}]`;
}
function stringify_primitive2(thing) {
  if (typeof thing === "string") return stringify_string(thing);
  if (thing === void 0) return "void 0";
  if (thing === 0 && 1 / thing < 0) return "-0";
  const str = String(thing);
  if (typeof thing === "number") return str.replace(/^(-)?0\./, "$1.");
  if (typeof thing === "bigint") return thing + "n";
  return str;
}
function is_boolean_attribute(name) {
  return DOM_BOOLEAN_ATTRIBUTES.includes(name);
}
function is_passive_event(name) {
  return PASSIVE_EVENTS.includes(name);
}
function r(e3) {
  var t2, f, n2 = "";
  if ("string" == typeof e3 || "number" == typeof e3) n2 += e3;
  else if ("object" == typeof e3) if (Array.isArray(e3)) {
    var o2 = e3.length;
    for (t2 = 0; t2 < o2; t2++) e3[t2] && (f = r(e3[t2])) && (n2 && (n2 += " "), n2 += f);
  } else for (f in e3) e3[f] && (n2 && (n2 += " "), n2 += f);
  return n2;
}
function clsx$1() {
  for (var e3, t2, f = 0, n2 = "", o2 = arguments.length; f < o2; f++) (e3 = arguments[f]) && (t2 = r(e3)) && (n2 && (n2 += " "), n2 += t2);
  return n2;
}
function attr(name, value, is_boolean = false) {
  if (name === "hidden" && value !== "until-found") {
    is_boolean = true;
  }
  if (value == null || !value && is_boolean) return "";
  const normalized = name in replacements && replacements[name].get(value) || value;
  const assignment = is_boolean ? "" : `="${escape_html2(normalized, true)}"`;
  return ` ${name}${assignment}`;
}
function clsx(value) {
  if (typeof value === "object") {
    return clsx$1(value);
  } else {
    return value ?? "";
  }
}
function to_class(value, hash2, directives) {
  var classname = value == null ? "" : "" + value;
  if (hash2) {
    classname = classname ? classname + " " + hash2 : hash2;
  }
  if (directives) {
    for (var key2 in directives) {
      if (directives[key2]) {
        classname = classname ? classname + " " + key2 : key2;
      } else if (classname.length) {
        var len = key2.length;
        var a = 0;
        while ((a = classname.indexOf(key2, a)) >= 0) {
          var b = a + len;
          if ((a === 0 || whitespace.includes(classname[a - 1])) && (b === classname.length || whitespace.includes(classname[b]))) {
            classname = (a === 0 ? "" : classname.substring(0, a)) + classname.substring(b + 1);
          } else {
            a = b;
          }
        }
      }
    }
  }
  return classname === "" ? null : classname;
}
function append_styles(styles, important = false) {
  var separator = important ? " !important;" : ";";
  var css = "";
  for (var key2 in styles) {
    var value = styles[key2];
    if (value != null && value !== "") {
      css += " " + key2 + ": " + value + separator;
    }
  }
  return css;
}
function to_css_name(name) {
  if (name[0] !== "-" || name[1] !== "-") {
    return name.toLowerCase();
  }
  return name;
}
function to_style(value, styles) {
  if (styles) {
    var new_style = "";
    var normal_styles;
    var important_styles;
    if (Array.isArray(styles)) {
      normal_styles = styles[0];
      important_styles = styles[1];
    } else {
      normal_styles = styles;
    }
    if (value) {
      value = String(value).replaceAll(/\s*\/\*.*?\*\/\s*/g, "").trim();
      var in_str = false;
      var in_apo = 0;
      var in_comment = false;
      var reserved_names = [];
      if (normal_styles) {
        reserved_names.push(...Object.keys(normal_styles).map(to_css_name));
      }
      if (important_styles) {
        reserved_names.push(...Object.keys(important_styles).map(to_css_name));
      }
      var start_index = 0;
      var name_index = -1;
      const len = value.length;
      for (var i = 0; i < len; i++) {
        var c2 = value[i];
        if (in_comment) {
          if (c2 === "/" && value[i - 1] === "*") {
            in_comment = false;
          }
        } else if (in_str) {
          if (in_str === c2) {
            in_str = false;
          }
        } else if (c2 === "/" && value[i + 1] === "*") {
          in_comment = true;
        } else if (c2 === '"' || c2 === "'") {
          in_str = c2;
        } else if (c2 === "(") {
          in_apo++;
        } else if (c2 === ")") {
          in_apo--;
        }
        if (!in_comment && in_str === false && in_apo === 0) {
          if (c2 === ":" && name_index === -1) {
            name_index = i;
          } else if (c2 === ";" || i === len - 1) {
            if (name_index !== -1) {
              var name = to_css_name(value.substring(start_index, name_index).trim());
              if (!reserved_names.includes(name)) {
                if (c2 !== ";") {
                  i++;
                }
                var property = value.substring(start_index, i).trim();
                new_style += " " + property + ";";
              }
            }
            start_index = i + 1;
            name_index = -1;
          }
        }
      }
    }
    if (normal_styles) {
      new_style += append_styles(normal_styles);
    }
    if (important_styles) {
      new_style += append_styles(important_styles, true);
    }
    new_style = new_style.trim();
    return new_style === "" ? null : new_style;
  }
  return value == null ? null : String(value);
}
function abort() {
  controller?.abort(STALE_REACTION);
  controller = null;
}
function await_invalid() {
  const error2 = new Error(`await_invalid
Encountered asynchronous work while rendering synchronously.
https://svelte.dev/e/await_invalid`);
  error2.name = "Svelte error";
  throw error2;
}
function invalid_csp() {
  const error2 = new Error(`invalid_csp
\`csp.nonce\` was set while \`csp.hash\` was \`true\`. These options cannot be used simultaneously.
https://svelte.dev/e/invalid_csp`);
  error2.name = "Svelte error";
  throw error2;
}
function server_context_required() {
  const error2 = new Error(`server_context_required
Could not resolve \`render\` context.
https://svelte.dev/e/server_context_required`);
  error2.name = "Svelte error";
  throw error2;
}
function unresolved_hydratable(key2, stack) {
  {
    console.warn(`https://svelte.dev/e/unresolved_hydratable`);
  }
}
function get_render_context() {
  const store = als2?.getStore();
  {
    server_context_required();
  }
  return store;
}
async function sha256(data) {
  text_encoder3 ??= new TextEncoder();
  crypto2 ??= globalThis.crypto?.subtle?.digest ? globalThis.crypto : (
    // @ts-ignore - we don't install node types in the prod build
    // don't use 'node:crypto' because static analysers will think we rely on node when we don't
    (await import("node:crypto")).webcrypto
  );
  const hash_buffer = await crypto2.subtle.digest("SHA-256", text_encoder3.encode(data));
  return base64_encode2(hash_buffer);
}
function base64_encode2(bytes) {
  if (globalThis.Buffer) {
    return globalThis.Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
function render(component3, options2 = {}) {
  if (options2.csp?.hash && options2.csp.nonce) {
    invalid_csp();
  }
  return Renderer.render(
    /** @type {Component<Props>} */
    component3,
    options2
  );
}
function attributes(attrs, css_hash, classes, styles, flags2 = 0) {
  if (styles) {
    attrs.style = to_style(attrs.style, styles);
  }
  if (attrs.class) {
    attrs.class = clsx(attrs.class);
  }
  if (css_hash || classes) {
    attrs.class = to_class(attrs.class, css_hash, classes);
  }
  let attr_str = "";
  let name;
  const is_html = (flags2 & ELEMENT_IS_NAMESPACED) === 0;
  const lowercase = (flags2 & ELEMENT_PRESERVE_ATTRIBUTE_CASE) === 0;
  const is_input = (flags2 & ELEMENT_IS_INPUT) !== 0;
  for (name in attrs) {
    if (typeof attrs[name] === "function") continue;
    if (name[0] === "$" && name[1] === "$") continue;
    if (INVALID_ATTR_NAME_CHAR_REGEX.test(name)) continue;
    var value = attrs[name];
    if (lowercase) {
      name = name.toLowerCase();
    }
    if (is_input) {
      if (name === "defaultvalue" || name === "defaultchecked") {
        name = name === "defaultvalue" ? "value" : "checked";
        if (attrs[name]) continue;
      }
    }
    attr_str += attr(name, value, is_html && is_boolean_attribute(name));
  }
  return attr_str;
}
function spread_props(props) {
  const merged_props = {};
  let key2;
  for (let i = 0; i < props.length; i++) {
    const obj = props[i];
    for (key2 in obj) {
      const desc = Object.getOwnPropertyDescriptor(obj, key2);
      if (desc) {
        Object.defineProperty(merged_props, key2, desc);
      } else {
        merged_props[key2] = obj[key2];
      }
    }
  }
  return merged_props;
}
function attr_class(value, hash2, directives) {
  var result = to_class(value, hash2, directives);
  return result ? ` class="${escape_html2(result, true)}"` : "";
}
function attr_style(value, directives) {
  var result = to_style(value, directives);
  return result ? ` style="${escape_html2(result, true)}"` : "";
}
var chars, unsafe_chars, reserved, DOM_BOOLEAN_ATTRIBUTES, PASSIVE_EVENTS, replacements, whitespace, BLOCK_OPEN, BLOCK_CLOSE, controller, als2, text_encoder3, crypto2, Renderer, SSRState, INVALID_ATTR_NAME_CHAR_REGEX;
var init_chunks = __esm({
  ".svelte-kit/output/server/chunks/index.js"() {
    init_context();
    init_utils2();
    chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$";
    unsafe_chars = /[<\b\f\n\r\t\0\u2028\u2029]/g;
    reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
    DOM_BOOLEAN_ATTRIBUTES = [
      "allowfullscreen",
      "async",
      "autofocus",
      "autoplay",
      "checked",
      "controls",
      "default",
      "disabled",
      "formnovalidate",
      "indeterminate",
      "inert",
      "ismap",
      "loop",
      "multiple",
      "muted",
      "nomodule",
      "novalidate",
      "open",
      "playsinline",
      "readonly",
      "required",
      "reversed",
      "seamless",
      "selected",
      "webkitdirectory",
      "defer",
      "disablepictureinpicture",
      "disableremoteplayback"
    ];
    PASSIVE_EVENTS = ["touchstart", "touchmove"];
    replacements = {
      translate: /* @__PURE__ */ new Map([
        [true, "yes"],
        [false, "no"]
      ])
    };
    whitespace = [..." 	\n\r\f\xA0\v\uFEFF"];
    BLOCK_OPEN = `<!--${HYDRATION_START}-->`;
    BLOCK_CLOSE = `<!--${HYDRATION_END}-->`;
    controller = null;
    als2 = null;
    Renderer = class _Renderer {
      /**
       * The contents of the renderer.
       * @type {RendererItem[]}
       */
      #out = [];
      /**
       * Any `onDestroy` callbacks registered during execution of this renderer.
       * @type {(() => void)[] | undefined}
       */
      #on_destroy = void 0;
      /**
       * Whether this renderer is a component body.
       * @type {boolean}
       */
      #is_component_body = false;
      /**
       * The type of string content that this renderer is accumulating.
       * @type {RendererType}
       */
      type;
      /** @type {Renderer | undefined} */
      #parent;
      /**
       * Asynchronous work associated with this renderer
       * @type {Promise<void> | undefined}
       */
      promise = void 0;
      /**
       * State which is associated with the content tree as a whole.
       * It will be re-exposed, uncopied, on all children.
       * @type {SSRState}
       * @readonly
       */
      global;
      /**
       * State that is local to the branch it is declared in.
       * It will be shallow-copied to all children.
       *
       * @type {{ select_value: string | undefined }}
       */
      local;
      /**
       * @param {SSRState} global
       * @param {Renderer | undefined} [parent]
       */
      constructor(global, parent) {
        this.#parent = parent;
        this.global = global;
        this.local = parent ? { ...parent.local } : { select_value: void 0 };
        this.type = parent ? parent.type : "body";
      }
      /**
       * @param {(renderer: Renderer) => void} fn
       */
      head(fn) {
        const head2 = new _Renderer(this.global, this);
        head2.type = "head";
        this.#out.push(head2);
        head2.child(fn);
      }
      /**
       * @param {Array<Promise<void>>} blockers
       * @param {(renderer: Renderer) => void} fn
       */
      async_block(blockers, fn) {
        this.#out.push(BLOCK_OPEN);
        this.async(blockers, fn);
        this.#out.push(BLOCK_CLOSE);
      }
      /**
       * @param {Array<Promise<void>>} blockers
       * @param {(renderer: Renderer) => void} fn
       */
      async(blockers, fn) {
        let callback = fn;
        if (blockers.length > 0) {
          const context2 = ssr_context;
          callback = (renderer) => {
            return Promise.all(blockers).then(() => {
              const previous_context = ssr_context;
              try {
                set_ssr_context(context2);
                return fn(renderer);
              } finally {
                set_ssr_context(previous_context);
              }
            });
          };
        }
        this.child(callback);
      }
      /**
       * @param {Array<() => void>} thunks
       */
      run(thunks) {
        const context2 = ssr_context;
        let promise = Promise.resolve(thunks[0]());
        const promises = [promise];
        for (const fn of thunks.slice(1)) {
          promise = promise.then(() => {
            const previous_context = ssr_context;
            set_ssr_context(context2);
            try {
              return fn();
            } finally {
              set_ssr_context(previous_context);
            }
          });
          promises.push(promise);
        }
        promise.catch(noop);
        this.promise = promise;
        return promises;
      }
      /**
       * Create a child renderer. The child renderer inherits the state from the parent,
       * but has its own content.
       * @param {(renderer: Renderer) => MaybePromise<void>} fn
       */
      child(fn) {
        const child = new _Renderer(this.global, this);
        this.#out.push(child);
        const parent = ssr_context;
        set_ssr_context({
          ...ssr_context,
          p: parent,
          c: null,
          r: child
        });
        const result = fn(child);
        set_ssr_context(parent);
        if (result instanceof Promise) {
          if (child.global.mode === "sync") {
            await_invalid();
          }
          result.catch(() => {
          });
          child.promise = result;
        }
        return child;
      }
      /**
       * Create a component renderer. The component renderer inherits the state from the parent,
       * but has its own content. It is treated as an ordering boundary for ondestroy callbacks.
       * @param {(renderer: Renderer) => MaybePromise<void>} fn
       * @param {Function} [component_fn]
       * @returns {void}
       */
      component(fn, component_fn) {
        push();
        const child = this.child(fn);
        child.#is_component_body = true;
        pop();
      }
      /**
       * @param {Record<string, any>} attrs
       * @param {(renderer: Renderer) => void} fn
       * @param {string | undefined} [css_hash]
       * @param {Record<string, boolean> | undefined} [classes]
       * @param {Record<string, string> | undefined} [styles]
       * @param {number | undefined} [flags]
       * @param {boolean | undefined} [is_rich]
       * @returns {void}
       */
      select(attrs, fn, css_hash, classes, styles, flags2, is_rich) {
        const { value, ...select_attrs } = attrs;
        this.push(`<select${attributes(select_attrs, css_hash, classes, styles, flags2)}>`);
        this.child((renderer) => {
          renderer.local.select_value = value;
          fn(renderer);
        });
        this.push(`${is_rich ? "<!>" : ""}</select>`);
      }
      /**
       * @param {Record<string, any>} attrs
       * @param {string | number | boolean | ((renderer: Renderer) => void)} body
       * @param {string | undefined} [css_hash]
       * @param {Record<string, boolean> | undefined} [classes]
       * @param {Record<string, string> | undefined} [styles]
       * @param {number | undefined} [flags]
       * @param {boolean | undefined} [is_rich]
       */
      option(attrs, body2, css_hash, classes, styles, flags2, is_rich) {
        this.#out.push(`<option${attributes(attrs, css_hash, classes, styles, flags2)}`);
        const close = (renderer, value, { head: head2, body: body22 }) => {
          if ("value" in attrs) {
            value = attrs.value;
          }
          if (value === this.local.select_value) {
            renderer.#out.push(" selected");
          }
          renderer.#out.push(`>${body22}${is_rich ? "<!>" : ""}</option>`);
          if (head2) {
            renderer.head((child) => child.push(head2));
          }
        };
        if (typeof body2 === "function") {
          this.child((renderer) => {
            const r23 = new _Renderer(this.global, this);
            body2(r23);
            if (this.global.mode === "async") {
              return r23.#collect_content_async().then((content) => {
                close(renderer, content.body.replaceAll("<!---->", ""), content);
              });
            } else {
              const content = r23.#collect_content();
              close(renderer, content.body.replaceAll("<!---->", ""), content);
            }
          });
        } else {
          close(this, body2, { body: body2 });
        }
      }
      /**
       * @param {(renderer: Renderer) => void} fn
       */
      title(fn) {
        const path = this.get_path();
        const close = (head2) => {
          this.global.set_title(head2, path);
        };
        this.child((renderer) => {
          const r23 = new _Renderer(renderer.global, renderer);
          fn(r23);
          if (renderer.global.mode === "async") {
            return r23.#collect_content_async().then((content) => {
              close(content.head);
            });
          } else {
            const content = r23.#collect_content();
            close(content.head);
          }
        });
      }
      /**
       * @param {string | (() => Promise<string>)} content
       */
      push(content) {
        if (typeof content === "function") {
          this.child(async (renderer) => renderer.push(await content()));
        } else {
          this.#out.push(content);
        }
      }
      /**
       * @param {() => void} fn
       */
      on_destroy(fn) {
        (this.#on_destroy ??= []).push(fn);
      }
      /**
       * @returns {number[]}
       */
      get_path() {
        return this.#parent ? [...this.#parent.get_path(), this.#parent.#out.indexOf(this)] : [];
      }
      /**
       * @deprecated this is needed for legacy component bindings
       */
      copy() {
        const copy = new _Renderer(this.global, this.#parent);
        copy.#out = this.#out.map((item) => item instanceof _Renderer ? item.copy() : item);
        copy.promise = this.promise;
        return copy;
      }
      /**
       * @param {Renderer} other
       * @deprecated this is needed for legacy component bindings
       */
      subsume(other) {
        if (this.global.mode !== other.global.mode) {
          throw new Error(
            "invariant: A renderer cannot switch modes. If you're seeing this, there's a compiler bug. File an issue!"
          );
        }
        this.local = other.local;
        this.#out = other.#out.map((item) => {
          if (item instanceof _Renderer) {
            item.subsume(item);
          }
          return item;
        });
        this.promise = other.promise;
        this.type = other.type;
      }
      get length() {
        return this.#out.length;
      }
      /**
       * Only available on the server and when compiling with the `server` option.
       * Takes a component and returns an object with `body` and `head` properties on it, which you can use to populate the HTML when server-rendering your app.
       * @template {Record<string, any>} Props
       * @param {Component<Props>} component
       * @param {{ props?: Omit<Props, '$$slots' | '$$events'>; context?: Map<any, any>; idPrefix?: string; csp?: Csp }} [options]
       * @returns {RenderOutput}
       */
      static render(component3, options2 = {}) {
        let sync;
        const result = (
          /** @type {RenderOutput} */
          {}
        );
        Object.defineProperties(result, {
          html: {
            get: () => {
              return (sync ??= _Renderer.#render(component3, options2)).body;
            }
          },
          head: {
            get: () => {
              return (sync ??= _Renderer.#render(component3, options2)).head;
            }
          },
          body: {
            get: () => {
              return (sync ??= _Renderer.#render(component3, options2)).body;
            }
          },
          hashes: {
            value: {
              script: ""
            }
          },
          then: {
            value: (
              /**
               * this is not type-safe, but honestly it's the best I can do right now, and it's a straightforward function.
               *
               * @template TResult1
               * @template [TResult2=never]
               * @param { (value: SyncRenderOutput) => TResult1 } onfulfilled
               * @param { (reason: unknown) => TResult2 } onrejected
               */
              (onfulfilled, onrejected) => {
                {
                  const result2 = sync ??= _Renderer.#render(component3, options2);
                  const user_result = onfulfilled({
                    head: result2.head,
                    body: result2.body,
                    html: result2.body,
                    hashes: { script: [] }
                  });
                  return Promise.resolve(user_result);
                }
              }
            )
          }
        });
        return result;
      }
      /**
       * Collect all of the `onDestroy` callbacks registered during rendering. In an async context, this is only safe to call
       * after awaiting `collect_async`.
       *
       * Child renderers are "porous" and don't affect execution order, but component body renderers
       * create ordering boundaries. Within a renderer, callbacks run in order until hitting a component boundary.
       * @returns {Iterable<() => void>}
       */
      *#collect_on_destroy() {
        for (const component3 of this.#traverse_components()) {
          yield* component3.#collect_ondestroy();
        }
      }
      /**
       * Performs a depth-first search of renderers, yielding the deepest components first, then additional components as we backtrack up the tree.
       * @returns {Iterable<Renderer>}
       */
      *#traverse_components() {
        for (const child of this.#out) {
          if (typeof child !== "string") {
            yield* child.#traverse_components();
          }
        }
        if (this.#is_component_body) {
          yield this;
        }
      }
      /**
       * @returns {Iterable<() => void>}
       */
      *#collect_ondestroy() {
        if (this.#on_destroy) {
          for (const fn of this.#on_destroy) {
            yield fn;
          }
        }
        for (const child of this.#out) {
          if (child instanceof _Renderer && !child.#is_component_body) {
            yield* child.#collect_ondestroy();
          }
        }
      }
      /**
       * Render a component. Throws if any of the children are performing asynchronous work.
       *
       * @template {Record<string, any>} Props
       * @param {Component<Props>} component
       * @param {{ props?: Omit<Props, '$$slots' | '$$events'>; context?: Map<any, any>; idPrefix?: string }} options
       * @returns {AccumulatedContent}
       */
      static #render(component3, options2) {
        var previous_context = ssr_context;
        try {
          const renderer = _Renderer.#open_render("sync", component3, options2);
          const content = renderer.#collect_content();
          return _Renderer.#close_render(content, renderer);
        } finally {
          abort();
          set_ssr_context(previous_context);
        }
      }
      /**
       * Render a component.
       *
       * @template {Record<string, any>} Props
       * @param {Component<Props>} component
       * @param {{ props?: Omit<Props, '$$slots' | '$$events'>; context?: Map<any, any>; idPrefix?: string; csp?: Csp }} options
       * @returns {Promise<AccumulatedContent & { hashes: { script: Sha256Source[] } }>}
       */
      static async #render_async(component3, options2) {
        const previous_context = ssr_context;
        try {
          const renderer = _Renderer.#open_render("async", component3, options2);
          const content = await renderer.#collect_content_async();
          const hydratables = await renderer.#collect_hydratables();
          if (hydratables !== null) {
            content.head = hydratables + content.head;
          }
          return _Renderer.#close_render(content, renderer);
        } finally {
          set_ssr_context(previous_context);
          abort();
        }
      }
      /**
       * Collect all of the code from the `out` array and return it as a string, or a promise resolving to a string.
       * @param {AccumulatedContent} content
       * @returns {AccumulatedContent}
       */
      #collect_content(content = { head: "", body: "" }) {
        for (const item of this.#out) {
          if (typeof item === "string") {
            content[this.type] += item;
          } else if (item instanceof _Renderer) {
            item.#collect_content(content);
          }
        }
        return content;
      }
      /**
       * Collect all of the code from the `out` array and return it as a string.
       * @param {AccumulatedContent} content
       * @returns {Promise<AccumulatedContent>}
       */
      async #collect_content_async(content = { head: "", body: "" }) {
        await this.promise;
        for (const item of this.#out) {
          if (typeof item === "string") {
            content[this.type] += item;
          } else if (item instanceof _Renderer) {
            await item.#collect_content_async(content);
          }
        }
        return content;
      }
      async #collect_hydratables() {
        const ctx = get_render_context().hydratable;
        for (const [_, key2] of ctx.unresolved_promises) {
          unresolved_hydratable(key2, ctx.lookup.get(key2)?.stack ?? "<missing stack trace>");
        }
        for (const comparison of ctx.comparisons) {
          await comparison;
        }
        return await this.#hydratable_block(ctx);
      }
      /**
       * @template {Record<string, any>} Props
       * @param {'sync' | 'async'} mode
       * @param {import('svelte').Component<Props>} component
       * @param {{ props?: Omit<Props, '$$slots' | '$$events'>; context?: Map<any, any>; idPrefix?: string; csp?: Csp }} options
       * @returns {Renderer}
       */
      static #open_render(mode, component3, options2) {
        const renderer = new _Renderer(
          new SSRState(mode, options2.idPrefix ? options2.idPrefix + "-" : "", options2.csp)
        );
        renderer.push(BLOCK_OPEN);
        if (options2.context) {
          push();
          ssr_context.c = options2.context;
          ssr_context.r = renderer;
        }
        component3(renderer, options2.props ?? {});
        if (options2.context) {
          pop();
        }
        renderer.push(BLOCK_CLOSE);
        return renderer;
      }
      /**
       * @param {AccumulatedContent} content
       * @param {Renderer} renderer
       * @returns {AccumulatedContent & { hashes: { script: Sha256Source[] } }}
       */
      static #close_render(content, renderer) {
        for (const cleanup of renderer.#collect_on_destroy()) {
          cleanup();
        }
        let head2 = content.head + renderer.global.get_title();
        let body2 = content.body;
        for (const { hash: hash2, code } of renderer.global.css) {
          head2 += `<style id="${hash2}">${code}</style>`;
        }
        return {
          head: head2,
          body: body2,
          hashes: {
            script: renderer.global.csp.script_hashes
          }
        };
      }
      /**
       * @param {HydratableContext} ctx
       */
      async #hydratable_block(ctx) {
        if (ctx.lookup.size === 0) {
          return null;
        }
        let entries = [];
        let has_promises = false;
        for (const [k, v] of ctx.lookup) {
          if (v.promises) {
            has_promises = true;
            for (const p of v.promises) await p;
          }
          entries.push(`[${uneval(k)},${v.serialized}]`);
        }
        let prelude = `const h = (window.__svelte ??= {}).h ??= new Map();`;
        if (has_promises) {
          prelude = `const r = (v) => Promise.resolve(v);
				${prelude}`;
        }
        const body2 = `
			{
				${prelude}

				for (const [k, v] of [
					${entries.join(",\n					")}
				]) {
					h.set(k, v);
				}
			}
		`;
        let csp_attr = "";
        if (this.global.csp.nonce) {
          csp_attr = ` nonce="${this.global.csp.nonce}"`;
        } else if (this.global.csp.hash) {
          const hash2 = await sha256(body2);
          this.global.csp.script_hashes.push(`sha256-${hash2}`);
        }
        return `
		<script${csp_attr}>${body2}<\/script>`;
      }
    };
    SSRState = class {
      /** @readonly @type {Csp & { script_hashes: Sha256Source[] }} */
      csp;
      /** @readonly @type {'sync' | 'async'} */
      mode;
      /** @readonly @type {() => string} */
      uid;
      /** @readonly @type {Set<{ hash: string; code: string }>} */
      css = /* @__PURE__ */ new Set();
      /** @type {{ path: number[], value: string }} */
      #title = { path: [], value: "" };
      /**
       * @param {'sync' | 'async'} mode
       * @param {string} id_prefix
       * @param {Csp} csp
       */
      constructor(mode, id_prefix = "", csp = { hash: false }) {
        this.mode = mode;
        this.csp = { ...csp, script_hashes: [] };
        let uid = 1;
        this.uid = () => `${id_prefix}s${uid++}`;
      }
      get_title() {
        return this.#title.value;
      }
      /**
       * Performs a depth-first (lexicographic) comparison using the path. Rejects sets
       * from earlier than or equal to the current value.
       * @param {string} value
       * @param {number[]} path
       */
      set_title(value, path) {
        const current2 = this.#title.path;
        let i = 0;
        let l = Math.min(path.length, current2.length);
        while (i < l && path[i] === current2[i]) i += 1;
        if (path[i] === void 0) return;
        if (current2[i] === void 0 || path[i] > current2[i]) {
          this.#title.path = path;
          this.#title.value = value;
        }
      }
    };
    INVALID_ATTR_NAME_CHAR_REGEX = /[\s'">/=\u{FDD0}-\u{FDEF}\u{FFFE}\u{FFFF}\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}]/u;
  }
});

// .svelte-kit/output/server/chunks/exports.js
function resolve(base2, path) {
  if (path[0] === "/" && path[1] === "/") return path;
  let url = new URL(base2, internal);
  url = new URL(path, url);
  return url.protocol === internal.protocol ? url.pathname + url.search + url.hash : url.href;
}
function normalize_path(path, trailing_slash) {
  if (path === "/" || trailing_slash === "ignore") return path;
  if (trailing_slash === "never") {
    return path.endsWith("/") ? path.slice(0, -1) : path;
  } else if (trailing_slash === "always" && !path.endsWith("/")) {
    return path + "/";
  }
  return path;
}
function decode_pathname(pathname) {
  return pathname.split("%25").map(decodeURI).join("%25");
}
function decode_params(params) {
  for (const key2 in params) {
    params[key2] = decodeURIComponent(params[key2]);
  }
  return params;
}
function make_trackable(url, callback, search_params_callback, allow_hash = false) {
  const tracked = new URL(url);
  Object.defineProperty(tracked, "searchParams", {
    value: new Proxy(tracked.searchParams, {
      get(obj, key2) {
        if (key2 === "get" || key2 === "getAll" || key2 === "has") {
          return (param, ...rest) => {
            search_params_callback(param);
            return obj[key2](param, ...rest);
          };
        }
        callback();
        const value = Reflect.get(obj, key2);
        return typeof value === "function" ? value.bind(obj) : value;
      }
    }),
    enumerable: true,
    configurable: true
  });
  const tracked_url_properties = ["href", "pathname", "search", "toString", "toJSON"];
  if (allow_hash) tracked_url_properties.push("hash");
  for (const property of tracked_url_properties) {
    Object.defineProperty(tracked, property, {
      get() {
        callback();
        return url[property];
      },
      enumerable: true,
      configurable: true
    });
  }
  {
    tracked[/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")] = (depth, opts, inspect) => {
      return inspect(url, opts);
    };
    tracked.searchParams[/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")] = (depth, opts, inspect) => {
      return inspect(url.searchParams, opts);
    };
  }
  if (!allow_hash) {
    disable_hash(tracked);
  }
  return tracked;
}
function disable_hash(url) {
  allow_nodejs_console_log(url);
  Object.defineProperty(url, "hash", {
    get() {
      throw new Error(
        "Cannot access event.url.hash. Consider using `page.url.hash` inside a component instead"
      );
    }
  });
}
function disable_search(url) {
  allow_nodejs_console_log(url);
  for (const property of ["search", "searchParams"]) {
    Object.defineProperty(url, property, {
      get() {
        throw new Error(`Cannot access url.${property} on a page with prerendering enabled`);
      }
    });
  }
}
function allow_nodejs_console_log(url) {
  {
    url[/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")] = (depth, opts, inspect) => {
      return inspect(new URL(url), opts);
    };
  }
}
function validator(expected) {
  function validate(module, file) {
    if (!module) return;
    for (const key2 in module) {
      if (key2[0] === "_" || expected.has(key2)) continue;
      const values = [...expected.values()];
      const hint = hint_for_supported_files(key2, file?.slice(file.lastIndexOf("."))) ?? `valid exports are ${values.join(", ")}, or anything with a '_' prefix`;
      throw new Error(`Invalid export '${key2}'${file ? ` in ${file}` : ""} (${hint})`);
    }
  }
  return validate;
}
function hint_for_supported_files(key2, ext = ".js") {
  const supported_files = [];
  if (valid_layout_exports.has(key2)) {
    supported_files.push(`+layout${ext}`);
  }
  if (valid_page_exports.has(key2)) {
    supported_files.push(`+page${ext}`);
  }
  if (valid_layout_server_exports.has(key2)) {
    supported_files.push(`+layout.server${ext}`);
  }
  if (valid_page_server_exports.has(key2)) {
    supported_files.push(`+page.server${ext}`);
  }
  if (valid_server_exports.has(key2)) {
    supported_files.push(`+server${ext}`);
  }
  if (supported_files.length > 0) {
    return `'${key2}' is a valid export in ${supported_files.slice(0, -1).join(", ")}${supported_files.length > 1 ? " or " : ""}${supported_files.at(-1)}`;
  }
}
var internal, valid_layout_exports, valid_page_exports, valid_layout_server_exports, valid_page_server_exports, valid_server_exports, validate_layout_exports, validate_page_exports, validate_layout_server_exports, validate_page_server_exports, validate_server_exports;
var init_exports = __esm({
  ".svelte-kit/output/server/chunks/exports.js"() {
    internal = new URL("sveltekit-internal://");
    valid_layout_exports = /* @__PURE__ */ new Set([
      "load",
      "prerender",
      "csr",
      "ssr",
      "trailingSlash",
      "config"
    ]);
    valid_page_exports = /* @__PURE__ */ new Set([...valid_layout_exports, "entries"]);
    valid_layout_server_exports = /* @__PURE__ */ new Set([...valid_layout_exports]);
    valid_page_server_exports = /* @__PURE__ */ new Set([...valid_layout_server_exports, "actions", "entries"]);
    valid_server_exports = /* @__PURE__ */ new Set([
      "GET",
      "POST",
      "PATCH",
      "PUT",
      "DELETE",
      "OPTIONS",
      "HEAD",
      "fallback",
      "prerender",
      "trailingSlash",
      "config",
      "entries"
    ]);
    validate_layout_exports = validator(valid_layout_exports);
    validate_page_exports = validator(valid_page_exports);
    validate_layout_server_exports = validator(valid_layout_server_exports);
    validate_page_server_exports = validator(valid_page_server_exports);
    validate_server_exports = validator(valid_server_exports);
  }
});

// .svelte-kit/output/server/chunks/runtime.js
function equals(value) {
  return value === this.v;
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || a !== null && typeof a === "object" || typeof a === "function";
}
function safe_equals(value) {
  return !safe_not_equal(value, this.v);
}
function effect_update_depth_exceeded() {
  {
    throw new Error(`https://svelte.dev/e/effect_update_depth_exceeded`);
  }
}
function hydration_failed() {
  {
    throw new Error(`https://svelte.dev/e/hydration_failed`);
  }
}
function state_descriptors_fixed() {
  {
    throw new Error(`https://svelte.dev/e/state_descriptors_fixed`);
  }
}
function state_prototype_fixed() {
  {
    throw new Error(`https://svelte.dev/e/state_prototype_fixed`);
  }
}
function state_unsafe_mutation() {
  {
    throw new Error(`https://svelte.dev/e/state_unsafe_mutation`);
  }
}
function svelte_boundary_reset_onerror() {
  {
    throw new Error(`https://svelte.dev/e/svelte_boundary_reset_onerror`);
  }
}
function set_component_context(context2) {
  component_context = context2;
}
function push2(props, runes = false, fn) {
  component_context = {
    p: component_context,
    i: false,
    c: null,
    e: null,
    s: props,
    x: null,
    l: null
  };
}
function pop2(component3) {
  var context2 = (
    /** @type {ComponentContext} */
    component_context
  );
  var effects = context2.e;
  if (effects !== null) {
    context2.e = null;
    for (var fn of effects) {
      create_user_effect(fn);
    }
  }
  context2.i = true;
  component_context = context2.p;
  return (
    /** @type {T} */
    {}
  );
}
function is_runes() {
  return true;
}
function run_micro_tasks() {
  var tasks = micro_tasks;
  micro_tasks = [];
  run_all(tasks);
}
function queue_micro_task(fn) {
  if (micro_tasks.length === 0 && !is_flushing_sync) {
    var tasks = micro_tasks;
    queueMicrotask(() => {
      if (tasks === micro_tasks) run_micro_tasks();
    });
  }
  micro_tasks.push(fn);
}
function flush_tasks() {
  while (micro_tasks.length > 0) {
    run_micro_tasks();
  }
}
function handle_error(error2) {
  var effect = active_effect;
  if (effect === null) {
    active_reaction.f |= ERROR_VALUE;
    return error2;
  }
  if ((effect.f & EFFECT_RAN) === 0) {
    if ((effect.f & BOUNDARY_EFFECT) === 0) {
      throw error2;
    }
    effect.b.error(error2);
  } else {
    invoke_error_boundary(error2, effect);
  }
}
function invoke_error_boundary(error2, effect) {
  while (effect !== null) {
    if ((effect.f & BOUNDARY_EFFECT) !== 0) {
      try {
        effect.b.error(error2);
        return;
      } catch (e3) {
        error2 = e3;
      }
    }
    effect = effect.parent;
  }
  throw error2;
}
function set_signal_status(signal, status) {
  signal.f = signal.f & STATUS_MASK | status;
}
function update_derived_status(derived) {
  if ((derived.f & CONNECTED) !== 0 || derived.deps === null) {
    set_signal_status(derived, CLEAN);
  } else {
    set_signal_status(derived, MAYBE_DIRTY);
  }
}
function clear_marked(deps) {
  if (deps === null) return;
  for (const dep of deps) {
    if ((dep.f & DERIVED) === 0 || (dep.f & WAS_MARKED) === 0) {
      continue;
    }
    dep.f ^= WAS_MARKED;
    clear_marked(
      /** @type {Derived} */
      dep.deps
    );
  }
}
function defer_effect(effect, dirty_effects, maybe_dirty_effects) {
  if ((effect.f & DIRTY) !== 0) {
    dirty_effects.add(effect);
  } else if ((effect.f & MAYBE_DIRTY) !== 0) {
    maybe_dirty_effects.add(effect);
  }
  clear_marked(effect.deps);
  set_signal_status(effect, CLEAN);
}
function flushSync(fn) {
  var was_flushing_sync = is_flushing_sync;
  is_flushing_sync = true;
  try {
    var result;
    if (fn) ;
    while (true) {
      flush_tasks();
      if (queued_root_effects.length === 0) {
        current_batch?.flush();
        if (queued_root_effects.length === 0) {
          last_scheduled_effect = null;
          return (
            /** @type {T} */
            result
          );
        }
      }
      flush_effects();
    }
  } finally {
    is_flushing_sync = was_flushing_sync;
  }
}
function flush_effects() {
  is_flushing = true;
  var source_stacks = null;
  try {
    var flush_count = 0;
    while (queued_root_effects.length > 0) {
      var batch = Batch.ensure();
      if (flush_count++ > 1e3) {
        var updates, entry;
        if (dev) ;
        infinite_loop_guard();
      }
      batch.process(queued_root_effects);
      old_values.clear();
      if (dev) ;
    }
  } finally {
    is_flushing = false;
    last_scheduled_effect = null;
  }
}
function infinite_loop_guard() {
  try {
    effect_update_depth_exceeded();
  } catch (error2) {
    invoke_error_boundary(error2, last_scheduled_effect);
  }
}
function flush_queued_effects(effects) {
  var length = effects.length;
  if (length === 0) return;
  var i = 0;
  while (i < length) {
    var effect = effects[i++];
    if ((effect.f & (DESTROYED | INERT)) === 0 && is_dirty(effect)) {
      eager_block_effects = /* @__PURE__ */ new Set();
      update_effect(effect);
      if (effect.deps === null && effect.first === null && effect.nodes === null) {
        if (effect.teardown === null && effect.ac === null) {
          unlink_effect(effect);
        } else {
          effect.fn = null;
        }
      }
      if (eager_block_effects?.size > 0) {
        old_values.clear();
        for (const e3 of eager_block_effects) {
          if ((e3.f & (DESTROYED | INERT)) !== 0) continue;
          const ordered_effects = [e3];
          let ancestor = e3.parent;
          while (ancestor !== null) {
            if (eager_block_effects.has(ancestor)) {
              eager_block_effects.delete(ancestor);
              ordered_effects.push(ancestor);
            }
            ancestor = ancestor.parent;
          }
          for (let j = ordered_effects.length - 1; j >= 0; j--) {
            const e22 = ordered_effects[j];
            if ((e22.f & (DESTROYED | INERT)) !== 0) continue;
            update_effect(e22);
          }
        }
        eager_block_effects.clear();
      }
    }
  }
  eager_block_effects = null;
}
function mark_effects(value, sources, marked, checked) {
  if (marked.has(value)) return;
  marked.add(value);
  if (value.reactions !== null) {
    for (const reaction of value.reactions) {
      const flags2 = reaction.f;
      if ((flags2 & DERIVED) !== 0) {
        mark_effects(
          /** @type {Derived} */
          reaction,
          sources,
          marked,
          checked
        );
      } else if ((flags2 & (ASYNC | BLOCK_EFFECT)) !== 0 && (flags2 & DIRTY) === 0 && depends_on(reaction, sources, checked)) {
        set_signal_status(reaction, DIRTY);
        schedule_effect(
          /** @type {Effect} */
          reaction
        );
      }
    }
  }
}
function depends_on(reaction, sources, checked) {
  const depends = checked.get(reaction);
  if (depends !== void 0) return depends;
  if (reaction.deps !== null) {
    for (const dep of reaction.deps) {
      if (includes.call(sources, dep)) {
        return true;
      }
      if ((dep.f & DERIVED) !== 0 && depends_on(
        /** @type {Derived} */
        dep,
        sources,
        checked
      )) {
        checked.set(
          /** @type {Derived} */
          dep,
          true
        );
        return true;
      }
    }
  }
  checked.set(reaction, false);
  return false;
}
function schedule_effect(signal) {
  var effect = last_scheduled_effect = signal;
  while (effect.parent !== null) {
    effect = effect.parent;
    var flags2 = effect.f;
    if (is_flushing && effect === active_effect && (flags2 & BLOCK_EFFECT) !== 0 && (flags2 & HEAD_EFFECT) === 0) {
      return;
    }
    if ((flags2 & (ROOT_EFFECT | BRANCH_EFFECT)) !== 0) {
      if ((flags2 & CLEAN) === 0) return;
      effect.f ^= CLEAN;
    }
  }
  queued_root_effects.push(effect);
}
function reset_branch(effect, tracked) {
  if ((effect.f & BRANCH_EFFECT) !== 0 && (effect.f & CLEAN) !== 0) {
    return;
  }
  if ((effect.f & DIRTY) !== 0) {
    tracked.d.push(effect);
  } else if ((effect.f & MAYBE_DIRTY) !== 0) {
    tracked.m.push(effect);
  }
  set_signal_status(effect, CLEAN);
  var e3 = effect.first;
  while (e3 !== null) {
    reset_branch(e3, tracked);
    e3 = e3.next;
  }
}
function destroy_derived_effects(derived) {
  var effects = derived.effects;
  if (effects !== null) {
    derived.effects = null;
    for (var i = 0; i < effects.length; i += 1) {
      destroy_effect(
        /** @type {Effect} */
        effects[i]
      );
    }
  }
}
function get_derived_parent_effect(derived) {
  var parent = derived.parent;
  while (parent !== null) {
    if ((parent.f & DERIVED) === 0) {
      return (parent.f & DESTROYED) === 0 ? (
        /** @type {Effect} */
        parent
      ) : null;
    }
    parent = parent.parent;
  }
  return null;
}
function execute_derived(derived) {
  var value;
  var prev_active_effect = active_effect;
  set_active_effect(get_derived_parent_effect(derived));
  {
    try {
      derived.f &= ~WAS_MARKED;
      destroy_derived_effects(derived);
      value = update_reaction(derived);
    } finally {
      set_active_effect(prev_active_effect);
    }
  }
  return value;
}
function update_derived(derived) {
  var value = execute_derived(derived);
  if (!derived.equals(value)) {
    derived.wv = increment_write_version();
    if (!current_batch?.is_fork || derived.deps === null) {
      derived.v = value;
      if (derived.deps === null) {
        set_signal_status(derived, CLEAN);
        return;
      }
    }
  }
  if (is_destroying_effect) {
    return;
  }
  if (batch_values !== null) {
    if (effect_tracking() || current_batch?.is_fork) {
      batch_values.set(derived, value);
    }
  } else {
    update_derived_status(derived);
  }
}
function source(v, stack) {
  var signal = {
    f: 0,
    // TODO ideally we could skip this altogether, but it causes type errors
    v,
    reactions: null,
    equals,
    rv: 0,
    wv: 0
  };
  return signal;
}
// @__NO_SIDE_EFFECTS__
function state(v, stack) {
  const s3 = source(v);
  push_reaction_value(s3);
  return s3;
}
// @__NO_SIDE_EFFECTS__
function mutable_source(initial_value, immutable2 = false, trackable = true) {
  const s3 = source(initial_value);
  if (!immutable2) {
    s3.equals = safe_equals;
  }
  return s3;
}
function set(source2, value, should_proxy = false) {
  if (active_reaction !== null && // since we are untracking the function inside `$inspect.with` we need to add this check
  // to ensure we error if state is set inside an inspect effect
  (!untracking || (active_reaction.f & EAGER_EFFECT) !== 0) && is_runes() && (active_reaction.f & (DERIVED | BLOCK_EFFECT | ASYNC | EAGER_EFFECT)) !== 0 && (current_sources === null || !includes.call(current_sources, source2))) {
    state_unsafe_mutation();
  }
  let new_value = should_proxy ? proxy(value) : value;
  return internal_set(source2, new_value);
}
function internal_set(source2, value) {
  if (!source2.equals(value)) {
    var old_value = source2.v;
    if (is_destroying_effect) {
      old_values.set(source2, value);
    } else {
      old_values.set(source2, old_value);
    }
    source2.v = value;
    var batch = Batch.ensure();
    batch.capture(source2, old_value);
    if ((source2.f & DERIVED) !== 0) {
      const derived = (
        /** @type {Derived} */
        source2
      );
      if ((source2.f & DIRTY) !== 0) {
        execute_derived(derived);
      }
      update_derived_status(derived);
    }
    source2.wv = increment_write_version();
    mark_reactions(source2, DIRTY);
    if (active_effect !== null && (active_effect.f & CLEAN) !== 0 && (active_effect.f & (BRANCH_EFFECT | ROOT_EFFECT)) === 0) {
      if (untracked_writes === null) {
        set_untracked_writes([source2]);
      } else {
        untracked_writes.push(source2);
      }
    }
    if (!batch.is_fork && eager_effects.size > 0 && !eager_effects_deferred) {
      flush_eager_effects();
    }
  }
  return value;
}
function flush_eager_effects() {
  eager_effects_deferred = false;
  for (const effect of eager_effects) {
    if ((effect.f & CLEAN) !== 0) {
      set_signal_status(effect, MAYBE_DIRTY);
    }
    if (is_dirty(effect)) {
      update_effect(effect);
    }
  }
  eager_effects.clear();
}
function increment(source2) {
  set(source2, source2.v + 1);
}
function mark_reactions(signal, status) {
  var reactions = signal.reactions;
  if (reactions === null) return;
  var length = reactions.length;
  for (var i = 0; i < length; i++) {
    var reaction = reactions[i];
    var flags2 = reaction.f;
    var not_dirty = (flags2 & DIRTY) === 0;
    if (not_dirty) {
      set_signal_status(reaction, status);
    }
    if ((flags2 & DERIVED) !== 0) {
      var derived = (
        /** @type {Derived} */
        reaction
      );
      batch_values?.delete(derived);
      if ((flags2 & WAS_MARKED) === 0) {
        if (flags2 & CONNECTED) {
          reaction.f |= WAS_MARKED;
        }
        mark_reactions(derived, MAYBE_DIRTY);
      }
    } else if (not_dirty) {
      if ((flags2 & BLOCK_EFFECT) !== 0 && eager_block_effects !== null) {
        eager_block_effects.add(
          /** @type {Effect} */
          reaction
        );
      }
      schedule_effect(
        /** @type {Effect} */
        reaction
      );
    }
  }
}
function proxy(value) {
  if (typeof value !== "object" || value === null || STATE_SYMBOL in value) {
    return value;
  }
  const prototype = get_prototype_of(value);
  if (prototype !== object_prototype && prototype !== array_prototype) {
    return value;
  }
  var sources = /* @__PURE__ */ new Map();
  var is_proxied_array = is_array(value);
  var version = /* @__PURE__ */ state(0);
  var parent_version = update_version;
  var with_parent = (fn) => {
    if (update_version === parent_version) {
      return fn();
    }
    var reaction = active_reaction;
    var version2 = update_version;
    set_active_reaction(null);
    set_update_version(parent_version);
    var result = fn();
    set_active_reaction(reaction);
    set_update_version(version2);
    return result;
  };
  if (is_proxied_array) {
    sources.set("length", /* @__PURE__ */ state(
      /** @type {any[]} */
      value.length
    ));
  }
  return new Proxy(
    /** @type {any} */
    value,
    {
      defineProperty(_, prop, descriptor) {
        if (!("value" in descriptor) || descriptor.configurable === false || descriptor.enumerable === false || descriptor.writable === false) {
          state_descriptors_fixed();
        }
        var s3 = sources.get(prop);
        if (s3 === void 0) {
          s3 = with_parent(() => {
            var s22 = /* @__PURE__ */ state(descriptor.value);
            sources.set(prop, s22);
            return s22;
          });
        } else {
          set(s3, descriptor.value, true);
        }
        return true;
      },
      deleteProperty(target, prop) {
        var s3 = sources.get(prop);
        if (s3 === void 0) {
          if (prop in target) {
            const s22 = with_parent(() => /* @__PURE__ */ state(UNINITIALIZED));
            sources.set(prop, s22);
            increment(version);
          }
        } else {
          set(s3, UNINITIALIZED);
          increment(version);
        }
        return true;
      },
      get(target, prop, receiver) {
        if (prop === STATE_SYMBOL) {
          return value;
        }
        var s3 = sources.get(prop);
        var exists = prop in target;
        if (s3 === void 0 && (!exists || get_descriptor(target, prop)?.writable)) {
          s3 = with_parent(() => {
            var p = proxy(exists ? target[prop] : UNINITIALIZED);
            var s22 = /* @__PURE__ */ state(p);
            return s22;
          });
          sources.set(prop, s3);
        }
        if (s3 !== void 0) {
          var v = get(s3);
          return v === UNINITIALIZED ? void 0 : v;
        }
        return Reflect.get(target, prop, receiver);
      },
      getOwnPropertyDescriptor(target, prop) {
        var descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
        if (descriptor && "value" in descriptor) {
          var s3 = sources.get(prop);
          if (s3) descriptor.value = get(s3);
        } else if (descriptor === void 0) {
          var source2 = sources.get(prop);
          var value2 = source2?.v;
          if (source2 !== void 0 && value2 !== UNINITIALIZED) {
            return {
              enumerable: true,
              configurable: true,
              value: value2,
              writable: true
            };
          }
        }
        return descriptor;
      },
      has(target, prop) {
        if (prop === STATE_SYMBOL) {
          return true;
        }
        var s3 = sources.get(prop);
        var has = s3 !== void 0 && s3.v !== UNINITIALIZED || Reflect.has(target, prop);
        if (s3 !== void 0 || active_effect !== null && (!has || get_descriptor(target, prop)?.writable)) {
          if (s3 === void 0) {
            s3 = with_parent(() => {
              var p = has ? proxy(target[prop]) : UNINITIALIZED;
              var s22 = /* @__PURE__ */ state(p);
              return s22;
            });
            sources.set(prop, s3);
          }
          var value2 = get(s3);
          if (value2 === UNINITIALIZED) {
            return false;
          }
        }
        return has;
      },
      set(target, prop, value2, receiver) {
        var s3 = sources.get(prop);
        var has = prop in target;
        if (is_proxied_array && prop === "length") {
          for (var i = value2; i < /** @type {Source<number>} */
          s3.v; i += 1) {
            var other_s = sources.get(i + "");
            if (other_s !== void 0) {
              set(other_s, UNINITIALIZED);
            } else if (i in target) {
              other_s = with_parent(() => /* @__PURE__ */ state(UNINITIALIZED));
              sources.set(i + "", other_s);
            }
          }
        }
        if (s3 === void 0) {
          if (!has || get_descriptor(target, prop)?.writable) {
            s3 = with_parent(() => /* @__PURE__ */ state(void 0));
            set(s3, proxy(value2));
            sources.set(prop, s3);
          }
        } else {
          has = s3.v !== UNINITIALIZED;
          var p = with_parent(() => proxy(value2));
          set(s3, p);
        }
        var descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
        if (descriptor?.set) {
          descriptor.set.call(receiver, value2);
        }
        if (!has) {
          if (is_proxied_array && typeof prop === "string") {
            var ls = (
              /** @type {Source<number>} */
              sources.get("length")
            );
            var n2 = Number(prop);
            if (Number.isInteger(n2) && n2 >= ls.v) {
              set(ls, n2 + 1);
            }
          }
          increment(version);
        }
        return true;
      },
      ownKeys(target) {
        get(version);
        var own_keys = Reflect.ownKeys(target).filter((key22) => {
          var source3 = sources.get(key22);
          return source3 === void 0 || source3.v !== UNINITIALIZED;
        });
        for (var [key2, source2] of sources) {
          if (source2.v !== UNINITIALIZED && !(key2 in target)) {
            own_keys.push(key2);
          }
        }
        return own_keys;
      },
      setPrototypeOf() {
        state_prototype_fixed();
      }
    }
  );
}
function init_operations() {
  if ($window !== void 0) {
    return;
  }
  $window = window;
  var element_prototype = Element.prototype;
  var node_prototype = Node.prototype;
  var text_prototype = Text.prototype;
  first_child_getter = get_descriptor(node_prototype, "firstChild").get;
  next_sibling_getter = get_descriptor(node_prototype, "nextSibling").get;
  if (is_extensible(element_prototype)) {
    element_prototype.__click = void 0;
    element_prototype.__className = void 0;
    element_prototype.__attributes = null;
    element_prototype.__style = void 0;
    element_prototype.__e = void 0;
  }
  if (is_extensible(text_prototype)) {
    text_prototype.__t = void 0;
  }
}
function create_text(value = "") {
  return document.createTextNode(value);
}
// @__NO_SIDE_EFFECTS__
function get_first_child(node) {
  return (
    /** @type {TemplateNode | null} */
    first_child_getter.call(node)
  );
}
// @__NO_SIDE_EFFECTS__
function get_next_sibling(node) {
  return (
    /** @type {TemplateNode | null} */
    next_sibling_getter.call(node)
  );
}
function clear_text_content(node) {
  node.textContent = "";
}
function without_reactive_context(fn) {
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  set_active_reaction(null);
  set_active_effect(null);
  try {
    return fn();
  } finally {
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
  }
}
function push_effect(effect, parent_effect) {
  var parent_last = parent_effect.last;
  if (parent_last === null) {
    parent_effect.last = parent_effect.first = effect;
  } else {
    parent_last.next = effect;
    effect.prev = parent_last;
    parent_effect.last = effect;
  }
}
function create_effect(type, fn, sync) {
  var parent = active_effect;
  if (parent !== null && (parent.f & INERT) !== 0) {
    type |= INERT;
  }
  var effect = {
    ctx: component_context,
    deps: null,
    nodes: null,
    f: type | DIRTY | CONNECTED,
    first: null,
    fn,
    last: null,
    next: null,
    parent,
    b: parent && parent.b,
    prev: null,
    teardown: null,
    wv: 0,
    ac: null
  };
  if (sync) {
    try {
      update_effect(effect);
      effect.f |= EFFECT_RAN;
    } catch (e22) {
      destroy_effect(effect);
      throw e22;
    }
  } else if (fn !== null) {
    schedule_effect(effect);
  }
  var e3 = effect;
  if (sync && e3.deps === null && e3.teardown === null && e3.nodes === null && e3.first === e3.last && // either `null`, or a singular child
  (e3.f & EFFECT_PRESERVED) === 0) {
    e3 = e3.first;
    if ((type & BLOCK_EFFECT) !== 0 && (type & EFFECT_TRANSPARENT) !== 0 && e3 !== null) {
      e3.f |= EFFECT_TRANSPARENT;
    }
  }
  if (e3 !== null) {
    e3.parent = parent;
    if (parent !== null) {
      push_effect(e3, parent);
    }
    if (active_reaction !== null && (active_reaction.f & DERIVED) !== 0 && (type & ROOT_EFFECT) === 0) {
      var derived = (
        /** @type {Derived} */
        active_reaction
      );
      (derived.effects ??= []).push(e3);
    }
  }
  return effect;
}
function effect_tracking() {
  return active_reaction !== null && !untracking;
}
function create_user_effect(fn) {
  return create_effect(EFFECT | USER_EFFECT, fn, false);
}
function component_root(fn) {
  Batch.ensure();
  const effect = create_effect(ROOT_EFFECT | EFFECT_PRESERVED, fn, true);
  return (options2 = {}) => {
    return new Promise((fulfil) => {
      if (options2.outro) {
        pause_effect(effect, () => {
          destroy_effect(effect);
          fulfil(void 0);
        });
      } else {
        destroy_effect(effect);
        fulfil(void 0);
      }
    });
  };
}
function render_effect(fn, flags2 = 0) {
  return create_effect(RENDER_EFFECT | flags2, fn, true);
}
function block(fn, flags2 = 0) {
  var effect = create_effect(BLOCK_EFFECT | flags2, fn, true);
  return effect;
}
function branch(fn) {
  return create_effect(BRANCH_EFFECT | EFFECT_PRESERVED, fn, true);
}
function execute_effect_teardown(effect) {
  var teardown = effect.teardown;
  if (teardown !== null) {
    const previously_destroying_effect = is_destroying_effect;
    const previous_reaction = active_reaction;
    set_is_destroying_effect(true);
    set_active_reaction(null);
    try {
      teardown.call(null);
    } finally {
      set_is_destroying_effect(previously_destroying_effect);
      set_active_reaction(previous_reaction);
    }
  }
}
function destroy_effect_children(signal, remove_dom = false) {
  var effect = signal.first;
  signal.first = signal.last = null;
  while (effect !== null) {
    const controller2 = effect.ac;
    if (controller2 !== null) {
      without_reactive_context(() => {
        controller2.abort(STALE_REACTION);
      });
    }
    var next2 = effect.next;
    if ((effect.f & ROOT_EFFECT) !== 0) {
      effect.parent = null;
    } else {
      destroy_effect(effect, remove_dom);
    }
    effect = next2;
  }
}
function destroy_block_effect_children(signal) {
  var effect = signal.first;
  while (effect !== null) {
    var next2 = effect.next;
    if ((effect.f & BRANCH_EFFECT) === 0) {
      destroy_effect(effect);
    }
    effect = next2;
  }
}
function destroy_effect(effect, remove_dom = true) {
  var removed = false;
  if ((remove_dom || (effect.f & HEAD_EFFECT) !== 0) && effect.nodes !== null && effect.nodes.end !== null) {
    remove_effect_dom(
      effect.nodes.start,
      /** @type {TemplateNode} */
      effect.nodes.end
    );
    removed = true;
  }
  destroy_effect_children(effect, remove_dom && !removed);
  remove_reactions(effect, 0);
  set_signal_status(effect, DESTROYED);
  var transitions = effect.nodes && effect.nodes.t;
  if (transitions !== null) {
    for (const transition of transitions) {
      transition.stop();
    }
  }
  execute_effect_teardown(effect);
  var parent = effect.parent;
  if (parent !== null && parent.first !== null) {
    unlink_effect(effect);
  }
  effect.next = effect.prev = effect.teardown = effect.ctx = effect.deps = effect.fn = effect.nodes = effect.ac = null;
}
function remove_effect_dom(node, end) {
  while (node !== null) {
    var next2 = node === end ? null : /* @__PURE__ */ get_next_sibling(node);
    node.remove();
    node = next2;
  }
}
function unlink_effect(effect) {
  var parent = effect.parent;
  var prev = effect.prev;
  var next2 = effect.next;
  if (prev !== null) prev.next = next2;
  if (next2 !== null) next2.prev = prev;
  if (parent !== null) {
    if (parent.first === effect) parent.first = next2;
    if (parent.last === effect) parent.last = prev;
  }
}
function pause_effect(effect, callback, destroy = true) {
  var transitions = [];
  pause_children(effect, transitions, true);
  var fn = () => {
    if (destroy) destroy_effect(effect);
    if (callback) callback();
  };
  var remaining = transitions.length;
  if (remaining > 0) {
    var check = () => --remaining || fn();
    for (var transition of transitions) {
      transition.out(check);
    }
  } else {
    fn();
  }
}
function pause_children(effect, transitions, local) {
  if ((effect.f & INERT) !== 0) return;
  effect.f ^= INERT;
  var t2 = effect.nodes && effect.nodes.t;
  if (t2 !== null) {
    for (const transition of t2) {
      if (transition.is_global || local) {
        transitions.push(transition);
      }
    }
  }
  var child = effect.first;
  while (child !== null) {
    var sibling = child.next;
    var transparent = (child.f & EFFECT_TRANSPARENT) !== 0 || // If this is a branch effect without a block effect parent,
    // it means the parent block effect was pruned. In that case,
    // transparency information was transferred to the branch effect.
    (child.f & BRANCH_EFFECT) !== 0 && (effect.f & BLOCK_EFFECT) !== 0;
    pause_children(child, transitions, transparent ? local : false);
    child = sibling;
  }
}
function move_effect(effect, fragment) {
  if (!effect.nodes) return;
  var node = effect.nodes.start;
  var end = effect.nodes.end;
  while (node !== null) {
    var next2 = node === end ? null : /* @__PURE__ */ get_next_sibling(node);
    fragment.append(node);
    node = next2;
  }
}
function set_is_destroying_effect(value) {
  is_destroying_effect = value;
}
function set_active_reaction(reaction) {
  active_reaction = reaction;
}
function set_active_effect(effect) {
  active_effect = effect;
}
function push_reaction_value(value) {
  if (active_reaction !== null && true) {
    if (current_sources === null) {
      current_sources = [value];
    } else {
      current_sources.push(value);
    }
  }
}
function set_untracked_writes(value) {
  untracked_writes = value;
}
function set_update_version(value) {
  update_version = value;
}
function increment_write_version() {
  return ++write_version;
}
function is_dirty(reaction) {
  var flags2 = reaction.f;
  if ((flags2 & DIRTY) !== 0) {
    return true;
  }
  if (flags2 & DERIVED) {
    reaction.f &= ~WAS_MARKED;
  }
  if ((flags2 & MAYBE_DIRTY) !== 0) {
    var dependencies = (
      /** @type {Value[]} */
      reaction.deps
    );
    var length = dependencies.length;
    for (var i = 0; i < length; i++) {
      var dependency = dependencies[i];
      if (is_dirty(
        /** @type {Derived} */
        dependency
      )) {
        update_derived(
          /** @type {Derived} */
          dependency
        );
      }
      if (dependency.wv > reaction.wv) {
        return true;
      }
    }
    if ((flags2 & CONNECTED) !== 0 && // During time traveling we don't want to reset the status so that
    // traversal of the graph in the other batches still happens
    batch_values === null) {
      set_signal_status(reaction, CLEAN);
    }
  }
  return false;
}
function schedule_possible_effect_self_invalidation(signal, effect, root2 = true) {
  var reactions = signal.reactions;
  if (reactions === null) return;
  if (current_sources !== null && includes.call(current_sources, signal)) {
    return;
  }
  for (var i = 0; i < reactions.length; i++) {
    var reaction = reactions[i];
    if ((reaction.f & DERIVED) !== 0) {
      schedule_possible_effect_self_invalidation(
        /** @type {Derived} */
        reaction,
        effect,
        false
      );
    } else if (effect === reaction) {
      if (root2) {
        set_signal_status(reaction, DIRTY);
      } else if ((reaction.f & CLEAN) !== 0) {
        set_signal_status(reaction, MAYBE_DIRTY);
      }
      schedule_effect(
        /** @type {Effect} */
        reaction
      );
    }
  }
}
function update_reaction(reaction) {
  var previous_deps = new_deps;
  var previous_skipped_deps = skipped_deps;
  var previous_untracked_writes = untracked_writes;
  var previous_reaction = active_reaction;
  var previous_sources = current_sources;
  var previous_component_context = component_context;
  var previous_untracking = untracking;
  var previous_update_version = update_version;
  var flags2 = reaction.f;
  new_deps = /** @type {null | Value[]} */
  null;
  skipped_deps = 0;
  untracked_writes = null;
  active_reaction = (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) === 0 ? reaction : null;
  current_sources = null;
  set_component_context(reaction.ctx);
  untracking = false;
  update_version = ++read_version;
  if (reaction.ac !== null) {
    without_reactive_context(() => {
      reaction.ac.abort(STALE_REACTION);
    });
    reaction.ac = null;
  }
  try {
    reaction.f |= REACTION_IS_UPDATING;
    var fn = (
      /** @type {Function} */
      reaction.fn
    );
    var result = fn();
    var deps = reaction.deps;
    var is_fork = current_batch?.is_fork;
    if (new_deps !== null) {
      var i;
      if (!is_fork) {
        remove_reactions(reaction, skipped_deps);
      }
      if (deps !== null && skipped_deps > 0) {
        deps.length = skipped_deps + new_deps.length;
        for (i = 0; i < new_deps.length; i++) {
          deps[skipped_deps + i] = new_deps[i];
        }
      } else {
        reaction.deps = deps = new_deps;
      }
      if (effect_tracking() && (reaction.f & CONNECTED) !== 0) {
        for (i = skipped_deps; i < deps.length; i++) {
          (deps[i].reactions ??= []).push(reaction);
        }
      }
    } else if (!is_fork && deps !== null && skipped_deps < deps.length) {
      remove_reactions(reaction, skipped_deps);
      deps.length = skipped_deps;
    }
    if (is_runes() && untracked_writes !== null && !untracking && deps !== null && (reaction.f & (DERIVED | MAYBE_DIRTY | DIRTY)) === 0) {
      for (i = 0; i < /** @type {Source[]} */
      untracked_writes.length; i++) {
        schedule_possible_effect_self_invalidation(
          untracked_writes[i],
          /** @type {Effect} */
          reaction
        );
      }
    }
    if (previous_reaction !== null && previous_reaction !== reaction) {
      read_version++;
      if (previous_reaction.deps !== null) {
        for (let i2 = 0; i2 < previous_skipped_deps; i2 += 1) {
          previous_reaction.deps[i2].rv = read_version;
        }
      }
      if (previous_deps !== null) {
        for (const dep of previous_deps) {
          dep.rv = read_version;
        }
      }
      if (untracked_writes !== null) {
        if (previous_untracked_writes === null) {
          previous_untracked_writes = untracked_writes;
        } else {
          previous_untracked_writes.push(.../** @type {Source[]} */
          untracked_writes);
        }
      }
    }
    if ((reaction.f & ERROR_VALUE) !== 0) {
      reaction.f ^= ERROR_VALUE;
    }
    return result;
  } catch (error2) {
    return handle_error(error2);
  } finally {
    reaction.f ^= REACTION_IS_UPDATING;
    new_deps = previous_deps;
    skipped_deps = previous_skipped_deps;
    untracked_writes = previous_untracked_writes;
    active_reaction = previous_reaction;
    current_sources = previous_sources;
    set_component_context(previous_component_context);
    untracking = previous_untracking;
    update_version = previous_update_version;
  }
}
function remove_reaction(signal, dependency) {
  let reactions = dependency.reactions;
  if (reactions !== null) {
    var index3 = index_of.call(reactions, signal);
    if (index3 !== -1) {
      var new_length = reactions.length - 1;
      if (new_length === 0) {
        reactions = dependency.reactions = null;
      } else {
        reactions[index3] = reactions[new_length];
        reactions.pop();
      }
    }
  }
  if (reactions === null && (dependency.f & DERIVED) !== 0 && // Destroying a child effect while updating a parent effect can cause a dependency to appear
  // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
  // allows us to skip the expensive work of disconnecting and immediately reconnecting it
  (new_deps === null || !includes.call(new_deps, dependency))) {
    var derived = (
      /** @type {Derived} */
      dependency
    );
    if ((derived.f & CONNECTED) !== 0) {
      derived.f ^= CONNECTED;
      derived.f &= ~WAS_MARKED;
    }
    update_derived_status(derived);
    destroy_derived_effects(derived);
    remove_reactions(derived, 0);
  }
}
function remove_reactions(signal, start_index) {
  var dependencies = signal.deps;
  if (dependencies === null) return;
  for (var i = start_index; i < dependencies.length; i++) {
    remove_reaction(signal, dependencies[i]);
  }
}
function update_effect(effect) {
  var flags2 = effect.f;
  if ((flags2 & DESTROYED) !== 0) {
    return;
  }
  set_signal_status(effect, CLEAN);
  var previous_effect = active_effect;
  var was_updating_effect = is_updating_effect;
  active_effect = effect;
  is_updating_effect = true;
  try {
    if ((flags2 & (BLOCK_EFFECT | MANAGED_EFFECT)) !== 0) {
      destroy_block_effect_children(effect);
    } else {
      destroy_effect_children(effect);
    }
    execute_effect_teardown(effect);
    var teardown = update_reaction(effect);
    effect.teardown = typeof teardown === "function" ? teardown : null;
    effect.wv = write_version;
    var dep;
    if (dev && tracing_mode_flag && (effect.f & DIRTY) !== 0 && effect.deps !== null) ;
  } finally {
    is_updating_effect = was_updating_effect;
    active_effect = previous_effect;
  }
}
function get(signal) {
  var flags2 = signal.f;
  var is_derived = (flags2 & DERIVED) !== 0;
  if (active_reaction !== null && !untracking) {
    var destroyed = active_effect !== null && (active_effect.f & DESTROYED) !== 0;
    if (!destroyed && (current_sources === null || !includes.call(current_sources, signal))) {
      var deps = active_reaction.deps;
      if ((active_reaction.f & REACTION_IS_UPDATING) !== 0) {
        if (signal.rv < read_version) {
          signal.rv = read_version;
          if (new_deps === null && deps !== null && deps[skipped_deps] === signal) {
            skipped_deps++;
          } else if (new_deps === null) {
            new_deps = [signal];
          } else {
            new_deps.push(signal);
          }
        }
      } else {
        (active_reaction.deps ??= []).push(signal);
        var reactions = signal.reactions;
        if (reactions === null) {
          signal.reactions = [active_reaction];
        } else if (!includes.call(reactions, active_reaction)) {
          reactions.push(active_reaction);
        }
      }
    }
  }
  if (is_destroying_effect && old_values.has(signal)) {
    return old_values.get(signal);
  }
  if (is_derived) {
    var derived = (
      /** @type {Derived} */
      signal
    );
    if (is_destroying_effect) {
      var value = derived.v;
      if ((derived.f & CLEAN) === 0 && derived.reactions !== null || depends_on_old_values(derived)) {
        value = execute_derived(derived);
      }
      old_values.set(derived, value);
      return value;
    }
    var should_connect = (derived.f & CONNECTED) === 0 && !untracking && active_reaction !== null && (is_updating_effect || (active_reaction.f & CONNECTED) !== 0);
    var is_new = derived.deps === null;
    if (is_dirty(derived)) {
      if (should_connect) {
        derived.f |= CONNECTED;
      }
      update_derived(derived);
    }
    if (should_connect && !is_new) {
      reconnect(derived);
    }
  }
  if (batch_values?.has(signal)) {
    return batch_values.get(signal);
  }
  if ((signal.f & ERROR_VALUE) !== 0) {
    throw signal.v;
  }
  return signal.v;
}
function reconnect(derived) {
  if (derived.deps === null) return;
  derived.f |= CONNECTED;
  for (const dep of derived.deps) {
    (dep.reactions ??= []).push(derived);
    if ((dep.f & DERIVED) !== 0 && (dep.f & CONNECTED) === 0) {
      reconnect(
        /** @type {Derived} */
        dep
      );
    }
  }
}
function depends_on_old_values(derived) {
  if (derived.v === UNINITIALIZED) return true;
  if (derived.deps === null) return false;
  for (const dep of derived.deps) {
    if (old_values.has(dep)) {
      return true;
    }
    if ((dep.f & DERIVED) !== 0 && depends_on_old_values(
      /** @type {Derived} */
      dep
    )) {
      return true;
    }
  }
  return false;
}
function untrack(fn) {
  var previous_untracking = untracking;
  try {
    untracking = true;
    return fn();
  } finally {
    untracking = previous_untracking;
  }
}
var tracing_mode_flag, component_context, micro_tasks, STATUS_MASK, batches, current_batch, batch_values, queued_root_effects, last_scheduled_effect, is_flushing, is_flushing_sync, Batch, eager_block_effects, eager_effects, old_values, eager_effects_deferred, $window, first_child_getter, next_sibling_getter, is_updating_effect, is_destroying_effect, active_reaction, untracking, active_effect, current_sources, new_deps, skipped_deps, untracked_writes, write_version, read_version, update_version;
var init_runtime = __esm({
  ".svelte-kit/output/server/chunks/runtime.js"() {
    init_false();
    init_context();
    tracing_mode_flag = false;
    component_context = null;
    micro_tasks = [];
    STATUS_MASK = -7169;
    batches = /* @__PURE__ */ new Set();
    current_batch = null;
    batch_values = null;
    queued_root_effects = [];
    last_scheduled_effect = null;
    is_flushing = false;
    is_flushing_sync = false;
    Batch = class _Batch {
      committed = false;
      /**
       * The current values of any sources that are updated in this batch
       * They keys of this map are identical to `this.#previous`
       * @type {Map<Source, any>}
       */
      current = /* @__PURE__ */ new Map();
      /**
       * The values of any sources that are updated in this batch _before_ those updates took place.
       * They keys of this map are identical to `this.#current`
       * @type {Map<Source, any>}
       */
      previous = /* @__PURE__ */ new Map();
      /**
       * When the batch is committed (and the DOM is updated), we need to remove old branches
       * and append new ones by calling the functions added inside (if/each/key/etc) blocks
       * @type {Set<() => void>}
       */
      #commit_callbacks = /* @__PURE__ */ new Set();
      /**
       * If a fork is discarded, we need to destroy any effects that are no longer needed
       * @type {Set<(batch: Batch) => void>}
       */
      #discard_callbacks = /* @__PURE__ */ new Set();
      /**
       * The number of async effects that are currently in flight
       */
      #pending = 0;
      /**
       * The number of async effects that are currently in flight, _not_ inside a pending boundary
       */
      #blocking_pending = 0;
      /**
       * A deferred that resolves when the batch is committed, used with `settled()`
       * TODO replace with Promise.withResolvers once supported widely enough
       * @type {{ promise: Promise<void>, resolve: (value?: any) => void, reject: (reason: unknown) => void } | null}
       */
      #deferred = null;
      /**
       * Deferred effects (which run after async work has completed) that are DIRTY
       * @type {Set<Effect>}
       */
      #dirty_effects = /* @__PURE__ */ new Set();
      /**
       * Deferred effects that are MAYBE_DIRTY
       * @type {Set<Effect>}
       */
      #maybe_dirty_effects = /* @__PURE__ */ new Set();
      /**
       * A map of branches that still exist, but will be destroyed when this batch
       * is committed — we skip over these during `process`.
       * The value contains child effects that were dirty/maybe_dirty before being reset,
       * so they can be rescheduled if the branch survives.
       * @type {Map<Effect, { d: Effect[], m: Effect[] }>}
       */
      #skipped_branches = /* @__PURE__ */ new Map();
      is_fork = false;
      #decrement_queued = false;
      is_deferred() {
        return this.is_fork || this.#blocking_pending > 0;
      }
      /**
       * Add an effect to the #skipped_branches map and reset its children
       * @param {Effect} effect
       */
      skip_effect(effect) {
        if (!this.#skipped_branches.has(effect)) {
          this.#skipped_branches.set(effect, { d: [], m: [] });
        }
      }
      /**
       * Remove an effect from the #skipped_branches map and reschedule
       * any tracked dirty/maybe_dirty child effects
       * @param {Effect} effect
       */
      unskip_effect(effect) {
        var tracked = this.#skipped_branches.get(effect);
        if (tracked) {
          this.#skipped_branches.delete(effect);
          for (var e3 of tracked.d) {
            set_signal_status(e3, DIRTY);
            schedule_effect(e3);
          }
          for (e3 of tracked.m) {
            set_signal_status(e3, MAYBE_DIRTY);
            schedule_effect(e3);
          }
        }
      }
      /**
       *
       * @param {Effect[]} root_effects
       */
      process(root_effects) {
        queued_root_effects = [];
        this.apply();
        var effects = [];
        var render_effects = [];
        for (const root2 of root_effects) {
          this.#traverse_effect_tree(root2, effects, render_effects);
        }
        if (this.is_deferred()) {
          this.#defer_effects(render_effects);
          this.#defer_effects(effects);
          for (const [e3, t2] of this.#skipped_branches) {
            reset_branch(e3, t2);
          }
        } else {
          for (const fn of this.#commit_callbacks) fn();
          this.#commit_callbacks.clear();
          if (this.#pending === 0) {
            this.#commit();
          }
          current_batch = null;
          flush_queued_effects(render_effects);
          flush_queued_effects(effects);
          this.#deferred?.resolve();
        }
        batch_values = null;
      }
      /**
       * Traverse the effect tree, executing effects or stashing
       * them for later execution as appropriate
       * @param {Effect} root
       * @param {Effect[]} effects
       * @param {Effect[]} render_effects
       */
      #traverse_effect_tree(root2, effects, render_effects) {
        root2.f ^= CLEAN;
        var effect = root2.first;
        var pending_boundary = null;
        while (effect !== null) {
          var flags2 = effect.f;
          var is_branch = (flags2 & (BRANCH_EFFECT | ROOT_EFFECT)) !== 0;
          var is_skippable_branch = is_branch && (flags2 & CLEAN) !== 0;
          var skip = is_skippable_branch || (flags2 & INERT) !== 0 || this.#skipped_branches.has(effect);
          if (!skip && effect.fn !== null) {
            if (is_branch) {
              effect.f ^= CLEAN;
            } else if (pending_boundary !== null && (flags2 & (EFFECT | RENDER_EFFECT | MANAGED_EFFECT)) !== 0) {
              pending_boundary.b.defer_effect(effect);
            } else if ((flags2 & EFFECT) !== 0) {
              effects.push(effect);
            } else if (is_dirty(effect)) {
              if ((flags2 & BLOCK_EFFECT) !== 0) this.#maybe_dirty_effects.add(effect);
              update_effect(effect);
            }
            var child = effect.first;
            if (child !== null) {
              effect = child;
              continue;
            }
          }
          var parent = effect.parent;
          effect = effect.next;
          while (effect === null && parent !== null) {
            if (parent === pending_boundary) {
              pending_boundary = null;
            }
            effect = parent.next;
            parent = parent.parent;
          }
        }
      }
      /**
       * @param {Effect[]} effects
       */
      #defer_effects(effects) {
        for (var i = 0; i < effects.length; i += 1) {
          defer_effect(effects[i], this.#dirty_effects, this.#maybe_dirty_effects);
        }
      }
      /**
       * Associate a change to a given source with the current
       * batch, noting its previous and current values
       * @param {Source} source
       * @param {any} value
       */
      capture(source2, value) {
        if (value !== UNINITIALIZED && !this.previous.has(source2)) {
          this.previous.set(source2, value);
        }
        if ((source2.f & ERROR_VALUE) === 0) {
          this.current.set(source2, source2.v);
          batch_values?.set(source2, source2.v);
        }
      }
      activate() {
        current_batch = this;
        this.apply();
      }
      deactivate() {
        if (current_batch !== this) return;
        current_batch = null;
        batch_values = null;
      }
      flush() {
        this.activate();
        if (queued_root_effects.length > 0) {
          flush_effects();
          if (current_batch !== null && current_batch !== this) {
            return;
          }
        } else if (this.#pending === 0) {
          this.process([]);
        }
        this.deactivate();
      }
      discard() {
        for (const fn of this.#discard_callbacks) fn(this);
        this.#discard_callbacks.clear();
      }
      #commit() {
        if (batches.size > 1) {
          this.previous.clear();
          var previous_batch_values = batch_values;
          var is_earlier = true;
          for (const batch of batches) {
            if (batch === this) {
              is_earlier = false;
              continue;
            }
            const sources = [];
            for (const [source2, value] of this.current) {
              if (batch.current.has(source2)) {
                if (is_earlier && value !== batch.current.get(source2)) {
                  batch.current.set(source2, value);
                } else {
                  continue;
                }
              }
              sources.push(source2);
            }
            if (sources.length === 0) {
              continue;
            }
            const others = [...batch.current.keys()].filter((s3) => !this.current.has(s3));
            if (others.length > 0) {
              var prev_queued_root_effects = queued_root_effects;
              queued_root_effects = [];
              const marked = /* @__PURE__ */ new Set();
              const checked = /* @__PURE__ */ new Map();
              for (const source2 of sources) {
                mark_effects(source2, others, marked, checked);
              }
              if (queued_root_effects.length > 0) {
                current_batch = batch;
                batch.apply();
                for (const root2 of queued_root_effects) {
                  batch.#traverse_effect_tree(root2, [], []);
                }
                batch.deactivate();
              }
              queued_root_effects = prev_queued_root_effects;
            }
          }
          current_batch = null;
          batch_values = previous_batch_values;
        }
        this.committed = true;
        batches.delete(this);
      }
      /**
       *
       * @param {boolean} blocking
       */
      increment(blocking) {
        this.#pending += 1;
        if (blocking) this.#blocking_pending += 1;
      }
      /**
       *
       * @param {boolean} blocking
       */
      decrement(blocking) {
        this.#pending -= 1;
        if (blocking) this.#blocking_pending -= 1;
        if (this.#decrement_queued) return;
        this.#decrement_queued = true;
        queue_micro_task(() => {
          this.#decrement_queued = false;
          if (!this.is_deferred()) {
            this.revive();
          } else if (queued_root_effects.length > 0) {
            this.flush();
          }
        });
      }
      revive() {
        for (const e3 of this.#dirty_effects) {
          this.#maybe_dirty_effects.delete(e3);
          set_signal_status(e3, DIRTY);
          schedule_effect(e3);
        }
        for (const e3 of this.#maybe_dirty_effects) {
          set_signal_status(e3, MAYBE_DIRTY);
          schedule_effect(e3);
        }
        this.flush();
      }
      /** @param {() => void} fn */
      oncommit(fn) {
        this.#commit_callbacks.add(fn);
      }
      /** @param {(batch: Batch) => void} fn */
      ondiscard(fn) {
        this.#discard_callbacks.add(fn);
      }
      settled() {
        return (this.#deferred ??= deferred()).promise;
      }
      static ensure() {
        if (current_batch === null) {
          const batch = current_batch = new _Batch();
          batches.add(current_batch);
          if (!is_flushing_sync) {
            queue_micro_task(() => {
              if (current_batch !== batch) {
                return;
              }
              batch.flush();
            });
          }
        }
        return current_batch;
      }
      apply() {
        return;
      }
    };
    eager_block_effects = null;
    eager_effects = /* @__PURE__ */ new Set();
    old_values = /* @__PURE__ */ new Map();
    eager_effects_deferred = false;
    is_updating_effect = false;
    is_destroying_effect = false;
    active_reaction = null;
    untracking = false;
    active_effect = null;
    current_sources = null;
    new_deps = null;
    skipped_deps = 0;
    untracked_writes = null;
    write_version = 1;
    read_version = 0;
    update_version = read_version;
  }
});

// .svelte-kit/output/server/chunks/index2.js
function readable(value, start) {
  return {
    subscribe: writable(value, start).subscribe
  };
}
function writable(value, start = noop) {
  let stop = null;
  const subscribers = /* @__PURE__ */ new Set();
  function set2(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update2(fn) {
    set2(fn(
      /** @type {T} */
      value
    ));
  }
  function subscribe(run, invalidate = noop) {
    const subscriber = [run, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set2, update2) || noop;
    }
    run(
      /** @type {T} */
      value
    );
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0 && stop) {
        stop();
        stop = null;
      }
    };
  }
  return { set: set2, update: update2, subscribe };
}
var subscriber_queue;
var init_index2 = __esm({
  ".svelte-kit/output/server/chunks/index2.js"() {
    init_context();
    init_runtime();
    subscriber_queue = [];
  }
});

// .svelte-kit/output/server/chunks/shared-server.js
function set_private_env(environment) {
}
function set_public_env(environment) {
  public_env = environment;
}
var public_env;
var init_shared_server = __esm({
  ".svelte-kit/output/server/chunks/shared-server.js"() {
    public_env = {};
  }
});

// .svelte-kit/output/server/chunks/state.svelte.js
var is_legacy;
var init_state_svelte = __esm({
  ".svelte-kit/output/server/chunks/state.svelte.js"() {
    init_context();
    init_server();
    is_legacy = noop.toString().includes("$$") || /function \w+\(\) \{\}/.test(noop.toString());
    if (is_legacy) {
      ({
        data: {},
        form: null,
        error: null,
        params: {},
        route: { id: null },
        state: {},
        status: -1,
        url: new URL("https://example.com")
      });
    }
  }
});

// .svelte-kit/output/server/chunks/index3.js
function create_updated_store() {
  const { set: set2, subscribe } = writable(false);
  {
    return {
      subscribe,
      // eslint-disable-next-line @typescript-eslint/require-await
      check: async () => false
    };
  }
}
function goto(url, opts = {}) {
  {
    throw new Error("Cannot call goto(...) on the server");
  }
}
function context() {
  return getContext("__request__");
}
var stores, page$1, page;
var init_index3 = __esm({
  ".svelte-kit/output/server/chunks/index3.js"() {
    init_state_svelte();
    init_internal();
    init_exports();
    init_utils();
    init_index2();
    init_server();
    init_context();
    stores = {
      updated: /* @__PURE__ */ create_updated_store()
    };
    ({
      check: stores.updated.check
    });
    page$1 = {
      get data() {
        return context().page.data;
      },
      get error() {
        return context().page.error;
      },
      get params() {
        return context().page.params;
      },
      get status() {
        return context().page.status;
      },
      get url() {
        return context().page.url;
      }
    };
    page = page$1;
  }
});

// .svelte-kit/output/server/chunks/env.svelte.js
var getEnv, runtimeConfig;
var init_env_svelte = __esm({
  ".svelte-kit/output/server/chunks/env.svelte.js"() {
    init_shared_server();
    getEnv = (key2, defaultValue = "") => {
      if (key2 === "PUBLIC_CLERK_PUBLISHABLE_KEY" && (public_env[key2] === void 0 || public_env[key2] === "")) {
        return "pk_test_cmVsYXhlZC13aWxkY2F0LTk3LmNsZXJrLmFjY291bnRzLmRldiQ";
      }
      if (key2 === "PUBLIC_API_URL" && (public_env[key2] === void 0 || public_env[key2] === "")) {
        return "/api";
      }
      if (key2 === "PUBLIC_API_MODE" && (public_env[key2] === void 0 || public_env[key2] === "")) {
        return "worker-partial";
      }
      return public_env[key2] || defaultValue;
    };
    runtimeConfig = {
      get PUBLIC_CLERK_PUBLISHABLE_KEY() {
        return getEnv("PUBLIC_CLERK_PUBLISHABLE_KEY");
      }
    };
    getEnv("PUBLIC_CLERK_PUBLISHABLE_KEY");
    getEnv("PUBLIC_API_URL");
    getEnv("PUBLIC_API_MODE");
  }
});

// .svelte-kit/output/server/chunks/runtime2.js
var sourceLanguageTag, languageTag;
var init_runtime2 = __esm({
  ".svelte-kit/output/server/chunks/runtime2.js"() {
    sourceLanguageTag = "en";
    languageTag = () => sourceLanguageTag;
  }
});

// .svelte-kit/output/server/chunks/messages.js
var signin$7, overview$7, participants_list$7, sessions_history$7, settings$7, auth_required_title$7, auth_required_desc$7, admin$7, update$7, signin$6, overview$6, participants_list$6, sessions_history$6, settings$6, auth_required_title$6, auth_required_desc$6, admin$6, update$6, signin$5, overview$5, participants_list$5, sessions_history$5, settings$5, auth_required_title$5, auth_required_desc$5, admin$5, update$5, signin$4, overview$4, participants_list$4, sessions_history$4, settings$4, auth_required_title$4, auth_required_desc$4, admin$4, update$4, signin$3, overview$3, participants_list$3, sessions_history$3, settings$3, auth_required_title$3, auth_required_desc$3, admin$3, update$3, signin$2, overview$2, participants_list$2, sessions_history$2, settings$2, auth_required_title$2, auth_required_desc$2, admin$2, update$2, signin$1, overview$1, participants_list$1, sessions_history$1, settings$1, auth_required_title$1, auth_required_desc$1, admin$1, update$1, signin, overview, participants_list, sessions_history, settings, auth_required_title, auth_required_desc, admin, update;
var init_messages = __esm({
  ".svelte-kit/output/server/chunks/messages.js"() {
    init_runtime2();
    signin$7 = /* @__NO_SIDE_EFFECTS__ */ () => `Sign In`;
    overview$7 = /* @__NO_SIDE_EFFECTS__ */ () => `Overview`;
    participants_list$7 = /* @__NO_SIDE_EFFECTS__ */ () => `Participants`;
    sessions_history$7 = /* @__NO_SIDE_EFFECTS__ */ () => `Sessions`;
    settings$7 = /* @__NO_SIDE_EFFECTS__ */ () => `Settings`;
    auth_required_title$7 = /* @__NO_SIDE_EFFECTS__ */ () => `RESEARCHER PORTAL`;
    auth_required_desc$7 = /* @__NO_SIDE_EFFECTS__ */ () => `Please sign in with an account that has administrative privileges.`;
    admin$7 = /* @__NO_SIDE_EFFECTS__ */ () => `Admin`;
    update$7 = /* @__NO_SIDE_EFFECTS__ */ () => `Update`;
    signin$6 = /* @__NO_SIDE_EFFECTS__ */ () => `\u30B5\u30A4\u30F3\u30A4\u30F3`;
    overview$6 = /* @__NO_SIDE_EFFECTS__ */ () => `\u6982\u8981`;
    participants_list$6 = /* @__NO_SIDE_EFFECTS__ */ () => `\u88AB\u9A13\u8005\u4E00\u89A7`;
    sessions_history$6 = /* @__NO_SIDE_EFFECTS__ */ () => `\u30BB\u30C3\u30B7\u30E7\u30F3\u5C65\u6B74`;
    settings$6 = /* @__NO_SIDE_EFFECTS__ */ () => `\u8A2D\u5B9A`;
    auth_required_title$6 = /* @__NO_SIDE_EFFECTS__ */ () => `\u7BA1\u7406\u8005\u30DD\u30FC\u30BF\u30EB`;
    auth_required_desc$6 = /* @__NO_SIDE_EFFECTS__ */ () => `\u7BA1\u7406\u8005\u6A29\u9650\u3092\u6301\u3064\u30A2\u30AB\u30A6\u30F3\u30C8\u3067\u30B5\u30A4\u30F3\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044\u3002`;
    admin$6 = /* @__NO_SIDE_EFFECTS__ */ () => `\u7BA1\u7406\u8005`;
    update$6 = /* @__NO_SIDE_EFFECTS__ */ () => `\u66F4\u65B0`;
    signin$5 = /* @__NO_SIDE_EFFECTS__ */ () => `Se connecter`;
    overview$5 = /* @__NO_SIDE_EFFECTS__ */ () => `Aper\xE7u`;
    participants_list$5 = /* @__NO_SIDE_EFFECTS__ */ () => `Participants`;
    sessions_history$5 = /* @__NO_SIDE_EFFECTS__ */ () => `Sessions`;
    settings$5 = /* @__NO_SIDE_EFFECTS__ */ () => `Param\xE8tres`;
    auth_required_title$5 = /* @__NO_SIDE_EFFECTS__ */ () => `PORTAIL DU CHERCHEUR`;
    auth_required_desc$5 = /* @__NO_SIDE_EFFECTS__ */ () => `Veuillez vous connecter avec un compte disposant de privil\xE8ges administratifs.`;
    admin$5 = /* @__NO_SIDE_EFFECTS__ */ () => `Admin`;
    update$5 = /* @__NO_SIDE_EFFECTS__ */ () => `Mettre \xE0 jour`;
    signin$4 = /* @__NO_SIDE_EFFECTS__ */ () => `Iniciar sesi\xF3n`;
    overview$4 = /* @__NO_SIDE_EFFECTS__ */ () => `Resumen`;
    participants_list$4 = /* @__NO_SIDE_EFFECTS__ */ () => `Participantes`;
    sessions_history$4 = /* @__NO_SIDE_EFFECTS__ */ () => `Sesiones`;
    settings$4 = /* @__NO_SIDE_EFFECTS__ */ () => `Ajustes`;
    auth_required_title$4 = /* @__NO_SIDE_EFFECTS__ */ () => `PORTAL DEL INVESTIGADOR`;
    auth_required_desc$4 = /* @__NO_SIDE_EFFECTS__ */ () => `Por favor, inicie sesi\xF3n con una cuenta que tenga privilegios administrativos.`;
    admin$4 = /* @__NO_SIDE_EFFECTS__ */ () => `Admin`;
    update$4 = /* @__NO_SIDE_EFFECTS__ */ () => `Actualizar`;
    signin$3 = /* @__NO_SIDE_EFFECTS__ */ () => `\u0412\u043E\u0439\u0442\u0438`;
    overview$3 = /* @__NO_SIDE_EFFECTS__ */ () => `\u041E\u0431\u0437\u043E\u0440`;
    participants_list$3 = /* @__NO_SIDE_EFFECTS__ */ () => `\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u0438`;
    sessions_history$3 = /* @__NO_SIDE_EFFECTS__ */ () => `\u0421\u0435\u0441\u0441\u0438\u0438`;
    settings$3 = /* @__NO_SIDE_EFFECTS__ */ () => `\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438`;
    auth_required_title$3 = /* @__NO_SIDE_EFFECTS__ */ () => `\u041F\u041E\u0420\u0422\u0410\u041B \u0418\u0421\u0421\u041B\u0415\u0414\u041E\u0412\u0410\u0422\u0415\u041B\u042F`;
    auth_required_desc$3 = /* @__NO_SIDE_EFFECTS__ */ () => `\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0432\u043E\u0439\u0434\u0438\u0442\u0435 \u0432 \u0441\u0438\u0441\u0442\u0435\u043C\u0443 \u0441 \u0443\u0447\u0435\u0442\u043D\u043E\u0439 \u0437\u0430\u043F\u0438\u0441\u044C\u044E, \u043E\u0431\u043B\u0430\u0434\u0430\u044E\u0449\u0435\u0439 \u043F\u0440\u0430\u0432\u0430\u043C\u0438 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430.`;
    admin$3 = /* @__NO_SIDE_EFFECTS__ */ () => `\u0410\u0434\u043C\u0438\u043D`;
    update$3 = /* @__NO_SIDE_EFFECTS__ */ () => `\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C`;
    signin$2 = /* @__NO_SIDE_EFFECTS__ */ () => `\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644`;
    overview$2 = /* @__NO_SIDE_EFFECTS__ */ () => `\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629`;
    participants_list$2 = /* @__NO_SIDE_EFFECTS__ */ () => `\u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0648\u0646`;
    sessions_history$2 = /* @__NO_SIDE_EFFECTS__ */ () => `\u0627\u0644\u062C\u0644\u0633\u0627\u062A`;
    settings$2 = /* @__NO_SIDE_EFFECTS__ */ () => `\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A`;
    auth_required_title$2 = /* @__NO_SIDE_EFFECTS__ */ () => `\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0628\u0627\u062D\u062B`;
    auth_required_desc$2 = /* @__NO_SIDE_EFFECTS__ */ () => `\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u062D\u0633\u0627\u0628 \u0644\u062F\u064A\u0647 \u0627\u0645\u062A\u064A\u0627\u0632\u0627\u062A \u0625\u062F\u0627\u0631\u064A\u0629.`;
    admin$2 = /* @__NO_SIDE_EFFECTS__ */ () => `\u0645\u0634\u0631\u0641`;
    update$2 = /* @__NO_SIDE_EFFECTS__ */ () => `\u062A\u062D\u062F\u064A\u062B`;
    signin$1 = /* @__NO_SIDE_EFFECTS__ */ () => `\u767B\u5F55`;
    overview$1 = /* @__NO_SIDE_EFFECTS__ */ () => `\u6982\u89C8`;
    participants_list$1 = /* @__NO_SIDE_EFFECTS__ */ () => `\u53D7\u8BD5\u8005`;
    sessions_history$1 = /* @__NO_SIDE_EFFECTS__ */ () => `\u4F1A\u8BDD`;
    settings$1 = /* @__NO_SIDE_EFFECTS__ */ () => `\u8BBE\u7F6E`;
    auth_required_title$1 = /* @__NO_SIDE_EFFECTS__ */ () => `\u7814\u7A76\u5458\u95E8\u6237`;
    auth_required_desc$1 = /* @__NO_SIDE_EFFECTS__ */ () => `\u8BF7\u4F7F\u7528\u5177\u6709\u7BA1\u7406\u6743\u9650\u7684\u8D26\u6237\u767B\u5F55\u3002`;
    admin$1 = /* @__NO_SIDE_EFFECTS__ */ () => `\u7BA1\u7406\u5458`;
    update$1 = /* @__NO_SIDE_EFFECTS__ */ () => `\u66F4\u65B0`;
    signin = /* @__NO_SIDE_EFFECTS__ */ (params = {}, options2 = {}) => {
      return {
        ar: signin$2,
        en: signin$7,
        es: signin$4,
        fr: signin$5,
        ja: signin$6,
        ru: signin$3,
        zh: signin$1
      }[options2.languageTag ?? languageTag()]();
    };
    overview = /* @__NO_SIDE_EFFECTS__ */ (params = {}, options2 = {}) => {
      return {
        ar: overview$2,
        en: overview$7,
        es: overview$4,
        fr: overview$5,
        ja: overview$6,
        ru: overview$3,
        zh: overview$1
      }[options2.languageTag ?? languageTag()]();
    };
    participants_list = /* @__NO_SIDE_EFFECTS__ */ (params = {}, options2 = {}) => {
      return {
        ar: participants_list$2,
        en: participants_list$7,
        es: participants_list$4,
        fr: participants_list$5,
        ja: participants_list$6,
        ru: participants_list$3,
        zh: participants_list$1
      }[options2.languageTag ?? languageTag()]();
    };
    sessions_history = /* @__NO_SIDE_EFFECTS__ */ (params = {}, options2 = {}) => {
      return {
        ar: sessions_history$2,
        en: sessions_history$7,
        es: sessions_history$4,
        fr: sessions_history$5,
        ja: sessions_history$6,
        ru: sessions_history$3,
        zh: sessions_history$1
      }[options2.languageTag ?? languageTag()]();
    };
    settings = /* @__NO_SIDE_EFFECTS__ */ (params = {}, options2 = {}) => {
      return {
        ar: settings$2,
        en: settings$7,
        es: settings$4,
        fr: settings$5,
        ja: settings$6,
        ru: settings$3,
        zh: settings$1
      }[options2.languageTag ?? languageTag()]();
    };
    auth_required_title = /* @__NO_SIDE_EFFECTS__ */ (params = {}, options2 = {}) => {
      return {
        ar: auth_required_title$2,
        en: auth_required_title$7,
        es: auth_required_title$4,
        fr: auth_required_title$5,
        ja: auth_required_title$6,
        ru: auth_required_title$3,
        zh: auth_required_title$1
      }[options2.languageTag ?? languageTag()]();
    };
    auth_required_desc = /* @__NO_SIDE_EFFECTS__ */ (params = {}, options2 = {}) => {
      return {
        ar: auth_required_desc$2,
        en: auth_required_desc$7,
        es: auth_required_desc$4,
        fr: auth_required_desc$5,
        ja: auth_required_desc$6,
        ru: auth_required_desc$3,
        zh: auth_required_desc$1
      }[options2.languageTag ?? languageTag()]();
    };
    admin = /* @__NO_SIDE_EFFECTS__ */ (params = {}, options2 = {}) => {
      return {
        ar: admin$2,
        en: admin$7,
        es: admin$4,
        fr: admin$5,
        ja: admin$6,
        ru: admin$3,
        zh: admin$1
      }[options2.languageTag ?? languageTag()]();
    };
    update = /* @__NO_SIDE_EFFECTS__ */ (params = {}, options2 = {}) => {
      return {
        ar: update$2,
        en: update$7,
        es: update$4,
        fr: update$5,
        ja: update$6,
        ru: update$3,
        zh: update$1
      }[options2.languageTag ?? languageTag()]();
    };
  }
});

// .svelte-kit/output/server/entries/pages/_layout.svelte.js
var layout_svelte_exports = {};
__export(layout_svelte_exports, {
  default: () => _layout
});
function onDestroy(fn) {
  ssr_context.r.on_destroy(fn);
}
function ClerkLoaded($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { children } = $$props;
    const ctx = useClerkContext();
    if (ctx.isLoaded) {
      $$renderer2.push("<!--[-->");
      children($$renderer2, ctx.clerk);
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function UserButton$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { children: customMenuItems, $$slots, $$events, ...props } = $$props;
    let updatedProps = props;
    useClerkContext();
    setContext("$$_userButton", {
      addCustomMenuItem(_, item) {
        updatedProps.customMenuItems = [...updatedProps.customMenuItems || [], item];
      },
      addCustomPage(page2) {
        updatedProps.userProfileProps = {
          ...updatedProps.userProfileProps,
          customPages: [...updatedProps.userProfileProps?.customPages || [], page2]
        };
      }
    });
    onDestroy(() => {
    });
    ClerkLoaded($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<div></div>`);
      }
    });
    $$renderer2.push(`<!----> `);
    customMenuItems?.($$renderer2);
    $$renderer2.push(`<!---->`);
  });
}
function UserButtonAction($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { addCustomMenuItem } = getContext("$$_userButtonMenuItems");
    const { $$slots, $$events, ...props } = $$props;
  });
}
function UserButtonLink($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { addCustomMenuItem } = getContext("$$_userButtonMenuItems");
    const { label, href, labelIcon } = $$props;
  });
}
function UserButtonMenuItems($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const context2 = getContext("$$_userButton");
    const { children } = $$props;
    setContext("$$_userButtonMenuItems", context2);
    children($$renderer2);
    $$renderer2.push(`<!---->`);
  });
}
function UserButtonUserProfilePage($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { addCustomPage } = getContext("$$_userButton");
    const { children, labelIcon, label, url } = $$props;
  });
}
function SignedIn($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { children } = $$props;
    const ctx = useClerkContext();
    if (ctx.auth.userId) {
      $$renderer2.push("<!--[-->");
      children($$renderer2);
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function SignedOut($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { children } = $$props;
    const ctx = useClerkContext();
    if (ctx.auth.userId === null) {
      $$renderer2.push("<!--[-->");
      children($$renderer2);
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function SignInButton($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const {
      mode,
      children,
      style,
      class: buttonClass,
      asChild,
      $$slots,
      $$events,
      ...props
    } = $$props;
    const ctx = useClerkContext();
    function signIn() {
      if (!ctx.clerk) return;
      if (mode === "modal") {
        void ctx.clerk.openSignIn(props);
        return;
      }
      void ctx.clerk.redirectToSignIn({
        ...props,
        signInFallbackRedirectUrl: props.fallbackRedirectUrl,
        signInForceRedirectUrl: props.forceRedirectUrl
      });
    }
    if (asChild) {
      $$renderer2.push("<!--[-->");
      children?.($$renderer2, { signIn });
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<button type="button"${attr_style(style)}${attr_class(clsx(buttonClass))}>`);
      if (children) {
        $$renderer2.push("<!--[-->");
        children($$renderer2, { signIn });
        $$renderer2.push(`<!---->`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`Sign in`);
      }
      $$renderer2.push(`<!--]--></button>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function buildErrorThrower({ packageName, customMessages }) {
  let pkg = packageName;
  function buildMessage(rawMessage, replacements3) {
    if (!replacements3) return `${pkg}: ${rawMessage}`;
    let msg = rawMessage;
    const matches = rawMessage.matchAll(/{{([a-zA-Z0-9-_]+)}}/g);
    for (const match of matches) {
      const replacement = (replacements3[match[1]] || "").toString();
      msg = msg.replace(`{{${match[1]}}}`, replacement);
    }
    return `${pkg}: ${msg}`;
  }
  const messages = {
    ...DefaultMessages,
    ...customMessages
  };
  return {
    setPackageName({ packageName: packageName$1 }) {
      if (typeof packageName$1 === "string") pkg = packageName$1;
      return this;
    },
    setMessages({ customMessages: customMessages$1 }) {
      Object.assign(messages, customMessages$1 || {});
      return this;
    },
    throwInvalidPublishableKeyError(params) {
      throw new Error(buildMessage(messages.InvalidPublishableKeyErrorMessage, params));
    },
    throwInvalidProxyUrl(params) {
      throw new Error(buildMessage(messages.InvalidProxyUrlErrorMessage, params));
    },
    throwMissingPublishableKeyError() {
      throw new Error(buildMessage(messages.MissingPublishableKeyErrorMessage));
    },
    throwMissingSecretKeyError() {
      throw new Error(buildMessage(messages.MissingSecretKeyErrorMessage));
    },
    throwMissingClerkProviderError(params) {
      throw new Error(buildMessage(messages.MissingClerkProvider, params));
    },
    throw(message) {
      throw new Error(buildMessage(message));
    }
  };
}
function setClerkJsLoadingErrorPackageName(packageName) {
  errorThrower.setPackageName({ packageName });
}
function ClerkProvider($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { children, initialState, $$slots, $$events, ...props } = $$props;
    let clerk = null;
    let isLoaded = false;
    let resources = {
      client: void 0,
      session: void 0,
      user: void 0,
      organization: void 0
    };
    const auth = deriveState(isLoaded, resources, initialState);
    const client = resources.client;
    const session = auth.session;
    const user = auth.user;
    const organization = auth.organization;
    setClerkJsLoadingErrorPackageName("svelte-clerk");
    setClerkContext({
      get clerk() {
        return clerk;
      },
      get isLoaded() {
        return isLoaded;
      },
      get auth() {
        return auth;
      },
      get client() {
        return client;
      },
      get session() {
        return session;
      },
      get user() {
        return user;
      },
      get organization() {
        return organization;
      }
    });
    children($$renderer2);
    $$renderer2.push(`<!---->`);
  });
}
function isTruthy(value) {
  if (typeof value === `boolean`) return value;
  if (value === void 0 || value === null) return false;
  if (typeof value === `string`) {
    if (value.toLowerCase() === `true`) return true;
    if (value.toLowerCase() === `false`) return false;
  }
  const number = parseInt(value, 10);
  if (isNaN(number)) return false;
  if (number > 0) return true;
  return false;
}
function getEnvVariable(name, defaultValue) {
  return name in public_env ? public_env[name] : defaultValue;
}
function getDynamicPublicEnvVariables() {
  return {
    publishableKey: getEnvVariable("PUBLIC_CLERK_PUBLISHABLE_KEY"),
    domain: getEnvVariable("PUBLIC_CLERK_DOMAIN"),
    isSatellite: getEnvVariable("PUBLIC_CLERK_IS_SATELLITE"),
    proxyUrl: getEnvVariable("PUBLIC_CLERK_PROXY_URL"),
    signInUrl: getEnvVariable("PUBLIC_CLERK_SIGN_IN_URL"),
    signUpUrl: getEnvVariable("PUBLIC_CLERK_SIGN_UP_URL"),
    clerkJSUrl: getEnvVariable("PUBLIC_CLERK_JS_URL"),
    clerkJSVersion: getEnvVariable("PUBLIC_CLERK_JS_VERSION"),
    signInForceRedirectUrl: getEnvVariable("PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL"),
    signUpForceRedirectUrl: getEnvVariable("PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL"),
    signInFallbackRedirectUrl: getEnvVariable("PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL"),
    signUpFallbackRedirectUrl: getEnvVariable("PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL"),
    telemetryDisabled: isTruthy(getEnvVariable("PUBLIC_CLERK_TELEMETRY_DISABLED")),
    telemetryDebug: isTruthy(getEnvVariable("PUBLIC_CLERK_TELEMETRY_DEBUG"))
  };
}
function mergeWithPublicEnvVariables(clerkInitOptions) {
  const { publishableKey, signInUrl, signUpUrl, signInForceRedirectUrl, signUpForceRedirectUrl, signInFallbackRedirectUrl, signUpFallbackRedirectUrl, clerkJSUrl, clerkJSVersion, proxyUrl, domain, telemetry } = clerkInitOptions;
  return {
    publishableKey: publishableKey || getDynamicPublicEnvVariables().publishableKey,
    signInUrl: signInUrl || getDynamicPublicEnvVariables().signInUrl,
    signUpUrl: signUpUrl || getDynamicPublicEnvVariables().signUpUrl,
    signInForceRedirectUrl: signInForceRedirectUrl || getDynamicPublicEnvVariables().signInForceRedirectUrl,
    signUpForceRedirectUrl: signUpForceRedirectUrl || getDynamicPublicEnvVariables().signUpForceRedirectUrl,
    signInFallbackRedirectUrl: signInFallbackRedirectUrl || getDynamicPublicEnvVariables().signInFallbackRedirectUrl,
    signUpFallbackRedirectUrl: signUpFallbackRedirectUrl || getDynamicPublicEnvVariables().signUpFallbackRedirectUrl,
    clerkJSUrl: clerkJSUrl || getDynamicPublicEnvVariables().clerkJSUrl,
    clerkJSVersion: clerkJSVersion || getDynamicPublicEnvVariables().clerkJSVersion,
    proxyUrl: proxyUrl || getDynamicPublicEnvVariables().proxyUrl,
    domain: domain || getDynamicPublicEnvVariables().domain,
    telemetry: telemetry || {
      debug: getDynamicPublicEnvVariables().telemetryDebug,
      disabled: getDynamicPublicEnvVariables().telemetryDisabled
    }
  };
}
function ClerkProvider_1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { children, $$slots, $$events, ...props } = $$props;
    const mergedProps = {
      ...props,
      ...mergeWithPublicEnvVariables(props),
      routerPush: (to) => goto(),
      routerReplace: (to) => goto(to, {})
    };
    ClerkProvider($$renderer2, spread_props([
      { initialState: page?.data?.initialState },
      mergedProps,
      {
        children: ($$renderer3) => {
          children($$renderer3);
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
function ResearcherGuard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { children, fallback } = $$props;
    runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY ? useClerkContext() : null;
    const isResearcher = (() => {
      if (!runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY) return true;
      return false;
    })();
    if (isResearcher) {
      $$renderer2.push("<!--[-->");
      children($$renderer2);
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (fallback) {
        $$renderer2.push("<!--[-->");
        fallback($$renderer2);
        $$renderer2.push(`<!---->`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { children } = $$props;
    let activeTab = (() => {
      const path = page.url.pathname;
      if (path.startsWith("/participants")) return "participants";
      if (path.startsWith("/sessions")) return "sessions";
      if (path.startsWith("/settings")) return "settings";
      return "overview";
    })();
    function content($$renderer3) {
      $$renderer3.push(`<div class="researcher-container svelte-12qhfyh">`);
      if (!runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="dashboard-layout svelte-12qhfyh"><aside class="sidebar svelte-12qhfyh"><div class="sidebar-header svelte-12qhfyh"><span class="brand svelte-12qhfyh">Admin Dashboard (No Auth Mode)</span></div> <nav class="sidebar-nav svelte-12qhfyh"><a href="/"${attr_class("nav-item svelte-12qhfyh", void 0, { "active": activeTab === "overview" })}><span class="icon svelte-12qhfyh">\u{1F4CA}</span> ${escape_html2(overview())}</a> <a href="/participants/"${attr_class("nav-item svelte-12qhfyh", void 0, { "active": activeTab === "participants" })}><span class="icon svelte-12qhfyh">\u{1F465}</span> ${escape_html2(participants_list())}</a> <a href="/sessions/"${attr_class("nav-item svelte-12qhfyh", void 0, { "active": activeTab === "sessions" })}><span class="icon svelte-12qhfyh">\u{1F552}</span> ${escape_html2(sessions_history())}</a> <a href="/settings/"${attr_class("nav-item svelte-12qhfyh", void 0, { "active": activeTab === "settings" })}><span class="icon svelte-12qhfyh">\u2699\uFE0F</span> ${escape_html2(settings())}</a></nav></aside> <main class="main-content svelte-12qhfyh"><header class="content-header svelte-12qhfyh"><h2 class="text-xl font-bold text-gray-800">`);
        if (activeTab === "overview") {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`${escape_html2(overview())}`);
        } else {
          $$renderer3.push("<!--[!-->");
          if (activeTab === "participants") {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`${escape_html2(participants_list())}`);
          } else {
            $$renderer3.push("<!--[!-->");
            if (activeTab === "sessions") {
              $$renderer3.push("<!--[-->");
              $$renderer3.push(`${escape_html2(sessions_history())}`);
            } else {
              $$renderer3.push("<!--[!-->");
              if (activeTab === "settings") {
                $$renderer3.push("<!--[-->");
                $$renderer3.push(`${escape_html2(settings())}`);
              } else {
                $$renderer3.push("<!--[!-->");
              }
              $$renderer3.push(`<!--]-->`);
            }
            $$renderer3.push(`<!--]-->`);
          }
          $$renderer3.push(`<!--]-->`);
        }
        $$renderer3.push(`<!--]--></h2> <div class="header-actions"><button class="btn-refresh svelte-12qhfyh"${attr("aria-label", update())}>${escape_html2(update())}</button></div></header> <div class="content-body svelte-12qhfyh" role="region" aria-label="Dashboard Content">`);
        children($$renderer3);
        $$renderer3.push(`<!----></div></main></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
        SignedOut($$renderer3, {
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="auth-required svelte-12qhfyh"><div class="auth-card svelte-12qhfyh"><h1 class="svelte-12qhfyh">${escape_html2(auth_required_title())}</h1> <p class="svelte-12qhfyh">${escape_html2(auth_required_desc())}</p> <div class="auth-actions svelte-12qhfyh">`);
            SignInButton($$renderer4, {
              mode: "modal",
              children: ($$renderer5) => {
                $$renderer5.push(`<button class="btn-signin svelte-12qhfyh">${escape_html2(signin())}</button>`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----></div></div></div>`);
          }
        });
        $$renderer3.push(`<!----> `);
        SignedIn($$renderer3, {
          children: ($$renderer4) => {
            {
              let fallback = function($$renderer5) {
                $$renderer5.push(`<div class="auth-required svelte-12qhfyh"><div class="auth-card svelte-12qhfyh"><h1 class="svelte-12qhfyh">Access Denied</h1> <p class="svelte-12qhfyh">\u7814\u7A76\u8005\u6A29\u9650 (researcher role) \u304C\u5FC5\u8981\u3067\u3059\u3002\u7BA1\u7406\u8005\u306B\u304A\u554F\u3044\u5408\u308F\u305B\u304F\u3060\u3055\u3044\u3002</p> <div class="auth-placeholder svelte-12qhfyh"><p class="svelte-12qhfyh">\u73FE\u5728\u306E\u30E6\u30FC\u30B6\u30FC\u306B\u306F\u3053\u306E\u30DA\u30FC\u30B8\u3092\u8868\u793A\u3059\u308B\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093\u3002</p></div></div></div>`);
              };
              ResearcherGuard($$renderer4, {
                fallback,
                children: ($$renderer5) => {
                  $$renderer5.push(`<div class="dashboard-layout svelte-12qhfyh"><aside class="sidebar svelte-12qhfyh"><div class="sidebar-header svelte-12qhfyh"><span class="brand svelte-12qhfyh">Researcher Dashboard</span></div> <nav class="sidebar-nav svelte-12qhfyh"><a href="/"${attr_class("nav-item svelte-12qhfyh", void 0, { "active": activeTab === "overview" })}><span class="icon svelte-12qhfyh">\u{1F4CA}</span> ${escape_html2(overview())}</a> <a href="/participants/"${attr_class("nav-item svelte-12qhfyh", void 0, { "active": activeTab === "participants" })}><span class="icon svelte-12qhfyh">\u{1F465}</span> ${escape_html2(participants_list())}</a> <a href="/sessions/"${attr_class("nav-item svelte-12qhfyh", void 0, { "active": activeTab === "sessions" })}><span class="icon svelte-12qhfyh">\u{1F552}</span> ${escape_html2(sessions_history())}</a> <a href="/settings/"${attr_class("nav-item svelte-12qhfyh", void 0, { "active": activeTab === "settings" })}><span class="icon svelte-12qhfyh">\u2699\uFE0F</span> ${escape_html2(settings())}</a></nav> <div class="sidebar-footer svelte-12qhfyh">`);
                  UserButton($$renderer5, {});
                  $$renderer5.push(`<!----> <span class="user-name svelte-12qhfyh">${escape_html2(admin())}</span></div></aside> <main class="main-content svelte-12qhfyh"><header class="content-header svelte-12qhfyh"><div class="flex items-center gap-4"><h2 class="text-xl font-bold text-gray-800">`);
                  if (activeTab === "overview") {
                    $$renderer5.push("<!--[-->");
                    $$renderer5.push(`${escape_html2(overview())}`);
                  } else {
                    $$renderer5.push("<!--[!-->");
                    if (activeTab === "participants") {
                      $$renderer5.push("<!--[-->");
                      $$renderer5.push(`${escape_html2(participants_list())}`);
                    } else {
                      $$renderer5.push("<!--[!-->");
                      if (activeTab === "sessions") {
                        $$renderer5.push("<!--[-->");
                        $$renderer5.push(`${escape_html2(sessions_history())}`);
                      } else {
                        $$renderer5.push("<!--[!-->");
                        if (activeTab === "settings") {
                          $$renderer5.push("<!--[-->");
                          $$renderer5.push(`${escape_html2(settings())}`);
                        } else {
                          $$renderer5.push("<!--[!-->");
                        }
                        $$renderer5.push(`<!--]-->`);
                      }
                      $$renderer5.push(`<!--]-->`);
                    }
                    $$renderer5.push(`<!--]-->`);
                  }
                  $$renderer5.push(`<!--]--></h2></div> <div class="header-actions"><button class="btn-refresh svelte-12qhfyh"${attr("aria-label", update())}>${escape_html2(update())}</button></div></header> <div class="content-body svelte-12qhfyh">`);
                  children($$renderer5);
                  $$renderer5.push(`<!----></div></main></div>`);
                }
              });
            }
          }
        });
        $$renderer3.push(`<!---->`);
      }
      $$renderer3.push(`<!--]--></div>`);
    }
    if (runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY) {
      $$renderer2.push("<!--[-->");
      ClerkProvider_1($$renderer2, {
        publishableKey: runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY,
        children: ($$renderer3) => {
          content($$renderer3);
        },
        $$slots: { default: true }
      });
    } else {
      $$renderer2.push("<!--[!-->");
      content($$renderer2);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
var _contextKey, useClerkContext, setClerkContext, UserButton, deriveState, deriveFromSsrInitialState, deriveFromClientSideState, DefaultMessages, errorThrower;
var init_layout_svelte = __esm({
  ".svelte-kit/output/server/entries/pages/_layout.svelte.js"() {
    init_chunks();
    init_context();
    init_index3();
    init_shared_server();
    init_internal();
    init_exports();
    init_utils();
    init_server();
    init_state_svelte();
    init_env_svelte();
    init_messages();
    _contextKey = "$$_clerk";
    useClerkContext = () => {
      const client = getContext(_contextKey);
      if (!client) {
        throw new Error("No Clerk data was found in Svelte context. Did you forget to wrap your component with ClerkProvider?");
      }
      return client;
    };
    setClerkContext = (context2) => {
      setContext(_contextKey, context2);
    };
    UserButton = Object.assign(UserButton$1, {
      MenuItems: UserButtonMenuItems,
      Action: UserButtonAction,
      Link: UserButtonLink,
      UserProfilePage: UserButtonUserProfilePage
    });
    deriveState = (clerkOperational, state2, initialState) => {
      if (initialState) return deriveFromSsrInitialState(initialState);
      return deriveFromClientSideState(state2);
    };
    deriveFromSsrInitialState = (initialState) => {
      const userId = initialState.userId;
      const user = initialState.user;
      const sessionId = initialState.sessionId;
      const sessionStatus = initialState.sessionStatus;
      const sessionClaims = initialState.sessionClaims;
      return {
        userId,
        user,
        sessionId,
        session: initialState.session,
        sessionStatus,
        sessionClaims,
        organization: initialState.organization,
        orgId: initialState.orgId,
        orgRole: initialState.orgRole,
        orgPermissions: initialState.orgPermissions,
        orgSlug: initialState.orgSlug,
        actor: initialState.actor,
        factorVerificationAge: initialState.factorVerificationAge
      };
    };
    deriveFromClientSideState = (state2) => {
      const userId = state2.user ? state2.user.id : state2.user;
      const user = state2.user;
      const sessionId = state2.session ? state2.session.id : state2.session;
      const session = state2.session;
      const sessionStatus = state2.session?.status;
      const sessionClaims = state2.session ? state2.session.lastActiveToken?.jwt?.claims : null;
      const factorVerificationAge = state2.session ? state2.session.factorVerificationAge : null;
      const actor = session?.actor;
      const organization = state2.organization;
      const orgId = state2.organization ? state2.organization.id : state2.organization;
      const orgSlug = organization?.slug;
      const membership = organization ? user?.organizationMemberships?.find((om) => om.organization.id === orgId) : organization;
      const orgPermissions = membership ? membership.permissions : membership;
      return {
        userId,
        user,
        sessionId,
        session,
        sessionStatus,
        sessionClaims,
        organization,
        orgId,
        orgRole: membership ? membership.role : membership,
        orgSlug,
        orgPermissions,
        actor,
        factorVerificationAge
      };
    };
    DefaultMessages = Object.freeze({
      InvalidProxyUrlErrorMessage: `The proxyUrl passed to Clerk is invalid. The expected value for proxyUrl is an absolute URL or a relative path with a leading '/'. (key={{url}})`,
      InvalidPublishableKeyErrorMessage: `The publishableKey passed to Clerk is invalid. You can get your Publishable key at https://dashboard.clerk.com/last-active?path=api-keys. (key={{key}})`,
      MissingPublishableKeyErrorMessage: `Missing publishableKey. You can get your key at https://dashboard.clerk.com/last-active?path=api-keys.`,
      MissingSecretKeyErrorMessage: `Missing secretKey. You can get your key at https://dashboard.clerk.com/last-active?path=api-keys.`,
      MissingClerkProvider: `{{source}} can only be used within the <ClerkProvider /> component. Learn more: https://clerk.com/docs/components/clerk-provider`
    });
    errorThrower = buildErrorThrower({ packageName: "@clerk/shared" });
    buildErrorThrower({ packageName: "svelte-clerk" });
  }
});

// .svelte-kit/output/server/nodes/0.js
var __exports = {};
__export(__exports, {
  component: () => component,
  fonts: () => fonts,
  imports: () => imports,
  index: () => index,
  stylesheets: () => stylesheets,
  universal: () => universal,
  universal_id: () => universal_id
});
var index, component_cache, component, universal, universal_id, imports, stylesheets, fonts;
var init__ = __esm({
  ".svelte-kit/output/server/nodes/0.js"() {
    index = 0;
    component = async () => component_cache ??= (await Promise.resolve().then(() => (init_layout_svelte(), layout_svelte_exports))).default;
    universal = {
      "prerender": true,
      "ssr": false,
      "trailingSlash": "always"
    };
    universal_id = "src/routes/+layout.ts";
    imports = ["_app/immutable/nodes/0.CycucRfk.js", "_app/immutable/chunks/BfDzqXj_.js", "_app/immutable/chunks/C46-1ezO.js", "_app/immutable/chunks/Bdl2G0I9.js", "_app/immutable/chunks/3VV9fmUu.js", "_app/immutable/chunks/Dim4MYaz.js", "_app/immutable/chunks/BnNCwOLM.js", "_app/immutable/chunks/BcvqufFC.js", "_app/immutable/chunks/BWE5czp6.js", "_app/immutable/chunks/VRhKX6pk.js", "_app/immutable/chunks/DWSBWmCz.js", "_app/immutable/chunks/C_EOvaTA.js", "_app/immutable/chunks/CrPo3IqN.js", "_app/immutable/chunks/BSCKDS0b.js"];
    stylesheets = ["_app/immutable/assets/0.Bc4PcNEr.css"];
    fonts = [];
  }
});

// .svelte-kit/output/server/entries/fallbacks/error.svelte.js
var error_svelte_exports = {};
__export(error_svelte_exports, {
  default: () => Error2
});
function Error2($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<h1>${escape_html2(page.status)}</h1> <p>${escape_html2(page.error?.message)}</p>`);
  });
}
var init_error_svelte = __esm({
  ".svelte-kit/output/server/entries/fallbacks/error.svelte.js"() {
    init_context();
    init_index3();
  }
});

// .svelte-kit/output/server/nodes/1.js
var __exports2 = {};
__export(__exports2, {
  component: () => component2,
  fonts: () => fonts2,
  imports: () => imports2,
  index: () => index2,
  stylesheets: () => stylesheets2
});
var index2, component_cache2, component2, imports2, stylesheets2, fonts2;
var init__2 = __esm({
  ".svelte-kit/output/server/nodes/1.js"() {
    index2 = 1;
    component2 = async () => component_cache2 ??= (await Promise.resolve().then(() => (init_error_svelte(), error_svelte_exports))).default;
    imports2 = ["_app/immutable/nodes/1.D0CcPX0h.js", "_app/immutable/chunks/BfDzqXj_.js", "_app/immutable/chunks/C46-1ezO.js", "_app/immutable/chunks/CdGCpFQb.js", "_app/immutable/chunks/Bdl2G0I9.js", "_app/immutable/chunks/DWSBWmCz.js", "_app/immutable/chunks/C_EOvaTA.js", "_app/immutable/chunks/BcvqufFC.js"];
    stylesheets2 = [];
    fonts2 = [];
  }
});

// .svelte-kit/output/server/index.js
init_false();

// ../../node_modules/.pnpm/@sveltejs+kit@2.50.2_@sveltejs+vite-plugin-svelte@6.2.4_svelte@5.49.2_vite@7.3.1_@types_7b24b5d0d469dd33a89119d54e695b21/node_modules/@sveltejs/kit/src/exports/index.js
init_internal();

// ../../node_modules/.pnpm/esm-env@1.2.2/node_modules/esm-env/true.js
var true_default = true;

// ../../node_modules/.pnpm/esm-env@1.2.2/node_modules/esm-env/dev-fallback.js
var node_env = globalThis.process?.env?.NODE_ENV;
var dev_fallback_default = node_env && !node_env.toLowerCase().startsWith("prod");

// ../../node_modules/.pnpm/@sveltejs+kit@2.50.2_@sveltejs+vite-plugin-svelte@6.2.4_svelte@5.49.2_vite@7.3.1_@types_7b24b5d0d469dd33a89119d54e695b21/node_modules/@sveltejs/kit/src/runtime/utils.js
var text_encoder = new TextEncoder();
var text_decoder = new TextDecoder();

// ../../node_modules/.pnpm/@sveltejs+kit@2.50.2_@sveltejs+vite-plugin-svelte@6.2.4_svelte@5.49.2_vite@7.3.1_@types_7b24b5d0d469dd33a89119d54e695b21/node_modules/@sveltejs/kit/src/exports/index.js
function error(status, body2) {
  if ((!true_default || dev_fallback_default) && (isNaN(status) || status < 400 || status > 599)) {
    throw new Error(`HTTP error status codes must be between 400 and 599 \u2014 ${status} is invalid`);
  }
  throw new HttpError(status, body2);
}
function json(data, init2) {
  const body2 = JSON.stringify(data);
  const headers2 = new Headers(init2?.headers);
  if (!headers2.has("content-length")) {
    headers2.set("content-length", text_encoder.encode(body2).byteLength.toString());
  }
  if (!headers2.has("content-type")) {
    headers2.set("content-type", "application/json");
  }
  return new Response(body2, {
    ...init2,
    headers: headers2
  });
}
function text(body2, init2) {
  const headers2 = new Headers(init2?.headers);
  if (!headers2.has("content-length")) {
    const encoded = text_encoder.encode(body2);
    headers2.set("content-length", encoded.byteLength.toString());
    return new Response(encoded, {
      ...init2,
      headers: headers2
    });
  }
  return new Response(body2, {
    ...init2,
    headers: headers2
  });
}

// .svelte-kit/output/server/index.js
init_internal();
init_server();

// .svelte-kit/output/server/chunks/server.js
var base = "";
var assets = base;
var app_dir = "_app";
var relative = false;
var initial = { base, assets };
function reset() {
  base = initial.base;
  assets = initial.assets;
}

// .svelte-kit/output/server/chunks/shared.js
init_internal();
init_server();
init_utils();
init_utils2();
var ENDPOINT_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];
var PAGE_METHODS = ["GET", "POST", "HEAD"];
function encode64(arraybuffer) {
  const dv = new DataView(arraybuffer);
  let binaryString = "";
  for (let i = 0; i < arraybuffer.byteLength; i++) {
    binaryString += String.fromCharCode(dv.getUint8(i));
  }
  return binaryToAscii(binaryString);
}
function decode64(string) {
  const binaryString = asciiToBinary(string);
  const arraybuffer = new ArrayBuffer(binaryString.length);
  const dv = new DataView(arraybuffer);
  for (let i = 0; i < arraybuffer.byteLength; i++) {
    dv.setUint8(i, binaryString.charCodeAt(i));
  }
  return arraybuffer;
}
var KEY_STRING = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function asciiToBinary(data) {
  if (data.length % 4 === 0) {
    data = data.replace(/==?$/, "");
  }
  let output = "";
  let buffer = 0;
  let accumulatedBits = 0;
  for (let i = 0; i < data.length; i++) {
    buffer <<= 6;
    buffer |= KEY_STRING.indexOf(data[i]);
    accumulatedBits += 6;
    if (accumulatedBits === 24) {
      output += String.fromCharCode((buffer & 16711680) >> 16);
      output += String.fromCharCode((buffer & 65280) >> 8);
      output += String.fromCharCode(buffer & 255);
      buffer = accumulatedBits = 0;
    }
  }
  if (accumulatedBits === 12) {
    buffer >>= 4;
    output += String.fromCharCode(buffer);
  } else if (accumulatedBits === 18) {
    buffer >>= 2;
    output += String.fromCharCode((buffer & 65280) >> 8);
    output += String.fromCharCode(buffer & 255);
  }
  return output;
}
function binaryToAscii(str) {
  let out = "";
  for (let i = 0; i < str.length; i += 3) {
    const groupsOfSix = [void 0, void 0, void 0, void 0];
    groupsOfSix[0] = str.charCodeAt(i) >> 2;
    groupsOfSix[1] = (str.charCodeAt(i) & 3) << 4;
    if (str.length > i + 1) {
      groupsOfSix[1] |= str.charCodeAt(i + 1) >> 4;
      groupsOfSix[2] = (str.charCodeAt(i + 1) & 15) << 2;
    }
    if (str.length > i + 2) {
      groupsOfSix[2] |= str.charCodeAt(i + 2) >> 6;
      groupsOfSix[3] = str.charCodeAt(i + 2) & 63;
    }
    for (let j = 0; j < groupsOfSix.length; j++) {
      if (typeof groupsOfSix[j] === "undefined") {
        out += "=";
      } else {
        out += KEY_STRING[groupsOfSix[j]];
      }
    }
  }
  return out;
}
var UNDEFINED = -1;
var HOLE = -2;
var NAN = -3;
var POSITIVE_INFINITY = -4;
var NEGATIVE_INFINITY = -5;
var NEGATIVE_ZERO = -6;
function parse(serialized, revivers) {
  return unflatten(JSON.parse(serialized), revivers);
}
function unflatten(parsed, revivers) {
  if (typeof parsed === "number") return hydrate2(parsed, true);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Invalid input");
  }
  const values = (
    /** @type {any[]} */
    parsed
  );
  const hydrated = Array(values.length);
  let hydrating2 = null;
  function hydrate2(index3, standalone = false) {
    if (index3 === UNDEFINED) return void 0;
    if (index3 === NAN) return NaN;
    if (index3 === POSITIVE_INFINITY) return Infinity;
    if (index3 === NEGATIVE_INFINITY) return -Infinity;
    if (index3 === NEGATIVE_ZERO) return -0;
    if (standalone || typeof index3 !== "number") {
      throw new Error(`Invalid input`);
    }
    if (index3 in hydrated) return hydrated[index3];
    const value = values[index3];
    if (!value || typeof value !== "object") {
      hydrated[index3] = value;
    } else if (Array.isArray(value)) {
      if (typeof value[0] === "string") {
        const type = value[0];
        const reviver = revivers && Object.hasOwn(revivers, type) ? revivers[type] : void 0;
        if (reviver) {
          let i = value[1];
          if (typeof i !== "number") {
            i = values.push(value[1]) - 1;
          }
          hydrating2 ??= /* @__PURE__ */ new Set();
          if (hydrating2.has(i)) {
            throw new Error("Invalid circular reference");
          }
          hydrating2.add(i);
          hydrated[index3] = reviver(hydrate2(i));
          hydrating2.delete(i);
          return hydrated[index3];
        }
        switch (type) {
          case "Date":
            hydrated[index3] = new Date(value[1]);
            break;
          case "Set":
            const set2 = /* @__PURE__ */ new Set();
            hydrated[index3] = set2;
            for (let i = 1; i < value.length; i += 1) {
              set2.add(hydrate2(value[i]));
            }
            break;
          case "Map":
            const map = /* @__PURE__ */ new Map();
            hydrated[index3] = map;
            for (let i = 1; i < value.length; i += 2) {
              map.set(hydrate2(value[i]), hydrate2(value[i + 1]));
            }
            break;
          case "RegExp":
            hydrated[index3] = new RegExp(value[1], value[2]);
            break;
          case "Object":
            hydrated[index3] = Object(value[1]);
            break;
          case "BigInt":
            hydrated[index3] = BigInt(value[1]);
            break;
          case "null":
            const obj = /* @__PURE__ */ Object.create(null);
            hydrated[index3] = obj;
            for (let i = 1; i < value.length; i += 2) {
              obj[value[i]] = hydrate2(value[i + 1]);
            }
            break;
          case "Int8Array":
          case "Uint8Array":
          case "Uint8ClampedArray":
          case "Int16Array":
          case "Uint16Array":
          case "Int32Array":
          case "Uint32Array":
          case "Float32Array":
          case "Float64Array":
          case "BigInt64Array":
          case "BigUint64Array": {
            if (values[value[1]][0] !== "ArrayBuffer") {
              throw new Error("Invalid data");
            }
            const TypedArrayConstructor = globalThis[type];
            const buffer = hydrate2(value[1]);
            const typedArray = new TypedArrayConstructor(buffer);
            hydrated[index3] = value[2] !== void 0 ? typedArray.subarray(value[2], value[3]) : typedArray;
            break;
          }
          case "ArrayBuffer": {
            const base64 = value[1];
            if (typeof base64 !== "string") {
              throw new Error("Invalid ArrayBuffer encoding");
            }
            const arraybuffer = decode64(base64);
            hydrated[index3] = arraybuffer;
            break;
          }
          case "Temporal.Duration":
          case "Temporal.Instant":
          case "Temporal.PlainDate":
          case "Temporal.PlainTime":
          case "Temporal.PlainDateTime":
          case "Temporal.PlainMonthDay":
          case "Temporal.PlainYearMonth":
          case "Temporal.ZonedDateTime": {
            const temporalName = type.slice(9);
            hydrated[index3] = Temporal[temporalName].from(value[1]);
            break;
          }
          case "URL": {
            const url = new URL(value[1]);
            hydrated[index3] = url;
            break;
          }
          case "URLSearchParams": {
            const url = new URLSearchParams(value[1]);
            hydrated[index3] = url;
            break;
          }
          default:
            throw new Error(`Unknown type ${type}`);
        }
      } else {
        const array2 = new Array(value.length);
        hydrated[index3] = array2;
        for (let i = 0; i < value.length; i += 1) {
          const n2 = value[i];
          if (n2 === HOLE) continue;
          array2[i] = hydrate2(n2);
        }
      }
    } else {
      const object = {};
      hydrated[index3] = object;
      for (const key2 in value) {
        if (key2 === "__proto__") {
          throw new Error("Cannot parse an object with a `__proto__` property");
        }
        const n2 = value[key2];
        object[key2] = hydrate2(n2);
      }
    }
    return hydrated[index3];
  }
  return hydrate2(0);
}
function stringify$1(value, reducers) {
  const stringified = [];
  const indexes = /* @__PURE__ */ new Map();
  const custom = [];
  if (reducers) {
    for (const key2 of Object.getOwnPropertyNames(reducers)) {
      custom.push({ key: key2, fn: reducers[key2] });
    }
  }
  const keys = [];
  let p = 0;
  function flatten(thing) {
    if (thing === void 0) return UNDEFINED;
    if (Number.isNaN(thing)) return NAN;
    if (thing === Infinity) return POSITIVE_INFINITY;
    if (thing === -Infinity) return NEGATIVE_INFINITY;
    if (thing === 0 && 1 / thing < 0) return NEGATIVE_ZERO;
    if (indexes.has(thing)) return indexes.get(thing);
    const index22 = p++;
    indexes.set(thing, index22);
    for (const { key: key2, fn } of custom) {
      const value2 = fn(thing);
      if (value2) {
        stringified[index22] = `["${key2}",${flatten(value2)}]`;
        return index22;
      }
    }
    if (typeof thing === "function") {
      throw new DevalueError(`Cannot stringify a function`, keys, thing, value);
    }
    let str = "";
    if (is_primitive(thing)) {
      str = stringify_primitive(thing);
    } else {
      const type = get_type(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
          str = `["Object",${stringify_primitive(thing)}]`;
          break;
        case "BigInt":
          str = `["BigInt",${thing}]`;
          break;
        case "Date":
          const valid = !isNaN(thing.getDate());
          str = `["Date","${valid ? thing.toISOString() : ""}"]`;
          break;
        case "URL":
          str = `["URL",${stringify_string(thing.toString())}]`;
          break;
        case "URLSearchParams":
          str = `["URLSearchParams",${stringify_string(thing.toString())}]`;
          break;
        case "RegExp":
          const { source: source2, flags: flags2 } = thing;
          str = flags2 ? `["RegExp",${stringify_string(source2)},"${flags2}"]` : `["RegExp",${stringify_string(source2)}]`;
          break;
        case "Array":
          str = "[";
          for (let i = 0; i < thing.length; i += 1) {
            if (i > 0) str += ",";
            if (i in thing) {
              keys.push(`[${i}]`);
              str += flatten(thing[i]);
              keys.pop();
            } else {
              str += HOLE;
            }
          }
          str += "]";
          break;
        case "Set":
          str = '["Set"';
          for (const value2 of thing) {
            str += `,${flatten(value2)}`;
          }
          str += "]";
          break;
        case "Map":
          str = '["Map"';
          for (const [key2, value2] of thing) {
            keys.push(
              `.get(${is_primitive(key2) ? stringify_primitive(key2) : "..."})`
            );
            str += `,${flatten(key2)},${flatten(value2)}`;
            keys.pop();
          }
          str += "]";
          break;
        case "Int8Array":
        case "Uint8Array":
        case "Uint8ClampedArray":
        case "Int16Array":
        case "Uint16Array":
        case "Int32Array":
        case "Uint32Array":
        case "Float32Array":
        case "Float64Array":
        case "BigInt64Array":
        case "BigUint64Array": {
          const typedArray = thing;
          str = '["' + type + '",' + flatten(typedArray.buffer);
          const a = thing.byteOffset;
          const b = a + thing.byteLength;
          if (a > 0 || b !== typedArray.buffer.byteLength) {
            const m = +/(\d+)/.exec(type)[1] / 8;
            str += `,${a / m},${b / m}`;
          }
          str += "]";
          break;
        }
        case "ArrayBuffer": {
          const arraybuffer = thing;
          const base64 = encode64(arraybuffer);
          str = `["ArrayBuffer","${base64}"]`;
          break;
        }
        case "Temporal.Duration":
        case "Temporal.Instant":
        case "Temporal.PlainDate":
        case "Temporal.PlainTime":
        case "Temporal.PlainDateTime":
        case "Temporal.PlainMonthDay":
        case "Temporal.PlainYearMonth":
        case "Temporal.ZonedDateTime":
          str = `["${type}",${stringify_string(thing.toString())}]`;
          break;
        default:
          if (!is_plain_object(thing)) {
            throw new DevalueError(
              `Cannot stringify arbitrary non-POJOs`,
              keys,
              thing,
              value
            );
          }
          if (enumerable_symbols(thing).length > 0) {
            throw new DevalueError(
              `Cannot stringify POJOs with symbolic keys`,
              keys,
              thing,
              value
            );
          }
          if (Object.getPrototypeOf(thing) === null) {
            str = '["null"';
            for (const key2 in thing) {
              keys.push(stringify_key(key2));
              str += `,${stringify_string(key2)},${flatten(thing[key2])}`;
              keys.pop();
            }
            str += "]";
          } else {
            str = "{";
            let started = false;
            for (const key2 in thing) {
              if (started) str += ",";
              started = true;
              keys.push(stringify_key(key2));
              str += `${stringify_string(key2)}:${flatten(thing[key2])}`;
              keys.pop();
            }
            str += "}";
          }
      }
    }
    stringified[index22] = str;
    return index22;
  }
  const index3 = flatten(value);
  if (index3 < 0) return `${index3}`;
  return `[${stringified.join(",")}]`;
}
function stringify_primitive(thing) {
  const type = typeof thing;
  if (type === "string") return stringify_string(thing);
  if (thing instanceof String) return stringify_string(thing.toString());
  if (thing === void 0) return UNDEFINED.toString();
  if (thing === 0 && 1 / thing < 0) return NEGATIVE_ZERO.toString();
  if (type === "bigint") return `["BigInt","${thing}"]`;
  return String(thing);
}
function set_nested_value(object, path_string, value) {
  if (path_string.startsWith("n:")) {
    path_string = path_string.slice(2);
    value = value === "" ? void 0 : parseFloat(value);
  } else if (path_string.startsWith("b:")) {
    path_string = path_string.slice(2);
    value = value === "on";
  }
  deep_set(object, split_path(path_string), value);
}
function convert_formdata(data) {
  const result = {};
  for (let key2 of data.keys()) {
    const is_array2 = key2.endsWith("[]");
    let values = data.getAll(key2);
    if (is_array2) key2 = key2.slice(0, -2);
    if (values.length > 1 && !is_array2) {
      throw new Error(`Form cannot contain duplicated keys \u2014 "${key2}" has ${values.length} values`);
    }
    values = values.filter(
      (entry) => typeof entry === "string" || entry.name !== "" || entry.size > 0
    );
    if (key2.startsWith("n:")) {
      key2 = key2.slice(2);
      values = values.map((v) => v === "" ? void 0 : parseFloat(
        /** @type {string} */
        v
      ));
    } else if (key2.startsWith("b:")) {
      key2 = key2.slice(2);
      values = values.map((v) => v === "on");
    }
    set_nested_value(result, key2, is_array2 ? values : values[0]);
  }
  return result;
}
var BINARY_FORM_CONTENT_TYPE = "application/x-sveltekit-formdata";
var BINARY_FORM_VERSION = 0;
var HEADER_BYTES = 1 + 4 + 2;
async function deserialize_binary_form(request) {
  if (request.headers.get("content-type") !== BINARY_FORM_CONTENT_TYPE) {
    const form_data = await request.formData();
    return { data: convert_formdata(form_data), meta: {}, form_data };
  }
  if (!request.body) {
    throw deserialize_error("no body");
  }
  const content_length = parseInt(request.headers.get("content-length") ?? "");
  if (Number.isNaN(content_length)) {
    throw deserialize_error("invalid Content-Length header");
  }
  const reader = request.body.getReader();
  const chunks = [];
  function get_chunk(index3) {
    if (index3 in chunks) return chunks[index3];
    let i = chunks.length;
    while (i <= index3) {
      chunks[i] = reader.read().then((chunk) => chunk.value);
      i++;
    }
    return chunks[index3];
  }
  async function get_buffer(offset, length) {
    let start_chunk;
    let chunk_start = 0;
    let chunk_index;
    for (chunk_index = 0; ; chunk_index++) {
      const chunk = await get_chunk(chunk_index);
      if (!chunk) return null;
      const chunk_end = chunk_start + chunk.byteLength;
      if (offset >= chunk_start && offset < chunk_end) {
        start_chunk = chunk;
        break;
      }
      chunk_start = chunk_end;
    }
    if (offset + length <= chunk_start + start_chunk.byteLength) {
      return start_chunk.subarray(offset - chunk_start, offset + length - chunk_start);
    }
    const chunks2 = [start_chunk.subarray(offset - chunk_start)];
    let cursor = start_chunk.byteLength - offset + chunk_start;
    while (cursor < length) {
      chunk_index++;
      let chunk = await get_chunk(chunk_index);
      if (!chunk) return null;
      if (chunk.byteLength > length - cursor) {
        chunk = chunk.subarray(0, length - cursor);
      }
      chunks2.push(chunk);
      cursor += chunk.byteLength;
    }
    const buffer = new Uint8Array(length);
    cursor = 0;
    for (const chunk of chunks2) {
      buffer.set(chunk, cursor);
      cursor += chunk.byteLength;
    }
    return buffer;
  }
  const header = await get_buffer(0, HEADER_BYTES);
  if (!header) throw deserialize_error("too short");
  if (header[0] !== BINARY_FORM_VERSION) {
    throw deserialize_error(`got version ${header[0]}, expected version ${BINARY_FORM_VERSION}`);
  }
  const header_view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  const data_length = header_view.getUint32(1, true);
  if (HEADER_BYTES + data_length > content_length) {
    throw deserialize_error("data overflow");
  }
  const file_offsets_length = header_view.getUint16(5, true);
  if (HEADER_BYTES + data_length + file_offsets_length > content_length) {
    throw deserialize_error("file offset table overflow");
  }
  const data_buffer = await get_buffer(HEADER_BYTES, data_length);
  if (!data_buffer) throw deserialize_error("data too short");
  let file_offsets;
  let files_start_offset;
  if (file_offsets_length > 0) {
    const file_offsets_buffer = await get_buffer(HEADER_BYTES + data_length, file_offsets_length);
    if (!file_offsets_buffer) throw deserialize_error("file offset table too short");
    file_offsets = /** @type {Array<number>} */
    JSON.parse(text_decoder2.decode(file_offsets_buffer));
    files_start_offset = HEADER_BYTES + data_length + file_offsets_length;
  }
  const [data, meta] = parse(text_decoder2.decode(data_buffer), {
    File: ([name, type, size, last_modified, index3]) => {
      if (files_start_offset + file_offsets[index3] + size > content_length) {
        throw deserialize_error("file data overflow");
      }
      return new Proxy(
        new LazyFile(
          name,
          type,
          size,
          last_modified,
          get_chunk,
          files_start_offset + file_offsets[index3]
        ),
        {
          getPrototypeOf() {
            return File.prototype;
          }
        }
      );
    }
  });
  void (async () => {
    let has_more = true;
    while (has_more) {
      const chunk = await get_chunk(chunks.length);
      has_more = !!chunk;
    }
  })();
  return { data, meta, form_data: null };
}
function deserialize_error(message) {
  return new SvelteKitError(400, "Bad Request", `Could not deserialize binary form: ${message}`);
}
var LazyFile = class _LazyFile {
  /** @type {(index: number) => Promise<Uint8Array<ArrayBuffer> | undefined>} */
  #get_chunk;
  /** @type {number} */
  #offset;
  /**
   * @param {string} name
   * @param {string} type
   * @param {number} size
   * @param {number} last_modified
   * @param {(index: number) => Promise<Uint8Array<ArrayBuffer> | undefined>} get_chunk
   * @param {number} offset
   */
  constructor(name, type, size, last_modified, get_chunk, offset) {
    this.name = name;
    this.type = type;
    this.size = size;
    this.lastModified = last_modified;
    this.webkitRelativePath = "";
    this.#get_chunk = get_chunk;
    this.#offset = offset;
    this.arrayBuffer = this.arrayBuffer.bind(this);
    this.bytes = this.bytes.bind(this);
    this.slice = this.slice.bind(this);
    this.stream = this.stream.bind(this);
    this.text = this.text.bind(this);
  }
  /** @type {ArrayBuffer | undefined} */
  #buffer;
  async arrayBuffer() {
    this.#buffer ??= await new Response(this.stream()).arrayBuffer();
    return this.#buffer;
  }
  async bytes() {
    return new Uint8Array(await this.arrayBuffer());
  }
  /**
   * @param {number=} start
   * @param {number=} end
   * @param {string=} contentType
   */
  slice(start = 0, end = this.size, contentType = this.type) {
    if (start < 0) {
      start = Math.max(this.size + start, 0);
    } else {
      start = Math.min(start, this.size);
    }
    if (end < 0) {
      end = Math.max(this.size + end, 0);
    } else {
      end = Math.min(end, this.size);
    }
    const size = Math.max(end - start, 0);
    const file = new _LazyFile(
      this.name,
      contentType,
      size,
      this.lastModified,
      this.#get_chunk,
      this.#offset + start
    );
    return file;
  }
  stream() {
    let cursor = 0;
    let chunk_index = 0;
    return new ReadableStream({
      start: async (controller2) => {
        let chunk_start = 0;
        let start_chunk = null;
        for (chunk_index = 0; ; chunk_index++) {
          const chunk = await this.#get_chunk(chunk_index);
          if (!chunk) return null;
          const chunk_end = chunk_start + chunk.byteLength;
          if (this.#offset >= chunk_start && this.#offset < chunk_end) {
            start_chunk = chunk;
            break;
          }
          chunk_start = chunk_end;
        }
        if (this.#offset + this.size <= chunk_start + start_chunk.byteLength) {
          controller2.enqueue(
            start_chunk.subarray(this.#offset - chunk_start, this.#offset + this.size - chunk_start)
          );
          controller2.close();
        } else {
          controller2.enqueue(start_chunk.subarray(this.#offset - chunk_start));
          cursor = start_chunk.byteLength - this.#offset + chunk_start;
        }
      },
      pull: async (controller2) => {
        chunk_index++;
        let chunk = await this.#get_chunk(chunk_index);
        if (!chunk) {
          controller2.error("incomplete file data");
          controller2.close();
          return;
        }
        if (chunk.byteLength > this.size - cursor) {
          chunk = chunk.subarray(0, this.size - cursor);
        }
        controller2.enqueue(chunk);
        cursor += chunk.byteLength;
        if (cursor >= this.size) {
          controller2.close();
        }
      }
    });
  }
  async text() {
    return text_decoder2.decode(await this.arrayBuffer());
  }
};
var path_regex = /^[a-zA-Z_$]\w*(\.[a-zA-Z_$]\w*|\[\d+\])*$/;
function split_path(path) {
  if (!path_regex.test(path)) {
    throw new Error(`Invalid path ${path}`);
  }
  return path.split(/\.|\[|\]/).filter(Boolean);
}
function check_prototype_pollution(key2) {
  if (key2 === "__proto__" || key2 === "constructor" || key2 === "prototype") {
    throw new Error(
      `Invalid key "${key2}"`
    );
  }
}
function deep_set(object, keys, value) {
  let current2 = object;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key2 = keys[i];
    check_prototype_pollution(key2);
    const is_array2 = /^\d+$/.test(keys[i + 1]);
    const exists = Object.hasOwn(current2, key2);
    const inner = current2[key2];
    if (exists && is_array2 !== Array.isArray(inner)) {
      throw new Error(`Invalid array key ${keys[i + 1]}`);
    }
    if (!exists) {
      current2[key2] = is_array2 ? [] : {};
    }
    current2 = current2[key2];
  }
  const final_key = keys[keys.length - 1];
  check_prototype_pollution(final_key);
  current2[final_key] = value;
}
function negotiate(accept, types) {
  const parts = [];
  accept.split(",").forEach((str, i) => {
    const match = /([^/ \t]+)\/([^; \t]+)[ \t]*(?:;[ \t]*q=([0-9.]+))?/.exec(str);
    if (match) {
      const [, type, subtype, q = "1"] = match;
      parts.push({ type, subtype, q: +q, i });
    }
  });
  parts.sort((a, b) => {
    if (a.q !== b.q) {
      return b.q - a.q;
    }
    if (a.subtype === "*" !== (b.subtype === "*")) {
      return a.subtype === "*" ? 1 : -1;
    }
    if (a.type === "*" !== (b.type === "*")) {
      return a.type === "*" ? 1 : -1;
    }
    return a.i - b.i;
  });
  let accepted;
  let min_priority = Infinity;
  for (const mimetype of types) {
    const [type, subtype] = mimetype.split("/");
    const priority = parts.findIndex(
      (part) => (part.type === type || part.type === "*") && (part.subtype === subtype || part.subtype === "*")
    );
    if (priority !== -1 && priority < min_priority) {
      accepted = mimetype;
      min_priority = priority;
    }
  }
  return accepted;
}
function is_content_type(request, ...types) {
  const type = request.headers.get("content-type")?.split(";", 1)[0].trim() ?? "";
  return types.includes(type.toLowerCase());
}
function is_form_content_type(request) {
  return is_content_type(
    request,
    "application/x-www-form-urlencoded",
    "multipart/form-data",
    "text/plain",
    BINARY_FORM_CONTENT_TYPE
  );
}
function coalesce_to_error(err) {
  return err instanceof Error || err && /** @type {any} */
  err.name && /** @type {any} */
  err.message ? (
    /** @type {Error} */
    err
  ) : new Error(JSON.stringify(err));
}
function normalize_error(error2) {
  return (
    /** @type {import('../exports/internal/index.js').Redirect | HttpError | SvelteKitError | Error} */
    error2
  );
}
function get_status(error2) {
  return error2 instanceof HttpError || error2 instanceof SvelteKitError ? error2.status : 500;
}
function get_message(error2) {
  return error2 instanceof SvelteKitError ? error2.text : "Internal Error";
}
var escape_html_attr_dict = {
  "&": "&amp;",
  '"': "&quot;"
  // Svelte also escapes < because the escape function could be called inside a `noscript` there
  // https://github.com/sveltejs/svelte/security/advisories/GHSA-8266-84wp-wv5c
  // However, that doesn't apply in SvelteKit
};
var escape_html_dict = {
  "&": "&amp;",
  "<": "&lt;"
};
var surrogates = (
  // high surrogate without paired low surrogate
  "[\\ud800-\\udbff](?![\\udc00-\\udfff])|[\\ud800-\\udbff][\\udc00-\\udfff]|[\\udc00-\\udfff]"
);
var escape_html_attr_regex = new RegExp(
  `[${Object.keys(escape_html_attr_dict).join("")}]|` + surrogates,
  "g"
);
var escape_html_regex = new RegExp(
  `[${Object.keys(escape_html_dict).join("")}]|` + surrogates,
  "g"
);
function escape_html(str, is_attr) {
  const dict = is_attr ? escape_html_attr_dict : escape_html_dict;
  const escaped_str = str.replace(is_attr ? escape_html_attr_regex : escape_html_regex, (match) => {
    if (match.length === 2) {
      return match;
    }
    return dict[match] ?? `&#${match.charCodeAt(0)};`;
  });
  return escaped_str;
}
function method_not_allowed(mod, method) {
  return text(`${method} method not allowed`, {
    status: 405,
    headers: {
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
      // "The server must generate an Allow header field in a 405 status code response"
      allow: allowed_methods(mod).join(", ")
    }
  });
}
function allowed_methods(mod) {
  const allowed = ENDPOINT_METHODS.filter((method) => method in mod);
  if ("GET" in mod && !("HEAD" in mod)) {
    allowed.push("HEAD");
  }
  return allowed;
}
function get_global_name(options2) {
  return `__sveltekit_${options2.version_hash}`;
}
function static_error_page(options2, status, message) {
  let page2 = options2.templates.error({ status, message: escape_html(message) });
  return text(page2, {
    headers: { "content-type": "text/html; charset=utf-8" },
    status
  });
}
async function handle_fatal_error(event, state2, options2, error2) {
  error2 = error2 instanceof HttpError ? error2 : coalesce_to_error(error2);
  const status = get_status(error2);
  const body2 = await handle_error_and_jsonify(event, state2, options2, error2);
  const type = negotiate(event.request.headers.get("accept") || "text/html", [
    "application/json",
    "text/html"
  ]);
  if (event.isDataRequest || type === "application/json") {
    return json(body2, {
      status
    });
  }
  return static_error_page(options2, status, body2.message);
}
async function handle_error_and_jsonify(event, state2, options2, error2) {
  if (error2 instanceof HttpError) {
    return { message: "Unknown Error", ...error2.body };
  }
  const status = get_status(error2);
  const message = get_message(error2);
  return await with_request_store(
    { event, state: state2 },
    () => options2.hooks.handleError({ error: error2, event, status, message })
  ) ?? { message };
}
function redirect_response(status, location) {
  const response = new Response(void 0, {
    status,
    headers: { location }
  });
  return response;
}
function clarify_devalue_error(event, error2) {
  if (error2.path) {
    return `Data returned from \`load\` while rendering ${event.route.id} is not serializable: ${error2.message} (${error2.path}). If you need to serialize/deserialize custom types, use transport hooks: https://svelte.dev/docs/kit/hooks#Universal-hooks-transport.`;
  }
  if (error2.path === "") {
    return `Data returned from \`load\` while rendering ${event.route.id} is not a plain object`;
  }
  return error2.message;
}
function serialize_uses(node) {
  const uses = {};
  if (node.uses && node.uses.dependencies.size > 0) {
    uses.dependencies = Array.from(node.uses.dependencies);
  }
  if (node.uses && node.uses.search_params.size > 0) {
    uses.search_params = Array.from(node.uses.search_params);
  }
  if (node.uses && node.uses.params.size > 0) {
    uses.params = Array.from(node.uses.params);
  }
  if (node.uses?.parent) uses.parent = 1;
  if (node.uses?.route) uses.route = 1;
  if (node.uses?.url) uses.url = 1;
  return uses;
}
function has_prerendered_path(manifest2, pathname) {
  return manifest2._.prerendered_routes.has(pathname) || pathname.at(-1) === "/" && manifest2._.prerendered_routes.has(pathname.slice(0, -1));
}
function format_server_error(status, error2, event) {
  const formatted_text = `
\x1B[1;31m[${status}] ${event.request.method} ${event.url.pathname}\x1B[0m`;
  if (status === 404) {
    return formatted_text;
  }
  return `${formatted_text}
${error2.stack}`;
}
function get_node_type(node_id) {
  const parts = node_id?.split("/");
  const filename = parts?.at(-1);
  if (!filename) return "unknown";
  const dot_parts = filename.split(".");
  return dot_parts.slice(0, -1).join(".");
}
var INVALIDATED_PARAM = "x-sveltekit-invalidated";
var TRAILING_SLASH_PARAM = "x-sveltekit-trailing-slash";
function stringify(data, transport) {
  const encoders = Object.fromEntries(Object.entries(transport).map(([k, v]) => [k, v.encode]));
  return stringify$1(data, encoders);
}
function parse_remote_arg(string, transport) {
  if (!string) return void 0;
  const json_string = text_decoder2.decode(
    // no need to add back `=` characters, atob can handle it
    base64_decode(string.replaceAll("-", "+").replaceAll("_", "/"))
  );
  const decoders = Object.fromEntries(Object.entries(transport).map(([k, v]) => [k, v.decode]));
  return parse(json_string, decoders);
}
function create_remote_key(id, payload) {
  return id + "/" + payload;
}

// .svelte-kit/output/server/index.js
init_chunks();
init_exports();
init_utils();
init_index2();
init_shared_server();

// .svelte-kit/output/server/chunks/internal.js
init_context();
init_runtime();
init_chunks();
init_shared_server();
function hydration_mismatch(location) {
  {
    console.warn(`https://svelte.dev/e/hydration_mismatch`);
  }
}
function svelte_boundary_reset_noop() {
  {
    console.warn(`https://svelte.dev/e/svelte_boundary_reset_noop`);
  }
}
var hydrating = false;
function set_hydrating(value) {
  hydrating = value;
}
var hydrate_node;
function set_hydrate_node(node) {
  if (node === null) {
    hydration_mismatch();
    throw HYDRATION_ERROR;
  }
  return hydrate_node = node;
}
function hydrate_next() {
  return set_hydrate_node(get_next_sibling(hydrate_node));
}
function next(count = 1) {
  if (hydrating) {
    var i = count;
    var node = hydrate_node;
    while (i--) {
      node = /** @type {TemplateNode} */
      get_next_sibling(node);
    }
    hydrate_node = node;
  }
}
function skip_nodes(remove = true) {
  var depth = 0;
  var node = hydrate_node;
  while (true) {
    if (node.nodeType === COMMENT_NODE) {
      var data = (
        /** @type {Comment} */
        node.data
      );
      if (data === HYDRATION_END) {
        if (depth === 0) return node;
        depth -= 1;
      } else if (data === HYDRATION_START || data === HYDRATION_START_ELSE) {
        depth += 1;
      }
    }
    var next2 = (
      /** @type {TemplateNode} */
      get_next_sibling(node)
    );
    if (remove) node.remove();
    node = next2;
  }
}
function createSubscriber(start) {
  let subscribers = 0;
  let version = source(0);
  let stop;
  return () => {
    if (effect_tracking()) {
      get(version);
      render_effect(() => {
        if (subscribers === 0) {
          stop = untrack(() => start(() => increment(version)));
        }
        subscribers += 1;
        return () => {
          queue_micro_task(() => {
            subscribers -= 1;
            if (subscribers === 0) {
              stop?.();
              stop = void 0;
              increment(version);
            }
          });
        };
      });
    }
  };
}
var flags = EFFECT_TRANSPARENT | EFFECT_PRESERVED | BOUNDARY_EFFECT;
function boundary(node, props, children) {
  new Boundary(node, props, children);
}
var Boundary = class {
  /** @type {Boundary | null} */
  parent;
  is_pending = false;
  /** @type {TemplateNode} */
  #anchor;
  /** @type {TemplateNode | null} */
  #hydrate_open = hydrating ? hydrate_node : null;
  /** @type {BoundaryProps} */
  #props;
  /** @type {((anchor: Node) => void)} */
  #children;
  /** @type {Effect} */
  #effect;
  /** @type {Effect | null} */
  #main_effect = null;
  /** @type {Effect | null} */
  #pending_effect = null;
  /** @type {Effect | null} */
  #failed_effect = null;
  /** @type {DocumentFragment | null} */
  #offscreen_fragment = null;
  /** @type {TemplateNode | null} */
  #pending_anchor = null;
  #local_pending_count = 0;
  #pending_count = 0;
  #pending_count_update_queued = false;
  #is_creating_fallback = false;
  /** @type {Set<Effect>} */
  #dirty_effects = /* @__PURE__ */ new Set();
  /** @type {Set<Effect>} */
  #maybe_dirty_effects = /* @__PURE__ */ new Set();
  /**
   * A source containing the number of pending async deriveds/expressions.
   * Only created if `$effect.pending()` is used inside the boundary,
   * otherwise updating the source results in needless `Batch.ensure()`
   * calls followed by no-op flushes
   * @type {Source<number> | null}
   */
  #effect_pending = null;
  #effect_pending_subscriber = createSubscriber(() => {
    this.#effect_pending = source(this.#local_pending_count);
    return () => {
      this.#effect_pending = null;
    };
  });
  /**
   * @param {TemplateNode} node
   * @param {BoundaryProps} props
   * @param {((anchor: Node) => void)} children
   */
  constructor(node, props, children) {
    this.#anchor = node;
    this.#props = props;
    this.#children = children;
    this.parent = /** @type {Effect} */
    active_effect.b;
    this.is_pending = !!this.#props.pending;
    this.#effect = block(() => {
      active_effect.b = this;
      if (hydrating) {
        const comment = this.#hydrate_open;
        hydrate_next();
        const server_rendered_pending = (
          /** @type {Comment} */
          comment.nodeType === COMMENT_NODE && /** @type {Comment} */
          comment.data === HYDRATION_START_ELSE
        );
        if (server_rendered_pending) {
          this.#hydrate_pending_content();
        } else {
          this.#hydrate_resolved_content();
          if (this.#pending_count === 0) {
            this.is_pending = false;
          }
        }
      } else {
        var anchor = this.#get_anchor();
        try {
          this.#main_effect = branch(() => children(anchor));
        } catch (error2) {
          this.error(error2);
        }
        if (this.#pending_count > 0) {
          this.#show_pending_snippet();
        } else {
          this.is_pending = false;
        }
      }
      return () => {
        this.#pending_anchor?.remove();
      };
    }, flags);
    if (hydrating) {
      this.#anchor = hydrate_node;
    }
  }
  #hydrate_resolved_content() {
    try {
      this.#main_effect = branch(() => this.#children(this.#anchor));
    } catch (error2) {
      this.error(error2);
    }
  }
  #hydrate_pending_content() {
    const pending = this.#props.pending;
    if (!pending) return;
    this.#pending_effect = branch(() => pending(this.#anchor));
    queue_micro_task(() => {
      var anchor = this.#get_anchor();
      this.#main_effect = this.#run(() => {
        Batch.ensure();
        return branch(() => this.#children(anchor));
      });
      if (this.#pending_count > 0) {
        this.#show_pending_snippet();
      } else {
        pause_effect(
          /** @type {Effect} */
          this.#pending_effect,
          () => {
            this.#pending_effect = null;
          }
        );
        this.is_pending = false;
      }
    });
  }
  #get_anchor() {
    var anchor = this.#anchor;
    if (this.is_pending) {
      this.#pending_anchor = create_text();
      this.#anchor.before(this.#pending_anchor);
      anchor = this.#pending_anchor;
    }
    return anchor;
  }
  /**
   * Defer an effect inside a pending boundary until the boundary resolves
   * @param {Effect} effect
   */
  defer_effect(effect) {
    defer_effect(effect, this.#dirty_effects, this.#maybe_dirty_effects);
  }
  /**
   * Returns `false` if the effect exists inside a boundary whose pending snippet is shown
   * @returns {boolean}
   */
  is_rendered() {
    return !this.is_pending && (!this.parent || this.parent.is_rendered());
  }
  has_pending_snippet() {
    return !!this.#props.pending;
  }
  /**
   * @param {() => Effect | null} fn
   */
  #run(fn) {
    var previous_effect = active_effect;
    var previous_reaction = active_reaction;
    var previous_ctx = component_context;
    set_active_effect(this.#effect);
    set_active_reaction(this.#effect);
    set_component_context(this.#effect.ctx);
    try {
      return fn();
    } catch (e3) {
      handle_error(e3);
      return null;
    } finally {
      set_active_effect(previous_effect);
      set_active_reaction(previous_reaction);
      set_component_context(previous_ctx);
    }
  }
  #show_pending_snippet() {
    const pending = (
      /** @type {(anchor: Node) => void} */
      this.#props.pending
    );
    if (this.#main_effect !== null) {
      this.#offscreen_fragment = document.createDocumentFragment();
      this.#offscreen_fragment.append(
        /** @type {TemplateNode} */
        this.#pending_anchor
      );
      move_effect(this.#main_effect, this.#offscreen_fragment);
    }
    if (this.#pending_effect === null) {
      this.#pending_effect = branch(() => pending(this.#anchor));
    }
  }
  /**
   * Updates the pending count associated with the currently visible pending snippet,
   * if any, such that we can replace the snippet with content once work is done
   * @param {1 | -1} d
   */
  #update_pending_count(d) {
    if (!this.has_pending_snippet()) {
      if (this.parent) {
        this.parent.#update_pending_count(d);
      }
      return;
    }
    this.#pending_count += d;
    if (this.#pending_count === 0) {
      this.is_pending = false;
      for (const e3 of this.#dirty_effects) {
        set_signal_status(e3, DIRTY);
        schedule_effect(e3);
      }
      for (const e3 of this.#maybe_dirty_effects) {
        set_signal_status(e3, MAYBE_DIRTY);
        schedule_effect(e3);
      }
      this.#dirty_effects.clear();
      this.#maybe_dirty_effects.clear();
      if (this.#pending_effect) {
        pause_effect(this.#pending_effect, () => {
          this.#pending_effect = null;
        });
      }
      if (this.#offscreen_fragment) {
        this.#anchor.before(this.#offscreen_fragment);
        this.#offscreen_fragment = null;
      }
    }
  }
  /**
   * Update the source that powers `$effect.pending()` inside this boundary,
   * and controls when the current `pending` snippet (if any) is removed.
   * Do not call from inside the class
   * @param {1 | -1} d
   */
  update_pending_count(d) {
    this.#update_pending_count(d);
    this.#local_pending_count += d;
    if (!this.#effect_pending || this.#pending_count_update_queued) return;
    this.#pending_count_update_queued = true;
    queue_micro_task(() => {
      this.#pending_count_update_queued = false;
      if (this.#effect_pending) {
        internal_set(this.#effect_pending, this.#local_pending_count);
      }
    });
  }
  get_effect_pending() {
    this.#effect_pending_subscriber();
    return get(
      /** @type {Source<number>} */
      this.#effect_pending
    );
  }
  /** @param {unknown} error */
  error(error2) {
    var onerror = this.#props.onerror;
    let failed = this.#props.failed;
    if (this.#is_creating_fallback || !onerror && !failed) {
      throw error2;
    }
    if (this.#main_effect) {
      destroy_effect(this.#main_effect);
      this.#main_effect = null;
    }
    if (this.#pending_effect) {
      destroy_effect(this.#pending_effect);
      this.#pending_effect = null;
    }
    if (this.#failed_effect) {
      destroy_effect(this.#failed_effect);
      this.#failed_effect = null;
    }
    if (hydrating) {
      set_hydrate_node(
        /** @type {TemplateNode} */
        this.#hydrate_open
      );
      next();
      set_hydrate_node(skip_nodes());
    }
    var did_reset = false;
    var calling_on_error = false;
    const reset2 = () => {
      if (did_reset) {
        svelte_boundary_reset_noop();
        return;
      }
      did_reset = true;
      if (calling_on_error) {
        svelte_boundary_reset_onerror();
      }
      Batch.ensure();
      this.#local_pending_count = 0;
      if (this.#failed_effect !== null) {
        pause_effect(this.#failed_effect, () => {
          this.#failed_effect = null;
        });
      }
      this.is_pending = this.has_pending_snippet();
      this.#main_effect = this.#run(() => {
        this.#is_creating_fallback = false;
        return branch(() => this.#children(this.#anchor));
      });
      if (this.#pending_count > 0) {
        this.#show_pending_snippet();
      } else {
        this.is_pending = false;
      }
    };
    queue_micro_task(() => {
      try {
        calling_on_error = true;
        onerror?.(error2, reset2);
        calling_on_error = false;
      } catch (error22) {
        invoke_error_boundary(error22, this.#effect && this.#effect.parent);
      }
      if (failed) {
        this.#failed_effect = this.#run(() => {
          Batch.ensure();
          this.#is_creating_fallback = true;
          try {
            return branch(() => {
              failed(
                this.#anchor,
                () => error2,
                () => reset2
              );
            });
          } catch (error22) {
            invoke_error_boundary(
              error22,
              /** @type {Effect} */
              this.#effect.parent
            );
            return null;
          } finally {
            this.#is_creating_fallback = false;
          }
        });
      }
    });
  }
};
var all_registered_events = /* @__PURE__ */ new Set();
var root_event_handles = /* @__PURE__ */ new Set();
var last_propagated_event = null;
function handle_event_propagation(event) {
  var handler_element = this;
  var owner_document = (
    /** @type {Node} */
    handler_element.ownerDocument
  );
  var event_name = event.type;
  var path = event.composedPath?.() || [];
  var current_target = (
    /** @type {null | Element} */
    path[0] || event.target
  );
  last_propagated_event = event;
  var path_idx = 0;
  var handled_at = last_propagated_event === event && event.__root;
  if (handled_at) {
    var at_idx = path.indexOf(handled_at);
    if (at_idx !== -1 && (handler_element === document || handler_element === /** @type {any} */
    window)) {
      event.__root = handler_element;
      return;
    }
    var handler_idx = path.indexOf(handler_element);
    if (handler_idx === -1) {
      return;
    }
    if (at_idx <= handler_idx) {
      path_idx = at_idx;
    }
  }
  current_target = /** @type {Element} */
  path[path_idx] || event.target;
  if (current_target === handler_element) return;
  define_property(event, "currentTarget", {
    configurable: true,
    get() {
      return current_target || owner_document;
    }
  });
  var previous_reaction = active_reaction;
  var previous_effect = active_effect;
  set_active_reaction(null);
  set_active_effect(null);
  try {
    var throw_error;
    var other_errors = [];
    while (current_target !== null) {
      var parent_element = current_target.assignedSlot || current_target.parentNode || /** @type {any} */
      current_target.host || null;
      try {
        var delegated = current_target["__" + event_name];
        if (delegated != null && (!/** @type {any} */
        current_target.disabled || // DOM could've been updated already by the time this is reached, so we check this as well
        // -> the target could not have been disabled because it emits the event in the first place
        event.target === current_target)) {
          delegated.call(current_target, event);
        }
      } catch (error2) {
        if (throw_error) {
          other_errors.push(error2);
        } else {
          throw_error = error2;
        }
      }
      if (event.cancelBubble || parent_element === handler_element || parent_element === null) {
        break;
      }
      current_target = parent_element;
    }
    if (throw_error) {
      for (let error2 of other_errors) {
        queueMicrotask(() => {
          throw error2;
        });
      }
      throw throw_error;
    }
  } finally {
    event.__root = handler_element;
    delete event.currentTarget;
    set_active_reaction(previous_reaction);
    set_active_effect(previous_effect);
  }
}
function assign_nodes(start, end) {
  var effect = (
    /** @type {Effect} */
    active_effect
  );
  if (effect.nodes === null) {
    effect.nodes = { start, end, a: null, t: null };
  }
}
function mount(component3, options2) {
  return _mount(component3, options2);
}
function hydrate(component3, options2) {
  init_operations();
  options2.intro = options2.intro ?? false;
  const target = options2.target;
  const was_hydrating = hydrating;
  const previous_hydrate_node = hydrate_node;
  try {
    var anchor = get_first_child(target);
    while (anchor && (anchor.nodeType !== COMMENT_NODE || /** @type {Comment} */
    anchor.data !== HYDRATION_START)) {
      anchor = get_next_sibling(anchor);
    }
    if (!anchor) {
      throw HYDRATION_ERROR;
    }
    set_hydrating(true);
    set_hydrate_node(
      /** @type {Comment} */
      anchor
    );
    const instance = _mount(component3, { ...options2, anchor });
    set_hydrating(false);
    return (
      /**  @type {Exports} */
      instance
    );
  } catch (error2) {
    if (error2 instanceof Error && error2.message.split("\n").some((line) => line.startsWith("https://svelte.dev/e/"))) {
      throw error2;
    }
    if (error2 !== HYDRATION_ERROR) {
      console.warn("Failed to hydrate: ", error2);
    }
    if (options2.recover === false) {
      hydration_failed();
    }
    init_operations();
    clear_text_content(target);
    set_hydrating(false);
    return mount(component3, options2);
  } finally {
    set_hydrating(was_hydrating);
    set_hydrate_node(previous_hydrate_node);
  }
}
var document_listeners = /* @__PURE__ */ new Map();
function _mount(Component, { target, anchor, props = {}, events, context: context2, intro = true }) {
  init_operations();
  var registered_events = /* @__PURE__ */ new Set();
  var event_handle = (events2) => {
    for (var i = 0; i < events2.length; i++) {
      var event_name = events2[i];
      if (registered_events.has(event_name)) continue;
      registered_events.add(event_name);
      var passive = is_passive_event(event_name);
      target.addEventListener(event_name, handle_event_propagation, { passive });
      var n2 = document_listeners.get(event_name);
      if (n2 === void 0) {
        document.addEventListener(event_name, handle_event_propagation, { passive });
        document_listeners.set(event_name, 1);
      } else {
        document_listeners.set(event_name, n2 + 1);
      }
    }
  };
  event_handle(array_from(all_registered_events));
  root_event_handles.add(event_handle);
  var component3 = void 0;
  var unmount2 = component_root(() => {
    var anchor_node = anchor ?? target.appendChild(create_text());
    boundary(
      /** @type {TemplateNode} */
      anchor_node,
      {
        pending: () => {
        }
      },
      (anchor_node2) => {
        if (context2) {
          push2({});
          var ctx = (
            /** @type {ComponentContext} */
            component_context
          );
          ctx.c = context2;
        }
        if (events) {
          props.$$events = events;
        }
        if (hydrating) {
          assign_nodes(
            /** @type {TemplateNode} */
            anchor_node2,
            null
          );
        }
        component3 = Component(anchor_node2, props) || {};
        if (hydrating) {
          active_effect.nodes.end = hydrate_node;
          if (hydrate_node === null || hydrate_node.nodeType !== COMMENT_NODE || /** @type {Comment} */
          hydrate_node.data !== HYDRATION_END) {
            hydration_mismatch();
            throw HYDRATION_ERROR;
          }
        }
        if (context2) {
          pop2();
        }
      }
    );
    return () => {
      for (var event_name of registered_events) {
        target.removeEventListener(event_name, handle_event_propagation);
        var n2 = (
          /** @type {number} */
          document_listeners.get(event_name)
        );
        if (--n2 === 0) {
          document.removeEventListener(event_name, handle_event_propagation);
          document_listeners.delete(event_name);
        } else {
          document_listeners.set(event_name, n2);
        }
      }
      root_event_handles.delete(event_handle);
      if (anchor_node !== anchor) {
        anchor_node.parentNode?.removeChild(anchor_node);
      }
    };
  });
  mounted_components.set(component3, unmount2);
  return component3;
}
var mounted_components = /* @__PURE__ */ new WeakMap();
function unmount(component3, options2) {
  const fn = mounted_components.get(component3);
  if (fn) {
    mounted_components.delete(component3);
    return fn(options2);
  }
  return Promise.resolve();
}
function asClassComponent$1(component3) {
  return class extends Svelte4Component {
    /** @param {any} options */
    constructor(options2) {
      super({
        component: component3,
        ...options2
      });
    }
  };
}
var Svelte4Component = class {
  /** @type {any} */
  #events;
  /** @type {Record<string, any>} */
  #instance;
  /**
   * @param {ComponentConstructorOptions & {
   *  component: any;
   * }} options
   */
  constructor(options2) {
    var sources = /* @__PURE__ */ new Map();
    var add_source = (key2, value) => {
      var s3 = mutable_source(value, false, false);
      sources.set(key2, s3);
      return s3;
    };
    const props = new Proxy(
      { ...options2.props || {}, $$events: {} },
      {
        get(target, prop) {
          return get(sources.get(prop) ?? add_source(prop, Reflect.get(target, prop)));
        },
        has(target, prop) {
          if (prop === LEGACY_PROPS) return true;
          get(sources.get(prop) ?? add_source(prop, Reflect.get(target, prop)));
          return Reflect.has(target, prop);
        },
        set(target, prop, value) {
          set(sources.get(prop) ?? add_source(prop, value), value);
          return Reflect.set(target, prop, value);
        }
      }
    );
    this.#instance = (options2.hydrate ? hydrate : mount)(options2.component, {
      target: options2.target,
      anchor: options2.anchor,
      props,
      context: options2.context,
      intro: options2.intro ?? false,
      recover: options2.recover
    });
    if (!options2?.props?.$$host || options2.sync === false) {
      flushSync();
    }
    this.#events = props.$$events;
    for (const key2 of Object.keys(this.#instance)) {
      if (key2 === "$set" || key2 === "$destroy" || key2 === "$on") continue;
      define_property(this, key2, {
        get() {
          return this.#instance[key2];
        },
        /** @param {any} value */
        set(value) {
          this.#instance[key2] = value;
        },
        enumerable: true
      });
    }
    this.#instance.$set = /** @param {Record<string, any>} next */
    (next2) => {
      Object.assign(props, next2);
    };
    this.#instance.$destroy = () => {
      unmount(this.#instance);
    };
  }
  /** @param {Record<string, any>} props */
  $set(props) {
    this.#instance.$set(props);
  }
  /**
   * @param {string} event
   * @param {(...args: any[]) => any} callback
   * @returns {any}
   */
  $on(event, callback) {
    this.#events[event] = this.#events[event] || [];
    const cb = (...args) => callback.call(this, ...args);
    this.#events[event].push(cb);
    return () => {
      this.#events[event] = this.#events[event].filter(
        /** @param {any} fn */
        (fn) => fn !== cb
      );
    };
  }
  $destroy() {
    this.#instance.$destroy();
  }
};
var read_implementation = null;
function set_read_implementation(fn) {
  read_implementation = fn;
}
function asClassComponent(component3) {
  const component_constructor = asClassComponent$1(component3);
  const _render = (props, { context: context2, csp } = {}) => {
    const result = render(component3, { props, context: context2, csp });
    const munged = Object.defineProperties(
      /** @type {LegacyRenderResult & PromiseLike<LegacyRenderResult>} */
      {},
      {
        css: {
          value: { code: "", map: null }
        },
        head: {
          get: () => result.head
        },
        html: {
          get: () => result.body
        },
        then: {
          /**
           * this is not type-safe, but honestly it's the best I can do right now, and it's a straightforward function.
           *
           * @template TResult1
           * @template [TResult2=never]
           * @param { (value: LegacyRenderResult) => TResult1 } onfulfilled
           * @param { (reason: unknown) => TResult2 } onrejected
           */
          value: (onfulfilled, onrejected) => {
            {
              const user_result = onfulfilled({
                css: munged.css,
                head: munged.head,
                html: munged.html
              });
              return Promise.resolve(user_result);
            }
          }
        }
      }
    );
    return munged;
  };
  component_constructor.render = _render;
  return component_constructor;
}
function Root($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      stores: stores2,
      page: page2,
      constructors,
      components = [],
      form,
      data_0 = null,
      data_1 = null
    } = $$props;
    {
      setContext("__svelte__", stores2);
    }
    {
      stores2.page.set(page2);
    }
    const Pyramid_1 = constructors[1];
    if (constructors[1]) {
      $$renderer2.push("<!--[-->");
      const Pyramid_0 = constructors[0];
      $$renderer2.push(`<!---->`);
      Pyramid_0?.($$renderer2, {
        data: data_0,
        form,
        params: page2.params,
        children: ($$renderer3) => {
          $$renderer3.push(`<!---->`);
          Pyramid_1?.($$renderer3, { data: data_1, form, params: page2.params });
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      const Pyramid_0 = constructors[0];
      $$renderer2.push(`<!---->`);
      Pyramid_0?.($$renderer2, { data: data_0, form, params: page2.params });
      $$renderer2.push(`<!---->`);
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
var root = asClassComponent(Root);
var options = {
  app_template_contains_nonce: false,
  async: false,
  csp: { "mode": "auto", "directives": { "upgrade-insecure-requests": false, "block-all-mixed-content": false }, "reportOnly": { "upgrade-insecure-requests": false, "block-all-mixed-content": false } },
  csrf_check_origin: true,
  csrf_trusted_origins: [],
  embedded: false,
  env_public_prefix: "PUBLIC_",
  env_private_prefix: "",
  hash_routing: false,
  hooks: null,
  // added lazily, via `get_hooks`
  preload_strategy: "modulepreload",
  root,
  service_worker: false,
  service_worker_options: void 0,
  templates: {
    app: ({ head, body: body2, assets: assets2, nonce, env }) => '<!DOCTYPE html>\n<html lang="en">\n	<head>\n		<meta charset="utf-8" />\n		<link rel="icon" href="data:," />\n		<meta name="viewport" content="width=device-width, initial-scale=1" />\n		<script>\n			// Runtime env injection for adapter-static\n			window.ENV = {\n				PUBLIC_CLERK_PUBLISHABLE_KEY: "__PUBLIC_CLERK_PUBLISHABLE_KEY__",\n				PUBLIC_API_URL: "__PUBLIC_API_URL__"\n			};\n		<\/script>\n		' + head + `
	</head>
	<body data-sveltekit-preload-data="hover">
		<script>
			(function() {
				const saved = localStorage.getItem('theme');
				const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
				if (isDark) {
					document.documentElement.classList.add('dark');
				} else {
					document.documentElement.classList.remove('dark');
				}
			})();
		<\/script>
		<div style="display: contents">` + body2 + "</div>\n	</body>\n</html>\n",
    error: ({ status, message }) => '<!doctype html>\n<html lang="en">\n	<head>\n		<meta charset="utf-8" />\n		<title>' + message + `</title>

		<style>
			body {
				--bg: white;
				--fg: #222;
				--divider: #ccc;
				background: var(--bg);
				color: var(--fg);
				font-family:
					system-ui,
					-apple-system,
					BlinkMacSystemFont,
					'Segoe UI',
					Roboto,
					Oxygen,
					Ubuntu,
					Cantarell,
					'Open Sans',
					'Helvetica Neue',
					sans-serif;
				display: flex;
				align-items: center;
				justify-content: center;
				height: 100vh;
				margin: 0;
			}

			.error {
				display: flex;
				align-items: center;
				max-width: 32rem;
				margin: 0 1rem;
			}

			.status {
				font-weight: 200;
				font-size: 3rem;
				line-height: 1;
				position: relative;
				top: -0.05rem;
			}

			.message {
				border-left: 1px solid var(--divider);
				padding: 0 0 0 1rem;
				margin: 0 0 0 1rem;
				min-height: 2.5rem;
				display: flex;
				align-items: center;
			}

			.message h1 {
				font-weight: 400;
				font-size: 1em;
				margin: 0;
			}

			@media (prefers-color-scheme: dark) {
				body {
					--bg: #222;
					--fg: #ddd;
					--divider: #666;
				}
			}
		</style>
	</head>
	<body>
		<div class="error">
			<span class="status">` + status + '</span>\n			<div class="message">\n				<h1>' + message + "</h1>\n			</div>\n		</div>\n	</body>\n</html>\n"
  },
  version_hash: "1kvl86r"
};
async function get_hooks() {
  let handle;
  let handleFetch;
  let handleError;
  let handleValidationError;
  let init2;
  let reroute;
  let transport;
  return {
    handle,
    handleFetch,
    handleError,
    handleValidationError,
    init: init2,
    reroute,
    transport
  };
}

// .svelte-kit/output/server/index.js
function with_resolvers() {
  let resolve2;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve2 = res;
    reject = rej;
  });
  return { promise, resolve: resolve2, reject };
}
var NULL_BODY_STATUS = [101, 103, 204, 205, 304];
var IN_WEBCONTAINER2 = !!globalThis.process?.versions?.webcontainer;
async function render_endpoint(event, event_state, mod, state2) {
  const method = (
    /** @type {import('types').HttpMethod} */
    event.request.method
  );
  let handler = mod[method] || mod.fallback;
  if (method === "HEAD" && !mod.HEAD && mod.GET) {
    handler = mod.GET;
  }
  if (!handler) {
    return method_not_allowed(mod, method);
  }
  const prerender = mod.prerender ?? state2.prerender_default;
  if (prerender && (mod.POST || mod.PATCH || mod.PUT || mod.DELETE)) {
    throw new Error("Cannot prerender endpoints that have mutative methods");
  }
  if (state2.prerendering && !state2.prerendering.inside_reroute && !prerender) {
    if (state2.depth > 0) {
      throw new Error(`${event.route.id} is not prerenderable`);
    } else {
      return new Response(void 0, { status: 204 });
    }
  }
  event_state.is_endpoint_request = true;
  try {
    const response = await with_request_store(
      { event, state: event_state },
      () => handler(
        /** @type {import('@sveltejs/kit').RequestEvent<Record<string, any>>} */
        event
      )
    );
    if (!(response instanceof Response)) {
      throw new Error(
        `Invalid response from route ${event.url.pathname}: handler should return a Response object`
      );
    }
    if (state2.prerendering && (!state2.prerendering.inside_reroute || prerender)) {
      const cloned = new Response(response.clone().body, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers)
      });
      cloned.headers.set("x-sveltekit-prerender", String(prerender));
      if (state2.prerendering.inside_reroute && prerender) {
        cloned.headers.set(
          "x-sveltekit-routeid",
          encodeURI(
            /** @type {string} */
            event.route.id
          )
        );
        state2.prerendering.dependencies.set(event.url.pathname, { response: cloned, body: null });
      } else {
        return cloned;
      }
    }
    return response;
  } catch (e3) {
    if (e3 instanceof Redirect) {
      return new Response(void 0, {
        status: e3.status,
        headers: { location: e3.location }
      });
    }
    throw e3;
  }
}
function is_endpoint_request(event) {
  const { method, headers: headers2 } = event.request;
  if (ENDPOINT_METHODS.includes(method) && !PAGE_METHODS.includes(method)) {
    return true;
  }
  if (method === "POST" && headers2.get("x-sveltekit-action") === "true") return false;
  const accept = event.request.headers.get("accept") ?? "*/*";
  return negotiate(accept, ["*", "text/html"]) !== "text/html";
}
function compact(arr) {
  return arr.filter(
    /** @returns {val is NonNullable<T>} */
    (val) => val != null
  );
}
var DATA_SUFFIX = "/__data.json";
var HTML_DATA_SUFFIX = ".html__data.json";
function has_data_suffix2(pathname) {
  return pathname.endsWith(DATA_SUFFIX) || pathname.endsWith(HTML_DATA_SUFFIX);
}
function add_data_suffix2(pathname) {
  if (pathname.endsWith(".html")) return pathname.replace(/\.html$/, HTML_DATA_SUFFIX);
  return pathname.replace(/\/$/, "") + DATA_SUFFIX;
}
function strip_data_suffix2(pathname) {
  if (pathname.endsWith(HTML_DATA_SUFFIX)) {
    return pathname.slice(0, -HTML_DATA_SUFFIX.length) + ".html";
  }
  return pathname.slice(0, -DATA_SUFFIX.length);
}
var ROUTE_SUFFIX = "/__route.js";
function has_resolution_suffix2(pathname) {
  return pathname.endsWith(ROUTE_SUFFIX);
}
function add_resolution_suffix2(pathname) {
  return pathname.replace(/\/$/, "") + ROUTE_SUFFIX;
}
function strip_resolution_suffix2(pathname) {
  return pathname.slice(0, -ROUTE_SUFFIX.length);
}
var noop_span = {
  spanContext() {
    return noop_span_context;
  },
  setAttribute() {
    return this;
  },
  setAttributes() {
    return this;
  },
  addEvent() {
    return this;
  },
  setStatus() {
    return this;
  },
  updateName() {
    return this;
  },
  end() {
    return this;
  },
  isRecording() {
    return false;
  },
  recordException() {
    return this;
  },
  addLink() {
    return this;
  },
  addLinks() {
    return this;
  }
};
var noop_span_context = {
  traceId: "",
  spanId: "",
  traceFlags: 0
};
async function record_span({ name, attributes: attributes2, fn }) {
  {
    return fn(noop_span);
  }
}
function is_action_json_request(event) {
  const accept = negotiate(event.request.headers.get("accept") ?? "*/*", [
    "application/json",
    "text/html"
  ]);
  return accept === "application/json" && event.request.method === "POST";
}
async function handle_action_json_request(event, event_state, options2, server2) {
  const actions = server2?.actions;
  if (!actions) {
    const no_actions_error = new SvelteKitError(
      405,
      "Method Not Allowed",
      `POST method not allowed. No form actions exist for ${"this page"}`
    );
    return action_json(
      {
        type: "error",
        error: await handle_error_and_jsonify(event, event_state, options2, no_actions_error)
      },
      {
        status: no_actions_error.status,
        headers: {
          // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
          // "The server must generate an Allow header field in a 405 status code response"
          allow: "GET"
        }
      }
    );
  }
  check_named_default_separate(actions);
  try {
    const data = await call_action(event, event_state, actions);
    if (dev) ;
    if (data instanceof ActionFailure) {
      return action_json({
        type: "failure",
        status: data.status,
        // @ts-expect-error we assign a string to what is supposed to be an object. That's ok
        // because we don't use the object outside, and this way we have better code navigation
        // through knowing where the related interface is used.
        data: stringify_action_response(
          data.data,
          /** @type {string} */
          event.route.id,
          options2.hooks.transport
        )
      });
    } else {
      return action_json({
        type: "success",
        status: data ? 200 : 204,
        // @ts-expect-error see comment above
        data: stringify_action_response(
          data,
          /** @type {string} */
          event.route.id,
          options2.hooks.transport
        )
      });
    }
  } catch (e3) {
    const err = normalize_error(e3);
    if (err instanceof Redirect) {
      return action_json_redirect(err);
    }
    return action_json(
      {
        type: "error",
        error: await handle_error_and_jsonify(
          event,
          event_state,
          options2,
          check_incorrect_fail_use(err)
        )
      },
      {
        status: get_status(err)
      }
    );
  }
}
function check_incorrect_fail_use(error2) {
  return error2 instanceof ActionFailure ? new Error('Cannot "throw fail()". Use "return fail()"') : error2;
}
function action_json_redirect(redirect) {
  return action_json({
    type: "redirect",
    status: redirect.status,
    location: redirect.location
  });
}
function action_json(data, init2) {
  return json(data, init2);
}
function is_action_request(event) {
  return event.request.method === "POST";
}
async function handle_action_request(event, event_state, server2) {
  const actions = server2?.actions;
  if (!actions) {
    event.setHeaders({
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
      // "The server must generate an Allow header field in a 405 status code response"
      allow: "GET"
    });
    return {
      type: "error",
      error: new SvelteKitError(
        405,
        "Method Not Allowed",
        `POST method not allowed. No form actions exist for ${"this page"}`
      )
    };
  }
  check_named_default_separate(actions);
  try {
    const data = await call_action(event, event_state, actions);
    if (dev) ;
    if (data instanceof ActionFailure) {
      return {
        type: "failure",
        status: data.status,
        data: data.data
      };
    } else {
      return {
        type: "success",
        status: 200,
        // @ts-expect-error this will be removed upon serialization, so `undefined` is the same as omission
        data
      };
    }
  } catch (e3) {
    const err = normalize_error(e3);
    if (err instanceof Redirect) {
      return {
        type: "redirect",
        status: err.status,
        location: err.location
      };
    }
    return {
      type: "error",
      error: check_incorrect_fail_use(err)
    };
  }
}
function check_named_default_separate(actions) {
  if (actions.default && Object.keys(actions).length > 1) {
    throw new Error(
      "When using named actions, the default action cannot be used. See the docs for more info: https://svelte.dev/docs/kit/form-actions#named-actions"
    );
  }
}
async function call_action(event, event_state, actions) {
  const url = new URL(event.request.url);
  let name = "default";
  for (const param of url.searchParams) {
    if (param[0].startsWith("/")) {
      name = param[0].slice(1);
      if (name === "default") {
        throw new Error('Cannot use reserved action name "default"');
      }
      break;
    }
  }
  const action = actions[name];
  if (!action) {
    throw new SvelteKitError(404, "Not Found", `No action with name '${name}' found`);
  }
  if (!is_form_content_type(event.request)) {
    throw new SvelteKitError(
      415,
      "Unsupported Media Type",
      `Form actions expect form-encoded data \u2014 received ${event.request.headers.get(
        "content-type"
      )}`
    );
  }
  return record_span({
    name: "sveltekit.form_action",
    attributes: {
      "http.route": event.route.id || "unknown"
    },
    fn: async (current2) => {
      const traced_event = merge_tracing(event, current2);
      const result = await with_request_store(
        { event: traced_event, state: event_state },
        () => action(traced_event)
      );
      if (result instanceof ActionFailure) {
        current2.setAttributes({
          "sveltekit.form_action.result.type": "failure",
          "sveltekit.form_action.result.status": result.status
        });
      }
      return result;
    }
  });
}
function uneval_action_response(data, route_id, transport) {
  const replacer = (thing) => {
    for (const key2 in transport) {
      const encoded = transport[key2].encode(thing);
      if (encoded) {
        return `app.decode('${key2}', ${uneval(encoded, replacer)})`;
      }
    }
  };
  return try_serialize(data, (value) => uneval(value, replacer), route_id);
}
function stringify_action_response(data, route_id, transport) {
  const encoders = Object.fromEntries(
    Object.entries(transport).map(([key2, value]) => [key2, value.encode])
  );
  return try_serialize(data, (value) => stringify$1(value, encoders), route_id);
}
function try_serialize(data, fn, route_id) {
  try {
    return fn(data);
  } catch (e3) {
    const error2 = (
      /** @type {any} */
      e3
    );
    if (data instanceof Response) {
      throw new Error(
        `Data returned from action inside ${route_id} is not serializable. Form actions need to return plain objects or fail(). E.g. return { success: true } or return fail(400, { message: "invalid" });`
      );
    }
    if ("path" in error2) {
      let message = `Data returned from action inside ${route_id} is not serializable: ${error2.message}`;
      if (error2.path !== "") message += ` (data.${error2.path})`;
      throw new Error(message);
    }
    throw error2;
  }
}
function create_async_iterator() {
  let resolved = -1;
  let returned = -1;
  const deferred2 = [];
  return {
    iterate: (transform = (x) => x) => {
      return {
        [Symbol.asyncIterator]() {
          return {
            next: async () => {
              const next2 = deferred2[++returned];
              if (!next2) return { value: null, done: true };
              const value = await next2.promise;
              return { value: transform(value), done: false };
            }
          };
        }
      };
    },
    add: (promise) => {
      deferred2.push(with_resolvers());
      void promise.then((value) => {
        deferred2[++resolved].resolve(value);
      });
    }
  };
}
function server_data_serializer(event, event_state, options2) {
  let promise_id = 1;
  let max_nodes = -1;
  const iterator = create_async_iterator();
  const global = get_global_name(options2);
  function get_replacer(index3) {
    return function replacer(thing) {
      if (typeof thing?.then === "function") {
        const id = promise_id++;
        const promise = thing.then(
          /** @param {any} data */
          (data) => ({ data })
        ).catch(
          /** @param {any} error */
          async (error2) => ({
            error: await handle_error_and_jsonify(event, event_state, options2, error2)
          })
        ).then(
          /**
           * @param {{data: any; error: any}} result
           */
          async ({ data, error: error2 }) => {
            let str;
            try {
              str = uneval(error2 ? [, error2] : [data], replacer);
            } catch {
              error2 = await handle_error_and_jsonify(
                event,
                event_state,
                options2,
                new Error(`Failed to serialize promise while rendering ${event.route.id}`)
              );
              data = void 0;
              str = uneval([, error2], replacer);
            }
            return {
              index: index3,
              str: `${global}.resolve(${id}, ${str.includes("app.decode") ? `(app) => ${str}` : `() => ${str}`})`
            };
          }
        );
        iterator.add(promise);
        return `${global}.defer(${id})`;
      } else {
        for (const key2 in options2.hooks.transport) {
          const encoded = options2.hooks.transport[key2].encode(thing);
          if (encoded) {
            return `app.decode('${key2}', ${uneval(encoded, replacer)})`;
          }
        }
      }
    };
  }
  const strings = (
    /** @type {string[]} */
    []
  );
  return {
    set_max_nodes(i) {
      max_nodes = i;
    },
    add_node(i, node) {
      try {
        if (!node) {
          strings[i] = "null";
          return;
        }
        const payload = { type: "data", data: node.data, uses: serialize_uses(node) };
        if (node.slash) payload.slash = node.slash;
        strings[i] = uneval(payload, get_replacer(i));
      } catch (e3) {
        e3.path = e3.path.slice(1);
        throw new Error(clarify_devalue_error(
          event,
          /** @type {any} */
          e3
        ));
      }
    },
    get_data(csp) {
      const open = `<script${csp.script_needs_nonce ? ` nonce="${csp.nonce}"` : ""}>`;
      const close = `<\/script>
`;
      return {
        data: `[${compact(max_nodes > -1 ? strings.slice(0, max_nodes) : strings).join(",")}]`,
        chunks: promise_id > 1 ? iterator.iterate(({ index: index3, str }) => {
          if (max_nodes > -1 && index3 >= max_nodes) {
            return "";
          }
          return open + str + close;
        }) : null
      };
    }
  };
}
function server_data_serializer_json(event, event_state, options2) {
  let promise_id = 1;
  const iterator = create_async_iterator();
  const reducers = {
    ...Object.fromEntries(
      Object.entries(options2.hooks.transport).map(([key2, value]) => [key2, value.encode])
    ),
    /** @param {any} thing */
    Promise: (thing) => {
      if (typeof thing?.then !== "function") {
        return;
      }
      const id = promise_id++;
      let key2 = "data";
      const promise = thing.catch(
        /** @param {any} e */
        async (e3) => {
          key2 = "error";
          return handle_error_and_jsonify(
            event,
            event_state,
            options2,
            /** @type {any} */
            e3
          );
        }
      ).then(
        /** @param {any} value */
        async (value) => {
          let str;
          try {
            str = stringify$1(value, reducers);
          } catch {
            const error2 = await handle_error_and_jsonify(
              event,
              event_state,
              options2,
              new Error(`Failed to serialize promise while rendering ${event.route.id}`)
            );
            key2 = "error";
            str = stringify$1(error2, reducers);
          }
          return `{"type":"chunk","id":${id},"${key2}":${str}}
`;
        }
      );
      iterator.add(promise);
      return id;
    }
  };
  const strings = (
    /** @type {string[]} */
    []
  );
  return {
    add_node(i, node) {
      try {
        if (!node) {
          strings[i] = "null";
          return;
        }
        if (node.type === "error" || node.type === "skip") {
          strings[i] = JSON.stringify(node);
          return;
        }
        strings[i] = `{"type":"data","data":${stringify$1(node.data, reducers)},"uses":${JSON.stringify(
          serialize_uses(node)
        )}${node.slash ? `,"slash":${JSON.stringify(node.slash)}` : ""}}`;
      } catch (e3) {
        e3.path = "data" + e3.path;
        throw new Error(clarify_devalue_error(
          event,
          /** @type {any} */
          e3
        ));
      }
    },
    get_data() {
      return {
        data: `{"type":"data","nodes":[${strings.join(",")}]}
`,
        chunks: promise_id > 1 ? iterator.iterate() : null
      };
    }
  };
}
async function load_server_data({ event, event_state, state: state2, node, parent }) {
  if (!node?.server) return null;
  let is_tracking = true;
  const uses = {
    dependencies: /* @__PURE__ */ new Set(),
    params: /* @__PURE__ */ new Set(),
    parent: false,
    route: false,
    url: false,
    search_params: /* @__PURE__ */ new Set()
  };
  const load = node.server.load;
  const slash = node.server.trailingSlash;
  if (!load) {
    return { type: "data", data: null, uses, slash };
  }
  const url = make_trackable(
    event.url,
    () => {
      if (is_tracking) {
        uses.url = true;
      }
    },
    (param) => {
      if (is_tracking) {
        uses.search_params.add(param);
      }
    }
  );
  if (state2.prerendering) {
    disable_search(url);
  }
  const result = await record_span({
    name: "sveltekit.load",
    attributes: {
      "sveltekit.load.node_id": node.server_id || "unknown",
      "sveltekit.load.node_type": get_node_type(node.server_id),
      "http.route": event.route.id || "unknown"
    },
    fn: async (current2) => {
      const traced_event = merge_tracing(event, current2);
      const result2 = await with_request_store(
        { event: traced_event, state: event_state },
        () => load.call(null, {
          ...traced_event,
          fetch: (info, init2) => {
            new URL(info instanceof Request ? info.url : info, event.url);
            return event.fetch(info, init2);
          },
          /** @param {string[]} deps */
          depends: (...deps) => {
            for (const dep of deps) {
              const { href } = new URL(dep, event.url);
              uses.dependencies.add(href);
            }
          },
          params: new Proxy(event.params, {
            get: (target, key2) => {
              if (is_tracking) {
                uses.params.add(key2);
              }
              return target[
                /** @type {string} */
                key2
              ];
            }
          }),
          parent: async () => {
            if (is_tracking) {
              uses.parent = true;
            }
            return parent();
          },
          route: new Proxy(event.route, {
            get: (target, key2) => {
              if (is_tracking) {
                uses.route = true;
              }
              return target[
                /** @type {'id'} */
                key2
              ];
            }
          }),
          url,
          untrack(fn) {
            is_tracking = false;
            try {
              return fn();
            } finally {
              is_tracking = true;
            }
          }
        })
      );
      return result2;
    }
  });
  return {
    type: "data",
    data: result ?? null,
    uses,
    slash
  };
}
async function load_data({
  event,
  event_state,
  fetched,
  node,
  parent,
  server_data_promise,
  state: state2,
  resolve_opts,
  csr
}) {
  const server_data_node = await server_data_promise;
  const load = node?.universal?.load;
  if (!load) {
    return server_data_node?.data ?? null;
  }
  const result = await record_span({
    name: "sveltekit.load",
    attributes: {
      "sveltekit.load.node_id": node.universal_id || "unknown",
      "sveltekit.load.node_type": get_node_type(node.universal_id),
      "http.route": event.route.id || "unknown"
    },
    fn: async (current2) => {
      const traced_event = merge_tracing(event, current2);
      return await with_request_store(
        { event: traced_event, state: event_state },
        () => load.call(null, {
          url: event.url,
          params: event.params,
          data: server_data_node?.data ?? null,
          route: event.route,
          fetch: create_universal_fetch(event, state2, fetched, csr, resolve_opts),
          setHeaders: event.setHeaders,
          depends: () => {
          },
          parent,
          untrack: (fn) => fn(),
          tracing: traced_event.tracing
        })
      );
    }
  });
  return result ?? null;
}
function create_universal_fetch(event, state2, fetched, csr, resolve_opts) {
  const universal_fetch = async (input, init2) => {
    const cloned_body = input instanceof Request && input.body ? input.clone().body : null;
    const cloned_headers = input instanceof Request && [...input.headers].length ? new Headers(input.headers) : init2?.headers;
    let response = await event.fetch(input, init2);
    const url = new URL(input instanceof Request ? input.url : input, event.url);
    const same_origin = url.origin === event.url.origin;
    let dependency;
    if (same_origin) {
      if (state2.prerendering) {
        dependency = { response, body: null };
        state2.prerendering.dependencies.set(url.pathname, dependency);
      }
    } else if (url.protocol === "https:" || url.protocol === "http:") {
      const mode = input instanceof Request ? input.mode : init2?.mode ?? "cors";
      if (mode === "no-cors") {
        response = new Response("", {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      } else {
        const acao = response.headers.get("access-control-allow-origin");
        if (!acao || acao !== event.url.origin && acao !== "*") {
          throw new Error(
            `CORS error: ${acao ? "Incorrect" : "No"} 'Access-Control-Allow-Origin' header is present on the requested resource`
          );
        }
      }
    }
    let teed_body;
    const proxy2 = new Proxy(response, {
      get(response2, key2, receiver) {
        async function push_fetched(body2, is_b64) {
          const status_number = Number(response2.status);
          if (isNaN(status_number)) {
            throw new Error(
              `response.status is not a number. value: "${response2.status}" type: ${typeof response2.status}`
            );
          }
          fetched.push({
            url: same_origin ? url.href.slice(event.url.origin.length) : url.href,
            method: event.request.method,
            request_body: (
              /** @type {string | ArrayBufferView | undefined} */
              input instanceof Request && cloned_body ? await stream_to_string(cloned_body) : init2?.body
            ),
            request_headers: cloned_headers,
            response_body: body2,
            response: response2,
            is_b64
          });
        }
        if (key2 === "body") {
          if (response2.body === null) {
            return null;
          }
          if (teed_body) {
            return teed_body;
          }
          const [a, b] = response2.body.tee();
          void (async () => {
            let result = new Uint8Array();
            for await (const chunk of a) {
              const combined = new Uint8Array(result.length + chunk.length);
              combined.set(result, 0);
              combined.set(chunk, result.length);
              result = combined;
            }
            if (dependency) {
              dependency.body = new Uint8Array(result);
            }
            void push_fetched(base64_encode(result), true);
          })();
          return teed_body = b;
        }
        if (key2 === "arrayBuffer") {
          return async () => {
            const buffer = await response2.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            if (dependency) {
              dependency.body = bytes;
            }
            if (buffer instanceof ArrayBuffer) {
              await push_fetched(base64_encode(bytes), true);
            }
            return buffer;
          };
        }
        async function text2() {
          const body2 = await response2.text();
          if (body2 === "" && NULL_BODY_STATUS.includes(response2.status)) {
            await push_fetched(void 0, false);
            return void 0;
          }
          if (!body2 || typeof body2 === "string") {
            await push_fetched(body2, false);
          }
          if (dependency) {
            dependency.body = body2;
          }
          return body2;
        }
        if (key2 === "text") {
          return text2;
        }
        if (key2 === "json") {
          return async () => {
            const body2 = await text2();
            return body2 ? JSON.parse(body2) : void 0;
          };
        }
        const value = Reflect.get(response2, key2, response2);
        if (value instanceof Function) {
          return Object.defineProperties(
            /**
             * @this {any}
             */
            function() {
              return Reflect.apply(value, this === receiver ? response2 : this, arguments);
            },
            {
              name: { value: value.name },
              length: { value: value.length }
            }
          );
        }
        return value;
      }
    });
    if (csr) {
      const get2 = response.headers.get;
      response.headers.get = (key2) => {
        const lower = key2.toLowerCase();
        const value = get2.call(response.headers, lower);
        if (value && !lower.startsWith("x-sveltekit-")) {
          const included = resolve_opts.filterSerializedResponseHeaders(lower, value);
          if (!included) {
            throw new Error(
              `Failed to get response header "${lower}" \u2014 it must be included by the \`filterSerializedResponseHeaders\` option: https://svelte.dev/docs/kit/hooks#Server-hooks-handle (at ${event.route.id})`
            );
          }
        }
        return value;
      };
    }
    return proxy2;
  };
  return (input, init2) => {
    const response = universal_fetch(input, init2);
    response.catch(() => {
    });
    return response;
  };
}
async function stream_to_string(stream) {
  let result = "";
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    result += text_decoder2.decode(value);
  }
  return result;
}
function hash(...values) {
  let hash2 = 5381;
  for (const value of values) {
    if (typeof value === "string") {
      let i = value.length;
      while (i) hash2 = hash2 * 33 ^ value.charCodeAt(--i);
    } else if (ArrayBuffer.isView(value)) {
      const buffer = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      let i = buffer.length;
      while (i) hash2 = hash2 * 33 ^ buffer[--i];
    } else {
      throw new TypeError("value must be a string or TypedArray");
    }
  }
  return (hash2 >>> 0).toString(36);
}
var replacements2 = {
  "<": "\\u003C",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
var pattern = new RegExp(`[${Object.keys(replacements2).join("")}]`, "g");
function serialize_data(fetched, filter, prerendering = false) {
  const headers2 = {};
  let cache_control = null;
  let age = null;
  let varyAny = false;
  for (const [key2, value] of fetched.response.headers) {
    if (filter(key2, value)) {
      headers2[key2] = value;
    }
    if (key2 === "cache-control") cache_control = value;
    else if (key2 === "age") age = value;
    else if (key2 === "vary" && value.trim() === "*") varyAny = true;
  }
  const payload = {
    status: fetched.response.status,
    statusText: fetched.response.statusText,
    headers: headers2,
    body: fetched.response_body
  };
  const safe_payload = JSON.stringify(payload).replace(pattern, (match) => replacements2[match]);
  const attrs = [
    'type="application/json"',
    "data-sveltekit-fetched",
    `data-url="${escape_html(fetched.url, true)}"`
  ];
  if (fetched.is_b64) {
    attrs.push("data-b64");
  }
  if (fetched.request_headers || fetched.request_body) {
    const values = [];
    if (fetched.request_headers) {
      values.push([...new Headers(fetched.request_headers)].join(","));
    }
    if (fetched.request_body) {
      values.push(fetched.request_body);
    }
    attrs.push(`data-hash="${hash(...values)}"`);
  }
  if (!prerendering && fetched.method === "GET" && cache_control && !varyAny) {
    const match = /s-maxage=(\d+)/g.exec(cache_control) ?? /max-age=(\d+)/g.exec(cache_control);
    if (match) {
      const ttl = +match[1] - +(age ?? "0");
      attrs.push(`data-ttl="${ttl}"`);
    }
  }
  return `<script ${attrs.join(" ")}>${safe_payload}<\/script>`;
}
var s = JSON.stringify;
function sha2562(data) {
  if (!key[0]) precompute();
  const out = init.slice(0);
  const array2 = encode(data);
  for (let i = 0; i < array2.length; i += 16) {
    const w = array2.subarray(i, i + 16);
    let tmp;
    let a;
    let b;
    let out0 = out[0];
    let out1 = out[1];
    let out2 = out[2];
    let out3 = out[3];
    let out4 = out[4];
    let out5 = out[5];
    let out6 = out[6];
    let out7 = out[7];
    for (let i2 = 0; i2 < 64; i2++) {
      if (i2 < 16) {
        tmp = w[i2];
      } else {
        a = w[i2 + 1 & 15];
        b = w[i2 + 14 & 15];
        tmp = w[i2 & 15] = (a >>> 7 ^ a >>> 18 ^ a >>> 3 ^ a << 25 ^ a << 14) + (b >>> 17 ^ b >>> 19 ^ b >>> 10 ^ b << 15 ^ b << 13) + w[i2 & 15] + w[i2 + 9 & 15] | 0;
      }
      tmp = tmp + out7 + (out4 >>> 6 ^ out4 >>> 11 ^ out4 >>> 25 ^ out4 << 26 ^ out4 << 21 ^ out4 << 7) + (out6 ^ out4 & (out5 ^ out6)) + key[i2];
      out7 = out6;
      out6 = out5;
      out5 = out4;
      out4 = out3 + tmp | 0;
      out3 = out2;
      out2 = out1;
      out1 = out0;
      out0 = tmp + (out1 & out2 ^ out3 & (out1 ^ out2)) + (out1 >>> 2 ^ out1 >>> 13 ^ out1 >>> 22 ^ out1 << 30 ^ out1 << 19 ^ out1 << 10) | 0;
    }
    out[0] = out[0] + out0 | 0;
    out[1] = out[1] + out1 | 0;
    out[2] = out[2] + out2 | 0;
    out[3] = out[3] + out3 | 0;
    out[4] = out[4] + out4 | 0;
    out[5] = out[5] + out5 | 0;
    out[6] = out[6] + out6 | 0;
    out[7] = out[7] + out7 | 0;
  }
  const bytes = new Uint8Array(out.buffer);
  reverse_endianness(bytes);
  return btoa(String.fromCharCode(...bytes));
}
var init = new Uint32Array(8);
var key = new Uint32Array(64);
function precompute() {
  function frac(x) {
    return (x - Math.floor(x)) * 4294967296;
  }
  let prime = 2;
  for (let i = 0; i < 64; prime++) {
    let is_prime = true;
    for (let factor = 2; factor * factor <= prime; factor++) {
      if (prime % factor === 0) {
        is_prime = false;
        break;
      }
    }
    if (is_prime) {
      if (i < 8) {
        init[i] = frac(prime ** (1 / 2));
      }
      key[i] = frac(prime ** (1 / 3));
      i++;
    }
  }
}
function reverse_endianness(bytes) {
  for (let i = 0; i < bytes.length; i += 4) {
    const a = bytes[i + 0];
    const b = bytes[i + 1];
    const c2 = bytes[i + 2];
    const d = bytes[i + 3];
    bytes[i + 0] = d;
    bytes[i + 1] = c2;
    bytes[i + 2] = b;
    bytes[i + 3] = a;
  }
}
function encode(str) {
  const encoded = text_encoder2.encode(str);
  const length = encoded.length * 8;
  const size = 512 * Math.ceil((length + 65) / 512);
  const bytes = new Uint8Array(size / 8);
  bytes.set(encoded);
  bytes[encoded.length] = 128;
  reverse_endianness(bytes);
  const words = new Uint32Array(bytes.buffer);
  words[words.length - 2] = Math.floor(length / 4294967296);
  words[words.length - 1] = length;
  return words;
}
var array = new Uint8Array(16);
function generate_nonce() {
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}
var quoted = /* @__PURE__ */ new Set([
  "self",
  "unsafe-eval",
  "unsafe-hashes",
  "unsafe-inline",
  "none",
  "strict-dynamic",
  "report-sample",
  "wasm-unsafe-eval",
  "script"
]);
var crypto_pattern = /^(nonce|sha\d\d\d)-/;
var BaseProvider = class {
  /** @type {boolean} */
  #use_hashes;
  /** @type {boolean} */
  #script_needs_csp;
  /** @type {boolean} */
  #script_src_needs_csp;
  /** @type {boolean} */
  #script_src_elem_needs_csp;
  /** @type {boolean} */
  #style_needs_csp;
  /** @type {boolean} */
  #style_src_needs_csp;
  /** @type {boolean} */
  #style_src_attr_needs_csp;
  /** @type {boolean} */
  #style_src_elem_needs_csp;
  /** @type {import('types').CspDirectives} */
  #directives;
  /** @type {import('types').Csp.Source[]} */
  #script_src;
  /** @type {import('types').Csp.Source[]} */
  #script_src_elem;
  /** @type {import('types').Csp.Source[]} */
  #style_src;
  /** @type {import('types').Csp.Source[]} */
  #style_src_attr;
  /** @type {import('types').Csp.Source[]} */
  #style_src_elem;
  /** @type {string} */
  #nonce;
  /**
   * @param {boolean} use_hashes
   * @param {import('types').CspDirectives} directives
   * @param {string} nonce
   */
  constructor(use_hashes, directives, nonce) {
    this.#use_hashes = use_hashes;
    this.#directives = directives;
    const d = this.#directives;
    this.#script_src = [];
    this.#script_src_elem = [];
    this.#style_src = [];
    this.#style_src_attr = [];
    this.#style_src_elem = [];
    const effective_script_src = d["script-src"] || d["default-src"];
    const script_src_elem = d["script-src-elem"];
    const effective_style_src = d["style-src"] || d["default-src"];
    const style_src_attr = d["style-src-attr"];
    const style_src_elem = d["style-src-elem"];
    const style_needs_csp = (directive) => !!directive && !directive.some((value) => value === "unsafe-inline");
    const script_needs_csp = (directive) => !!directive && (!directive.some((value) => value === "unsafe-inline") || directive.some((value) => value === "strict-dynamic"));
    this.#script_src_needs_csp = script_needs_csp(effective_script_src);
    this.#script_src_elem_needs_csp = script_needs_csp(script_src_elem);
    this.#style_src_needs_csp = style_needs_csp(effective_style_src);
    this.#style_src_attr_needs_csp = style_needs_csp(style_src_attr);
    this.#style_src_elem_needs_csp = style_needs_csp(style_src_elem);
    this.#script_needs_csp = this.#script_src_needs_csp || this.#script_src_elem_needs_csp;
    this.#style_needs_csp = this.#style_src_needs_csp || this.#style_src_attr_needs_csp || this.#style_src_elem_needs_csp;
    this.script_needs_nonce = this.#script_needs_csp && !this.#use_hashes;
    this.style_needs_nonce = this.#style_needs_csp && !this.#use_hashes;
    this.#nonce = nonce;
  }
  /** @param {string} content */
  add_script(content) {
    if (!this.#script_needs_csp) return;
    const source2 = this.#use_hashes ? `sha256-${sha2562(content)}` : `nonce-${this.#nonce}`;
    if (this.#script_src_needs_csp) {
      this.#script_src.push(source2);
    }
    if (this.#script_src_elem_needs_csp) {
      this.#script_src_elem.push(source2);
    }
  }
  /** @param {string} content */
  add_style(content) {
    if (!this.#style_needs_csp) return;
    const source2 = this.#use_hashes ? `sha256-${sha2562(content)}` : `nonce-${this.#nonce}`;
    if (this.#style_src_needs_csp) {
      this.#style_src.push(source2);
    }
    if (this.#style_src_attr_needs_csp) {
      this.#style_src_attr.push(source2);
    }
    if (this.#style_src_elem_needs_csp) {
      const sha256_empty_comment_hash = "sha256-9OlNO0DNEeaVzHL4RZwCLsBHA8WBQ8toBp/4F5XV2nc=";
      const d = this.#directives;
      if (d["style-src-elem"] && !d["style-src-elem"].includes(sha256_empty_comment_hash) && !this.#style_src_elem.includes(sha256_empty_comment_hash)) {
        this.#style_src_elem.push(sha256_empty_comment_hash);
      }
      if (source2 !== sha256_empty_comment_hash) {
        this.#style_src_elem.push(source2);
      }
    }
  }
  /**
   * @param {boolean} [is_meta]
   */
  get_header(is_meta = false) {
    const header = [];
    const directives = { ...this.#directives };
    if (this.#style_src.length > 0) {
      directives["style-src"] = [
        ...directives["style-src"] || directives["default-src"] || [],
        ...this.#style_src
      ];
    }
    if (this.#style_src_attr.length > 0) {
      directives["style-src-attr"] = [
        ...directives["style-src-attr"] || [],
        ...this.#style_src_attr
      ];
    }
    if (this.#style_src_elem.length > 0) {
      directives["style-src-elem"] = [
        ...directives["style-src-elem"] || [],
        ...this.#style_src_elem
      ];
    }
    if (this.#script_src.length > 0) {
      directives["script-src"] = [
        ...directives["script-src"] || directives["default-src"] || [],
        ...this.#script_src
      ];
    }
    if (this.#script_src_elem.length > 0) {
      directives["script-src-elem"] = [
        ...directives["script-src-elem"] || [],
        ...this.#script_src_elem
      ];
    }
    for (const key2 in directives) {
      if (is_meta && (key2 === "frame-ancestors" || key2 === "report-uri" || key2 === "sandbox")) {
        continue;
      }
      const value = (
        /** @type {string[] | true} */
        directives[key2]
      );
      if (!value) continue;
      const directive = [key2];
      if (Array.isArray(value)) {
        value.forEach((value2) => {
          if (quoted.has(value2) || crypto_pattern.test(value2)) {
            directive.push(`'${value2}'`);
          } else {
            directive.push(value2);
          }
        });
      }
      header.push(directive.join(" "));
    }
    return header.join("; ");
  }
};
var CspProvider = class extends BaseProvider {
  get_meta() {
    const content = this.get_header(true);
    if (!content) {
      return;
    }
    return `<meta http-equiv="content-security-policy" content="${escape_html(content, true)}">`;
  }
};
var CspReportOnlyProvider = class extends BaseProvider {
  /**
   * @param {boolean} use_hashes
   * @param {import('types').CspDirectives} directives
   * @param {string} nonce
   */
  constructor(use_hashes, directives, nonce) {
    super(use_hashes, directives, nonce);
    if (Object.values(directives).filter((v) => !!v).length > 0) {
      const has_report_to = directives["report-to"]?.length ?? 0 > 0;
      const has_report_uri = directives["report-uri"]?.length ?? 0 > 0;
      if (!has_report_to && !has_report_uri) {
        throw Error(
          "`content-security-policy-report-only` must be specified with either the `report-to` or `report-uri` directives, or both"
        );
      }
    }
  }
};
var Csp = class {
  /** @readonly */
  nonce = generate_nonce();
  /** @type {CspProvider} */
  csp_provider;
  /** @type {CspReportOnlyProvider} */
  report_only_provider;
  /**
   * @param {import('./types.js').CspConfig} config
   * @param {import('./types.js').CspOpts} opts
   */
  constructor({ mode, directives, reportOnly }, { prerender }) {
    const use_hashes = mode === "hash" || mode === "auto" && prerender;
    this.csp_provider = new CspProvider(use_hashes, directives, this.nonce);
    this.report_only_provider = new CspReportOnlyProvider(use_hashes, reportOnly, this.nonce);
  }
  get script_needs_nonce() {
    return this.csp_provider.script_needs_nonce || this.report_only_provider.script_needs_nonce;
  }
  get style_needs_nonce() {
    return this.csp_provider.style_needs_nonce || this.report_only_provider.style_needs_nonce;
  }
  /** @param {string} content */
  add_script(content) {
    this.csp_provider.add_script(content);
    this.report_only_provider.add_script(content);
  }
  /** @param {string} content */
  add_style(content) {
    this.csp_provider.add_style(content);
    this.report_only_provider.add_style(content);
  }
};
function exec(match, params, matchers) {
  const result = {};
  const values = match.slice(1);
  const values_needing_match = values.filter((value) => value !== void 0);
  let buffered = 0;
  for (let i = 0; i < params.length; i += 1) {
    const param = params[i];
    let value = values[i - buffered];
    if (param.chained && param.rest && buffered) {
      value = values.slice(i - buffered, i + 1).filter((s22) => s22).join("/");
      buffered = 0;
    }
    if (value === void 0) {
      if (param.rest) {
        value = "";
      } else {
        continue;
      }
    }
    if (!param.matcher || matchers[param.matcher](value)) {
      result[param.name] = value;
      const next_param = params[i + 1];
      const next_value = values[i + 1];
      if (next_param && !next_param.rest && next_param.optional && next_value && param.chained) {
        buffered = 0;
      }
      if (!next_param && !next_value && Object.keys(result).length === values_needing_match.length) {
        buffered = 0;
      }
      continue;
    }
    if (param.optional && param.chained) {
      buffered++;
      continue;
    }
    return;
  }
  if (buffered) return;
  return result;
}
function generate_route_object(route, url, manifest2) {
  const { errors, layouts, leaf } = route;
  const nodes = [...errors, ...layouts.map((l) => l?.[1]), leaf[1]].filter((n2) => typeof n2 === "number").map((n2) => `'${n2}': () => ${create_client_import(manifest2._.client.nodes?.[n2])}`).join(",\n		");
  return [
    `{
	id: ${s(route.id)}`,
    `errors: ${s(route.errors)}`,
    `layouts: ${s(route.layouts)}`,
    `leaf: ${s(route.leaf)}`,
    `nodes: {
		${nodes}
	}
}`
  ].join(",\n	");
}
function create_client_import(import_path, url) {
  if (!import_path) return "Promise.resolve({})";
  if (import_path[0] === "/") {
    return `import('${import_path}')`;
  }
  if (assets !== "") {
    return `import('${assets}/${import_path}')`;
  }
  {
    return `import('${base}/${import_path}')`;
  }
}
async function resolve_route(resolved_path, url, manifest2) {
  if (!manifest2._.client.routes) {
    return text("Server-side route resolution disabled", { status: 400 });
  }
  let route = null;
  let params = {};
  const matchers = await manifest2._.matchers();
  for (const candidate of manifest2._.client.routes) {
    const match = candidate.pattern.exec(resolved_path);
    if (!match) continue;
    const matched = exec(match, candidate.params, matchers);
    if (matched) {
      route = candidate;
      params = decode_params(matched);
      break;
    }
  }
  return create_server_routing_response(route, params, url, manifest2).response;
}
function create_server_routing_response(route, params, url, manifest2) {
  const headers2 = new Headers({
    "content-type": "application/javascript; charset=utf-8"
  });
  if (route) {
    const csr_route = generate_route_object(route, url, manifest2);
    const body2 = `${create_css_import(route, url, manifest2)}
export const route = ${csr_route}; export const params = ${JSON.stringify(params)};`;
    return { response: text(body2, { headers: headers2 }), body: body2 };
  } else {
    return { response: text("", { headers: headers2 }), body: "" };
  }
}
function create_css_import(route, url, manifest2) {
  const { errors, layouts, leaf } = route;
  let css = "";
  for (const node of [...errors, ...layouts.map((l) => l?.[1]), leaf[1]]) {
    if (typeof node !== "number") continue;
    const node_css = manifest2._.client.css?.[node];
    for (const css_path of node_css ?? []) {
      css += `'${assets || base}/${css_path}',`;
    }
  }
  if (!css) return "";
  return `${create_client_import(
    /** @type {string} */
    manifest2._.client.start
  )}.then(x => x.load_css([${css}]));`;
}
var updated = {
  ...readable(false),
  check: () => false
};
async function render_response({
  branch: branch2,
  fetched,
  options: options2,
  manifest: manifest2,
  state: state2,
  page_config,
  status,
  error: error2 = null,
  event,
  event_state,
  resolve_opts,
  action_result,
  data_serializer
}) {
  if (state2.prerendering) {
    if (options2.csp.mode === "nonce") {
      throw new Error('Cannot use prerendering if config.kit.csp.mode === "nonce"');
    }
    if (options2.app_template_contains_nonce) {
      throw new Error("Cannot use prerendering if page template contains %sveltekit.nonce%");
    }
  }
  const { client } = manifest2._;
  const modulepreloads = new Set(client.imports);
  const stylesheets3 = new Set(client.stylesheets);
  const fonts3 = new Set(client.fonts);
  const link_headers = /* @__PURE__ */ new Set();
  const link_tags = /* @__PURE__ */ new Set();
  const inline_styles = /* @__PURE__ */ new Map();
  let rendered;
  const form_value = action_result?.type === "success" || action_result?.type === "failure" ? action_result.data ?? null : null;
  let base$1 = base;
  let assets$1 = assets;
  let base_expression = s(base);
  if (page_config.ssr) {
    const props = {
      stores: {
        page: writable(null),
        navigating: writable(null),
        updated
      },
      constructors: await Promise.all(
        branch2.map(({ node }) => {
          if (!node.component) {
            throw new Error(`Missing +page.svelte component for route ${event.route.id}`);
          }
          return node.component();
        })
      ),
      form: form_value
    };
    let data2 = {};
    for (let i = 0; i < branch2.length; i += 1) {
      data2 = { ...data2, ...branch2[i].data };
      props[`data_${i}`] = data2;
    }
    props.page = {
      error: error2,
      params: (
        /** @type {Record<string, any>} */
        event.params
      ),
      route: event.route,
      status,
      url: event.url,
      data: data2,
      form: form_value,
      state: {}
    };
    const render_opts = {
      context: /* @__PURE__ */ new Map([
        [
          "__request__",
          {
            page: props.page
          }
        ]
      ])
    };
    const fetch2 = globalThis.fetch;
    try {
      if (dev) ;
      rendered = await with_request_store({ event, state: event_state }, async () => {
        if (relative) ;
        const maybe_promise = options2.root.render(props, render_opts);
        const rendered2 = options2.async && "then" in maybe_promise ? (
          /** @type {ReturnType<typeof options.root.render> & Promise<any>} */
          maybe_promise.then((r3) => r3)
        ) : maybe_promise;
        if (options2.async) {
          reset();
        }
        const { head: head2, html: html2, css } = options2.async ? await rendered2 : rendered2;
        return { head: head2, html: html2, css };
      });
    } finally {
      reset();
    }
    for (const { node } of branch2) {
      for (const url of node.imports) modulepreloads.add(url);
      for (const url of node.stylesheets) stylesheets3.add(url);
      for (const url of node.fonts) fonts3.add(url);
      if (node.inline_styles && !client.inline) {
        Object.entries(await node.inline_styles()).forEach(([filename, css]) => {
          if (typeof css === "string") {
            inline_styles.set(filename, css);
            return;
          }
          inline_styles.set(filename, css(`${assets$1}/${app_dir}/immutable/assets`, assets$1));
        });
      }
    }
  } else {
    rendered = { head: "", html: "", css: { code: "", map: null } };
  }
  let head = "";
  let body2 = rendered.html;
  const csp = new Csp(options2.csp, {
    prerender: !!state2.prerendering
  });
  const prefixed = (path) => {
    if (path.startsWith("/")) {
      return base + path;
    }
    return `${assets$1}/${path}`;
  };
  const style = client.inline ? client.inline?.style : Array.from(inline_styles.values()).join("\n");
  if (style) {
    const attributes2 = [];
    if (csp.style_needs_nonce) attributes2.push(` nonce="${csp.nonce}"`);
    csp.add_style(style);
    head += `
	<style${attributes2.join("")}>${style}</style>`;
  }
  for (const dep of stylesheets3) {
    const path = prefixed(dep);
    const attributes2 = ['rel="stylesheet"'];
    if (inline_styles.has(dep)) {
      attributes2.push("disabled", 'media="(max-width: 0)"');
    } else {
      if (resolve_opts.preload({ type: "css", path })) {
        link_headers.add(`<${encodeURI(path)}>; rel="preload"; as="style"; nopush`);
      }
    }
    head += `
		<link href="${path}" ${attributes2.join(" ")}>`;
  }
  for (const dep of fonts3) {
    const path = prefixed(dep);
    if (resolve_opts.preload({ type: "font", path })) {
      const ext = dep.slice(dep.lastIndexOf(".") + 1);
      link_tags.add(`<link rel="preload" as="font" type="font/${ext}" href="${path}" crossorigin>`);
      link_headers.add(
        `<${encodeURI(path)}>; rel="preload"; as="font"; type="font/${ext}"; crossorigin; nopush`
      );
    }
  }
  const global = get_global_name(options2);
  const { data, chunks } = data_serializer.get_data(csp);
  if (page_config.ssr && page_config.csr) {
    body2 += `
			${fetched.map(
      (item) => serialize_data(item, resolve_opts.filterSerializedResponseHeaders, !!state2.prerendering)
    ).join("\n			")}`;
  }
  if (page_config.csr) {
    const route = manifest2._.client.routes?.find((r3) => r3.id === event.route.id) ?? null;
    if (client.uses_env_dynamic_public && state2.prerendering) {
      modulepreloads.add(`${app_dir}/env.js`);
    }
    if (!client.inline) {
      const included_modulepreloads = Array.from(modulepreloads, (dep) => prefixed(dep)).filter(
        (path) => resolve_opts.preload({ type: "js", path })
      );
      for (const path of included_modulepreloads) {
        link_headers.add(`<${encodeURI(path)}>; rel="modulepreload"; nopush`);
        if (options2.preload_strategy !== "modulepreload") {
          head += `
		<link rel="preload" as="script" crossorigin="anonymous" href="${path}">`;
        } else {
          link_tags.add(`<link rel="modulepreload" href="${path}">`);
        }
      }
    }
    if (state2.prerendering && link_tags.size > 0) {
      head += Array.from(link_tags).map((tag) => `
		${tag}`).join("");
    }
    if (manifest2._.client.routes && state2.prerendering && !state2.prerendering.fallback) {
      const pathname = add_resolution_suffix2(event.url.pathname);
      state2.prerendering.dependencies.set(
        pathname,
        create_server_routing_response(route, event.params, new URL(pathname, event.url), manifest2)
      );
    }
    const blocks = [];
    const load_env_eagerly = client.uses_env_dynamic_public && state2.prerendering;
    const properties = [`base: ${base_expression}`];
    if (assets) {
      properties.push(`assets: ${s(assets)}`);
    }
    if (client.uses_env_dynamic_public) {
      properties.push(`env: ${load_env_eagerly ? "null" : s(public_env)}`);
    }
    if (chunks) {
      blocks.push("const deferred = new Map();");
      properties.push(`defer: (id) => new Promise((fulfil, reject) => {
							deferred.set(id, { fulfil, reject });
						})`);
      let app_declaration = "";
      if (Object.keys(options2.hooks.transport).length > 0) {
        if (client.inline) {
          app_declaration = `const app = __sveltekit_${options2.version_hash}.app.app;`;
        } else if (client.app) {
          app_declaration = `const app = await import(${s(prefixed(client.app))});`;
        } else {
          app_declaration = `const { app } = await import(${s(prefixed(client.start))});`;
        }
      }
      const prelude = app_declaration ? `${app_declaration}
							const [data, error] = fn(app);` : `const [data, error] = fn();`;
      properties.push(`resolve: async (id, fn) => {
							${prelude}

							const try_to_resolve = () => {
								if (!deferred.has(id)) {
									setTimeout(try_to_resolve, 0);
									return;
								}
								const { fulfil, reject } = deferred.get(id);
								deferred.delete(id);
								if (error) reject(error);
								else fulfil(data);
							}
							try_to_resolve();
						}`);
    }
    blocks.push(`${global} = {
						${properties.join(",\n						")}
					};`);
    const args = ["element"];
    blocks.push("const element = document.currentScript.parentElement;");
    if (page_config.ssr) {
      const serialized = { form: "null", error: "null" };
      if (form_value) {
        serialized.form = uneval_action_response(
          form_value,
          /** @type {string} */
          event.route.id,
          options2.hooks.transport
        );
      }
      if (error2) {
        serialized.error = uneval(error2);
      }
      const hydrate2 = [
        `node_ids: [${branch2.map(({ node }) => node.index).join(", ")}]`,
        `data: ${data}`,
        `form: ${serialized.form}`,
        `error: ${serialized.error}`
      ];
      if (status !== 200) {
        hydrate2.push(`status: ${status}`);
      }
      if (manifest2._.client.routes) {
        if (route) {
          const stringified = generate_route_object(route, event.url, manifest2).replaceAll(
            "\n",
            "\n							"
          );
          hydrate2.push(`params: ${uneval(event.params)}`, `server_route: ${stringified}`);
        }
      } else if (options2.embedded) {
        hydrate2.push(`params: ${uneval(event.params)}`, `route: ${s(event.route)}`);
      }
      const indent = "	".repeat(load_env_eagerly ? 7 : 6);
      args.push(`{
${indent}	${hydrate2.join(`,
${indent}	`)}
${indent}}`);
    }
    const { remote_data: remote_cache } = event_state;
    let serialized_remote_data = "";
    if (remote_cache) {
      const remote = {};
      for (const [info, cache] of remote_cache) {
        if (!info.id) continue;
        for (const key2 in cache) {
          remote[create_remote_key(info.id, key2)] = await cache[key2];
        }
      }
      const replacer = (thing) => {
        for (const key2 in options2.hooks.transport) {
          const encoded = options2.hooks.transport[key2].encode(thing);
          if (encoded) {
            return `app.decode('${key2}', ${uneval(encoded, replacer)})`;
          }
        }
      };
      serialized_remote_data = `${global}.data = ${uneval(remote, replacer)};

						`;
    }
    const boot = client.inline ? `${client.inline.script}

					${serialized_remote_data}${global}.app.start(${args.join(", ")});` : client.app ? `Promise.all([
						import(${s(prefixed(client.start))}),
						import(${s(prefixed(client.app))})
					]).then(([kit, app]) => {
						${serialized_remote_data}kit.start(app, ${args.join(", ")});
					});` : `import(${s(prefixed(client.start))}).then((app) => {
						${serialized_remote_data}app.start(${args.join(", ")})
					});`;
    if (load_env_eagerly) {
      blocks.push(`import(${s(`${base$1}/${app_dir}/env.js`)}).then(({ env }) => {
						${global}.env = env;

						${boot.replace(/\n/g, "\n	")}
					});`);
    } else {
      blocks.push(boot);
    }
    if (options2.service_worker) {
      let opts = "";
      if (options2.service_worker_options != null) {
        const service_worker_options = { ...options2.service_worker_options };
        opts = `, ${s(service_worker_options)}`;
      }
      blocks.push(`if ('serviceWorker' in navigator) {
						addEventListener('load', function () {
							navigator.serviceWorker.register('${prefixed("service-worker.js")}'${opts});
						});
					}`);
    }
    const init_app = `
				{
					${blocks.join("\n\n					")}
				}
			`;
    csp.add_script(init_app);
    body2 += `
			<script${csp.script_needs_nonce ? ` nonce="${csp.nonce}"` : ""}>${init_app}<\/script>
		`;
  }
  const headers2 = new Headers({
    "x-sveltekit-page": "true",
    "content-type": "text/html"
  });
  if (state2.prerendering) {
    const http_equiv = [];
    const csp_headers = csp.csp_provider.get_meta();
    if (csp_headers) {
      http_equiv.push(csp_headers);
    }
    if (state2.prerendering.cache) {
      http_equiv.push(`<meta http-equiv="cache-control" content="${state2.prerendering.cache}">`);
    }
    if (http_equiv.length > 0) {
      head = http_equiv.join("\n") + head;
    }
  } else {
    const csp_header = csp.csp_provider.get_header();
    if (csp_header) {
      headers2.set("content-security-policy", csp_header);
    }
    const report_only_header = csp.report_only_provider.get_header();
    if (report_only_header) {
      headers2.set("content-security-policy-report-only", report_only_header);
    }
    if (link_headers.size) {
      headers2.set("link", Array.from(link_headers).join(", "));
    }
  }
  head += rendered.head;
  const html = options2.templates.app({
    head,
    body: body2,
    assets: assets$1,
    nonce: (
      /** @type {string} */
      csp.nonce
    ),
    env: public_env
  });
  const transformed = await resolve_opts.transformPageChunk({
    html,
    done: true
  }) || "";
  if (!chunks) {
    headers2.set("etag", `"${hash(transformed)}"`);
  }
  return !chunks ? text(transformed, {
    status,
    headers: headers2
  }) : new Response(
    new ReadableStream({
      async start(controller2) {
        controller2.enqueue(text_encoder2.encode(transformed + "\n"));
        for await (const chunk of chunks) {
          if (chunk.length) controller2.enqueue(text_encoder2.encode(chunk));
        }
        controller2.close();
      },
      type: "bytes"
    }),
    {
      headers: headers2
    }
  );
}
var PageNodes = class {
  data;
  /**
   * @param {Array<import('types').SSRNode | undefined>} nodes
   */
  constructor(nodes) {
    this.data = nodes;
  }
  layouts() {
    return this.data.slice(0, -1);
  }
  page() {
    return this.data.at(-1);
  }
  validate() {
    for (const layout of this.layouts()) {
      if (layout) {
        validate_layout_server_exports(
          layout.server,
          /** @type {string} */
          layout.server_id
        );
        validate_layout_exports(
          layout.universal,
          /** @type {string} */
          layout.universal_id
        );
      }
    }
    const page2 = this.page();
    if (page2) {
      validate_page_server_exports(
        page2.server,
        /** @type {string} */
        page2.server_id
      );
      validate_page_exports(
        page2.universal,
        /** @type {string} */
        page2.universal_id
      );
    }
  }
  /**
   * @template {'prerender' | 'ssr' | 'csr' | 'trailingSlash'} Option
   * @param {Option} option
   * @returns {Value | undefined}
   */
  #get_option(option) {
    return this.data.reduce(
      (value, node) => {
        return node?.universal?.[option] ?? node?.server?.[option] ?? value;
      },
      /** @type {Value | undefined} */
      void 0
    );
  }
  csr() {
    return this.#get_option("csr") ?? true;
  }
  ssr() {
    return this.#get_option("ssr") ?? true;
  }
  prerender() {
    return this.#get_option("prerender") ?? false;
  }
  trailing_slash() {
    return this.#get_option("trailingSlash") ?? "never";
  }
  get_config() {
    let current2 = {};
    for (const node of this.data) {
      if (!node?.universal?.config && !node?.server?.config) continue;
      current2 = {
        ...current2,
        // TODO: should we override the server config value with the universal value similar to other page options?
        ...node?.universal?.config,
        ...node?.server?.config
      };
    }
    return Object.keys(current2).length ? current2 : void 0;
  }
  should_prerender_data() {
    return this.data.some(
      // prerender in case of trailingSlash because the client retrieves that value from the server
      (node) => node?.server?.load || node?.server?.trailingSlash !== void 0
    );
  }
};
async function respond_with_error({
  event,
  event_state,
  options: options2,
  manifest: manifest2,
  state: state2,
  status,
  error: error2,
  resolve_opts
}) {
  if (event.request.headers.get("x-sveltekit-error")) {
    return static_error_page(
      options2,
      status,
      /** @type {Error} */
      error2.message
    );
  }
  const fetched = [];
  try {
    const branch2 = [];
    const default_layout = await manifest2._.nodes[0]();
    const nodes = new PageNodes([default_layout]);
    const ssr = nodes.ssr();
    const csr = nodes.csr();
    const data_serializer = server_data_serializer(event, event_state, options2);
    if (ssr) {
      state2.error = true;
      const server_data_promise = load_server_data({
        event,
        event_state,
        state: state2,
        node: default_layout,
        // eslint-disable-next-line @typescript-eslint/require-await
        parent: async () => ({})
      });
      const server_data = await server_data_promise;
      data_serializer.add_node(0, server_data);
      const data = await load_data({
        event,
        event_state,
        fetched,
        node: default_layout,
        // eslint-disable-next-line @typescript-eslint/require-await
        parent: async () => ({}),
        resolve_opts,
        server_data_promise,
        state: state2,
        csr
      });
      branch2.push(
        {
          node: default_layout,
          server_data,
          data
        },
        {
          node: await manifest2._.nodes[1](),
          // 1 is always the root error
          data: null,
          server_data: null
        }
      );
    }
    return await render_response({
      options: options2,
      manifest: manifest2,
      state: state2,
      page_config: {
        ssr,
        csr
      },
      status,
      error: await handle_error_and_jsonify(event, event_state, options2, error2),
      branch: branch2,
      fetched,
      event,
      event_state,
      resolve_opts,
      data_serializer
    });
  } catch (e3) {
    if (e3 instanceof Redirect) {
      return redirect_response(e3.status, e3.location);
    }
    return static_error_page(
      options2,
      get_status(e3),
      (await handle_error_and_jsonify(event, event_state, options2, e3)).message
    );
  }
}
async function handle_remote_call(event, state2, options2, manifest2, id) {
  return record_span({
    name: "sveltekit.remote.call",
    attributes: {},
    fn: (current2) => {
      const traced_event = merge_tracing(event, current2);
      return with_request_store(
        { event: traced_event, state: state2 },
        () => handle_remote_call_internal(traced_event, state2, options2, manifest2, id)
      );
    }
  });
}
async function handle_remote_call_internal(event, state2, options2, manifest2, id) {
  const [hash2, name, additional_args] = id.split("/");
  const remotes = manifest2._.remotes;
  if (!remotes[hash2]) error(404);
  const module = await remotes[hash2]();
  const fn = module.default[name];
  if (!fn) error(404);
  const info = fn.__;
  const transport = options2.hooks.transport;
  event.tracing.current.setAttributes({
    "sveltekit.remote.call.type": info.type,
    "sveltekit.remote.call.name": info.name
  });
  let form_client_refreshes;
  try {
    if (info.type === "query_batch") {
      if (event.request.method !== "POST") {
        throw new SvelteKitError(
          405,
          "Method Not Allowed",
          `\`query.batch\` functions must be invoked via POST request, not ${event.request.method}`
        );
      }
      const { payloads } = await event.request.json();
      const args = await Promise.all(
        payloads.map((payload2) => parse_remote_arg(payload2, transport))
      );
      const results = await with_request_store({ event, state: state2 }, () => info.run(args, options2));
      return json(
        /** @type {RemoteFunctionResponse} */
        {
          type: "result",
          result: stringify(results, transport)
        }
      );
    }
    if (info.type === "form") {
      if (event.request.method !== "POST") {
        throw new SvelteKitError(
          405,
          "Method Not Allowed",
          `\`form\` functions must be invoked via POST request, not ${event.request.method}`
        );
      }
      if (!is_form_content_type(event.request)) {
        throw new SvelteKitError(
          415,
          "Unsupported Media Type",
          `\`form\` functions expect form-encoded data \u2014 received ${event.request.headers.get(
            "content-type"
          )}`
        );
      }
      const { data: data2, meta, form_data } = await deserialize_binary_form(event.request);
      if (additional_args && !("id" in data2)) {
        data2.id = JSON.parse(decodeURIComponent(additional_args));
      }
      const fn2 = info.fn;
      const result = await with_request_store({ event, state: state2 }, () => fn2(data2, meta, form_data));
      return json(
        /** @type {RemoteFunctionResponse} */
        {
          type: "result",
          result: stringify(result, transport),
          refreshes: result.issues ? void 0 : await serialize_refreshes(meta.remote_refreshes)
        }
      );
    }
    if (info.type === "command") {
      const { payload: payload2, refreshes } = await event.request.json();
      const arg = parse_remote_arg(payload2, transport);
      const data2 = await with_request_store({ event, state: state2 }, () => fn(arg));
      return json(
        /** @type {RemoteFunctionResponse} */
        {
          type: "result",
          result: stringify(data2, transport),
          refreshes: await serialize_refreshes(refreshes)
        }
      );
    }
    const payload = info.type === "prerender" ? additional_args : (
      /** @type {string} */
      // new URL(...) necessary because we're hiding the URL from the user in the event object
      new URL(event.request.url).searchParams.get("payload")
    );
    const data = await with_request_store(
      { event, state: state2 },
      () => fn(parse_remote_arg(payload, transport))
    );
    return json(
      /** @type {RemoteFunctionResponse} */
      {
        type: "result",
        result: stringify(data, transport)
      }
    );
  } catch (error2) {
    if (error2 instanceof Redirect) {
      return json(
        /** @type {RemoteFunctionResponse} */
        {
          type: "redirect",
          location: error2.location,
          refreshes: await serialize_refreshes(form_client_refreshes)
        }
      );
    }
    const status = error2 instanceof HttpError || error2 instanceof SvelteKitError ? error2.status : 500;
    return json(
      /** @type {RemoteFunctionResponse} */
      {
        type: "error",
        error: await handle_error_and_jsonify(event, state2, options2, error2),
        status
      },
      {
        // By setting a non-200 during prerendering we fail the prerender process (unless handleHttpError handles it).
        // Errors at runtime will be passed to the client and are handled there
        status: state2.prerendering ? status : void 0,
        headers: {
          "cache-control": "private, no-store"
        }
      }
    );
  }
  async function serialize_refreshes(client_refreshes) {
    const refreshes = state2.refreshes ?? {};
    if (client_refreshes) {
      for (const key2 of client_refreshes) {
        if (refreshes[key2] !== void 0) continue;
        const [hash3, name2, payload] = key2.split("/");
        const loader = manifest2._.remotes[hash3];
        const fn2 = (await loader?.())?.default?.[name2];
        if (!fn2) error(400, "Bad Request");
        refreshes[key2] = with_request_store(
          { event, state: state2 },
          () => fn2(parse_remote_arg(payload, transport))
        );
      }
    }
    if (Object.keys(refreshes).length === 0) {
      return void 0;
    }
    return stringify(
      Object.fromEntries(
        await Promise.all(
          Object.entries(refreshes).map(async ([key2, promise]) => [key2, await promise])
        )
      ),
      transport
    );
  }
}
async function handle_remote_form_post(event, state2, manifest2, id) {
  return record_span({
    name: "sveltekit.remote.form.post",
    attributes: {},
    fn: (current2) => {
      const traced_event = merge_tracing(event, current2);
      return with_request_store(
        { event: traced_event, state: state2 },
        () => handle_remote_form_post_internal(traced_event, state2, manifest2, id)
      );
    }
  });
}
async function handle_remote_form_post_internal(event, state2, manifest2, id) {
  const [hash2, name, action_id] = id.split("/");
  const remotes = manifest2._.remotes;
  const module = await remotes[hash2]?.();
  let form = (
    /** @type {RemoteForm<any, any>} */
    module?.default[name]
  );
  if (!form) {
    event.setHeaders({
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
      // "The server must generate an Allow header field in a 405 status code response"
      allow: "GET"
    });
    return {
      type: "error",
      error: new SvelteKitError(
        405,
        "Method Not Allowed",
        `POST method not allowed. No form actions exist for ${"this page"}`
      )
    };
  }
  if (action_id) {
    form = with_request_store({ event, state: state2 }, () => form.for(JSON.parse(action_id)));
  }
  try {
    const fn = (
      /** @type {RemoteInfo & { type: 'form' }} */
      /** @type {any} */
      form.__.fn
    );
    const { data, meta, form_data } = await deserialize_binary_form(event.request);
    if (action_id && !("id" in data)) {
      data.id = JSON.parse(decodeURIComponent(action_id));
    }
    await with_request_store({ event, state: state2 }, () => fn(data, meta, form_data));
    return {
      type: "success",
      status: 200
    };
  } catch (e3) {
    const err = normalize_error(e3);
    if (err instanceof Redirect) {
      return {
        type: "redirect",
        status: err.status,
        location: err.location
      };
    }
    return {
      type: "error",
      error: check_incorrect_fail_use(err)
    };
  }
}
function get_remote_id(url) {
  return url.pathname.startsWith(`${base}/${app_dir}/remote/`) && url.pathname.replace(`${base}/${app_dir}/remote/`, "");
}
function get_remote_action(url) {
  return url.searchParams.get("/remote");
}
var MAX_DEPTH = 10;
async function render_page(event, event_state, page2, options2, manifest2, state2, nodes, resolve_opts) {
  if (state2.depth > MAX_DEPTH) {
    return text(`Not found: ${event.url.pathname}`, {
      status: 404
      // TODO in some cases this should be 500. not sure how to differentiate
    });
  }
  if (is_action_json_request(event)) {
    const node = await manifest2._.nodes[page2.leaf]();
    return handle_action_json_request(event, event_state, options2, node?.server);
  }
  try {
    const leaf_node = (
      /** @type {import('types').SSRNode} */
      nodes.page()
    );
    let status = 200;
    let action_result = void 0;
    if (is_action_request(event)) {
      const remote_id = get_remote_action(event.url);
      if (remote_id) {
        action_result = await handle_remote_form_post(event, event_state, manifest2, remote_id);
      } else {
        action_result = await handle_action_request(event, event_state, leaf_node.server);
      }
      if (action_result?.type === "redirect") {
        return redirect_response(action_result.status, action_result.location);
      }
      if (action_result?.type === "error") {
        status = get_status(action_result.error);
      }
      if (action_result?.type === "failure") {
        status = action_result.status;
      }
    }
    const should_prerender = nodes.prerender();
    if (should_prerender) {
      const mod = leaf_node.server;
      if (mod?.actions) {
        throw new Error("Cannot prerender pages with actions");
      }
    } else if (state2.prerendering) {
      return new Response(void 0, {
        status: 204
      });
    }
    state2.prerender_default = should_prerender;
    const should_prerender_data = nodes.should_prerender_data();
    const data_pathname = add_data_suffix2(event.url.pathname);
    const fetched = [];
    const ssr = nodes.ssr();
    const csr = nodes.csr();
    if (ssr === false && !(state2.prerendering && should_prerender_data)) {
      if (dev && action_result && !event.request.headers.has("x-sveltekit-action")) ;
      return await render_response({
        branch: [],
        fetched,
        page_config: {
          ssr: false,
          csr
        },
        status,
        error: null,
        event,
        event_state,
        options: options2,
        manifest: manifest2,
        state: state2,
        resolve_opts,
        data_serializer: server_data_serializer(event, event_state, options2)
      });
    }
    const branch2 = [];
    let load_error = null;
    const data_serializer = server_data_serializer(event, event_state, options2);
    const data_serializer_json = state2.prerendering && should_prerender_data ? server_data_serializer_json(event, event_state, options2) : null;
    const server_promises = nodes.data.map((node, i) => {
      if (load_error) {
        throw load_error;
      }
      return Promise.resolve().then(async () => {
        try {
          if (node === leaf_node && action_result?.type === "error") {
            throw action_result.error;
          }
          const server_data = await load_server_data({
            event,
            event_state,
            state: state2,
            node,
            parent: async () => {
              const data = {};
              for (let j = 0; j < i; j += 1) {
                const parent = await server_promises[j];
                if (parent) Object.assign(data, parent.data);
              }
              return data;
            }
          });
          if (node) {
            data_serializer.add_node(i, server_data);
          }
          data_serializer_json?.add_node(i, server_data);
          return server_data;
        } catch (e3) {
          load_error = /** @type {Error} */
          e3;
          throw load_error;
        }
      });
    });
    const load_promises = nodes.data.map((node, i) => {
      if (load_error) throw load_error;
      return Promise.resolve().then(async () => {
        try {
          return await load_data({
            event,
            event_state,
            fetched,
            node,
            parent: async () => {
              const data = {};
              for (let j = 0; j < i; j += 1) {
                Object.assign(data, await load_promises[j]);
              }
              return data;
            },
            resolve_opts,
            server_data_promise: server_promises[i],
            state: state2,
            csr
          });
        } catch (e3) {
          load_error = /** @type {Error} */
          e3;
          throw load_error;
        }
      });
    });
    for (const p of server_promises) p.catch(() => {
    });
    for (const p of load_promises) p.catch(() => {
    });
    for (let i = 0; i < nodes.data.length; i += 1) {
      const node = nodes.data[i];
      if (node) {
        try {
          const server_data = await server_promises[i];
          const data = await load_promises[i];
          branch2.push({ node, server_data, data });
        } catch (e3) {
          const err = normalize_error(e3);
          if (err instanceof Redirect) {
            if (state2.prerendering && should_prerender_data) {
              const body2 = JSON.stringify({
                type: "redirect",
                location: err.location
              });
              state2.prerendering.dependencies.set(data_pathname, {
                response: text(body2),
                body: body2
              });
            }
            return redirect_response(err.status, err.location);
          }
          const status2 = get_status(err);
          const error2 = await handle_error_and_jsonify(event, event_state, options2, err);
          while (i--) {
            if (page2.errors[i]) {
              const index3 = (
                /** @type {number} */
                page2.errors[i]
              );
              const node2 = await manifest2._.nodes[index3]();
              let j = i;
              while (!branch2[j]) j -= 1;
              data_serializer.set_max_nodes(j + 1);
              const layouts = compact(branch2.slice(0, j + 1));
              const nodes2 = new PageNodes(layouts.map((layout) => layout.node));
              return await render_response({
                event,
                event_state,
                options: options2,
                manifest: manifest2,
                state: state2,
                resolve_opts,
                page_config: {
                  ssr: nodes2.ssr(),
                  csr: nodes2.csr()
                },
                status: status2,
                error: error2,
                branch: layouts.concat({
                  node: node2,
                  data: null,
                  server_data: null
                }),
                fetched,
                data_serializer
              });
            }
          }
          return static_error_page(options2, status2, error2.message);
        }
      } else {
        branch2.push(null);
      }
    }
    if (state2.prerendering && data_serializer_json) {
      let { data, chunks } = data_serializer_json.get_data();
      if (chunks) {
        for await (const chunk of chunks) {
          data += chunk;
        }
      }
      state2.prerendering.dependencies.set(data_pathname, {
        response: text(data),
        body: data
      });
    }
    return await render_response({
      event,
      event_state,
      options: options2,
      manifest: manifest2,
      state: state2,
      resolve_opts,
      page_config: {
        csr,
        ssr
      },
      status,
      error: null,
      branch: ssr === false ? [] : compact(branch2),
      action_result,
      fetched,
      data_serializer: ssr === false ? server_data_serializer(event, event_state, options2) : data_serializer
    });
  } catch (e3) {
    return await respond_with_error({
      event,
      event_state,
      options: options2,
      manifest: manifest2,
      state: state2,
      status: 500,
      error: e3,
      resolve_opts
    });
  }
}
function once(fn) {
  let done = false;
  let result;
  return () => {
    if (done) return result;
    done = true;
    return result = fn();
  };
}
async function render_data(event, event_state, route, options2, manifest2, state2, invalidated_data_nodes, trailing_slash) {
  if (!route.page) {
    return new Response(void 0, {
      status: 404
    });
  }
  try {
    const node_ids = [...route.page.layouts, route.page.leaf];
    const invalidated = invalidated_data_nodes ?? node_ids.map(() => true);
    let aborted = false;
    const url = new URL(event.url);
    url.pathname = normalize_path(url.pathname, trailing_slash);
    const new_event = { ...event, url };
    const functions = node_ids.map((n2, i) => {
      return once(async () => {
        try {
          if (aborted) {
            return (
              /** @type {import('types').ServerDataSkippedNode} */
              {
                type: "skip"
              }
            );
          }
          const node = n2 == void 0 ? n2 : await manifest2._.nodes[n2]();
          return load_server_data({
            event: new_event,
            event_state,
            state: state2,
            node,
            parent: async () => {
              const data2 = {};
              for (let j = 0; j < i; j += 1) {
                const parent = (
                  /** @type {import('types').ServerDataNode | null} */
                  await functions[j]()
                );
                if (parent) {
                  Object.assign(data2, parent.data);
                }
              }
              return data2;
            }
          });
        } catch (e3) {
          aborted = true;
          throw e3;
        }
      });
    });
    const promises = functions.map(async (fn, i) => {
      if (!invalidated[i]) {
        return (
          /** @type {import('types').ServerDataSkippedNode} */
          {
            type: "skip"
          }
        );
      }
      return fn();
    });
    let length = promises.length;
    const nodes = await Promise.all(
      promises.map(
        (p, i) => p.catch(async (error2) => {
          if (error2 instanceof Redirect) {
            throw error2;
          }
          length = Math.min(length, i + 1);
          return (
            /** @type {import('types').ServerErrorNode} */
            {
              type: "error",
              error: await handle_error_and_jsonify(event, event_state, options2, error2),
              status: error2 instanceof HttpError || error2 instanceof SvelteKitError ? error2.status : void 0
            }
          );
        })
      )
    );
    const data_serializer = server_data_serializer_json(event, event_state, options2);
    for (let i = 0; i < nodes.length; i++) data_serializer.add_node(i, nodes[i]);
    const { data, chunks } = data_serializer.get_data();
    if (!chunks) {
      return json_response(data);
    }
    return new Response(
      new ReadableStream({
        async start(controller2) {
          controller2.enqueue(text_encoder2.encode(data));
          for await (const chunk of chunks) {
            controller2.enqueue(text_encoder2.encode(chunk));
          }
          controller2.close();
        },
        type: "bytes"
      }),
      {
        headers: {
          // we use a proprietary content type to prevent buffering.
          // the `text` prefix makes it inspectable
          "content-type": "text/sveltekit-data",
          "cache-control": "private, no-store"
        }
      }
    );
  } catch (e3) {
    const error2 = normalize_error(e3);
    if (error2 instanceof Redirect) {
      return redirect_json_response(error2);
    } else {
      return json_response(await handle_error_and_jsonify(event, event_state, options2, error2), 500);
    }
  }
}
function json_response(json2, status = 200) {
  return text(typeof json2 === "string" ? json2 : JSON.stringify(json2), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "private, no-store"
    }
  });
}
function redirect_json_response(redirect) {
  return json_response(
    /** @type {import('types').ServerRedirectNode} */
    {
      type: "redirect",
      location: redirect.location
    }
  );
}
var cookie = {};
var hasRequiredCookie;
function requireCookie() {
  if (hasRequiredCookie) return cookie;
  hasRequiredCookie = 1;
  cookie.parse = parse2;
  cookie.serialize = serialize;
  var __toString = Object.prototype.toString;
  var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
  function parse2(str, options2) {
    if (typeof str !== "string") {
      throw new TypeError("argument str must be a string");
    }
    var obj = {};
    var opt = options2 || {};
    var dec = opt.decode || decode;
    var index3 = 0;
    while (index3 < str.length) {
      var eqIdx = str.indexOf("=", index3);
      if (eqIdx === -1) {
        break;
      }
      var endIdx = str.indexOf(";", index3);
      if (endIdx === -1) {
        endIdx = str.length;
      } else if (endIdx < eqIdx) {
        index3 = str.lastIndexOf(";", eqIdx - 1) + 1;
        continue;
      }
      var key2 = str.slice(index3, eqIdx).trim();
      if (void 0 === obj[key2]) {
        var val = str.slice(eqIdx + 1, endIdx).trim();
        if (val.charCodeAt(0) === 34) {
          val = val.slice(1, -1);
        }
        obj[key2] = tryDecode(val, dec);
      }
      index3 = endIdx + 1;
    }
    return obj;
  }
  function serialize(name, val, options2) {
    var opt = options2 || {};
    var enc = opt.encode || encode2;
    if (typeof enc !== "function") {
      throw new TypeError("option encode is invalid");
    }
    if (!fieldContentRegExp.test(name)) {
      throw new TypeError("argument name is invalid");
    }
    var value = enc(val);
    if (value && !fieldContentRegExp.test(value)) {
      throw new TypeError("argument val is invalid");
    }
    var str = name + "=" + value;
    if (null != opt.maxAge) {
      var maxAge = opt.maxAge - 0;
      if (isNaN(maxAge) || !isFinite(maxAge)) {
        throw new TypeError("option maxAge is invalid");
      }
      str += "; Max-Age=" + Math.floor(maxAge);
    }
    if (opt.domain) {
      if (!fieldContentRegExp.test(opt.domain)) {
        throw new TypeError("option domain is invalid");
      }
      str += "; Domain=" + opt.domain;
    }
    if (opt.path) {
      if (!fieldContentRegExp.test(opt.path)) {
        throw new TypeError("option path is invalid");
      }
      str += "; Path=" + opt.path;
    }
    if (opt.expires) {
      var expires = opt.expires;
      if (!isDate(expires) || isNaN(expires.valueOf())) {
        throw new TypeError("option expires is invalid");
      }
      str += "; Expires=" + expires.toUTCString();
    }
    if (opt.httpOnly) {
      str += "; HttpOnly";
    }
    if (opt.secure) {
      str += "; Secure";
    }
    if (opt.partitioned) {
      str += "; Partitioned";
    }
    if (opt.priority) {
      var priority = typeof opt.priority === "string" ? opt.priority.toLowerCase() : opt.priority;
      switch (priority) {
        case "low":
          str += "; Priority=Low";
          break;
        case "medium":
          str += "; Priority=Medium";
          break;
        case "high":
          str += "; Priority=High";
          break;
        default:
          throw new TypeError("option priority is invalid");
      }
    }
    if (opt.sameSite) {
      var sameSite = typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite;
      switch (sameSite) {
        case true:
          str += "; SameSite=Strict";
          break;
        case "lax":
          str += "; SameSite=Lax";
          break;
        case "strict":
          str += "; SameSite=Strict";
          break;
        case "none":
          str += "; SameSite=None";
          break;
        default:
          throw new TypeError("option sameSite is invalid");
      }
    }
    return str;
  }
  function decode(str) {
    return str.indexOf("%") !== -1 ? decodeURIComponent(str) : str;
  }
  function encode2(val) {
    return encodeURIComponent(val);
  }
  function isDate(val) {
    return __toString.call(val) === "[object Date]" || val instanceof Date;
  }
  function tryDecode(str, decode2) {
    try {
      return decode2(str);
    } catch (e3) {
      return str;
    }
  }
  return cookie;
}
var cookieExports = requireCookie();
var INVALID_COOKIE_CHARACTER_REGEX = /[\x00-\x1F\x7F()<>@,;:"/[\]?={} \t]/;
function validate_options(options2) {
  if (options2?.path === void 0) {
    throw new Error("You must specify a `path` when setting, deleting or serializing cookies");
  }
}
function generate_cookie_key(domain, path, name) {
  return `${domain || ""}${path}?${encodeURIComponent(name)}`;
}
function get_cookies(request, url) {
  const header = request.headers.get("cookie") ?? "";
  const initial_cookies = cookieExports.parse(header, { decode: (value) => value });
  let normalized_url;
  const new_cookies = /* @__PURE__ */ new Map();
  const defaults = {
    httpOnly: true,
    sameSite: "lax",
    secure: url.hostname === "localhost" && url.protocol === "http:" ? false : true
  };
  const cookies = {
    // The JSDoc param annotations appearing below for get, set and delete
    // are necessary to expose the `cookie` library types to
    // typescript users. `@type {import('@sveltejs/kit').Cookies}` above is not
    // sufficient to do so.
    /**
     * @param {string} name
     * @param {import('cookie').CookieParseOptions} [opts]
     */
    get(name, opts) {
      const best_match = Array.from(new_cookies.values()).filter((c2) => {
        return c2.name === name && domain_matches(url.hostname, c2.options.domain) && path_matches(url.pathname, c2.options.path);
      }).sort((a, b) => b.options.path.length - a.options.path.length)[0];
      if (best_match) {
        return best_match.options.maxAge === 0 ? void 0 : best_match.value;
      }
      const req_cookies = cookieExports.parse(header, { decode: opts?.decode });
      const cookie2 = req_cookies[name];
      return cookie2;
    },
    /**
     * @param {import('cookie').CookieParseOptions} [opts]
     */
    getAll(opts) {
      const cookies2 = cookieExports.parse(header, { decode: opts?.decode });
      const lookup = /* @__PURE__ */ new Map();
      for (const c2 of new_cookies.values()) {
        if (domain_matches(url.hostname, c2.options.domain) && path_matches(url.pathname, c2.options.path)) {
          const existing = lookup.get(c2.name);
          if (!existing || c2.options.path.length > existing.options.path.length) {
            lookup.set(c2.name, c2);
          }
        }
      }
      for (const c2 of lookup.values()) {
        cookies2[c2.name] = c2.value;
      }
      return Object.entries(cookies2).map(([name, value]) => ({ name, value }));
    },
    /**
     * @param {string} name
     * @param {string} value
     * @param {import('./page/types.js').Cookie['options']} options
     */
    set(name, value, options2) {
      const illegal_characters = name.match(INVALID_COOKIE_CHARACTER_REGEX);
      if (illegal_characters) {
        console.warn(
          `The cookie name "${name}" will be invalid in SvelteKit 3.0 as it contains ${illegal_characters.join(
            " and "
          )}. See RFC 2616 for more details https://datatracker.ietf.org/doc/html/rfc2616#section-2.2`
        );
      }
      validate_options(options2);
      set_internal(name, value, { ...defaults, ...options2 });
    },
    /**
     * @param {string} name
     *  @param {import('./page/types.js').Cookie['options']} options
     */
    delete(name, options2) {
      validate_options(options2);
      cookies.set(name, "", { ...options2, maxAge: 0 });
    },
    /**
     * @param {string} name
     * @param {string} value
     *  @param {import('./page/types.js').Cookie['options']} options
     */
    serialize(name, value, options2) {
      validate_options(options2);
      let path = options2.path;
      if (!options2.domain || options2.domain === url.hostname) {
        if (!normalized_url) {
          throw new Error("Cannot serialize cookies until after the route is determined");
        }
        path = resolve(normalized_url, path);
      }
      return cookieExports.serialize(name, value, { ...defaults, ...options2, path });
    }
  };
  function get_cookie_header(destination, header2) {
    const combined_cookies = {
      // cookies sent by the user agent have lowest precedence
      ...initial_cookies
    };
    for (const cookie2 of new_cookies.values()) {
      if (!domain_matches(destination.hostname, cookie2.options.domain)) continue;
      if (!path_matches(destination.pathname, cookie2.options.path)) continue;
      const encoder = cookie2.options.encode || encodeURIComponent;
      combined_cookies[cookie2.name] = encoder(cookie2.value);
    }
    if (header2) {
      const parsed = cookieExports.parse(header2, { decode: (value) => value });
      for (const name in parsed) {
        combined_cookies[name] = parsed[name];
      }
    }
    return Object.entries(combined_cookies).map(([name, value]) => `${name}=${value}`).join("; ");
  }
  const internal_queue = [];
  function set_internal(name, value, options2) {
    if (!normalized_url) {
      internal_queue.push(() => set_internal(name, value, options2));
      return;
    }
    let path = options2.path;
    if (!options2.domain || options2.domain === url.hostname) {
      path = resolve(normalized_url, path);
    }
    const cookie_key = generate_cookie_key(options2.domain, path, name);
    const cookie2 = { name, value, options: { ...options2, path } };
    new_cookies.set(cookie_key, cookie2);
  }
  function set_trailing_slash(trailing_slash) {
    normalized_url = normalize_path(url.pathname, trailing_slash);
    internal_queue.forEach((fn) => fn());
  }
  return { cookies, new_cookies, get_cookie_header, set_internal, set_trailing_slash };
}
function domain_matches(hostname, constraint) {
  if (!constraint) return true;
  const normalized = constraint[0] === "." ? constraint.slice(1) : constraint;
  if (hostname === normalized) return true;
  return hostname.endsWith("." + normalized);
}
function path_matches(path, constraint) {
  if (!constraint) return true;
  const normalized = constraint.endsWith("/") ? constraint.slice(0, -1) : constraint;
  if (path === normalized) return true;
  return path.startsWith(normalized + "/");
}
function add_cookies_to_headers(headers2, cookies) {
  for (const new_cookie of cookies) {
    const { name, value, options: options2 } = new_cookie;
    headers2.append("set-cookie", cookieExports.serialize(name, value, options2));
    if (options2.path.endsWith(".html")) {
      const path = add_data_suffix2(options2.path);
      headers2.append("set-cookie", cookieExports.serialize(name, value, { ...options2, path }));
    }
  }
}
var defaultParseOptions = {
  decodeValues: true,
  map: false,
  silent: false,
  split: "auto"
  // auto = split strings but not arrays
};
function isForbiddenKey(key2) {
  return typeof key2 !== "string" || key2 in {};
}
function createNullObj() {
  return /* @__PURE__ */ Object.create(null);
}
function isNonEmptyString(str) {
  return typeof str === "string" && !!str.trim();
}
function parseString(setCookieValue, options2) {
  var parts = setCookieValue.split(";").filter(isNonEmptyString);
  var nameValuePairStr = parts.shift();
  var parsed = parseNameValuePair(nameValuePairStr);
  var name = parsed.name;
  var value = parsed.value;
  options2 = options2 ? Object.assign({}, defaultParseOptions, options2) : defaultParseOptions;
  if (isForbiddenKey(name)) {
    return null;
  }
  try {
    value = options2.decodeValues ? decodeURIComponent(value) : value;
  } catch (e3) {
    console.error(
      "set-cookie-parser: failed to decode cookie value. Set options.decodeValues=false to disable decoding.",
      e3
    );
  }
  var cookie2 = createNullObj();
  cookie2.name = name;
  cookie2.value = value;
  parts.forEach(function(part) {
    var sides = part.split("=");
    var key2 = sides.shift().trimLeft().toLowerCase();
    if (isForbiddenKey(key2)) {
      return;
    }
    var value2 = sides.join("=");
    if (key2 === "expires") {
      cookie2.expires = new Date(value2);
    } else if (key2 === "max-age") {
      var n2 = parseInt(value2, 10);
      if (!Number.isNaN(n2)) cookie2.maxAge = n2;
    } else if (key2 === "secure") {
      cookie2.secure = true;
    } else if (key2 === "httponly") {
      cookie2.httpOnly = true;
    } else if (key2 === "samesite") {
      cookie2.sameSite = value2;
    } else if (key2 === "partitioned") {
      cookie2.partitioned = true;
    } else if (key2) {
      cookie2[key2] = value2;
    }
  });
  return cookie2;
}
function parseNameValuePair(nameValuePairStr) {
  var name = "";
  var value = "";
  var nameValueArr = nameValuePairStr.split("=");
  if (nameValueArr.length > 1) {
    name = nameValueArr.shift();
    value = nameValueArr.join("=");
  } else {
    value = nameValuePairStr;
  }
  return { name, value };
}
function parseSetCookie(input, options2) {
  options2 = options2 ? Object.assign({}, defaultParseOptions, options2) : defaultParseOptions;
  if (!input) {
    if (!options2.map) {
      return [];
    } else {
      return createNullObj();
    }
  }
  if (input.headers) {
    if (typeof input.headers.getSetCookie === "function") {
      input = input.headers.getSetCookie();
    } else if (input.headers["set-cookie"]) {
      input = input.headers["set-cookie"];
    } else {
      var sch = input.headers[Object.keys(input.headers).find(function(key2) {
        return key2.toLowerCase() === "set-cookie";
      })];
      if (!sch && input.headers.cookie && !options2.silent) {
        console.warn(
          "Warning: set-cookie-parser appears to have been called on a request object. It is designed to parse Set-Cookie headers from responses, not Cookie headers from requests. Set the option {silent: true} to suppress this warning."
        );
      }
      input = sch;
    }
  }
  var split = options2.split;
  var isArray = Array.isArray(input);
  if (split === "auto") {
    split = !isArray;
  }
  if (!isArray) {
    input = [input];
  }
  input = input.filter(isNonEmptyString);
  if (split) {
    input = input.map(splitCookiesString).flat();
  }
  if (!options2.map) {
    return input.map(function(str) {
      return parseString(str, options2);
    }).filter(Boolean);
  } else {
    var cookies = createNullObj();
    return input.reduce(function(cookies2, str) {
      var cookie2 = parseString(str, options2);
      if (cookie2 && !isForbiddenKey(cookie2.name)) {
        cookies2[cookie2.name] = cookie2;
      }
      return cookies2;
    }, cookies);
  }
}
function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString;
  }
  if (typeof cookiesString !== "string") {
    return [];
  }
  var cookiesStrings = [];
  var pos = 0;
  var start;
  var ch;
  var lastComma;
  var nextStart;
  var cookiesSeparatorFound;
  function skipWhitespace() {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  }
  function notSpecialChar() {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  }
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.substring(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.substring(start, cookiesString.length));
    }
  }
  return cookiesStrings;
}
parseSetCookie.parseSetCookie = parseSetCookie;
parseSetCookie.parse = parseSetCookie;
parseSetCookie.parseString = parseString;
parseSetCookie.splitCookiesString = splitCookiesString;
function create_fetch({ event, options: options2, manifest: manifest2, state: state2, get_cookie_header, set_internal }) {
  const server_fetch = async (info, init2) => {
    const original_request = normalize_fetch_input(info, init2, event.url);
    let mode = (info instanceof Request ? info.mode : init2?.mode) ?? "cors";
    let credentials = (info instanceof Request ? info.credentials : init2?.credentials) ?? "same-origin";
    return options2.hooks.handleFetch({
      event,
      request: original_request,
      fetch: async (info2, init3) => {
        const request = normalize_fetch_input(info2, init3, event.url);
        const url = new URL(request.url);
        if (!request.headers.has("origin")) {
          request.headers.set("origin", event.url.origin);
        }
        if (info2 !== original_request) {
          mode = (info2 instanceof Request ? info2.mode : init3?.mode) ?? "cors";
          credentials = (info2 instanceof Request ? info2.credentials : init3?.credentials) ?? "same-origin";
        }
        if ((request.method === "GET" || request.method === "HEAD") && (mode === "no-cors" && url.origin !== event.url.origin || url.origin === event.url.origin)) {
          request.headers.delete("origin");
        }
        if (url.origin !== event.url.origin) {
          if (`.${url.hostname}`.endsWith(`.${event.url.hostname}`) && credentials !== "omit") {
            const cookie2 = get_cookie_header(url, request.headers.get("cookie"));
            if (cookie2) request.headers.set("cookie", cookie2);
          }
          return fetch(request);
        }
        const prefix = assets || base;
        const decoded = decodeURIComponent(url.pathname);
        const filename = (decoded.startsWith(prefix) ? decoded.slice(prefix.length) : decoded).slice(1);
        const filename_html = `${filename}/index.html`;
        const is_asset = manifest2.assets.has(filename) || filename in manifest2._.server_assets;
        const is_asset_html = manifest2.assets.has(filename_html) || filename_html in manifest2._.server_assets;
        if (is_asset || is_asset_html) {
          const file = is_asset ? filename : filename_html;
          if (state2.read) {
            const type = is_asset ? manifest2.mimeTypes[filename.slice(filename.lastIndexOf("."))] : "text/html";
            return new Response(state2.read(file), {
              headers: type ? { "content-type": type } : {}
            });
          } else if (read_implementation && file in manifest2._.server_assets) {
            const length = manifest2._.server_assets[file];
            const type = manifest2.mimeTypes[file.slice(file.lastIndexOf("."))];
            return new Response(read_implementation(file), {
              headers: {
                "Content-Length": "" + length,
                "Content-Type": type
              }
            });
          }
          return await fetch(request);
        }
        if (has_prerendered_path(manifest2, base + decoded)) {
          return await fetch(request);
        }
        if (credentials !== "omit") {
          const cookie2 = get_cookie_header(url, request.headers.get("cookie"));
          if (cookie2) {
            request.headers.set("cookie", cookie2);
          }
          const authorization = event.request.headers.get("authorization");
          if (authorization && !request.headers.has("authorization")) {
            request.headers.set("authorization", authorization);
          }
        }
        if (!request.headers.has("accept")) {
          request.headers.set("accept", "*/*");
        }
        if (!request.headers.has("accept-language")) {
          request.headers.set(
            "accept-language",
            /** @type {string} */
            event.request.headers.get("accept-language")
          );
        }
        const response = await internal_fetch(request, options2, manifest2, state2);
        const set_cookie = response.headers.get("set-cookie");
        if (set_cookie) {
          for (const str of splitCookiesString(set_cookie)) {
            const { name, value, ...options3 } = parseString(str, {
              decodeValues: false
            });
            const path = options3.path ?? (url.pathname.split("/").slice(0, -1).join("/") || "/");
            set_internal(name, value, {
              path,
              encode: (value2) => value2,
              .../** @type {import('cookie').CookieSerializeOptions} */
              options3
            });
          }
        }
        return response;
      }
    });
  };
  return (input, init2) => {
    const response = server_fetch(input, init2);
    response.catch(() => {
    });
    return response;
  };
}
function normalize_fetch_input(info, init2, url) {
  if (info instanceof Request) {
    return info;
  }
  return new Request(typeof info === "string" ? new URL(info, url) : info, init2);
}
async function internal_fetch(request, options2, manifest2, state2) {
  if (request.signal) {
    if (request.signal.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }
    let remove_abort_listener = () => {
    };
    const abort_promise = new Promise((_, reject) => {
      const on_abort = () => {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      };
      request.signal.addEventListener("abort", on_abort, { once: true });
      remove_abort_listener = () => request.signal.removeEventListener("abort", on_abort);
    });
    const result = await Promise.race([
      respond(request, options2, manifest2, {
        ...state2,
        depth: state2.depth + 1
      }),
      abort_promise
    ]);
    remove_abort_listener();
    return result;
  } else {
    return await respond(request, options2, manifest2, {
      ...state2,
      depth: state2.depth + 1
    });
  }
}
var body;
var etag;
var headers;
function get_public_env(request) {
  body ??= `export const env=${JSON.stringify(public_env)}`;
  etag ??= `W/${Date.now()}`;
  headers ??= new Headers({
    "content-type": "application/javascript; charset=utf-8",
    etag
  });
  if (request.headers.get("if-none-match") === etag) {
    return new Response(void 0, { status: 304, headers });
  }
  return new Response(body, { headers });
}
var default_transform = ({ html }) => html;
var default_filter = () => false;
var default_preload = ({ type }) => type === "js" || type === "css";
var page_methods = /* @__PURE__ */ new Set(["GET", "HEAD", "POST"]);
var allowed_page_methods = /* @__PURE__ */ new Set(["GET", "HEAD", "OPTIONS"]);
var respond = propagate_context(internal_respond);
async function internal_respond(request, options2, manifest2, state2) {
  const url = new URL(request.url);
  const is_route_resolution_request = has_resolution_suffix2(url.pathname);
  const is_data_request = has_data_suffix2(url.pathname);
  const remote_id = get_remote_id(url);
  {
    const request_origin = request.headers.get("origin");
    if (remote_id) {
      if (request.method !== "GET" && request_origin !== url.origin) {
        const message = "Cross-site remote requests are forbidden";
        return json({ message }, { status: 403 });
      }
    } else if (options2.csrf_check_origin) {
      const forbidden = is_form_content_type(request) && (request.method === "POST" || request.method === "PUT" || request.method === "PATCH" || request.method === "DELETE") && request_origin !== url.origin && (!request_origin || !options2.csrf_trusted_origins.includes(request_origin));
      if (forbidden) {
        const message = `Cross-site ${request.method} form submissions are forbidden`;
        const opts = { status: 403 };
        if (request.headers.get("accept") === "application/json") {
          return json({ message }, opts);
        }
        return text(message, opts);
      }
    }
  }
  if (options2.hash_routing && url.pathname !== base + "/" && url.pathname !== "/[fallback]") {
    return text("Not found", { status: 404 });
  }
  let invalidated_data_nodes;
  if (is_route_resolution_request) {
    url.pathname = strip_resolution_suffix2(url.pathname);
  } else if (is_data_request) {
    url.pathname = strip_data_suffix2(url.pathname) + (url.searchParams.get(TRAILING_SLASH_PARAM) === "1" ? "/" : "") || "/";
    url.searchParams.delete(TRAILING_SLASH_PARAM);
    invalidated_data_nodes = url.searchParams.get(INVALIDATED_PARAM)?.split("").map((node) => node === "1");
    url.searchParams.delete(INVALIDATED_PARAM);
  } else if (remote_id) {
    url.pathname = request.headers.get("x-sveltekit-pathname") ?? base;
    url.search = request.headers.get("x-sveltekit-search") ?? "";
  }
  const headers2 = {};
  const { cookies, new_cookies, get_cookie_header, set_internal, set_trailing_slash } = get_cookies(
    request,
    url
  );
  const event_state = {
    prerendering: state2.prerendering,
    transport: options2.hooks.transport,
    handleValidationError: options2.hooks.handleValidationError,
    tracing: {
      record_span
    },
    is_in_remote_function: false
  };
  const event = {
    cookies,
    // @ts-expect-error `fetch` needs to be created after the `event` itself
    fetch: null,
    getClientAddress: state2.getClientAddress || (() => {
      throw new Error(
        `${"@sveltejs/adapter-cloudflare"} does not specify getClientAddress. Please raise an issue`
      );
    }),
    locals: {},
    params: {},
    platform: state2.platform,
    request,
    route: { id: null },
    setHeaders: (new_headers) => {
      for (const key2 in new_headers) {
        const lower = key2.toLowerCase();
        const value = new_headers[key2];
        if (lower === "set-cookie") {
          throw new Error(
            "Use `event.cookies.set(name, value, options)` instead of `event.setHeaders` to set cookies"
          );
        } else if (lower in headers2) {
          if (lower === "server-timing") {
            headers2[lower] += ", " + value;
          } else {
            throw new Error(`"${key2}" header is already set`);
          }
        } else {
          headers2[lower] = value;
          if (state2.prerendering && lower === "cache-control") {
            state2.prerendering.cache = /** @type {string} */
            value;
          }
        }
      }
    },
    url,
    isDataRequest: is_data_request,
    isSubRequest: state2.depth > 0,
    isRemoteRequest: !!remote_id
  };
  event.fetch = create_fetch({
    event,
    options: options2,
    manifest: manifest2,
    state: state2,
    get_cookie_header,
    set_internal
  });
  if (state2.emulator?.platform) {
    event.platform = await state2.emulator.platform({
      config: {},
      prerender: !!state2.prerendering?.fallback
    });
  }
  let resolved_path = url.pathname;
  if (!remote_id) {
    const prerendering_reroute_state = state2.prerendering?.inside_reroute;
    try {
      if (state2.prerendering) state2.prerendering.inside_reroute = true;
      resolved_path = await options2.hooks.reroute({ url: new URL(url), fetch: event.fetch }) ?? url.pathname;
    } catch {
      return text("Internal Server Error", {
        status: 500
      });
    } finally {
      if (state2.prerendering) state2.prerendering.inside_reroute = prerendering_reroute_state;
    }
  }
  try {
    resolved_path = decode_pathname(resolved_path);
  } catch {
    return text("Malformed URI", { status: 400 });
  }
  if (
    // the resolved path has been decoded so it should be compared to the decoded url pathname
    resolved_path !== decode_pathname(url.pathname) && !state2.prerendering?.fallback && has_prerendered_path(manifest2, resolved_path)
  ) {
    const url2 = new URL(request.url);
    url2.pathname = is_data_request ? add_data_suffix2(resolved_path) : is_route_resolution_request ? add_resolution_suffix2(resolved_path) : resolved_path;
    try {
      const response = await fetch(url2, request);
      const headers22 = new Headers(response.headers);
      if (headers22.has("content-encoding")) {
        headers22.delete("content-encoding");
        headers22.delete("content-length");
      }
      return new Response(response.body, {
        headers: headers22,
        status: response.status,
        statusText: response.statusText
      });
    } catch (error2) {
      return await handle_fatal_error(event, event_state, options2, error2);
    }
  }
  let route = null;
  if (base && !state2.prerendering?.fallback) {
    if (!resolved_path.startsWith(base)) {
      return text("Not found", { status: 404 });
    }
    resolved_path = resolved_path.slice(base.length) || "/";
  }
  if (is_route_resolution_request) {
    return resolve_route(resolved_path, new URL(request.url), manifest2);
  }
  if (resolved_path === `/${app_dir}/env.js`) {
    return get_public_env(request);
  }
  if (!remote_id && resolved_path.startsWith(`/${app_dir}`)) {
    const headers22 = new Headers();
    headers22.set("cache-control", "public, max-age=0, must-revalidate");
    return text("Not found", { status: 404, headers: headers22 });
  }
  if (!state2.prerendering?.fallback) {
    const matchers = await manifest2._.matchers();
    for (const candidate of manifest2._.routes) {
      const match = candidate.pattern.exec(resolved_path);
      if (!match) continue;
      const matched = exec(match, candidate.params, matchers);
      if (matched) {
        route = candidate;
        event.route = { id: route.id };
        event.params = decode_params(matched);
        break;
      }
    }
  }
  let resolve_opts = {
    transformPageChunk: default_transform,
    filterSerializedResponseHeaders: default_filter,
    preload: default_preload
  };
  let trailing_slash = "never";
  try {
    const page_nodes = route?.page ? new PageNodes(await load_page_nodes(route.page, manifest2)) : void 0;
    if (route && !remote_id) {
      if (url.pathname === base || url.pathname === base + "/") {
        trailing_slash = "always";
      } else if (page_nodes) {
        if (dev) ;
        trailing_slash = page_nodes.trailing_slash();
      } else if (route.endpoint) {
        const node = await route.endpoint();
        trailing_slash = node.trailingSlash ?? "never";
        if (dev) ;
      }
      if (!is_data_request) {
        const normalized = normalize_path(url.pathname, trailing_slash);
        if (normalized !== url.pathname && !state2.prerendering?.fallback) {
          return new Response(void 0, {
            status: 308,
            headers: {
              "x-sveltekit-normalize": "1",
              location: (
                // ensure paths starting with '//' are not treated as protocol-relative
                (normalized.startsWith("//") ? url.origin + normalized : normalized) + (url.search === "?" ? "" : url.search)
              )
            }
          });
        }
      }
      if (state2.before_handle || state2.emulator?.platform) {
        let config = {};
        let prerender = false;
        if (route.endpoint) {
          const node = await route.endpoint();
          config = node.config ?? config;
          prerender = node.prerender ?? prerender;
        } else if (page_nodes) {
          config = page_nodes.get_config() ?? config;
          prerender = page_nodes.prerender();
        }
        if (state2.before_handle) {
          state2.before_handle(event, config, prerender);
        }
        if (state2.emulator?.platform) {
          event.platform = await state2.emulator.platform({ config, prerender });
        }
      }
    }
    set_trailing_slash(trailing_slash);
    if (state2.prerendering && !state2.prerendering.fallback && !state2.prerendering.inside_reroute) {
      disable_search(url);
    }
    const response = await record_span({
      name: "sveltekit.handle.root",
      attributes: {
        "http.route": event.route.id || "unknown",
        "http.method": event.request.method,
        "http.url": event.url.href,
        "sveltekit.is_data_request": is_data_request,
        "sveltekit.is_sub_request": event.isSubRequest
      },
      fn: async (root_span) => {
        const traced_event = {
          ...event,
          tracing: {
            enabled: false,
            root: root_span,
            current: root_span
          }
        };
        return await with_request_store(
          { event: traced_event, state: event_state },
          () => options2.hooks.handle({
            event: traced_event,
            resolve: (event2, opts) => {
              return record_span({
                name: "sveltekit.resolve",
                attributes: {
                  "http.route": event2.route.id || "unknown"
                },
                fn: (resolve_span) => {
                  return with_request_store(
                    null,
                    () => resolve2(merge_tracing(event2, resolve_span), page_nodes, opts).then(
                      (response2) => {
                        for (const key2 in headers2) {
                          const value = headers2[key2];
                          response2.headers.set(
                            key2,
                            /** @type {string} */
                            value
                          );
                        }
                        add_cookies_to_headers(response2.headers, new_cookies.values());
                        if (state2.prerendering && event2.route.id !== null) {
                          response2.headers.set("x-sveltekit-routeid", encodeURI(event2.route.id));
                        }
                        resolve_span.setAttributes({
                          "http.response.status_code": response2.status,
                          "http.response.body.size": response2.headers.get("content-length") || "unknown"
                        });
                        return response2;
                      }
                    )
                  );
                }
              });
            }
          })
        );
      }
    });
    if (response.status === 200 && response.headers.has("etag")) {
      let if_none_match_value = request.headers.get("if-none-match");
      if (if_none_match_value?.startsWith('W/"')) {
        if_none_match_value = if_none_match_value.substring(2);
      }
      const etag2 = (
        /** @type {string} */
        response.headers.get("etag")
      );
      if (if_none_match_value === etag2) {
        const headers22 = new Headers({ etag: etag2 });
        for (const key2 of [
          "cache-control",
          "content-location",
          "date",
          "expires",
          "vary",
          "set-cookie"
        ]) {
          const value = response.headers.get(key2);
          if (value) headers22.set(key2, value);
        }
        return new Response(void 0, {
          status: 304,
          headers: headers22
        });
      }
    }
    if (is_data_request && response.status >= 300 && response.status <= 308) {
      const location = response.headers.get("location");
      if (location) {
        return redirect_json_response(new Redirect(
          /** @type {any} */
          response.status,
          location
        ));
      }
    }
    return response;
  } catch (e3) {
    if (e3 instanceof Redirect) {
      const response = is_data_request || remote_id ? redirect_json_response(e3) : route?.page && is_action_json_request(event) ? action_json_redirect(e3) : redirect_response(e3.status, e3.location);
      add_cookies_to_headers(response.headers, new_cookies.values());
      return response;
    }
    return await handle_fatal_error(event, event_state, options2, e3);
  }
  async function resolve2(event2, page_nodes, opts) {
    try {
      if (opts) {
        resolve_opts = {
          transformPageChunk: opts.transformPageChunk || default_transform,
          filterSerializedResponseHeaders: opts.filterSerializedResponseHeaders || default_filter,
          preload: opts.preload || default_preload
        };
      }
      if (options2.hash_routing || state2.prerendering?.fallback) {
        return await render_response({
          event: event2,
          event_state,
          options: options2,
          manifest: manifest2,
          state: state2,
          page_config: { ssr: false, csr: true },
          status: 200,
          error: null,
          branch: [],
          fetched: [],
          resolve_opts,
          data_serializer: server_data_serializer(event2, event_state, options2)
        });
      }
      if (remote_id) {
        return await handle_remote_call(event2, event_state, options2, manifest2, remote_id);
      }
      if (route) {
        const method = (
          /** @type {import('types').HttpMethod} */
          event2.request.method
        );
        let response2;
        if (is_data_request) {
          response2 = await render_data(
            event2,
            event_state,
            route,
            options2,
            manifest2,
            state2,
            invalidated_data_nodes,
            trailing_slash
          );
        } else if (route.endpoint && (!route.page || is_endpoint_request(event2))) {
          response2 = await render_endpoint(event2, event_state, await route.endpoint(), state2);
        } else if (route.page) {
          if (!page_nodes) {
            throw new Error("page_nodes not found. This should never happen");
          } else if (page_methods.has(method)) {
            response2 = await render_page(
              event2,
              event_state,
              route.page,
              options2,
              manifest2,
              state2,
              page_nodes,
              resolve_opts
            );
          } else {
            const allowed_methods2 = new Set(allowed_page_methods);
            const node = await manifest2._.nodes[route.page.leaf]();
            if (node?.server?.actions) {
              allowed_methods2.add("POST");
            }
            if (method === "OPTIONS") {
              response2 = new Response(null, {
                status: 204,
                headers: {
                  allow: Array.from(allowed_methods2.values()).join(", ")
                }
              });
            } else {
              const mod = [...allowed_methods2].reduce(
                (acc, curr) => {
                  acc[curr] = true;
                  return acc;
                },
                /** @type {Record<string, any>} */
                {}
              );
              response2 = method_not_allowed(mod, method);
            }
          }
        } else {
          throw new Error("Route is neither page nor endpoint. This should never happen");
        }
        if (request.method === "GET" && route.page && route.endpoint) {
          const vary = response2.headers.get("vary")?.split(",")?.map((v) => v.trim().toLowerCase());
          if (!(vary?.includes("accept") || vary?.includes("*"))) {
            response2 = new Response(response2.body, {
              status: response2.status,
              statusText: response2.statusText,
              headers: new Headers(response2.headers)
            });
            response2.headers.append("Vary", "Accept");
          }
        }
        return response2;
      }
      if (state2.error && event2.isSubRequest) {
        const headers22 = new Headers(request.headers);
        headers22.set("x-sveltekit-error", "true");
        return await fetch(request, { headers: headers22 });
      }
      if (state2.error) {
        return text("Internal Server Error", {
          status: 500
        });
      }
      if (state2.depth === 0) {
        if (dev && event2.url.pathname === "/.well-known/appspecific/com.chrome.devtools.json") ;
        return await respond_with_error({
          event: event2,
          event_state,
          options: options2,
          manifest: manifest2,
          state: state2,
          status: 404,
          error: new SvelteKitError(404, "Not Found", `Not found: ${event2.url.pathname}`),
          resolve_opts
        });
      }
      if (state2.prerendering) {
        return text("not found", { status: 404 });
      }
      const response = await fetch(request);
      return new Response(response.body, response);
    } catch (e3) {
      return await handle_fatal_error(event2, event_state, options2, e3);
    } finally {
      event2.cookies.set = () => {
        throw new Error("Cannot use `cookies.set(...)` after the response has been generated");
      };
      event2.setHeaders = () => {
        throw new Error("Cannot use `setHeaders(...)` after the response has been generated");
      };
    }
  }
}
function load_page_nodes(page2, manifest2) {
  return Promise.all([
    // we use == here rather than === because [undefined] serializes as "[null]"
    ...page2.layouts.map((n2) => n2 == void 0 ? n2 : manifest2._.nodes[n2]()),
    manifest2._.nodes[page2.leaf]()
  ]);
}
function propagate_context(fn) {
  return async (req, ...rest) => {
    {
      return fn(req, ...rest);
    }
  };
}
function filter_env(env, allowed, disallowed) {
  return Object.fromEntries(
    Object.entries(env).filter(
      ([k]) => k.startsWith(allowed) && (disallowed === "" || !k.startsWith(disallowed))
    )
  );
}
function set_app(value) {
}
var init_promise;
var current = null;
var Server = class {
  /** @type {import('types').SSROptions} */
  #options;
  /** @type {import('@sveltejs/kit').SSRManifest} */
  #manifest;
  /** @param {import('@sveltejs/kit').SSRManifest} manifest */
  constructor(manifest2) {
    this.#options = options;
    this.#manifest = manifest2;
    if (IN_WEBCONTAINER2) {
      const respond2 = this.respond.bind(this);
      this.respond = async (...args) => {
        const { promise, resolve: resolve2 } = (
          /** @type {PromiseWithResolvers<void>} */
          with_resolvers()
        );
        const previous = current;
        current = promise;
        await previous;
        return respond2(...args).finally(resolve2);
      };
    }
  }
  /**
   * @param {import('@sveltejs/kit').ServerInitOptions} opts
   */
  async init({ env, read }) {
    const { env_public_prefix, env_private_prefix } = this.#options;
    set_private_env(filter_env(env, env_private_prefix, env_public_prefix));
    set_public_env(filter_env(env, env_public_prefix, env_private_prefix));
    if (read) {
      const wrapped_read = (file) => {
        const result = read(file);
        if (result instanceof ReadableStream) {
          return result;
        } else {
          return new ReadableStream({
            async start(controller2) {
              try {
                const stream = await Promise.resolve(result);
                if (!stream) {
                  controller2.close();
                  return;
                }
                const reader = stream.getReader();
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  controller2.enqueue(value);
                }
                controller2.close();
              } catch (error2) {
                controller2.error(error2);
              }
            }
          });
        }
      };
      set_read_implementation(wrapped_read);
    }
    await (init_promise ??= (async () => {
      try {
        const module = await get_hooks();
        this.#options.hooks = {
          handle: module.handle || (({ event, resolve: resolve2 }) => resolve2(event)),
          handleError: module.handleError || (({ status, error: error2, event }) => {
            const error_message = format_server_error(
              status,
              /** @type {Error} */
              error2,
              event
            );
            console.error(error_message);
          }),
          handleFetch: module.handleFetch || (({ request, fetch: fetch2 }) => fetch2(request)),
          handleValidationError: module.handleValidationError || (({ issues }) => {
            console.error("Remote function schema validation failed:", issues);
            return { message: "Bad Request" };
          }),
          reroute: module.reroute || (() => {
          }),
          transport: module.transport || {}
        };
        set_app({
          decoders: module.transport ? Object.fromEntries(Object.entries(module.transport).map(([k, v]) => [k, v.decode])) : {}
        });
        if (module.init) {
          await module.init();
        }
      } catch (e3) {
        {
          throw e3;
        }
      }
    })());
  }
  /**
   * @param {Request} request
   * @param {import('types').RequestOptions} options
   */
  async respond(request, options2) {
    return respond(request, this.#options, this.#manifest, {
      ...options2,
      error: false,
      depth: 0
    });
  }
};

// .svelte-kit/cloudflare-tmp/manifest.js
var manifest = (() => {
  function __memo(fn) {
    let value;
    return () => value ??= value = fn();
  }
  return {
    appDir: "_app",
    appPath: "_app",
    assets: /* @__PURE__ */ new Set([]),
    mimeTypes: {},
    _: {
      client: { start: "_app/immutable/entry/start.ClQS0Dm6.js", app: "_app/immutable/entry/app.BtykV1iV.js", imports: ["_app/immutable/entry/start.ClQS0Dm6.js", "_app/immutable/chunks/C_EOvaTA.js", "_app/immutable/chunks/C46-1ezO.js", "_app/immutable/chunks/BcvqufFC.js", "_app/immutable/entry/app.BtykV1iV.js", "_app/immutable/chunks/C46-1ezO.js", "_app/immutable/chunks/Bdl2G0I9.js", "_app/immutable/chunks/BfDzqXj_.js", "_app/immutable/chunks/BcvqufFC.js", "_app/immutable/chunks/Dim4MYaz.js", "_app/immutable/chunks/DyhJgU3m.js", "_app/immutable/chunks/BWE5czp6.js", "_app/immutable/chunks/VRhKX6pk.js"], stylesheets: [], fonts: [], uses_env_dynamic_public: true },
      nodes: [
        __memo(() => Promise.resolve().then(() => (init__(), __exports))),
        __memo(() => Promise.resolve().then(() => (init__2(), __exports2)))
      ],
      remotes: {},
      routes: [],
      prerendered_routes: /* @__PURE__ */ new Set(["/", "/participants/", "/sessions/", "/settings/"]),
      matchers: async () => {
        return {};
      },
      server_assets: {}
    }
  };
})();
var prerendered = /* @__PURE__ */ new Set(["/", "/participants/", "/sessions/", "/settings/"]);
var base_path = "";

// .svelte-kit/cloudflare-tmp/_worker.js
async function e(e3, t2) {
  let n2 = "string" != typeof t2 && "HEAD" === t2.method;
  n2 && (t2 = new Request(t2, { method: "GET" }));
  let r3 = await e3.match(t2);
  return n2 && r3 && (r3 = new Response(null, r3)), r3;
}
function t(e3, t2, n2, o2) {
  return ("string" == typeof t2 || "GET" === t2.method) && r2(n2) && (n2.headers.has("Set-Cookie") && (n2 = new Response(n2.body, n2)).headers.append("Cache-Control", "private=Set-Cookie"), o2.waitUntil(e3.put(t2, n2.clone()))), n2;
}
var n = /* @__PURE__ */ new Set([200, 203, 204, 300, 301, 404, 405, 410, 414, 501]);
function r2(e3) {
  if (!n.has(e3.status)) return false;
  if (~(e3.headers.get("Vary") || "").indexOf("*")) return false;
  let t2 = e3.headers.get("Cache-Control") || "";
  return !/(private|no-cache|no-store)/i.test(t2);
}
function o(n2) {
  return async function(r3, o2) {
    let a = await e(n2, r3);
    if (a) return a;
    o2.defer((e3) => {
      t(n2, r3, e3, o2);
    });
  };
}
var s2 = caches.default;
var c = t.bind(0, s2);
var r22 = e.bind(0, s2);
var e2 = o.bind(0, s2);
var server = new Server(manifest);
var app_path = `/${manifest.appPath}`;
var immutable = `${app_path}/immutable/`;
var version_file = `${app_path}/version.json`;
var worker = {
  async fetch(req, env, context2) {
    await server.init({ env });
    let pragma = req.headers.get("cache-control") || "";
    let res = !pragma.includes("no-cache") && await r22(req);
    if (res) return res;
    let { pathname, search } = new URL(req.url);
    try {
      pathname = decodeURIComponent(pathname);
    } catch {
    }
    const stripped_pathname = pathname.replace(/\/$/, "");
    let is_static_asset = false;
    const filename = stripped_pathname.slice(base_path.length + 1);
    if (filename) {
      is_static_asset = manifest.assets.has(filename) || manifest.assets.has(filename + "/index.html") || filename in manifest._.server_assets || filename + "/index.html" in manifest._.server_assets;
    }
    let location = pathname.at(-1) === "/" ? stripped_pathname : pathname + "/";
    if (is_static_asset || prerendered.has(pathname) || pathname === version_file || pathname.startsWith(immutable)) {
      res = await env.ASSETS.fetch(req);
    } else if (location && prerendered.has(location)) {
      if (search) location += search;
      res = new Response("", {
        status: 308,
        headers: {
          location
        }
      });
    } else {
      res = await server.respond(req, {
        // @ts-ignore
        platform: { env, context: context2, caches, cf: req.cf },
        getClientAddress() {
          return req.headers.get("cf-connecting-ip");
        }
      });
    }
    pragma = res.headers.get("cache-control") || "";
    return pragma && res.status < 400 ? c(req, res, context2) : res;
  }
};
var worker_default = worker;
export {
  worker_default as default
};
//# sourceMappingURL=_worker.js.map
