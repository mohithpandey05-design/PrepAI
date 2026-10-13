document.getElementById('resetForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const email = urlParams.get('email');

  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  const alertBox = document.getElementById('alertBox');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = submitBtn.querySelector('.btn-text');
  const spinner = submitBtn.querySelector('.spinner');

  if (newPassword !== confirmPassword) {
    showAlert('Passwords do not match', 'error');
    return;
  }

  if (!token || !email) {
    showAlert('Invalid or missing reset token URL parameters.', 'error');
    return;
  }

  setLoading(true);

  try {
    const baseUrl = window.API_BASE_URL || '';
    const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, newPassword })
    });

    const data = await response.json();

    if (response.ok) {
      showAlert('Password reset successful! Redirecting to login...', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    } else {
      showAlert(data.message || 'Password reset failed', 'error');
      setLoading(false);
    }
  } catch (error) {
    showAlert('Network error. Please try again.', 'error');
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
