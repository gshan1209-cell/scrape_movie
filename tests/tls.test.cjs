// Real loopback TLS regression. Fixture trust is scoped to this test transport;
// no system trust store, production setting, external network, or real credential.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path');
const https = require('node:https'); const Module = require('node:module');
const ts = require('typescript');
const src = path.resolve(__dirname, '../apps/web/src');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(specifier, parent, ...rest) {
  return resolve.call(this, specifier.startsWith('@/') ? path.join(src, specifier.slice(2)) : specifier, parent, ...rest);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename,
}).outputText, filename);
const { GET } = require('../apps/web/src/app/api/movies/route.ts');
const cert = fs.readFileSync(path.join(__dirname, 'fixtures/tls/localhost-test-cert.pem'));
const key = fs.readFileSync(path.join(__dirname, 'fixtures/tls/localhost-test-key.pem'));
const originalGet = https.get;
let server, port, mode, httpRequests, authorized;
before(async () => {
  server = https.createServer({ cert, key }, (request, response) => {
    httpRequests++;
    if (mode === 'http-error') { response.writeHead(503); response.end('Synthetic upstream unavailable'); return; }
    const second = request.url === '/page/2';
    const count = second ? 5 : 10;
    response.end('共 15 条' + Array.from({ length: count }, (_, i) => {
      const id = (second ? 10 : 0) + i + 1;
      return `<div class="el-card item m-t is-hover-shadow"><a href="/detail/${id}"><h2 class="m-b-sm">Synthetic TLS movie ${id}</h2></a><div class="categories"><span>Test</span></div><div class="m-v-sm info">Test / 100分鐘</div><p class="score">8.5</p></div>`;
    }).join(''));
  });
  server.on('tlsClientError', () => {});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); port = server.address().port;
  https.get = function(input, options, callback) {
    const url = new URL(input);
    assert.equal(url.hostname, 'ssr1.scrape.center', 'This suite must never contact another upstream');
    const target = new URL(url.pathname, `https://127.0.0.1:${port}`);
    const trusted = mode !== 'untrusted' && !(mode === 'partial' && url.pathname === '/page/2');
    const transport = { ...options, agent: false, servername: mode === 'hostname-mismatch' ? 'wrong.example.invalid' : 'localhost' };
    if (trusted) transport.ca = cert;
    return originalGet.call(https, target, transport, response => { authorized.push(response.socket.authorized); callback(response); });
  };
});
after(async () => { https.get = originalGet; await new Promise(resolve => server.close(resolve)); });
async function request(scenario, query = '') {
  mode = scenario; httpRequests = 0; authorized = [];
  const response = await GET(new Request('http://localhost/api/movies?source=scrape-center' + query));
  return { status: response.status, data: await response.json() };
}
test('a certificate explicitly trusted by the isolated transport returns real parsed source data', async () => {
  const result = await request('trusted');
  assert.equal(result.status, 200); assert.equal(result.data.source, 'scrape-center');
  assert.equal(result.data.total, 15); assert.equal(result.data.movies.length, 10);
  assert.equal(result.data.movies[0].title, 'Synthetic TLS movie 1'); assert.deepEqual(authorized, [true]);
});
test('an untrusted certificate produces API 502 without source data or an insecure retry', async () => {
  const result = await request('untrusted');
  assert.equal(result.status, 502); assert.match(result.data.error, /self.signed|certificate/i);
  assert.equal(result.data.movies, undefined); assert.equal(httpRequests, 0);
});
test('a trusted certificate for the wrong hostname is rejected before any HTTP data', async () => {
  const result = await request('hostname-mismatch');
  assert.equal(result.status, 502); assert.match(result.data.error, /hostname|altnames/i); assert.equal(httpRequests, 0);
});
test('category retries cannot bypass an untrusted first source page', async () => {
  const result = await request('untrusted', '&category=Test');
  assert.equal(result.status, 502); assert.equal(result.data.movies, undefined); assert.equal(httpRequests, 0);
});
test('an untrusted later page yields an explicit partial notice without invented movies', async () => {
  const result = await request('partial', '&category=Test');
  assert.equal(result.status, 200); assert.equal(result.data.total, 10); assert.equal(result.data.movies.length, 10);
  assert.match(result.data.notice, /部分.*失敗/); assert.equal(httpRequests, 1); assert.deepEqual(authorized, [true]);
});
test('an HTTP failure over validated TLS remains API 502 without a fallback dataset', async () => {
  const result = await request('http-error');
  assert.equal(result.status, 502); assert.match(result.data.error, /HTTP 503/);
  assert.equal(result.data.movies, undefined); assert.deepEqual(authorized, [true]);
});
