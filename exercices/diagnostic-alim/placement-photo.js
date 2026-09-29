/* =========================================================================
   placement-photo.js - Outil de placement des points de test sur la photo
   ========================================================================= */
(function (global) {
'use strict';
function $(id){ return document.getElementById(id); }
var PM = (global.PHOTOMAP||[]).map(function(e){ return [e[0],e[1],e[2]]; });
var activeNode = null, drag = null;

function renderNodeSelect(){
  var sel=$('nodeSel'); sel.innerHTML='';
  (global.ALIM.nodes||[]).forEach(function(n){
    var o=document.createElement('option'); o.value=n; o.textContent=n; sel.appendChild(o);
  });
}
function renderDots(){
  var host=$('dots'); host.innerHTML='';
  PM.forEach(function(e){
    var d=document.createElement('div'); d.className='pd';
    d.style.left=e[0]+'%'; d.style.top=e[1]+'%';
    d.innerHTML='<span class="t">'+e[2]+'</span>';
    d.addEventListener('pointerdown',function(ev){
      drag=e; d.style.cursor='grabbing'; ev.stopPropagation(); ev.preventDefault();
      try{ d.setPointerCapture(ev.pointerId); }catch(_){}
    });
    host.appendChild(d);
  });
  renderTable();
}
function renderTable(){
  var tb=$('tbl').querySelector('tbody'); tb.innerHTML='';
  PM.forEach(function(e,i){
    var tr=document.createElement('tr');
    tr.innerHTML='<td class="tag">'+e[2]+'</td>'+
      '<td><input type="number" class="ix" value="'+e[0].toFixed(1)+'" step="0.5"></td>'+
      '<td><input type="number" class="iy" value="'+e[1].toFixed(1)+'" step="0.5"></td>'+
      '<td><button class="btn" style="padding:2px 8px">X</button></td>';
    tr.querySelector('.ix').oninput=function(){ e[0]=+this.value; renderDots(); };
    tr.querySelector('.iy').oninput=function(){ e[1]=+this.value; renderDots(); };
    tr.querySelector('button').onclick=function(){ PM.splice(i,1); renderDots(); };
    tr.onclick=function(ev){ if(ev.target.tagName!=='INPUT'&&ev.target.tagName!=='BUTTON'){ activeNode=e[2]; $('nodeSel').value=e[2]; setHint(); } };
    tb.appendChild(tr);
  });
  exportPM();
}
function setHint(){ $('hint').textContent = activeNode? ('Clique sur la carte pour placer : '+activeNode) : 'Choisis un noeud.'; }
function onImageClick(ev){
  if(!activeNode) return;
  var w=$('wrap'), r=w.getBoundingClientRect();
  var x=((ev.clientX-r.left)/r.width)*100, y=((ev.clientY-r.top)/r.height)*100;
  x=Math.max(0,Math.min(100,x)); y=Math.max(0,Math.min(100,y));
  var found=false;
  PM.forEach(function(e){ if(e[2]===activeNode){ e[0]=x; e[1]=y; found=true; } });
  if(!found) PM.push([x,y,activeNode]);
  renderDots();
}
function moveDrag(ev){
  if(!drag) return;
  var w=$('wrap'), r=w.getBoundingClientRect();
  drag[0]=Math.max(0,Math.min(100,((ev.clientX-r.left)/r.width)*100));
  drag[1]=Math.max(0,Math.min(100,((ev.clientY-r.top)/r.height)*100));
  renderDots();
}
function exportPM(){
  var lines=['/* Points de test sur la photo - genere par placement-photo.html */','window.PHOTOMAP = ['];
  PM.slice().sort(function(a,b){ return a[2]<b[2]?-1:1; }).forEach(function(e){
    lines.push('  [ '+e[0].toFixed(1)+', '+e[1].toFixed(1)+", '"+e[2]+"' ],");
  });
  lines.push('];','');
  var txt=lines.join('\n'); $('out').value=txt; return txt;
}
function exportPMjs(){
  var txt=exportPM();
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([txt],{type:'text/javascript'}));
  a.download='photomap.js'; document.body.appendChild(a); a.click(); a.remove();
}
function exportBoardSvg(){
  var W=1992,H=1059;
  var s='<?xml version="1.0" encoding="UTF-8"?>\n';
  s+='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1992 1059" width="1992" height="1059" id="boardSvg">\n';
  s+='  <image x="0" y="0" width="1992" height="1059" xlink:href="boardcc.jpg" href="boardcc.jpg"/>\n';
  s+='  <g font-family="monospace" font-size="22">\n';
  PM.forEach(function(e){ var x=e[0]*W/100, y=e[1]*H/100;
    s+='    <g class="pt" data-node="'+e[2]+'"><circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="15" fill="#facc15" fill-opacity="0.85" stroke="#0b1120" stroke-width="3"/><text x="'+x.toFixed(1)+'" y="'+(y-22).toFixed(1)+'" text-anchor="middle" fill="#fde68a" stroke="#0b1120" stroke-width="3" paint-order="stroke">'+e[2]+'</text></g>\n';
  });
  s+='  </g>\n</svg>\n';
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([s],{type:'image/svg+xml'}));
  a.download='board-points.svg'; document.body.appendChild(a); a.click(); a.remove();
}
function init(){
  renderNodeSelect();
  var sel=$('nodeSel');
  sel.onchange=function(){ activeNode=sel.value; setHint(); };
  activeNode=sel.value;
  $('btnAdd').onclick=function(){ activeNode=sel.value; setHint(); };
  $('btnSvg').onclick=exportBoardSvg;
  $('btnPm').onclick=exportPMjs;
  $('btnClear').onclick=function(){ PM=[]; renderDots(); };
  $('wrap').addEventListener('click',onImageClick);
  document.addEventListener('pointermove',moveDrag);
  document.addEventListener('pointerup',function(){ drag=null; });
  renderDots(); setHint();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})(window);
