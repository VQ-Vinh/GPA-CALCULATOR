let turnstileWidgetId = null;
let turnstileRequest = null;
let syncInProgress = false;

function escapeImportHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setSyncStatus(type, message, retry = false) {
  const status = document.getElementById('import-sync-status');
  if (!status) return;
  status.className = `import-sync-status is-${type}`;
  status.innerHTML = `
    <div><strong>${type === 'loading' ? 'Đang đồng bộ' : 'Chưa thể đồng bộ'}</strong><p>${escapeImportHtml(message)}</p></div>
    ${retry ? '<button type="button" id="import-sync-retry">Thử lại</button>' : ''}
  `;
}

function clearSyncStatus() {
  const status = document.getElementById('import-sync-status');
  if (!status) return;
  status.className = 'import-sync-status';
  status.innerHTML = '';
}

function rejectTurnstile(message) {
  if (!turnstileRequest) return;
  clearTimeout(turnstileRequest.timeout);
  turnstileRequest.reject(new Error(message));
  turnstileRequest = null;
}

window.onTurnstileLoaded = function () {
  if (!TURNSTILE_SITE_KEY || !window.turnstile || turnstileWidgetId !== null) return;
  turnstileWidgetId = window.turnstile.render('#turnstile-container', {
    sitekey: TURNSTILE_SITE_KEY,
    action: 'sync_grades',
    appearance: 'interaction-only',
    execution: 'execute',
    callback(token) {
      if (!turnstileRequest) return;
      clearTimeout(turnstileRequest.timeout);
      turnstileRequest.resolve(token);
      turnstileRequest = null;
    },
    'error-callback': () => rejectTurnstile('Cloudflare không thể xác thực. Vui lòng thử lại.'),
    'expired-callback': () => rejectTurnstile('Phiên xác thực đã hết hạn. Vui lòng thử lại.'),
  });
};

function requestTurnstileToken() {
  if (!TURNSTILE_SITE_KEY) return Promise.reject(new Error('Chưa cấu hình Turnstile Site Key.'));
  if (!window.turnstile || turnstileWidgetId === null) return Promise.reject(new Error('Turnstile chưa sẵn sàng. Vui lòng thử lại.'));
  rejectTurnstile('Yêu cầu xác thực mới đã thay thế yêu cầu cũ.');
  window.turnstile.reset(turnstileWidgetId);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => rejectTurnstile('Xác thực quá thời gian. Vui lòng thử lại.'), 45000);
    turnstileRequest = { resolve, reject, timeout };
    window.turnstile.execute(turnstileWidgetId);
  });
}

async function syncParsedImport(result) {
  if (syncInProgress) return;
  const studentName = result.studentName.trim();
  const studentId = result.studentId.trim();
  if (!studentName || !/^\d{7,12}$/.test(studentId)) {
    setSyncStatus('error', 'Thiếu họ tên hoặc MSSV hợp lệ (7 đến 12 chữ số). Dữ liệu chưa được gửi.', false);
    return;
  }

  syncInProgress = true;
  const parseButton = document.getElementById('import-parse');
  parseButton.disabled = true;
  parseButton.classList.add('is-busy');
  setSyncStatus('loading', 'Đang xác thực kết nối an toàn…');

  try {
    const turnstileToken = await requestTurnstileToken();
    setSyncStatus('loading', 'Đang cập nhật Google Sheet…');
    const controller = new AbortController();
    const requestTimeout = setTimeout(() => controller.abort(), 25000);
    let response;
    try {
      response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          turnstileToken,
          studentName,
          studentId,
          semesters: result.semesters,
        }),
      });
    } finally {
      clearTimeout(requestTimeout);
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) throw new Error(body.error || 'Máy chủ không thể đồng bộ dữ liệu.');
    clearSyncStatus();
  } catch (error) {
    const message = error.name === 'AbortError'
      ? 'Đồng bộ quá thời gian. Vui lòng thử lại.'
      : error.message || 'Không thể đồng bộ dữ liệu.';
    setSyncStatus('error', message, true);
  } finally {
    syncInProgress = false;
    parseButton.disabled = false;
    parseButton.classList.remove('is-busy');
    if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
  }
}

let summaryTimeout;
let goalTimeout;
function scheduleSummary() {
  clearTimeout(summaryTimeout);
  summaryTimeout = setTimeout(renderSummary, 250);
}

function refresh() {
  collectData();
  saveData();
  renderSemesters();
  renderSummary();
}

function bindEvents() {
  function onStudentInput() {
    data.studentName = document.getElementById('student-name').value.trim();
    data.studentId = document.getElementById('student-id').value.trim();
    saveData();
    validateStudentInfo();
  }
  document.getElementById('student-name').addEventListener('input', onStudentInput);
  document.getElementById('student-id').addEventListener('input', onStudentInput);

  document.getElementById('add-semester').addEventListener('click', () => {
    if (data.semesters.length >= MAX_MANUAL_SEMESTERS) return;
    const num = data.semesters.length + 1;
    data.semesters.push({ name: `Học kỳ ${num}`, subjects: [{ name: '', credits: '', grade10: '' }] });
    renderSemesters();
    renderSummary();
    saveData();
  });

  document.getElementById('clear-all').addEventListener('click', () => {
    if (confirm('Bạn có chắc muốn xóa tất cả dữ liệu?')) {
      localStorage.removeItem('gpaData');
      data = defaultData();
      renderAll();
      saveData();
    }
  });

  document.getElementById('import-parse').addEventListener('click', () => {
    const text = document.getElementById('import-paste').value;
    if (!text.trim()) { alert('Vui lòng dán dữ liệu bảng điểm vào ô trên.'); return; }

    const result = parseBKEL(text);
    if (!result.semesters || result.semesters.length === 0) {
      alert('Không tìm thấy dữ liệu học kỳ nào. Vui lòng kiểm tra lại.');
      return;
    }

    const limitError = validateImportLimits(result);
    if (limitError) {
      alert(limitError);
      return;
    }

    parsedImport = result;
    data.semesters = result.semesters;
    if (result.studentName) data.studentName = result.studentName;
    if (result.studentId) data.studentId = result.studentId;
    saveData();
    renderAll();
    document.getElementById('import-paste').value = '';

    const subjectCount = result.semesters.reduce((n, sem) => n + sem.subjects.length, 0);
    document.getElementById('import-preview').innerHTML = `
      <div class="import-result">
        <div class="import-result-head">
          <strong>Đã nhập ${result.semesters.length} học kỳ, ${subjectCount} môn học.</strong>
        </div>
        <div class="import-student-preview">
          <div><small>Họ và tên</small><strong>${escapeImportHtml(result.studentName || '-')}</strong></div>
          <div><small>MSSV</small><strong>${escapeImportHtml(result.studentId || '-')}</strong></div>
        </div>
      </div>
      <section id="import-sync-status" class="import-sync-status is-loading" aria-live="polite"></section>
    `;

    syncParsedImport(result);
    document.getElementById('section-summary').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('import-preview').addEventListener('click', (e) => {
    if (e.target.closest('#import-sync-retry') && parsedImport) syncParsedImport(parsedImport);
  });

  document.getElementById('semesters-container').addEventListener('input', (e) => {
    const target = e.target;
    const card = target.closest('.semester-card');
    if (!card) return;

    collectData();
    saveData();
    scheduleSummary();

    if (target.classList.contains('sub-grade10') || target.classList.contains('sub-credits')) {
      const semIndex = Array.from(document.querySelectorAll('.semester-card')).indexOf(card);
      if (semIndex >= 0) {
        const result = calcSemester(data.semesters[semIndex].subjects);
        const resultDiv = card.querySelector('.sem-result');
        if (resultDiv) {
          resultDiv.innerHTML = `
            <span>Hệ 10 <strong>${fmt(result.gpa10)}</strong></span>
            <span>Hệ 4 <strong>${fmt(result.gpa4)}</strong></span>
            <span>Tổng TC <strong>${result.totalCredits}</strong></span>
          `;
        }
        const headerInfo = card.querySelector('.sem-meta');
        if (headerInfo) {
          headerInfo.innerHTML = `<span>${result.totalCredits} TC</span><span>Hệ 10: ${fmt(result.gpa10)}</span><span>Hệ 4: ${fmt(result.gpa4)}</span>`;
        }
      }
    }

    if (target.classList.contains('sub-name')) {
      const tr = target.closest('tr');
      const nameTd = tr.cells[1];
      const flexDiv = nameTd && nameTd.querySelector('.name-cell');
      if (flexDiv) {
        const semIndex = Array.from(document.querySelectorAll('.semester-card')).indexOf(card);
        const name = target.value.trim();
        const retakeInfo = name ? isRetake(target.value, semIndex) : null;
        const existingBadge = flexDiv.querySelector('.retake-badge');
        if (retakeInfo && !existingBadge) {
          const badge = document.createElement('span');
          badge.className = 'retake-badge';
          badge.title = `Đã học tại ${retakeInfo.semester} (điểm: ${retakeInfo.grade10 != null ? retakeInfo.grade10 : 'N/A'})`;
          badge.textContent = 'Cải thiện';
          flexDiv.appendChild(badge);
        } else if (!retakeInfo && existingBadge) {
          existingBadge.remove();
        }
      }
    }

    if (target.classList.contains('sub-grade10')) {
      const tr = target.closest('tr');
      const tdLetter = tr.cells[4];
      const tdGpa4 = tr.cells[5];
      const found = findGrade(target.value);
      const tone = found ? gradeToneClass(found.gpa4) : 'muted';
      tdLetter.textContent = found ? found.letter : '-';
      tdLetter.className = `col-num cell-letter ${tone}`;
      tdGpa4.textContent = found ? fmt(found.gpa4) : '-';
      tdGpa4.className = `col-num cell-gpa4 ${tone}`;
    }
  });

  document.getElementById('semesters-container').addEventListener('click', (e) => {
    const card = e.target.closest('.semester-card');
    if (!card) return;

    if (e.target.closest('.delete-semester')) {
      if (data.semesters.length <= 1) return;
      const idx = Array.from(document.querySelectorAll('.semester-card')).indexOf(card);
      data.semesters.splice(idx, 1);
      renderSemesters();
      renderSummary();
      saveData();
      return;
    }

    if (e.target.closest('.delete-subject')) {
      const tr = e.target.closest('.delete-subject').closest('tr');
      const tbody = tr.closest('tbody');
      const idx = Array.from(tbody.children).indexOf(tr);
      const semIdx = Array.from(document.querySelectorAll('.semester-card')).indexOf(card);
      if (data.semesters[semIdx].subjects.length > 1) {
        data.semesters[semIdx].subjects.splice(idx, 1);
        renderSemesters();
        renderSummary();
        saveData();
      }
      return;
    }

    if (e.target.closest('.add-subject')) {
      const semIdx = Array.from(document.querySelectorAll('.semester-card')).indexOf(card);
      if (data.semesters[semIdx].subjects.length < MAX_MANUAL_SUBJECTS) {
        data.semesters[semIdx].subjects.push({ name: '', credits: '', grade10: '' });
        renderSemesters();
        renderSummary();
        saveData();
      }
      return;
    }

    if (e.target.closest('.sem-toggle') || (e.target.closest('.sem-header') && !e.target.closest('button') && !e.target.closest('input'))) {
      card.classList.toggle('is-collapsed');
    }
  });

  document.getElementById('summary-content').addEventListener('input', (e) => {
    if (!e.target.matches('#goal-credits-input, #goal-gpa-input, #goal-expected-input')) return;
    const requiredInput = document.getElementById('goal-credits-input');
    const targetInput = document.getElementById('goal-gpa-input');
    const expectedInput = document.getElementById('goal-expected-input');
    const goal = parseGoalInputs(requiredInput.value, targetInput.value, expectedInput.value);
    if (goal.requiredValid) data.gradRequiredCredits = goal.requiredCredits;
    data.targetGpa = targetInput.value.trim();
    data.expectedRemainingGpa = expectedInput.value.trim();
    saveData();
    clearTimeout(goalTimeout);
    goalTimeout = setTimeout(updateGoalOutputsFromInputs, 150);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderAll();
  bindEvents();
});
