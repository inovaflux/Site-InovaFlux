/* ===== Wrapper SCORM 1.2 (calqué sur circuitcc) ===== */
var API = null;
try { API = window.parent.API; } catch (e) {}
if (!API) try { API = window.API; } catch (e) {}

function getAPI() {
  if (API) return API;
  if (window.parent && window.parent.API) API = window.parent.API;
  if (!API && window.parent.parent && window.parent.parent.API) API = window.parent.parent.API;
  if (!API && window.opener && window.opener.API) API = window.opener.API;
  if (!API) API = window.API;
  return API;
}
function scormInit() {
  var a = getAPI();
  if (!a || typeof a.LMSInitialize !== 'function') return false;
  try { return a.LMSInitialize(""); } catch (e) { return false; }
}
function scormSet(k, v) {
  var a = getAPI();
  if (!a || typeof a.LMSSetValue !== 'function') return false;
  try { return a.LMSSetValue(k, String(v)); } catch (e) { return false; }
}
function scormGet(k) {
  var a = getAPI();
  if (!a || typeof a.LMSGetValue !== 'function') return '';
  try { return a.LMSGetValue(k); } catch (e) { return ''; }
}
function scormCommit() {
  var a = getAPI();
  if (!a || typeof a.LMSCommit !== 'function') return;
  try { a.LMSCommit(""); } catch (e) {}
}
function scormFinish() {
  var a = getAPI();
  if (!a || typeof a.LMSFinish !== 'function') return;
  try { a.LMSFinish(""); } catch (e) {}
}

/*
 * Transmet un score a Moodle.
 * raw sur 100. Retourne true si transmis a un LMS.
 */
function scormReport(raw, max, status) {
  max = max || 100;
  status = status || 'completed';
  try {
    scormInit();
    scormSet('cmi.core.score.raw', Number(raw).toFixed(1));
    scormSet('cmi.core.score.max', String(max));
    scormSet('cmi.core.score.min', '0');
    scormSet('cmi.core.lesson_status', status);
    scormSet('cmi.core.lesson_location', 'submitted');
    scormCommit();
    return !!getAPI();
  } catch (e) {
    return false;
  }
}

window.addEventListener('unload', function () { try { scormFinish(); } catch (e) {} });
