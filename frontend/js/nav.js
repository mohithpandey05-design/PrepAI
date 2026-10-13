(function () {
  'use strict';

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('mobileNavToggle') || document.querySelector('.mobile-nav-toggle');
    var menu = document.getElementById('navLinksMenu') || document.querySelector('.nav-links');

    if (!toggle || !menu) return;

    var backdrop = document.querySelector('.nav-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'nav-backdrop';
      backdrop.setAttribute('hidden', '');
      document.body.appendChild(backdrop);
    }

    var lastFocused = null;

    function isOpen() {
      return menu.classList.contains('mobile-active');
    }

    function open() {
      lastFocused = document.activeElement;
      menu.classList.add('mobile-active');
      backdrop.removeAttribute('hidden');

      requestAnimationFrame(function () { backdrop.classList.add('open'); });
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('nav-open');

      var first = menu.querySelector(FOCUSABLE);
      if (first) first.focus();
    }

    function close(restoreFocus) {
      menu.classList.remove('mobile-active');
      backdrop.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-open');

      window.setTimeout(function () {
        if (!isOpen()) backdrop.setAttribute('hidden', '');
      }, 250);

      if (restoreFocus) {
        var target = lastFocused && document.contains(lastFocused) ? lastFocused : toggle;
        target.focus();
      }
    }

    toggle.setAttribute('aria-expanded', 'false');
    if (!toggle.hasAttribute('aria-controls') && menu.id) {
      toggle.setAttribute('aria-controls', menu.id);
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      isOpen() ? close(true) : open();
    });

    backdrop.addEventListener('click', function () { close(true); });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) close(false);
    });

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        close(true);
        return;
      }

      if (e.key !== 'Tab') return;

      var items = Array.prototype.filter.call(
        menu.querySelectorAll(FOCUSABLE),
        function (el) { return el.offsetParent !== null; }
      );
      if (!items.length) return;

      var first = items[0];
      var last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    var desktop = window.matchMedia('(min-width: 901px)');
    var onBreakpoint = function (e) { if (e.matches && isOpen()) close(false); };

    if (typeof desktop.addEventListener === 'function') {
      desktop.addEventListener('change', onBreakpoint);
    } else if (typeof desktop.addListener === 'function') {
      desktop.addListener(onBreakpoint);
    }
  });
})();
