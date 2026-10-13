(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var toggles = document.querySelectorAll('[data-toggle-password]');

    Array.prototype.forEach.call(toggles, function (btn) {
      btn.addEventListener('click', function () {
        var input = document.getElementById(btn.getAttribute('data-toggle-password'));
        if (!input) return;

        var showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');

        var icon = btn.querySelector('i');
        if (icon) icon.className = showing ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
      });
    });
  });
})();
