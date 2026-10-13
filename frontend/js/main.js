(function () {
  'use strict';

  var ICONS = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };

  function getContainer() {
    var container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';

      container.setAttribute('role', 'status');
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'false');
      document.body.appendChild(container);
    }
    return container;
  }

  window.showToast = function (message, type, duration) {
    type = type || 'info';
    duration = typeof duration === 'number' ? duration : 3500;

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;

    var icon = document.createElement('i');
    icon.className = 'fa-solid ' + (ICONS[type] || ICONS.info);
    icon.setAttribute('aria-hidden', 'true');

    var text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    getContainer().appendChild(toast);

    window.setTimeout(function () {
      toast.classList.add('is-leaving');
      window.setTimeout(function () { toast.remove(); }, 250);
    }, duration);

    return toast;
  };

  window.requireAuth = function () {
    var token = localStorage.getItem('token');
    var userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      window.location.href = 'login.html';
      return false;
    }

    try {
      var user = JSON.parse(userStr);
      if (!user.isVerified) {
        window.location.href = 'verify-otp.html';
        return false;
      }
      return user;
    } catch (e) {
      localStorage.clear();
      window.location.href = 'login.html';
      return false;
    }
  };

  window.logout = function () {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  };
})();
