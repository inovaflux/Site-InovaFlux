/* =========================================================================
   schematic.js - Schema SVG interactif de l'alimentation (Module 11)
   Les couleurs sont ecrites en ATTRIBUTS directs (fill/stroke) pour que le
   fichier soit lisible/editable dans Inkscape ; les classes restent
   presentes pour les effets de l'exercice (survol, panne, sondes).
   Expose : window.SCHEMATIC_SVG, window.SCHEMATIC_PINS, window.loadSchematic
   ========================================================================= */
(function (global) {
'use strict';

var C = {
  wire:'#7dd3fc', junc:'#7dd3fc', rail:'#64748b', lbl:'#93c5fd', node:'#facc15',
  body:'#1e293b', bodyStroke:'#94a3b8', ref:'#e2e8f0', val:'#93c5fd', pintxt:'#cbd5e1',
  padStroke:'#facc15', padFill:'#0f172a', pn:'#fde68a', orange:'#f97316', bg:'#0b1120'
};

var parts = [];
function add(s){ parts.push(s); }
function wire(x1,y1,x2,y2){ add('<line class="wire" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+C.wire+'" stroke-width="2" fill="none"/>'); }
function bus(pts){ var d='M'+pts.map(function(p){return p[0]+' '+p[1];}).join(' L'); add('<path class="wire" d="'+d+'" fill="none" stroke="'+C.wire+'" stroke-width="2"/>'); }
function junc(x,y){ add('<circle class="junc" cx="'+x+'" cy="'+y+'" r="2.6" fill="'+C.junc+'"/>'); }
function label(x,y,t,cls,anchor){
  var fill=C.lbl, fs=11, fam='sans-serif', fw='600';
  if(cls==='lbl rail'){ fill=C.rail; }
  if(cls==='lbl node'){ fill=C.node; fam='monospace'; fw='700'; }
  add('<text class="'+(cls||'lbl')+'" x="'+x+'" y="'+y+'"'+(anchor?' text-anchor="'+anchor+'"':'')+
      ' fill="'+fill+'" font-size="'+fs+'" font-family="'+fam+'" font-weight="'+fw+'">'+t+'</text>');
}

var PINS = {};
function pad(comp,pinName,node,x,y,dx,dy){
  if(!PINS[comp]) PINS[comp]=[];
  PINS[comp].push({ pin:pinName, node:node });
  var ov = global.PIN_POS && global.PIN_POS[comp+'.'+pinName];
  if(ov && ov.length===2){ x=ov[0]; y=ov[1]; }
  add('<g class="tp pad" data-comp="'+comp+'" data-pin="'+pinName+'" data-node="'+node+'" transform="translate('+x+','+y+')">'+
      '<circle class="p" r="4.6" fill="'+C.padFill+'" stroke="'+C.padStroke+'" stroke-width="2"/>'+
      '<text class="pn" x="'+(dx||0)+'" y="'+(dy||0)+'" fill="'+C.pn+'" font-size="8" font-family="monospace" font-weight="600" text-anchor="middle">'+node+'</text>'+
      '<title>'+comp+' broche '+pinName+' : '+node+' (cliquer pour y placer une sonde)</title></g>');
}

function bodyRect(x,y,w,h,rx,id){
  return '<rect class="body" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(rx||4)+'" fill="'+C.body+'" stroke="'+C.bodyStroke+'" stroke-width="1.5"/>'+
         '<rect class="hot" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(rx||4)+'" fill="none" stroke="none"/>';
}
function twoV(id,cx,cy,labelText,val,ntop,nbot){
  var w=54,h=40;
  add('<g class="comp" data-comp="'+id+'">'+bodyRect(cx-w/2,cy-h/2,w,h,4)+
      '<text class="ref" x="'+cx+'" y="'+(cy-2)+'" fill="'+C.ref+'" font-size="12" font-family="sans-serif" font-weight="700" text-anchor="middle">'+labelText+'</text>'+
      '<text class="val" x="'+cx+'" y="'+(cy+12)+'" fill="'+C.val+'" font-size="10" font-family="monospace" text-anchor="middle">'+val+'</text></g>');
  wire(cx,cy-h/2,cx,cy-34); wire(cx,cy+h/2,cx,cy+34);
  pad(id,'1',ntop,cx,cy-34,-6,-7);
  pad(id,'2',nbot,cx,cy+34,-6,14);
}
function twoH(id,cx,cy,labelText,val,nleft,nright){
  var w=54,h=40;
  add('<g class="comp" data-comp="'+id+'">'+bodyRect(cx-w/2,cy-h/2,w,h,4)+
      '<text class="ref" x="'+cx+'" y="'+(cy-2)+'" fill="'+C.ref+'" font-size="12" font-family="sans-serif" font-weight="700" text-anchor="middle">'+labelText+'</text>'+
      '<text class="val" x="'+cx+'" y="'+(cy+12)+'" fill="'+C.val+'" font-size="10" font-family="monospace" text-anchor="middle">'+val+'</text></g>');
  wire(cx-w/2,cy,cx-34,cy); wire(cx+w/2,cy,cx+34,cy);
  pad(id,'1',nleft,cx-34-12,cy+3);
  pad(id,'2',nright,cx+34+12,cy+3);
}
function bjt(id,cx,cy,labelText,val,pnp,nb,nc,ne){
  add('<g class="comp" data-comp="'+id+'">'+
      '<circle class="body" cx="'+cx+'" cy="'+cy+'" r="25" fill="'+C.body+'" stroke="'+C.bodyStroke+'" stroke-width="1.5"/>'+
      '<text class="ref" x="'+(cx+31)+'" y="'+(cy-14)+'" fill="'+C.ref+'" font-size="12" font-family="sans-serif" font-weight="700">'+labelText+'</text>'+
      '<text class="val" x="'+(cx+31)+'" y="'+(cy)+'" fill="'+C.val+'" font-size="10" font-family="monospace">'+val+'</text>'+
      '<text class="pintxt" x="'+(cx-4)+'" y="'+(cy-30)+'" fill="'+C.pintxt+'" font-size="10" font-family="monospace" font-weight="700">C</text>'+
      '<text class="pintxt" x="'+(cx-4)+'" y="'+(cy+38)+'" fill="'+C.pintxt+'" font-size="10" font-family="monospace" font-weight="700">E</text>'+
      '<text class="pintxt" x="'+(cx-40)+'" y="'+(cy-4)+'" fill="'+C.pintxt+'" font-size="10" font-family="monospace" font-weight="700">B</text>'+
      '<circle class="hot" cx="'+cx+'" cy="'+cy+'" r="25" fill="none" stroke="none"/></g>');
  wire(cx-25,cy,cx-44,cy);
  wire(cx,cy-25,cx,cy-44);
  wire(cx,cy+25,cx,cy+44);
  pad(id,'B',nb,cx-44-14,cy+3);
  pad(id,'C',nc,cx,cy-44-9);
  pad(id,'E',ne,cx,cy+44+15);
}
function opamp(){
  var x=770,y=520;
  add('<g class="comp" data-comp="IC1">'+
      '<polygon class="body" points="'+x+','+(y-45)+' '+(x+95)+','+y+' '+x+','+(y+45)+'" fill="'+C.body+'" stroke="'+C.bodyStroke+'" stroke-width="1.5"/>'+
      '<text class="ref" x="'+(x+20)+'" y="'+(y-8)+'" fill="'+C.ref+'" font-size="12" font-family="sans-serif" font-weight="700">IC1</text>'+
      '<text class="val" x="'+(x+16)+'" y="'+(y+10)+'" fill="'+C.val+'" font-size="10" font-family="monospace">LM358</text>'+
      '<rect class="hot" x="'+x+'" y="'+(y-45)+'" width="95" height="90" fill="none" stroke="none"/></g>');
  pad('IC1','+ (fb)','fb',x-30,y-22,-6,-8);
  pad('IC1','- (oap)','oap',x-30,y+22,-6,18);
  pad('IC1','out','oaout',x+95+30,y,0,-8);
  wire(x-30,y-22,x,y-22);
  wire(x-30,y+22,x,y+22);
  wire(x+95,y,x+95+30,y);
}

/* ================= Repere ================= */
add('<rect x="0" y="0" width="1260" height="800" fill="'+C.bg+'"/>');
wire(120,60,1220,60);      label(130,50,'RAIL NON REGULE (RAW)','lbl rail');
wire(120,745,1220,745);    label(130,765,'MASSE (GND)','lbl rail');

/* ---- Entree : transfo + pont ---- */
add('<g class="comp" data-comp="D1">'+
    '<rect class="body" x="170" y="360" width="80" height="130" rx="6" fill="'+C.body+'" stroke="'+C.bodyStroke+'" stroke-width="1.5"/>'+
    '<text class="ref" x="210" y="410" fill="'+C.ref+'" font-size="12" font-family="sans-serif" font-weight="700" text-anchor="middle">T1</text>'+
    '<text class="val" x="210" y="426" fill="'+C.val+'" font-size="10" font-family="monospace" text-anchor="middle">120V/16V</text>'+
    '<text class="ref" x="210" y="452" fill="'+C.ref+'" font-size="12" font-family="sans-serif" font-weight="700" text-anchor="middle">D1</text>'+
    '<text class="val" x="210" y="468" fill="'+C.val+'" font-size="10" font-family="monospace" text-anchor="middle">1N4007</text>'+
    '<rect class="hot" x="170" y="360" width="80" height="130" rx="6" fill="none" stroke="none"/>'+
    '<title>Transformateur T1 et pont redresseur D1</title></g>');
bus([[250,400],[300,400]]);
bus([[300,400],[300,60]]); junc(300,60);
bus([[300,400],[300,745]]); junc(300,745);
pad('D1','+','raw0',300,140,-6,-7);
pad('D1','-','gnd',300,690,-6,15);

/* ---- Fusible F1 ---- */
twoH('F1',430,60,'F1','1 A','raw1','raw');

/* ---- Filtrage C1 / C2 ---- */
twoV('C1',380,200,'C1','1000uF','raw','gnd');
twoV('C2',450,200,'C2','0.1uF','raw','gnd');
bus([[380,124],[380,60]]); junc(380,60);
bus([[450,124],[450,60]]); junc(450,60);
bus([[380,276],[380,745]]); junc(380,745);
bus([[450,276],[450,745]]); junc(450,745);

/* ---- Temoin D2 + R1 ---- */
twoV('R1',330,380,'R1','3.3k','raw','d2a');
twoV('D2',330,500,'D2','LED','d2a','gnd');
bus([[330,304],[330,60]]); junc(330,60);
bus([[330,456],[330,500]]);
bus([[330,576],[330,745]]); junc(330,745);

/* ---- Reference 16 V ---- */
twoV('R2',560,190,'R2','2.2k','rawQ1','ref');
twoV('D3',560,470,'D3','zener 16V','ref','gnd');
twoV('C3',640,330,'C3','100uF','ref','gnd');
bus([[560,114],[560,60]]); junc(560,60);
bus([[560,266],[560,396]]); junc(560,330);
bus([[560,544],[560,745]]); junc(560,745);
bus([[560,330],[640,330]]); junc(640,330);
bus([[640,254],[640,60]]); junc(640,60);
bus([[640,406],[640,745]]); junc(640,745);
label(575,330,'ref','lbl node');

/* ---- Ampli d'erreur ---- */
twoV('R4',700,190,'R4','10k','refA','oap');
twoV('R5',700,470,'R5','10k','oap','gnd');
bus([[700,264],[700,396]]); junc(700,330);
bus([[700,544],[700,745]]); junc(700,745);
bus([[560,330],[700,330]]); junc(700,330);
label(714,330,'oap','lbl node');
opamp();
twoV('C4',905,660,'C4','1nF','oaout','fb');
twoV('R10',1060,190,'R10','10k','vout','fb');
twoV('R11',1060,470,'R11','10k','fb','gnd');
bus([[1060,264],[1060,396]]); junc(1060,330);
bus([[1060,544],[1060,745]]); junc(1060,745);
label(1074,330,'fb','lbl node');
twoH('R6',1000,430,'R6','1k','oaout','q2b');
bus([[865,520],[934,520],[934,430]]); junc(934,430);

/* ---- Etage de puissance ---- */
bjt('Q1',830,165,'Q1','TIP41C',false,'q1b','rawQ1','q1e');
twoV('R8',830,300,'R8','1 ohm','q1e','vout');
bus([[830,209],[830,266]]);
bus([[830,334],[830,400]]); junc(830,400);
label(846,400,'vout','lbl node');
twoH('R7',690,120,'R7','100','rawQ1','q1b');
twoV('R13',740,270,'R13','1k','q1b','q1e');
bus([[830,165],[900,165]]);
bus([[900,165],[900,120]]);
bus([[900,165],[900,220],[766,220]]); junc(900,165);
bus([[830,209],[766,209]]); junc(766,220);
bus([[830,300],[740,300]]); junc(740,304);
bus([[830,334],[830,300]]);
bjt('Q2',1010,540,'Q2','2N3904',false,'q2b','q1b','gnd');
bus([[1034,430],[1034,540]]); junc(1034,430);
bus([[966,540],[900,540],[900,165]]); junc(900,165);
bus([[1010,609],[1010,745]]); junc(1010,745);
bjt('Q3',900,430,'Q3','2N3906',true,'vout','q2b','q1e');
bus([[856,430],[830,430],[830,400]]); junc(830,400);
bus([[900,385],[900,304],[830,304]]); junc(830,300);
bus([[900,475],[900,510],[1034,510],[1034,430]]); junc(1034,430);
twoV('R9',1150,540,'R9','1k','q2b','gnd');
bus([[1034,540],[1150,540]]); junc(1034,540);
bus([[1150,614],[1150,745]]); junc(1150,745);
bjt('Q4',1000,670,'Q4','2N3904',false,'q4b','q4c','vout');
twoV('R3',880,640,'R3','470k','q4b','vout');
twoH('R12',1120,670,'R12','1k','q4c','q1b');
bus([[880,640],[880,595],[966,595]]); junc(966,640);
bus([[880,674],[880,745]]); junc(880,745);
bus([[956,670],[1066,670]]); junc(956,670);
bus([[1000,625],[1000,400]]); junc(1000,745);
twoV('C5',640,600,'C5','47uF','vout','gnd');
bus([[640,534],[640,470],[830,470],[830,400]]); junc(830,400);
bus([[640,666],[640,745]]); junc(640,745);

/* ---- Borne de sortie ---- */
add('<g class="comp" data-comp="PT_OUT">'+
    '<circle class="body" cx="1210" cy="400" r="9" fill="'+C.body+'" stroke="'+C.bodyStroke+'" stroke-width="1.5"/>'+
    '<text class="val" x="1210" y="426" fill="'+C.val+'" font-size="10" font-family="monospace" text-anchor="middle">sortie</text>'+
    '<circle class="hot" cx="1210" cy="400" r="9" fill="none" stroke="none"/></g>');
bus([[830,400],[1210,400]]); junc(830,400);
pad('PT_OUT','+','outT',1210,400,0,-14);

/* ---- Pistes (marqueurs) ---- */
add('<g class="comp" data-comp="PT_RAW"><rect x="575" y="48" width="12" height="12" fill="'+C.orange+'"/><title>Piste PT_RAW</title></g>');
add('<g class="comp" data-comp="PT_REF"><rect x="672" y="324" width="12" height="12" fill="'+C.orange+'"/><title>Piste PT_REF</title></g>');

global.SCHEMATIC_SVG = '<svg id="schemaSvg" viewBox="0 0 1260 800" xmlns="http://www.w3.org/2000/svg">'+parts.join('')+'</svg>';
global.SCHEMATIC_PINS = PINS;

global.loadSchematic = function(cb){
  var fallback = function(){ cb(global.SCHEMATIC_SVG); };
  try{
    if(typeof fetch!=='function') return fallback();
    fetch('schematic.svg',{cache:'no-cache'}).then(function(r){
      if(!r.ok) throw 0;
      return r.text();
    }).then(function(t){
      if(t && t.indexOf('<svg')>=0) global.SCHEMATIC_SVG = t;
      cb(global.SCHEMATIC_SVG);
    }).catch(fallback);
  }catch(e){ fallback(); }
};

})(typeof window !== 'undefined' ? window : globalThis);
