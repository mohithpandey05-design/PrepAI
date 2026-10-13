document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const baseUrl = window.API_BASE_URL || '';

  const startView = document.getElementById('startView');
  const testView = document.getElementById('testView');
  const resultView = document.getElementById('resultView');

  const startTestBtn = document.getElementById('startTestBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitTestBtn = document.getElementById('submitTestBtn');

  const questionCategory = document.getElementById('questionCategory');
  const questionDifficulty = document.getElementById('questionDifficulty');
  const questionText = document.getElementById('questionText');
  const optionsContainer = document.getElementById('optionsContainer');
  const progressText = document.getElementById('progressText');
  const testProgressBar = document.getElementById('testProgressBar');
  const timerDisplay = document.getElementById('timerDisplay');
  const questionPalette = document.getElementById('questionPalette');
  const timerCard = document.getElementById('timerCard');

  const notify = (msg, type) =>
    (window.showToast ? window.showToast(msg, type || 'info') : alert(msg));

  let questions = [];
  let currentQuestionIndex = 0;
  let answers = {};
  let timerInterval;
  let totalSeconds = 15 * 60;

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
  });

  startTestBtn.addEventListener('click', async () => {
    const btnText = startTestBtn.querySelector('.btn-text');
    const spinner = startTestBtn.querySelector('.spinner');
    btnText.classList.add('hidden');
    spinner.classList.remove('hidden');
    startTestBtn.disabled = true;

    try {
      const response = await fetch(`${baseUrl}/api/aptitude/start`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (response.ok && data.questions && data.questions.length > 0) {
        questions = data.questions;
        totalSeconds = (data.totalDurationMinutes || 15) * 60;

        startView.classList.add('hidden');
        testView.classList.remove('hidden');

        buildPalette();
        renderQuestion();
        startTimer();
      } else {
        notify(data.message || 'Failed to start test.', 'error');
      }
    } catch (error) {
      notify('Network error while starting test.', 'error');
    } finally {
      btnText.classList.remove('hidden');
      spinner.classList.add('hidden');
      startTestBtn.disabled = false;
    }
  });

  function buildPalette() {
    questionPalette.innerHTML = '';
    questions.forEach((q, idx) => {
      const btn = document.createElement('button');
      btn.className = `palette-btn ${idx === 0 ? 'active' : ''}`;
      btn.textContent = idx + 1;
      btn.id = `palette-btn-${idx}`;
      btn.addEventListener('click', () => {
        currentQuestionIndex = idx;
        renderQuestion();
      });
      questionPalette.appendChild(btn);
    });
  }

  function updatePaletteStates() {
    let answeredCount = 0;
    questions.forEach((q, idx) => {
      const btn = document.getElementById(`palette-btn-${idx}`);
      if (!btn) return;

      btn.classList.remove('active', 'answered');

      if (idx === currentQuestionIndex) {
        btn.classList.add('active');
      }
      if (answers[q._id]) {
        btn.classList.add('answered');
        answeredCount++;
      }
    });

    const answeredEl = document.getElementById('answeredCountDisplay');
    const unansweredEl = document.getElementById('unansweredCountDisplay');
    if (answeredEl) answeredEl.textContent = answeredCount;
    if (unansweredEl) unansweredEl.textContent = Math.max(0, questions.length - answeredCount);
  }

  function renderQuestion() {
    const q = questions[currentQuestionIndex];
    questionCategory.textContent = (q.category || 'Quantitative').toUpperCase();

    if (q.difficulty) {
      questionDifficulty.textContent = q.difficulty.toUpperCase();
      questionDifficulty.className = `badge badge-${q.difficulty.toLowerCase() === 'easy' ? 'success' : q.difficulty.toLowerCase() === 'hard' ? 'danger' : 'warning'} ml-2`;
    }

    questionText.textContent = `${currentQuestionIndex + 1}. ${q.question}`;
    optionsContainer.innerHTML = '';

    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      if (answers[q._id] === opt) {
        btn.classList.add('selected');
      }

      const charLabel = String.fromCharCode(65 + idx);

      const indicator = document.createElement('div');
      indicator.className = 'option-indicator';
      indicator.textContent = charLabel;
      const optText = document.createElement('span');
      optText.textContent = opt;
      btn.append(indicator, optText);

      btn.addEventListener('click', () => {
        document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        answers[q._id] = opt;
        updatePaletteStates();
      });

      optionsContainer.appendChild(btn);
    });

    progressText.textContent = `${currentQuestionIndex + 1} / ${questions.length}`;
    testProgressBar.style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;

    const pctEl = document.getElementById('progressPercentageText');
    if (pctEl) pctEl.textContent = `${Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%`;

    prevBtn.disabled = currentQuestionIndex === 0;

    if (currentQuestionIndex === questions.length - 1) {
      nextBtn.classList.add('hidden');
      submitTestBtn.classList.remove('hidden');
    } else {
      nextBtn.classList.remove('hidden');
      submitTestBtn.classList.add('hidden');
    }

    updatePaletteStates();
  }

  prevBtn.addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      renderQuestion();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentQuestionIndex < questions.length - 1) {
      currentQuestionIndex++;
      renderQuestion();
    }
  });

  function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      totalSeconds--;
      updateTimerDisplay();

      if (totalSeconds <= 0) {
        clearInterval(timerInterval);
        notify('Time is up. Auto-submitting your answers.', 'warning');
        submitTest();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    if (timerCard) timerCard.classList.toggle('is-critical', totalSeconds <= 120);
  }

  submitTestBtn.addEventListener('click', submitTest);

  async function submitTest() {
    clearInterval(timerInterval);

    const btnText = submitTestBtn.querySelector('.btn-text');
    const spinner = submitTestBtn.querySelector('.spinner');
    if (btnText) btnText.classList.add('hidden');
    if (spinner) spinner.classList.remove('hidden');
    submitTestBtn.disabled = true;

    const formattedAnswers = questions.map(q => ({
      questionId: q._id,
      selectedOption: answers[q._id] || null
    }));

    try {
      const response = await fetch(`${baseUrl}/api/aptitude/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers: formattedAnswers })
      });
      const data = await response.json();

      if (response.ok) {
        testView.classList.add('hidden');
        resultView.classList.remove('hidden');
        renderResult(data.result);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        notify(data.message || 'Submission failed.', 'error');
        resetSubmitButton();
      }
    } catch (error) {
      notify('Network error during submission.', 'error');
      resetSubmitButton();
    }
  }

  function resetSubmitButton() {
    const btnText = submitTestBtn.querySelector('.btn-text');
    const spinner = submitTestBtn.querySelector('.spinner');
    if (btnText) btnText.classList.remove('hidden');
    if (spinner) spinner.classList.add('hidden');
    submitTestBtn.disabled = false;
  }

  function renderResult(result) {
    const pct = result.percentage || 0;
    const isPass = result.status === 'PASS';

    const scoreEl = document.getElementById('resultPercentage');
    scoreEl.textContent = `${pct}%`;
    scoreEl.classList.toggle('is-fail', !isPass);

    const statusEl = document.getElementById('resultStatus');
    statusEl.textContent = `Assessment result: ${result.status || (isPass ? 'PASS' : 'FAIL')}`;
    statusEl.classList.toggle('is-pass', isPass);
    statusEl.classList.toggle('is-fail', !isPass);

    const iconEl = document.getElementById('resultIcon');
    if (iconEl) {
      iconEl.classList.toggle('is-fail', !isPass);
      iconEl.innerHTML = `<i class="fa-solid ${isPass ? 'fa-award' : 'fa-rotate-right'}" aria-hidden="true"></i>`;
    }

    const titleEl = document.getElementById('resultTitle');
    const subtitleEl = document.getElementById('resultSubtitle');
    if (titleEl) titleEl.textContent = isPass ? 'Aptitude Round Cleared' : 'Aptitude Round Not Cleared';
    if (subtitleEl) {
      subtitleEl.textContent = isPass
        ? 'You have qualified for the coding round.'
        : 'You need 60% to advance. Review the basics and try again.';
    }

    document.getElementById('resultDetails').innerHTML = `
      <div class="stat-box">
        <span>Correct</span>
        <div class="is-success">${result.correctAnswers || result.score}</div>
      </div>
      <div class="stat-box">
        <span>Incorrect</span>
        <div class="is-danger">${result.wrongAnswers || 0}</div>
      </div>
      <div class="stat-box">
        <span>Total</span>
        <div>${result.totalQuestions}</div>
      </div>
    `;

    const proceedBtn = document.getElementById('proceedCodingBtn');
    if (!isPass) {
      proceedBtn.classList.replace('btn-primary', 'btn-secondary');
      proceedBtn.innerHTML = '<i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Retry Test';
      proceedBtn.href = 'aptitude.html';
    }
  }
});
