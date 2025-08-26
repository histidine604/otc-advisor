(function () {
  function createOverlay() {
    if (document.getElementById('__debug_overlay')) return document.getElementById('__debug_overlay');
    const o = document.createElement('div');
    o.id = '__debug_overlay';
    o.style.position = 'fixed';
    o.style.right = '12px';
    o.style.bottom = '12px';
    o.style.zIndex = 999999;
    o.style.maxWidth = 'min(90vw,560px)';
    o.style.background = 'rgba(220,38,38,0.95)';
    o.style.color = 'white';
    o.style.padding = '12px 14px';
    o.style.borderRadius = '10px';
    o.style.fontFamily = 'system-ui, sans-serif';
    o.style.fontSize = '13px';
    o.style.boxShadow = '0 8px 30px rgba(2,6,23,0.4)';
    o.style.lineHeight = '1.3';
    o.style.whiteSpace = 'pre-wrap';
    o.style.cursor = 'pointer';
    o.title = 'Click to hide';
    o.addEventListener('click', () => (o.style.display = 'none'));
    document.body.appendChild(o);
    return o;
  }

  function show(message) {
    try {
      const o = createOverlay();
      o.textContent = String(message).slice(0, 2000);
      o.style.display = 'block';
      console.error('[debug-overlay]', message);
    } catch (e) {
      console.error('debug overlay failed', e);
    }
  }

  window.addEventListener('error', function (ev) {
    const m = ev && ev.error ? (ev.error.stack || ev.error.message || String(ev.error)) : (ev.message || 'Unknown error');
    show('Error: ' + m);
  });

  window.addEventListener('unhandledrejection', function (ev) {
    const r = ev.reason;
    show('Unhandled promise rejection: ' + (r && (r.stack || r.message) || String(r)));
  });

  // If the page still says "Loading" after a short delay, show a helpful hint
  setTimeout(function () {
    var root = document.getElementById('root');
    if (!root) return;
    var txt = (root.innerText || root.textContent || '').trim().toLowerCase();
    if (txt && txt.indexOf('loading') !== -1) {
      show('App still showing "Loading…". Check console (F12) and network tab for errors (404 or syntax error).');
    }
  }, 1400);
})();
