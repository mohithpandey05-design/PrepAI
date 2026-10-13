document.addEventListener('DOMContentLoaded', () => {
  const pendingEmail = localStorage.getItem('pendingEmail');
  const userEmailDisplay = document.getElementById('userEmailDisplay');
  if (pendingEmail && userEmailDisplay) {
    userEmailDisplay.textContent = pendingEmail;
  }

  const inputs = document.querySelectorAll('.otp-input');
  const alertBox = document.getElementById('alertBox');
  const submitBtn = document.getElementById('submitBtn');
  const resendBtn = document.getElementById('resendBtn');

  inputs.forEach((input, index) => {
    input.addEventListener('keyup', (e) => {
      if (e.key >= '0' && e.key <= '9') {
        if (index < inputs.length - 1) inputs[index + 1].focus();
      } else if (e.key === 'Backspace') {
        if (index > 0) inputs[index - 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
      if (/^\d{6}$/.test(pasteData)) {
        pasteData.split('').forEach((char, i) => {
          if (inputs[i]) inputs[i].value = char;
        });
        inputs[5].focus();
      }
    });
  });

  document.getElementById('otpForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    let otp = '';
    inputs.forEach(i => otp += i.value);

    if (otp.length !== 6) {
      showAlert('Please enter all 6 digits of the OTP', 'error');
      return;
    }

    setLoading(true);

    try {
      const baseUrl = window.API_BASE_URL || '';
      const response = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, otp })
      });

      const data = await response.json();

      if (response.ok) {
        showAlert('Email verified successfully! Logging you in...', 'success');

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.removeItem('pendingEmail');

        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1000);
      } else {
        showAlert(data.message || 'Verification failed', 'error');
        setLoading(false);
      }
    } catch (error) {
      showAlert('Network error. Please try again.', 'error');
      setLoading(false);
    }
  });

  let cooldownTimer = null;
  let cooldownSeconds = 0;

  function startResendCooldown(seconds = 60) {
    cooldownSeconds = seconds;
    resendBtn.disabled = true;
    resendBtn.style.opacity = '0.5';
    resendBtn.style.cursor = 'not-allowed';

    if (cooldownTimer) clearInterval(cooldownTimer);

    cooldownTimer = setInterval(() => {
      cooldownSeconds--;
      resendBtn.textContent = `Resend OTP (${cooldownSeconds}s)`;
      if (cooldownSeconds <= 0) {
        clearInterval(cooldownTimer);
        resendBtn.disabled = false;
        resendBtn.style.opacity = '1';
        resendBtn.style.cursor = 'pointer';
        resendBtn.textContent = 'Resend OTP';
      }
    }, 1000);
  }

  resendBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (cooldownSeconds > 0) return;

    try {
      const baseUrl = window.API_BASE_URL || '';
      const response = await fetch(`${baseUrl}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail })
      });
      const data = await response.json();
      if (response.ok) {
        showAlert('New OTP sent to your email!', 'success');
        if (data.devOtp) console.log(`[DEV MODE] Resent OTP: ${data.devOtp}`);
        startResendCooldown(60);
      } else {
        showAlert(data.message || 'Resend failed', 'error');
      }
    } catch (err) {
      showAlert('Network error.', 'error');
    }
  });

  function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = `toast ${type}`;
    alertBox.classList.remove('hidden');
  }

  function setLoading(isLoading) {
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = submitBtn.querySelector('.spinner');
    if (isLoading) {
      btnText.classList.add('hidden');
      spinner.classList.remove('hidden');
      submitBtn.disabled = true;
    } else {
      btnText.classList.remove('hidden');
      spinner.classList.add('hidden');
      submitBtn.disabled = false;
    }
  }
});
