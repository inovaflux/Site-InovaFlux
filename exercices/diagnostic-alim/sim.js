/* =========================================================================
   sim.js - Diagnostic alimentation lineaire (Module 11) - schema utilisateur
   Les pastilles ORANGE du SVG sont les points de test ; les etiquettes de
   composants (R1, Q1, C3, IC1...) sont cliquables pour l'inspection.
   ========================================================================= */
(function (global) {
'use strict';
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
function num(x){ var v=parseFloat(x); return isNaN(v)?0:v; }

/* ---------------- roles ---------------- */
var ROLES = {
  T1:'Transformateur 120 V / 60 Hz vers 16 V alternatif',
  F1:'Fusible de protection', R1:'Resistance de la LED', D2:'LED temoin',
  R2:'Resistance de la reference zener (2.2k)', R3:'Alimentation du LM358 (470)',
  D3:'Diode zener de reference 16 V', C3:'Condensateur de la reference',
  R4:'Potentiometre de reglage de la sortie', R5:'Resistance de la reference', R6:'Resistance de la reference',
  C4:'Condensateur de filtrage de l\'entree +', IC1:'Amplificateur d\'erreur LM358',
  R7:'Resistance de commande de Q2', Q2:'Transistor de commande (2N3904)',
  Q1:'Transistor de passage (TIP41C)', D4:'Diode de protection C-E', R8:'Resistance de detection (shunt 1 ohm)',
  Q3:'Transistor de limitation de courant (2N3906)', R9:'Resistance de base de Q3 (1k)',
  R10:'Resistance du reseau de repli', R11:'Resistance du reseau de repli', Q4:'Transistor de repli (2N3904)',
  C5:'Condensateur de sortie', R12:'Resistance de charge (1k)'
};

/* ---------------- pannes candidates ---------------- */
var PANNES = [
  { id:'T1',  spec:{mode:'open'}, vis:.4, t:'Transformateur defectueux (secondaire ouvert)' },
  { id:'F1',  spec:{mode:'open'}, vis:.5, t:'Fusible grille' },
  { id:'R1',  spec:{mode:'open'}, vis:.3, t:'Resistance de la LED ouverte' },
  { id:'D2',  spec:{mode:'open'}, vis:.35, t:'LED temoin ouverte' },
  { id:'R2',  spec:{mode:'open'}, vis:.4, t:'Reference coupee (R2 ouverte)' },
  { id:'R2',  spec:{mode:'cold'}, vis:.15, t:'Soudure froide sur R2' },
  { id:'T_A', spec:{mode:'open'}, vis:0, t:'Piste coupee : pont -> R2' },
  { id:'T_B', spec:{mode:'open'}, vis:0, t:'Piste coupee : R2 -> R3' },
  { id:'T_C', spec:{mode:'open'}, vis:0, t:'Piste coupee : R3 -> R1' },
  { id:'T_D', spec:{mode:'open'}, vis:0, t:'Piste coupee : R1 -> C1' },
  { id:'T_E', spec:{mode:'open'}, vis:0, t:'Piste coupee : C1 -> C2' },
  { id:'T_F', spec:{mode:'open'}, vis:0, t:'Piste coupee : C2 -> etage puissance' },
  { id:'T_VA', spec:{mode:'open'}, vis:0, t:'Piste coupee : R8 -> R9' },
  { id:'T_VB', spec:{mode:'open'}, vis:0, t:'Piste coupee : R9 -> C5' },
  { id:'T_VC', spec:{mode:'open'}, vis:0, t:'Piste coupee : C5 -> R12' },
  { id:'P_Q1E', spec:{mode:'open'}, vis:0, t:'Piste coupee : Q1e -> R8 (gauche)' },
  { id:'P_VCC', spec:{mode:'open'}, vis:0, t:'Piste coupee : R3 -> LM358 (Vcc)' },
  { id:'T_ref1', spec:{mode:'open'}, vis:0, t:'Piste coupee (ref) : R2 -> D3' },
  { id:'T_ref2', spec:{mode:'open'}, vis:0, t:'Piste coupee (ref) : D3 -> C3' },
  { id:'T_ref3', spec:{mode:'open'}, vis:0, t:'Piste coupee (ref) : C3 -> R4' },
  { id:'R5',  spec:{mode:'cold'}, vis:.15, t:'Soudure froide sur R5' },
  { id:'R8',  spec:{mode:'cold'}, vis:.15, t:'Soudure froide sur R8' },
  { id:'R3',  spec:{mode:'open'}, vis:.4, t:'Alim LM358 coupee (R3 ouverte)' },
  { id:'R4',  spec:{mode:'open'}, vis:.35, t:'Potentiometre ouvert' },
  { id:'R4',  spec:{mode:'drift',factor:0.5}, vis:.2, t:'Potentiometre derive' },
  { id:'R5',  spec:{mode:'open'}, vis:.3, t:'Resistance de reference ouverte' },
  { id:'R6',  spec:{mode:'open'}, vis:.3, t:'Resistance de reference ouverte' },
  { id:'R7',  spec:{mode:'open'}, vis:.35, t:'Resistance de commande ouverte' },
  { id:'IC1', spec:{mode:'open'}, vis:.15, t:'Amplificateur d\'erreur mort (LM358 HS)' },
  { id:'IC1', spec:{mode:'short'}, vis:.2, t:'LM358 : sortie collee (court-circuit interne)' },
  { id:'R8',  spec:{mode:'open'}, vis:.5, t:'Shunt de sortie ouvert' },
  { id:'D3',  spec:{mode:'open'}, vis:.5, t:'Zener de reference ouverte' },
  { id:'D3',  spec:{mode:'short'}, vis:.6, t:'Zener de reference en court-circuit' },
  { id:'D3',  spec:{mode:'leak'}, vis:.3, t:'Zener de reference fuyante' },
  { id:'D4',  spec:{mode:'short'}, vis:.5, t:'Diode de protection en court-circuit' },
  { id:'C1',  spec:{mode:'short'}, vis:.6, t:'Condensateur de filtrage en court-circuit' },
  { id:'C2',  spec:{mode:'short'}, vis:.5, t:'Condensateur de decouplage en court-circuit' },
  { id:'C3',  spec:{mode:'short'}, vis:.6, t:'Condensateur de reference en court-circuit' },
  { id:'C4',  spec:{mode:'short'}, vis:.45, t:'Condensateur de filtrage en court-circuit' },
  { id:'C5',  spec:{mode:'short'}, vis:.6, t:'Condensateur de sortie en court-circuit' },
  { id:'Q1',  spec:{mode:'bjt',be:'open',bc:'ok',ce:'ok'}, vis:.55, t:'Transistor de passage (B-E ouvert)' },
  { id:'Q1',  spec:{mode:'bjt',be:'ok',bc:'ok',ce:'short'}, vis:.6, t:'Transistor de passage (C-E en court-circuit)' },
  { id:'Q2',  spec:{mode:'bjt',be:'short',bc:'ok',ce:'ok'}, vis:.5, t:'Transistor de commande (B-E en court-circuit)' },
  { id:'Q2',  spec:{mode:'bjt',be:'open',bc:'ok',ce:'ok'}, vis:.4, t:'Transistor de commande (B-E ouvert)' },
  { id:'Q3',  spec:{mode:'bjt',be:'ok',bc:'ok',ce:'short'}, vis:.5, t:'Transistor de limitation en court-circuit' },
  { id:'PT_OUT', spec:{mode:'open'}, vis:0, t:'Piste de sortie coupee' }
];

var state = {
  mode:'demo', faults:[], solution:null, nominal:null,
  probeP:null, probeN:null, activeProbe:'P', mmMode:'V',
  repaired:[], wrong:0, obsMode:'none', boardSvg:false,
  scenarios:[], scenarioIndex:0, testTotal:0, testMax:10, results:[], answered:false,
  power:true, diagOk:0, gen:0, genMeas:0,
  fiche:null, phase:0, stepId:null, trail:[], stepDone:false, stepFb:'', stepVal:'', stepWrong:false, nextId:null, pendingTrail:'',
  seen:{}, symChecked:{}, thermalMap:null, obsDone:false, currentOK:'', lensHits:{},
  declOk:false, declFb:'', declBand:'', symProbeKey:'', probeKey3:'', normOk:false, normFb:'', expOk:false, expFb:'', stepNormOk:false, stepNormFb:''
};
function fmtMeas(m,mode){
  if(mode==='ohm') return (!isFinite(m.r)||m.r>2e6)?'O.L. (hors calibre)':(m.r<1000?m.r.toFixed(0)+' ohm':(m.r/1000).toFixed(2)+' kohm');
  if(mode==='cont') return (isFinite(m.r)&&m.r<50)?'BIP ('+m.r.toFixed(0)+' ohm)':'O.L. (ouvert)';
  if(mode==='diode') return (!isFinite(m.v)||m.v>=2)?'O.L. (jonction ouverte)':m.v.toFixed(3)+' V';
  return '---';
}
/* ngspice n'est affiche que s'il CORROBORE l'analyse interne (sinon on garde l'analyse) */
function measCoherent(a,b,mode){
  if(mode==='diode'){ var ao=!isFinite(a.v)||a.v>=2, bo=!isFinite(b.v)||b.v>=2; if(ao!==bo) return false; if(ao) return true; return Math.abs(a.v-b.v)<Math.max(0.2,0.4*Math.abs(a.v)); }
  var ar=!isFinite(a.r)||a.r>2e6, br=!isFinite(b.r)||b.r>2e6; if(ar!==br) return false; if(ar) return true;
  return Math.abs(a.r-b.r)<Math.max(20,0.5*Math.abs(a.r));
}
var BY_ID = {};
global.ALIM.components.forEach(function(c){ BY_ID[c.id]=c; });
function compLabel(id){ return (BY_ID[id]&&BY_ID[id].label)||id; }
function compValue(id){ return (BY_ID[id]&&BY_ID[id].value)||''; }
function isVirtual(id){ return !!(BY_ID[id]&&BY_ID[id].virtual); }

/* ---------------- pannes ---------------- */
function randInt(n){ return Math.floor(Math.random()*n); }
function bjtFault(){
  var o=['ok','open','short']; var be=o[randInt(3)],bc=o[randInt(3)],ce=o[randInt(3)];
  if(be==='ok'&&bc==='ok'&&ce==='ok') ce=Math.random()<.5?'open':'short';
  return {be:be,bc:bc,ce:ce};
}
function makeOneFault(def){
  var f={ id:def.id, visible:Math.random()<(def.vis||0) };
  if(def.spec){ for(var k in def.spec) f[k]=def.spec[k]; }
  else { f.mode='open'; }
  if(f.mode==='leak') f.r=1500+Math.random()*3000;
  f.desc=describeFault(f);
  return f;
}
function describeFault(f){
  var n=compLabel(f.id), base=n;
  if(f.mode==='open') base=n+' est ouvert(e)';
  else if(f.mode==='short') base=n+' est en court-circuit';
  else if(f.mode==='drift') base=n+' a derive ('+Math.round(f.factor*100)+' %)';
  else if(f.mode==='leak') base=n+' est fuyant(e)';
  else if(f.mode==='cold') base='soudure froide sur '+n;
  else if(f.mode==='bjt'){ var p=[]; if(f.be!=='ok')p.push('B-E '+f.be); if(f.bc!=='ok')p.push('B-C '+f.bc); if(f.ce!=='ok')p.push('C-E '+f.ce); base=n+' : '+p.join(', '); }
  return {id:f.id,text:base,visible:f.visible};
}
function makeFaults(n){
  var pool=PANNES.slice(), out=[];
  for(var k=0;k<n&&pool.length;k++){
    var i=randInt(pool.length), def=pool.splice(i,1)[0];
    out.push(makeOneFault(def));
    pool=pool.filter(function(d){ return d.id!==def.id; });   // un seul defaut par composant
  }
  return out;
}

/* ---------------- mesures ---------------- */
function solve(){
  var faults=state.faults, gen=++state.gen;
  state.solution=global.ALIM.solve(faults);              /* base : analyse (immediate, AC comprise) */
  state.thermalMap=global.ALIM.thermal(faults);          /* niveaux de temperature (0-3) par composant */
  state.netGroup=global.ALIM.netGroup(null);             /* survol : nominal (ne trahit pas une piste coupee) */
  state.netGroupAct=global.ALIM.netGroup(faults);        /* sondes : groupes reels */
  if(global.SPICE && global.SPICE.ready){
    global.SPICE.solve(faults).then(function(sp){
      if(gen!==state.gen) return;                        /* resultat obsolete ignore */
      /* ngspice est la source des valeurs */
      for(var k in sp){ var s=sp[k]; if(typeof s==='number' && isFinite(s)) state.solution[k]=s; }
      renderAll();
    }).catch(function(){});
  }
}
function sameGroup(a,b){ if(!a||!b) return false; if(a===b) return true; var g=state.netGroup||{}; return g[a]!==undefined && g[a]===g[b]; }
function probeSameGroup(a,b){ if(!a||!b) return false; if(a===b) return true; var g=state.netGroupAct||{}; return g[a]!==undefined && g[a]===g[b]; }
function nodeV(n){ if(!state.power) return 0; return state.solution?(state.solution[n]||0):0; }
function symptoms(){
  var out=[], vout=nodeV('outT'), vn=global.ALIM.VOUT_NOM;
  if(vout<1.5) out.push({k:'ko',t:'Tension de sortie effondree ('+vout.toFixed(2)+' V).'});
  else if(vout>vn+2.5) out.push({k:'ko',t:'Tension de sortie trop elevee ('+vout.toFixed(1)+' V).'});
  else if(Math.abs(vout-vn)>0.8) out.push({k:'ko',t:'Tension de sortie incorrecte ('+vout.toFixed(1)+' V au lieu de ~'+vn+' V).'});
  else out.push({k:'ok',t:'Tension de sortie normale (~'+vn+' V).'});
  return out;
}

/* ---------------- SVG : reperage des pastilles / etiquettes ---------------- */
function svgRoot(){ var h=$('schemaHost'); return h?h.querySelector('svg'):null; }
function parseTransform(t){
  if(!t) return null; var m;
  m=/matrix\(([^)]*)\)/.exec(t); if(m){var a=m[1].split(/[ ,]+/).map(num);return {a:a[0],b:a[1],c:a[2],d:a[3],e:a[4],f:a[5]};}
  m=/translate\(([^)]*)\)/.exec(t); if(m){var b=m[1].split(/[ ,]+/).map(num);return {a:1,b:0,c:0,d:1,e:b[0],f:b[1]||0};}
  m=/rotate\(([^)]*)\)/.exec(t); if(m){var c=m[1].split(/[ ,]+/).map(num),r=c[0]*Math.PI/180,ca=Math.cos(r),sa=Math.sin(r),cx=c[1]||0,cy=c[2]||0;return {a:ca,b:sa,c:-sa,d:ca,e:cx-ca*cx+sa*cy,f:cy-sa*cx-ca*cy};}
  return null;
}
function applyT(M,x,y){ return M?[M.a*x+M.c*y+M.e, M.b*x+M.d*y+M.f]:[x,y]; }

function injectSchema(){
  $('schemaHost').innerHTML = global.SCHEMATIC_SVG;
  var svg=svgRoot(); if(!svg) return;
  svg.id='schemaSvg';
  recolor(svg);
  tagPads(svg); tagLabels(svg); tagComponents(svg);
  svg.querySelectorAll('.tp').forEach(function(g){
    if(g._bound) return; g._bound=true;
    g.addEventListener('click',function(ev){ ev.stopPropagation(); onTestPoint(g.getAttribute('data-node'), g.getAttribute('data-tp')); });
    g.addEventListener('mouseenter',function(){ corrFor(g.getAttribute('data-node'),true); });
    g.addEventListener('mouseleave',function(){ corrFor(g.getAttribute('data-node'),false); });
  });
  bindSchemaZones(svg);
  markFaults();
}
/* clic/survol n'importe ou sur le schema -> composant le plus proche */
function svgPoint(ev){
  var svg=svgRoot(); if(!svg) return null;
  try{ var pt=svg.createSVGPoint(); pt.x=ev.clientX; pt.y=ev.clientY;
       var r=pt.matrixTransform(svg.getScreenCTM().inverse()); return [r.x,r.y]; }
  catch(e){ return null; }
}
function nearestCompLabel(p){
  var svg=svgRoot(); if(!svg||!p) return null;
  var best=null,bd=1e9;
  svg.querySelectorAll('.comp-label').forEach(function(el){
    var d=Math.hypot(num(el.getAttribute('x'))-p[0], num(el.getAttribute('y'))-p[1]);
    if(d<bd){ bd=d; best=el; }
  });
  return (best&&bd<=110)? best.getAttribute('data-comp') : null;
}
function bindSchemaZones(svg){
  if(svg._zones) return; svg._zones=true;
  svg.addEventListener('click',function(ev){ var id=nearestCompLabel(svgPoint(ev)); if(id) compAction(id); },false);
  var last=null;
  svg.addEventListener('mousemove',function(ev){
    var id=nearestCompLabel(svgPoint(ev));
    if(id!==last){ last=id; if(id) compHover(id); }
  },false);
}
/* clic/survol n'importe ou sur la PHOTO -> composant le plus proche */
function nearestHotspot(ev){
  var bw=$('boardWrap'); if(!bw) return null;
  var r=bw.getBoundingClientRect();
  var px=ev.clientX-r.left, py=ev.clientY-r.top;
  var best=null,bd=1e9;
  bw.querySelectorAll('.hotspot').forEach(function(h){
    var hx=(parseFloat(h.style.left)||0)/100*r.width;
    var hy=(parseFloat(h.style.top)||0)/100*r.height;
    var d=Math.hypot(hx-px, hy-py);
    if(d<bd){ bd=d; best=h; }
  });
  return (best&&bd<=95)? best.getAttribute('data-comp') : null;
}
function bindBoardZones(){
  var bw=$('boardWrap'); if(!bw||bw._zones) return; bw._zones=true;
  bw.addEventListener('click',function(ev){
    if(ev.target.closest&&(ev.target.closest('.pt')||ev.target.closest('.hotspot'))) return;
    var id=nearestHotspot(ev); if(id) compAction(id);
  });
  var last=null;
  bw.addEventListener('mousemove',function(ev){
    if(ev.target.closest&&(ev.target.closest('.pt')||ev.target.closest('.hotspot'))) return;
    var id=nearestHotspot(ev);
    if(id!==last){ last=id; if(id) compHover(id); }
  });
}
function recolor(svg){
  svg.querySelectorAll('*').forEach(function(el){
    var st=el.getAttribute('style');
    if(st){ st=st.replace(/stroke:#000000/g,'stroke:#7dd3fc').replace(/stroke:black/g,'stroke:#7dd3fc')
                 .replace(/fill:#000000/g,'fill:#e2e8f0').replace(/fill:black/g,'fill:#e2e8f0');
      el.setAttribute('style',st);
    }
    var sf=el.getAttribute('fill'); if(sf==='#000000'||sf==='black') el.setAttribute('fill','#e2e8f0');
    var ss=el.getAttribute('stroke'); if(ss==='#000000'||ss==='black') el.setAttribute('stroke','#7dd3fc');
  });
}
function tagPads(svg){
  var map=window.TPMAP||[], k=0;
  svg.querySelectorAll('circle').forEach(function(el){
    var st=(el.getAttribute('style')||'')+' '+(el.getAttribute('fill')||'');
    var isOrange=st.indexOf('e8730c')>=0;
    var isBlue=st.indexOf('11e8')>=0 || st.indexOf('100ce8')>=0;
    if(!isOrange && !isBlue) return;
    var p=applyT(parseTransform(el.getAttribute('transform')), num(el.getAttribute('cx')), num(el.getAttribute('cy')));
    var best=null,bd=1e9;
    map.forEach(function(e){ var d=Math.hypot(e[0]-p[0],e[1]-p[1]); if(d<bd){bd=d;best=e;} });
    if(!best||bd>7) return;
    el.setAttribute('class','tp pad'+(isBlue?' ac':''));
    el.setAttribute('data-node',best[2]);
    el.setAttribute('data-tp','s'+(k++));
  });
}
function isAcNode(n){ return n && global.ALIM.acNodes && global.ALIM.acNodes[n]; }
function tagLabels(svg){
  var ids={}, vals={};
  global.ALIM.components.forEach(function(c){
    ids[c.id]=true;
    if(!c.virtual && c.value){ var v=String(c.value).trim().toLowerCase(); if(v) vals[v]=c.id; }
  });
  svg.querySelectorAll('text').forEach(function(el){
    var t=(el.textContent||'').trim();
    if(ids[t]){ el.setAttribute('class','comp-label'); el.setAttribute('data-comp',t);
      el.addEventListener('click',function(ev){ ev.stopPropagation(); compAction(t); });
      el.addEventListener('mouseenter',function(){ compHover(t); }); return; }
    var vid=t? vals[t.toLowerCase()]:null;
    if(vid){ el.setAttribute('class',(el.getAttribute('class')||'')+' comp-val'); el.setAttribute('data-comp-val',vid); }
  });
}
/* zones interactives sur le CORPS des composants (survol = oeil, clic = toucher) */
function tagComponents(svg){
  svg.querySelectorAll('.comp').forEach(function(g){
    if(g._boundZone) return; g._boundZone=true;
    var id=g.getAttribute('data-comp'); if(!id) return;
    g.addEventListener('mouseenter',function(){ compHover(id); });
    g.addEventListener('click',function(ev){ ev.stopPropagation(); compAction(id); });
    var t=g.querySelector('text'); if(t){ /* deja gere par tagLabels */ }
  });
}
function markFaults(){
  var svg=svgRoot(); if(!svg) return;
  svg.querySelectorAll('.comp-label').forEach(function(g){ g.classList.remove('fault-visible','fault-invisible'); });
  state.faults.forEach(function(f){
    if(!f.visible) return;                 /* panne invisible : traitee comme une piece saine */
    var g=svg.querySelector('.comp-label[data-comp="'+f.id+'"]');
    if(g) g.classList.add('fault-visible');
  });
}

/* ---------------- fiche composant ---------------- */
function pinList(c){
  if(!c) return [];
  if(c.type==='npn'||c.type==='pnp') return [{pin:'B',node:c.b},{pin:'C',node:c.c},{pin:'E',node:c.e}];
  if(c.type==='opamp') return [{pin:'+ (in+)',node:c.pp},{pin:'- (in-)',node:c.pn},{pin:'sortie',node:c.out},{pin:'Vcc',node:c.vcc},{pin:'GND',node:c.gnd}];
  if(c.type==='xfmr') return [{pin:'secondaire 1 (AC)',node:'ac1'},{pin:'secondaire 2 (AC)',node:'ac2'}];
  if(c.type==='vs') return [{pin:'+',node:c.p},{pin:'-',node:c.n}];
  return [{pin:'1',node:c.a},{pin:'2',node:c.b}];
}
/* ---------- observation manuelle (les sens) ---------- */
function compAction(id){
  if(state.obsMode==='thermal') return;              /* camera : seule la lentille revele le halo */
  onComponent(id);
}
function compHover(id){ if(state.obsMode==='look') showObs(id); }
function faultOf(id){ var r=null; state.faults.forEach(function(f){ if(f.id===id) r=f; }); return r; }
function revealObs(){
  var ob=$('obsFloat'); if(ob) ob.classList.remove('min');
  var mm=$('mmFloat'); if(mm) mm.classList.remove('min');
}
var TEMP_COLORS=['#22c55e','#facc15','#f97316','#ef4444'];  /* froid, tiede, chaud, brulant */
function paintTemp(id,th){
  var col=TEMP_COLORS[th]||'#e2e8f0';
  var svg=svgRoot();
  if(svg) svg.querySelectorAll('.comp-label[data-comp="'+id+'"]').forEach(function(el){ el.style.setProperty('fill',col,'important'); });
  document.querySelectorAll('#boardWrap .hotspot[data-comp="'+id+'"]').forEach(function(el){ el.style.borderColor=col; el.style.color=col; });
}
function resetTemp(){
  var svg=svgRoot();
  if(svg){
    svg.querySelectorAll('.comp-label').forEach(function(el){ el.style.removeProperty('fill'); el.style.removeProperty('filter'); });
    svg.querySelectorAll('.comp').forEach(function(el){ el.style.removeProperty('filter'); });
    var sg=svg.querySelector('#schemaThermGlow'); if(sg) sg.innerHTML='';
  }
  document.querySelectorAll('#boardWrap .hotspot').forEach(function(el){ el.style.borderColor=''; el.style.color=''; el.classList.remove('thermal'); });
  var g=$('thermGlow'); if(g) g.innerHTML='';
  state.lensHits={};
}
function showObs(id){
  revealObs();
  var f=faultOf(id);
  var h='<div class="obshead">&#128065; Observation visuelle &mdash; <b>'+esc(id)+'</b></div>';
  if(f && f.visible){
    var d={open:'Traces de brulure / noircissement visibles.',short:'Composant eclate, traces de carbone.',
      drift:'Surchauffe visible, teinte foncee.',leak:'Gonflement ou coulure visible.',
      cold:'Soudure terne et craquelee (aspect granuleux).',bjt:'Boitier fissure, brulure sur les pattes.'}[f.mode]||'Dommage visible.';
    h+='<div class="obsline ko">&#9888; '+d+'</div>';
  } else {
    h+='<div class="obsline ok">Aspect normal : pas de dommage apparent.</div>';
  }
  /* etat VISUEL de la DEL temoin, meme sans dommage sur la piece */
  if((id==='D2'||id==='R1') && nodeV('d2on')<0.5) h+='<div class="obsline ko">&#128680; La DEL temoin D2 est eteinte (elle ne s\'allume pas).</div>';
  $('obsOut').innerHTML=h;
}
/* ---------- camera thermique (remplace l'ancien "toucher") ---------- */
function tempColor(th){ return TEMP_COLORS[th]||'#94a3b8'; }
function thermalReveal(id){
  var th=(state.thermalMap&&state.thermalMap[id])||0;
  paintTemp(id,th);
  state.seen[id]=true;
  var col=tempColor(th);
  var svg=svgRoot();
  if(svg){
    svg.querySelectorAll('.comp-label[data-comp="'+id+'"]').forEach(function(el){
      if(th>0) el.style.setProperty('filter','drop-shadow(0 0 7px '+col+')','important');
    });
    svg.querySelectorAll('.comp[data-comp="'+id+'"]').forEach(function(el){
      if(th>0) el.style.setProperty('filter','drop-shadow(0 0 9px '+col+')','important');
    });
  }
  document.querySelectorAll('#boardWrap .hotspot[data-comp="'+id+'"]').forEach(function(el){
    if(th>0) el.classList.add('thermal');
  });
  thermGlow(id,th);
  schemaGlow(id,th);
}
function ensureThermDefs(svg){
  if(svg.querySelector('#thermDefs')) return;
  var ns='http://www.w3.org/2000/svg';
  var defs=document.createElementNS(ns,'defs'); defs.setAttribute('id','thermDefs');
  for(var i=1;i<=3;i++){
    var rg=document.createElementNS(ns,'radialGradient'); rg.setAttribute('id','thg'+i);
    var s1=document.createElementNS(ns,'stop'); s1.setAttribute('offset','0%'); s1.setAttribute('stop-color',TEMP_COLORS[i]); s1.setAttribute('stop-opacity','0.9');
    var s2=document.createElementNS(ns,'stop'); s2.setAttribute('offset','100%'); s2.setAttribute('stop-color',TEMP_COLORS[i]); s2.setAttribute('stop-opacity','0');
    rg.appendChild(s1); rg.appendChild(s2); defs.appendChild(rg);
  }
  svg.insertBefore(defs, svg.firstChild);
}
function schemaGlow(id,th){
  var svg=svgRoot(); if(!svg) return;
  ensureThermDefs(svg);
  var g=svg.querySelector('#schemaThermGlow');
  if(!g){ g=document.createElementNS('http://www.w3.org/2000/svg','g'); g.setAttribute('id','schemaThermGlow'); g.setAttribute('pointer-events','none'); svg.appendChild(g); }
  var c = g.querySelector('[data-g="'+id+'"]');
  if(th<=0){ if(c) c.remove(); return; }
  var lab=svg.querySelector('.comp-label[data-comp="'+id+'"]'); if(!lab) return;
  if(!c){ c=document.createElementNS('http://www.w3.org/2000/svg','circle'); c.setAttribute('data-g',id); g.appendChild(c); }
  var x=num(lab.getAttribute('x')), y=num(lab.getAttribute('y'));
  /* le halo se centre sur le NOM DE VALEUR (ex: Tip41C) s'il existe, sinon sur le repere */
  var vals=svg.querySelectorAll('.comp-val[data-comp-val="'+id+'"]'), bx=x, by=y, bd=1e9;
  vals.forEach(function(v){ var vx=num(v.getAttribute('x')), vy=num(v.getAttribute('y')), d=Math.hypot(vx-x,vy-y); if(d<bd){ bd=d; bx=vx; by=vy; } });
  c.setAttribute('cx',bx);
  c.setAttribute('cy',by);
  c.setAttribute('r', [0,26,34,46][th]||34);
  c.setAttribute('fill','url(#thg'+th+')');
  c.setAttribute('opacity', th>=3?'0.95':(th===2?'0.85':'0.7'));
}
function thermGlow(id,th){
  var host=$('thermGlow'); if(!host) return;
  var el=host.querySelector('[data-g="'+id+'"]');
  if(th<=0){ if(el) el.remove(); return; }
  if(!el){
    var hs=document.querySelector('#boardWrap .hotspot[data-comp="'+id+'"]');
    if(!hs) return;
    el=document.createElement('div'); el.className='tglow'; el.setAttribute('data-g',id);
    el.style.left=hs.style.left; el.style.top=hs.style.top;
    host.appendChild(el);
  }
  var col=tempColor(th), sz=[0,56,74,92][th]||74;
  el.style.width=sz+'px'; el.style.height=sz+'px';
  el.style.opacity=th>=3?'0.95':(th===2?'0.85':'0.7');
  el.style.background='radial-gradient(circle, '+col+' 0%, '+col+'00 68%)';
}
function thermalTargets(){
  var ids={}, out=[];
  document.querySelectorAll('#boardWrap .hotspot').forEach(function(h){
    var id=h.getAttribute('data-comp'); if(id&&!ids[id]){ ids[id]=true; out.push(id); }
  });
  return out;
}
function thermalAllSeen(){
  var t=thermalTargets(); if(!t.length) return true;
  for(var i=0;i<t.length;i++){ if(!state.seen[t[i]]) return false; }
  return true;
}
/* retire le HALO (et le contour) mais garde le nom colore : appele quand la piece sort de la camera */
function thermalClearHalo(id){
  thermGlow(id,0);
  schemaGlow(id,0);
  var svg=svgRoot();
  if(svg){
    svg.querySelectorAll('.comp-label[data-comp="'+id+'"]').forEach(function(el){ el.style.removeProperty('filter'); });
    svg.querySelectorAll('.comp[data-comp="'+id+'"]').forEach(function(el){ el.style.removeProperty('filter'); });
  }
  document.querySelectorAll('#boardWrap .hotspot[data-comp="'+id+'"]').forEach(function(el){ el.classList.remove('thermal'); });
}
function thermalClearAllHalos(){
  var h=state.lensHits||{}; for(var id in h) thermalClearHalo(id);
  state.lensHits={};
}
function scanLens(){
  if(state.obsMode!=='thermal') return;
  var lens=$('thermalLens'); if(!lens) return;
  var r=lens.getBoundingClientRect(), maxth=-1, changed=false, now={};
  function test(el,id){
    var b=el.getBoundingClientRect(), cx=b.left+b.width/2, cy=b.top+b.height/2;
    if(cx<r.left||cx>r.right||cy<r.top||cy>r.bottom) return;
    now[id]=true;
    var th=(state.thermalMap&&state.thermalMap[id])||0;
    if(th>maxth) maxth=th;
    if(!state.seen[id]) changed=true;
    thermalReveal(id);
  }
  var svg=svgRoot();
  if(svg) svg.querySelectorAll('.comp-label').forEach(function(el){ var id=el.getAttribute('data-comp'); if(id) test(el,id); });
  document.querySelectorAll('#boardWrap .hotspot').forEach(function(el){ var id=el.getAttribute('data-comp'); if(id) test(el,id); });
  /* eteint le halo des pieces qui viennent de sortir du cadre */
  var prev=state.lensHits||{};
  for(var pid in prev){ if(!now[pid]) thermalClearHalo(pid); }
  state.lensHits=now;
  var col=maxth>0?TEMP_COLORS[maxth]:'#64748b';
  lens.style.borderColor=col;
  lens.style.boxShadow='inset 0 0 40px rgba(0,0,0,.5)'+(maxth>0?', 0 0 18px '+col:'');
  lens.querySelectorAll('.cnr').forEach(function(c){ c.style.borderColor=col; });
  var ro=$('lensReadout'); if(ro) ro.textContent=(maxth>0?global.ALIM.tempText(maxth):(maxth===0?'froid':''));
  if(changed&&state.mode==='forced') renderForced();
}
function setObsMode(m){
  state.obsMode = (state.obsMode===m) ? 'none' : m;
  if(state.obsMode!=='thermal') thermalClearAllHalos();
  if(state.obsMode!=='none') revealObs();
  if($('btnLook')) $('btnLook').classList.toggle('on', state.obsMode==='look');
  if($('btnThermal')) $('btnThermal').classList.toggle('on', state.obsMode==='thermal');
  var lens=$('thermalLens'); if(lens) lens.classList.toggle('on', state.obsMode==='thermal');
  if(state.obsMode==='none') $('obsOut').innerHTML='<div class="role">Choisis <b>Observer</b> (survol a l\'oeil) ou <b>Camera thermique</b> (deplace le carre).</div>';
  else if(state.obsMode==='look') $('obsOut').innerHTML='<div class="role">Survole un composant (schema ou carte) pour l\'observer a l\'oeil.</div>';
  else { $('obsOut').innerHTML='<div class="role">Deplace le carre (camera thermique) sur le schema ou la carte : les pieces revelent leur chaleur. <b>Vert</b>=froid, <b>jaune</b>=tiede, <b>orange</b>=chaud, <b>rouge</b>=brulant.</div>'; scanLens(); }
}

function onComponent(id){
  var c=BY_ID[id]; if(!c) return;
  var f=null; state.faults.forEach(function(x){ if(x.id===id) f=x; });
  var h='<h3>'+esc(compLabel(id))+' <span class="cid">'+esc(id)+'</span></h3>';
  h+='<div class="val">'+esc(compValue(id))+'</div><div class="role">'+esc(ROLES[id]||'')+'</div>';
  if(f && f.visible){
    var dmg={open:'Traces de brulure / noircissement visibles.',short:'Composant eclate, brulure visible.',
      drift:'Surchauffe visible, teinte foncee.',leak:'Gonflement / coulure visible.',
      cold:'Soudure terne et craquelee.',bjt:'Boitier fissure / brulure sur les pattes.'}[f.mode]||'Dommage visible.';
    h+='<div class="fiche vis">&#9888; VISUEL : '+dmg+'</div>';
  } else h+='<div class="fiche none">Aucun defaut apparent.</div>';
  var pins=pinList(c);
  if(pins.length){
    h+='<table class="pins"><thead><tr><th>Broche</th><th>Noeud</th><th>Tension</th></tr></thead><tbody>';
    pins.forEach(function(p){ h+='<tr><td class="pinTag">'+esc(p.pin)+'</td><td>'+esc(p.node)+'</td><td>'+nodeV(p.node).toFixed(2)+' V</td></tr>'; });
    h+='</tbody></table>';
  }
  h+='<div class="row"><button class="btn red" id="btnRepair">Remplacer / reparer '+esc(id)+'</button>';
  h+='<button class="btn ghost" id="btnCloseFiche">Fermer</button></div>';
  $('fiche').innerHTML=h;
  $('btnRepair').onclick=function(){ repair(id); };
  $('btnCloseFiche').onclick=function(){ $('fiche').innerHTML='<div class="role">Clique une etiquette de composant.</div>'; };
}
function repair(id){
  var before=state.faults.length;
  state.faults=state.faults.filter(function(f){ return f.id!==id; });
  if(state.faults.length===before){ state.wrong++; state.repaired.push({id:id,ok:false});
    $('fiche').innerHTML='<h3>'+esc(id)+'</h3><div class="fiche inv">Ce composant n\'etait pas defaillant.</div>'; }
  else { state.repaired.push({id:id,ok:true});
    $('fiche').innerHTML='<h3>'+esc(id)+'</h3><div class="fiche ok">Composant remplace / repare.</div>'; }
  afterAction();
}
function afterAction(){ solve(); markFaults(); renderSymptoms(); renderMeter(); renderJournal(); renderStatus(); }

/* ---------------- rendu ---------------- */
function renderSymptoms(){
  var h='<div class="outmeter"><span class="lblm">SORTIE</span><b class="'+(Math.abs(nodeV('outT')-global.ALIM.VOUT_NOM)<0.8?'ok':'ko')+'">'+nodeV('outT').toFixed(2)+' V</b></div>';
  symptoms().forEach(function(x){ h+='<div class="sym '+x.k+'">'+(x.k==='ok'?'&#10003; ':'&#9888; ')+esc(x.t)+'</div>'; });
  if(!state.faults.length) h+='<div class="sym ok">Aucun defaut restant : alimentation reparee.</div>';
  $('symptoms').innerHTML=h;
}
/* ---------- selecteur rotatif du multimetre ---------- */
var DIAL_MODES=[['V','V ='],['AC','V ~'],['ohm','Ohm'],['cont','Cont'],['diode','Diode']];
function buildDial(){
  var host=$('mmDial'); if(!host) return;
  var ns='http://www.w3.org/2000/svg', cx=95, cy=92, R=58;
  function el(t,a){ var e=document.createElementNS(ns,t); for(var k in a) e.setAttribute(k,a[k]); return e; }
  host.innerHTML='';
  host.appendChild(el('circle',{cx:cx,cy:cy,r:R,'class':'dialface'}));
  var pg=el('g',{id:'dialPointer'});
  pg.appendChild(el('polygon',{points:(cx-6)+','+(cy-8)+' '+(cx+6)+','+(cy-8)+' '+cx+','+(cy-R+6),'class':'dialptr'}));
  pg.appendChild(el('circle',{cx:cx,cy:cy,r:14,'class':'dialknob'}));
  pg.appendChild(el('circle',{cx:cx,cy:cy,r:4,'class':'dialcap'}));
  host.appendChild(pg);
  var n=DIAL_MODES.length, span=176;
  DIAL_MODES.forEach(function(m,i){
    var ang=-span/2 + i*(span/(n-1)), rad=ang*Math.PI/180;
    var x1=cx+Math.sin(rad)*(R-5), y1=cy-Math.cos(rad)*(R-5), x2=cx+Math.sin(rad)*(R+3), y2=cy-Math.cos(rad)*(R+3);
    host.appendChild(el('line',{x1:x1,y1:y1,x2:x2,y2:y2,'class':'dialtick'}));
    var tx=cx+Math.sin(rad)*(R+19), ty=cy-Math.cos(rad)*(R+19);
    var t=el('text',{x:tx,y:ty,'text-anchor':'middle','class':'diallab','data-mode':m[0]}); t.textContent=m[1];
    t.style.cursor='pointer';
    t.addEventListener('click',function(){ setMMMode(m[0]); });
    host.appendChild(t);
  });
  updateDial();
}
function updateDial(){
  var pg=$('dialPointer'); if(!pg) return;
  var n=DIAL_MODES.length, span=176, i=0;
  DIAL_MODES.forEach(function(m,k){ if(m[0]===state.mmMode) i=k; });
  pg.setAttribute('transform','rotate('+(-span/2 + i*(span/(n-1)))+' 95 92)');
  var host=$('mmDial');
  if(host) host.querySelectorAll('.diallab').forEach(function(t){ t.classList.toggle('on', t.getAttribute('data-mode')===state.mmMode); });
}
function renderMeter(){
  var p=state.probeP,n=state.probeN,readout='---',note='',noteCls='';
  var acP=isAcNode(p), acN=isAcNode(n);
  if(p&&n){
    if(state.mmMode==='AC'){
      if(acP&&acN) readout=Math.abs(nodeV(p)-nodeV(n)).toFixed(1)+' V ~';
      else { readout='--- V ~'; note='Mesure AC : la sonde ROUGE et la sonde NOIRE doivent etre toutes les deux cote ALTERNATIF (points bleus).'; }
    } else if(state.mmMode==='V'){
      if(acP||acN){ readout='AC !'; note='Ces points sont en ALTERNATIF : utilise le mode V ~ (AC).'; }
      else readout=(nodeV(p)-nodeV(n)).toFixed(2)+' V';
    } else {
      if(acP||acN){ readout='---'; note='Ces points sont en ALTERNATIF : la mesure Ohm/continuite/diode ne s\'applique pas.'; }
      else {
        var m=global.ALIM.measure(p,n,state.faults,state.mmMode);
        readout=fmtMeas(m,state.mmMode);
        if(global.SPICE && global.SPICE.ready){          /* raffinement ngspice (memes mesures) */
          var gm=++state.genMeas;
          (function(pp,nn,md,g0,mi){ global.SPICE.measure(pp,nn,state.faults,md).then(function(sm){
            if(g0!==state.genMeas) return;
            if(state.probeP!==pp||state.probeN!==nn||state.mmMode!==md) return;
            if(!measCoherent(mi,sm,md)) return;              /* ngspice incoherent : on garde l'analyse */
            var el=$('mmDisplay'); if(el) el.textContent=fmtMeas(sm,md);
          }).catch(function(){}); })(p,n,state.mmMode,gm,m);
        }
      }
    }
  } else if(state.mmMode==='AC' && (acP||acN)) {
    readout='--- V ~'; note='Mesure AC : la sonde ROUGE et la sonde NOIRE doivent etre toutes les deux cote ALTERNATIF (points bleus).';
  } else if((state.mmMode==='V'||state.mmMode==='ohm'||state.mmMode==='cont'||state.mmMode==='diode') && (acP||acN)) {
    note='Astuce : pour mesurer le secondaire du transformateur, utilise le mode V ~ (AC) avec les DEUX sondes cote AC.';
    noteCls='info';
  }
  if(!state.power && !note){ note='Alimentation coupee (ON/OFF) : tensions = 0. Pour tester un composant, utilise Ohm / Continuite / Diode.'; noteCls='info'; }
  $('mmDisplay').textContent=readout;
  var noteEl=$('mmNote'); if(noteEl){ noteEl.textContent=note; noteEl.className='mmnote'+(noteCls?' '+noteCls:''); }
  $('probePInfo').textContent=p||'non placee';
  $('probeNInfo').textContent=n||'non placee';
  updateDial();
  $('probeP').classList.toggle('active',state.activeProbe==='P');
  $('probeN').classList.toggle('active',state.activeProbe==='N');
  renderProbeMarks();
  updateLed();
  renderPhotoDots();
  forcedMeterCheck();
  forcedSymptomCheck();
}
/* petites fleches de la DEL sur le schema : allumees quand la LED conduit */
function updateLed(){
  var svg=svgRoot(); if(!svg) return;
  var on=nodeV('d2on')>=0.5;
  svg.querySelectorAll('.led-arrow').forEach(function(el){ el.classList.toggle('led-on',on); });
}
function renderPhotoDots(){
  var host=$('photoDots'); if(!host) return;
  if(state.boardSvg){
    /* points nommes venant de board-points.svg : marqueurs de sonde + LED */
    host.querySelectorAll('.pt').forEach(function(g){
      var k=g.getAttribute('data-tp');
      g.classList.toggle('pdP', !!k && k===state.probePKey);
      g.classList.toggle('pdN', !!k && k===state.probeNKey);
    });
    if(state.ledGlow){
      var on = nodeV('d2on')>=0.5;
      state.ledGlow.style.opacity = on ? '1' : '0.05';
      state.ledGlow.style.filter = on ? 'drop-shadow(0 0 10px #2cf255)' : 'none';
    }
    return;
  }
  host.innerHTML='';
  (window.PHOTOMAP||[]).forEach(function(e,i){
    var d=document.createElement('div'); var k='p'+i;
    d.className='pd'+(state.probePKey===k?' pdP':'')+(state.probeNKey===k?' pdN':'');
    d.style.left=e[0]+'%'; d.style.top=e[1]+'%';
    d.title=e[2]; d.setAttribute('data-tp',k);
    d.addEventListener('click',function(ev){ ev.stopPropagation(); onTestPoint(e[2],k); });
    host.appendChild(d);
  });
}
function boardNodeFromLabel(txt,x,y,fb){
  var t=(txt||'').trim();
  if(t==='R2') return (y<650)?'rB':'refA';   /* bas de R2 = reference   */
  if(t==='R3') return (y<650)?'rC':'vccR3';  /* bas de R3 = alim LM358  */
  if(t==='R1') return (y<400)?'rD':'d2a';
  if(t==='R9') return (y<500)?'vB':'q3b';
  if(t==='R10') return (x<1370)?'q3c':'q4b';
  if(t==='R13') return (y<650)?'q2b':'q1e';
  if(t==='R5') return (x<660)?'oap':'q4c';
  if(t==='R6') return (x<840)?'q4c':'oap2';
  if(t==='D4') return (x<1145)?'rG':'q1e';
  if(t==='AC') return (y<380)?'ac1':'ac2';
  var M=window.BOARD_LABELS||{};
  if(Object.prototype.hasOwnProperty.call(M,t)) return M[t];
  return fb || '';
}
function ptAbs(g){
  var c=g.querySelector('circle'); if(!c) return [0,0];
  var dx=0,dy=0, tf=g.getAttribute('transform')||'';
  var m=/translate\(([-0-9.]+)[ ,]+([-0-9.]+)\)/.exec(tf);
  if(m){ dx=parseFloat(m[1]); dy=parseFloat(m[2]); }
  return [num(c.getAttribute('cx'))+dx, num(c.getAttribute('cy'))+dy];
}
function clearCorr(){
  var svg=svgRoot(), host=$('photoDots');
  if(svg) svg.querySelectorAll('.pad.corr').forEach(function(g){ g.classList.remove('corr'); });
  if(host) host.querySelectorAll('.pt.corr').forEach(function(g){ g.classList.remove('corr'); });
}
function corrFor(node,on){
  /* mise en evidence des groupes : uniquement en mode DECOUVERTE (pas en test/eval) */
  if(state.mode!=='demo'){ clearCorr(); return; }
  if(!on){ clearCorr(); return; }
  if(!node) return;
  var svg=svgRoot(), host=$('photoDots');
  if(svg) svg.querySelectorAll('.pad').forEach(function(g){ g.classList.toggle('corr', sameGroup(g.getAttribute('data-node'),node)); });
  if(host) host.querySelectorAll('.pt').forEach(function(g){ g.classList.toggle('corr', sameGroup(g.getAttribute('data-node'),node)); });
}
function loadBoardPoints(){
  if(typeof fetch!=='function') return;
  fetch('board-points.svg',{cache:'no-cache'}).then(function(r){ if(!r.ok) throw 0; return r.text(); })
    .then(function(t){
      if(!t || t.indexOf('<svg')<0) throw 0;
      t=t.replace(/<image[^>]*\/?>/g,'');           // l'image est deja affichee par la page
      var host=$('photoDots'); if(!host) throw 0;
      host.innerHTML=t;
      var svg=host.querySelector('svg');
      if(svg){ svg.removeAttribute('width'); svg.removeAttribute('height');
        svg.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;'; }
      /* LED : l'ellipse verte (degrade radial) */
      state.ledGlow = host.querySelector('ellipse');
      /* chaque point : nom deduit de l'etiquette visible */
      host.querySelectorAll('.pt').forEach(function(g,i){
        var txt=''; g.querySelectorAll('text').forEach(function(te){ txt+=''.concat(te.textContent).trim(); });
        txt=txt.trim();
        var a=ptAbs(g);
        var node=boardNodeFromLabel(txt, a[0], a[1], g.getAttribute('data-node'));
        if(node) g.setAttribute('data-node', node);
        var key='b'+i; g.setAttribute('data-tp', key);
        g.style.pointerEvents='auto'; g.style.cursor='crosshair';
        g.addEventListener('click',function(ev){ ev.stopPropagation(); onTestPoint(g.getAttribute('data-node'), key); });
        g.addEventListener('mouseenter',function(){ corrFor(g.getAttribute('data-node'),true); });
        g.addEventListener('mouseleave',function(){ corrFor(g.getAttribute('data-node'),false); });
      });
      state.boardSvg=true;
      renderPhotoDots();
    }).catch(function(){ /* repli : pastilles photomap */ });
}
function renderProbeMarks(){
  var svg=svgRoot(); if(!svg) return;
  svg.querySelectorAll('.pad').forEach(function(g){ g.classList.remove('probeP','probeN'); });
  /* on ne marque QUE le point ou la sonde a ete deposee (pas tout le groupe) */
  if(state.probePKey){ var gp=svg.querySelector('.pad[data-tp="'+state.probePKey+'"]'); if(gp) gp.classList.add('probeP'); }
  if(state.probeNKey){ var gn=svg.querySelector('.pad[data-tp="'+state.probeNKey+'"]'); if(gn) gn.classList.add('probeN'); }
}
function onTestPoint(node,key){
  if(!node) return;
  if(state.mode==='forced'&&state.phase===2){
    var nn=$('forcedNotice'); if(nn) nn.textContent='Termine d\'abord la verification physique (observation) avant de mesurer.';
    return;
  }
  /* la sonde ROUGE est mobile par defaut ; la NOIRE reste ou on l'a posee.
     Pour deplacer la noire : cliquer d'abord sur "Sonde -". */
  if(state.activeProbe==='N'){ state.probeN=node; state.probeNKey=key; state.activeProbe='P'; }
  else { state.probeP=node; state.probePKey=key; }
  renderMeter();
}
function setMMMode(m){ state.mmMode=m; renderMeter(); }
function selectProbe(w){ state.activeProbe=w; renderMeter(); }

function renderJournal(){
  if(!state.repaired.length){ $('journal').innerHTML='<div class="role">Aucune intervention.</div>'; return; }
  var h='<table class="jrn"><tbody>';
  state.repaired.forEach(function(r){ h+='<tr><td>'+(r.ok?'&#10003;':'&#10007;')+'</td><td>'+esc(r.id)+'</td><td>'+(r.ok?'remplace':'remplacement inutile')+'</td></tr>'; });
  h+='</tbody></table><div class="role">Interventions inutiles : '+state.wrong+'</div>';
  $('journal').innerHTML=h;
}
function renderStatus(){
  var h='';
  if(state.mode==='demo') h='<b>Mode decouverte</b> : observe les tensions nominales (~'+global.ALIM.VOUT_NOM+' V en sortie) en deplacant les sondes.';
  else if(state.mode==='practice') h='<b>Mode pratique</b> : '+state.faults.length+' panne(s) restante(s). '+(state.faults.length===0?'<span class="ok">Diagnostic termine !</span>':'Applique la methode de remontee jusqu\'a retablir la sortie.');
  else if(state.mode==='eval') h='<b>Evaluation</b> - scenario '+(state.scenarioIndex+1)+' / '+state.testMax+'. '+state.faults.length+' panne(s) restante(s).';
  $('statusLine').innerHTML=h;
}
function renderGuide(){
  var nom=state.nominal||global.ALIM.nominal();
  var pts=[['ac1','Secondaire T1 (AC)'],['rA','Rail (pont)'],['rB','Rail (R2)'],['rC','Rail (R3)'],['rD','Rail (R1)'],['rE','Rail (C1)'],['rF','Rail (C2)'],['rG','Rail (puissance)'],['vccIC','Alim LM358 (broche 8)'],
           ['refA','Reference 16V (R2/D3)'],['refD','Reference (entree R4)'],['oap','Curseur R4 (in+)'],['oap2','Entree + AOP'],['oaout','Sortie AOP'],
           ['q2b','Base Q2'],['q1b','Base Q1'],['q1e','Emetteur Q1'],['vA','Sortie regulee (R8)'],['outT','Borne de sortie'],['d2a','Anode LED']];
  var h='<table class="guide"><thead><tr><th>Point</th><th>Attendu</th><th>Mesure</th></tr></thead><tbody>';
  pts.forEach(function(p){ var v=nodeV(p[0]),nv=nom[p[0]]||0,bad=state.faults.length&&Math.abs(v-nv)>1;
    h+='<tr class="'+(bad?'bad':'')+'"><td>'+p[1]+'</td><td>'+nv.toFixed(1)+' V</td><td>'+v.toFixed(1)+' V</td></tr>'; });
  h+='</tbody></table>';
  var lm=[['vccIC','LM358 : Vcc (broche 8)'],['oap2','LM358 : In+ (broche 3, = oap2)'],
          ['vA','LM358 : In- (broche 2, = vA sortie)'],['oaout','LM358 : sortie (broche 1)'],
          ['gnd','LM358 : GND (broche 4)']];
  h+='<table class="guide" style="margin-top:8px;"><thead><tr><th>Ampli LM358 (IC1)</th><th>Attendu</th><th>Mesure</th></tr></thead><tbody>';
  lm.forEach(function(p){ var v=nodeV(p[0]),nv=nom[p[0]]||0,bad=state.faults.length&&Math.abs(v-nv)>1;
    h+='<tr class="'+(bad?'bad':'')+'"><td>'+p[1]+'</td><td>'+nv.toFixed(1)+' V</td><td>'+v.toFixed(1)+' V</td></tr>'; });
  h+='</tbody></table>';
  h+='<div class="role">Remontee : sortie &rarr; R8 &rarr; Q1 (E, B) &rarr; Q2 &rarr; sortie AOP &rarr; entree + (R4/R5/R6) &rarr; reference D3. Le premier point faux indique la zone.<br>Seuils multim&egrave;tre : Ohm &gt; 2 M&Omega; = O.L. ; diode &ge; 2 V = O.L. (jonction ouverte) ; continuit&eacute; &gt; 50 &Omega; = O.L.</div>';
  $('guide').innerHTML=h;
}
function renderAll(){ renderSymptoms(); renderMeter(); renderJournal(); renderStatus(); renderGuide(); }

/* ---------------- diagnostic : declarer la panne ---------------- */
var SECTIONS = [
  { name:'Redressement / entree', comps:['T1','D1','F1','T_A'] },
  { name:'Filtrage', comps:['C1','C2'] },
  { name:'Rail non regule (pistes)', comps:['T_B','T_C','T_D','T_E','T_F'] },
  { name:'Temoin (LED)', comps:['R1','D2'] },
  { name:'Reference', comps:['R2','R3','D3','C3','T_ref1','T_ref2','T_ref3','P_VCC'] },
  { name:'Consigne (R4)', comps:['R4'] },
  { name:"Ampli d'erreur", comps:['R5','R6','C4','IC1'] },
  { name:'Commande', comps:['R7','Q2'] },
  { name:'Puissance', comps:['Q1','D4','P_Q1E','R8'] },
  { name:'Limitation / repli', comps:['R9','Q3','R10','R11','Q4'] },
  { name:'Sortie', comps:['C5','R12','T_VA','T_VB','T_VC','PT_OUT'] }
];
function correctAction(f){
  var c=BY_ID[f.id];
  if(f.mode==='cold') return 'souder';
  if(c && c.type==='trace') return 'piste';
  return 'remplacer';
}
function populateDiag(){
  var ps=$('diagPart'), cs=$('diagComp'); if(!ps||!cs) return;
  ps.innerHTML='';
  SECTIONS.forEach(function(s,i){ var o=document.createElement('option'); o.value=i; o.textContent=s.name; ps.appendChild(o); });
  ps.onchange=fillDiagComp;
  fillDiagComp();
}
function fillDiagComp(){
  var ps=$('diagPart'), cs=$('diagComp'); if(!ps||!cs) return;
  var sec=SECTIONS[+ps.value]||SECTIONS[0];
  cs.innerHTML='';
  sec.comps.forEach(function(id){
    var c=BY_ID[id]; if(!c) return;
    var o=document.createElement('option'); o.value=id; o.textContent=(c.label||id)+' ('+id+')';
    cs.appendChild(o);
  });
  syncDiagAction();
  cs.onchange=syncDiagAction;
}
/* une piste se repare forcement avec un fil : on preselectionne l'action */
function syncDiagAction(){
  var cs=$('diagComp'), act=$('diagAct'); if(!cs||!act) return;
  var c=BY_ID[cs.value];
  act.value = (c && c.type==='trace') ? 'piste' : 'remplacer';
}
function submitDiag(){
  if(state.mode==='demo'||state.answered) return;
  var id=$('diagComp').value, act=$('diagAct').value, fb=$('diagFeedback');
  var f=faultOf(id);
  var ACT={remplacer:'piece remplacee',souder:'soudure refaite',piste:'piste remplacee par un fil'};
  if(!f){
    state.wrong++;
    if(fb){ fb.className='fiche none'; fb.textContent='Pas de defaut sur '+compLabel(id)+' : composant declare inutilement.'; }
  } else if(correctAction(f)===act){
    state.diagOk++;
    state.faults=state.faults.filter(function(x){ return x.id!==id; });
    state.repaired.push({id:id,ok:true,act:act});
    if(fb){ fb.className='fiche ok'; fb.textContent='Correct : '+compLabel(id)+' \u2014 '+ACT[act]+'.'; }
  } else {
    state.wrong++;
    if(fb){ fb.className='fiche inv'; fb.textContent='Bon composant, mais mauvaise action : verifie piece / soudure / piste.'; }
  }
  solve(); markFaults(); renderSymptoms(); renderMeter(); renderJournal(); renderStatus(); renderGuide();
}
function togglePower(){
  state.power=!state.power;
  var b=$('btnPower');
  if(b){
    b.textContent='Alimentation : '+(state.power?'ON':'OFF');
    b.classList.toggle('green',state.power);
    b.classList.toggle('on',state.power);
    b.classList.toggle('red',!state.power);
  }
  afterAction();
}

/* ---------------- mode diagnostic force (guide) ---------------- */
var MMLABEL={V:'V = (continu)',AC:'V ~ (alternatif)',ohm:'Ohm',cont:'Continuite',diode:'Diode'};
function ficheRandom(){ var F=global.FICHES||[]; return F.length?F[randInt(F.length)]:null; }
function faultDefFromFiche(fc){
  var d=fc.fault, f={id:d.id, visible:!!d.visible};
  for(var k in d){ if(k!=='id'&&k!=='visible') f[k]=d[k]; }
  if(f.mode==='leak'&&!f.r) f.r=2500;
  f.desc=describeFault(f);
  return f;
}
function forcedStart(){
  var fc=ficheRandom();
  state.seen={}; state.symChecked={}; state.phase=1;
  state.stepId=null; state.trail=[]; state.stepDone=false; state.stepFb=''; state.stepVal=''; state.stepWrong=false; state.nextId=null; state.pendingTrail=''; state.declOk=false; state.declFb=''; state.declBand=''; state.symProbeKey=''; state.probeKey3=''; state.normOk=false; state.normFb=''; state.expOk=false; state.expFb=''; state.stepNormOk=false; state.stepNormFb='';
  state.probeP=null; state.probeN=null; state.probePKey=null; state.probeNKey=null;
  if(!fc){ state.fiche=null; state.faults=[]; solve(); afterAction(); renderForced(); return; }
  state.fiche=fc; state.faults=[faultDefFromFiche(fc)]; state.stepId=fc.start;
  resetTemp(); clearCorr();
  solve(); afterAction(); renderForced();
}
function forcedSymptomsKo(){ return symptoms().filter(function(x){ return x.k==='ko'; }); }
function forcedAllChecked(){
  var sy=forcedSymptomsKo(); if(!sy.length) return true;
  for(var i=0;i<sy.length;i++){ if(!state.symChecked['s'+i]) return false; }
  return true;
}
function forcedPhaseBar(){
  var names=['Symptomes','Verification physique','Mesures (remontee)','Reparation'];
  var h='';
  for(var i=1;i<=4;i++){
    var cls=state.phase>i?'done':(state.phase===i?'active':'locked');
    h+='<div class="fphase '+cls+'"><span class="num">'+i+'</span>'+names[i-1]+(state.phase>i?'<span class="st">fait</span>':'')+'</div>';
  }
  return h;
}
function forcedSymptomsHTML(){
  var h='', nom=global.ALIM.VOUT_NOM;
  var okProbe=(state.mmMode==='V' && state.probeP==='outT' && state.probeN==='gnd');
  h+='<div class="role">Etape 1 &mdash; <b>mesure la sortie</b> au multimetre (calibre <b>V =</b>, aiguille a gauche). Sonde <b>+ rouge</b> sur la borne <b>OUT</b>, sonde <b>- noire (COM)</b> sur <b>GND</b>.</div>';
  if(!okProbe){
    h+='<div class="obsline warm">Place les sondes : rouge sur la sortie (OUT), noire sur GND, calibre V =.</div>';
  } else {
    if(!state.declOk){
      h+='<div class="stepbox cur"><div class="stxt">&#10067; Ecris la tension que tu lis en sortie.</div>';
      h+='<div class="vrow"><input id="symInput" class="vinput" inputmode="decimal" placeholder="ex: 99"><span class="vunit">V</span><button id="symValBtn" class="btn blue">Valider</button></div>';
      h+='</div>';
      if(state.declFb) h+='<div class="obsline warm">'+esc(state.declFb)+'</div>';
    } else {
      h+='<div class="obsline ok">&#10003; '+esc(state.declFb)+'</div>';
      if(!state.normOk){
        h+='<div class="stepbox cur"><div class="stxt">&#10067; Est-ce que c\'est normal ?</div>';
        h+='<div class="row"><button id="normYes" class="btn blue">Oui, c\'est normal</button><button id="normNo" class="btn blue">Non, ce n\'est pas normal</button></div></div>';
        if(state.normFb) h+='<div class="obsline warm">'+esc(state.normFb)+'</div>';
      } else {
        h+='<div class="obsline ok">&#10003; '+esc(state.normFb)+'</div>';
        if(!state.expOk){
          h+='<div class="stepbox cur"><div class="stxt">&#10067; Ce regulateur est variable : quelle est la plage de tension de sortie ?</div>';
          h+='<div class="vrow"><label>mini</label><input id="expMin" class="vinput" inputmode="decimal" placeholder="ex: 99"><span class="vunit">V</span></div>';
          h+='<div class="vrow"><label>maxi</label><input id="expMax" class="vinput" inputmode="decimal" placeholder="ex: 99"><span class="vunit">V</span><button id="expValBtn" class="btn blue">Valider</button></div></div>';
          if(state.expFb) h+='<div class="obsline warm">'+esc(state.expFb)+'</div>';
        } else {
          h+='<div class="obsline ok">&#10003; '+esc(state.expFb)+'</div>';
        }
      }
    }
  }
  if(state.expOk){
    var sy=forcedSymptomsKo();
    h+='<div class="role" style="margin-top:8px;">Symptomes observes :</div>';
    if(!sy.length) h+='<div class="sym ok">Aucun symptome anormal detecte.</div>';
    else sy.forEach(function(x){ h+='<div class="sym ko">&#9888; '+esc(x.t)+'</div>'; });
    h+='<div class="row"><button id="btnSymOk" class="btn blue">Valider les symptomes</button></div>';
  }
  return h;
}
function voutBand(v){
  var nom=global.ALIM.VOUT_NOM;
  if(v<1.5) return 'z';
  if(v<nom-1.5) return 'low';
  if(v<=nom+1.5) return 'n';
  if(v<=nom+4.5) return 'h';
  return 'r';
}
function voutChoices(nom){
  return [
    {k:'z',   t:'0 V (aucune tension)'},
    {k:'low', t:'Faible, bien moins que '+nom+' V'},
    {k:'n',   t:'~'+nom+' V (normale)'},
    {k:'h',   t:'Trop haute (~14 a 15 V)'},
    {k:'r',   t:'Pleine echelle (~21 V)'}
  ];
}
function forcedSymptomCheck(){
  if(state.mode!=='forced'||state.phase!==1||!state.fiche) return;
  var key=state.mmMode+'|'+state.probeP+'|'+state.probeN;
  if(key!==state.symProbeKey){ state.symProbeKey=key; renderForced(); }
}
function forcedObsHTML(){
  var t=thermalTargets(), total=t.length, seen=0;
  t.forEach(function(id){ if(state.seen[id]) seen++; });
  var ok=total===0||seen>=total;
  var h='<div class="role">Ouvre le bloc <b>Observation</b> (fenetre Multimetre) : utilise <b>Observer</b> (oeil) puis surtout la <b>Camera thermique</b>. Deplace le carre sur le <b>schema</b> ET la <b>carte</b> pour balayer toutes les pieces.</div>';
  h+='<div class="obsbar"><span>Pieces thermographiees : <span class="cnt">'+seen+' / '+total+'</span></span>';
  h+='<button id="btnThermal2" class="btn amber">Activer la camera</button></div>';
  h+='<label class="symchk'+(ok&&state.obsDone?' checked':'')+'"><input type="checkbox" id="obsDone"'+(ok?'':' disabled')+(state.obsDone?' checked':'')+'> <span>J\'ai termine la verification physique (crochet)</span></label>';
  h+='<div class="row"><button id="btnObsOk" class="btn blue"'+(ok?'':' disabled')+'>Passer aux mesures</button></div>';
  return h;
}
function fmtOhm(v){ return v>=1000?((v/1000).toFixed(1)+' kohm'):(v+' ohm'); }
function fmtRange(st){
  if(st.ol) return 'circuit ouvert (O.L.)';
  if(!st.expect) return '--';
  var a=st.expect[0], b=st.expect[1];
  if(st.mm==='ohm'||st.mm==='cont') return fmtOhm(a)+' a '+fmtOhm(b);
  if(st.mm==='diode') return a.toFixed(2)+' a '+b.toFixed(2)+' V';
  return a+' a '+b+' V';
}
function fmtVal(st,val){
  if(val===null||val===undefined) return '--';
  if(st.mm==='diode') return (!isFinite(val)||val>=2)?'O.L.':val.toFixed(3)+' V';
  if(st.mm==='ohm'||st.mm==='cont') return (!isFinite(val)||val>2e6)?'O.L.':fmtOhm(val);
  return val.toFixed(2)+' V';
}
function curStep(){ var fc=state.fiche; return (fc&&fc.steps)?(fc.steps[state.stepId]||null):null; }
function unitFor(mm){ return (mm==='ohm'||mm==='cont')?'ohm':'V'; }
var NODELABEL={
  outT:'la borne de sortie (OUT)', gnd:'GND', vA:'la sortie du shunt R8',
  q1e:'l\'emetteur de Q1', q1b:'la base de Q1', rG:'le collecteur de Q1 (rail)',
  q2b:'la base de Q2', oaout:'la sortie de l\'AOP', oap2:'l\'entree + de l\'AOP',
  vccIC:'l\'alimentation de l\'AOP (broche 8)', refA:'la reference (R2/D3)',
  vccR3:'la sortie de R3 (cote AOP)', refD:'l\'entree de R4 (cote reference)',
  rC:'le rail avant R3', vB:'la sortie (au niveau de R9)', vC:'la sortie (aux bornes de C5)', vD:'la sortie (au niveau de R12)', oap:'le curseur du potentiometre R4', d2a:'l\'anode de D2'
};
function nodeLabel(n){ return NODELABEL[n]||n; }
function probesMatch(st){
  if(!st||!st.mm) return {ok:false, hint:''};
  if(state.mmMode!==st.mm) return {ok:false, hint:'Regle le multimetre sur : '+MMLABEL[st.mm]+'.'};
  if(state.probeP===st.p&&state.probeN===st.n) return {ok:true};
  if(state.probeP===st.n&&state.probeN===st.p) return {ok:false, hint:'Sondes inversees : sonde + (rouge) sur '+nodeLabel(st.p)+', sonde - (noire) sur '+nodeLabel(st.n)+'.'};
  return {ok:false, hint:'Place la sonde + (rouge) sur '+nodeLabel(st.p)+' et la sonde - (COM) sur '+nodeLabel(st.n)+'.'};
}
function stepNominal(st){ var nom=state.nominal||global.ALIM.nominal()||{}; return (nom[st.p]||0)-(nom[st.n]||0); }
function stepIsNormal(st){
  if(st.nrm===false) return false;                  /* marque explicitement anormal dans la fiche */
  if(st.nrm===true) return true;
  if(st.ask) return true;
  if(st.mm==='diode'||st.mm==='ohm'||st.mm==='cont') return !st.ol;
  var nv=stepNominal(st), v=stepValue(st);
  if(v===null||v===undefined) return true;
  return Math.abs(v-nv) <= Math.max(0.5, 0.2*Math.abs(nv));
}
function stepNormText(st){
  if(st.ask) return '';
  if(st.mm==='diode'||st.mm==='ohm'||st.mm==='cont') return st.ol?'ce composant devrait etre passant (pas en O.L.)':'ce composant devrait etre en circuit ouvert';
  var nv=stepNominal(st), nom=global.ALIM.VOUT_NOM, outMax=Math.round((global.ALIM.nominal()||{}).refA||16);
  if(Math.abs(nv-nom)<=2){                        /* noeud qui SUIT la sortie (regulateur variable) */
    var off=nv-nom;
    return 'en fonctionnement normal, cette tension suivrait la consigne (reglable de ~'+off.toFixed(1)+' a ~'+(off+outMax).toFixed(1)+' V)';
  }
  return 'en fonctionnement normal, on attendrait ~'+nv.toFixed(1)+' V ici';
}
function normStepAnswer(yes){
  var st=curStep(); if(!st||!state.stepDone||state.stepNormOk) return;
  var normal=stepIsNormal(st), why=stepNormText(st);
  if(yes===normal){
    state.stepNormOk=true;
    if(normal) state.stepNormFb='Exact : tout est normal a ce niveau.';
    else state.stepNormFb='Exact : ce n\'est pas normal a ce niveau'+(why?' ('+why+')':'')+'.';
  } else {
    state.stepNormFb='Re-regarde'+(why?' : '+why:'')+'.';
  }
  renderForced();
}
function parseMeas(str){
  if(str==null) return null;
  var s=String(str).trim().toLowerCase().replace(',','.').replace(/\s+/g,'');
  if(!s) return null;
  if(/^(ol|o\.l\.|o\.l|inf|infini|oo|∞|ouvert|open|\/\/)$/.test(s)) return Infinity;
  var mul=1;
  s=s.replace(/ohms?$/,'').replace(/volts?$|v$/,'');
  if(/k$/.test(s)){ mul=1000; s=s.replace(/k$/,''); }
  else if(/m$/.test(s)){ mul=1e6; s=s.replace(/m$/,''); }
  s=s.replace(/[^0-9.\-]/g,'');
  if(!s||s==='-'||s==='.') return null;
  var v=parseFloat(s);
  return isNaN(v)?null:(v*mul);
}
function checkTyped(st,v){
  if(v===Infinity) return !!st.ol;
  if(v===null) return false;
  if(st.ol) return v>2e6;
  if(!st.expect) return true;
  return v>=st.expect[0]&&v<=st.expect[1];
}
function fmtTyped(st,v){
  if(v===Infinity) return 'O.L.';
  if(st.mm==='diode') return v.toFixed(2)+' V';
  if(st.mm==='ohm'||st.mm==='cont') return (v>=1000?(v/1000).toFixed(2)+' kohm':v+' ohm');
  return v.toFixed(2)+' V';
}
function stepValidate(){
  var st=curStep(); if(!st||st.ask||st.end||state.stepDone) return;
  if(!probesMatch(st).ok) return;
  var el=$('stepInput'); if(!el) return;
  var v=parseMeas(el.value);
  if(v===null){ state.stepWrong=true; state.stepFb='Ecris une valeur (ex: 99 ; ecris O.L. si c\'est ouvert).'; renderForced(); return; }
  if(checkTyped(st,v)){
    state.stepDone=true; state.stepWrong=false; state.stepFb=st.ok||''; state.stepVal=fmtTyped(st,v);
    state.pendingTrail={kind:'m', st:state.stepId, v:state.stepVal};
  } else {
    state.stepWrong=true; state.stepFb='Valeur non conforme. Verifie le point de mesure et l\'unite.';
  }
  renderForced();
}
function symValidate(){
  if(state.mode!=='forced'||state.phase!==1||state.declOk) return;
  if(!(state.mmMode==='V'&&state.probeP==='outT'&&state.probeN==='gnd')) return;
  var el=$('symInput'); if(!el) return;
  var v=parseMeas(el.value), act=nodeV('outT')-nodeV('gnd');
  if(v===null){ state.declFb='Ecris la valeur lue (ex: 99 ; ecris O.L. si rien).'; renderForced(); return; }
  var tol=Math.max(0.8, 0.2*Math.abs(act));
  if(Math.abs(v-act)<=tol){
    state.declOk=true; state.declBand=voutBand(act);
    state.declFb='La sortie est bien a '+act.toFixed(2)+' V.';
  } else {
    state.declOk=false; state.declFb='Non : lis bien l\'ecran du multimetre (calibre V =, bornes OUT et GND).';
  }
  renderForced();
}
function expValidate(){
  if(state.mode!=='forced'||state.phase!==1||!state.normOk||state.expOk) return;
  var emin=$('expMin'), emax=$('expMax'); if(!emin||!emax) return;
  var vmin=parseMeas(emin.value), vmax=parseMeas(emax.value);
  var ref=Math.round((global.ALIM.nominal()||{}).refA||16);
  if(vmin===null||vmax===null){ state.expFb='Ecris les deux valeurs : mini et maxi.'; renderForced(); return; }
  var okMin=Math.abs(vmin-0)<=1.5, okMax=Math.abs(vmax-ref)<=1.5;
  if(okMin&&okMax){ state.expOk=true; state.expFb='Exact : ce regulateur se regle de ~0 V a ~'+ref+' V.'; }
  else if(!okMin&&!okMax) state.expFb='Plage fausse : le potentiometre R4 regle toute la plage de sortie.';
  else if(!okMin) state.expFb='Le mini n\'est pas bon.';
  else state.expFb='Le maxi n\'est pas bon.';
  renderForced();
}
function normAnswer(yes){
  if(state.mode!=='forced'||state.phase!==1||!state.declOk||state.normOk) return;
  var normal=(state.declBand==='n');
  if(yes===normal){
    state.normOk=true; state.normFb = normal ? 'Exact : la tension de sortie est normale.' : 'Exact : la tension de sortie n\'est pas normale.';
  } else {
    state.normFb='Observe bien la valeur lue et demande-toi si elle correspond a un fonctionnement correct.';
  }
  renderForced();
}
function forcedStepsHTML(){
  var h='';
  if(state.trail.length){
    h+='<div class="trail">';
    state.trail.forEach(function(t){
      var txt;
      if(t.kind==='m'){ var s=state.fiche.steps[t.st]; txt=s?(s.txt+' \u2192 '+(t.v||fmtVal(s,stepValue(s)))):'?'; }
      else txt=t.t;
      h+='<div class="tline">'+esc(txt)+'</div>';
    });
    h+='</div>';
  }
  var st=curStep();
  if(!st){ h+='<div class="role">Etape introuvable.</div>'; return h; }
  if(st.end){
    h+='<div class="stepbox done"><div class="stxt">&#127937; '+esc(st.txt)+'</div></div>';
    h+='<div class="row"><button id="btnStepNext" class="btn blue">Voir la reparation</button></div>';
    return h;
  }
  if(st.ask){
    h+='<div class="stepbox cur"><div class="stxt">&#10067; '+esc(st.ask)+'</div></div>';
    h+='<div class="choices">';
    (st.choices||[]).forEach(function(c,i){ h+='<button class="choice'+(state.stepDone&&c.correct?' good':'')+'" data-ch="'+i+'"'+(state.stepDone?' disabled':'')+'>'+esc(c.t)+'</button>'; });
    h+='</div>';
    if(state.stepWrong && state.stepFb) h+='<div class="obsline warm">'+esc(state.stepFb)+'</div>';
    if(state.stepDone){
      if(!st.noNorm && !state.stepNormOk){
        h+='<div class="stxt" style="margin-top:6px;">&#10067; D\'apres ce que tu viens de constater, est-ce normal ?</div>';
        h+='<div class="row"><button id="stepNormYes" class="btn blue">Oui, normal</button><button id="stepNormNo" class="btn blue">Non, anormal</button></div>';
        if(state.stepNormFb) h+='<div class="obsline warm">'+esc(state.stepNormFb)+'</div>';
      } else {
        if(state.stepFb) h+='<div class="obsline ok">&#10003; '+esc(state.stepFb)+'</div>';
        h+='<div class="row"><button id="btnStepNext" class="btn blue">Continuer</button></div>';
      }
    }
    return h;
  }
  /* etape de mesure : place les sondes PUIS ecris la valeur lue */
  h+='<div class="stepbox cur"><div class="stxt">&#128207; '+esc(st.txt)+'</div>';
  if(state.stepDone){
    h+='<div class="sexp" style="color:#86efac;">&#10003; '+esc(state.stepFb)+(state.stepVal?' ('+esc(state.stepVal)+')':'')+'</div>';
    if(!state.stepNormOk){
      h+='<div class="stxt" style="margin-top:6px;">&#10067; D\'apres ta mesure, cette valeur est-elle normale ici ?</div>';
      h+='<div class="row"><button id="stepNormYes" class="btn blue">Oui, normale</button><button id="stepNormNo" class="btn blue">Non, anormale</button></div>';
      if(state.stepNormFb) h+='<div class="obsline warm">'+esc(state.stepNormFb)+'</div>';
    } else {
      h+='<div class="obsline ok">&#10003; '+esc(state.stepNormFb)+'</div>';
    }
  } else {
    var pm=probesMatch(st);
    if(!pm.ok){
      h+='<div class="sexp" style="color:#fde68a;">'+esc(pm.hint)+'</div>';
    } else {
      h+='<div class="sexp">Ecris la valeur lue au multimetre :</div>';
      h+='<div class="vrow"><input id="stepInput" class="vinput" inputmode="decimal" placeholder="ex: 99"><span class="vunit">'+unitFor(st.mm)+'</span><button id="stepValBtn" class="btn blue">Valider</button></div>';
      if(state.stepFb) h+='<div class="obsline warm">'+esc(state.stepFb)+'</div>';
    }
  }
  h+='</div>';
  if(state.stepDone && state.stepNormOk) h+='<div class="row"><button id="btnStepNext" class="btn blue">Continuer</button></div>';
  return h;
}
function repProps(){ return global.ALIM.components.filter(function(c){ return c.type!=='vs'&&c.type!=='xfmr'; }); }
function forcedRepairHTML(){
  var want=state.fiche.reponse;
  var h='<div class="role">Tu as identifie la piece en cause. Choisis l\'action a realiser, puis valide.</div>';
  h+='<div class="diagrow"><label>Piece en cause (d\'apres ton diagnostic)</label><div class="repcomp">'+esc(compLabel(want.comp))+(compLabel(want.comp)!==want.comp?' <span class="cid">'+esc(want.comp)+'</span>':'')+'</div></div>';
  h+='<div class="diagrow"><label>Action a realiser</label><select id="fRepAct"><option value="remplacer">Remplacer la piece</option><option value="piste">Remplacer la piste par un fil</option><option value="souder">Refaire la soudure</option></select></div>';
  h+='<div class="row"><button id="btnRepOk" class="btn blue">Valider la reparation</button><button id="btnNewFiche" class="btn ghost">Nouvelle fiche</button></div>';
  h+='<div id="fRepFb"></div>';
  return h;
}
function renderForced(){
  var area=$('forcedArea'), card=$('forcedFloat'); if(!area) return;
  if(state.mode!=='forced'||!state.fiche){ if(card) card.style.display='none'; area.innerHTML=''; return; }
  if(card) card.style.display='';
  var fc=state.fiche, h='';
  if(state.declOk){
    h+='<div class="forced-head"><b>Fiche n&deg;'+esc(fc.num||'?')+' &mdash; '+esc(fc.titre)+'</b><br>'+esc(fc.resume||'')+'</div>';
  } else {
    h+='<div class="forced-head"><b>Fiche n&deg;'+esc(fc.num||'?')+'</b><br>Etape 1 : mesure la sortie au multimetre.</div>';
  }
  h+=forcedPhaseBar();
  if(state.phase===1) h+=forcedSymptomsHTML();
  else if(state.phase===2) h+=forcedObsHTML();
  else if(state.phase===3) h+=forcedStepsHTML();
  else if(state.phase===4) h+=forcedRepairHTML();
  h+='<div id="forcedNotice" class="role"></div>';
  area.innerHTML=h;
  bindForced();
}
function bindForced(){
  var bso=$('btnSymOk'); if(bso) bso.onclick=function(){ state.phase=2; renderForced(); };
  var sv=$('symValBtn'); if(sv) sv.onclick=symValidate;
  var si=$('symInput'); if(si) si.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); symValidate(); } });
  var tv=$('stepValBtn'); if(tv) tv.onclick=stepValidate;
  var ti=$('stepInput'); if(ti) ti.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); stepValidate(); } });
  var sny=$('stepNormYes'); if(sny) sny.onclick=function(){ normStepAnswer(true); };
  var snn=$('stepNormNo'); if(snn) snn.onclick=function(){ normStepAnswer(false); };
  var ny=$('normYes'); if(ny) ny.onclick=function(){ normAnswer(true); };
  var nn=$('normNo'); if(nn) nn.onclick=function(){ normAnswer(false); };
  var ev2=$('expValBtn'); if(ev2) ev2.onclick=expValidate;
  ['expMin','expMax'].forEach(function(id){ var e2=$(id); if(e2) e2.addEventListener('keydown',function(ev){ if(ev.key==='Enter'){ ev.preventDefault(); expValidate(); } }); });
  var bt2=$('btnThermal2'); if(bt2) bt2.onclick=function(){ if(state.obsMode!=='thermal') setObsMode('thermal'); };
  var od=$('obsDone'); if(od) od.onchange=function(){ state.obsDone=od.checked; if(od.checked&&thermalAllSeen()){ state.phase=3; renderForced(); } };
  var boo=$('btnObsOk'); if(boo) boo.onclick=function(){ if(!thermalAllSeen()) return; state.phase=3; renderForced(); };
  document.querySelectorAll('#forcedArea .choice:not(.declchoice)').forEach(function(btn){
    btn.onclick=function(){ forcedAnswer(+btn.getAttribute('data-ch')); };
  });
  var bsn=$('btnStepNext'); if(bsn) bsn.onclick=forcedAdvance;
  var bro=$('btnRepOk'); if(bro) bro.onclick=forcedRepairSubmit;
  var bnf=$('btnNewFiche'); if(bnf) bnf.onclick=function(){ forcedStart(); };
}
function stepValue(st){
  if(!st) return null;
  if(st.mm==='V'){ if(isAcNode(st.p)||isAcNode(st.n)) return null; return nodeV(st.p)-nodeV(st.n); }
  if(st.mm==='AC'){ if(!isAcNode(st.p)||!isAcNode(st.n)) return null; return Math.abs(nodeV(st.p)-nodeV(st.n)); }
  var m=global.ALIM.measure(st.p,st.n,state.faults,st.mm);
  return (st.mm==='diode')?m.v:m.r;
}
function stepMatches(st,val){
  if(val===null||val===undefined) return false;
  if(!st.expect&&!st.ol) return true;                  /* simple relevé : le bon point suffit */
  if(st.ol) return (st.mm==='diode')?(!isFinite(val)||val>=2):(!isFinite(val)||val>2e6);
  return val>=st.expect[0]&&val<=st.expect[1];
}
function forcedMeterCheck(){
  if(state.mode!=='forced'||state.phase!==3||!state.fiche||state.stepDone) return;
  var key=state.mmMode+'|'+state.probeP+'|'+state.probeN;
  if(key!==state.probeKey3){ state.probeKey3=key; renderForced(); }
}
function forcedAnswer(i){
  var st=curStep(); if(!st||!st.ask||state.stepDone) return;
  var c=st.choices[i]; if(!c) return;
  if(c.correct){
    state.stepDone=true; state.stepWrong=false; state.stepFb=c.fb||''; state.nextId=c.go||null;
    if(st.noNorm) state.stepNormOk=true;
    state.pendingTrail={kind:'q', t:st.ask+' \u2192 '+c.t};
    renderForced();
  } else {
    state.stepWrong=true; state.stepFb=c.fb||'Ce n\'est pas la bonne reponse.'; renderForced();
  }
}
function forcedAdvance(){
  var st=curStep(); if(!st) return;
  if(st.end){ state.phase=4; renderForced(); return; }
  if(!state.stepDone) return;
  if(state.pendingTrail) state.trail.push(state.pendingTrail);
  state.stepId=state.nextId||st.go;
  state.stepDone=false; state.stepFb=''; state.stepVal=''; state.stepWrong=false; state.nextId=null; state.pendingTrail=''; state.probeKey3=''; state.stepNormOk=false; state.stepNormFb='';
  renderForced();
}
function forcedRepairSubmit(){
  if(state.phase!==4) return;
  var act=$('fRepAct')?$('fRepAct').value:'remplacer', fb=$('fRepFb');
  var want=state.fiche.reponse;
  if(act===want.action){
    state.faults=state.faults.filter(function(x){ return x.id!==want.comp; });
    state.diagOk++;
    solve(); markFaults(); renderSymptoms(); renderMeter(); renderJournal(); renderStatus(); renderGuide();
    if(fb){ fb.className='fiche ok'; fb.innerHTML='&#10003; Bravo ! '+esc(compLabel(want.comp))+' repare. La sortie redevient fonctionnelle, reglable de <b>0 a '+Math.round((global.ALIM.nominal()||{}).refA||16)+' V</b>.'; }
    var nn=$('btnNewFiche'); if(nn) nn.style.display='';
  } else {
    if(fb){ fb.className='fiche inv'; fb.textContent='Mauvaise action : piece, soudure ou piste ? Regarde l\'etat du composant.'; }
  }
}
function initLens(){
  var lens=$('thermalLens'); if(!lens) return;
  var drag=false,sx=0,sy=0,ox=0,oy=0;
  lens.addEventListener('pointerdown',function(e){
    drag=true; var r=lens.getBoundingClientRect(); ox=r.left; oy=r.top; sx=e.clientX; sy=e.clientY;
    lens.style.left=ox+'px'; lens.style.top=oy+'px'; lens.style.right='auto';
    try{ lens.setPointerCapture(e.pointerId); }catch(_){}
    e.preventDefault();
  });
  lens.addEventListener('pointermove',function(e){ if(!drag) return; var p=clampXY(lens, ox+e.clientX-sx, oy+e.clientY-sy); lens.style.left=p[0]+'px'; lens.style.top=p[1]+'px'; scanLens(); });
  function stop(){ if(drag){ drag=false; scanLens(); } }
  lens.addEventListener('pointerup',stop); lens.addEventListener('pointercancel',stop);
}

/* ---------------- modes ---------------- */
function setMode(mode){
  state.mode=mode; state.probeP=null; state.probeN=null; state.probePKey=null; state.probeNKey=null; state.activeProbe='P'; state.repaired=[]; state.wrong=0; state.diagOk=0;
  state.fiche=null; state.phase=0; state.stepId=null; state.trail=[]; state.stepDone=false; state.stepFb=''; state.stepVal=''; state.stepWrong=false; state.nextId=null; state.pendingTrail=''; state.seen={}; state.symChecked={}; state.currentOK=''; state.obsDone=false; state.declOk=false; state.declFb=''; state.declBand=''; state.symProbeKey=''; state.probeKey3=''; state.normOk=false; state.normFb=''; state.expOk=false; state.expFb=''; state.stepNormOk=false; state.stepNormFb='';
  if($('diagFeedback')) $('diagFeedback').textContent='';
  if(state.obsMode==='thermal') setObsMode('thermal');
  resetTemp();
  clearCorr();
  if(mode==='demo'){ state.faults=[]; solve(); afterAction(); }
  else if(mode==='practice'){ state.faults=makeFaults(1+randInt(3)); solve(); afterAction(); }
  else if(mode==='eval'){ state.scenarios=[]; for(var i=0;i<state.testMax;i++) state.scenarios.push(makeFaults(1+randInt(3)));
    state.scenarioIndex=0; state.testTotal=0; state.results=[]; loadScenario(); }
  else if(mode==='forced'){ forcedStart(); }
  updateModeButtons();
}
function loadScenario(){ state.faults=state.scenarios[state.scenarioIndex].map(function(f){return f;});
  state.repaired=[]; state.wrong=0; state.answered=false; state.probeP=null; state.probeN=null; state.probePKey=null; state.probeNKey=null; solve(); afterAction(); updateModeButtons(); }
function updateModeButtons(){
  $('btnDemo').classList.toggle('on',state.mode==='demo');
  if($('btnForced')) $('btnForced').classList.toggle('on',state.mode==='forced');
  $('btnPractice').classList.toggle('on',state.mode==='practice');
  $('btnEval').classList.toggle('on',state.mode==='eval');
  $('evalArea').style.display=state.mode==='eval'?'':'none';
  $('btnValidate').style.display=state.mode==='eval'?'':'none';
  $('btnReveal').style.display=state.mode==='practice'?'':'none';
  var sc=$('symptCard'); if(sc) sc.style.display=state.mode==='eval'?'none':'';
  var da=$('diagArea'); if(da) da.style.display=(state.mode==='demo'||state.mode==='forced')?'none':'';
  var fd=$('forcedFloat'); if(fd) fd.style.display=state.mode==='forced'?'':'none';
  var gc=$('guideCard'); if(gc) gc.style.display=state.mode==='forced'?'none':'';
}
function validateScenario(){
  if(state.mode!=='eval'||state.answered) return;
  var total=state.scenarios[state.scenarioIndex].length, fixed=total-state.faults.length;
  var score=Math.max(0,Math.round(100*fixed/total)-15*state.wrong);
  state.testTotal+=score; state.results.push({total:total,fixed:fixed,wrong:state.wrong,score:score}); state.answered=true;
  if(state.scenarioIndex>=state.testMax-1){ finishEval(); return; }
  $('verdict').innerHTML='<div class="vd">Scenario '+(state.scenarioIndex+1)+' : <b>'+score+' / 100</b> ('+fixed+'/'+total+' pannes, '+state.wrong+' erreur(s)).</div>';
}
function nextScenario(){ state.scenarioIndex++; if(state.scenarioIndex>=state.testMax){ finishEval(); return; } $('verdict').innerHTML=''; loadScenario(); }
function finishEval(){
  var note=Math.round(state.testTotal/state.testMax);
  var h='<div class="vd final"><div class="big">'+note+' / 100</div><div>Evaluation terminee.</div>';
  h+='<table class="jrn"><thead><tr><th>#</th><th>Pannes</th><th>Reparees</th><th>Erreurs</th><th>Pts</th></tr></thead><tbody>';
  state.results.forEach(function(r,i){ h+='<tr><td>'+(i+1)+'</td><td>'+r.total+'</td><td>'+r.fixed+'</td><td>'+r.wrong+'</td><td>'+r.score+'</td></tr>'; });
  h+='</tbody></table></div>';
  $('verdict').innerHTML=h; $('btnValidate').style.display='none'; $('btnNextSc').style.display='none';
  var ok=scormReport(note,100,'completed');
  $('lmsNote').innerHTML=ok?'<span class="ok">Note transmise a Moodle ('+note+'/100)</span>':'<span class="role">Apercu local (pas de LMS).</span>';
}
function revealSolution(){
  if(state.mode!=='practice') return;
  var h='<div class="vd"><b>Pannes presentes :</b><ul>';
  state.faults.forEach(function(f){ h+='<li>'+esc(f.desc.text)+'</li>'; });
  if(!state.faults.length) h+='<li>Aucune panne restante.</li>';
  $('verdict').innerHTML=h+'</ul></div>';
}

/* ---------------- init ---------------- */
function startApp(){
  injectSchema();
  /* fenetre d'accueil */
  var im=$('introModal');
  if(im){
    var closeIntro=function(){ im.style.display='none'; };
    if($('btnIntroOk')) $('btnIntroOk').onclick=closeIntro;
    im.addEventListener('click',function(e){ if(e.target===im) closeIntro(); });
  }
  state.nominal=global.ALIM.nominal();
  $('btnDemo').onclick=function(){ setMode('demo'); };
  if($('btnForced')) $('btnForced').onclick=function(){ setMode('forced'); };
  if($('btnForcedHelp')) $('btnForcedHelp').onclick=function(){ var b=$('forcedHelpBody'); if(b) b.style.display=(b.style.display==='none'?'':'none'); };
  $('btnPractice').onclick=function(){ setMode('practice'); };
  $('btnEval').onclick=function(){ setMode('eval'); };
  $('btnValidate').onclick=validateScenario;
  $('btnNextSc').onclick=nextScenario;
  $('btnReveal').onclick=revealSolution;
  if($('btnDiag')) $('btnDiag').onclick=submitDiag;
  if($('btnPower')) $('btnPower').onclick=togglePower;
  populateDiag();
  buildDial();
  $('probeP').onclick=function(){ selectProbe('P'); };
  $('probeN').onclick=function(){ selectProbe('N'); };
  $('btnShowGuide').onclick=function(){ renderGuide(); };
  /* observation manuelle (oeil / camera thermique) */
  $('btnLook').onclick=function(){ setObsMode('look'); };
  if($('btnThermal')) $('btnThermal').onclick=function(){ setObsMode('thermal'); };
  initLens();
  document.querySelectorAll('#boardWrap .hotspot').forEach(function(h){
    var id=h.getAttribute('data-comp');
    h.onclick=function(ev){ if(ev) ev.stopPropagation(); compAction(id); };
    h.addEventListener('mouseenter',function(){ compHover(id); });
  });
  bindBoardZones();
  loadBoardPoints();
  /* reglage du potentiometre R4 */
  var ps=$('potSlider');
  if(ps){
    ps.value=Math.round(global.ALIM.getPot()*100);
    function applyPot(){
      var vn=global.ALIM.setPot(+ps.value/100);
      $('potVal').textContent=vn.toFixed(1)+' V';
      state.nominal=global.ALIM.nominal();
      solve(); afterAction();
    }
    ps.addEventListener('input',applyPot);
    $('btnPotReset').onclick=function(){ ps.value=75; applyPot(); };
    $('potVal').textContent=(global.ALIM.VOUT_NOM).toFixed(1)+' V';
  }
  setMode('demo'); renderAll(); initFloater();
  /* demarre le moteur ngspice en tache de fond, puis bascule sur ses resultats */
  if(global.SPICE) global.SPICE.start().then(function(ok){
    global.SPICE.ready=!!ok;
    if(ok){ solve(); renderAll(); }
  });
}
function init(){ if(global.loadSchematic) global.loadSchematic(startApp); else startApp(); }

/* borne une position pour que la fenetre reste dans l'ecran (en-tete toujours accessible) */
function clampXY(el,x,y){
  var maxX=window.innerWidth-90;    /* au moins 90 px visibles a droite */
  var maxY=window.innerHeight-42;   /* en-tete (poignee) toujours visible en bas */
  if(x>maxX) x=maxX;
  if(y>maxY) y=maxY;
  if(x<4) x=4;
  if(y<4) y=4;
  return [x,y];
}
function keepInside(){
  ['mmFloat','obsFloat','forcedFloat'].forEach(function(id){
    var w=$(id); if(!w) return;
    if(getComputedStyle(w).position!=='fixed') return;
    var p=clampXY(w, parseFloat(w.style.left), parseFloat(w.style.top));
    if(!isNaN(p[0])) w.style.left=p[0]+'px';
    if(!isNaN(p[1])) w.style.top=p[1]+'px';
  });
  var l=$('thermalLens');
  if(l && l.classList.contains('on')){
    var q=clampXY(l, parseFloat(l.style.left), parseFloat(l.style.top));
    if(!isNaN(q[0])) l.style.left=q[0]+'px';
    if(!isNaN(q[1])) l.style.top=q[1]+'px';
  }
}
function makeFloater(winId,headId,minId){
  var win=$(winId), head=$(headId); if(!win||!head) return;
  var drag=false,sx=0,sy=0,ox=0,oy=0;
  head.addEventListener('pointerdown',function(e){
    if(e.target.closest&&e.target.closest('button')) return; drag=true;
    var r=win.getBoundingClientRect(); ox=r.left; oy=r.top; sx=e.clientX; sy=e.clientY;
    win.style.left=ox+'px'; win.style.top=oy+'px'; win.style.right='auto';
    try{ head.setPointerCapture(e.pointerId); }catch(_){}
    e.preventDefault();
  });
  head.addEventListener('pointermove',function(e){
    if(!drag) return;
    var p=clampXY(win, ox+e.clientX-sx, oy+e.clientY-sy);
    win.style.left=p[0]+'px'; win.style.top=p[1]+'px';
  });
  function stop(){ drag=false; }
  head.addEventListener('pointerup',stop); head.addEventListener('pointercancel',stop);
  var mb=minId?$(minId):null; if(mb) mb.onclick=function(){ win.classList.toggle('min'); };
}
function initFloater(){
  makeFloater('mmFloat','mmFloatHead','mmMin');
  makeFloater('obsFloat','obsFloatHead','obsMin');
  makeFloater('forcedFloat','forcedFloatHead','forcedMin');
  window.addEventListener('resize',keepInside);
  setTimeout(keepInside,50);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
window.__ALIM={ state:state, setMode:setMode, faults:makeFaults, solve:function(){ solve(); renderAll(); },
  /* outil de test / lien direct : forcer une fiche du mode guide */
  fiche:function(id){ var F=global.FICHES||[], fc=null; F.forEach(function(x){ if(x.id===id) fc=x; }); if(!fc) return false;
    state.mode='forced'; updateModeButtons(); state.fiche=fc; state.faults=[faultDefFromFiche(fc)];
    state.phase=1; state.stepId=fc.start; state.trail=[]; state.stepDone=false; state.stepFb=''; state.stepVal=''; state.stepWrong=false; state.nextId=null; state.pendingTrail=''; state.declOk=false; state.declFb=''; state.declBand=''; state.symProbeKey=''; state.probeKey3=''; state.normOk=false; state.normFb=''; state.expOk=false; state.expFb=''; state.stepNormOk=false; state.stepNormFb='';
    state.seen={}; state.symChecked={}; state.obsDone=false; state.currentOK='';
    state.probeP=null; state.probeN=null; state.probePKey=null; state.probeNKey=null; resetTemp(); clearCorr();
    solve(); afterAction(); renderForced(); return true; },
  info:function(){ var n=state.fiche&&state.fiche.steps?Object.keys(state.fiche.steps).length:0;
    return { fiche:state.fiche&&state.fiche.id, phase:state.phase, step:state.stepId, nsteps:n,
      seen:Object.keys(state.seen).length, stepDone:state.stepDone, sintomas:forcedSymptomsKo().length }; },
  answer:function(i){ forcedAnswer(i); },
  next:function(){ forcedAdvance(); },
  norm:function(b){ normAnswer(b); },
  exp:function(){ expValidate(); },
  normStep:function(b){ normStepAnswer(b); },
  stepNorm:function(){ return curStep()?stepIsNormal(curStep()):null; },
  normText:function(){ return curStep()?stepNormText(curStep()):''; },
  band:function(v){ return voutBand(v); },
  scan:function(){ scanLens(); }, targets:function(){ return thermalTargets(); },
  probe:function(p,n,mode){ state.probeP=p; state.probeN=n; state.mmMode=mode; renderMeter(); } };
})(window);
