const https = require('node:https');
const {EventEmitter} = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const qaDir = process.env.MOVIE_QA_DIR || path.resolve(__dirname,'../..');
fs.mkdirSync(path.join(qaDir,'evidence'),{recursive:true});
const stateFile = path.join(qaDir,'fixture-state.json');
const logFile = path.join(qaDir,'evidence','mock-source.jsonl');
// Prove this test-only preload is active before the browser navigates to a data page.
const http = require('node:http');
const emit = http.Server.prototype.emit;
http.Server.prototype.emit = function(event,request,response,...args) {
  if(event==='request'&&request.url==='/__movie-qa_fixture__') {
    response.writeHead(200,{'Content-Type':'application/json'});
    response.end(JSON.stringify({synthetic:true}));
    return true;
  }
  return emit.call(this,event,request,response,...args);
};
function state(){try{return JSON.parse(fs.readFileSync(stateFile,'utf8'))}catch{return {scenario:'normal'}}}
function html(url) {
  if(url.hostname==='ssr1.scrape.center') {
    const page=Number(url.pathname.match(/page\/(\d+)/)?.[1]||1);
    const count=page===1?10:5;
    return `共 15 条`+Array.from({length:count},(_,i)=>{
      const id=(page-1)*10+i+1;
      return `<div class="el-card item m-t is-hover-shadow"><a href="/detail/${id}"><h2 class="m-b-sm">合成電影 ${id}</h2></a><div class="categories"><span>剧情</span><span>${id%2?'奇幻':'喜剧'}</span></div><div class="m-v-sm info">測試地區 / 100分鐘</div><div class="m-v-sm info">2026-01-01 上映</div><p class="score">8.5</p></div>`;
    }).join('');
  }
  if(url.pathname.includes('/new/')) return Array.from({length:15},(_,i)=>`<article class="filmList"><div class="filmTitle"><a href="/movie/test${i}/">合成新片 ${i+1}</a></div><div class="runtime">片長：100分 上映日期：2026/01/01</div></article>`).join('');
  if(url.pathname.includes('/now/')) return `<h2 class="major"><span>2026/01/01</span><ul class="filmListAll">`+Array.from({length:23},(_,i)=>`<li><a href="/movie/now${i}/"><img src="/poster${i}.jpg"></a><div class="filmtitle"><a>合成首輪 ${i+1}</a><span class="runtime">(10廳)</span></div></li>`).join('')+'</ul>';
  return Array.from({length:12},(_,i)=>`<li><a href="/movie/next${i}/"><img src="/poster${i}.jpg" alt="合成即將上映"><div class="filmtitle"><a>合成未來 ${i+1}</a></div><div class="runtime">片長：100分 上映日期：2026/01/01</div></li>`).join('');
}
https.get = function(input,options,callback) {
  const url=new URL(input);
  const config=state();
  const req=new EventEmitter();
  let destroyed=false;
  req.destroy=e=>{destroyed=true;queueMicrotask(()=>req.emit('error',e));return req};
  req.setTimeout=(ms,cb)=>{if(config.scenario==='timeout')setTimeout(cb,20);return req};
  if(!['ssr1.scrape.center','www.atmovies.com.tw'].includes(url.hostname)) {
    queueMicrotask(()=>req.emit('error',new Error('QA blocked external request: '+url.hostname)));
    return req;
  }
  fs.appendFileSync(logFile,JSON.stringify({scenario:config.scenario,url:url.toString(),mock:true,time:new Date().toISOString()})+'\n');
  if(config.scenario==='timeout')return req;
  setImmediate(()=>{
    if(destroyed)return;
    const response=new EventEmitter();
    response.statusCode=config.scenario==='error'||(config.scenario==='partial'&&url.pathname==='/page/2')?503:200;
    callback(response);
    response.emit('data',Buffer.from(config.scenario==='empty'?'':html(url)));
    response.emit('end');
  });
  return req;
};
