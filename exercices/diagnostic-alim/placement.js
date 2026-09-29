/* =========================================================================
   placement.js - Outil de placement des pastilles de test
   Glisser-deposer des pastilles sur le schema, edition numerique,
   export du fichier pinpos.js (positions "COMPOSANT.BROCHE").
   ========================================================================= */
(function () {
'use strict';
function $(id){ return document.getElementById(id); }

var snap = 5, doSnap = true;
var drag = null, sel = null;

function inject(){
  $('schemaHost').innerHTML = window.SCHEMATIC_SVG;
  buildTable();
  bindPads();
  updateCount();
}
function loadScript(src, cb){
  var old = document.querySelector('script[data-dyn="'+src+'"]');
  if(old) old.remove();
  var s = document.createElement('script');
  s.src = src; s.setAttribute('data-dyn', src);
  s.onload = function(){ if(cb) cb(); };
  document.body.appendChild(s);
}
function keyOf(g){ return g.getAttribute('data-comp')+'.'+g.getAttribute('data-pin'); }
function xyOf(g){
  var m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(g.getAttribute('transform')||'');
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : [0,0];
}
function setXY(g,x,y){
  if(doSnap){ x = Math.round(x/snap)*snap; y = Math.round(y/snap)*snap; }
  g.setAttribute('transform','translate('+x+','+y+')');
}
function clientToSvg(cx,cy){
  var svg = document.getElementById('schemaSvg');
  var pt = svg.createSVGPoint(); pt.x=cx; pt.y=cy;
  var m = svg.getScreenCTM().inverse();
  var r = pt.matrixTransform(m);
  return { x:r.x, y:r.y };
}

function bindPads(){
  var svg = document.getElementById('schemaSvg');
  svg.addEventListener('pointerdown', function(e){
    var g = e.target.closest ? e.target.closest('.pad') : null;
    if(!g) return;
    drag = g; select(g);
    g.classList.add('dragging');
    try{ svg.setPointerCapture(e.pointerId); }catch(_){}
    e.preventDefault();
  });
  svg.addEventListener('pointermove', function(e){
    if(!drag) return;
    var free = e.shiftKey;
    var p = clientToSvg(e.clientX, e.clientY);
    var x = p.x, y = p.y;
    if(doSnap && !free){ x = Math.round(x/snap)*snap; y = Math.round(y/snap)*snap; }
    drag.setAttribute('transform','translate('+x+','+y+')');
    syncRow(drag);
  });
  function end(){ if(drag){ drag.classList.remove('dragging'); drag=null; } }
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('pointerleave', function(){ if(drag){ drag.classList.remove('dragging'); drag=null; } });
}

function buildTable(){
  var tb = $('pinTable').querySelector('tbody');
  tb.innerHTML='';
  var pads = document.querySelectorAll('#schemaSvg .pad');
  Array.prototype.forEach.call(pads, function(g){
    var tr = document.createElement('tr');
    tr.setAttribute('data-key', keyOf(g));
    var xy = xyOf(g);
    tr.innerHTML = '<td class="key">'+keyOf(g)+'</td><td>'+g.getAttribute('data-node')+'</td>'+
      '<td><input type="number" class="ix" value="'+xy[0]+'" step="1"></td>'+
      '<td><input type="number" class="iy" value="'+xy[1]+'" step="1"></td>';
    tr.addEventListener('click', function(ev){ if(ev.target.tagName!=='INPUT') select(g); });
    tr.querySelector('.ix').addEventListener('input', function(){ var a=xyOf(g); setXY(g, +this.value, a[1]); });
    tr.querySelector('.iy').addEventListener('input', function(){ var a=xyOf(g); setXY(g, a[0], +this.value); });
    g._row = tr;
    tb.appendChild(tr);
  });
}
function syncRow(g){
  if(!g._row) return;
  var xy = xyOf(g);
  g._row.querySelector('.ix').value = xy[0];
  g._row.querySelector('.iy').value = xy[1];
}
function select(g){
  if(sel && sel._row) sel._row.classList.remove('sel');
  sel = g;
  if(g && g._row){ g._row.classList.add('sel'); g._row.scrollIntoView({block:'nearest'}); }
}
function updateCount(){
  $('count').textContent = document.querySelectorAll('#schemaSvg .pad').length + ' pastilles';
}

function exportPins(){
  var map = {};
  var pads = document.querySelectorAll('#schemaSvg .pad');
  Array.prototype.forEach.call(pads, function(g){
    var xy = xyOf(g);
    map[keyOf(g)] = [Math.round(xy[0]), Math.round(xy[1])];
  });
  var lines = ['/* Positions des pastilles - genere par placement.html */','window.PIN_POS = {'];
  Object.keys(map).sort().forEach(function(k){ lines.push('  "'+k+'": ['+map[k][0]+', '+map[k][1]+'],'); });
  lines.push('};','');
  var txt = lines.join('\n');
  $('out').value = txt;
  var blob = new Blob([txt], {type:'text/javascript'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'pinpos.js';
  document.body.appendChild(a); a.click(); a.remove();
}

var SVG_STYLE = '<style>'+
 'svg .wire{stroke:#7dd3fc;stroke-width:2;fill:none}'+
 'svg .junc{fill:#7dd3fc}'+
 'svg .lbl{fill:#93c5fd;font:600 11px sans-serif}'+
 'svg .lbl.rail{fill:#64748b;letter-spacing:1px}'+
 'svg .lbl.node{fill:#facc15;font:700 11px monospace}'+
 'svg .body{fill:#1e293b;stroke:#94a3b8;stroke-width:1.5}'+
 'svg .ref{fill:#e2e8f0;font:700 12px sans-serif;text-anchor:middle}'+
 'svg .val{fill:#93c5fd;font:400 10px monospace;text-anchor:middle}'+
 'svg .pintxt{fill:#cbd5e1;font:700 10px monospace}'+
 'svg .hot{fill:transparent;stroke:transparent}'+
 'svg .comp{cursor:pointer}'+
 'svg .pad .p{fill:#0f172a;stroke:#facc15;stroke-width:2}'+
 'svg .pad .pn{fill:#a16207;font:600 8px monospace;text-anchor:middle;opacity:0}'+
 'svg .pad:hover .pn{opacity:1}'+
 'svg .pad:hover .p{fill:#facc15}'+
 'svg .tp{cursor:crosshair}'+
 'svg text{font-family:"Segoe UI",sans-serif}'+
 '</style>';
function downloadSvg(){
  /* part du SVG courant (avec les pastilles deplacees) */
  var svg = document.getElementById('schemaSvg').outerHTML;
  if(svg.indexOf('<style') < 0){
    svg = svg.replace(/(<svg[^>]*>)/, '$1\n'+SVG_STYLE+'\n');
  }
  var blob = new Blob([svg], {type:'image/svg+xml'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'schematic.svg';
  document.body.appendChild(a); a.click(); a.remove();
}

function init(){
  inject();
  $('btnGrid').onclick = function(){ $('schemaWrap').classList.toggle('grid-bg'); this.classList.toggle('on'); };
  $('btnSvg').onclick = downloadSvg;
  $('btnSnap').onclick = function(){ doSnap = !doSnap; this.classList.toggle('on'); };
  $('btnExport').onclick = exportPins;
  $('btnReset').onclick = function(){
    window.PIN_POS = {};
    loadScript('schematic.js', function(){ inject(); });
  };
  $('btnRevert').onclick = function(){
    loadScript('pinpos.js', function(){ loadScript('schematic.js', function(){ inject(); }); });
  };
  exportPins();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
