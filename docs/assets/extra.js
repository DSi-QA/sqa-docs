(function () {
  var STORAGE_KEY = 'sqa-sidebar-width';
  var MIN = 160;
  var MAX = 520;

  function init() {
    var sidebar = document.querySelector('.md-sidebar--primary');
    if (!sidebar) return;

    // Restore saved width from last session
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) sidebar.style.width = saved + 'px';

    // Attach handle to body so it can be position:fixed and span full page height
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
