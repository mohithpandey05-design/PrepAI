document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const baseUrl = window.API_BASE_URL || '';
  const $ = (id) => document.getElementById(id);

  const notify = (msg, type) => {
    if (typeof window.showToast === 'function') window.showToast(msg, type);
  };

  function isValidCandidateName(name) {
    if (!name || typeof name !== 'string') return false;
    const t = name.trim();
    if (t.length < 2 || t.length > 60) return false;
    if (/[%\/\\\[\]\(\)\{\}<>=+\*^\$#@!\?;:_~\|]/.test(t)) return false;
    if (/\d/.test(t)) return false;
    const lower = t.toLowerCase();
    const invalidKw = ['pdf', 'resume', 'curriculum', 'vitae', 'cv', 'profile', 'contact', 'education', 'skills', 'experience', 'projects', 'http', 'www', '.com'];
    for (const kw of invalidKw) {
      if (lower.includes(kw)) return false;
    }
    return true;
  }

  function setPill(id, value) {
    const el = $(id);
    if (!el) return;
    const has = value !== undefined && value !== null && String(value).trim() !== '';
    el.textContent = has ? String(value).trim() : 'Not set';
    el.classList.toggle('is-empty', !has);
  }

  function setRing(pathId, textId, percent, suffix) {
    const pct = Math.max(0, Math.min(100, Number(percent) || 0));
    const path = $(pathId);
    if (path) path.setAttribute('stroke-dasharray', `${pct}, 100`);
    const text = $(textId);
    if (text) text.textContent = `${pct}${suffix || ''}`;
  }

  function setStatusBadge(id, label, variant) {
    const el = $(id);
    if (!el) return;
    el.textContent = label;
    el.className = variant === 'done' ? 'badge-percent-green'
                 : variant === 'open' ? 'badge-locked-blue'
                 : 'badge-locked-gray';
  }

  function markStepCompleted(stepId, statusId, labelText) {
    const step = $(stepId);
    if (step) {
      step.classList.add('completed');
      step.classList.remove('current');
      const icon = step.querySelector('.circle-num-icon, .circle-lock-icon');
      if (icon) {
        icon.className = 'circle-check-icon';
        icon.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i>';
      }
    }
    setStatusBadge(statusId, labelText, 'done');
  }

  function markStepCurrent(stepId, statusId, labelText) {
    const step = $(stepId);
    if (step && !step.classList.contains('completed')) step.classList.add('current');
    if (step && step.classList.contains('completed')) return;
    setStatusBadge(statusId, labelText, 'open');
  }

  function setRoundState(cardId, btnId, statusId, opts) {
    const card = $(cardId);
    const btn = $(btnId);
    const status = $(statusId);

    if (card) card.classList.toggle('is-locked', !!opts.locked);
    if (status) status.textContent = opts.statusText;
    if (btn) {
      btn.className = opts.btnClass;
      btn.innerHTML = `<i class="fa-solid ${opts.btnIcon}" aria-hidden="true"></i> ${opts.btnLabel}`;
      btn.setAttribute('aria-disabled', opts.locked ? 'true' : 'false');
    }
  }

  function summarise(done, nextLabel) {
    const bar = $('pipelineSummary');
    if (!bar) return;
    const text = nextLabel
      ? `${done} of 5 completed · next: ${nextLabel}`
      : 'All 5 stages completed — nice work.';
    bar.innerHTML = `<div class="circle-check-icon" aria-hidden="true"><i class="fa-solid fa-check"></i></div><span>${text}</span>`;
  }

  const logoutBtn = $('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    });
  }

  try {
    const profileRes = await fetch(`${baseUrl}/api/user/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!profileRes.ok) {
      localStorage.clear();
      window.location.href = 'login.html';
      return;
    }

    const { user } = await profileRes.json();

    const availableRolesList = [
      'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
      'MERN Stack Developer', 'Python Developer', 'Java Developer', 'C++ Developer',
      'Data Analyst', 'Data Scientist', 'AI/ML Engineer', 'DevOps Engineer',
      'Cloud Engineer', 'Mobile Developer', 'QA / Test Engineer', 'Cybersecurity Engineer'
    ];

    const hasValidName = isValidCandidateName(user.fullName);
    const displayName = hasValidName ? user.fullName.trim() : '';
    const firstName = hasValidName ? displayName.split(' ')[0] : '';

    $('welcomeHeading').textContent = hasValidName ? `Welcome back, ${firstName}` : 'Welcome back';
    $('navUserName').textContent = hasValidName ? displayName : 'Candidate';
    $('navAvatar').textContent = hasValidName ? firstName.charAt(0).toUpperCase() : 'C';

    if (hasValidName && user.isResumeDerivedName) {
      const b = $('resumeDerivedBadge');
      if (b) b.classList.remove('hidden');
    }

    setPill('profileNamePill', displayName);
    setPill('profileEmailPill', user.email);
    setPill('profileCollegePill', user.college);
    setPill('profileBranchPill', user.branch);

    const skillsRow = $('profileSkillsRow');
    if (skillsRow) {
      skillsRow.innerHTML = '';
      const skills = Array.isArray(user.skills) ? user.skills : [];
      if (skills.length) {
        skills.slice(0, 8).forEach((skill, i) => {
          const span = document.createElement('span');
          span.className = i === 0 ? 'skill-tag-blue' : 'skill-tag-gray';
          span.textContent = skill;
          skillsRow.appendChild(span);
        });
      } else {
        const span = document.createElement('span');
        span.className = 'skill-tag-gray';
        span.textContent = 'No skills added yet';
        skillsRow.appendChild(span);
      }
      const add = document.createElement('a');
      add.href = 'profile.html';
      add.className = 'skill-plus-btn';
      add.setAttribute('aria-label', 'Add skills on your profile');
      add.textContent = '+';
      skillsRow.appendChild(add);
    }

    const selectedRole = user.selectedRole || user.detectedRole || 'Software Engineer';
    const detectedRole = user.detectedRole || 'Software Engineer';

    $('selectedRoleText').textContent = selectedRole;
    $('roleChip').classList.remove('hidden');

    const matchRoleText = $('matchRoleText');
    if (matchRoleText) matchRoleText.textContent = selectedRole;

    if (user.detectedRole) {
      $('detectedRoleText').textContent = detectedRole;
      $('detectedRoleChip').classList.remove('hidden');
    }

    const roleBanner = $('roleBanner');
    const bannerRoleText = $('bannerRoleText');
    const confirmRoleBtnName = $('confirmRoleBtnName');
    const bannerRoleSelect = $('bannerRoleSelect');

    async function updateRoleOnServer(newRole) {
      try {
        const rRes = await fetch(`${baseUrl}/api/user/role`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ selectedRole: newRole })
        });
        const rData = await rRes.json();
        if (rRes.ok && rData.user) {
          $('selectedRoleText').textContent = rData.user.selectedRole;
          if (matchRoleText) matchRoleText.textContent = rData.user.selectedRole;
          roleBanner.classList.add('hidden');
          notify(`Target role set to ${rData.user.selectedRole}`, 'success');
        } else {
          notify(rData.message || 'Failed to update role', 'error');
        }
      } catch (e) {
        notify('Network error updating role', 'error');
      }
    }

    if (user.resumeUploaded && user.detectedRole) {
      bannerRoleText.textContent = detectedRole;
      confirmRoleBtnName.textContent = `(${detectedRole})`;
      roleBanner.classList.remove('hidden');

      bannerRoleSelect.innerHTML = availableRolesList.map(r =>
        `<option value="${r}" ${r === selectedRole ? 'selected' : ''}>${r}</option>`
      ).join('');

      $('confirmRoleBtn').onclick = () => updateRoleOnServer(detectedRole);
      $('changeRoleBtn').onclick = () => updateRoleOnServer(bannerRoleSelect.value);
    }

    const fieldsToCheck = ['phone', 'college', 'branch', 'graduationYear', 'skills', 'linkedin', 'github', 'resumeUploaded'];
    let completed = 0;
    fieldsToCheck.forEach(f => {
      if (user[f]) {
        if (Array.isArray(user[f]) && user[f].length > 0) completed++;
        else if (typeof user[f] === 'string' && user[f].trim() !== '') completed++;
        else if (typeof user[f] === 'boolean' && user[f]) completed++;
        else if (typeof user[f] === 'number') completed++;
      }
    });

    const percent = Math.round((completed / fieldsToCheck.length) * 100);
    setRing('profileCirclePath', 'completionPercent', percent, '%');

    const pBar = $('progressBar');
    if (pBar) pBar.style.width = `${percent}%`;

    let stagesDone = 0;
    let nextStage = 'Resume upload';

    if (user.resumeUploaded) {
      markStepCompleted('stepResumeUpload', 'statusResumeUpload', 'Uploaded');
      stagesDone++;
      nextStage = 'ATS analysis';
    } else {
      markStepCurrent('stepResumeUpload', 'statusResumeUpload', 'Start here');
    }

    try {
      const analysisRes = await fetch(`${baseUrl}/api/resume/analysis`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const analysisData = await analysisRes.json();

      if (analysisRes.ok && analysisData.analysis) {
        const a = analysisData.analysis;
        const score = Number(a.resumeScore) || 0;

        $('analysisEmpty').classList.add('hidden');
        $('analysisDetails').classList.remove('hidden');

        setRing('atsCirclePath', 'dashResumeScore', score, '');
        $('dashResumeScoreBadge').textContent = `${score}%`;

        const valuePath = $('atsCirclePath');
        if (valuePath) {
          valuePath.classList.remove('is-success', 'is-warning');
          valuePath.classList.add(score >= 70 ? 'is-success' : 'is-warning');
        }

        const renderTags = (arr, elId, cssClass, emptyText) => {
          const container = $(elId);
          if (!container) return;
          container.innerHTML = '';
          const items = arr || [];
          if (!items.length) {
            const span = document.createElement('span');
            span.className = 'tag';
            span.textContent = emptyText;
            container.appendChild(span);
            return;
          }
          items.forEach(item => {
            const span = document.createElement('span');
            span.className = `tag ${cssClass}`;
            span.textContent = item;
            container.appendChild(span);
          });
        };

        renderTags(a.detectedSkills, 'dashDetectedSkills', 'tag-success', 'None detected');
        renderTags(a.missingSkills, 'dashMissingSkills', 'tag-danger', 'Nothing missing');

        markStepCompleted('stepResumeAnalyze', 'statusResumeAnalyze', `Score ${score}%`);
        stagesDone++;
        nextStage = 'Aptitude test';
      } else if (user.resumeUploaded) {
        markStepCurrent('stepResumeAnalyze', 'statusResumeAnalyze', 'Ready');
      }
    } catch (e) {
      console.error('Analysis fetch error:', e);
    }

    let aptitudePassed = false;

    if (user.aptitudeCompleted) {
      try {
        const aptRes = await fetch(`${baseUrl}/api/aptitude/result`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const aptData = await aptRes.json();

        if (aptRes.ok && aptData.result) {
          const r = aptData.result;
          aptitudePassed = r.status === 'PASS';

          $('dashAptitudeStatus').textContent = `Completed — ${r.status}`;
          $('dashAptitudeResult').classList.remove('hidden');
          $('dashAptScore').textContent = r.score;
          $('dashAptPercentage').textContent = `${r.percentage}%`;

          const aptBtn = $('dashAptActionBtn');
          aptBtn.className = 'btn-yellow-outline';
          aptBtn.innerHTML = '<i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Retake';

          markStepCompleted('stepAptitude', 'statusAptitude', `${r.status} (${r.percentage}%)`);
          stagesDone++;
          nextStage = 'Coding round';
        }
      } catch (e) {
        console.error('Aptitude fetch error:', e);
      }
    } else {
      $('dashAptitudeResult').classList.add('hidden');
      markStepCurrent('stepAptitude', 'statusAptitude', 'Available');
    }

    const codingUnlocked = user.aptitudeCompleted || user.codingCompleted;

    if (user.codingCompleted) {
      setRoundState('dashCodingCard', 'dashCodingActionBtn', 'dashCodingStatus', {
        locked: false,
        statusText: 'Completed — score saved',
        btnClass: 'btn-gray-outline',
        btnIcon: 'fa-eye',
        btnLabel: 'Review'
      });
      markStepCompleted('stepCoding', 'statusCoding', 'Completed');
      stagesDone++;
      nextStage = 'AI interview';
    } else if (codingUnlocked) {
      setRoundState('dashCodingCard', 'dashCodingActionBtn', 'dashCodingStatus', {
        locked: false,
        statusText: 'Unlocked — ready for assessment',
        btnClass: 'btn-blue-solid',
        btnIcon: 'fa-play',
        btnLabel: 'Start'
      });
      markStepCurrent('stepCoding', 'statusCoding', 'Unlocked');
    }

    const interviewUnlocked = user.codingCompleted || user.interviewCompleted;

    if (user.interviewCompleted) {
      setRoundState('dashInterviewCard', 'dashInterviewActionBtn', 'dashInterviewStatus', {
        locked: false,
        statusText: 'Completed — report ready',
        btnClass: 'btn-gray-outline',
        btnIcon: 'fa-file-lines',
        btnLabel: 'View report'
      });
      markStepCompleted('stepInterview', 'statusInterview', 'Completed');
      stagesDone++;
      nextStage = null;

      try {
        const intRes = await fetch(`${baseUrl}/api/interview/report`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const intData = await intRes.json();
        if (intRes.ok && intData.report) {
          $('dashInterviewResult').classList.remove('hidden');
          $('dashIntScore').textContent = intData.report.overallScore || 0;
        }
      } catch (e) {
        console.error('Interview report fetch error:', e);
      }
    } else if (interviewUnlocked) {
      setRoundState('dashInterviewCard', 'dashInterviewActionBtn', 'dashInterviewStatus', {
        locked: false,
        statusText: 'Unlocked — AI video interview ready',
        btnClass: 'btn-blue-solid',
        btnIcon: 'fa-play',
        btnLabel: 'Start'
      });
      markStepCurrent('stepInterview', 'statusInterview', 'Unlocked');
      const lock = $('stepInterview').querySelector('.circle-lock-icon');
      if (lock) {
        lock.className = 'circle-num-icon';
        lock.textContent = '5';
      }
    }

    summarise(stagesDone, nextStage);

  } catch (err) {
    console.error('Dashboard load error:', err);
    notify('Could not load your dashboard. Please refresh.', 'error');
  }
});
