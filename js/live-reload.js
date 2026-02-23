/**
 * Live Reload — dev only
 * Connects to the same-origin SSE endpoint and reloads the page
 * when content files change on disk. No-ops silently in production.
 */
(function () {
  var host = location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') return;

  var es = new EventSource('/__reload');
  var timer;

  es.onmessage = function (e) {
    if (e.data === 'connected') return;
    clearTimeout(timer);
    timer = setTimeout(function () { location.reload(); }, 350);
  };

  es.onerror = function () { es.close(); };
})();
