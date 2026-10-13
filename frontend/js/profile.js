document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const baseUrl = window.API_BASE_URL || '';
  let currentUser = null;
  let currentSkills = [];

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Only http(s) links get rendered — a stored `javascript:` URL must not run.
  function safeUrl(url) {
    if (!url) return false;
    try {
      const p = new URL(String(url), window.location.origin).protocol;
      return p === 'http:' || p === 'https:';
    } catch (e) {
      return false;
    }
  }

  // DOM Elements
  const displayName = document.getElementById('displayName');
  const displayEmail = document.getElementById('displayEmail');
  const avatarDisplay = document.getElementById('avatarDisplay');
  const dataSourceBadge = document.getElementById('dataSourceBadge');
  const profileGrid = document.getElementById('profileGrid');
  const extendedDisplaySection = document.getElementById('extendedDisplaySection');

  const profileDisplayView = document.getElementById('profileDisplayView');
  const manualProfileForm = document.getElementById('manualProfileForm');
  const toggleViewModeBtn = document.getElementById('toggleViewModeBtn');
  const cancelManualEditBtn = document.getElementById('cancelManualEditBtn');
  const alertBox = document.getElementById('alertBox');

  // Multi-entry Containers
  const educationListContainer = document.getElementById('educationListContainer');
  const projectListContainer = document.getElementById('projectListContainer');
  const certListContainer = document.getElementById('certListContainer');
  const achieveListContainer = document.getElementById('achieveListContainer');
  const skillsChipsContainer = document.getElementById('skillsChipsContainer');
  const skillInput = document.getElementById('skillInput');
  const addSkillBtn = document.getElementById('addSkillBtn');

  // Modal Elements
  const resumeConfirmModal = document.getElementById('resumeConfirmModal');
  const closeConfirmModalBtn = document.getElementById('closeConfirmModalBtn');
  const keepExistingProfileBtn = document.getElementById('keepExistingProfileBtn');
  const applyResumeDataBtn = document.getElementById('applyResumeDataBtn');
  const resumePreviewDetails = document.getElementById('resumePreviewDetails');
  let pendingResumeData = null;

  const availableRolesList = [
    'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
    'MERN Stack Developer', 'Python Developer', 'Java Developer', 'C++ Developer',
    'Data Analyst', 'Data Scientist', 'AI/ML Engineer', 'DevOps Engineer',
    'Cloud Engineer', 'Mobile Developer', 'QA / Test Engineer', 'Cybersecurity Engineer'
  ];

  // Fetch Profile
  async function fetchProfile() {
    try {
      const response = await fetch(`${baseUrl}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        currentUser = data.user;
        renderProfileSummary(currentUser);
      } else {
        localStorage.clear();
        window.location.href = 'login.html';
      }
    } catch (error) {
      showAlert('Failed to load profile data', 'error');
    }
  }

  function renderProfileSummary(user) {
    const firstName = user.fullName ? user.fullName.split(' ')[0] : 'User';
    displayName.textContent = user.fullName || 'Candidate Name';
    displayEmail.textContent = user.email || '';
    avatarDisplay.textContent = firstName.charAt(0).toUpperCase();

    if (dataSourceBadge) {
      if (user.dataSource === 'manual') {
        dataSourceBadge.className = 'badge badge-primary';
        dataSourceBadge.innerHTML = `<i class="fa-solid fa-user-check"></i> Manual Profile`;
      } else {
        dataSourceBadge.className = 'badge badge-success';
        dataSourceBadge.innerHTML = `<i class="fa-solid fa-file-invoice"></i> Resume Profile`;
      }
    }

    const manualData = user.manualProfileData || {};
    const contact = manualData.contact || {};
    const social = manualData.socialLinks || {};
    const education = Array.isArray(manualData.education) ? manualData.education : [];
    const projects = Array.isArray(manualData.projects) ? manualData.projects : [];
    const certs = Array.isArray(manualData.certifications) ? manualData.certifications : [];

    const notProvided = '<span class="detail-empty">Not provided</span>';

    profileGrid.innerHTML = `
      <div class="detail-item is-highlight is-full">
        <label><i class="fa-solid fa-briefcase"></i> Selected target role</label>
        <p class="detail-lead">
          ${escapeHtml(user.selectedRole || user.detectedRole || 'Software Engineer')}
          <span class="detail-note">AI recommended: ${escapeHtml(user.detectedRole || 'Software Engineer')}</span>
        </p>
      </div>
      <div class="detail-item">
        <label>Primary Phone</label>
        <p>${escapeHtml(user.phone || contact.phone) || notProvided}</p>
      </div>
      <div class="detail-item">
        <label>College / University</label>
        <p>${escapeHtml(user.college || (education[0] ? education[0].college : '')) || notProvided}</p>
      </div>
      <div class="detail-item">
        <label>Branch / Major</label>
        <p>${escapeHtml(user.branch || (education[0] ? education[0].branch : '')) || notProvided}</p>
      </div>
      <div class="detail-item">
        <label>Graduation Year</label>
        <p>${escapeHtml(user.graduationYear || (education[0] ? education[0].graduationYear : '')) || notProvided}</p>
      </div>
      <div class="detail-item is-full">
        <label>Technical Skills</label>
        ${user.skills && user.skills.length > 0
          ? `<div class="detail-skills">${user.skills.map(s => `<span class="badge badge-secondary">${escapeHtml(s)}</span>`).join('')}</div>`
          : `<p><span class="detail-empty">No skills listed</span></p>`}
      </div>
    `;

    // Extended Display Subsections
    extendedDisplaySection.innerHTML = `
      ${education.length > 0 ? `
        <div class="profile-section-card mb-3">
          <h4 class="section-title"><i class="fa-solid fa-graduation-cap"></i> Education History</h4>
          ${education.map(e => `
            <div class="dynamic-item-box mb-2">
              <div class="entry-head">
                <strong>${escapeHtml(e.college || 'College')}</strong>
                <span class="entry-meta">${escapeHtml(e.enrollmentYear)} &ndash; ${escapeHtml(e.graduationYear)}</span>
              </div>
              <p class="entry-detail">${escapeHtml(e.degree)} ${e.branch ? 'in ' + escapeHtml(e.branch) : ''}</p>
              ${e.cgpa ? `<span class="entry-tag">CGPA: ${escapeHtml(e.cgpa)}</span>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${projects.length > 0 ? `
        <div class="profile-section-card mb-3">
          <h4 class="section-title"><i class="fa-solid fa-diagram-project"></i> Projects</h4>
          ${projects.map(p => `
            <div class="dynamic-item-box mb-2">
              <div class="entry-head">
                <strong>${escapeHtml(p.name || 'Project')}</strong>
                ${safeUrl(p.githubUrl)
                  ? `<a href="${escapeHtml(p.githubUrl)}" class="entry-link" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-github"></i> Code</a>`
                  : ''}
              </div>
              <p class="entry-detail">${escapeHtml(p.description)}</p>
              ${p.technologies ? `<span class="entry-tag">Tech: ${escapeHtml(p.technologies)}</span>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${certs.length > 0 ? `
        <div class="profile-section-card mb-3">
          <h4 class="section-title"><i class="fa-solid fa-certificate"></i> Certifications</h4>
          ${certs.map(c => `
            <div class="dynamic-item-box mb-2">
              <div class="entry-head">
                <strong>${escapeHtml(c.name || 'Certification')}</strong>
                <span class="entry-meta">${escapeHtml(c.issuer)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
  }

  // --- SKILLS CHIPS MANAGER ---
  function renderSkillsChips() {
    skillsChipsContainer.innerHTML = '';
    currentSkills.forEach((skill, index) => {
      const chip = document.createElement('span');
      chip.className = 'removable-chip';
      chip.innerHTML = `${skill} <button type="button" data-index="${index}">&times;</button>`;
      skillsChipsContainer.appendChild(chip);
    });

    skillsChipsContainer.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        currentSkills.splice(idx, 1);
        renderSkillsChips();
      });
    });
  }

  function addSkillFromInput() {
    const val = skillInput.value.trim();
    if (val) {
      const newSkills = val.split(',').map(s => s.trim()).filter(Boolean);
      newSkills.forEach(s => {
        if (!currentSkills.includes(s)) currentSkills.push(s);
      });
      skillInput.value = '';
      renderSkillsChips();
    }
  }

  addSkillBtn.addEventListener('click', addSkillFromInput);
  skillInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkillFromInput();
    }
  });

  // --- DYNAMIC MULTI-ENTRY GENERATORS ---
  function createEducationItem(data = {}) {
    const div = document.createElement('div');
    div.className = 'dynamic-item-box';
    div.innerHTML = `
      <div class="flex justify-end mb-2">
        <button type="button" class="btn btn-danger btn-xs remove-item-btn">&times; Remove</button>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">College / University</label>
          <input type="text" class="form-control edu-college" value="${data.college || ''}" placeholder="University Name">
        </div>
        <div class="form-group">
          <label class="form-label">Degree</label>
          <input type="text" class="form-control edu-degree" value="${data.degree || ''}" placeholder="B.Tech, B.S., M.S.">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Branch / Major</label>
          <input type="text" class="form-control edu-branch" value="${data.branch || ''}" placeholder="Computer Science">
        </div>
        <div class="form-group">
          <label class="form-label">Student ID / Roll Number</label>
          <input type="text" class="form-control edu-studentid" value="${data.studentId || ''}" placeholder="2024CS101">
        </div>
      </div>
      <div class="form-row is-triple">
        <div class="form-group">
          <label class="form-label">Enrollment Year</label>
          <input type="number" class="form-control edu-enrolled" value="${data.enrollmentYear || ''}" placeholder="2024">
        </div>
        <div class="form-group">
          <label class="form-label">Graduation Year</label>
          <input type="number" class="form-control edu-grad" value="${data.graduationYear || ''}" placeholder="2028">
        </div>
        <div class="form-group">
          <label class="form-label">CGPA / Percentage</label>
          <input type="text" class="form-control edu-cgpa" value="${data.cgpa || ''}" placeholder="8.5 / 85%">
        </div>
      </div>
    `;
    div.querySelector('.remove-item-btn').addEventListener('click', () => div.remove());
    return div;
  }

  function createProjectItem(data = {}) {
    const div = document.createElement('div');
    div.className = 'dynamic-item-box';
    div.innerHTML = `
      <div class="flex justify-end mb-2">
        <button type="button" class="btn btn-danger btn-xs remove-item-btn">&times; Remove</button>
      </div>
      <div class="form-group mb-2">
        <label class="form-label">Project Name</label>
        <input type="text" class="form-control proj-name" value="${data.name || ''}" placeholder="AI Interview Preparation Suite">
      </div>
      <div class="form-group mb-2">
        <label class="form-label">Description</label>
        <textarea class="form-control proj-desc" rows="2" placeholder="Brief project summary and features...">${data.description || ''}</textarea>
      </div>
      <div class="form-group mb-2">
        <label class="form-label">Technologies Used</label>
        <input type="text" class="form-control proj-tech" value="${data.technologies || ''}" placeholder="Node.js, Express, MySQL, Gemini AI">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">GitHub URL</label>
          <input type="url" class="form-control proj-github" value="${data.githubUrl || ''}" placeholder="https:
        </div>
        <div class="form-group">
          <label class="form-label">Live Demo URL</label>
          <input type="url" class="form-control proj-demo" value="${data.liveDemoUrl || ''}" placeholder="https://demo.dev">
        </div>
      </div>
    `;
    div.querySelector('.remove-item-btn').addEventListener('click', () => div.remove());
    return div;
  }

  function createCertItem(data = {}) {
    const div = document.createElement('div');
    div.className = 'dynamic-item-box';
    div.innerHTML = `
      <div class="flex justify-end mb-2">
        <button type="button" class="btn btn-danger btn-xs remove-item-btn">&times; Remove</button>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Certification Name</label>
          <input type="text" class="form-control cert-name" value="${data.name || ''}" placeholder="AWS Solutions Architect">
        </div>
        <div class="form-group">
          <label class="form-label">Issuer</label>
          <input type="text" class="form-control cert-issuer" value="${data.issuer || ''}" placeholder="Amazon Web Services / Coursera">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Issue Date</label>
          <input type="date" class="form-control cert-date" value="${data.issueDate || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Credential URL</label>
          <input type="url" class="form-control cert-url" value="${data.credentialUrl || ''}" placeholder="https://credly.com/badge">
        </div>
      </div>
    `;
    div.querySelector('.remove-item-btn').addEventListener('click', () => div.remove());
    return div;
  }

  function createAchievementItem(data = {}) {
    const div = document.createElement('div');
    div.className = 'dynamic-item-box';
    div.innerHTML = `
      <div class="flex justify-end mb-2">
        <button type="button" class="btn btn-danger btn-xs remove-item-btn">&times; Remove</button>
      </div>
      <div class="form-group mb-2">
        <label class="form-label">Achievement Title</label>
        <input type="text" class="form-control ach-title" value="${data.title || ''}" placeholder="1st Place Hackathon Winner">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input type="text" class="form-control ach-desc" value="${data.description || ''}" placeholder="Won 1st prize among 500+ teams for building AI app">
      </div>
    `;
    div.querySelector('.remove-item-btn').addEventListener('click', () => div.remove());
    return div;
  }

  document.getElementById('addEducationBtn').addEventListener('click', () => educationListContainer.appendChild(createEducationItem()));
  document.getElementById('addProjectBtn').addEventListener('click', () => projectListContainer.appendChild(createProjectItem()));
  document.getElementById('addCertBtn').addEventListener('click', () => certListContainer.appendChild(createCertItem()));
  document.getElementById('addAchieveBtn').addEventListener('click', () => achieveListContainer.appendChild(createAchievementItem()));

  // Populate Complete Manual Form
  function populateManualForm() {
    const roleSelect = document.getElementById('selectedRoleSelect');
    if (roleSelect) {
      roleSelect.innerHTML = availableRolesList.map(r =>
        `<option value="${r}" ${(currentUser.selectedRole === r || currentUser.detectedRole === r) ? 'selected' : ''}>${r}</option>`
      ).join('');
    }

    document.getElementById('manualFullName').value = currentUser.fullName || '';
    document.getElementById('manualEmail').value = currentUser.email || '';
    document.getElementById('manualPhone').value = currentUser.phone || '';
    document.getElementById('manualLinkedin').value = currentUser.linkedin || '';
    document.getElementById('manualGithub').value = currentUser.github || '';

    currentSkills = [...(currentUser.skills || [])];
    renderSkillsChips();

    const manual = currentUser.manualProfileData || {};
    const basic = manual.basicInfo || {};
    const contact = manual.contact || {};
    const prof = manual.professional || {};
    const social = manual.socialLinks || {};

    document.getElementById('manualUsername').value = basic.username || '';
    document.getElementById('manualAltEmail').value = basic.altEmail || '';
    document.getElementById('manualDob').value = basic.dob || '';
    document.getElementById('manualGender').value = basic.gender || '';

    document.getElementById('manualAltPhone').value = contact.altPhone || '';
    document.getElementById('manualCity').value = contact.city || '';
    document.getElementById('manualState').value = contact.state || '';
    document.getElementById('manualCountry').value = contact.country || '';

    document.getElementById('manualExpLevel').value = prof.experienceLevel || 'Freshman / Student';
    document.getElementById('manualSummary').value = prof.careerSummary || '';

    document.getElementById('manualPortfolio').value = social.portfolio || '';
    document.getElementById('manualLeetcode').value = social.leetcode || '';
    document.getElementById('manualCodechef').value = social.codechef || '';
    document.getElementById('manualOtherUrl').value = social.other || '';

    // Populate Education items
    educationListContainer.innerHTML = '';
    const edList = Array.isArray(manual.education) && manual.education.length > 0
      ? manual.education
      : [{ college: currentUser.college, branch: currentUser.branch, graduationYear: currentUser.graduationYear }];
    edList.forEach(e => educationListContainer.appendChild(createEducationItem(e)));

    // Populate Projects
    projectListContainer.innerHTML = '';
    (manual.projects || []).forEach(p => projectListContainer.appendChild(createProjectItem(p)));

    // Populate Certifications
    certListContainer.innerHTML = '';
    (manual.certifications || []).forEach(c => certListContainer.appendChild(createCertItem(c)));

    // Populate Achievements
    achieveListContainer.innerHTML = '';
    (manual.achievements || []).forEach(a => achieveListContainer.appendChild(createAchievementItem(a)));
  }

  toggleViewModeBtn.addEventListener('click', () => {
    populateManualForm();
    profileDisplayView.classList.add('hidden');
    manualProfileForm.classList.remove('hidden');
    alertBox.classList.add('hidden');
  });

  cancelManualEditBtn.addEventListener('click', () => {
    manualProfileForm.classList.add('hidden');
    profileDisplayView.classList.remove('hidden');
  });

  // SUBMIT MANUAL PROFILE FORM
  manualProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const saveBtn = document.getElementById('saveManualProfileBtn');
    const btnText = saveBtn.querySelector('.btn-text');
    const spinner = saveBtn.querySelector('.spinner');

    btnText.classList.add('hidden');
    spinner.classList.remove('hidden');
    saveBtn.disabled = true;

    // Collect Education
    const education = [];
    educationListContainer.querySelectorAll('.dynamic-item-box').forEach(box => {
      education.push({
        college: box.querySelector('.edu-college').value.trim(),
        degree: box.querySelector('.edu-degree').value.trim(),
        branch: box.querySelector('.edu-branch').value.trim(),
        studentId: box.querySelector('.edu-studentid').value.trim(),
        enrollmentYear: box.querySelector('.edu-enrolled').value.trim(),
        graduationYear: box.querySelector('.edu-grad').value.trim(),
        cgpa: box.querySelector('.edu-cgpa').value.trim()
      });
    });

    // Collect Projects
    const projects = [];
    projectListContainer.querySelectorAll('.dynamic-item-box').forEach(box => {
      projects.push({
        name: box.querySelector('.proj-name').value.trim(),
        description: box.querySelector('.proj-desc').value.trim(),
        technologies: box.querySelector('.proj-tech').value.trim(),
        githubUrl: box.querySelector('.proj-github').value.trim(),
        liveDemoUrl: box.querySelector('.proj-demo').value.trim()
      });
    });

    // Collect Certifications
    const certifications = [];
    certListContainer.querySelectorAll('.dynamic-item-box').forEach(box => {
      certifications.push({
        name: box.querySelector('.cert-name').value.trim(),
        issuer: box.querySelector('.cert-issuer').value.trim(),
        issueDate: box.querySelector('.cert-date').value.trim(),
        credentialUrl: box.querySelector('.cert-url').value.trim()
      });
    });

    // Collect Achievements
    const achievements = [];
    achieveListContainer.querySelectorAll('.dynamic-item-box').forEach(box => {
      achievements.push({
        title: box.querySelector('.ach-title').value.trim(),
        description: box.querySelector('.ach-desc').value.trim()
      });
    });

    const primaryEdu = education[0] || {};

    const manualPayload = {
      fullName: document.getElementById('manualFullName').value.trim(),
      phone: document.getElementById('manualPhone').value.trim(),
      college: primaryEdu.college || '',
      branch: primaryEdu.branch || '',
      graduationYear: primaryEdu.graduationYear || null,
      selectedRole: document.getElementById('selectedRoleSelect').value,
      skills: currentSkills,
      linkedin: document.getElementById('manualLinkedin').value.trim(),
      github: document.getElementById('manualGithub').value.trim(),
      manualProfileData: {
        basicInfo: {
          username: document.getElementById('manualUsername').value.trim(),
          altEmail: document.getElementById('manualAltEmail').value.trim(),
          dob: document.getElementById('manualDob').value,
          gender: document.getElementById('manualGender').value
        },
        contact: {
          phone: document.getElementById('manualPhone').value.trim(),
          altPhone: document.getElementById('manualAltPhone').value.trim(),
          city: document.getElementById('manualCity').value.trim(),
          state: document.getElementById('manualState').value.trim(),
          country: document.getElementById('manualCountry').value.trim()
        },
        education,
        professional: {
          targetRole: document.getElementById('selectedRoleSelect').value,
          experienceLevel: document.getElementById('manualExpLevel').value,
          careerSummary: document.getElementById('manualSummary').value.trim(),
          skills: currentSkills
        },
        socialLinks: {
          github: document.getElementById('manualGithub').value.trim(),
          linkedin: document.getElementById('manualLinkedin').value.trim(),
          portfolio: document.getElementById('manualPortfolio').value.trim(),
          leetcode: document.getElementById('manualLeetcode').value.trim(),
          codechef: document.getElementById('manualCodechef').value.trim(),
          other: document.getElementById('manualOtherUrl').value.trim()
        },
        projects,
        certifications,
        achievements
      }
    };

    try {
      const response = await fetch(`${baseUrl}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(manualPayload)
      });

      const data = await response.json();

      if (response.ok) {
        currentUser = data.user;
        renderProfileSummary(currentUser);
        showAlert('Manual profile successfully saved to MySQL!', 'success');
        manualProfileForm.classList.add('hidden');
        profileDisplayView.classList.remove('hidden');
        localStorage.setItem('user', JSON.stringify(currentUser));
      } else {
        showAlert(data.message || 'Failed to save manual profile', 'error');
      }
    } catch (error) {
      showAlert('Network error saving profile', 'error');
    } finally {
      btnText.classList.remove('hidden');
      spinner.classList.add('hidden');
      saveBtn.disabled = false;
    }
  });

  // --- RESUME CONFIRMATION PREVIEW MODAL LOGIC ---
  function showResumeConfirmationModal(detectedInfo) {
    pendingResumeData = detectedInfo;
    resumePreviewDetails.innerHTML = `
      <div class="info-row"><span>Detected Name:</span> <strong>${detectedInfo.fullName || 'Not detected'}</strong></div>
      <div class="info-row"><span>Detected Phone:</span> <strong>${detectedInfo.phone || 'Not detected'}</strong></div>
      <div class="info-row"><span>College:</span> <strong>${detectedInfo.college || 'Not detected'}</strong></div>
      <div class="info-row"><span>Branch:</span> <strong>${detectedInfo.branch || 'Not detected'}</strong></div>
      <div class="info-row"><span>Graduation Year:</span> <strong>${detectedInfo.graduationYear || 'Not detected'}</strong></div>
      <div class="info-row"><span>Skills:</span> <strong>${(detectedInfo.skills || []).join(', ')}</strong></div>
    `;
    resumeConfirmModal.classList.remove('hidden');
  }

  closeConfirmModalBtn.addEventListener('click', () => resumeConfirmModal.classList.add('hidden'));
  keepExistingProfileBtn.addEventListener('click', () => {
    resumeConfirmModal.classList.add('hidden');
    showResumeAlert('Kept existing profile. Resume data ignored.', 'info');
  });

  applyResumeDataBtn.addEventListener('click', async () => {
    if (!pendingResumeData) return;

    const btnText = applyResumeDataBtn.querySelector('.btn-text');
    const spinner = applyResumeDataBtn.querySelector('.spinner');
    if (btnText) btnText.classList.add('hidden');
    if (spinner) spinner.classList.remove('hidden');
    applyResumeDataBtn.disabled = true;

    try {
      const response = await fetch(`${baseUrl}/api/user/apply-resume-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pendingResumeData)
      });
      const data = await response.json();
      if (response.ok && data.user) {
        currentUser = data.user;
        renderProfileSummary(currentUser);
        localStorage.setItem('user', JSON.stringify(currentUser));
        showResumeAlert('Resume data applied to candidate profile!', 'success');
        resumeConfirmModal.classList.add('hidden');
      } else {
        showResumeAlert(data.message || 'Failed to apply resume data', 'error');
      }
    } catch (err) {
      showResumeAlert('Network error applying resume data', 'error');
    } finally {
      if (btnText) btnText.classList.remove('hidden');
      if (spinner) spinner.classList.add('hidden');
      applyResumeDataBtn.disabled = false;
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
  });

  function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = `toast ${type}`;
    alertBox.classList.remove('hidden');
  }

  // --- RESUME UPLOAD & ANALYSIS HANDLERS ---
  const dropZone = document.getElementById('dropZone');
  const resumeFileInput = document.getElementById('resumeFileInput');
  const browseFileBtn = document.getElementById('browseFileBtn');
  const selectedFilePreview = document.getElementById('selectedFilePreview');
  const selectedFileName = document.getElementById('selectedFileName');
  const uploadSubmitBtn = document.getElementById('uploadSubmitBtn');

  const uploadSection = document.getElementById('uploadSection');
  const manageSection = document.getElementById('manageSection');
  const infoFileName = document.getElementById('infoFileName');
  const infoUploadedAt = document.getElementById('infoUploadedAt');
  const viewResumeBtn = document.getElementById('viewResumeBtn');
  const deleteResumeBtn = document.getElementById('deleteResumeBtn');
  const resumeAlertBox = document.getElementById('resumeAlertBox');
  const analyzeResumeBtn = document.getElementById('analyzeResumeBtn');

  let selectedFile = null;

  async function fetchResumeStatus() {
    try {
      const response = await fetch(`${baseUrl}/api/resume`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.resume) {
        updateResumeUI(data.resume);
      }
    } catch (error) {
      console.error(error);
    }
  }

  function updateResumeUI(resume) {
    if (resume.url) {
      uploadSection.classList.add('hidden');
      manageSection.classList.remove('hidden');
      infoFileName.textContent = resume.fileName;
      infoUploadedAt.textContent = `Uploaded: ${new Date(resume.uploadedAt).toLocaleDateString()}`;
      viewResumeBtn.href = `${baseUrl}${resume.url}`;
    } else {
      uploadSection.classList.remove('hidden');
      manageSection.classList.add('hidden');
      selectedFile = null;
      selectedFilePreview.classList.add('hidden');
      resumeFileInput.value = '';
    }
  }

  function showResumeAlert(message, type) {
    resumeAlertBox.textContent = message;
    resumeAlertBox.className = `toast ${type}`;
    resumeAlertBox.classList.remove('hidden');
  }

  function handleFileSelection(file) {
    resumeAlertBox.classList.add('hidden');
    if (file.type !== 'application/pdf') {
      showResumeAlert('Only PDF resume files are allowed', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showResumeAlert('File size must be under 5MB', 'error');
      return;
    }
    selectedFile = file;
    selectedFileName.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
    selectedFilePreview.classList.remove('hidden');
  }

  browseFileBtn.addEventListener('click', () => resumeFileInput.click());
  dropZone.addEventListener('click', () => resumeFileInput.click());
  resumeFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileSelection(e.target.files[0]);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFileSelection(e.dataTransfer.files[0]);
  });

  // Upload, Auto-Parse PDF & Handle Resume Confirmation Modal
  uploadSubmitBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    const btnText = uploadSubmitBtn.querySelector('.btn-text');
    const spinner = uploadSubmitBtn.querySelector('.spinner');
    if (btnText) btnText.classList.add('hidden');
    if (spinner) spinner.classList.remove('hidden');
    uploadSubmitBtn.disabled = true;

    showResumeAlert('⏳ Step 1/3: Uploading PDF resume file...', 'info');

    const formData = new FormData();
    formData.append('resume', selectedFile);

    try {
      showResumeAlert('⏳ Step 2/3: Extracting PDF text & running Gemini AI ATS scoring...', 'info');
      const response = await fetch(`${baseUrl}/api/resume/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        showResumeAlert('✓ Step 3/3: Resume uploaded & PDF parsed!', 'success');
        if (data.user) {
          currentUser = data.user;
          renderProfileSummary(currentUser);
          localStorage.setItem('user', JSON.stringify(currentUser));
        }
        if (data.analysis) {
          renderAnalysisUI(data.analysis);
        }
        if (data.resumeDetectedInformation) {
          showResumeConfirmationModal(data.resumeDetectedInformation);
        }
        updateResumeUI(data.resume || { fileName: selectedFile.name, url: data.user?.resumeUrl, uploadedAt: new Date() });
      } else {
        showResumeAlert(data.message || 'Upload failed', 'error');
      }
    } catch (error) {
      showResumeAlert('Network error during upload', 'error');
    } finally {
      if (btnText) btnText.classList.remove('hidden');
      if (spinner) spinner.classList.add('hidden');
      uploadSubmitBtn.disabled = false;
    }
  });

  deleteResumeBtn.addEventListener('click', async () => {
    const btnText = deleteResumeBtn.querySelector('.btn-text');
    const spinner = deleteResumeBtn.querySelector('.spinner');
    btnText.classList.add('hidden');
    spinner.classList.remove('hidden');
    deleteResumeBtn.disabled = true;

    try {
      const response = await fetch(`${baseUrl}/api/resume`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        showResumeAlert('Resume deleted successfully', 'success');
        document.getElementById('analysisResultCard').classList.add('hidden');
        fetchResumeStatus();
        fetchProfile();
      } else {
        showResumeAlert(data.message || 'Delete failed', 'error');
      }
    } catch (error) {
      showResumeAlert('Network error during delete', 'error');
    } finally {
      btnText.classList.remove('hidden');
      spinner.classList.add('hidden');
      deleteResumeBtn.disabled = false;
    }
  });

  analyzeResumeBtn.addEventListener('click', async () => {
    const btnText = analyzeResumeBtn.querySelector('.btn-text');
    const spinner = analyzeResumeBtn.querySelector('.spinner');
    if (btnText) btnText.classList.add('hidden');
    if (spinner) spinner.classList.remove('hidden');
    analyzeResumeBtn.disabled = true;

    showResumeAlert('⏳ Step 1/3: Parsing PDF text content...', 'info');

    try {
      const response = await fetch(`${baseUrl}/api/resume/analyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.analysis) {
        showResumeAlert('✓ Step 3/3: Gemini AI Resume Analysis completed!', 'success');
        renderAnalysisUI(data.analysis);
        if (data.resumeDetectedInformation) {
          showResumeConfirmationModal(data.resumeDetectedInformation);
        }
        fetchProfile();
      } else {
        showResumeAlert(data.message || 'Analysis failed. Please ensure file is a readable text PDF.', 'error');
      }
    } catch (error) {
      showResumeAlert('Network error during analysis.', 'error');
    } finally {
      if (btnText) btnText.classList.remove('hidden');
      if (spinner) spinner.classList.add('hidden');
      analyzeResumeBtn.disabled = false;
    }
  });

  function renderAnalysisUI(analysis) {
    const card = document.getElementById('analysisResultCard');
    card.classList.remove('hidden');

    document.getElementById('profResumeScore').textContent = analysis.resumeScore || 0;
    document.getElementById('profRoleBadge').textContent = `Role: ${analysis.detectedRole || 'Software Engineer'}`;
    document.getElementById('profSummaryText').textContent = analysis.summary || '';

    const renderList = (arr, elId) => {
      const el = document.getElementById(elId);
      el.innerHTML = '';
      (arr || []).forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        el.appendChild(li);
      });
    };

    renderList(analysis.strengths, 'profStrengths');
    renderList(analysis.weaknesses, 'profWeaknesses');
  }

  // Init
  fetchProfile();
  fetchResumeStatus();
  fetchResumeAnalysis();
});
