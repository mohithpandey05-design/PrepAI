document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  const alertBox = document.getElementById('alertBox');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = submitBtn.querySelector('.btn-text');
  const spinner = submitBtn.querySelector('.spinner');

  if (password !== confirmPassword) {
    showAlert('Passwords do not match', 'error');
    return;
  }
  if (password.length < 8) {
    showAlert('Password must be at least 8 characters', 'error');
    return;
  }

  setLoading(true);

  try {
    const baseUrl = window.API_BASE_URL || '';
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fullName, email, password })
    });

    const data = await response.json();

    if (response.ok || response.status === 201) {
      localStorage.setItem('pendingEmail', email);
      showAlert('Account created! Verification OTP sent to your email.', 'success');

      if (data.devOtp) {
        console.log(`[DEV MODE] OTP Code: ${data.devOtp}`);
      }

      setTimeout(() => {
        window.location.href = 'verify-otp.html';
      }, 1200);
    } else {
      showAlert(data.message || 'Registration failed', 'error');
      setLoading(false);
    }
  } catch (error) {
    showAlert('Server connection failed. Please ensure the backend server is running (npm run dev in backend directory).', 'error');
    setLoading(false);
  }

  function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = `toast ${type}`;
    alertBox.classList.remove('hidden');
  }

  function setLoading(isLoading) {
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
