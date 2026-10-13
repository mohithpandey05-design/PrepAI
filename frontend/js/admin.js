document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return; }

  const baseUrl = window.API_BASE_URL || '';
  let currentPage = 1;
  let totalPages = 1;
  let currentSearch = '';

  const notify = (msg, type) =>
    (window.showToast ? window.showToast(msg, type || 'info') : alert(msg));

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
  });

  // Fetch Stats
  async function fetchStats() {
    try {
      const res = await fetch(`${baseUrl}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.stats) {
        const s = data.stats;
        document.getElementById('statTotalUsers').textContent = s.totalUsers || 0;
        document.getElementById('statVerifiedUsers').textContent = s.verifiedUsers || 0;
        document.getElementById('statResumesUploaded').textContent = s.resumesUploaded || 0;
        document.getElementById('statAptPassRate').textContent = `${s.aptitudePassRate || 0}%`;
        document.getElementById('statAvgInterviewScore').textContent = s.avgInterviewScore || 0;
      } else {
        notify(data.message || 'Could not load platform metrics.', 'error');
      }
    } catch (e) {
      console.error(e);
      notify('Network error loading platform metrics.', 'error');
    }
  }

  // Fetch Users List
  async function fetchUsers(page = 1, search = '') {
    const tbody = document.getElementById('candidatesTableBody');
    try {
      const res = await fetch(`${baseUrl}/api/admin/users?page=${page}&limit=15&search=${encodeURIComponent(search)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && data.users) {
        currentPage = data.pagination.currentPage;
        totalPages = data.pagination.totalPages;

        document.getElementById('paginationInfo').textContent =
          `Page ${currentPage} of ${totalPages} · ${data.pagination.totalUsers} candidates`;
        document.getElementById('prevPageBtn').disabled = currentPage <= 1;
        document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;

        if (data.users.length === 0) {
          tbody.innerHTML = `<tr><td colspan="8" class="table-message">
            <i class="fa-solid fa-user-slash"></i> No candidates match this search.
          </td></tr>`;
          return;
        }

        tbody.innerHTML = '';
        data.users.forEach(u => {
          const tr = document.createElement('tr');
          // `role` is the account type; the target role is what recruiters want.
          const targetRole = u.selectedRole || u.detectedRole || 'Not detected';
          tr.innerHTML = `
            <td><strong>${escapeHtml(u.fullName)}</strong></td>
            <td>${escapeHtml(u.email)}</td>
            <td><span class="badge badge-primary">${escapeHtml(targetRole)}</span></td>
            <td><span class="badge ${u.resumeUploaded ? 'badge-success' : 'badge-warning'}">${u.resumeUploaded ? 'Analysed' : 'Pending'}</span></td>
            <td><span class="badge ${u.aptitudeCompleted ? 'badge-success' : 'badge-secondary'}">${u.aptitudeCompleted ? 'Complete' : 'Pending'}</span></td>
            <td><span class="badge ${u.codingCompleted ? 'badge-success' : 'badge-secondary'}">${u.codingCompleted ? 'Complete' : 'Pending'}</span></td>
            <td><span class="badge ${u.interviewCompleted ? 'badge-success' : 'badge-secondary'}">${u.interviewCompleted ? 'Complete' : 'Pending'}</span></td>
            <td class="col-action">
              <button type="button" class="btn btn-secondary btn-audit view-user-btn" data-id="${escapeHtml(u._id)}">
                <i class="fa-solid fa-eye"></i> Audit
              </button>
            </td>
          `;
          tbody.appendChild(tr);
        });

        // The tbody is rebuilt each render, so these listeners cannot stack.
        tbody.querySelectorAll('.view-user-btn').forEach(b => {
          b.addEventListener('click', () => openCandidateModal(b.getAttribute('data-id')));
        });
      } else {
        // Without this the loading row would sit there forever on a failure.
        tbody.innerHTML = `<tr><td colspan="8" class="table-message">
          <i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(data.message || 'Could not load candidate records.')}
        </td></tr>`;
      }
    } catch (e) {
      console.error(e);
      tbody.innerHTML = `<tr><td colspan="8" class="table-message">
        <i class="fa-solid fa-triangle-exclamation"></i> Network error loading candidate records.
      </td></tr>`;
    }
  }

  // Search Listener with debounce
  let searchTimeout = null;
  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearch = e.target.value;
      fetchUsers(1, currentSearch);
    }, 400);
  });

  // Pagination Listeners
  document.getElementById('prevPageBtn').addEventListener('click', () => {
    if (currentPage > 1) fetchUsers(currentPage - 1, currentSearch);
  });

  document.getElementById('nextPageBtn').addEventListener('click', () => {
    if (currentPage < totalPages) fetchUsers(currentPage + 1, currentSearch);
  });

  // Modal Handler
  const modal = document.getElementById('candidateModal');
  const closeModalBtn = document.getElementById('closeModalBtn');

  function closeModal() { modal.classList.add('hidden'); }

  closeModalBtn.addEventListener('click', closeModal);

  // Clicking the backdrop or pressing Escape dismisses the audit panel.
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  async function openCandidateModal(userId) {
    modal.classList.remove('hidden');
    const modalBody = document.getElementById('modalBody');
    const modalName = document.getElementById('modalCandidateName');
    modalBody.innerHTML = `<p class="modal-message"><i class="fa-solid fa-circle-notch fa-spin"></i> Fetching candidate data…</p>`;

    try {
      const res = await fetch(`${baseUrl}/api/admin/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && data.user) {
        const u = data.user;
        const ra = data.resumeAnalysis;
        const apt = data.aptitudeResult;
        const intS = data.interviewSession;

        modalName.textContent = `Audit: ${u.fullName}`;

        const skills = ra && ra.detectedSkills && ra.detectedSkills.length
          ? ra.detectedSkills.map(s => `<span class="badge badge-secondary">${escapeHtml(s)}</span>`).join('')
          : '<span class="audit-value">None detected</span>';

        const codingCount = data.codingResults ? data.codingResults.length : 0;

        modalBody.innerHTML = `
          <div class="audit-group">
            <h3 class="audit-group-title"><i class="fa-solid fa-address-card"></i> Profile</h3>
            <div class="audit-rows">
              <div class="audit-row is-wide">
                <span class="audit-label">Email</span>
                <div class="audit-value">${escapeHtml(u.email)}</div>
              </div>
              <div class="audit-row">
                <span class="audit-label">College</span>
                <div class="audit-value">${escapeHtml(u.college || 'Not provided')}</div>
              </div>
              <div class="audit-row">
                <span class="audit-label">Branch</span>
                <div class="audit-value">${escapeHtml(u.branch || 'Not provided')}</div>
              </div>
            </div>
          </div>

          <div class="audit-group">
            <h3 class="audit-group-title"><i class="fa-solid fa-file-lines"></i> Resume analysis</h3>
            <div class="audit-rows">
              <div class="audit-row">
                <span class="audit-label">Detected role</span>
                <div class="audit-value">${escapeHtml(ra ? ra.detectedRole : 'Not analysed')}</div>
              </div>
              <div class="audit-row">
                <span class="audit-label">ATS score</span>
                <div class="audit-value">${ra ? `${ra.resumeScore}/100` : '—'}</div>
              </div>
              <div class="audit-row is-wide">
                <span class="audit-label">Detected skills</span>
                <div class="audit-skills">${skills}</div>
              </div>
            </div>
          </div>

          <div class="audit-group is-warning">
            <h3 class="audit-group-title"><i class="fa-solid fa-calculator"></i> Aptitude &amp; coding</h3>
            <div class="audit-rows">
              <div class="audit-row">
                <span class="audit-label">Aptitude</span>
                <div class="audit-value">${apt ? `${apt.percentage}% · ${escapeHtml(apt.status)}` : 'Not taken'}</div>
              </div>
              <div class="audit-row">
                <span class="audit-label">Coding submissions</span>
                <div class="audit-value">${codingCount} ${codingCount === 1 ? 'problem' : 'problems'}</div>
              </div>
            </div>
          </div>

          <div class="audit-group is-success">
            <h3 class="audit-group-title"><i class="fa-solid fa-video"></i> AI video interview</h3>
            <div class="audit-rows">
              <div class="audit-row is-wide">
                <span class="audit-label">Overall score</span>
                <div class="audit-value">${intS ? `${intS.overallScore}/100` : 'Not completed'}</div>
              </div>
            </div>
          </div>
        `;
      } else {
        modalBody.innerHTML = `<p class="modal-message is-error">${escapeHtml(data.message || 'Failed to load candidate details.')}</p>`;
      }
    } catch (e) {
      modalBody.innerHTML = `<p class="modal-message is-error">Failed to load candidate details.</p>`;
    }
  }

  // Export CSV
  document.getElementById('exportCsvBtn').addEventListener('click', async () => {
    try {
      const res = await fetch(`${baseUrl}/api/admin/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.data) {
        const rows = data.data;
        if (rows.length === 0) { notify('There is no candidate data to export yet.', 'warning'); return; }

        const headers = Object.keys(rows[0]).join(',');
        // Embedded quotes have to be doubled or the CSV column count breaks.
        const csvContent = 'data:text/csv;charset=utf-8,'
          + [headers, ...rows.map(r => Object.values(r)
              .map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `candidates_export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        notify(`Exported ${rows.length} candidate ${rows.length === 1 ? 'record' : 'records'}.`, 'success');
      } else {
        notify(data.message || 'Failed to export CSV.', 'error');
      }
    } catch (e) {
      console.error(e);
      notify('Failed to export CSV.', 'error');
    }
  });

  // Init
  fetchStats();
  fetchUsers();
});
