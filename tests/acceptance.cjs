// Run against a local Next server with mock-source.cjs preloaded. Never use a public base URL.
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const qaDir = process.env.MOVIE_QA_DIR || path.resolve('..');
const base = process.env.MOVIE_QA_URL || 'http://127.0.0.1:3104';
assert.equal(new URL(base).hostname, '127.0.0.1', 'Acceptance mutations are local fixtures only');
const results=[];
const scenario = value => fs.writeFileSync(path.join(qaDir,'fixture-state.json'),JSON.stringify({scenario:value}));
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const proof=await context.request.get(base+'/__movie-qa_fixture__');
  if(proof.status()!==200||(await proof.json()).synthetic!==true){await browser.close();throw new Error('Refusing to test a server without the synthetic-source preload');}
  const errors=[];
  await context.route('**/*', route=>{
    const r=route.request();
    if(new URL(r.url()).hostname!=='127.0.0.1'||r.headers()['next-router-prefetch'])return route.abort();
    return route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  const go=async url=>{const r=await page.goto(base+url,{waitUntil:'networkidle',timeout:60000});assert.equal(r.status(),200)};
  const test=async(name,fn)=>{try{await fn();results.push({name,status:'PASS'})}catch(e){results.push({name,status:'FAIL',error:e.message})}console.log(JSON.stringify(results.at(-1)))};
  const api=async url=>{const r=await page.request.get(base+url);return {status:r.status(),data:await r.json()}};
  scenario('normal');
  await test('atmovies new pagination gives 10 then 5 distinct cards; Back restores first page',async()=>{
    await go('/'); assert.equal(await page.getByRole('link',{name:'原始頁面',exact:true}).count(),10);
    await page.getByRole('link',{name:'下一頁',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForURL('**/?page=2');await page.getByText('合成新片 11',{exact:true}).waitFor();
    assert.equal(await page.getByRole('link',{name:'原始頁面',exact:true}).count(),5);
    assert.match(await page.locator('main').innerText(),/合成新片 11/);
    await page.goBack({waitUntil:'networkidle'});await page.getByText('合成新片 1',{exact:true}).waitFor();assert.equal(new URL(page.url()).search,'');
    assert.equal(await page.getByRole('link',{name:'原始頁面',exact:true}).count(),10);
  });
  await test('atmovies now/next mode links, API totals and pagination preserve the selected mode',async()=>{
    for(const [view,label,total,lastCount] of [['now','本期首輪',23,3],['next','近期上映',12,2]]){
      await page.getByRole('link',{name:label,exact:true}).click();await page.waitForURL(`**/\?source=atmovies&view=${view}`);
      const a=await api(`/api/movies?source=atmovies&view=${view}`);assert.equal(a.status,200);assert.equal(a.data.total,total);assert.equal(a.data.atmoviesView,view);
      const nav=page.getByRole('navigation',{name:'Movies pagination'});const last=String(Math.ceil(total/10));
      await nav.getByRole('link',{name:last,exact:true}).click();await page.waitForURL(`**/*page=${last}`);
      assert.equal(await page.getByRole('link',{name:'原始頁面',exact:true}).count(),lastCount);
      assert.equal(new URL(page.url()).searchParams.get('view'),view);
      await go('/');
    }
  });
  await test('Scrape Center category links retain source and filter only that dataset',async()=>{
    await go('/?source=scrape-center');const link=page.getByRole('link',{name:'奇幻',exact:true}).first();const href=await link.getAttribute('href');await Promise.all([page.waitForURL(base+href,{waitUntil:'networkidle'}),link.click()]);
    assert.equal(new URL(page.url()).searchParams.get('source'),'scrape-center');
    assert.match(await page.locator('main').innerText(),/篩選後總數/);
    assert.equal(await page.getByRole('link',{name:'原始頁面',exact:true}).count(),8);
  });
  await test('Scrape Center All clears category without changing source',async()=>{
    await go('/?source=scrape-center&category='+encodeURIComponent('剧情'));const link=page.getByRole('link',{name:'全部',exact:true});const href=await link.getAttribute('href');await Promise.all([page.waitForURL(base+href,{waitUntil:'networkidle'}),link.click()]);
    assert.equal(new URL(page.url()).searchParams.get('source'),'scrape-center');assert.equal(new URL(page.url()).searchParams.has('category'),false);
  });
  await test('FAQ source quick question explains both available sources',async()=>{
    await go('/');await page.getByRole('button',{name:'開啟客服機器人',exact:true}).click();await page.getByRole('button',{name:'🎬 資料來源是哪裡？',exact:true}).click();
    const section=page.locator('section').filter({has:page.getByRole('button',{name:'關閉客服機器人',exact:true})});
    const text=await section.locator('p').last().innerText();assert.match(text,/@movies/);assert.match(text,/ssr1\.scrape\.center/);
  });
  await test('FAQ API quick question supplies a category URL that selects Scrape Center',async()=>{
    await page.getByRole('button',{name:'🧩 API 怎麼使用？',exact:true}).click();
    const section=page.locator('section').filter({has:page.getByRole('button',{name:'關閉客服機器人',exact:true})});
    const text=await section.locator('p').last().innerText();assert.match(text,/\/api\/movies/);assert.match(text,/source=scrape-center/);
  });
  await test('disabled pagination is absent from keyboard tab order',async()=>{
    await go('/');const controls=page.getByRole('navigation',{name:'Movies pagination'}).locator('a[aria-disabled="true"],button:disabled');assert.equal(await controls.count(),1);const tabbable=await controls.evaluateAll(as=>as.filter(a=>!a.disabled&&a.tabIndex>=0).length);
    assert.equal(tabbable,0,'Disabled pagination links are still keyboard actionable');
  });
  await test('cache is disclosed rather than claiming each request fetches fresh data',async()=>{
    await go('/');assert.match(await page.locator('aside').innerText(),/30 分鐘/);
  });
  await test('empty source yields explicit empty state and an empty API list',async()=>{
    scenario('empty');await go('/?source=scrape-center');assert.equal(await page.getByRole('heading',{name:'目前沒有可顯示的電影資料'}).count(),1);
    const a=await api('/api/movies?source=scrape-center');assert.equal(a.status,200);assert.equal(a.data.movies.length,0);assert.equal(a.data.total,0);
  });
  for(const value of ['error','timeout']) await test(`${value}: page shows failure; API returns 502 without invented fallback movies`,async()=>{
    scenario(value);await go('/?source=scrape-center');assert.equal(await page.getByRole('heading',{name:'資料讀取暫時失敗'}).count(),1);assert.equal(await page.getByRole('link',{name:'原始頁面',exact:true}).count(),0);
    const a=await api('/api/movies?source=scrape-center');assert.equal(a.status,502);assert.match(a.data.error,value==='error'?/503/:/timed out/);
  });
  await test('failed source fetch is not labeled as a successful data refresh',async()=>{
    scenario('error');await go('/?source=scrape-center');assert.match(await page.locator('main').innerText(),/尚未取得資料/);
  });
  await test('partial category scan declares missing source pages in API and UI',async()=>{
    scenario('partial');const a=await api('/api/movies?source=scrape-center&category='+encodeURIComponent('剧情'));assert.equal(a.status,200);assert.equal(a.data.total,10);assert.match(a.data.notice||'',/部分.*失敗/);
    await go('/?source=scrape-center&category='+encodeURIComponent('剧情'));assert.match(await page.locator('main').innerText(),/部分.*失敗/);
  });
  scenario('normal');
  await test('mobile 390/desktop 1440 layout, keyboard FAQ submit and close',async()=>{
    await go('/?source=scrape-center');
    for(const width of [390,1440]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(qaDir,'evidence',`local-${width}-${process.env.QA_RUN||'run'}.png`),fullPage:true});}
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'開啟客服機器人',exact:true}).focus();await page.keyboard.press('Enter');await page.getByPlaceholder('輸入問題...').fill('分頁');await page.getByPlaceholder('輸入問題...').press('Enter');
    const section=page.locator('section').filter({has:page.getByRole('button',{name:'關閉客服機器人',exact:true})});assert.match(await section.innerText(),/page/);const box=await section.boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=390&&box.y+box.height<=844);await page.screenshot({path:path.join(qaDir,'evidence',`local-mobile-faq-${process.env.QA_RUN||'run'}.png`)});await page.getByRole('button',{name:'關閉客服機器人',exact:true}).focus();await page.keyboard.press('Enter');assert.equal(await page.getByPlaceholder('輸入問題...').count(),0);
    assert.deepEqual(errors,[]);
  });
  fs.writeFileSync(path.join(qaDir,'evidence',`acceptance-${process.env.QA_RUN||'run'}.json`),JSON.stringify({time:new Date().toISOString(),base,results,errors},null,2));
  await browser.close();process.exitCode=results.some(r=>r.status==='FAIL')?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
