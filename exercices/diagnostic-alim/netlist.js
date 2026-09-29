/* =========================================================================
   netlist.js - Alimentation lineaire (Module 11) - schema de l'utilisateur
   Topologie fidele au schema Module_11_alim.svg :
     T1/D1 -> C1 -+-> Q1 (TIP41C) -> R8 (1R) -> Vout
                  |-> R2/R3 -> D3 (16V) / C3  reference
                  |-> R4 (POT) -> R5 -> R6 -> C4 -> AOP+ (LM358)
        AOP- = Vout (retroaction directe) ; AOP sortie -> R7 -> Q2 -> base Q1
        Q2 = emetteur-suiveur (collecteur RAW) ; D4 protection CE
        Q3 (PNP) limite le courant (shunt R8) ; Q4 replie la limite.
   Vout = POT_K * 16 V (reglage du potentiometre R4).
   ========================================================================= */
(function (global) {
'use strict';

var VT = 0.025852, IS = 1e-14, BF = 200, BR = 4, EXP_MAX = 50, VCC = 21.2;
var POT_K = 0.75;                 // reglage R4 : 0..1  -> Vout = POT_K*16
var VOUT_NOM = POT_K * 16;        // = 12 V

var COMPONENTS = [
  { id:'T1',  type:'xfmr', virtual:true, label:'T1', value:'120 V / 16 V ~' },
  { id:'D1',  type:'vs',  p:'raw0', n:'gnd', v:VCC, virtual:true, label:'Pont D1', value:'21 V continu' },
  { id:'RTH', type:'r',   a:'raw0', b:'raw1', r:1.5, virtual:true, label:'Impedance T1', value:'1.5 ohm' },
  { id:'F1',  type:'fuse',a:'raw1', b:'rA',  r:0.05, label:'F1', value:'Fusible 1 A' },
  /* rail non regule segmente : pistes entre R2, R3, R1, C1, C2, etage de puissance */
  { id:'T_A', type:'trace',a:'rA', b:'rB', r:0.001, virtual:true, label:'Piste rail : pont -> R2', value:'-' },
  { id:'T_B', type:'trace',a:'rB', b:'rC', r:0.001, virtual:true, label:'Piste rail : R2 -> R3', value:'-' },
  { id:'T_C', type:'trace',a:'rC', b:'rD', r:0.001, virtual:true, label:'Piste rail : R3 -> R1', value:'-' },
  { id:'T_D', type:'trace',a:'rD', b:'rE', r:0.001, virtual:true, label:'Piste rail : R1 -> C1', value:'-' },
  { id:'T_E', type:'trace',a:'rE', b:'rF', r:0.001, virtual:true, label:'Piste rail : C1 -> C2', value:'-' },
  { id:'T_F', type:'trace',a:'rF', b:'rG', r:0.001, virtual:true, label:'Piste rail : C2 -> etage puissance', value:'-' },

  { id:'C1',  type:'cap', a:'rE', b:'gnd', cap:1000e-6, label:'C1', value:'1000 uF / 35 V' },
  { id:'C2',  type:'cap', a:'rF', b:'gnd', cap:0.1e-6,  label:'C2', value:'0.1 uF' },

  { id:'R1',  type:'r',   a:'rD', b:'d2a', r:3300, label:'R1', value:'3.3 kohm' },
  { id:'D2',  type:'led', a:'d2a', b:'gnd',         label:'D2', value:'LED indication' },

  { id:'R2',  type:'r',   a:'rB', b:'refA', r:2200, label:'R2', value:'2.2 kohm (reference)' },
  { id:'R3',  type:'r',   a:'rC', b:'vccR3', r:470, label:'R3', value:'470 ohm (alim LM358)' },
  { id:'P_VCC',type:'trace',a:'vccR3',b:'vccIC', r:0.001, virtual:true, label:'Piste : R3 -> LM358 (Vcc)', value:'-' },
  /* reseau de reference segmente : R2 -> D3 -> C3 -> R4 */
  { id:'T_ref1', type:'trace',a:'refA',b:'refB', r:0.001, virtual:true, label:'Piste ref : R2 -> D3', value:'-' },
  { id:'T_ref2', type:'trace',a:'refB',b:'refC', r:0.001, virtual:true, label:'Piste ref : D3 -> C3', value:'-' },
  { id:'T_ref3', type:'trace',a:'refC',b:'refD', r:0.001, virtual:true, label:'Piste ref : C3 -> R4', value:'-' },
  { id:'D3',  type:'zener',a:'gnd',b:'refB', vz:16,  label:'D3', value:'Zener 16 V' },
  { id:'C3',  type:'cap', a:'refC', b:'gnd', cap:100e-6, label:'C3', value:'100 uF / 35 V' },

  /* potentiometre R4 : R4 (haut) + R4b (bas), curseur = oap */
  { id:'R4',  type:'r',   a:'refD', b:'oap', r:(1-POT_K)*10000, label:'R4', value:'POT 10 kohm' },
  { id:'R4b', type:'r',   a:'oap', b:'gnd', r:POT_K*10000, virtual:true, label:'R4 (bas)', value:'POT bas' },
  { id:'R5',  type:'r',   a:'oap', b:'n1', r:10000, label:'R5', value:'10 kohm' },
  { id:'R6',  type:'r',   a:'n1',  b:'oap2', r:1000, label:'R6', value:'1 kohm' },
  { id:'C4',  type:'cap', a:'oap2',b:'gnd', cap:1e-6, label:'C4', value:'1 uF / 35 V' },
  { id:'IC1', type:'opamp', out:'oaout', pp:'oap2', pn:'vA', vcc:'vccIC', gnd:'gnd', label:'IC1', value:'LM358' },

  { id:'R7',  type:'r',   a:'oaout', b:'q2b', r:100,  label:'R7', value:'100 ohm' },
  { id:'Q2',  type:'npn', b:'q2b', c:'rG', e:'q1b',  label:'Q2', value:'2N3904' },
  { id:'R9',  type:'r',   a:'vB', b:'q3b', r:1000,  label:'R9', value:'1 kohm' },

  { id:'Q1',  type:'npn', b:'q1b', c:'rG', e:'q1e',  label:'Q1', value:'TIP41C' },
  { id:'D4',  type:'d',   a:'q1e', b:'rG',           label:'D4', value:'1N4007 (protection)' },
  { id:'P_Q1E',type:'trace',a:'q1e', b:'q1eR', r:0.001, virtual:true, label:'Piste : Q1e -> R8 (gauche)', value:'-' },
  { id:'R8',  type:'r',   a:'q1eR', b:'vA', r:1,     label:'R8', value:'1 ohm (shunt)' },
  /* rail de sortie segmente : R8 -> R9 -> C5 -> R12 -> borne (chaîne) */
  { id:'T_VA', type:'trace',a:'vA', b:'vB', r:0.001, virtual:true, label:'Piste sortie : R8 -> R9', value:'-' },
  { id:'T_VB', type:'trace',a:'vB', b:'vC', r:0.001, virtual:true, label:'Piste sortie : R9 -> C5', value:'-' },
  { id:'T_VC', type:'trace',a:'vC', b:'vD', r:0.001, virtual:true, label:'Piste sortie : C5 -> R12', value:'-' },

  { id:'Q3',  type:'pnp', b:'q3b', c:'q3c', e:'q1e',  label:'Q3', value:'2N3906' },
  { id:'R10', type:'r',   a:'q3c', b:'q4b', r:10000,  label:'R10', value:'10 kohm' },
  { id:'R11', type:'r',   a:'q4b', b:'gnd', r:10000,  label:'R11', value:'10 kohm' },
  { id:'Q4',  type:'npn', b:'q4b', c:'q4c', e:'gnd',  label:'Q4', value:'2N3904' },
  { id:'FW2', type:'trace',a:'n1', b:'q4c', r:0.001, virtual:true, label:'Liaison R5/R6 - Q4c', value:'-' },

  { id:'C5',  type:'cap', a:'vC',b:'gnd', cap:47e-6,label:'C5', value:'47 uF / 50 V' },
  { id:'R12', type:'r',   a:'vD',b:'gnd', r:1000,   label:'R12', value:'1 kohm' },
  { id:'PT_OUT', type:'trace', a:'vD', b:'outT', r:0.001, virtual:true, label:'Piste sortie : R12 -> borne', value:'-' }
];

/* ------------------------------------------------------------------ */
/*  Noeuds                                                            */
/* ------------------------------------------------------------------ */
function collectNodes(){
  var set={gnd:true}, order=['gnd'];
  function add(n){ if(typeof n==='string'&&n&&!set[n]){ set[n]=true; order.push(n); } }
  COMPONENTS.forEach(function(c){ ['p','n','a','b','c','e','out','pp','pn','vcc','gnd'].forEach(function(k){ add(c[k]); }); });
  return order;
}
var NODES=collectNodes();
var NIDX={}; NODES.forEach(function(n,i){ NIDX[n]=i; });
function vidx(n){ return n==='gnd'?-1:NIDX[n]-1; }
function vval(V,n){ return n==='gnd'?0:(V[NIDX[n]]||0); }

function faultFor(faults,id){ if(!faults) return null; for(var i=0;i<faults.length;i++) if(faults[i].id===id) return faults[i]; return null; }
function dev(comp,faults){
  var f=faultFor(faults,comp.id); var d={comp:comp,f:f,kind:'r'};
  if(comp.type==='r'||comp.type==='fuse'||comp.type==='trace'){
    d.r=comp.r;
    if(f&&f.mode==='open') d.open=true;
    else if(f&&f.mode==='short') d.r=1e-3;
    else if(f&&f.mode==='drift') d.r=comp.r*(f.factor||2);
    else if(f&&f.mode==='cold') d.r=(comp.type==='trace')?500:comp.r*300;
    if(d.r<1e-6) d.r=1e-6;
    return d;
  }
  if(comp.type==='cap'){
    d.kind='open';
    if(f&&f.mode==='short'){ d.kind='r'; d.r=1e-3; }
    else if(f&&f.mode==='leak'){ d.kind='r'; d.r=f.r||5000; }
    return d;
  }
  if(comp.type==='d'||comp.type==='led'||comp.type==='zener'){
    d.kind='d'; d.led=(comp.type==='led'); d.zener=(comp.type==='zener'); d.vz=comp.vz||0; d.on=true;
    if(f&&f.mode==='open') d.on=false;
    else if(f&&f.mode==='short'){ d.kind='r'; d.r=0.5; }
    else if(f&&f.mode==='leak') d.leak=f.r||2000;
    return d;
  }
  if(comp.type==='npn'||comp.type==='pnp'){
    d.kind='bjt'; d.pnp=(comp.type==='pnp'); d.be='ok'; d.bc='ok'; d.ce='ok';
    if(f){
      if(f.mode==='bjt'){ d.be=f.be||'ok'; d.bc=f.bc||'ok'; d.ce=f.ce||'ok'; }
      else if(f.mode==='open'){ d.be='open'; d.bc='open'; d.ce='open'; }
      else if(f.mode==='short'){ d.ce='short'; }
    }
    return d;
  }
  if(comp.type==='opamp'){ d.kind='opamp'; return d; }
  if(comp.type==='xfmr'){ d.kind='open'; return d; }
  if(comp.type==='vs'){ d.kind='vs'; d.v=comp.v; if(f&&f.mode==='open') d.v=0; return d; }
  return d;
}

/* ------------------------------------------------------------------ */
/*  Solveur                                                           */
/* ------------------------------------------------------------------ */
function zeros(n){ var a=new Array(n); for(var i=0;i<n;i++) a[i]=0; return a; }
function zeros2(n){ var a=[]; for(var i=0;i<n;i++) a.push(zeros(n)); return a; }
function limitExp(a){ return Math.exp(Math.max(-EXP_MAX,Math.min(EXP_MAX,a))); }
var VCRIT=VT*Math.log(VT/(Math.SQRT2*IS));
function pnjlim(vnew,vold,vt,vcrit){
  if(vnew>vcrit && Math.abs(vnew-vold)>2*vt){
    if(vold>0){ var arg=1+(vnew-vold)/vt; vnew=arg>0?vold+vt*Math.log(arg):vcrit; }
    else { vnew=vt*Math.log(vnew/vt); }
  }
  return vnew;
}

function solveMNA(faults,sourcesOn,inject,passive,noGain){
  var nn=NODES.length;
  var devs=COMPONENTS.map(function(c){ return dev(c,faults); });
  var opDev=null; devs.forEach(function(d){ if(d.kind==='opamp') opDev=d; });
  var V=zeros(nn);
  var _g={'raw0':21.2,'raw1':21,'rA':20.9,'rB':20.9,'rC':20.9,'rD':20.9,'rE':20.9,'rF':20.9,'rG':20.9,'d2a':1.9,'ref':16,'oap':12,'n1':12,'oap2':12,
    'oaout':2.0,'q2b':2.7,'q1b':13.3,'q1e':12.5,'vA':12,'vB':12,'vC':12,'vD':12,'outT':12,'q3b':12,'q3c':12,'q4b':5,'q4c':2};
  if(!inject){ for(var gk in _g){ if(NIDX[gk]!==undefined) V[NIDX[gk]]=_g[gk]; } }

  /* mesures : on monte le courant de test progressivement (source stepping) */
  var steps = inject ? [0.02,0.1,0.3,0.6,1.0] : [1];
  for(var si=0; si<steps.length; si++){
    var scale=1;
    var inj = inject ? {n1:inject.n1,n2:inject.n2,i:inject.i*steps[si]} : null;
    var vOp=vval(V,'oaout')||2.0;
    for(var iter=0; iter<8000; iter++){
      var r=buildSolve(devs,sourcesOn,inj,V,scale,vOp,passive,noGain);
      if(!r) break;
      var maxd=0;
      for(var i=1;i<nn;i++){
        var nv=r[i]; if(!isFinite(nv)) nv=V[i];
        var d=nv-V[i]; if(d>1.5) d=1.5; else if(d<-1.5) d=-1.5;
        V[i]=V[i]+0.2*d; if(Math.abs(d)>maxd) maxd=Math.abs(d);
      }
      if(sourcesOn && opDev){
        var err=vval(V,opDev.comp.pp)-vval(V,opDev.comp.pn);
        vOp += 0.005*err;
        var rail=Math.min(VCC*scale, Math.abs(vval(V,'rG'))||VCC*scale);
        if(vOp>rail-1.5) vOp=Math.max(0.1,rail-1.5);
        if(vOp<0) vOp=0;
        if(Math.abs(err)>maxd) maxd=Math.abs(err);
      }
      if(maxd<1e-5 && iter>3) break;
    }
  }
  var out={}; NODES.forEach(function(nm,i){
    var v=i===0?0:V[i];
    if(inject){                                   /* mesure : pas d'ecretage (sinon un circuit ouvert lit 24,2k) */
      if(!isFinite(v)) v=1e12;
      out[nm]=v; return;
    }
    if(!isFinite(v))v=0; if(v>VCC+3)v=VCC+3; if(v<-3)v=-3; out[nm]=v;
  });
  return out;
}

function buildSolve(devs,sourcesOn,inject,V,scale,vOp,passive,noGain){
  if(scale===undefined) scale=1; if(vOp===undefined) vOp=2.0;
  var nn=NODES.length;
  var vsList=passive?[]:devs.filter(function(d){return d.kind==='vs';});
  var opList=sourcesOn?devs.filter(function(d){return d.kind==='opamp';}):[];
  var n=(nn-1)+vsList.length+opList.length; if(n<=0) return null;
  var A=zeros2(n),b=zeros(n);
  function addI(node,cur){ var i=vidx(node); if(i>=0) b[i]-=cur; }
  function addG(a,c,g){ var ia=vidx(a),ic=vidx(c); if(ia>=0&&ic>=0) A[ia][ic]+=g; }
  function addRes(a,c,r){ if(r<=0) return; var g=1/r; addG(a,a,g); addG(c,c,g); addG(a,c,-g); addG(c,a,-g); }

  devs.forEach(function(d){
    var c=d.comp;
    if(d.kind==='r'){ if(!d.open) addRes(c.a,c.b,d.r); }
    else if(d.kind==='open'){}
    else if(d.kind==='d'){ if(d.on&&!passive) stampDiode(d,V,addG,addI); }
    else if(d.kind==='bjt'){
      if(!passive) stampBJT(d,V,addG,addI,addRes,noGain);
      else { var bc=d.comp;
        if(d.be==='short') addRes(bc.b,bc.e,2);   /* passif : seule une jonction en court conduit */
        if(d.bc==='short') addRes(bc.b,bc.c,2);
        if(d.ce==='short') addRes(bc.c,bc.e,2);
      }
    }
  });
  var iv=0;
  vsList.forEach(function(d){ var c=d.comp, idx=(nn-1)+iv; iv++;
    var p=vidx(c.p),m=vidx(c.n);
    if(p>=0){A[p][idx]+=1;A[idx][p]+=1;} if(m>=0){A[m][idx]-=1;A[idx][m]-=1;}
    b[idx]+=(sourcesOn===false)?0:d.v*scale;
  });
  var io=0;
  opList.forEach(function(d){ var c=d.comp, idx=(nn-1)+vsList.length+io; io++;
    var out=vidx(c.out); if(out>=0){A[out][idx]+=1;A[idx][out]+=1;}
    b[idx]+=vOp*scale;
  });
  for(var i=0;i<nn-1;i++) A[i][i]+=1e-11;
  if(inject){ addI(inject.n1,-inject.i); addI(inject.n2,inject.i); }   /* sonde + (n1) injecte le courant */
  var xs=gauss(A,b,n); if(!xs) return null;
  var res=zeros(nn); for(var k=0;k<nn-1;k++) res[k+1]=xs[k]; return res;
}

function stampDiode(d,V,addG,addI){
  var c=d.comp; var nVt=d.led?1.9*VT:(d.zener?1.1*VT:1.0*VT); var isat=d.led?1e-19:IS;
  var vcrit=nVt*Math.log(nVt/(Math.SQRT2*isat));
  var Vd0=vval(V,c.a)-vval(V,c.b); var vold=(d.vd_old===undefined)?0:d.vd_old;
  var Vd=pnjlim(Vd0,vold,nVt,vcrit); d.vd_old=Vd;
  var g=0,I=0;
  if(d.zener){ var aF=Math.min(EXP_MAX,Vd/nVt), aR=Math.min(EXP_MAX,(-(Vd+d.vz))/0.04);
    I=isat*(Math.exp(aF)-1)-1e-4*(Math.exp(aR)-1); g=(isat/nVt)*Math.exp(aF)+(1e-4/0.04)*Math.exp(aR); }
  else { var a=Math.min(EXP_MAX,Vd/nVt); I=isat*(Math.exp(a)-1); g=(isat/nVt)*Math.exp(a); if(d.leak) g+=1/d.leak; }
  var Ieq=I-g*Vd;
  addG(c.a,c.a,g);addG(c.b,c.b,g);addG(c.a,c.b,-g);addG(c.b,c.a,-g);
  addI(c.a,Ieq);addI(c.b,-Ieq);
}
function stampBJT(d,V,addG,addI,addRes,noGain){
  var c=d.comp,b=c.b,cc=c.c,e=c.e,pnp=d.pnp;
  if(d.be==='short')addRes(b,e,3); if(d.bc==='short')addRes(b,cc,3); if(d.ce==='short')addRes(cc,e,3);
  var onBE=(d.be!=='open'&&d.be!=='short'), onBC=(d.bc!=='open'&&d.bc!=='short');
  var gain=(d.be==='ok'&&d.bc==='ok'&&d.ce==='ok');
  var Vb=vval(V,b),Vc=vval(V,cc),Ve=vval(V,e);
  function branch(A_,B_,I,parts){
    var Ieq=I; for(var nm0 in parts) Ieq-=parts[nm0]*vval(V,nm0);
    addI(A_,Ieq); addI(B_,-Ieq);
    var ia=vidx(A_),ib=vidx(B_);
    for(var nm in parts){ var ki=vidx(nm),g=parts[nm]; if(ki<0)continue;
      if(ia>=0) addG(A_,nm,g); if(ib>=0) addG(B_,nm,-g); }
  }
  if(pnp){
    var veb=pnjlim(Ve-Vb,d.veb_old||0,VT,VCRIT); d.veb_old=veb;
    var vcb=pnjlim(Vc-Vb,d.vcb_old||0,VT,VCRIT); d.vcb_old=vcb;
    var Ef=limitExp(veb/VT),Er=limitExp(vcb/VT);
    if(onBE){ var Ieb=(IS/BF)*(Ef-1),geb=(IS/BF/VT)*Ef; branch(e,b,Ieb,{e:geb,b:-geb}); }
    if(onBC){ var Icb=(IS/BR)*(Er-1),gcb=(IS/BR/VT)*Er; branch(cc,b,Icb,{cc:gcb,b:-gcb}); }
    if(gain&&!noGain){ var G1=(IS/VT)*Ef,G2=(IS/VT)*Er; branch(e,cc,IS*(Ef-Er),{e:G1,cc:-G2,b:(-G1+G2)}); }
  } else {
    var vbe=pnjlim(Vb-Ve,d.vbe_old||0,VT,VCRIT); d.vbe_old=vbe;
    var vbc=pnjlim(Vb-Vc,d.vbc_old||0,VT,VCRIT); d.vbc_old=vbc;
    var F=limitExp(vbe/VT),Rr=limitExp(vbc/VT);
    if(onBE){ var Ibe=(IS/BF)*(F-1),gbe=(IS/BF/VT)*F; branch(b,e,Ibe,{b:gbe,e:-gbe}); }
    if(onBC){ var Ibc=(IS/BR)*(Rr-1),gbc=(IS/BR/VT)*Rr; branch(b,cc,Ibc,{b:gbc,cc:-gbc}); }
    if(gain&&!noGain){ var GF=(IS/VT)*F,GR=(IS/VT)*Rr; branch(cc,e,IS*(F-Rr),{cc:GR,e:-GF,b:(GF-GR)}); }
  }
}
function gauss(A,b,n){
  var perm=[]; for(var i=0;i<n;i++) perm[i]=i;
  for(var step=0; step<n; step++){
    var pr=step,pc=step,max=0;
    for(var r=step;r<n;r++) for(var cc=step;cc<n;cc++){ var v=Math.abs(A[r][cc]); if(v>max){max=v;pr=r;pc=cc;} }
    if(max<1e-16) return null;
    if(pr!==step){ var t=A[pr];A[pr]=A[step];A[step]=t; var tb=b[pr];b[pr]=b[step];b[step]=tb; }
    if(pc!==step){ for(var rr=0;rr<n;rr++){ var t2=A[rr][step];A[rr][step]=A[rr][pc];A[rr][pc]=t2; } var tp=perm[step];perm[step]=perm[pc];perm[pc]=tp; }
    var pv=A[step][step];
    for(var r2=step+1;r2<n;r2++){ var f=A[r2][step]/pv; if(f===0)continue;
      for(var k=step;k<n;k++) A[r2][k]-=f*A[step][k]; b[r2]-=f*b[step]; }
  }
  var z=zeros(n);
  for(var ii=n-1;ii>=0;ii--){ var s=b[ii]; for(var k2=ii+1;k2<n;k2++) s-=A[ii][k2]*z[k2]; z[ii]=s/A[ii][ii]; }
  var x=zeros(n); for(var j=0;j<n;j++) x[perm[j]]=z[j]; return x;
}

/* ------------------------------------------------------------------ */
/*  Modele analytique par morceaux (tensions DC plausibles)            */
/* ------------------------------------------------------------------ */
function solveAnalytic(faults){
  function F(id){ return faultFor(faults,id); }
  function op(id){ var f=F(id); return !!(f&&f.mode==='open'); }
  function sh(id){ var f=F(id); return !!(f&&f.mode==='short'); }
  function dr(id){ var f=F(id); return (f&&f.mode==='drift')?(f.factor||2):1; }
  function q(id,br){ var f=F(id); if(!f) return false; if(f.mode==='bjt') return f[br]; return f.mode==='open'? 'open' : (f.mode==='short'?'short':'ok'); }

  var V={gnd:0};
  /* primaire 120 V (secteur) : F1 en serie, primaire du transfo vers le neutre */
  var fuseBlown = op('F1');
  V.secL = 120.0;                 // secteur, avant le fusible
  V.priN = 0.0;                   // neutre / bas du primaire
  V.pri1 = fuseBlown ? 0.0 : 120.0;  // apres le fusible (haut du primaire)
  /* secondaire du transformateur (AC) */
  var t1dead = op('T1') || fuseBlown;
  V.ac1 = t1dead ? 0 : 16.0;      // tension alternative RMS au secondaire
  V.ac2 = 0;
  /* rail non regule segmente : chaque piste coupee coupe l'aval */
  var rawDead = t1dead || sh('C1') || sh('C2') || op('D1');
  var railV = 21.0, ok = !rawDead;
  V.raw0 = ok?railV:0; V.raw1 = ok?railV:0;
  V.raw  = ok?railV:0;           /* compatibilite (debut du rail) */
  V.rA = ok?railV:0;
  ok = ok && !op('T_A'); V.rB = ok?railV:0;
  ok = ok && !op('T_B'); V.rC = ok?railV:0;
  ok = ok && !op('T_C'); V.rD = ok?railV:0;
  ok = ok && !op('T_D'); V.rE = ok?railV:0;
  ok = ok && !op('T_E'); V.rF = ok?railV:0;
  ok = ok && !op('T_F'); V.rG = ok?railV:0;
  var raw = V.rG;                /* etage de puissance / sortie */
  /* alimentation du LM358 : a travers R3 (tapis sur rC) puis piste vers la broche 8 */
  V.vccR3 = (!V.rC || op('R3')) ? 0 : Math.max(0, V.rC-0.3);
  V.vccIC = op('P_VCC') ? 0 : V.vccR3;      // broche 8 du LM358
  V.vcc = V.vccIC;                          // alimentation de l'AOP

  /* reference zener (alimentee par R2 depuis rB) */
  var ref, refFeed = V.rB;
  if(sh('D3') || sh('C3')) ref=0;
  else if(op('R2')) ref=0;
  else if(refFeed<=0) ref=0;
  else if(op('D3')) ref = refFeed*0.94;          // zener ouverte -> non regulee
  else ref = refFeed>17 ? 16 : refFeed*0.78;
  var f3=F('D3');
  if(f3&&f3.mode==='leak') ref=Math.min(ref, ref-1.5);
  ref = ref/Math.max(1,dr('R2')*0.5+0.5);        // derive eventuelle
  V.refA = Math.max(0,ref);
  V.refB = op('T_ref1')?0:V.refA;                // reseau de reference segmente
  V.refC = op('T_ref2')?0:V.refB;
  V.refD = op('T_ref3')?0:V.refC;
  V.ref = V.refA;

  /* potentiometre R4 */
  var k=POT_K;
  if(op('R4')) k=1.0; else k=k*Math.min(2,dr('R4'));
  if(op('R4b')) k=0;
  k=Math.max(0,Math.min(1,k));
  V.oap=Math.max(0,V.refD*k);
  V.n1=V.oap;
  V.oap2 = sh('C4')?0 : (op('R5')||op('R6')?0:V.oap);

  /* sortie */
  var vout;
  if(sh('D4')) vout=raw;
  else if(q('Q1','ce')==='short') vout=raw;
  else if(sh('C5')) vout=0;                      // condensateur de sortie perce : la sortie est reliee a GND, donc ecrasee a 0 V
  else if(op('R8')) vout=0;
  else if(op('R7')) vout=0;
  else if(q('Q1','be')==='open') vout=0;
  else if(q('Q2','be')==='open') vout=0;
  else if(q('Q3','ce')==='short') vout=1.7;
  else if(op('P_Q1E')) vout=0;                   // branche Q1e -> R8 coupee : sortie morte
  else vout=V.oap2;
  var fIC=F('IC1');
  if(fIC){
    if(fIC.mode==='open') vout=0;          // AOP mort : plus de commande
    else if(fIC.mode==='short') vout=Math.max(0, Math.min(raw, V.vcc-1.5) - 1.4);  // sortie collée : plafonnee a Vcc-1.5 puis emetteur-suiveur
  }
  if(sh('Q2')||op('Q2')) vout=0;
  if(V.vcc<1) vout=0;                              // LM358 non alimente
  if(vout<0) vout=0;
  V.vout=vout;                  /* noeud de sortie regule (R8, feedback) */
  V.vA=vout;
  V.vB = op('T_VA')?0:V.vA;     /* rail de sortie segmente */
  V.vC = op('T_VB')?0:V.vB;
  V.vD = op('T_VC')?0:V.vC;
  V.outT = op('PT_OUT')?0:V.vD;
  V.fb=vout;

  /* sortie AOP : suit la consigne en boucle fermee, sature sinon */
  var oaout;
  if(fIC && fIC.mode==='short'){ oaout = Math.min(raw, Math.max(0, V.vcc-1.5)); }
  else if(fIC && fIC.mode==='open'){ oaout = 0; }
  else if(V.vcc<1){ oaout = 0; }
  else {
    var err = V.oap2 - vout;                 // In+ - In-
    if(err > 0.05) oaout = Math.max(0, V.vcc-1.5);   // In+ > In- : sature haut
    else if(err < -0.05) oaout = 0;                  // In+ < In- : sature bas
    else oaout = (vout>0.7) ? vout + 1.40 : 0;       // boucle fermee (rien si la sortie est nulle)
  }
  var oaMax = Math.max(0, V.vcc-1.5);                // un AOP ne peut pas depasser Vcc-1.5
  if(oaout > oaMax) oaout = oaMax;
  V.oaout = oaout;
  /* etage de puissance COMMANDE PAR LA SORTIE AOP (Q2 puis Q1) */
  V.q2b = op('R7') ? 0 : (oaout>0.7 ? oaout-0.10 : 0);  // base Q2 (commandee par l'AOP via R7)
  V.q1b = (q('Q2','be')==='open') ? 0 : (V.q2b>0.7 ? V.q2b-0.70 : 0);  // B-E Q2 ouvert : base Q1 non alimentee
  var iout = vout/1000;                                  // charge de sortie
  if(op('P_Q1E')){ V.q1e = V.q1b>0.7 ? V.q1b-0.70 : 0; V.q1eR = 0; }  // branche R8 coupee : l'emetteur n'est plus relie a la sortie
  else { V.q1e = vout + iout*1; V.q1eR = V.q1e; }        // emetteur Q1 relie a vout par R8 (1 ohm)
  if(sh('C5')){                                          // sortie en court-circuit : sortie ecrasee a 0 V, limiteur actif (chute R8 = 0,7 V)
    V.vout = 0; V.vA = 0; V.vB = 0; V.vC = 0; V.vD = 0; V.outT = 0;   // C5 relie la sortie a GND
    V.q1e = 0.70; V.q1eR = 0.70; V.q1b = 1.40; V.q2b = 2.00; V.oaout = Math.min(V.oaout, 2.10);
  }
  V.q3b = vout; V.q3c = 0; V.q4b = 0; V.q4c = V.n1;   // collecteur Q4 = jonction R5/R6 (via FW2)
  if(op('R6')){ V.q4c = V.oap; V.n1 = V.oap; }   // R6 ouvert : aucun courant, la jonction est au potentiel du pot (Q4b=0)
  if(sh('C4')){ V.n1 = V.oap*1000/11000; V.q4c = V.n1; }  // C4 en court : diviseur R5(10k)/R6(1k), oap2=0

  /* temoin LED */
  var ledOn = V.rD>2 && !op('R1') && !op('D2');
  if(F('D2')&&F('D2').mode==='short') ledOn=false;
  V.d2a = op('D2') ? V.rD : (ledOn ? 1.9 : 0);   // D2 ouvert : aucun courant -> pas de chute dans R1 (anode au rail)
  V.d2on = ledOn ? 1 : 0;                        // etat (allumee/eteinte) independant de la tension d'anode

  /* securite : tout ramener dans une plage plausible */
  Object.keys(V).forEach(function(n){ if(!isFinite(V[n])) V[n]=0; if(V[n]>130)V[n]=130; if(V[n]<-3)V[n]=-3; });
  return V;
}

/* ------------------------------------------------------------------ */
/*  Evaluation thermique : ce qu'on "sent" en touchant un composant    */
/*  level : 0 froid, 1 tiede, 2 chaud, 3 BRULANT                       */
/* ------------------------------------------------------------------ */
function thermalMap(faults){
  var V=solveAnalytic(faults), out={};
  function F(id){ return faultFor(faults,id); }
  function op(id){ var f=F(id); return !!(f&&f.mode==='open'); }
  function sh(id){ var f=F(id); return !!(f&&f.mode==='short'); }
  function lvl(P){ return P>1.0?3 : P>0.25?2 : P>0.05?1 : 0; }
  COMPONENTS.forEach(function(c){
    var f=F(c.id), l=0;
    if(c.type==='r'||c.type==='trace'||c.type==='fuse'){
      if(f&&f.mode==='open') l=0;                     /* un circuit ouvert ne dissipe rien */
      else if(f&&f.mode==='short') l=3;
      else { var d=Math.abs((V[c.a]||0)-(V[c.b]||0)); l=lvl(d*d/c.r); }
    } else if(c.type==='cap'){
      l=(f&&f.mode==='short')?3:((f&&f.mode==='leak')?2:0);
    } else if(c.type==='d'||c.type==='led'||c.type==='zener'){
      l=(f&&f.mode==='short')?3:((f&&f.mode==='leak')?1:0);
    } else if(c.type==='npn'||c.type==='pnp'){
      var vce=Math.abs((V[c.c]||0)-(V[c.e]||0)), I=0.004;
      if(c.id==='Q1') I=Math.abs(V.vout)/1000+0.02;
      else if(c.id==='Q2') I=0.03;
      if(f&&f.mode==='open') l=0;
      else if(f&&f.mode==='short') l=3;
      else {
        if(f&&f.mode==='bjt'&&f.be==='open') I=0.0005;   /* B-E ouvert : aucune commande -> pas de courant */
        l=lvl(vce*I);
      }
    } else if(c.type==='xfmr'||c.type==='opamp'){
      l=(f&&f.mode==='short')?3:0;
    }
    out[c.id]=l;
  });
  /* chemins sous contrainte (un court aval fait chauffer l'amont) */
  if(sh('C5')){ out.Q1=3; out.R8=2; out.R12=0; out.D4=0; }   /* R12/D4 ne conduisent plus : froids */
  if(sh('C1')||sh('C2')){ out.F1=3; out.D1=2; }
  if(sh('D4')){ out.Q1=2; out.R8=1; out.R12=2; }
  if(sh('Q1')){ out.Q1=3; out.R8=2; }
  if(sh('D3')||sh('C3')){ out.R2=2; out.R3=3; }
  if(sh('Q2')){ out.Q2=3; out.R7=2; }
  return out;
}
function tempText(l){
  return ['froid','tiede','chaud','brulant'][l] || 'froid';
}

/* ------------------------------------------------------------------ */
/*  Test diode : resolution directe de la jonction (deterministe)      */
/* ------------------------------------------------------------------ */
function junctionList(c,f){
  if(f && f.mode==='open') return [];            /* composant ouvert : aucune jonction */
  var l=[];
  if(c.type==='d')     l.push({f:c.a,t:c.b,isat:IS,nVt:VT,vz:0});
  if(c.type==='led')   l.push({f:c.a,t:c.b,isat:1e-19,nVt:1.9*VT,vz:0});
  if(c.type==='zener') l.push({f:c.a,t:c.b,isat:IS,nVt:1.1*VT,vz:c.vz||0});
  function bad(br){ return f&&f.mode==='bjt' && (f[br]==='open'||f[br]==='short'); }
  if(c.type==='npn'){
    if(!bad('be')) l.push({f:c.b,t:c.e,isat:IS/BF,nVt:VT,vz:0});
    if(!bad('bc')) l.push({f:c.b,t:c.c,isat:IS/BR,nVt:VT,vz:0});
  }
  if(c.type==='pnp'){
    if(!bad('be')) l.push({f:c.e,t:c.b,isat:IS/BF,nVt:VT,vz:0});
    if(!bad('bc')) l.push({f:c.c,t:c.b,isat:IS/BR,nVt:VT,vz:0});
  }
  return l;
}
function junctionCurrentMod(j,Vf){
  var a=Vf/j.nVt; if(a>EXP_MAX) a=EXP_MAX;
  var I=j.isat*(Math.exp(a)-1);
  if(j.vz){ var aR=Math.min(EXP_MAX,(-(Vf+j.vz))/0.04); I-=1e-4*(Math.exp(aR)-1); }
  return I;
}
function diodeMeasure(n1,n2,faults,I){
  var pass=solveMNA(faults,false,{n1:n1,n2:n2,i:I},true,false);
  var R=Math.abs((pass[n1]-pass[n2])/I); if(!isFinite(R)||R<=0) R=1e9;
  var js=[];
  COMPONENTS.forEach(function(c){
    var f=faultFor(faults,c.id);
    junctionList(c,f).forEach(function(j){
      if(j.f===n1&&j.t===n2) js.push({j:j,dir:1});
      else if(j.f===n2&&j.t===n1) js.push({j:j,dir:-1});
    });
    /* interieur simplifie de l'AOP : diodes Vcc->entrees/sortie et sortie->GND */
    if(c.type==='opamp' && !(f&&f.mode==='open')){
      [[c.vcc,c.pp],[c.vcc,c.pn],[c.vcc,c.out],[c.out,c.gnd]].forEach(function(pr){
        if(!pr[0]||!pr[1]) return;
        var j={f:pr[0],t:pr[1],isat:IS,nVt:VT,vz:0};
        if(j.f===n1&&j.t===n2) js.push({j:j,dir:1});
        else if(j.f===n2&&j.t===n1) js.push({j:j,dir:-1});
      });
    }
  });
  var V;
  if(!js.length){ V=I*R; }
  else{
    var f=function(v){ var s=v/R; js.forEach(function(o){ s += o.dir>0?junctionCurrentMod(o.j,v):-junctionCurrentMod(o.j,-v); }); return s-I; };
    var lo=-2, hi=25, flo=f(lo), fhi=f(hi);
    if(flo>0) V=lo;
    else if(fhi<0) V=hi;
    else{ for(var it=0; it<80; it++){ var mid=(lo+hi)/2; if(f(mid)>0) hi=mid; else lo=mid; } V=(lo+hi)/2; }
  }
  return {v:V, r:Math.abs(V/I)};
}

/* Groupes de noeuds relies par des pistes intactes (union-find) */
function netGroups(faults){
  var parent={}; NODES.forEach(function(n){ parent[n]=n; });
  function find(x){ if(parent[x]===undefined) parent[x]=x; var r=x; while(parent[r]!==r) r=parent[r]; while(parent[x]!==r){ var nx=parent[x]; parent[x]=r; x=nx; } return r; }
  function uni(a,b){ if(a==null||b==null) return; var ra=find(a), rb=find(b); if(ra!==rb) parent[ra]=rb; }
  COMPONENTS.forEach(function(c){
    if(c.type!=='trace') return;
    var f=faultFor(faults,c.id);
    if(f && f.mode==='open') return;               /* piste coupee : plus de liaison */
    if(c.a && c.b) uni(c.a,c.b);
  });
  var out={}; NODES.forEach(function(n){ out[n]=find(n); });
  return out;
}

global.ALIM = {
  VOUT_NOM: VOUT_NOM, POT_K: POT_K,
  netGroup: netGroups,
  thermal: function(faults){ return thermalMap(faults); },
  tempText: tempText,
  acNodes: { ac1:true, ac2:true, acA:true, acB:true, secL:true, pri1:true, priN:true },
  nodes: NODES,
  components: COMPONENTS,
  props: COMPONENTS.filter(function(c){ return !c.virtual; }),
  solve: function(faults){ return solveAnalytic(faults); },
  nominal: function(){ return solveAnalytic(null); },
  solveNumerique: function(faults){ return solveMNA(faults,true,null); },
  setPot: function(k){
    POT_K = Math.max(0, Math.min(1, k));
    VOUT_NOM = POT_K * 16;
    COMPONENTS.forEach(function(c){
      if(c.id==='R4')  c.r=(1-POT_K)*10000;
      if(c.id==='R4b') c.r=POT_K*10000;
    });
    if(global.ALIM) global.ALIM.VOUT_NOM = VOUT_NOM;
    return VOUT_NOM;
  },
  getPot: function(){ return POT_K; },
  /* Auto-test des pistes : verifie qu'une piste coupee se lit O.L., separe les groupes et change la tension */
  selfTest: function(){
    var out=[];
    COMPONENTS.forEach(function(c){
      if(c.type!=='trace'||c.a==null||c.b==null) return;
      var f=[{id:c.id,mode:'open'}];
      var m=solveMNA(f,false,{n1:c.a,n2:c.b,i:0.001},true,false);
      var r=Math.abs((m[c.a]-m[c.b])/0.001);
      var g=netGroups(f);
      var V=solveAnalytic(f);
      out.push({ id:c.id, label:c.label, from:c.a, to:c.b,
        ohm: (!isFinite(r)||r>1e6)?'O.L.':(r<1000?r.toFixed(1)+' ohm':(r/1000).toFixed(2)+' k'),
        split: g[c.a]!==g[c.b],
        dv: Math.abs((V[c.a]||0)-(V[c.b]||0)) });
    });
    return out;
  },
  resistance: function(n1,n2,faults){ var nodes=solveMNA(faults,false,{n1:n1,n2:n2,i:0.001},true); return Math.abs((nodes[n1]-nodes[n2])/0.001); },
  measure: function(n1,n2,faults,mode){
    var Itot=0.001;
    if(mode==='diode') return diodeMeasure(n1,n2,faults,Itot);
    var passive=(mode==='ohm'||mode==='cont');
    var nodes=solveMNA(faults,false,{n1:n1,n2:n2,i:Itot},passive,false);
    var v=nodes[n1]-nodes[n2]; return {v:v,r:Math.abs(v/Itot)};
  }
};

})(typeof window!=='undefined'?window:globalThis);
