document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const alertBox = document.getElementById('alertBox');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = submitBtn.querySelector('.btn-text');
  const spinner = submitBtn.querySelector('.spinner');

  setLoading(true);

  try {
    const baseUrl = window.API_BASE_URL || '';
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      showAlert('Sign in successful! Redirecting...', 'success');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setTimeout(() => {
        if (data.user.role === 'admin') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      }, 800);
    } else {
      if (response.status === 403) {

        showAlert(data.message || 'Please verify your email before logging in.', 'error');
        localStorage.setItem('pendingEmail', email);
        setTimeout(() => {
          window.location.href = 'verify-otp.html';
        }, 1500);
      } else {
        showAlert(data.message || 'Invalid email or password', 'error');
        setLoading(false);
      }
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
