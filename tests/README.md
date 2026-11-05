# Isolated movie acceptance tests

The browser uses the real Next.js page, API, parsers and chatbot. Only upstream
HTTPS responses are replaced with synthetic movie HTML. No crawler, external
movie data, production writes or paid services are needed. The suite refuses a
public base URL and checks that the fixture preload is active before navigating.
Browser external requests and Next link prefetches are blocked.

Prerequisites: `npm ci --ignore-scripts --no-audit --no-fund`, existing Chrome,
and `playwright-core` in a separate test tools directory. No browser download.
Check free disk space before install/build. No test command deletes data.

PowerShell, from repository root (adjust paths for your checkout):

```powershell
$repo = (Get-Location).Path
$env:MOVIE_QA_DIR = Join-Path $repo '..\movie-qa-evidence'
New-Item -ItemType Directory -Force $env:MOVIE_QA_DIR
$qaTools = Join-Path $env:MOVIE_QA_DIR 'tools'
npm install --prefix $qaTools --no-save --package-lock=false --ignore-scripts --no-audit --no-fund playwright-core@1.64.1
$env:PLAYWRIGHT_CORE_PATH = Join-Path $qaTools 'node_modules\playwright-core'
$env:CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$env:NEXT_TELEMETRY_DISABLED = '1'
$env:NODE_OPTIONS = '--require=' + (Join-Path $repo 'tests\mock-source.cjs')
# Terminal 1, with the same environment. Use apps/web as cwd for Tailwind.
Set-Location (Join-Path $repo 'apps\web')
node ../../node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3104
# Terminal 2, from repo root with MOVIE_QA_DIR / PLAYWRIGHT_CORE_PATH / CHROME_PATH set:
$env:QA_RUN = 'candidate'
node tests/acceptance.cjs
```

The suite writes JSON results and screenshots under `MOVIE_QA_DIR/evidence`.
`mock-source.jsonl` records synthetic requests; timeout fixtures invoke the real
registered timeout handler after a short delay instead of waiting 15 seconds.
Success/empty/HTTP 503/timeout/partial page responses exercise the real parsers
and API. This does not prove external source availability or freshness, production
error handling, source TLS validity, or a deployed candidate.

The existing repo has no baseline test script or ESLint configuration. A focused
noninteractive lint check can use the installed ESLint from `apps/web`:
`node ../../node_modules/eslint/bin/eslint.js src/app/page.tsx src/components/customer-chatbot.tsx src/lib/scrape-center.ts --no-eslintrc --config ../../tests/eslint.config.cjs`.
`npm run lint` otherwise opens a configuration prompt.
