/**
 * Deprecated: the monolithic `views.js` has been split into multiple scripts under `static/js/views/`.
 *
 * This loader is kept so stale HTML caches that still reference `/static/js/views.js` keep working.
 * It loads the split scripts synchronously (during HTML parsing) using `document.write`.
 */
(function () {
  try {
    var src = (document.currentScript && document.currentScript.src) ? String(document.currentScript.src) : "";
    var qs = "";
    var qIdx = src.indexOf("?");
    if (qIdx >= 0) qs = src.substring(qIdx);

    var files = [
      "/static/js/views/templates.js",
      "/static/js/views/core.js",
      "/static/js/views/todos.js",
      "/static/js/views/notes.js"
    ];

    for (var i = 0; i < files.length; i++) {
      document.write('<script src="' + files[i] + qs + '"><\\/script>');
    }
  } catch (e) {
    try { console.error("Failed to load split view scripts", e); } catch (e2) {}
  }
})();


