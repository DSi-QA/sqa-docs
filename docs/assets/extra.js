(function () {
  var STORAGE_KEY = 'sqa-sidebar-width';
  var MIN = 160;
  var MAX = 520;

  /* ── Sidebar resize ── */
  function initSidebar() {
    var sidebar = document.querySelector('.md-sidebar--primary');
    if (!sidebar) return;

    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) sidebar.style.width = saved + 'px';

    var handle = document.createElement('div');
    handle.className = 'sidebar-resize-handle';
    handle.title = 'Drag to resize sidebar';
    document.body.appendChild(handle);

    function positionHandle() {
      var rect = sidebar.getBoundingClientRect();
      var header = document.querySelector('.md-header');
      var headerHeight = header ? header.offsetHeight : 0;
      handle.style.left = (rect.right - 2) + 'px';
      handle.style.top = headerHeight + 'px';
    }

    positionHandle();
    window.addEventListener('resize', positionHandle);

    var active = false, x0 = 0, w0 = 0;

    handle.addEventListener('mousedown', function (e) {
      active = true;
      x0 = e.clientX;
      w0 = sidebar.offsetWidth;
      document.documentElement.classList.add('sidebar-resizing');
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!active) return;
      var w = Math.min(MAX, Math.max(MIN, w0 + e.clientX - x0));
      sidebar.style.width = w + 'px';
      positionHandle();
    });

    document.addEventListener('mouseup', function () {
      if (!active) return;
      active = false;
      document.documentElement.classList.remove('sidebar-resizing');
      localStorage.setItem(STORAGE_KEY, sidebar.offsetWidth);
    });
  }

  /* ── PDF centering ──
     After each PDF iframe loads, scroll the viewer horizontally so the
     page appears centered. Works same-origin; silently ignored cross-origin. */
  function centerPdfIframe(iframe) {
    try {
      var win = iframe.contentWindow;
      if (!win) return;
      // Chrome PDF viewer: the embed/viewer scrolls inside a shadow root;
      // try scrolling the iframe's own scrollable area first.
      var doc = win.document;
      var body = doc && doc.body;
      if (body && body.scrollWidth > body.clientWidth) {
        body.scrollLeft = (body.scrollWidth - body.clientWidth) / 2;
      }
      // Also try the documentElement
      var de = doc && doc.documentElement;
      if (de && de.scrollWidth > de.clientWidth) {
        de.scrollLeft = (de.scrollWidth - de.clientWidth) / 2;
      }
    } catch (e) { /* cross-origin — ignore */ }
  }

  function initPdfCentering() {
    document.querySelectorAll('.pdf-viewer iframe').forEach(function (iframe) {
      iframe.addEventListener('load', function () {
        // Small delay lets the PDF viewer finish its own layout
        setTimeout(function () { centerPdfIframe(iframe); }, 300);
      });
      // If already loaded (navigated back via bfcache)
      if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
        setTimeout(function () { centerPdfIframe(iframe); }, 300);
      }
    });
  }

  function init() {
    initSidebar();
    initPdfCentering();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
