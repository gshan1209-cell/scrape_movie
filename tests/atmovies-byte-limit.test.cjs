// Synthetic response-only QA: never contacts real @movies or external sites.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const Module = require("node:module");
const { EventEmitter } = require("node:events");
const ts = require("typescript");

const src = path.resolve(__dirname, "../apps/web/src");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(specifier, parent, ...rest) {
  return originalResolve.call(this, specifier.startsWith("@/") ? path.join(src, specifier.slice(2)) : specifier, parent, ...rest);
};
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename,
}).outputText, filename);

const { GET } = require("../apps/web/src/app/api/movies/route.ts");
const originalGet = https.get;
const MAX_BYTES = 2 * 1024 * 1024;

async function simulate({ header, chunks, status = 200 }) {
  let destroyed = false, emitted = 0;
  https.get = (url, _opts, callback) => {
    assert.equal(new URL(url).hostname, "www.atmovies.com.tw");
    const request = new EventEmitter();
    request.setTimeout = () => request;
    request.destroy = err => {
      destroyed = true;
      queueMicrotask(() => request.emit("error", err));
      return request;
    };
    const response = new EventEmitter();
    response.headers = header === undefined ? {} : { "content-length": String(header) };
    response.statusCode = status;
    queueMicrotask(() => {
      callback(response);
      for (const chunk of chunks) {
        if (destroyed) break;
        emitted++;
        response.emit("data", chunk);
      }
      if (!destroyed) response.emit("end");
    });
    return request;
  };
  try {
    const response = await GET(new Request("http://localhost/api/movies?source=atmovies&view=new"));
    return { status: response.status, body: await response.json(), destroyed, emitted };
  } finally {
    https.get = originalGet;
  }
}

test("content-length greater than cap fails closed before buffering", async () => {
  const r = await simulate({ header: MAX_BYTES + 1, chunks: [Buffer.alloc(12)] });
  assert.equal(r.status, 502);
  assert.match(r.body.error, /2 MiB limit/);
  assert.equal(r.emitted, 0);
  assert.equal(r.destroyed, true);
});
test("missing length with oversized chunked stream aborts at cap", async () => {
  const r = await simulate({ chunks: [Buffer.alloc(MAX_BYTES), Buffer.alloc(1), Buffer.alloc(128)] });
  assert.equal(r.status, 502);
  assert.match(r.body.error, /2 MiB limit/);
  assert.equal(r.emitted, 2);
  assert.equal(r.destroyed, true);
});
test("forged short content-length cannot bypass streamed-byte cap", async () => {
  const r = await simulate({ header: 1, chunks: [Buffer.alloc(MAX_BYTES + 1)] });
  assert.equal(r.status, 502);
  assert.match(r.body.error, /2 MiB limit/);
  assert.equal(r.destroyed, true);
});
test("upstream HTTP error still maps to 502, never fallback data", async () => {
  const r = await simulate({ status: 503, chunks: [Buffer.from("synthetic failure")] });
  assert.equal(r.status, 502);
  assert.match(r.body.error, /HTTP 503/);
  assert.equal(r.body.movies, undefined);
});
test("exact 2 MiB streamed body is permitted", async () => {
  const html = "<html></html>";
  const chunks = [Buffer.alloc(MAX_BYTES - Buffer.byteLength(html), 32), Buffer.from(html)];
  assert.equal(chunks.reduce((total, chunk) => total + chunk.length, 0), MAX_BYTES);
  const r = await simulate({ header: MAX_BYTES, chunks });
  assert.equal(r.status, 200);
  assert.equal(r.destroyed, false);
  assert.equal(r.body.source, "atmovies");
});
