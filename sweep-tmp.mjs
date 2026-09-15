import WebSocket from 'ws';
const page = (await (await fetch('http://127.0.0.1:9222/json')).json()).find(t=>t.type==='page');
const ws = new WebSocket(page.webSocketDebuggerUrl,{perMessageDeflate:false});
let id=0; const w=new Map();
ws.on('message',m=>{const j=JSON.parse(m.toString()); if(j.id&&w.has(j.id)){w.get(j.id)(j);w.delete(j.id);}});
await new Promise(r=>ws.once('open',r));
const send=(m,p={})=>new Promise(res=>{const i=++id;w.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p}));});
await send('Page.enable'); await send('Runtime.enable');
const R=['/','/learn','/learn/architecture','/learn/vectors','/learn/retrieval','/learn/generation','/learn/loop','/learn/evals','/learn/regressions','/learn/forensics','/learn/cost','/learn/caching','/learn/drift','/learn/guessing','/learn/pipelines','/learn/answer-key','/learn/tools','/learn/attention','/learn/residency','/learn/ceiling'];
let bad=0;
for (const width of [1440,1280]) {
  await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  for (const path of R) {
    await send('Page.navigate',{url:'http://localhost:3399'+path});
    await new Promise(x=>setTimeout(x,1200));
    const r = await send('Runtime.evaluate',{returnByValue:true,expression:`(()=>{
      const out=[];
      if (document.documentElement.scrollWidth > innerWidth+1) out.push('PAGE scrolls '+(document.documentElement.scrollWidth-innerWidth)+'px');
      for (const el of document.querySelectorAll('*')) {
        const cs=getComputedStyle(el);
        if (!['hidden','clip'].includes(cs.overflowX)) continue;
        if (el.scrollWidth > el.clientWidth+1) {
          const c=String(el.className||'');
          if (c.includes('pointer-events-none')||c.includes('ui-flow-stage')) continue;
          out.push(c.slice(0,34)+' clips '+(el.scrollWidth-el.clientWidth)+'px');
        }
      }
      // A lesson must carry its accent; an empty --lesson means the hue ramp broke.
      const a=document.querySelector('.lesson');
      if (a && !getComputedStyle(a).getPropertyValue('--lesson').trim()) out.push('NO --lesson');
      return out.slice(0,3).join(' | ');
    })()`});
    const v=r.result?.result?.value;
    if (v) { bad++; console.log(String(width).padEnd(6), path.padEnd(24), v); }
  }
}
console.log(`${R.length} routes x 2 widths — ${bad} with problems`);
ws.close(); process.exit(0);
