document.getElementById('forgotForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const alertBox = document.getElementById('alertBox');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = submitBtn.querySelector('.btn-text');
  const spinner = submitBtn.querySelector('.spinner');

  setLoading(true);

  try {
    const baseUrl = window.API_BASE_URL || '';
    const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (response.ok) {
      showAlert('If an account exists, a reset link has been sent to your email.', 'success');
      if (data.devToken) console.log(`[DEV MODE] Reset token: ${data.devToken}`);
      setLoading(false);
    } else {
      showAlert(data.message || 'Failed to send reset email', 'error');
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
