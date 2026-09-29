/* =========================================================================
   spice.js - Solveur generique (ngspice via eecircuit-engine)
   Construit un netlist ngspice a partir de ALIM.components + pannes, lance
   une analyse .op et renvoie les tensions de noeuds (casse d'origine).
   Repli : si le moteur n'est pas charge, SPICE.ready=false et l'app utilisera
   l'analyse interne (ALIM.solve).
   ========================================================================= */
(function (global) {
'use strict';

var eng = null, sim = null;
try { eng = global['EEcircuit-engine'] || null; } catch (e) { eng = null; }

/* true si la panne est un court-circuit de C5 : le limiteur de courant (Q3/Q4) est actif */
function isC5Short(faults){
  for(var i=0;i<faults.length;i++){ var f=faults[i]; if(f && f.id==='C5' && f.mode==='short') return true; }
  return false;
}

function ND(n){ return (n==='gnd'||n==null) ? '0' : n; }
function faultFor(faults,id){ if(!faults) return null; for(var i=0;i<faults.length;i++) if(faults[i].id===id) return faults[i]; return null; }

function buildNetlist(faults, meas){
  var L=['alim lineaire (DC apres le pont)'];
  var comps = global.ALIM.components;
  var c5short = isC5Short(faults||[]);
  comps.forEach(function(c){
    var f=faultFor(faults,c.id);
    if(c.type==='xfmr') return;
    if(c5short && (c.id==='C5'||c.id==='R10'||c.id==='R11')) return;  /* court C5 : C5 absorbe tout, le limiteur Q3/Q4 est actif (cf. commande Q2) */
    if(meas && (c.type==='vs'||c.type==='opamp')) return;   /* mesure : alim coupee, AOP non alimente */
    if(c.type==='vs'){ L.push('v'+c.id+' '+ND(c.p)+' '+ND(c.n)+' '+((f&&f.mode==='open')?0:c.v)); return; }
    if(c.type==='opamp'){
      if(f&&f.mode==='open'){ L.push('v'+c.id+' '+ND(c.out)+' 0 0'); return; }
      if(f&&f.mode==='short'){ L.push('v'+c.id+' '+ND(c.out)+' 0 19.5'); return; }
      if(c5short){ L.push('v'+c.id+' '+ND(c.out)+' 0 2.0'); return; }   /* limiteur actif : la commande reste basse (~2 V) */
      L.push('b'+c.id+' '+ND(c.out)+' 0 V = min(max(1e5*(V('+ND(c.pp)+')-V('+ND(c.pn)+')),0), max(0,V('+ND(c.vcc)+')-1.5))');
      return;
    }
    if(c.type==='r'||c.type==='fuse'||c.type==='trace'){
      if(f&&f.mode==='open') return;
      var r=c.r;
      if(f&&f.mode==='short') r=0.001;
      else if(f&&f.mode==='drift') r=c.r*(f.factor||2);
      else if(f&&f.mode==='cold') r=(c.type==='trace')?500:c.r*300;
      L.push('r'+c.id+' '+ND(c.a)+' '+ND(c.b)+' '+r); return;
    }
    if(c.type==='cap'){
      if(f&&f.mode==='short') L.push('r'+c.id+' '+ND(c.a)+' '+ND(c.b)+' 1');   /* court franc adouci : convergence ngspice stable */
      else if(f&&f.mode==='leak') L.push('r'+c.id+' '+ND(c.a)+' '+ND(c.b)+' '+(f.r||5000));
      return;
    }
    if(c.type==='d'||c.type==='led'||c.type==='zener'){
      if(f&&f.mode==='open') return;
      if(f&&f.mode==='short'){ L.push('r'+c.id+' '+ND(c.a)+' '+ND(c.b)+' 0.5'); return; }
      var m=c.type==='led'?'DLED':(c.type==='zener'?'DZEN':'DDIO');
      L.push('d'+c.id+' '+ND(c.a)+' '+ND(c.b)+' '+m); return;
    }
    if(c.type==='npn'||c.type==='pnp'){
      var mm=c.type==='npn'?'QN':'QP';
      var be='ok',bc='ok',ce='ok';
      if(f){ if(f.mode==='bjt'){ be=f.be||'ok'; bc=f.bc||'ok'; ce=f.ce||'ok'; }
             else if(f.mode==='open'){ be=bc=ce='open'; }
             else if(f.mode==='short'){ ce='short'; } }
      if(be==='short') L.push('r'+c.id+'be '+ND(c.b)+' '+ND(c.e)+' 0.01');
      if(bc==='short') L.push('r'+c.id+'bc '+ND(c.b)+' '+ND(c.c)+' 0.01');
      if(ce==='short') L.push('r'+c.id+'ce '+ND(c.c)+' '+ND(c.e)+' 0.01');
      if(be==='open'&&bc==='open') return;
      if(be==='open'){ L.push('d'+c.id+'bc '+ND(c.b)+' '+ND(c.c)+' DDIO'); return; }
      if(bc==='open'){ L.push('d'+c.id+'be '+ND(c.b)+' '+ND(c.e)+' DDIO'); return; }
      L.push('q'+c.id+' '+ND(c.c)+' '+ND(c.b)+' '+ND(c.e)+' '+mm); return;
    }
  });
  L.push('.model DDIO D (IS=1e-14 N=1)');
  L.push('.model DLED D (IS=1e-19 N=1.9)');
  L.push('.model DZEN D (IS=1e-14 N=1.1 BV=16 IBV=1e-3)');
  L.push('.model QN NPN (IS=1e-14 BF=200 BR=4)');
  L.push('.model QP PNP (IS=1e-14 BF=200 BR=4)');
  if(meas) L.push('imeas '+ND(meas.n2)+' '+ND(meas.n1)+' '+meas.i);
  /* fuites (10 Mohm) sur chaque noeud : evite les noeuds flottants (OP singulier)
     quand une piece est ouverte, sans perturber les mesures (< 2 Mohm). */
  (global.ALIM.nodes||[]).forEach(function(n){
    if(n==='gnd') return;
    L.push('rbl_'+n+' '+ND(n)+' 0 1e10');
  });
  L.push('.options rshunt=1e11 reltol=1e-3 gmin=1e-10 itl1=1000 itl6=200');
  L.push('.op');
  L.push('.end');
  return L.join('\n');
}

var caseMap=null;
function buildCaseMap(){
  caseMap={};
  (global.ALIM.nodes||[]).forEach(function(n){ caseMap[n.toLowerCase()]=n; });
  caseMap['0']='gnd'; caseMap['gnd']='gnd';
}

/* charge le moteur ESM (import.meta.url = base URL valide -> data-URL WASM OK) */
function loadEngine(){
  return new Promise(function(resolve){
    var done=false; function fin(){ if(!done){ done=true; resolve(); } }
    window.addEventListener('ee-ready', fin, {once:true});
    setTimeout(fin, 25000);
    try{
      var s=document.createElement('script'); s.type='module';
      s.textContent='import * as EE from "./eecircuit-engine.mjs"; window["EEcircuit-engine"]=EE; window.dispatchEvent(new Event("ee-ready"));';
      s.onerror=fin;
      document.head.appendChild(s);
    }catch(e){ fin(); }
  });
}
function initEngine(){
  if(!eng || !eng.Simulation) return Promise.resolve(false);
  buildCaseMap();
  return new Promise(function(resolve){
    try{
      sim = new eng.Simulation();
      sim.start().then(function(){ resolve(true); }).catch(function(){ resolve(false); });
    }catch(e){ resolve(false); }
  });
}
function start(){
  if(eng===null){ eng = global['EEcircuit-engine'] || null; }
  if(eng && eng.Simulation) return initEngine();
  if(typeof document!=='object' || !document.createElement) return Promise.resolve(false);
  return loadEngine().then(function(){
    eng = global['EEcircuit-engine'] || null;
    return initEngine();
  }).catch(function(){ return false; });
}

function runNet(net){
  return new Promise(function(resolve,reject){
    try{
      sim.setNetList(net);
      sim.runSim().then(function(res){
        var out={};
        (res.data||[]).forEach(function(d){
          var m=/v\((.+)\)/i.exec(d.name); if(!m) return;
          var key=m[1].toLowerCase();
          var name=(caseMap&&caseMap[key])||m[1];
          out[name]=d.values[0];
        });
        resolve(out);
      }).catch(reject);
    }catch(e){ reject(e); }
  });
}
function solve(faults){
  if(!sim) return Promise.reject(new Error('spice non demarre'));
  return runNet(buildNetlist(faults));
}
/* mesure type multimetre : ohm/cont (petit courant, jonctions non ouvertes) ; diode (1 mA) */
function measure(n1,n2,faults,mode){
  if(!sim) return Promise.reject(new Error('spice non demarre'));
  var i=(mode==='diode')?0.001:0.0001;
  return runNet(buildNetlist(faults,{n1:n1,n2:n2,i:i})).then(function(out){
    var v=(out[n1]||0)-(out[n2]||0);
    return {v:v, r:Math.abs(v/i)};
  });
}

global.SPICE = { ready:false, start:start, solve:solve, measure:measure, buildNetlist:buildNetlist };
})(typeof window!=='undefined'?window:globalThis);
