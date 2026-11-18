globalThis.__nitro_main__ = import.meta.url;
import { N as NodeResponse, s as serve } from "./_libs/srvx.mjs";
import { d as defineHandler, H as HTTPError, t as toEventHandler, a as defineLazyEventHandler, h as headers, b as H3Core, m as memoizeRouteRulesMatcher, c as createMatcherFromFind, e as composeMiddleware } from "./_libs/h3.mjs";
import { promises } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import "node:http";
import "node:stream";
import "node:stream/promises";
import "node:https";
import "node:http2";
import "./_libs/rou3.mjs";
if (globalThis.Response !== NodeResponse) globalThis.Response = NodeResponse;
function e$1(t3, n2, r2, i2) {
  for (let a2 = r2; a2 < t3.length; a2 += 1) try {
    let r3 = i2 ? i2.run(() => t3[a2](...n2)) : t3[a2](...n2);
    if (r3 && typeof r3.then == `function`) return Promise.resolve(r3).then(() => e$1(t3, n2, a2 + 1, i2));
  } catch (e2) {
    return Promise.reject(e2);
  }
}
var t$1 = class t {
  _hooks;
  constructor() {
    this._hooks = {};
  }
  hook(e2, t3) {
    return !e2 || typeof t3 != `function` ? () => {
    } : (this._hooks[e2] = this._hooks[e2] || [], this._hooks[e2].push(t3), () => {
      t3 &&= (this.removeHook(e2, t3), void 0);
    });
  }
  removeHook(e2, t3) {
    let n2 = this._hooks[e2];
    if (n2) {
      let r2 = n2.indexOf(t3);
      r2 !== -1 && n2.splice(r2, 1), n2.length === 0 && (this._hooks[e2] = void 0);
    }
  }
  callHook(t3, ...n2) {
    let r2 = this._hooks[t3];
    if (r2 && r2.length !== 0) return e$1(r2.slice(), n2, 0);
  }
};
const e = /%2f/gi;
function t2(e2 = ``) {
  try {
    return decodeURIComponent(`` + e2);
  } catch {
    return `` + e2;
  }
}
function n(n2) {
  return t2(n2.replace(e, `%252F`));
}
const r = /\/$|\/\?|\/#/, i = /^\.?\//;
function a(e2 = ``, t3) {
  return t3 ? r.test(e2) : e2.endsWith(`/`);
}
function o(e2 = ``, t3) {
  return (a(e2) ? e2.slice(0, -1) : e2) || `/`;
}
function s(e2 = ``, t3) {
  return e2.endsWith(`/`) ? e2 : e2 + `/`;
}
function c(e2 = ``) {
  return e2.startsWith(`/`);
}
function l(e2 = ``) {
  return c(e2) ? e2 : `/` + e2;
}
function u(e2) {
  return e2 && e2 !== `/`;
}
function d(e2, ...t3) {
  let n2 = e2 || ``;
  for (let e3 of t3.filter((e4) => u(e4))) if (n2) {
    let t4 = e3.replace(i, ``);
    n2 = s(n2) + t4;
  } else n2 = e3;
  return n2;
}
const assets = {
  "/.gitkeep": {
    "type": "text/plain; charset=utf-8",
    "etag": '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"',
    "mtime": "2026-11-17T21:24:57.475Z",
    "size": 0,
    "path": "../public/.gitkeep"
  },
  "/__manus__/debug-collector.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": '"6e0f-OXX0spqfEGZ9Px78MR7oSN1OWRY"',
    "mtime": "2026-11-18T21:21:52.388Z",
    "size": 28175,
    "path": "../public/__manus__/debug-collector.js"
  },
  "/api/platform/config.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": '"5c-E3+inkaKRwkjI1beogMS9ichDBo"',
    "mtime": "2026-11-18T21:21:52.388Z",
    "size": 92,
    "path": "../public/api/platform/config.js"
  },
  "/assets/Platform-CYIRCzbQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": '"151ee-THsdz4uPrRjj52uYYTNGmgRyDSk"',
    "mtime": "2026-11-18T21:21:52.384Z",
    "size": 86510,
    "path": "../public/assets/Platform-CYIRCzbQ.js"
  },
  "/assets/charts-BHYTaiup.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": '"35-iwrihlCOXCVVVCpK8e0NrR1/xOU"',
    "mtime": "2026-11-18T21:21:52.387Z",
    "size": 53,
    "path": "../public/assets/charts-BHYTaiup.js"
  },
  "/assets/index-DY3Ucr0V.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": '"75d39-oilrh1zvO7ABRvg3Uho3C5bdzjg"',
    "mtime": "2026-11-18T21:21:52.385Z",
    "size": 482617,
    "path": "../public/assets/index-DY3Ucr0V.js"
  },
  "/assets/index-DanUYPy-.css": {
    "type": "text/css; charset=utf-8",
    "etag": '"205e2-VZj0WUZ+IXmubQ2M/QHAWL2/chY"',
    "mtime": "2026-11-18T21:21:52.384Z",
    "size": 132578,
    "path": "../public/assets/index-DanUYPy-.css"
  },
  "/assets/motion-CZR_40Yb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": '"38-J62Jaaxu9WNWKHkYMDolJfq7ZsQ"',
    "mtime": "2026-11-18T21:21:52.385Z",
    "size": 56,
    "path": "../public/assets/motion-CZR_40Yb.js"
  },
  "/assets/query-C3VlNidV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": '"9c70-y79YqQVQnxjGI1hQeQLwMTOthNg"',
    "mtime": "2026-11-18T21:21:52.387Z",
    "size": 40048,
    "path": "../public/assets/query-C3VlNidV.js"
  },
  "/assets/react-DlBnNAMw.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": '"2c3a-kMDHxmCiSA9hEFxSWcbUoHwbVP0"',
    "mtime": "2026-11-18T21:21:52.385Z",
    "size": 11322,
    "path": "../public/assets/react-DlBnNAMw.js"
  },
  "/assets/trpc-BS4jKOQw.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": '"8843-mLWZuG+s3fgqVVCPARZ0qpuET2s"',
    "mtime": "2026-11-18T21:21:52.388Z",
    "size": 34883,
    "path": "../public/assets/trpc-BS4jKOQw.js"
  },
  "/assets/ui-CF62lP7t.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": '"100b6-Dff9dEkhJisx1gOt2Qi72qFUqUk"',
    "mtime": "2026-11-18T21:21:52.388Z",
    "size": 65718,
    "path": "../public/assets/ui-CF62lP7t.js"
  },
  "/empower18-mark.svg": {
    "type": "image/svg+xml",
    "etag": '"256-c33SOWpyl2QnAW6c2QJUrIUzc/Q"',
    "mtime": "2026-11-18T21:21:52.388Z",
    "size": 598,
    "path": "../public/empower18-mark.svg"
  },
  "/index.html": {
    "type": "text/html; charset=utf-8",
    "etag": '"47a-pPKAABNxAAL3UzsdqPkdU1rAoHo"',
    "mtime": "2026-11-18T21:21:52.388Z",
    "size": 1146,
    "path": "../public/index.html"
  },
  "/manus-routes.json": {
    "type": "application/json",
    "etag": '"31b-yJaMha9ddyHsUpyZmy1VHEtCYqE"',
    "mtime": "2026-11-18T21:21:52.388Z",
    "size": 795,
    "path": "../public/manus-routes.json"
  }
};
function readAsset(id) {
  const serverDir = dirname(fileURLToPath(globalThis.__nitro_main__));
  return promises.readFile(resolve(serverDir, assets[id].path)).catch((error) => {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  });
}
const publicAssetBases = { "/assets/": { "maxAge": 31536e3 } };
function isPublicAssetURL(id = "") {
  if (assets[id]) {
    return true;
  }
  for (const base in publicAssetBases) {
    if (id.startsWith(base)) {
      return true;
    }
  }
  return false;
}
function getAsset(id) {
  return assets[id];
}
function hasAsset(id = "") {
  return !!(assets[id] || assets[id + ".gz"] || assets[id + ".br"] || assets[id + ".zst"]);
}
const METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
const EncodingMap = {
  gzip: ".gz",
  br: ".br",
  zstd: ".zst"
};
const noCacheHeaders = { "cache-control": "no-store" };
var static_default = defineHandler((event) => {
  if (event.req.method && !METHODS.has(event.req.method)) return;
  const path = l(o(event.url.pathname));
  let id = path.includes("%") ? n(path) : path;
  if (!hasAsset(id) && !hasAsset(d(id, "index.html")) && !isPublicAssetURL(id)) return;
  let asset;
  const encodings = [...(event.req.headers.get("accept-encoding") || "").split(",").map((entry) => {
    const [name, ...parameters] = entry.split(";");
    const quality = parameters.map((parameter) => parameter.trim().split("=")).find(([key]) => key.toLowerCase() === "q")?.[1];
    const weight = quality === void 0 ? 1 : Number.parseFloat(quality);
    return {
      ext: EncodingMap[name.trim().toLowerCase()],
      weight: Number.isNaN(weight) ? 1 : weight
    };
  }).filter((entry) => entry.ext && entry.weight > 0).sort((a2, b) => b.weight - a2.weight || (a2.ext < b.ext ? -1 : a2.ext > b.ext ? 1 : 0)).map((entry) => entry.ext), ""];
  for (const encoding of encodings) for (const _id of [id + encoding, d(id, "index.html" + encoding)]) {
    const _asset = getAsset(_id);
    if (_asset) {
      asset = _asset;
      id = _id;
      break;
    }
  }
  if (!asset) {
    if (isPublicAssetURL(id)) throw new HTTPError({
      status: 404,
      headers: noCacheHeaders
    });
    return;
  }
  if (encodings.length > 1) event.res.headers.append("Vary", "Accept-Encoding");
  if (event.req.headers.get("if-none-match") === asset.etag) {
    event.res.status = 304;
    event.res.statusText = "Not Modified";
    return "";
  }
  const ifModifiedSinceH = event.req.headers.get("if-modified-since");
  const mtimeDate = new Date(asset.mtime);
  if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
    event.res.status = 304;
    event.res.statusText = "Not Modified";
    return "";
  }
  if (asset.type) event.res.headers.set("Content-Type", asset.type);
  if (asset.etag && !event.res.headers.has("ETag")) event.res.headers.set("ETag", asset.etag);
  if (asset.mtime && !event.res.headers.has("Last-Modified")) event.res.headers.set("Last-Modified", mtimeDate.toUTCString());
  if (asset.encoding && !event.res.headers.has("Content-Encoding")) event.res.headers.set("Content-Encoding", asset.encoding);
  if (asset.size > 0 && !event.res.headers.has("Content-Length")) event.res.headers.set("Content-Length", asset.size.toString());
  const data = readAsset(id);
  return typeof data?.then === "function" ? data.then((resolved) => assertAssetData(resolved)) : assertAssetData(data);
});
function assertAssetData(data) {
  if (data === null || data === void 0) throw new HTTPError({
    status: 404,
    headers: noCacheHeaders
  });
  return data;
}
const findRouteRules = /* @__PURE__ */ (() => {
  const $0 = { route: "/assets/**", rank: 0, rules: [{ name: "headers", route: "/assets/**", handler: headers, options: { "cache-control": "public, max-age=31536000, immutable" } }] };
  return (m, p) => {
    let r2 = [];
    if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1);
    let s2 = p.split("/");
    let l2 = s2.length;
    let _w;
    if (l2 > 1) {
      if (s2[1] === "assets") {
        r2.push(l2 > 2 ? { data: $0, params: { "0": _w = p.slice(8), _: _w } } : { data: $0, params: {} });
      }
    }
    return r2.reverse();
  };
})();
const _lazy_7ff25d3622411d12 = defineLazyEventHandler(() => import("./_routes/api/maintenance/opportunities/expire.mjs"));
const findRoute = /* @__PURE__ */ (() => {
  const $0 = { route: "/api/maintenance/opportunities/expire", handler: _lazy_7ff25d3622411d12 };
  return (m, p) => {
    if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1);
    if (p === "/api/maintenance/opportunities/expire") {
      return { data: $0 };
    }
  };
})();
const globalMiddleware = [
  toEventHandler(static_default)
].filter(Boolean);
function createErrorHeaders(error, event, unhandled) {
  const headers2 = new Headers(unhandled ? {} : error.headers);
  const errHeaders = event.res?.errHeaders;
  if (errHeaders) for (const [name, value] of errHeaders) if (name === "set-cookie") headers2.append(name, value);
  else headers2.set(name, value);
  return headers2;
}
const errorHandler$1 = (error, event) => {
  const res = defaultHandler(error, event);
  return new NodeResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
  const unhandled = error.unhandled ?? !HTTPError.isError(error);
  const { status = 500, statusText = "" } = unhandled ? {} : error;
  if (status === 404) {
    const url = event.url || new URL(event.req.url);
    const baseURL = "/";
    if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
      status: 302,
      headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
    };
  }
  const headers2 = createErrorHeaders(error, event, unhandled);
  headers2.set("content-type", "application/json; charset=utf-8");
  return {
    status,
    statusText,
    headers: headers2,
    body: {
      error: true,
      ...unhandled ? {
        status,
        unhandled: true
      } : typeof error.toJSON === "function" ? error.toJSON() : {
        status,
        statusText,
        message: error.message
      }
    }
  };
}
const errorHandlers = [errorHandler$1];
async function errorHandler(error, event) {
  for (const handler of errorHandlers) {
    try {
      const response = await handler(error, event, { defaultHandler });
      if (response) {
        return response;
      }
    } catch (error2) {
      console.error(error2);
    }
  }
}
function createNitroApp() {
  const captureError = (error, errorCtx) => {
    if (errorCtx?.event) {
      const errors = errorCtx.event.req.context?.nitro?.errors;
      if (errors) {
        errors.push({ error, context: errorCtx });
      }
    }
  };
  const h3App = createH3App({
    onError(error, event) {
      return errorHandler(error, event);
    }
  });
  let appHandler = (req) => {
    req.context ||= {};
    req.context.nitro = req.context.nitro || { errors: [] };
    return h3App.fetch(req);
  };
  return {
    fetch: appHandler,
    h3: h3App,
    hooks: void 0,
    captureError
  };
}
function createH3App(config) {
  const h3App = new H3Core(config);
  h3App["~findRoute"] = (event) => {
    event.context.routeRules = getRouteRules(event.req.method, event.url.pathname).routeRules;
    if (event.req.method === "HEAD") {
      const route = findRoute("HEAD", event.url.pathname);
      return route?.data.method ? route : findRoute("GET", event.url.pathname);
    }
    return findRoute(event.req.method, event.url.pathname);
  };
  h3App["~middleware"].push(createRouteRulesMiddleware());
  h3App["~middleware"].push(...globalMiddleware);
  h3App["~middleware"].push(createCacheRuleMiddleware());
  return h3App;
}
const APP_ID = "default";
function useNitroApp() {
  let instance = useNitroApp._instance;
  if (instance) return instance;
  instance = useNitroApp._instance = createNitroApp();
  globalThis.__nitro__ = globalThis.__nitro__ || {};
  globalThis.__nitro__[APP_ID] = instance;
  return instance;
}
function useNitroHooks() {
  const nitroApp2 = useNitroApp();
  const hooks = nitroApp2.hooks;
  if (hooks) return hooks;
  return nitroApp2.hooks = new t$1();
}
function getRouteRules(method, pathname) {
  return matchRouteRules(method, pathname);
}
function createRouteRulesMiddleware() {
  const middleware = (event, next) => {
    const { rules, cache } = resolveRouteRuleChains(event.req.method, event.url.pathname);
    if (cache) event[kCacheRule] = cache;
    return rules ? rules(event, next) : next();
  };
  return markUntraced(middleware);
}
function createCacheRuleMiddleware() {
  const middleware = (event, next) => {
    const cache = event[kCacheRule];
    return cache ? cache(event, next) : next();
  };
  return markUntraced(middleware);
}
let _matchRouteRules;
function matchRouteRules(method, pathname) {
  return (_matchRouteRules ??= memoizeRouteRulesMatcher(createMatcherFromFind(findRouteRules)))(method, pathname);
}
const kCacheRule = /* @__PURE__ */ Symbol("nitro.cacheRule");
const _routeRuleChains = /* @__PURE__ */ new WeakMap();
function resolveRouteRuleChains(method, pathname) {
  const { matchedRules, routeRuleMiddleware } = matchRouteRules(method, pathname);
  if (routeRuleMiddleware.length === 0) return {};
  let chains = _routeRuleChains.get(routeRuleMiddleware);
  if (!chains) {
    const hasCache = !!matchedRules.cache?.handler;
    const rules = hasCache ? routeRuleMiddleware.slice(0, -1) : routeRuleMiddleware;
    chains = {
      rules: rules.length > 0 ? composeMiddleware(rules) : void 0,
      cache: hasCache ? routeRuleMiddleware.at(-1) : void 0
    };
    _routeRuleChains.set(routeRuleMiddleware, chains);
  }
  return chains;
}
function markUntraced(middleware) {
  middleware.__traced__ = true;
  return middleware;
}
function _captureError(error, type) {
  console.error(`[${type}]`, error);
  useNitroApp().captureError?.(error, { tags: [type] });
}
function trapUnhandledErrors() {
  process.on("unhandledRejection", (error) => _captureError(error, "unhandledRejection"));
  process.on("uncaughtException", (error) => _captureError(error, "uncaughtException"));
}
const serverEntryOptions = {};
const tracingSrvxPlugins = [];
function resolveServeOptions(opts) {
  const { port, hostname, tls, ...entryOptions } = serverEntryOptions;
  const env = globalThis.process?.env || {};
  const _parsedPort = Number.parseInt(env.NITRO_PORT ?? env.PORT ?? "");
  const cert = env.NITRO_SSL_CERT;
  const key = env.NITRO_SSL_KEY;
  const socketPath = env.NITRO_UNIX_SOCKET;
  const resolved = {
    ...entryOptions,
    port: Number.isNaN(_parsedPort) ? port ?? 3e3 : _parsedPort,
    hostname: env.NITRO_HOST || env.HOST || hostname,
    tls: cert && key ? {
      cert,
      key
    } : tls,
    ...opts,
    plugins: [...tracingSrvxPlugins, ...opts.plugins || []]
  };
  for (const runtime of [
    "node",
    "bun",
    "deno"
  ]) if (entryOptions[runtime] && opts[runtime]) resolved[runtime] = {
    ...entryOptions[runtime],
    ...opts[runtime]
  };
  if (socketPath) {
    resolved.node = {
      ...resolved.node,
      path: socketPath
    };
    resolved.bun = {
      ...resolved.bun,
      unix: socketPath
    };
    resolved.deno = {
      ...resolved.deno,
      path: socketPath
    };
  }
  return resolved;
}
function setupCloseHooks(server2) {
  const closeServer = server2.close.bind(server2);
  let closeHooks;
  server2.close = (closeActiveConnections) => closeServer(closeActiveConnections).finally(() => closeHooks ??= callCloseHooks());
}
async function callCloseHooks() {
  try {
    await useNitroHooks().callHook("close");
  } catch (error) {
    console.error("[nitro] Error while calling `close` hooks:", error);
  }
}
const nitroApp = useNitroApp();
const server = serve(resolveServeOptions({ fetch: nitroApp.fetch }));
server.ready().catch((error) => {
  console.error("[nitro] Failed to start server:", error);
  process.exit(1);
});
setupCloseHooks(server);
trapUnhandledErrors();
var node_server_default = {};
export {
  node_server_default as default
};
