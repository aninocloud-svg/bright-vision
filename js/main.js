/* Bright Vision — shared behaviour for every page.
   Static text carries data-t="key"; lists (services, countries, categories) are rendered here. */
(function(){
'use strict';
var B=window.BV,T=B.T,SV=B.SV,DS=B.DS,CATS=B.CATS,LANGS=B.LANGS,WA=B.WA,WA_VISA=B.WA_VISA,ic=B.ic;
var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var page=document.body.getAttribute('data-page');
var li=0,chosen=false,state={cat:'all',q:'',cq:''};
var MAP='https://maps.app.goo.gl/YHcfcu7H1RyJaXjJ8';
var WAI='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.6-4.1A8 8 0 1 1 20 11.5z"/><path d="M9.2 8.8c.3 2.4 2.6 4.8 5.2 5.4l1.1-1.2-1.8-1-.8.7c-.9-.4-1.7-1.2-2-2.1l.7-.8-1-1.8z"/></svg>';
var SRCH='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
var ARR='<span class="arr" aria-hidden="true">→</span>';

function $(id){return document.getElementById(id)}
function t(k){var a=T[k];return a?a[li]:k}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function waLink(m,num){return 'https://wa.me/'+(num||WA)+'?text='+encodeURIComponent(m)}
/* Ready-to-send enquiry text (always English for the office, plus the customer's language). */
function inquiry(o){
  var l=[o.country?'Hello Bright Vision, I would like a visa service for: '+o.country:'Hello Bright Vision, I would like to enquire about: '+o.service];
  if(o.category)l.push('Category: '+o.category);
  if(li)l.push('My language: '+LANGS[li].g2);
  l.push('Please tell me the requirements, price and time needed. Thank you.');
  return l.join('\n');
}
function count(c){return SV.filter(function(s){return s.c===c}).length}

/* ---------- scroll reveal ---------- */
var io=('IntersectionObserver' in window)?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.remove('pre');io.unobserve(e.target)}})},{threshold:.12}):null;
function arm(root){
  (root||document).querySelectorAll('.rv:not([data-armed])').forEach(function(el){
    el.setAttribute('data-armed','1');
    if(!io||RM)return;
    var r=el.getBoundingClientRect();
    if(r.top<innerHeight*.92)return;
    el.classList.add('pre');io.observe(el);
  });
}

/* ---------- counters ---------- */
function counters(){
  document.querySelectorAll('[data-count]').forEach(function(el){
    var to=+el.getAttribute('data-count');
    if(RM||!('IntersectionObserver' in window)){el.textContent=to;return}
    var o=new IntersectionObserver(function(es){
      if(!es[0].isIntersecting)return;o.disconnect();
      var s=performance.now();(function f(n){var p=Math.min(1,(n-s)/1100);el.textContent=Math.round(to*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)})(s);
    });o.observe(el);
  });
}

/* ---------- renderers ---------- */
function svcCard(s,i){
  var no=String(SV.indexOf(s)+1).padStart(2,'0'),d='style="--d:'+((i%6)*50)+'ms"';
  if(s.c==='design')return '<a class="card rv" '+d+' href="design.html"><span class="no">'+no+'</span><h3>'+esc(s.n[li])+'</h3><span class="ask">'+esc(t('see_design'))+ARR+'</span></a>';
  var nm=s.n[0]+(li?' ('+s.n[li]+')':'');
  return '<a class="card rv" '+d+' href="'+waLink(inquiry({service:nm,category:T['cat_'+s.c][0]}))+'" target="_blank" rel="noopener"><span class="no">'+no+'</span><h3>'+esc(s.n[li])+'</h3><span class="ask">'+WAI+esc(t('ask_wa'))+ARR+'</span></a>';
}
function renderMarquee(){
  var m=$('mq');if(!m)return;
  var h=SV.map(function(s){return '<span>'+esc(s.n[li].split(' (')[0])+'</span>'}).join('');
  m.innerHTML='<div class="mq-track">'+h+h+'</div>';
}
function renderBento(){
  var b=$('bento');if(!b)return;
  b.innerHTML=CATS.map(function(c,i){
    return '<a class="cat rv" style="--d:'+(i*60)+'ms" href="services.html?cat='+c+'"><span class="ico">'+ic(c,28)+'</span><h3>'+esc(t('cat_'+c))+'</h3><span class="n"><span>'+count(c)+' '+esc(t('stat_services'))+'</span>'+ARR+'</span></a>';
  }).join('');
}
function renderSteps(){
  var s=$('steps');if(!s)return;
  s.innerHTML=[1,2,3,4].map(function(n){return '<div class="step rv" style="--d:'+(n*70)+'ms"><h3>'+esc(t('s'+n+'h'))+'</h3><p>'+esc(t('s'+n+'p'))+'</p></div>'}).join('');
}
function renderStats(){
  var s=$('stats');if(!s)return;
  s.innerHTML=[[SV.length,'stat_services'],[CATS.length,'stat_cats'],[LANGS.length,'stat_langs']].map(function(x){return '<div class="stat"><b data-count="'+x[0]+'">0</b><span>'+esc(t(x[1]))+'</span></div>'}).join('');
  counters();
}
function renderFloat(){
  var f=$('chipf');if(!f)return;
  f.innerHTML=['visa','bank','veh'].map(function(c){return '<span class="chip-f">'+esc(t('cat_'+c))+'</span>'}).join('');
}
function fillGrid(){
  var g=$('grid');if(!g)return;
  var q=state.q.trim().toLowerCase(),out='';
  function match(s){return (state.cat==='all'||s.c===state.cat)&&(!q||s.n.some(function(x){return x.toLowerCase().indexOf(q)>-1}))}
  if(state.cat==='all'&&!q){
    CATS.forEach(function(c){
      out+='<section class="grp" id="g-'+c+'"><h2><span class="ico">'+ic(c,24)+'</span>'+esc(t('cat_'+c))+'<small>'+count(c)+'</small></h2><div class="cards">'+SV.filter(function(s){return s.c===c}).map(svcCard).join('')+'</div></section>';
    });
  }else{
    var list=SV.filter(match);
    out=list.length?'<div class="cards" style="margin-top:28px">'+list.map(svcCard).join('')+'</div>':'<p class="empty">'+esc(t('no_results'))+'</p>';
  }
  g.innerHTML=out;arm(g);
}
function renderChips(){
  var c=$('chips');if(!c)return;
  c.innerHTML=['all'].concat(CATS).map(function(k){return '<button type="button" class="chip" data-chip="'+k+'" aria-pressed="'+(state.cat===k)+'">'+esc(k==='all'?t('all'):t('cat_'+k))+'</button>'}).join('');
}
function renderVisaCards(){
  var g=$('vcards');if(!g)return;
  var l=SV.filter(function(s){return s.c==='visa'});
  g.innerHTML=l.map(svcCard).join('');arm(g);
}
function renderDesignCards(){
  var g=$('dcards');if(!g)return;
  g.innerHTML=SV.filter(function(s){return s.c==='design'}).map(svcCard).join('');arm(g);
}
function renderDesignPage(){
  var j=$('djump'),g=$('dgroups');if(!g)return;
  if(j)j.innerHTML=DS.map(function(x){return '<button type="button" class="chip" data-jump="dg-'+x.id+'">'+esc(x.n[li])+'</button>'}).join('');
  g.innerHTML=DS.map(function(x,gi){
    var rows=x.items.map(function(it,i){
      var nm=it[0]+(li?' ('+it[li]+')':'');
      var m=inquiry({service:nm,category:'Design - '+x.n[0]});
      return '<a class="dr rv" href="'+waLink(m)+'" target="_blank" rel="noopener"><span class="dr-n">'+esc(it[li])+'</span><span class="dr-a">'+WAI+'<span>'+esc(t('ask_wa'))+'</span>'+ARR+'</span></a>';
    }).join('');
    return '<section class="dg" id="dg-'+x.id+'"><div class="dg-head rv"><span class="dg-n">'+String(gi+1).padStart(2,'0')+'</span><h2>'+esc(x.n[li])+'</h2><span class="dg-c">'+x.items.length+' '+esc(t('stat_services'))+'</span></div><div class="dg-list">'+rows+'</div></section>';
  }).join('');
  arm(g);
}
var dn={};
function cname(code,lang){try{if(dn[lang]===undefined)dn[lang]=new Intl.DisplayNames([lang],{type:'region'});return dn[lang].of(code)||code}catch(e){dn[lang]=null;return code}}
function fillCountries(){
  var g=$('cgrid');if(!g)return;
  var loc=LANGS[li].c,q=state.cq.trim().toLowerCase();
  var list=B.CODES.map(function(c){return {c:c,n:cname(c,loc),e:cname(c,'en')}}).sort(function(a,b){return a.n.localeCompare(b.n,loc)})
   .filter(function(x){return !q||x.n.toLowerCase().indexOf(q)>-1||x.e.toLowerCase().indexOf(q)>-1||x.c.toLowerCase()===q});
  g.innerHTML=list.map(function(x){
    var m=inquiry({country:x.e+(li&&x.n!==x.e?' ('+x.n+')':'')});
    return '<a class="cc" href="'+waLink(m,WA_VISA)+'" target="_blank" rel="noopener"><span class="code">'+x.c+'</span><span class="nm">'+esc(x.n)+'</span>'+ARR+'</a>';
  }).join('')||'<p class="empty">'+esc(t('no_results'))+'</p>';
  var cc=$('ccount');if(cc)cc.textContent=t('c_count').replace('{n}',list.length);
}
function renderLangs(){
  var l=$('langs');if(!l)return;
  l.innerHTML=LANGS.map(function(x,i){return '<button type="button" lang="'+x.c+'" dir="'+x.d+'" data-setlang="'+x.c+'" aria-current="'+(i===li)+'">'+x.n+'</button>'}).join('');
}
function renderForm(){
  var s=$('f-service');if(!s)return;
  var v=s.value;
  s.innerHTML='<option value="">'+esc(t('f_pick'))+'</option>'+SV.map(function(x,i){return '<option value="'+i+'">'+esc(x.n[li])+'</option>'}).join('');
  s.value=v;
}

/* ---------- language ---------- */
function applyText(){
  document.querySelectorAll('[data-t]').forEach(function(el){
    var k=el.getAttribute('data-t'),v=t(k);
    if(k==='svc_p')v=v.replace('{n}',SV.length).replace('{c}',CATS.length);
    el.textContent=v;
  });
  document.querySelectorAll('[data-tp]').forEach(function(el){el.setAttribute('placeholder',t(el.getAttribute('data-tp')))});
  document.querySelectorAll('[data-ta]').forEach(function(el){el.setAttribute('aria-label',t(el.getAttribute('data-ta')))});
}
function setLang(code,save){
  li=0;LANGS.forEach(function(l,i){if(l.c===code)li=i});
  var L=LANGS[li],h=document.documentElement;
  h.lang=L.c;h.dir=L.d;
  if(save!==false){try{localStorage.setItem('bv-lang',L.c)}catch(e){}}
  applyText();
  var ln=$('lang-name');if(ln)ln.textContent=L.n;
  document.querySelectorAll('#gate-grid .lang-card').forEach(function(b,i){b.setAttribute('aria-current',i===li?'true':'false')});
  renderMarquee();renderBento();renderSteps();renderStats();renderFloat();renderChips();fillGrid();renderVisaCards();renderDesignCards();renderDesignPage();fillCountries();renderLangs();renderForm();
  arm(document);
}

/* gate */
var gate=$('gate'),app=$('app');
function buildGate(){
  $('gate-cap').innerHTML=LANGS.map(function(l,i){return '<span lang="'+l.c+'" dir="'+l.d+'">'+esc(T.gate_title[i])+'</span>'}).join('');
  $('gate-grid').innerHTML=LANGS.map(function(l,i){return '<button type="button" class="lang-card" lang="'+l.c+'" dir="'+l.d+'" data-l="'+l.c+'" aria-current="'+(i===li)+'"><b>'+l.n+'</b><span>'+l.g+'</span></button>'}).join('');
}
function openGate(){gate.hidden=false;gate.classList.remove('leave');app.inert=true;$('gate-x').hidden=!chosen;var f=gate.querySelector('.lang-card');if(f)f.focus()}
function closeGate(){startLoader();gate.classList.add('leave');app.inert=false;setTimeout(function(){if(gate.classList.contains('leave'))gate.hidden=true},500)}
$('gate-grid').addEventListener('click',function(e){var b=e.target.closest('[data-l]');if(!b)return;chosen=true;setLang(b.getAttribute('data-l'));closeGate()});
$('gate-x').addEventListener('click',closeGate);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&chosen&&!gate.hidden&&!gate.classList.contains('leave'))closeGate()});
$('lang-btn').addEventListener('click',openGate);

/* header */
var top_=$('top');
$('menu-btn').addEventListener('click',function(){var o=top_.classList.toggle('open');this.setAttribute('aria-expanded',o?'true':'false')});

/* interactions */
function copyText(txt,btn){
  function done(){btn.textContent=t('copied');setTimeout(function(){btn.textContent=t('copy')},1400)}
  function fb(){var ta=document.createElement('textarea');ta.value=txt;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy')}catch(_){}ta.remove();done()}
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(done,fb);else fb();
}
document.addEventListener('click',function(e){
  var ch=e.target.closest('[data-chip]');
  if(ch){state.cat=ch.getAttribute('data-chip');renderChips();fillGrid();return}
  var sl=e.target.closest('[data-setlang]');if(sl){chosen=true;setLang(sl.getAttribute('data-setlang'));return}
  var jp=e.target.closest('[data-jump]');if(jp){var el=$(jp.getAttribute('data-jump'));if(el)el.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'});return}
  var cp=e.target.closest('[data-copy]');if(cp){copyText(cp.getAttribute('data-copy'),cp)}
});
document.addEventListener('input',function(e){
  if(e.target.id==='q'){state.q=e.target.value;fillGrid()}
  if(e.target.id==='cq'){state.cq=e.target.value;fillCountries()}
});
document.addEventListener('pointermove',function(e){
  var c=e.target.closest&&e.target.closest('.card,.cat');if(!c)return;
  var r=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px');
});
var form=$('req');
if(form)form.addEventListener('submit',function(e){
  e.preventDefault();
  var name=$('f-name').value.trim(),ph=$('f-phone').value.trim(),si=$('f-service').value,m=$('f-msg').value.trim();
  var lines=['Hello Bright Vision,','I would like to make an enquiry.'];
  if(si!=='')lines.push('Service: '+SV[+si].n[0]+(li?' ('+SV[+si].n[li]+')':''));
  if(name)lines.push('Name: '+name);
  if(ph)lines.push('Phone: '+ph);
  if(li)lines.push('My language: '+LANGS[li].g2);
  if(m)lines.push(m);
  var msg=lines.join('\n');
  $('ready').innerHTML='<div class="ready"><b>'+esc(t('f_ready'))+'</b><pre>'+esc(msg)+'</pre><div class="row"><a class="btn wa sm" href="'+waLink(msg)+'" target="_blank" rel="noopener">'+WAI+esc(t('f_open'))+'</a><button type="button" class="btn line sm" data-copy="'+esc(msg)+'">'+esc(t('copy'))+'</button></div></div>';
});

/* scroll: progress, header, hero parallax */
var tick=false;
function onScroll(){
  if(tick)return;tick=true;
  requestAnimationFrame(function(){
    tick=false;
    var y=window.scrollY||0,h=document.documentElement.scrollHeight-innerHeight;
    $('prog').style.transform='scaleX('+(h>0?Math.min(1,y/h):0)+')';
    top_.classList.toggle('scrolled',y>24);
    if(!RM){var a=document.querySelector('.hero-art');if(a)a.style.setProperty('--py',Math.min(y,600)*.1)}
  });
}
window.addEventListener('scroll',onScroll,{passive:true});onScroll();

/* design page loader: 2 seconds, then the page opens */
var loader=$('loader'),loaderStarted=false;
function startLoader(){
  if(!loader||loaderStarted)return;loaderStarted=true;
  var pct=$('ld-pct'),bar=$('ld-bar'),dur=RM?400:2000,t0=performance.now(),done=false;
  function finish(){
    if(done)return;done=true;
    loader.classList.add('done');document.body.classList.add('opened');
    setTimeout(function(){loader.hidden=true;document.body.classList.remove('has-loader')},RM?0:900);
  }
  function step(n){
    if(done)return;
    var p=Math.min(1,(n-t0)/dur),e=1-Math.pow(1-p,2.2),v=Math.round(e*100);
    pct.textContent=v;bar.style.transform='scaleX('+e+')';
    if(p<1)requestAnimationFrame(step);else finish();
  }
  requestAnimationFrame(step);
  $('ld-skip').addEventListener('click',finish);
  loader.addEventListener('pointermove',function(ev){
    var x=(ev.clientX/innerWidth-.5),y=(ev.clientY/innerHeight-.5);
    loader.querySelectorAll('[data-depth]').forEach(function(el){var d=+el.getAttribute('data-depth');el.style.transform='translate('+(x*d)+'px,'+(y*d)+'px)'});
  });
}
/* start */
$('yr').textContent=new Date().getFullYear();
var qs=new URLSearchParams(location.search);
if(page==='services'&&CATS.indexOf(qs.get('cat'))>-1)state.cat=qs.get('cat');
buildGate();
var saved=null;try{saved=localStorage.getItem('bv-lang')}catch(e){}
if(LANGS.some(function(l){return l.c===saved})){chosen=true;setLang(saved,false);gate.hidden=true;startLoader()}
else{setLang('en',false);openGate()}
})();
