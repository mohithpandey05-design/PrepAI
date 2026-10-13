document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return; }

  const baseUrl = window.API_BASE_URL || '';

  const notify = (msg, type) =>
    (window.showToast ? window.showToast(msg, type || 'info') : alert(msg));

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'login.html';
    });
  }

  let editor = ace.edit("editor");
  editor.setTheme("ace/theme/tomorrow_night");
  editor.session.setMode("ace/mode/python");
  editor.setOptions({
    fontSize: "14px",
    showPrintMargin: false,
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    tabSize: 4,
    useSoftTabs: true
  });

  const langSelect = document.getElementById('langSelect');
  langSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    const modes = { cpp: 'c_cpp', java: 'java', python: 'python', javascript: 'javascript' };
    editor.session.setMode(`ace/mode/${modes[val]}`);

    if (questions[currentQIndex] && questions[currentQIndex].starterCode) {
      editor.setValue(questions[currentQIndex].starterCode[val] || '');
      editor.clearSelection();
    }
  });

  document.getElementById('resetCodeBtn').addEventListener('click', () => {
    const val = langSelect.value;
    if (questions[currentQIndex] && questions[currentQIndex].starterCode) {
      editor.setValue(questions[currentQIndex].starterCode[val] || '');
      editor.clearSelection();
    }
  });

  let questions = [];
  let currentQIndex = 0;
  let userResults = {};

  const probListModal = document.getElementById('probListModal');
  const closeProbListModalBtn = document.getElementById('closeProbListModalBtn');
  const probListTableBody = document.getElementById('probListTableBody');

  if (document.getElementById('probListBtn')) {
    document.getElementById('probListBtn').addEventListener('click', () => {
      renderProblemListModal();
      if (probListModal) probListModal.classList.remove('hidden');
    });
  }

  if (closeProbListModalBtn) {
    closeProbListModalBtn.addEventListener('click', () => {
      if (probListModal) probListModal.classList.add('hidden');
    });
  }

  function renderProblemListModal() {
    if (!probListTableBody || !questions) return;
    probListTableBody.innerHTML = '';
    questions.forEach((q, idx) => {
      const tr = document.createElement('tr');
      const diffClass = (q.difficulty || 'Easy').toLowerCase();
      const res = userResults[q._id];
      const statusHtml = res && (res.status === 'Accepted' || res.status === 'PASS')
        ? '<span class="badge badge-success"><i class="fa-solid fa-check"></i> Solved</span>'
        : (idx === currentQIndex ? '<span class="badge badge-primary">Active</span>' : '<span class="pl-status-none">Unattempted</span>');

      tr.innerHTML = `
        <td class="pl-idx">${idx + 1}</td>
        <td class="pl-title">${escapeHtml(q.title)}</td>
        <td><span class="diff-badge badge-${diffClass}">${escapeHtml(q.difficulty || 'Easy')}</span></td>
        <td class="pl-topics">${escapeHtml((q.topics || q.tags || []).join(', '))}</td>
        <td class="pl-action">${statusHtml}</td>
      `;

      tr.addEventListener('click', () => {
        loadQuestion(idx);
        if (probListModal) probListModal.classList.add('hidden');
      });

      probListTableBody.appendChild(tr);
    });
  }

  const startTestBtn = document.getElementById('startTestBtn');
  startTestBtn.addEventListener('click', async () => {
    const btnText = startTestBtn.querySelector('.btn-text');
    const spinner = startTestBtn.querySelector('.spinner');
    if (btnText) btnText.classList.add('hidden');
    if (spinner) spinner.classList.remove('hidden');
    startTestBtn.disabled = true;

    try {
      const res = await fetch(`${baseUrl}/api/coding/start`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.questions && data.questions.length > 0) {
        questions = data.questions;

        if (data.selectedRole) {
          const badge = document.getElementById('topRoleBadge');
          if (badge) badge.innerHTML = `<i class="fa-solid fa-user-tag"></i> Target Role: ${data.selectedRole}`;
        }

        document.getElementById('startView').classList.add('hidden');
        document.getElementById('codingWorkspace').classList.remove('hidden');

        loadQuestion(0);
      } else {
        notify(data.message || 'Failed to start coding round', 'error');
      }
    } catch (e) {
      notify('Network error starting coding assessment.', 'error');
    } finally {
      if (btnText) btnText.classList.remove('hidden');
      if (spinner) spinner.classList.add('hidden');
      startTestBtn.disabled = false;
    }
  });

  document.getElementById('prevProbBtn').addEventListener('click', () => {
    if (currentQIndex > 0) loadQuestion(currentQIndex - 1);
  });
  document.getElementById('nextProbBtn').addEventListener('click', () => {
    if (currentQIndex < questions.length - 1) loadQuestion(currentQIndex + 1);
  });
  document.getElementById('shuffleProbBtn').addEventListener('click', () => {
    const rand = Math.floor(Math.random() * questions.length);
    loadQuestion(rand);
  });

  function loadQuestion(index) {
    currentQIndex = index;
    const q = questions[index];

    document.getElementById('probTitle').textContent = `${index + 1}. ${q.title}`;

    const badge = document.getElementById('probDifficulty');
    const diff = (q.difficulty || 'Easy').toLowerCase();
    badge.textContent = q.difficulty || 'Easy';
    badge.className = `diff-badge badge-${diff}`;

    const topicsContainer = document.getElementById('probTopics');
    topicsContainer.innerHTML = '';
    const topicsList = q.topics && q.topics.length > 0 ? q.topics : (q.tags || ['DSA']);
    topicsList.forEach(t => {
      const span = document.createElement('span');
      span.className = 'topic-chip';
      span.innerHTML = `<i class="fa-solid fa-tag"></i> ${t}`;
      topicsContainer.appendChild(span);
    });

    document.getElementById('metaAcceptance').textContent = q.acceptanceRate || '84.2%';
    document.getElementById('metaSubmissions').textContent = typeof q.submissionsCount === 'number' ? q.submissionsCount.toLocaleString() : (q.submissionsCount || '1,240');
    document.getElementById('metaRole').textContent = q.role || 'Software Engineer';

    document.getElementById('probDesc').textContent = q.description;
    document.getElementById('probInputFmt').textContent = q.inputFormat || 'Standard input stdin';
    document.getElementById('probOutputFmt').textContent = q.outputFormat || 'Standard output stdout';
    document.getElementById('probConstraints').textContent = q.constraints || 'Standard execution limits apply.';

    const followUpBlock = document.getElementById('followUpBlock');
    const followUpText = document.getElementById('probFollowUp');
    if (q.followUp) {
      followUpText.textContent = q.followUp;
      followUpBlock.classList.remove('hidden');
    } else {
      followUpBlock.classList.add('hidden');
    }

    const exContainer = document.getElementById('examplesContainer');
    const publicCases = (q.testCases && q.testCases.length > 0)
      ? q.testCases
      : [{ input: q.sampleInput, output: q.sampleOutput, explanation: 'Sample test case execution.' }];

    let exHtml = '';
    publicCases.forEach((tc, idx) => {
      exHtml += `
        <div class="example-card">
          <div class="example-card-title">
            <i class="fa-solid fa-code-branch" aria-hidden="true"></i> Example ${idx + 1}
          </div>
          <div class="example-field">
            <span class="field-label">Input:</span>
            <pre>${escapeHtml(tc.input || '')}</pre>
          </div>
          <div class="example-field">
            <span class="field-label">Output:</span>
            <pre>${escapeHtml(tc.output || tc.expectedOutput || '')}</pre>
          </div>
          ${tc.explanation ? `
            <div class="example-field">
              <span class="field-label">Explanation:</span>
              <div class="example-explanation">${escapeHtml(tc.explanation)}</div>
            </div>
          ` : ''}
        </div>
      `;
    });
    exContainer.innerHTML = exHtml;

    renderAccordions(q);

    const casesBar = document.getElementById('tcInputCasesBar');
    casesBar.innerHTML = '';
    publicCases.forEach((tc, idx) => {
      const btn = document.createElement('button');
      btn.className = `tc-case-pill ${idx === 0 ? 'active' : ''}`;
      btn.textContent = `Case ${idx + 1}`;
      btn.addEventListener('click', () => {
        document.querySelectorAll('#tcInputCasesBar .tc-case-pill').forEach((b, i) => {
          if (i === idx) b.classList.add('active');
          else b.classList.remove('active');
        });
        document.getElementById('testcaseInputDisplay').textContent = tc.input || '';
        document.getElementById('testcaseOutputDisplay').textContent = tc.output || tc.expectedOutput || '';
      });
      casesBar.appendChild(btn);
    });

    if (publicCases.length > 0) {
      document.getElementById('testcaseInputDisplay').textContent = publicCases[0].input || '';
      document.getElementById('testcaseOutputDisplay').textContent = publicCases[0].output || publicCases[0].expectedOutput || '';
    }

    const currentLang = langSelect.value;
    editor.setValue(q.starterCode ? (q.starterCode[currentLang] || '') : '');
    editor.clearSelection();

    document.getElementById('idleState').classList.remove('hidden');
    document.getElementById('activeState').classList.add('hidden');
    switchDrawerTab('testcase');
  }

  function renderAccordions(q) {

    const hintsCount = document.getElementById('hintsCount');
    const hintsBody = document.getElementById('hintsBody');
    const btnToggleHints = document.getElementById('btnToggleHints');
    const hintsCard = document.getElementById('accordionHintsCard');

    if (q.hints && q.hints.length > 0) {
      hintsCount.textContent = q.hints.length;
      hintsBody.innerHTML = q.hints.map((h, i) => `
        <div class="hint-box">
          <strong>Hint ${i + 1}:</strong> ${escapeHtml(h)}
        </div>
      `).join('');
      hintsCard.classList.remove('hidden');
    } else {
      hintsCard.classList.add('hidden');
    }

    bindAccordion(btnToggleHints, hintsCard, hintsBody);

    const similarBody = document.getElementById('similarBody');
    const btnToggleSimilar = document.getElementById('btnToggleSimilar');
    const similarCard = document.getElementById('accordionSimilarCard');

    if (q.similarQuestions && q.similarQuestions.length > 0) {
      similarBody.innerHTML = q.similarQuestions.map(sq => `
        <div class="similar-row">
          <span class="similar-title">${escapeHtml(sq.title)}</span>
          <span class="diff-badge badge-${(sq.difficulty || 'Easy').toLowerCase()}">${escapeHtml(sq.difficulty || 'Easy')}</span>
        </div>
      `).join('');
      similarCard.classList.remove('hidden');
    } else {
      similarCard.classList.add('hidden');
    }

    bindAccordion(btnToggleSimilar, similarCard, similarBody);

    bindAccordion(
      document.getElementById('btnToggleDiscussion'),
      document.getElementById('accordionDiscussionCard'),
      document.getElementById('discussionBody')
    );
  }

  function bindAccordion(button, card, body) {
    if (!button || button.hasListener) return;
    button.hasListener = true;
    button.addEventListener('click', () => {
      const open = card.classList.toggle('open');
      body.classList.toggle('hidden', !open);
      button.setAttribute('aria-expanded', String(open));
    });
  }

  const tabTestcase = document.getElementById('tabTestcase');
  const tabTestResult = document.getElementById('tabTestResult');
  const testcaseContent = document.getElementById('testcaseTabContent');
  const testResultContent = document.getElementById('testResultTabContent');

  function switchDrawerTab(tab) {
    if (tab === 'testcase') {
      tabTestcase.classList.add('active');
      tabTestResult.classList.remove('active');
      testcaseContent.classList.remove('hidden');
      testResultContent.classList.add('hidden');
    } else {
      tabTestResult.classList.add('active');
      tabTestcase.classList.remove('active');
      testResultContent.classList.remove('hidden');
      testcaseContent.classList.add('hidden');
    }
  }

  tabTestcase.addEventListener('click', () => switchDrawerTab('testcase'));
  tabTestResult.addEventListener('click', () => switchDrawerTab('testresult'));

  const toggleDrawerBtn = document.getElementById('toggleDrawerBtn');
  let isDrawerCollapsed = false;
  toggleDrawerBtn.addEventListener('click', () => {
    const drawerSection = document.getElementById('testDrawer');
    if (!isDrawerCollapsed) {
      drawerSection.classList.add('collapsed');
      toggleDrawerBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
      isDrawerCollapsed = true;
    } else {
      drawerSection.classList.remove('collapsed');
      toggleDrawerBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
      isDrawerCollapsed = false;
    }
  });

  function expandDrawerIfCollapsed() {
    if (isDrawerCollapsed) {
      const drawerSection = document.getElementById('testDrawer');
      drawerSection.classList.remove('collapsed');
      toggleDrawerBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
      isDrawerCollapsed = false;
    }
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // RUN CODE HANDLER
  document.getElementById('runCodeBtn').addEventListener('click', async () => {
    const code = editor.getValue();
    const q = questions[currentQIndex];
    const lang = langSelect.value;

    switchDrawerTab('testresult');
    expandDrawerIfCollapsed();

    const activeState = document.getElementById('activeState');
    const idleState = document.getElementById('idleState');

    idleState.classList.add('hidden');
    activeState.classList.remove('hidden');
    activeState.innerHTML = `
      <div class="drawer-running">
        <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
        Executing code against the public sample test cases…
      </div>
    `;

    try {
      const res = await fetch(`${baseUrl}/api/coding/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ questionId: q._id, language: lang, code, testCases: q.testCases })
      });
      const data = await res.json();
      if (res.ok) {
        renderRunResult(data);
      } else {
        renderError(data.message || 'Execution error');
      }
    } catch (e) {
      renderError('Network error connecting to execution server.');
    }
  });

  function renderRunResult(data) {
    const activeState = document.getElementById('activeState');

    if (data.status === 'Compilation Error' || data.compileOutput) {
      activeState.innerHTML = `
        <div class="res-metrics-row">
          <span class="res-status-chip status-compile"><i class="fa-solid fa-triangle-exclamation"></i> Compilation Error</span>
        </div>
        <div class="fmt-box is-error">
          <pre>${escapeHtml(data.compileOutput || data.stderr || 'Syntax error occurred during compilation.')}</pre>
        </div>
      `;
      return;
    }

    if (data.status === 'Runtime Error' && (!data.testCases || data.testCases.length === 0)) {
      activeState.innerHTML = `
        <div class="res-metrics-row">
          <span class="res-status-chip status-wrong"><i class="fa-solid fa-bug"></i> Runtime Error</span>
        </div>
        <div class="fmt-box is-error">
          <pre>${escapeHtml(data.stderr || data.yourOutput || 'Exception occurred during execution.')}</pre>
        </div>
      `;
      return;
    }

    const testCasesList = data.testCases && data.testCases.length > 0 ? data.testCases : [{
      testCaseNum: 1,
      passed: data.passed || data.status === 'Accepted',
      input: data.input,
      yourOutput: data.yourOutput,
      expectedOutput: data.expectedOutput,
      status: data.status
    }];

    const passedCount = data.passedTestCases !== undefined ? data.passedTestCases : (data.passed ? testCasesList.length : 0);
    const totalCount = data.totalTestCases !== undefined ? data.totalTestCases : testCasesList.length;
    const isOverallAccepted = (passedCount === totalCount && data.status !== 'Compilation Error' && data.status !== 'Runtime Error');

    let html = `
      <div class="res-metrics-row">
        <div class="flex items-center gap-3">
          <span class="res-status-chip ${isOverallAccepted ? 'status-accepted' : 'status-wrong'}">
            <i class="fa-solid fa-${isOverallAccepted ? 'circle-check' : 'circle-xmark'}"></i> ${isOverallAccepted ? 'Accepted' : (data.status === 'Runtime Error' ? 'Runtime Error' : 'Wrong Answer')}
          </span>
          <span class="res-pass-counter">Passed: ${passedCount} / ${totalCount} Public Test Cases</span>
        </div>
      </div>
    `;

    html += `<div class="tc-cases-bar mb-2" id="runResultTabs">`;
    testCasesList.forEach((tc, idx) => {
      const icon = tc.passed ? '✓' : '✗';
      html += `
        <button class="tc-case-pill ${idx === 0 ? 'active' : ''} ${tc.passed ? 'pass-pill' : 'fail-pill'}" onclick="window.selectRunCaseTab(${idx})">
          ${icon} Case ${tc.testCaseNum || (idx + 1)}
        </button>
      `;
    });
    html += `</div>`;
    html += `<div id="runResultCaseContent"></div>`;

    activeState.innerHTML = html;

    window.currentRunTestCases = testCasesList;
    window.selectRunCaseTab = function(tabIdx) {
      const tcList = window.currentRunTestCases;
      if (!tcList || !tcList[tabIdx]) return;

      document.querySelectorAll('#runResultTabs .tc-case-pill').forEach((btn, i) => {
        if (i === tabIdx) btn.classList.add('active');
        else btn.classList.remove('active');
      });

      const tc = tcList[tabIdx];
      const contentEl = document.getElementById('runResultCaseContent');
      if (tc.status === 'Compilation Error' || tc.compileOutput) {
        contentEl.innerHTML = `
          <div class="fmt-box is-error">
            <pre>${escapeHtml(tc.compileOutput || 'Compilation Error')}</pre>
          </div>
        `;
      } else {
        contentEl.innerHTML = `
          <div class="output-diff-grid">
            <div class="diff-field-card">
              <label><i class="fa-solid fa-right-to-bracket"></i> Input</label>
              <pre>${escapeHtml(tc.input || '')}</pre>
            </div>
            <div class="diff-field-card">
              <label><i class="fa-solid fa-terminal"></i> Your Output</label>
              <pre class="${tc.passed ? 'is-pass' : 'is-fail'}">${escapeHtml(tc.yourOutput !== null && tc.yourOutput !== undefined ? tc.yourOutput : '(Empty)')}</pre>
            </div>
            <div class="diff-field-card">
              <label><i class="fa-solid fa-right-from-bracket"></i> Expected Output</label>
              <pre class="is-expected">${escapeHtml(tc.expectedOutput || tc.output || '')}</pre>
            </div>
          </div>
        `;
      }
    };

    window.selectRunCaseTab(0);
  }

  function renderError(msg) {
    const activeState = document.getElementById('activeState');
    activeState.innerHTML = `
      <div class="res-metrics-row">
        <span class="res-status-chip status-wrong"><i class="fa-solid fa-triangle-exclamation"></i> Error</span>
      </div>
      <div class="fmt-box is-error">
        <pre>${escapeHtml(msg)}</pre>
      </div>
    `;
  }

  // SUBMIT SOLUTION HANDLER
  document.getElementById('submitCodeBtn').addEventListener('click', async () => {
    const code = editor.getValue();
    const lang = langSelect.value;
    const qId = questions[currentQIndex]._id;

    switchDrawerTab('testresult');
    expandDrawerIfCollapsed();

    const activeState = document.getElementById('activeState');
    const idleState = document.getElementById('idleState');

    idleState.classList.add('hidden');
    activeState.classList.remove('hidden');
    activeState.innerHTML = `
      <div class="drawer-running">
        <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
        Submitting code and evaluating against the hidden test cases…
      </div>
    `;

    const submitBtn = document.getElementById('submitCodeBtn');
    const origHtml = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Submitting...';
    submitBtn.disabled = true;

    try {
      const res = await fetch(`${baseUrl}/api/coding/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ questionId: qId, language: lang, code })
      });
      const data = await res.json();
      if (res.ok) {
        userResults[qId] = data.result;
        renderSubmitResult(data.result);
      } else {
        renderError(data.message || 'Submission failed');
      }
    } catch (e) {
      renderError('Network error during submission.');
    } finally {
      submitBtn.innerHTML = origHtml;
      submitBtn.disabled = false;
    }
  });

  function renderSubmitResult(result) {
    const activeState = document.getElementById('activeState');
    const { status, passedTestCases, totalTestCases, testCases } = result;

    if (status === 'Compilation Error' || (testCases && testCases.length > 0 && testCases[0].status === 'Compilation Error')) {
      const compileErr = (testCases && testCases[0].compileOutput) || 'Compilation Error';
      activeState.innerHTML = `
        <div class="res-metrics-row">
          <span class="res-status-chip status-compile"><i class="fa-solid fa-triangle-exclamation"></i> Compilation Error</span>
        </div>
        <div class="fmt-box is-error">
          <pre>${escapeHtml(compileErr)}</pre>
        </div>
      `;
      return;
    }

    const isPass = (status === 'Accepted' || status === 'PASS' || passedTestCases === totalTestCases);
    const publicCount = questions[currentQIndex].testCases ? questions[currentQIndex].testCases.length : 3;
    const hiddenPassed = Math.max(0, passedTestCases - (isPass ? publicCount : 0));
    const hiddenTotal = Math.max(0, totalTestCases - publicCount);

    let html = `
      <div class="res-metrics-row">
        <div class="flex items-center gap-3">
          <span class="res-status-chip ${isPass ? 'status-accepted' : 'status-wrong'}">
            <i class="fa-solid fa-${isPass ? 'circle-check' : 'circle-xmark'}"></i> ${isPass ? 'Accepted' : 'Wrong Answer'}
          </span>
          <span class="res-pass-counter">Passed: ${passedTestCases} / ${totalTestCases} Test Cases</span>
        </div>
        <div class="submit-meta">
          <span>Public: <strong>${Math.min(publicCount, passedTestCases)} / ${publicCount}</strong></span>
          <span aria-hidden="true">•</span>
          <span>Hidden: <strong class="${isPass ? 'is-pass' : 'is-fail'}">${hiddenPassed} / ${hiddenTotal} passed</strong></span>
        </div>
      </div>
    `;

    if (testCases && testCases.length > 0) {
      html += `<div class="tc-cases-bar mb-2" id="submitCaseTabs">`;
      testCases.forEach((tc, idx) => {
        const icon = tc.passed ? '✓' : '✗';
        const isHidden = idx >= publicCount;
        html += `
          <button class="tc-case-pill ${idx === 0 ? 'active' : ''} ${tc.passed ? 'pass-pill' : 'fail-pill'}" onclick="window.selectSubmitCaseTab(${idx})">
            ${icon} ${isHidden ? 'Hidden Case' : 'Case'} ${idx + 1}
          </button>
        `;
      });
      html += `</div>`;
      html += `<div id="submitCaseContent"></div>`;
    }

    activeState.innerHTML = html;

    window.currentSubmitTestCases = testCases;
    window.selectSubmitCaseTab = function(tabIdx) {
      const tcList = window.currentSubmitTestCases;
      if (!tcList || !tcList[tabIdx]) return;

      document.querySelectorAll('#submitCaseTabs .tc-case-pill').forEach((btn, i) => {
        if (i === tabIdx) btn.classList.add('active');
        else btn.classList.remove('active');
      });

      const tc = tcList[tabIdx];
      const contentEl = document.getElementById('submitCaseContent');
      const isHidden = tabIdx >= publicCount;

      if (tc.status === 'Compilation Error' || tc.compileOutput) {
        contentEl.innerHTML = `
          <div class="fmt-box is-error">
            <pre>${escapeHtml(tc.compileOutput || 'Compilation Error')}</pre>
          </div>
        `;
      } else if (isHidden) {
        // Obfuscated Hidden Testcase View (Inputs and outputs are never exposed to candidate!)
        contentEl.innerHTML = `
          <div class="fmt-box is-locked">
            <div class="hidden-case-title ${tc.passed ? 'is-pass' : 'is-fail'}">
              <i class="fa-solid fa-lock" aria-hidden="true"></i>
              Hidden test case ${tabIdx + 1}: ${tc.passed ? 'Passed' : 'Failed'}
            </div>
            <p class="hidden-case-note">Inputs and expected outputs for hidden evaluation cases are protected and not displayed.</p>
          </div>
        `;
      } else {
        contentEl.innerHTML = `
          <div class="output-diff-grid">
            <div class="diff-field-card">
              <label><i class="fa-solid fa-right-to-bracket"></i> Input</label>
              <pre>${escapeHtml(tc.input || '')}</pre>
            </div>
            <div class="diff-field-card">
              <label><i class="fa-solid fa-terminal"></i> Your Output</label>
              <pre class="${tc.passed ? 'is-pass' : 'is-fail'}">${escapeHtml(tc.yourOutput !== null && tc.yourOutput !== undefined ? tc.yourOutput : '(Empty)')}</pre>
            </div>
            <div class="diff-field-card">
              <label><i class="fa-solid fa-right-from-bracket"></i> Expected Output</label>
              <pre class="is-expected">${escapeHtml(tc.expectedOutput || tc.output || '')}</pre>
            </div>
          </div>
        `;
      }
    };

    window.selectSubmitCaseTab(0);
  }
});
