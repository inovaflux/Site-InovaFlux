/* =========================================================================
   Simulateur de diagnostic de logique Ladder
   Poste de transfert : tapis M1 + capteur de poids + 4 verins A/B/C/D
   Grafcet X0..X12  ->  Ladder live  +  pannes injectees
   ========================================================================= */
(function () {
'use strict';

/* ---------- utilitaires ---------- */
function $(id){ return document.getElementById(id); }
function svgEl(tag, attrs){
  var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if(attrs){ for(var k in attrs){ e.setAttribute(k, attrs[k]); } }
  return e;
}
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }

/* ---------- definitions machine ---------- */
var CYL_DEF = [
  { id:'A', name:'translation', sw0:'A0', sw1:'A1' },
  { id:'B', name:'verticale',   sw0:'B0', sw1:'B1' },
  { id:'C', name:'poussoir',    sw0:'C0', sw1:'C1' },
  { id:'D', name:'pince',       sw0:'D0', sw1:'D1' }
];
var SW_ADDR = { A0:'%IX0.0', A1:'%IX0.1', B0:'%IX0.2', B1:'%IX0.3',
                C0:'%IX0.4', C1:'%IX0.5', D0:'%IX0.6', D1:'%IX0.7' };
var CYL_BY_ID = {}; CYL_DEF.forEach(function(c){ CYL_BY_ID[c.id]=c; });

/* sorties : Q0..Q8 moteurs, Q9..Q12 voyants */
var OUT_DEF = [
  { q:0,  k:'A+',      addr:'%QX0.0' },
  { q:1,  k:'A-',      addr:'%QX0.1' },
  { q:2,  k:'B+',      addr:'%QX0.2' },
  { q:3,  k:'B-',      addr:'%QX0.3' },
  { q:4,  k:'C+',      addr:'%QX0.4' },
  { q:5,  k:'C-',      addr:'%QX0.5' },
  { q:6,  k:'D fermé',  addr:'%QX0.6' },
  { q:7,  k:'D ouvre', addr:'%QX0.7' },
  { q:8,  k:'M1 tapis',addr:'%QX1.0' },
  { q:9,  k:'L_PRET',  addr:'%QX1.1' },
  { q:10, k:'L_MARCHE',addr:'%QX1.2' },
  { q:11, k:'L_LAST',  addr:'%QX1.3' },
  { q:12, k:'L_ESTOP', addr:'%QX1.4' }
];

var STEPS = [
  { n:0,  name:'REPOS',    act:'Tapis OFF, vérins rentrés' },
  { n:1,  name:'TAPIS',    act:'Q8 M1=1 - attente pièce' },
  { n:2,  name:'PESÉE',    act:'Q8=0 - attente poids stable' },
  { n:3,  name:'C+',       act:'Q4 - poussoir sort' },
  { n:4,  name:'C-',       act:'Q5 - poussoir rentre' },
  { n:5,  name:'B+',       act:'Q2 - descente pince' },
  { n:6,  name:'D FERME',  act:'Q6 - pince serre' },
  { n:7,  name:'B-',       act:'Q3 - remontée (pièce prise)' },
  { n:8,  name:'A+',       act:'Q0 - translation vers dépose' },
  { n:9,  name:'B+',       act:'Q2 - descente dépose' },
  { n:10, name:'D OUVRE',  act:'Q7 - relâche la pièce' },
  { n:11, name:'B-',       act:'Q3 - remontée' },
  { n:12, name:'A-',       act:'Q1 - retour position' }
];

/* transitions : from -> to, conditions, timer ms */
var TRANS = [
  { from:0,  to:1,  cond:['M_Marche'],            t:0,   label:'Départ cycle' },
  { from:1,  to:2,  cond:['P_PRESENCE'],          t:100, label:'P_PRESENCE + 100ms' },
  { from:2,  to:3,  cond:['P_PRESENCE'],          t:200, label:'Pesée stable + 200ms' },
  { from:3,  to:4,  cond:['C1'],                  t:100, label:'C1 (poussoir sorti)' },
  { from:4,  to:5,  cond:['C0'],                  t:100, label:'C0 (poussoir rentré)' },
  { from:5,  to:6,  cond:['B1'],                  t:100, label:'B1 (pince en bas)' },
  { from:6,  to:7,  cond:['D1'],                  t:100, label:'D1 (pince fermée)' },
  { from:7,  to:8,  cond:['B0','P_LIBRE'],        t:100, label:'B0 + poids libéré (pièce prise)' },
  { from:8,  to:9,  cond:['A1'],                  t:100, label:'A1 (translation)' },
  { from:9,  to:10, cond:['B1'],                  t:100, label:'B1 (dépose)' },
  { from:10, to:11, cond:['D0'],                  t:100, label:'D0 (pince ouverte)' },
  { from:11, to:12, cond:['B0'],                  t:100, label:'B0 (remontée)' },
  { from:12, to:0,  cond:['A0','!M_Boucle'],      t:100, label:'Fin de cycle (A0) - stoppe la marche', extraReset:['M_Marche'] },
  { from:12, to:1,  cond:['A0','M_Boucle'],       t:100, label:'Boucle (maintien)' }
];

/* jeu de pannes possibles : etape visee + verin + capteur attendu */
var FAULT_POOL = [
  { step:3,  cyl:'C', side:1, sw:'C1' },
  { step:5,  cyl:'B', side:1, sw:'B1' },
  { step:6,  cyl:'D', side:1, sw:'D1' },
  { step:7,  cyl:'B', side:0, sw:'B0' },
  { step:8,  cyl:'A', side:1, sw:'A1' },
  { step:9,  cyl:'B', side:1, sw:'B1' },
  { step:11, cyl:'B', side:0, sw:'B0' },
  { step:12, cyl:'A', side:0, sw:'A0' }
];

var CAUSES = [
  { k:'actuator',      t:'Le vérin ne bouge pas (actionneur / distributeur)' },
  { k:'sensor',        t:'Le vérin bouge mais le capteur ne détecte pas' },
  { k:'plc_input',     t:'Le capteur s\'active mais l\'entrée PLC ne lit pas' },
  { k:'mechanical',    t:'Défaut mécanique : course incomplète (bloque avant le capteur)' },
  { k:'grip',          t:'Prise défaillante : la pièce n\'est pas retenue par la pince' },
  { k:'weight_sensor', t:'Le capteur de poids ne détecte pas la pièce' }
];

var CAUSE_CLUE = {
  actuator:      'La sortie du vérin est activée mais le vérin reste totalement immobile.',
  sensor:        'Le vérin est bien sorti, mais le capteur de fin de course ne s\'allume pas (LED terrain éteinte).',
  plc_input:     'Le capteur s\'allume en terrain (LED terrain ON) mais l\'automate ne le lit pas (LED entrée PLC OFF).',
  mechanical:    'Le vérin ne fait qu\'une course partielle : il n\'atteint jamais le capteur.',
  grip:          'La remontée se fait bien mais le poids reste élevé au poste : la pièce n\'a pas été saisie par la pince.',
  weight_sensor: 'La boîte est bien posée sur la balance mais le poids affiché reste à 0 : le capteur de poids ne renvoie rien.'
};

/* ---------- etat global ---------- */
var S = {};                 // signaux (bits) du programme
var M = {};                 // etat physique machine
var fault = null;
var activeStep = 0;
var simNow = 0;
var stepEnter = [];
var wasActive = [];
var cycleCount = 0;
var startPulse = false, stopPulse = false, rstPulse = false;
var estop = false, maint = false;
var lastBlockStep = -1, blockSince = 0;
var submittedLock = false;

/* modes : 'demo' (sans panne) | 'diag' (1 panne) | 'test' (10 pannes notees) */
var gameMode = 'demo';
var testIndex = 0, testTotal = 0, testResults = [], testMax = 10;

var RATE = 1.7;             // vitesse verins (course/s)
var BELT_TIME = 1.2;        // s pour amener une piece
var FALL_TIME = 0.5;        // s pour la chute de la boite sur la balance

/* =========================================================================
   CAPTEURS : physique (terrain) vs lecture PLC
   ========================================================================= */
function fieldState(cyl, side){
  var pos = M.cyl[cyl].pos;
  var raw = (side === 0) ? (pos <= 0.04) : (pos >= 0.96);
  if(fault && fault.armed && fault.type === 'sensor' &&
     fault.cyl === cyl && fault.side === side) return false;
  return raw;
}
function plcState(cyl, side){
  var f = fieldState(cyl, side);
  if(!f) return false;
  if(fault && fault.armed && fault.type === 'plc_input' &&
     fault.cyl === cyl && fault.side === side) return false;
  return true;
}

/* =========================================================================
   LADDER : construction des rungs
   ========================================================================= */
function NO(k){ return { t:'no', k:k }; }
function NC(k){ return { t:'nc', k:k }; }
function CMP(op, val, txt){ return { t:'cmp', op:op, val:val, txt:txt }; }
function TMR(n, ms){ return { t:'tmr', n:n, ms:ms, txt:'t='+ms+'ms' }; }

var RUNGS = [];
function addRung(group, label, r){
  r.group = group; r.label = label || ''; RUNGS.push(r); return r;
}

function buildRungs(){
  RUNGS = [];

  /* ----- PANNEAU ----- */
  addRung('PANNEAU OPÉRATEUR', 'M_Boucle = Maintien ET Marche',
    { pre:[NO('MAINT'), NO('M_Marche')], coils:[{t:'coil', k:'M_Boucle'}] });
  addRung('PANNEAU OPÉRATEUR', 'Auto-maintien de marche (Start || M_Marche)',
    { parallel:[[NO('START')],[NO('M_Marche')]], post:[NO('STOP'), NO('ESTOP')],
      coils:[{t:'coil', k:'M_Marche'}] });
  addRung('PANNEAU OPÉRATEUR', 'Reset / arret urgence de la marche',
    { parallel:[[NO('RST')],[NC('ESTOP')]], coils:[{t:'reset', k:'M_Marche'}] });

  /* ----- POIDS ----- */
  addRung('CAPTEUR DE POIDS', 'P_PRESENCE = AI0 >= 150 g',
    { pre:[CMP('>=', 150, 'AI0 >= 150g')], coils:[{t:'coil', k:'P_PRESENCE'}] });
  addRung('CAPTEUR DE POIDS', 'P_LIBRE = AI0 <= 50 g',
    { pre:[CMP('<=', 50, 'AI0 <= 50g')], coils:[{t:'coil', k:'P_LIBRE'}] });

  /* ----- RAZ / URGENCE ----- */
  addRung('SÉQUENCE - RAZ', 'RST_R : force X0 et remet X1..X12 a zero',
    { parallel:[[NO('RST')],[NC('ESTOP')]],
      coils:[{t:'set', k:'X0'},{t:'reset', k:'X1'},{t:'reset', k:'X2'},{t:'reset', k:'X3'},
             {t:'reset', k:'X4'},{t:'reset', k:'X5'},{t:'reset', k:'X6'},{t:'reset', k:'X7'},
             {t:'reset', k:'X8'},{t:'reset', k:'X9'},{t:'reset', k:'X10'},{t:'reset', k:'X11'},
             {t:'reset', k:'X12'}],
      coilDisplay:[{sym:'S', name:'X0'},{sym:'R', name:'X1..X12'}] });

  /* ----- ETAPES : bobines a maintien (Grafcet -> ladder traditionnel) -----
     Xn = ( (X(n-1) . transition) + Xn ) . /X(n+1)
     le NF de l'etape suivante est en SERIE avec le bloc entier : l'etape
     ne peut ni se maintenir ni repartir tant que la suivante est active.  */
  /* fin de cycle : coupe la marche si on ne boucle pas */
  addRung('SÉQUENCE - ÉTAPES', 'Fin de cycle : coupe la marche (dernier cycle)',
    { pre:[NO('X12'), NO('A0'), NC('M_Boucle'), TMR(12,100)], coils:[{t:'reset', k:'M_Marche'}] });

  for(var n = 0; n <= 12; n++){
    var branches = [];
    /* conditions de mise a 1 : toutes les transitions qui arrivent sur Xn */
    TRANS.forEach(function(tr){
      if(tr.to !== n) return;
      var br = [NO('X'+tr.from)];
      tr.cond.forEach(function(c){ br.push(c.charAt(0)==='!' ? NC(c.slice(1)) : NO(c)); });
      if(tr.t) br.push(TMR(tr.from, tr.t));
      branches.push(br);
    });
    /* maintien de l'etape (auto-maintien NO) */
    branches.push([NO('X'+n)]);
    /* NF de l'etape suivante, en serie avec tout le bloc */
    var post;
    if(n < 12) post = [NC('X'+(n+1))];
    else       post = [NC('X0'), NC('X1')];
    addRung('SÉQUENCE - ÉTAPES', 'Etape X'+n, { parallel:branches, post:post, coils:[{t:'coil', k:'X'+n}] });
  }

  /* ----- SORTIES ----- */
  addRung('SORTIES & VOYANTS', 'Q0  Vérin A sortie (A+)', { pre:[NO('X8')], coils:[{t:'coil',k:'Q0'}] });
  addRung('SORTIES & VOYANTS', 'Q1  Vérin A rentree (A-)', { pre:[NO('X12')], coils:[{t:'coil',k:'Q1'}] });
  addRung('SORTIES & VOYANTS', 'Q2  Vérin B sortie (B+)',
    { parallel:[[NO('X5')],[NO('X6')],[NO('X9')],[NO('X10')]], coils:[{t:'coil',k:'Q2'}] });
  addRung('SORTIES & VOYANTS', 'Q3  Vérin B rentree (B-)',
    { parallel:[[NO('X7')],[NO('X11')]], coils:[{t:'coil',k:'Q3'}] });
  addRung('SORTIES & VOYANTS', 'Q4  Vérin C sortie (C+)', { pre:[NO('X3')], coils:[{t:'coil',k:'Q4'}] });
  addRung('SORTIES & VOYANTS', 'Q5  Vérin C rentree (C-)', { pre:[NO('X4')], coils:[{t:'coil',k:'Q5'}] });
  addRung('SORTIES & VOYANTS', 'Q6  Pince D - fermer',
    { parallel:[[NO('X6')],[NO('X7')],[NO('X8')],[NO('X9')]], coils:[{t:'coil',k:'Q6'}] });
  addRung('SORTIES & VOYANTS', 'Q7  Pince D - ouvrir', { pre:[NO('X10')], coils:[{t:'coil',k:'Q7'}] });
  addRung('SORTIES & VOYANTS', 'Q8  Moteur tapis M1', { pre:[NO('X1')], coils:[{t:'coil',k:'Q8'}] });
  addRung('SORTIES & VOYANTS', 'Q9  Voyant PRET (bleu)',
    { pre:[NO('X0'), NC('M_Marche'), NO('ESTOP')], coils:[{t:'coil',k:'Q9'}] });
  addRung('SORTIES & VOYANTS', 'Q10 Voyant MARCHE (vert)',
    { pre:[NC('X0'), NO('M_Marche')], coils:[{t:'coil',k:'Q10'}] });
  addRung('SORTIES & VOYANTS', 'Q11 Voyant DERNIER CYCLE (jaune)',
    { pre:[NC('X0'), NC('M_Marche')], coils:[{t:'coil',k:'Q11'}] });
  addRung('SORTIES & VOYANTS', 'Q12 Voyant ARRET URGENCE (rouge)',
    { pre:[NC('ESTOP')], coils:[{t:'coil',k:'Q12'}] });
}

/* ---------- evaluation d'un element ---------- */
function elemVal(el){
  if(el.t === 'no')  return !!S[el.k];
  if(el.t === 'nc')  return !S[el.k];
  if(el.t === 'cmp') return el.op === '>=' ? (M.weightRead >= el.val) : (M.weightRead <= el.val);
  if(el.t === 'tmr') return (simNow - stepEnter[el.n]) >= el.ms;
  return false;
}
function evalRung(r){
  var vals = [];
  var preOk = true;
  (r.pre || []).forEach(function(el){ var v = elemVal(el); vals.push({el:el, v:v}); if(!v) preOk = false; });

  var parOk = true;
  if(r.parallel){
    parOk = false;
    r.parallel.forEach(function(br){
      var b = true;
      br.forEach(function(el){ var v = elemVal(el); vals.push({el:el, v:v}); if(!v) b = false; });
      if(b) parOk = true;
    });
  }
  var postOk = true;
  (r.post || []).forEach(function(el){ var v = elemVal(el); vals.push({el:el, v:v}); if(!v) postOk = false; });

  var pow = preOk && parOk && postOk;
  r._pow = pow;
  r._vals = vals;
  r.coils.forEach(function(c){
    if(c.t === 'set'){
      if(pow){
        if(c.k.charAt(0) === 'X' && !S[c.k]) stepEnter[parseInt(c.k.slice(1),10)] = simNow;
        S[c.k] = true;
      }
    }
    else if(c.t === 'reset'){ if(pow) S[c.k] = false; }
    else { S[c.k] = pow; }
  });
  return pow;
}

/* =========================================================================
   SCAN automate
   ========================================================================= */
function scan(t){
  simNow = (t === undefined) ? performance.now() : t;

  CYL_DEF.forEach(function(c){
    S[c.sw0] = plcState(c.id, 0);
    S[c.sw1] = plcState(c.id, 1);
  });
  S.START = startPulse;
  S.STOP  = !stopPulse;   // contact NF : 1 = normal
  S.MAINT = maint;
  S.RST   = rstPulse;
  S.ESTOP = !estop;       // contact NF : 1 = normal

  for(var i=0;i<RUNGS.length;i++) evalRung(RUNGS[i]);

  startPulse = false; stopPulse = false; rstPulse = false;

  var found = -1;
  /* etape la plus recente (la plus haute) : evite qu'une etape transitoire
     retarde l'armement d'une panne pendant le scan de transition          */
  for(var n=0;n<=12;n++){ if(S['X'+n]) found = n; }
  if(found < 0){ S.X0 = true; found = 0; }
  var prev = activeStep;
  activeStep = found;
  for(var n=0;n<=12;n++){ if(S['X'+n] && !wasActive[n]) stepEnter[n] = simNow; }
  for(var n=0;n<=12;n++){ wasActive[n] = !!S['X'+n]; }
  if(prev === 12 && activeStep !== 12) cycleCount++;

  /* detection du blocage (pour l'aide visuelle) */
  if(activeStep === lastBlockStep){ /* rien */ }
  else { lastBlockStep = activeStep; blockSince = simNow; }
}

/* =========================================================================
   PHYSIQUE
   ========================================================================= */
function physics(dt){
  /* armer la panne a l'entree de l'etape cible */
  if(fault && !fault.armed && activeStep === fault.step) fault.armed = true;

  var cmd = {
    A:{ ext:S.Q0, ret:S.Q1 },
    B:{ ext:S.Q2, ret:S.Q3 },
    C:{ ext:S.Q4, ret:S.Q5 },
    D:{ ext:S.Q6, ret:S.Q7 }
  };
  CYL_DEF.forEach(function(c){
    var st = M.cyl[c.id];
    var e = cmd[c.id].ext, rr = cmd[c.id].ret;
    var blocked = fault && fault.armed && fault.type === 'actuator' && fault.cyl === c.id;
    var meca = fault && fault.armed && fault.type === 'mechanical' && fault.cyl === c.id;
    var hi = 1, lo = 0;
    if(meca){ if(fault.side === 1) hi = 0.6; else lo = 0.4; }

    if(!blocked){
      if(e && !rr) st.pos = clamp(st.pos + RATE*dt, 0, hi);
      else if(rr && !e) st.pos = clamp(st.pos - RATE*dt, lo, 1);
    }
  });

  /* tapis + piece : avance -> chute sur la balance -> detection */
  if(S.Q8 && !M.beltBusy && !M.beltDone && !M.partOnStation && !M.partCarried){
    M.beltBusy = true; M.beltProgress = 0; M.partDropped = false; M.pushPos = 0;
  }
  if(M.beltBusy){
    M.beltProgress += dt / BELT_TIME;
    if(M.beltProgress >= 1){
      M.beltProgress = 1; M.beltBusy = false; M.beltDone = true; M.fallT = 0;
    }
  }
  /* la boite passe le bout du tapis et tombe sur la balance (temps visible) */
  if(M.beltDone && M.fallT < 1){
    M.fallT = Math.min(1, M.fallT + dt / FALL_TIME);
    if(M.fallT >= 1){ M.beltDone = false; M.partOnStation = true; }
  }
  /* le poussoir C fait glisser la boite une fois posee sur la balance */
  if(M.partOnStation && !M.partCarried && !M.partDropped){
    M.pushPos = Math.max(M.pushPos || 0, M.cyl.C.pos);
  }
  /* prise de piece : pince fermee, le verin B remonte -> la piece suit la pince */
  if(M.partOnStation && S.Q6 && M.cyl.D.pos >= 0.97 && M.cyl.B.pos <= 0.9){
    if(!(fault && fault.armed && fault.type === 'grip')){
      M.partOnStation = false; M.partCarried = true; M.partGrabbed = false;
    }
  }
  /* relache dans la caisse : la piece disparait a l'interieur */
  if(M.partCarried && S.Q7 && M.cyl.D.pos <= 0.03){
    M.partCarried = false; M.partDropped = true;
  }
  /* poids reel au poste (bruit uniquement si une piece est presente) */
  M.weight = M.partOnStation ? (250 + (Math.random()-0.5)*4) : 0;
  /* lecture du capteur de poids (peut etre defaillante) */
  M.weightRead = (fault && fault.armed && fault.type === 'weight_sensor') ? 0 : M.weight;
}

/* =========================================================================
   MISE EN PAGE : MACHINE (SVG)
   ========================================================================= */
var mnodes = {};
function buildMachine(){
  var svg = $('machineSvg');
  svg.innerHTML = '';
  var g = svgEl('g'); svg.appendChild(g);

  /* --- scene : long tapis -> chute sur la balance -> poussoir C (sous le tapis) -> portique -> caisse --- */
  /* rail du portique */
  g.appendChild(svgEl('line',{x1:430,y1:36,x2:700,y2:36,stroke:'#334155','stroke-width':4}));
  /* long tapis roulant (encore plus haut : le poussoir passe dessous) */
  g.appendChild(svgEl('rect',{x:30,y:60,width:290,height:12,rx:6,fill:'#334155'}));
  [42,175,308].forEach(function(x){
    g.appendChild(svgEl('circle',{cx:x,cy:69,r:9,fill:'#1f2937',stroke:'#475569','stroke-width':2}));
  });
  g.appendChild(svgEl('text',{x:104,y:100,fill:'#93c5fd','font-size':12,'font-family':'sans-serif'})).textContent='Tapis roulant';
  var m1 = svgEl('circle',{id:'m1led',cx:42,cy:82,r:5,fill:'#334155'}); g.appendChild(m1); mnodes.m1=m1;
  /* balance / capteur de poids (au bout du tapis) */
  g.appendChild(svgEl('rect',{x:300,y:98,width:260,height:7,rx:3,fill:'#475569'}));
  g.appendChild(svgEl('rect',{x:330,y:105,width:22,height:14,rx:2,fill:'#1f2937',stroke:'#475569','stroke-width':1.5}));
  g.appendChild(svgEl('text',{x:558,y:92,'text-anchor':'end',fill:'#93c5fd','font-size':12,'font-family':'sans-serif'})).textContent='Poste de pesée';
  /* afficheur de poids 4 digits x 8 segments (sous le passage du poussoir C) */
  g.appendChild(svgEl('rect',{x:334,y:126,width:216,height:46,rx:6,fill:'#0b1120',stroke:'#334155','stroke-width':2}));
  var sevenSeg = [];
  var dx0 = 348, dy0 = 135, dW = 20, dH = 28, dGap = 12;
  function mkseg(x1,y1,x2,y2){
    var l = svgEl('line',{x1:x1,y1:y1,x2:x2,y2:y2,stroke:'#1f2937','stroke-width':5,'stroke-linecap':'round'});
    g.appendChild(l); return l;
  }
  for(var d = 0; d < 4; d++){
    var bx = dx0 + d*(dW+dGap), by = dy0, seg = {};
    seg.a = mkseg(bx+4,by, bx+dW-4,by);
    seg.f = mkseg(bx,by+4, bx,by+dH/2-4);
    seg.b = mkseg(bx+dW,by+4, bx+dW,by+dH/2-4);
    seg.g = mkseg(bx+4,by+dH/2, bx+dW-4,by+dH/2);
    seg.e = mkseg(bx,by+dH/2+4, bx,by+dH-4);
    seg.c = mkseg(bx+dW,by+dH/2+4, bx+dW,by+dH-4);
    seg.d = mkseg(bx+4,by+dH, bx+dW-4,by+dH);
    sevenSeg.push(seg);
  }
  mnodes.sevenSeg = sevenSeg;
  g.appendChild(svgEl('text',{x:474,y:162,fill:'#64748b','font-size':12,'font-family':'sans-serif'})).textContent='g';
  var pl = svgEl('text',{id:'poidsLed',x:334,y:188,fill:'#64748b','font-size':11,'font-family':'sans-serif'}); g.appendChild(pl); mnodes.poidsLed=pl;
  /* poussoir C SOUS le tapis, rapproche : palette collee au verin au repos */
  g.appendChild(svgEl('rect',{x:210,y:104,width:100,height:20,rx:4,fill:'#1f2937',stroke:'#475569','stroke-width':2}));
  g.appendChild(svgEl('text',{x:214,y:119,fill:'#93c5fd','font-size':11,'font-family':'sans-serif'})).textContent='poussoir C';
  var prod = svgEl('line',{id:'prod',x1:310,y1:116,x2:323,y2:116,stroke:'#cbd5e1','stroke-width':4}); g.appendChild(prod); mnodes.prod=prod;
  var pplate = svgEl('rect',{id:'pplate',x:323,y:88,width:7,height:28,rx:1,fill:'#e2e8f0',stroke:'#94a3b8'}); g.appendChild(pplate); mnodes.pplate=pplate;
  /* interieur de la caisse (ouvert en haut) */
  g.appendChild(svgEl('rect',{x:586,y:66,width:108,height:40,rx:2,fill:'#241a12',stroke:'#3a2c1e','stroke-width':1}));
  /* --- easter egg : effet teleporteur Star Trek (au debut du tapis) --- */
  var tele = svgEl('g',{opacity:'0'}); g.appendChild(tele); mnodes.tele = tele;
  mnodes.teleBeam1 = svgEl('rect',{x:36,y:18,width:42,height:90,fill:'#22d3ee',opacity:'0.2'});
  mnodes.teleBeam2 = svgEl('rect',{x:47,y:18,width:20,height:90,fill:'#a5f3fc',opacity:'0.3'});
  tele.appendChild(mnodes.teleBeam1); tele.appendChild(mnodes.teleBeam2);
  mnodes.teleSparks = [];
  for(var sp=0; sp<12; sp++){
    var sc = svgEl('circle',{cx:56,cy:100,r:2,fill:'#e0f2fe',opacity:'0'});
    tele.appendChild(sc); mnodes.teleSparks.push(sc);
  }
  /* piece (boite) */
  var part = svgEl('rect',{id:'partBox',x:-40,y:-40,width:20,height:16,rx:2,fill:'#fbbf24',stroke:'#b45309','stroke-width':1.5}); g.appendChild(part); mnodes.part=part;
  /* portique : chariot + tige + pince (positions dynamiques) */
  var carriage = svgEl('rect',{id:'carriage',x:461,y:28,width:18,height:10,rx:2,fill:'#94a3b8'}); g.appendChild(carriage); mnodes.carriage=carriage;
  var grod = svgEl('line',{id:'grod',x1:470,y1:38,x2:470,y2:84,stroke:'#cbd5e1','stroke-width':3}); g.appendChild(grod); mnodes.grod=grod;
  var gbar = svgEl('line',{id:'gbar',x1:450,y1:84,x2:490,y2:84,stroke:'#cbd5e1','stroke-width':4}); g.appendChild(gbar); mnodes.gbar=gbar;
  var jawL = svgEl('line',{id:'jawL',x1:450,y1:84,x2:450,y2:98,stroke:'#cbd5e1','stroke-width':4}); g.appendChild(jawL); mnodes.jawL=jawL;
  var jawR = svgEl('line',{id:'jawR',x1:490,y1:84,x2:490,y2:98,stroke:'#cbd5e1','stroke-width':4}); g.appendChild(jawR); mnodes.jawR=jawR;
  /* caisse au sol : face avant devant la piece/pince, ouverture en haut */
  g.appendChild(svgEl('rect',{x:582,y:82,width:116,height:28,rx:2,fill:'#5b4636',stroke:'#a97b4f','stroke-width':2}));
  g.appendChild(svgEl('rect',{x:582,y:82,width:116,height:5,fill:'#caa06a'}));
  g.appendChild(svgEl('line',{x1:590,y1:88,x2:690,y2:106,stroke:'#6f5744','stroke-width':2}));
  g.appendChild(svgEl('line',{x1:690,y1:88,x2:590,y2:106,stroke:'#6f5744','stroke-width':2}));
  g.appendChild(svgEl('text',{x:640,y:103,'text-anchor':'middle',fill:'#f0e0c5','font-size':11,'font-family':'sans-serif'})).textContent='CAISSE';

  /* --- verins --- */
  CYL_DEF.forEach(function(c, i){
    var y = 150 + i*68;
    var grp = svgEl('g'); g.appendChild(grp);
    grp.appendChild(svgEl('text',{x:12,y:y+22,fill:'#38bdf8','font-size':16,'font-weight':'bold','font-family':'monospace'})).textContent = c.id;
    grp.appendChild(svgEl('text',{x:12,y:y+36,fill:'#64748b','font-size':9,'font-family':'sans-serif'})).textContent = c.name;
    /* corps */
    grp.appendChild(svgEl('rect',{x:60,y:y,width:92,height:30,rx:4,fill:'#1f2937',stroke:'#475569','stroke-width':2}));
    /* tige */
    var rod = svgEl('rect',{id:'rod_'+c.id,x:152,y:y+11,width:4,height:8,rx:2,fill:'#cbd5e1'}); grp.appendChild(rod); mnodes['rod_'+c.id]=rod;
    var cap = svgEl('rect',{id:'cap_'+c.id,x:152,y:y-2,width:6,height:34,rx:2,fill:'#94a3b8'}); grp.appendChild(cap); mnodes['cap_'+c.id]=cap;
    /* position */
    var pos = svgEl('text',{id:'pos_'+c.id,x:300,y:y+20,fill:'#e2e8f0','font-size':11,'font-family':'monospace'}); grp.appendChild(pos); mnodes['pos_'+c.id]=pos;
    /* commandes */
    var ce = svgEl('text',{id:'cmde_'+c.id,x:12,y:y-6,fill:'#475569','font-size':10,'font-family':'monospace'}); ce.textContent='+'; grp.appendChild(ce); mnodes['cmde_'+c.id]=ce;
    var cr = svgEl('text',{id:'cmdr_'+c.id,x:24,y:y-6,fill:'#475569','font-size':10,'font-family':'monospace'}); cr.textContent='-'; grp.appendChild(cr); mnodes['cmdr_'+c.id]=cr;
    /* capteurs : terrain (T) et PLC (P) pour chaque cote */
    [0,1].forEach(function(side){
      var x = side===0 ? 150 : 252;
      var f = svgEl('circle',{id:'fld_'+c.id+side,cx:x,cy:y-12,r:5,fill:'#334155'}); grp.appendChild(f); mnodes['fld_'+c.id+side]=f;
      var p = svgEl('circle',{id:'plc_'+c.id+side,cx:x,cy:y+42,r:5,fill:'#334155'}); grp.appendChild(p); mnodes['plc_'+c.id+side]=p;
      grp.appendChild(svgEl('text',{x:x-4,y:y-24,fill:'#475569','font-size':8,'font-family':'sans-serif'})).textContent = (side===0?'T0':'T1');
      grp.appendChild(svgEl('text',{x:x-4,y:y+54,fill:'#475569','font-size':8,'font-family':'sans-serif'})).textContent = (side===0?'P0':'P1');
    });
  });
}

/* afficheur 7 segments : segments allumes par chiffre */
var DIGIT = {
  '0':'abcdef', '1':'bc', '2':'abged', '3':'abgcd', '4':'fgbc',
  '5':'afgcd', '6':'afgecd', '7':'abc', '8':'abcdefg', '9':'abcdfg', ' ':''
};
function renderSevenSeg(v){
  if(!mnodes.sevenSeg) return;
  var txt = String(Math.max(0, Math.round(v)));
  if(txt.length > 4) txt = txt.slice(-4);
  while(txt.length < 4) txt = '0' + txt;          /* 4 digits, zeros de tete */
  for(var i = 0; i < 4; i++){
    var on = DIGIT[txt.charAt(i)] || '';
    var seg = mnodes.sevenSeg[i];
    for(var k = 0; k < 7; k++){
      var s = 'abcdefg'.charAt(k);
      seg[s].setAttribute('stroke', on.indexOf(s) >= 0 ? '#4ade80' : '#1a2436');
    }
  }
}

function renderMachine(){
  var A = M.cyl.A.pos, B = M.cyl.B.pos, C = M.cyl.C.pos, D = M.cyl.D.pos;
  var gx = 470 + A*170;
  var gy = 42 + B*40;   /* le haut de la pince s'arrete au sommet de la boite (pas de traversee) */

  /* poussoir C : palette collee au verin au repos, pousse la boite vers le poste de saisie */
  var plateX = 329 + C*130;
  mnodes.prod.setAttribute('x2', plateX-6);
  mnodes.pplate.setAttribute('x', plateX-6);

  /* portique : chariot + tige + pince ; les mors s'ouvrent/ferment avec D */
  var jawOff = 20 - D*9;   /* 20 = ouvert, 11 = ferme */
  mnodes.carriage.setAttribute('x', gx-9);
  mnodes.grod.setAttribute('x1',gx); mnodes.grod.setAttribute('y1',38);
  mnodes.grod.setAttribute('x2',gx); mnodes.grod.setAttribute('y2',gy);
  mnodes.gbar.setAttribute('x1',gx-jawOff); mnodes.gbar.setAttribute('y1',gy);
  mnodes.gbar.setAttribute('x2',gx+jawOff); mnodes.gbar.setAttribute('y2',gy);
  mnodes.jawL.setAttribute('x1',gx-jawOff); mnodes.jawL.setAttribute('y1',gy);
  mnodes.jawL.setAttribute('x2',gx-jawOff); mnodes.jawL.setAttribute('y2',gy+14);
  mnodes.jawR.setAttribute('x1',gx+jawOff); mnodes.jawR.setAttribute('y1',gy);
  mnodes.jawR.setAttribute('x2',gx+jawOff); mnodes.jawR.setAttribute('y2',gy+14);

  /* piece : teleportation (a gauche) -> roule sur le tapis -> chute parabolique -> poussee -> prise -> caisse */
  var px, py, alpha = 1, rot = 0, scaleY = 1;
  var MAT = 0.28;                         /* part du temps tapis consacree a la materialisation */
  var tp = M.beltBusy ? (M.beltProgress || 0) : 0;
  /* faisceau + etincelles du teleporteur (au debut du tapis) */
  var beamA = 0;
  if(M.beltBusy) beamA = (tp < MAT) ? 1 : Math.max(0, 1 - (tp - MAT)*5);
  mnodes.tele.setAttribute('opacity', beamA.toFixed(2));
  if(beamA > 0){
    var mat = Math.min(1, tp/MAT);
    var pulse = 0.6 + 0.4*Math.sin(tp*60);
    mnodes.teleBeam1.setAttribute('opacity', (0.12 + 0.25*mat)*pulse);
    mnodes.teleBeam2.setAttribute('opacity', (0.18 + 0.35*mat)*pulse);
    for(var i=0;i<mnodes.teleSparks.length;i++){
      var c = mnodes.teleSparks[i];
      var ph = (tp*6 + i/mnodes.teleSparks.length) % 1;
      c.setAttribute('cx', 46 + ((i*11)%18));
      c.setAttribute('cy', 104 - ph*86);
      c.setAttribute('r', 1.5 + (i%3));
      c.setAttribute('opacity', (1-ph) * (0.3 + 0.6*mat));
    }
  }
  if(M.partCarried){
    px = gx - 10; py = gy; rot = 90;
  } else if(M.partOnStation){
    px = 330 + (M.pushPos || 0)*130; py = 82; rot = 90;
  } else if(M.beltDone){
    var ft = M.fallT || 0;
    px = 300 + ft*30;                 /* deplacement horizontal regulier */
    py = 44 + 38*ft*ft;               /* chute acceleree -> parabole */
    rot = 90*ft;                      /* rotation horaire pendant la chute */
  } else if(M.beltBusy){
    if(tp < MAT){                     /* materialisation a gauche */
      px = 45; py = 44;
      scaleY = 0.3 + 0.7*mat;
      alpha = mat * (0.7 + 0.3*Math.sin(tp*120));
    } else {                          /* puis la boite roule sur le tapis */
      var tv = (tp - MAT)/(1 - MAT);
      px = 45 + tv*255; py = 44;
    }
  } else {
    px = -60; py = -60; alpha = 0;
  }
  mnodes.part.setAttribute('x', px);
  mnodes.part.setAttribute('y', py);
  mnodes.part.setAttribute('opacity', alpha);
  var ccx = px+10, ccy = py+8;
  if(rot || scaleY !== 1){
    var tr = 'translate(' + ccx + ' ' + ccy + ')';
    if(rot) tr += ' rotate(' + rot.toFixed(1) + ')';
    if(scaleY !== 1) tr += ' scale(1 ' + scaleY.toFixed(3) + ')';
    tr += ' translate(' + (-ccx) + ' ' + (-ccy) + ')';
    mnodes.part.setAttribute('transform', tr);
  } else {
    mnodes.part.removeAttribute('transform');
  }

  mnodes.m1.setAttribute('fill', S.Q8 ? '#22c55e' : '#334155');
  renderSevenSeg(M.weightRead);
  mnodes.poidsLed.textContent = M.weightRead >= 150 ? 'PIÈCE DÉTECTÉE' : (M.weightRead <= 50 ? 'poste libre' : '...');
  mnodes.poidsLed.setAttribute('fill', M.weightRead >= 150 ? '#4ade80' : '#64748b');

  CYL_DEF.forEach(function(c){
    var pos = M.cyl[c.id].pos;
    var x = 152 + pos * 96;
    mnodes['rod_'+c.id].setAttribute('x', 152);
    mnodes['rod_'+c.id].setAttribute('width', Math.max(4, x-152));
    mnodes['cap_'+c.id].setAttribute('x', x+4);
    mnodes['pos_'+c.id].textContent = Math.round(pos*100) + '%';
    var extCmd = {A:S.Q0,B:S.Q2,C:S.Q4,D:S.Q6}[c.id];
    var retCmd = {A:S.Q1,B:S.Q3,C:S.Q5,D:S.Q7}[c.id];
    mnodes['cmde_'+c.id].setAttribute('fill', extCmd ? '#facc15' : '#475569');
    mnodes['cmdr_'+c.id].setAttribute('fill', retCmd ? '#facc15' : '#475569');
    [0,1].forEach(function(side){
      var f = fieldState(c.id, side);
      var p = plcState(c.id, side);
      mnodes['fld_'+c.id+side].setAttribute('fill', f ? '#38bdf8' : '#334155');
      mnodes['plc_'+c.id+side].setAttribute('fill', p ? '#22c55e' : '#334155');
    });
  });
}

/* =========================================================================
   TABLEAU E/S
   ========================================================================= */
var ioInNodes = [], ioOutNodes = [];
function buildIO(){
  var tbody = $('ioIn').querySelector('tbody');
  tbody.innerHTML = '';
  var rows = [];
  CYL_DEF.forEach(function(c){
    rows.push({ k:c.sw0, label:c.sw0+' vérin '+c.id+' rentré', type:'sw', cyl:c.id, side:0 });
    rows.push({ k:c.sw1, label:c.sw1+' vérin '+c.id+' sorti',  type:'sw', cyl:c.id, side:1 });
  });
  rows.push({ k:'START', label:'DCY depart cycle', type:'in' });
  rows.push({ k:'STOP',  label:'STOP (NF)', type:'in' });
  rows.push({ k:'MAINT', label:'Maintien', type:'in' });
  rows.push({ k:'RST',   label:'Reset', type:'in' });
  rows.push({ k:'ESTOP', label:'Arret urgence (NF)', type:'in' });

  rows.forEach(function(r){
    var tr = document.createElement('tr');
    var td1 = document.createElement('td');
    if(r.type === 'sw'){
      var dT = document.createElement('i'); dT.className='dot'; td1.appendChild(dT);
      var dP = document.createElement('i'); dP.className='dot'; td1.appendChild(dP);
      r._dT = dT; r._dP = dP;
    } else {
      var d = document.createElement('i'); d.className='dot'; td1.appendChild(d);
      r._dP = d;
    }
    var td2 = document.createElement('td'); td2.textContent = r.label;
    var td3 = document.createElement('td'); td3.className='mono'; td3.textContent = r.addr || '';
    tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
    tbody.appendChild(tr);
    ioInNodes.push(r);
  });

  var ob = $('ioOut').querySelector('tbody');
  ob.innerHTML = '';
  OUT_DEF.forEach(function(o){
    var tr = document.createElement('tr');
    var td1 = document.createElement('td');
    var d = document.createElement('i'); d.className='dot'; td1.appendChild(d);
    var td2 = document.createElement('td'); td2.textContent = 'Q'+o.q+' '+o.k;
    var td3 = document.createElement('td'); td3.className='mono'; td3.textContent = o.addr;
    tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
    ob.appendChild(tr);
    ioOutNodes.push({ o:o, dot:d });
  });
}
function renderIO(){
  CYL_DEF.forEach(function(c){
    ioInNodes.forEach(function(r){
      if(r.type==='sw' && r.cyl===c.id){
        var f = fieldState(c.id, r.side), p = plcState(c.id, r.side);
        if(r._dT) r._dT.className = 'dot' + (f?' on blue':'');
        if(r._dP) r._dP.className = 'dot' + (p?' on':'');
      }
    });
  });
  ioInNodes.forEach(function(r){
    if(r.type!=='sw' && r._dP){
      var v = {START:S.START,STOP:S.STOP,MAINT:S.MAINT,RST:S.RST,ESTOP:S.ESTOP}[r.k];
      r._dP.className = 'dot' + (v?' on':'');
    }
  });
  ioOutNodes.forEach(function(x){
    x.dot.className = 'dot' + (S['Q'+x.o.q]?' on yellow':'');
  });
  $('ioWeight').textContent = Math.round(M.weightRead) + ' g';
}

/* =========================================================================
   GRAFCET (HTML)
   ========================================================================= */
var gstepNodes = [];
function buildGrafcet(){
  var host = $('grafcet'); host.innerHTML = '';
  gstepNodes = [];
  function addStep(st){
    var d = document.createElement('div'); d.className='gstep';
    var num = document.createElement('div'); num.className='num'; num.textContent='X'+st.n;
    var nm = document.createElement('div'); nm.className='name'; nm.textContent=st.name;
    var ac = document.createElement('div'); ac.className='act'; ac.textContent=st.act;
    d.appendChild(num); d.appendChild(nm); d.appendChild(ac);
    host.appendChild(d);
    gstepNodes.push({ type:'step', node:d, step:st.n });
  }
  function addTr(from, label, to, cls){
    var tdiv = document.createElement('div'); tdiv.className = 'gtr' + (cls ? (' '+cls) : '');
    var ar = document.createElement('span'); ar.className='arrow'; ar.textContent='↓';
    var tx = document.createElement('span'); tx.textContent = label;
    tdiv.appendChild(ar); tdiv.appendChild(tx);
    if(to){
      var ex = document.createElement('span'); ex.className='to'; ex.textContent = to;
      tdiv.appendChild(ex);
    }
    host.appendChild(tdiv);
    gstepNodes.push({ type:'tr', node:tdiv, from:from });
  }
  STEPS.forEach(function(st, i){
    addStep(st);
    if(st.n === 12){
      /* divergence finale : fin de cycle (X0) ou boucle (X1) */
      addTr(12, 'A0 + /M_Boucle  (fin de cycle)', '→ X0', 'branch');
      addTr(12, 'A0 + M_Boucle   (maintien)',     '→ X1', 'branch');
    } else if(i < STEPS.length-1){
      var tr = TRANS.filter(function(t){ return t.from===st.n; })[0];
      addTr(st.n, tr ? tr.label : '', null, null);
    }
  });
}
function renderGrafcet(){
  gstepNodes.forEach(function(item){
    if(item.type === 'step'){
      item.node.className = 'gstep' + (item.step === activeStep ? ' active' : '');
    } else {
      var blocked = !!(fault && fault.armed && activeStep === item.from && fault.step === item.from);
      item.node.className = 'gtr' + (item.node.classList.contains('branch') ? ' branch' : '') +
                            (blocked ? ' blocked' : '');
    }
  });
}

/* =========================================================================
   LADDER (SVG)
   ========================================================================= */
var CW = 58, RAIL = 14, LEFT = 42, ROWH = 30, HW = 29;
var ladderContacts = [], ladderCoils = [];

function contactShape(parent, el, x, yc){
  var grp = svgEl('g'); parent.appendChild(grp);
  var col = '#64748b';
  grp.appendChild(svgEl('line',{x1:x-HW,y1:yc,x2:x-7,y2:yc,stroke:col,'stroke-width':2}));
  grp.appendChild(svgEl('line',{x1:x+7,y1:yc,x2:x+HW,y2:yc,stroke:col,'stroke-width':2}));
  if(el.t === 'cmp' || el.t === 'tmr'){
    var rect = svgEl('rect',{x:x-24,y:yc-10,width:48,height:20,rx:3,fill:'#0d1526',stroke:col,'stroke-width':1.5});
    grp.appendChild(rect);
    var t = svgEl('text',{x:x,y:yc+4,'text-anchor':'middle',fill:col,'font-size':9,'font-family':'sans-serif'});
    t.textContent = el.txt || '';
    grp.appendChild(t);
  } else {
    grp.appendChild(svgEl('line',{x1:x-7,y1:yc-9,x2:x-7,y2:yc+9,stroke:col,'stroke-width':2.5}));
    grp.appendChild(svgEl('line',{x1:x+7,y1:yc-9,x2:x+7,y2:yc+9,stroke:col,'stroke-width':2.5}));
    if(el.t === 'nc'){
      grp.appendChild(svgEl('line',{x1:x-10,y1:yc+9,x2:x+10,y2:yc-9,stroke:col,'stroke-width':2}));
    }
    var lt = svgEl('text',{x:x,y:yc+16,'text-anchor':'middle',fill:'#94a3b8','font-size':9.5,'font-family':'monospace'});
    lt.textContent = (el.t==='nc'?'/':'') + (el.txt || el.k || '');
    grp.appendChild(lt);
  }
  ladderContacts.push({ el:el, grp:grp });
  return grp;
}

function coilShape(parent, x, yc, sym, name){
  var grp = svgEl('g'); parent.appendChild(grp);
  var col = '#64748b';
  grp.appendChild(svgEl('line',{x1:x,y1:yc,x2:x+10,y2:yc,stroke:col,'stroke-width':2}));
  var gx = x + 10, gw = 26;
  if(sym === 'S' || sym === 'R'){
    var rect = svgEl('rect',{x:gx,y:yc-11,width:gw,height:22,rx:3,fill:'#0d1526',stroke:col,'stroke-width':2});
    grp.appendChild(rect);
    var st = svgEl('text',{x:gx+gw/2,y:yc+4,'text-anchor':'middle',fill:col,'font-size':12,'font-weight':'bold','font-family':'monospace'});
    st.textContent = sym; grp.appendChild(st);
  } else {
    grp.appendChild(svgEl('path',{d:'M '+(gx+5)+','+(yc-11)+' Q '+(gx-4)+','+yc+' '+(gx+5)+','+(yc+11),fill:'none',stroke:col,'stroke-width':2.5}));
    grp.appendChild(svgEl('path',{d:'M '+(gx+gw-5)+','+(yc-11)+' Q '+(gx+gw+4)+','+yc+' '+(gx+gw-5)+','+(yc+11),fill:'none',stroke:col,'stroke-width':2.5}));
  }
  var nameX = gx + gw + 8;
  var nt = svgEl('text',{x:nameX,y:yc+4,fill:col,'font-size':10.5,'font-family':'monospace'});
  nt.textContent = name; grp.appendChild(nt);
  var endX = nameX + name.length*6.4 + 8;
  grp.appendChild(svgEl('line',{x1:endX,y1:yc,x2:endX+10,y2:yc,stroke:col,'stroke-width':2}));
  ladderCoils.push({ grp:grp, rect: (sym==='S'||sym==='R')?grp.querySelector('rect'):null,
                     text:nt, g:grp.querySelectorAll('rect,path') });
  return (endX + 10) - x;
}

function coilDisp(r){
  if(r.coilDisplay) return r.coilDisplay;
  return r.coils.map(function(c){
    if(c.t === 'set') return {sym:'S', name:c.k};
    if(c.t === 'reset') return {sym:'R', name:c.k};
    return {sym:'', name:c.k};
  });
}
function coilWidth(cd){ return 10 + 26 + 8 + cd.name.length*6.4 + 8 + 10; }
function rungCols(r){
  var cols = (r.pre ? r.pre.length : 0);
  if(r.parallel){ var m = 0; r.parallel.forEach(function(b){ m = Math.max(m, b.length); }); cols += m; }
  cols += (r.post ? r.post.length : 0);
  return cols;
}

function buildLadder(){
  var svg = $('ladderSvg');
  svg.innerHTML = '';
  ladderContacts = []; ladderCoils = [];

  var railL = 18, contactStart = railL + HW, LEAD = 34;
  var maxCols = 0, maxCoilW = 0;
  RUNGS.forEach(function(r){
    maxCols = Math.max(maxCols, rungCols(r));
    coilDisp(r).forEach(function(cd){ maxCoilW = Math.max(maxCoilW, coilWidth(cd)); });
  });
  var contactEnd = contactStart + maxCols*CW + LEAD;
  var railR = contactEnd + 30 + maxCoilW + 16;
  var width = railR + 20;

  var y = 16, lastGroup = '', railTop = null, railBot = null;

  RUNGS.forEach(function(r){
    if(r.group !== lastGroup){
      lastGroup = r.group;
      var gt = svgEl('text',{x:railL,y:y+4,class:'grp-title'}); gt.textContent = r.group;
      svg.appendChild(gt); y += 22;
    }
    var disp = coilDisp(r);
    var inRows = r.parallel ? r.parallel.length : 1;
    var nCoils = disp.length;
    var totalRows = Math.max(inRows, nCoils);
    var top = y + 22;
    var yc = top + (totalRows-1)*ROWH/2;
    if(railTop === null || top < railTop) railTop = top;
    var botY = top + (totalRows-1)*ROWH;
    if(railBot === null || botY > railBot) railBot = botY;

    var cursor = contactStart;

    (r.pre||[]).forEach(function(el){ contactShape(svg, el, cursor, yc); cursor += CW; });

    if(r.parallel){
      var branchStart = cursor;
      var maxLen = 0;
      r.parallel.forEach(function(br){ maxLen = Math.max(maxLen, br.length); });
      var xMerge = branchStart + maxLen*CW;
      var inStart = top + (totalRows - inRows)*ROWH/2;
      var inLast = inStart + (inRows-1)*ROWH;
      /* bus vertical gauche : relie toutes les branches au rail */
      svg.appendChild(svgEl('line',{x1:railL,y1:inStart,x2:railL,y2:inLast,stroke:'#475569','stroke-width':2}));
      r.parallel.forEach(function(br,j){
        var yb = inStart + j*ROWH, cx = branchStart;
        br.forEach(function(el){ contactShape(svg, el, cx, yb); cx += CW; });
        var endX = branchStart + (br.length - 0.5)*CW;
        svg.appendChild(svgEl('line',{x1:endX,y1:yb,x2:xMerge,y2:yb,stroke:'#475569','stroke-width':2}));
      });
      /* bus vertical droit : jonction des branches */
      svg.appendChild(svgEl('line',{x1:xMerge,y1:inStart,x2:xMerge,y2:inLast,stroke:'#475569','stroke-width':2}));
      svg.appendChild(svgEl('line',{x1:xMerge,y1:yc,x2:xMerge+LEAD-HW,y2:yc,stroke:'#475569','stroke-width':2}));
      cursor = xMerge + LEAD;
    }

    (r.post||[]).forEach(function(el){ contactShape(svg, el, cursor, yc); cursor += CW; });

    /* --- bobines en PARALLELE, alignees a droite --- */
    var blockW = 0;
    disp.forEach(function(cd){ blockW = Math.max(blockW, coilWidth(cd)); });
    var blockX = railR - 16 - blockW;
    /* fil du dernier contact jusqu'au bus de bobines */
    svg.appendChild(svgEl('line',{x1:cursor-HW,y1:yc,x2:blockX,y2:yc,stroke:'#475569','stroke-width':2}));
    var outStart = top + (totalRows - nCoils)*ROWH/2;
    var outLast = outStart + (nCoils-1)*ROWH;
    /* bus vertical : la meme puissance alimente toutes les bobines (parallele) */
    if(nCoils > 1){
      svg.appendChild(svgEl('line',{x1:blockX,y1:Math.min(yc,outStart),x2:blockX,y2:Math.max(yc,outLast),stroke:'#475569','stroke-width':2}));
    }
    disp.forEach(function(cd,i){
      var yi = outStart + i*ROWH;
      var w = coilShape(svg, blockX, yi, cd.sym, cd.name);
      svg.appendChild(svgEl('line',{x1:blockX+w,y1:yi,x2:railR,y2:yi,stroke:'#475569','stroke-width':2}));
    });

    y += (totalRows-1)*ROWH + 42 + 8;
  });

  /* rails d'alimentation gauche et droit */
  svg.insertBefore(svgEl('line',{x1:railL,y1:railTop-10,x2:railL,y2:railBot+10,stroke:'#94a3b8','stroke-width':3}), svg.firstChild);
  svg.appendChild(svgEl('line',{x1:railR,y1:railTop-10,x2:railR,y2:railBot+10,stroke:'#94a3b8','stroke-width':3}));

  var H = y + 8;
  svg.setAttribute('viewBox', '0 0 ' + width + ' ' + H);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
}

function renderLadder(){
  ladderContacts.forEach(function(c){
    var v = elemVal(c.el);
    var col = v ? '#22c55e' : '#64748b';
    c.grp.querySelectorAll('line,rect').forEach(function(n){
      n.setAttribute('stroke', col);
    });
    var t = c.grp.querySelector('text'); if(t) t.setAttribute('fill', v?'#22c55e':'#94a3b8');
  });
  var idx = 0;
  RUNGS.forEach(function(r){
    var nCoils = (r.coilDisplay ? r.coilDisplay.length : r.coils.length);
    for(var i=0;i<nCoils;i++){
      var c = ladderCoils[idx++];
      if(!c) break;
      var col = r._pow ? '#22c55e' : '#64748b';
      c.g.forEach(function(n){ n.setAttribute('stroke', col); });
      if(c.rect) c.rect.setAttribute('fill', r._pow ? '#052e16' : '#0d1526');
      c.text.setAttribute('fill', r._pow ? '#4ade80' : '#64748b');
    }
  });
}

/* =========================================================================
   DIAGNOSTIC
   ========================================================================= */
function buildSelects(){
  function placeholder(sel, txt){
    var o = document.createElement('option'); o.value=''; o.textContent = txt; sel.appendChild(o);
  }
  var ss = $('selStep');
  ss.innerHTML = '';
  placeholder(ss, '— Choisir l\'étape —');
  STEPS.forEach(function(st){
    var o = document.createElement('option');
    o.value = st.n; o.textContent = 'X'+st.n+' — '+st.name;
    ss.appendChild(o);
  });
  var sc = $('selCause'); sc.innerHTML='';
  placeholder(sc, '— Choisir la cause —');
  CAUSES.forEach(function(c){
    var o = document.createElement('option'); o.value=c.k; o.textContent=c.t; sc.appendChild(o);
  });
  var scomp = $('selComp'); scomp.innerHTML='';
  placeholder(scomp, '— Choisir le composant —');
  CYL_DEF.forEach(function(c){
    var o = document.createElement('option'); o.value='cyl:'+c.id; o.textContent='Vérin '+c.id+' ('+c.name+')'; scomp.appendChild(o);
  });
  CYL_DEF.forEach(function(c){
    ['0','1'].forEach(function(side){
      var sw = c.id+side;
      var o = document.createElement('option'); o.value='sw:'+sw; o.textContent='Capteur '+sw; scomp.appendChild(o);
    });
  });
  CYL_DEF.forEach(function(c){
    ['0','1'].forEach(function(side){
      var sw = c.id+side;
      var o = document.createElement('option'); o.value='plc:'+sw; o.textContent='Entrée PLC '+SW_ADDR[sw]+' (capteur '+sw+')'; scomp.appendChild(o);
    });
  });
  var og = document.createElement('option'); og.value='poids'; og.textContent='Capteur de poids'; scomp.appendChild(og);
}

function resetSelects(){
  $('selStep').value = '';
  $('selCause').value = '';
  $('selComp').value = '';
}

function correctComponent(){
  if(!fault) return '';
  if(fault.type === 'actuator' || fault.type === 'mechanical') return 'cyl:'+fault.cyl;
  if(fault.type === 'sensor') return 'sw:'+fault.sw;
  if(fault.type === 'plc_input') return 'plc:'+fault.sw;
  if(fault.type === 'grip') return 'cyl:D';
  if(fault.type === 'weight_sensor') return 'poids';
  return '';
}
function componentFamily(v){ return (v||'').split(':')[0]; }

function submitDiagnosis(){
  if(gameMode === 'demo' || !fault){
    $('result').innerHTML = '<div class="verdict ko" style="background:#0c4a6e;border-color:#38bdf8;color:#bae6fd;">'+
      'Mode découverte : il n\'y a pas de panne à diagnostiquer. Clique <b>Panne aléatoire</b> ou <b>Test : 10 pannes</b>.</div>';
    return false;
  }
  var step = parseInt($('selStep').value, 10);
  var cause = $('selCause').value;
  var comp = $('selComp').value;

  var sStep = (step === fault.step) ? 40 : 0;
  var sCause = (cause === fault.type) ? 40 : 0;
  var sComp = (comp === correctComponent()) ? 20 : (componentFamily(comp) === componentFamily(correctComponent()) ? 10 : 0);
  var total = sStep + sCause + sComp;

  /* --- TEST : on enregistre sans montrer la correction --- */
  if(gameMode === 'test'){
    testResults.push({ step:fault.step, cause:fault.type, comp:correctComponent(), total:total });
    testTotal += total;
    if(testIndex >= testMax - 1){ finishTest(); return false; }
    $('result').innerHTML = '<div class="verdict '+(total>=80?'ok':'ko')+'" style="font-size:.95rem;">'+
      'Réponse enregistrée pour la panne '+(testIndex+1)+'. Clique <b>Panne suivante</b> pour continuer.</div>';
    $('btnSubmit').disabled = true; $('btnSubmit').style.opacity = '.5';
    $('btnNextFault').style.display = 'inline-block';
    updateTestBanner();
    return false;
  }

  /* --- DIAGNOSTIC SIMPLE : correction detaillee + Moodle --- */
  var html = '<div class="verdict '+(total>=80?'ok':'ko')+'">';
  html += '<div style="font-size:1.8rem;font-weight:800;color:'+(total>=80?'#4ade80':'#fca5a5')+'">'+total+' / 100</div>';
  html += '<div style="margin:8px 0;">';
  html += badge(sStep===40, sStep)+' Étape bloquée : <b>X'+fault.step+' — '+STEPS[fault.step].name+'</b><br>';
  html += badge(sCause===40, sCause)+' Cause : <b>'+causeText(fault.type)+'</b><br>';
  html += badge(sComp===20, sComp)+' Composant : <b>'+compText(correctComponent())+'</b>';
  html += '</div>';
  html += '<div style="margin-top:8px;color:#cbd5e1;"><b>Indice :</b> '+CAUSE_CLUE[fault.type]+'</div>';
  html += '<div style="margin-top:6px;color:#94a3b8;font-size:.85rem;">Clique <b>Panne aléatoire</b> pour t\'entraîner sur un autre scénario.</div>';
  html += '</div>';
  $('result').innerHTML = html;

  var ok = scormReport(total, 100, 'completed');
  $('lmsNote').innerHTML = ok
    ? '<span style="color:#4ade80;">Score transmis à Moodle ('+total+'/100)</span>'
    : '<span style="color:#94a3b8;">Aperçu local : score calculé, non transmis (pas de LMS)</span>';
  return false;
}
function badge(ok, pts){
  return '<span class="badge '+(ok?'ok':'ko')+'">'+(ok?'OK '+pts:'0')+'</span>';
}
function causeText(k){
  var c = CAUSES.filter(function(x){return x.k===k;})[0];
  return c ? c.t : k;
}
function compText(v){
  var map = {};
  CYL_DEF.forEach(function(c){
    map['cyl:'+c.id] = 'Vérin '+c.id+' ('+c.name+')';
    ['0','1'].forEach(function(s){
      var sw=c.id+s;
      map['sw:'+sw]='Capteur '+sw;
      map['plc:'+sw]='Entrée PLC '+SW_ADDR[sw]+' (capteur '+sw+')';
    });
  });
  map['poids']='Capteur de poids';
  return map[v] || v;
}

/* =========================================================================
   PANNES
   ========================================================================= */
function makeFault(){
  var entry = FAULT_POOL[Math.floor(Math.random()*FAULT_POOL.length)];
  var r = Math.random();
  var type;
  if(r < 0.20) type = 'actuator';
  else if(r < 0.40) type = 'sensor';
  else if(r < 0.58) type = 'plc_input';
  else if(r < 0.72) type = 'mechanical';
  else if(r < 0.86) type = 'grip';
  else type = 'weight_sensor';

  if(type === 'grip'){
    return { type:'grip', cyl:'D', side:1, sw:'D1', step:7, armed:false };
  }
  if(type === 'weight_sensor'){
    return { type:'weight_sensor', step:1, armed:false };
  }
  return { type:type, cyl:entry.cyl, side:entry.side, sw:entry.sw, step:entry.step, armed:false };
}

/* =========================================================================
   INIT / RESET
   ========================================================================= */
function newSignals(){
  S = {};
  for(var n=0;n<=12;n++){ S['X'+n] = (n===0); }
  S.M_Marche = false; S.M_Boucle = false; S.M_Maintien = false;
  S.P_PRESENCE = false; S.P_LIBRE = false;
  for(var q=0;q<=12;q++){ S['Q'+q] = false; }
  CYL_DEF.forEach(function(c){ S[c.sw0]=false; S[c.sw1]=false; });
  S.START=false; S.STOP=true; S.MAINT=false; S.RST=false; S.ESTOP=true;
}

function resetMachine(){
  newSignals();
  M = { cyl:{}, weight:0, weightRead:0, beltProgress:0, beltBusy:false, beltDone:false,
        partOnStation:false, partCarried:false, partGrabbed:false, partDropped:false,
        fallT:0, pushPos:0 };
  CYL_DEF.forEach(function(c){ M.cyl[c.id] = { pos:0 }; });
  simNow = performance.now();
  lastFrame = 0; lastScan = 0; lastSlow = 0;
  stepEnter = []; wasActive = [];
  for(var n=0;n<=12;n++){ stepEnter[n]=simNow; wasActive[n]=(n===0); }
  activeStep = 0; lastBlockStep = -1; blockSince = simNow; cycleCount = 0;
  startPulse = stopPulse = rstPulse = false; estop = false; maint = false;
  $('result').innerHTML = '';
  $('lmsNote').innerHTML = '';
  $('btnNextFault').style.display = 'none';
  updateHmiButtons();
}

function updateHmiButtons(){
  $('btnMaint').classList.toggle('on', maint);
  $('btnEstop').classList.toggle('on', estop);
  $('btnDemo').classList.toggle('on', gameMode === 'demo');
  $('btnTest').classList.toggle('on', gameMode === 'test');
}

/* =========================================================================
   MODES : decouverte / panne simple / test 10 pannes
   ========================================================================= */
function showBanner(kind){
  var b = $('diagBanner');
  if(kind === 'demo'){
    b.className = 'banner demo';
    b.innerHTML = '<b>MODE DÉCOUVERTE — sans panne.</b> Clique <b>Start</b> : la machine fait <b>un cycle complet</b> '+
      'puis s\'arrête à X0 (voyant bleu). Pour l\'enchaîner en continu, clique <b>Maintien</b> avant (ou pendant) le cycle. '+
      'Observe le Grafcet, le Ladder et les témoins d\'E/S, puis passe à <b>Panne aléatoire</b> ou <b>Test : 10 pannes</b>.';
  } else if(kind === 'diag'){
    b.className = 'banner diag';
    b.innerHTML = '<b>MODE DIAGNOSTIC — 1 panne cachée.</b> Démarre le cycle : il va se bloquer. '+
      'Repère l\'étape, la cause et le composant, puis réponds aux 3 questions.';
  }
}

function setDiagEnabled(on){
  ['selStep','selCause','selComp'].forEach(function(id){ $(id).disabled = !on; });
  var b = $('btnSubmit');
  b.disabled = !on;
  b.style.opacity = on ? '1' : '.5';
}

function setMode(mode){
  gameMode = mode;
  if(mode === 'test'){ startTest(); return; }
  resetMachine();
  resetSelects();
  $('btnSubmit').style.display = '';
  $('btnNextFault').style.display = 'none';
  if(mode === 'demo'){
    fault = null;
    showBanner('demo');
    setDiagEnabled(false);
  } else {
    fault = makeFault();
    showBanner('diag');
    setDiagEnabled(true);
  }
  updateHmiButtons();
}

function startTest(){
  gameMode = 'test';
  testIndex = 0; testTotal = 0; testResults = [];
  resetMachine();
  resetSelects();
  fault = makeFault();
  $('btnSubmit').style.display = '';
  setDiagEnabled(true);
  updateTestBanner();
  updateHmiButtons();
}

function updateTestBanner(){
  var b = $('diagBanner');
  b.className = 'banner test';
  var parfaits = testResults.filter(function(r){ return r.total === 100; }).length;
  b.innerHTML = '<b>TEST — panne '+(testIndex+1)+' / '+testMax+'.</b> '+
    'Score en cours : <b>'+testTotal+'</b> pts &middot; '+parfaits+' diagnostic(s) parfait(s). '+
    'Les réponses ne sont pas montrées pendant le test.';
}

function loadTestFault(){
  resetMachine();
  resetSelects();
  fault = makeFault();
  updateTestBanner();
}

function nextTestFault(){
  testIndex++;
  if(testIndex >= testMax){ finishTest(); return; }
  loadTestFault();
  $('btnSubmit').disabled = false;
  $('btnSubmit').style.opacity = '1';
  $('btnNextFault').style.display = 'none';
}

function finishTest(){
  var note = Math.round(testTotal / testMax); // 0..100
  var parfaits = testResults.filter(function(r){ return r.total === 100; }).length;
  var html = '<div class="verdict '+(note>=50?'ok':'ko')+'">';
  html += '<div style="font-size:1.8rem;font-weight:800;color:'+(note>=50?'#4ade80':'#fca5a5')+'">'+note+' / 100</div>';
  html += '<div style="margin:6px 0;">Test terminé : '+parfaits+' / '+testMax+' pannes parfaitement diagnostiquées.</div>';
  html += '<table class="test-recap"><thead><tr><th>#</th><th>Étape</th><th>Cause attendue</th><th>Composant</th><th>Pts</th></tr></thead><tbody>';
  testResults.forEach(function(r, i){
    html += '<tr><td>'+(i+1)+'</td><td>X'+r.step+'</td><td>'+causeText(r.cause)+'</td><td>'+compText(r.comp)+'</td><td>'+
      '<span style="color:'+(r.total===100?'#4ade80':'#fca5a5')+'">'+r.total+'</span></td></tr>';
  });
  html += '</tbody></table>';
  html += '<div style="margin-top:8px;color:#cbd5e1;">Note du test : <b>'+note+' / 100</b> (moyenne de '+testMax+' pannes).</div>';
  html += '</div>';
  $('result').innerHTML = html;
  $('diagBanner').className = 'banner test';
  $('diagBanner').innerHTML = '<b>TEST TERMINÉ.</b> Note : <b>'+note+' / 100</b>. Clique à nouveau sur <b>Test : 10 pannes</b> pour recommencer, ou <b>Panne aléatoire</b> pour t\'entraîner.';
  $('btnSubmit').style.display = 'none';
  $('btnNextFault').style.display = 'none';
  setDiagEnabled(false);

  var ok = scormReport(note, 100, 'completed');
  $('lmsNote').innerHTML = ok
    ? '<span style="color:#4ade80;">Note transmise à Moodle ('+note+'/100)</span>'
    : '<span style="color:#94a3b8;">Aperçu local : note calculée, non transmise (pas de LMS)</span>';
}

/* =========================================================================
   BOUCLE
   ========================================================================= */
var lastFrame = 0, lastScan = 0, lastSlow = 0;

function loop(t){
  if(!lastFrame) lastFrame = t;
  var dt = Math.min(0.05, (t - lastFrame)/1000);
  lastFrame = t;

  if(t - lastScan >= 50){ lastScan = t; scan(); }
  physics(dt);
  renderMachine();

  if(t - lastSlow >= 120){
    lastSlow = t;
    renderGrafcet();
    renderLadder();
    renderIO();
    renderHmi();
  }
  requestAnimationFrame(loop);
}

function renderHmi(){
  $('lampPret').classList.toggle('on', !!S.Q9);
  $('lampMarche').classList.toggle('on', !!S.Q10);
  $('lampLast').classList.toggle('on', !!S.Q11);
  $('lampEstop').classList.toggle('on', !!S.Q12);
  $('cntCycles').textContent = cycleCount;
  $('curStep').textContent = 'X'+activeStep;
  $('curWeight').textContent = Math.round(M.weightRead)+' g';
}

/* =========================================================================
   BOUTONS
   ========================================================================= */
function bindHmi(){
  $('btnStart').addEventListener('click', function(){ startPulse = true; });
  $('btnMaint').addEventListener('click', function(){ maint = !maint; updateHmiButtons(); });
  $('btnStop').addEventListener('click',  function(){ stopPulse = true; });
  $('btnReset').addEventListener('click', function(){ rstPulse = true; estop = false; updateHmiButtons(); });
  $('btnEstop').addEventListener('click', function(){ estop = !estop; updateHmiButtons(); });
  $('btnDemo').addEventListener('click', function(){ setMode('demo'); });
  $('btnNewFault').addEventListener('click', function(){ setMode('diag'); });
  $('btnTest').addEventListener('click', function(){ setMode('test'); });
  $('btnSubmit').addEventListener('click', function(){ submitDiagnosis(); });
  $('btnNextFault').addEventListener('click', function(){ nextTestFault(); });
}

/* =========================================================================
   DEMARRAGE
   ========================================================================= */
function init(){
  buildRungs();
  buildMachine();
  buildIO();
  buildGrafcet();
  buildLadder();
  buildSelects();
  bindHmi();
  setMode('demo');
  requestAnimationFrame(loop);
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else { init(); }

/* Hook de test / enseignant : pilotage programmatique (non utilise par l'UI) */
window.__SIM = {
  reset: resetMachine,
  setMode: setMode,
  submit: submitDiagnosis,
  forceFault: function(f){ fault = f; if(fault) fault.armed = false; },
  press: function(k){
    if(k==='start') startPulse = true;
    else if(k==='stop') stopPulse = true;
    else if(k==='reset'){ rstPulse = true; estop = false; }
    else if(k==='estop') estop = !estop;
    else if(k==='maint') maint = !maint;
    updateHmiButtons();
  },
  /* avance deterministe : n scans de dtms millisecondes */
  step: function(dtms, n){
    n = n || 1;
    for(var i=0;i<n;i++){
      simNow += dtms;
      scan(simNow);
      physics(dtms/1000);
    }
    renderMachine(); renderGrafcet(); renderLadder(); renderIO(); renderHmi();
  },
  /* avance facon temps reel : scan toutes les 50 ms puis physique a chaque frame */
  realStep: function(dtms, n){
    n = n || 1;
    for(var i=0;i<n;i++){
      simNow += dtms;
      if(simNow - lastScan >= 50){ lastScan = simNow; scan(simNow); }
      physics(dtms/1000);
    }
    renderMachine(); renderGrafcet(); renderLadder(); renderIO(); renderHmi();
  },
  /* avance sans rendu (tests rapides) */
  advance: function(dtms, n){
    n = n || 1;
    for(var i=0;i<n;i++){
      simNow += dtms;
      if(simNow - lastScan >= 50){ lastScan = simNow; scan(simNow); }
      physics(dtms/1000);
    }
  },
  render: function(){ renderMachine(); renderGrafcet(); renderLadder(); renderIO(); renderHmi(); },
  get: function(){
    return { fault:fault, activeStep:activeStep, cycleCount:cycleCount,
             signals:S, machine:M, mode:gameMode, testTotal:testTotal, testIndex:testIndex };
  }
};

})();
