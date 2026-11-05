/* Prominent Hub: opens tools instantly from a saved copy, then refreshes that copy in the background.
   Only pages and fonts are saved. App data and PDFs always come from the network.
   Pages already check for a newer build when they open and reload themselves (?v=...). */
var CACHE='hub-pages-v1', FONTS='hub-fonts-v1';
function keyFor(u){ var x=new URL(u); x.hash=''; x.searchParams.delete('v'); return x.href; }
function save(key,res){ if(res&&res.ok&&!res.redirected&&res.type==='basic'&&/text\/html/.test(res.headers.get('content-type')||'')){ var c=res.clone(); caches.open(CACHE).then(function(k){ k.put(key,c); }); } return res; }
self.addEventListener('install',function(){ self.skipWaiting(); });
self.addEventListener('activate',function(e){ e.waitUntil(caches.keys().then(function(l){ return Promise.all(l.filter(function(n){ return n!==CACHE&&n!==FONTS; }).map(function(n){ return caches.delete(n); })); }).then(function(){ return self.clients.claim(); })); });
self.addEventListener('message',function(e){ var urls=e.data&&e.data.urls; if(!urls) return;
  e.waitUntil(caches.open(CACHE).then(function(k){ return urls.reduce(function(p,u){ var key=keyFor(new URL(u,self.location.origin).href); return p.then(function(){ return k.match(key); }).then(function(hit){ if(hit) return; return fetch(key,{credentials:'same-origin'}).then(function(r){ return save(key,r); }).catch(function(){}); }); },Promise.resolve()); })); });
self.addEventListener('fetch',function(e){ var r=e.request; if(r.method!=='GET') return; var u=new URL(r.url);
  if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.open(FONTS).then(function(k){ return k.match(r).then(function(hit){ return hit||fetch(r).then(function(res){ if(res.ok||res.type==='opaque') k.put(r,res.clone()); return res; }); }); })); return; }
  if(u.origin!==self.location.origin||r.mode!=='navigate'||/\.[a-z0-9]+$/i.test(u.pathname)&&!/\.html$/i.test(u.pathname)) return;
  var key=keyFor(r.url), net=fetch(r).then(function(res){ return save(key,res); });
  if(u.searchParams.has('v')){ e.respondWith(net.catch(function(){ return caches.match(key).then(function(h){ return h||Response.error(); }); })); return; }
  e.respondWith(caches.match(key).then(function(hit){ if(hit){ e.waitUntil(net.catch(function(){})); return hit; } return net; })); });
