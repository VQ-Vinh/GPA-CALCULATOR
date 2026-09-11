let turnstileWidgetId = null;
let turnstileRequest = null;
let turnstileLoadPromise = null;
let resolveTurnstileLoad = null;
let rejectTurnstileLoad = null;
let turnstileLoadTimeout = null;
let syncInProgress = false;
let feedbackTimeout;
let feedbackAction = null;

function dismissAppFeedback() {
  const feedback = document.getElementById('app-feedback');
  clearTimeout(feedbackTimeout);
  feedbackAction = null;
  if (!feedback) return;
  feedback.className = 'app-feedback hidden';
  feedback.replaceChildren();
}

function showAppFeedback(message, options = {}) {
  const feedback = document.getElementById('app-feedback');
  if (!feedback) return;
  clearTimeout(feedbackTimeout);
  feedbackAction = typeof options.onAction === 'function' ? options.onAction : null;
  feedback.className = `app-feedback is-${options.type || 'info'}`;
  const text = document.createElement('span');
  text.textContent = message;
  feedback.replaceChildren(text);
  if (feedbackAction && options.actionLabel) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'app-feedback-action';
    button.textContent = options.actionLabel;
    feedback.appendChild(button);
  }
  feedbackTimeout = setTimeout(dismissAppFeedback, options.duration || 7000);
}

function setImportMessage(type, message) {
  const status = document.getElementById('import-message');
  if (!status) return;
  status.className = `inline-message is-${type}`;
  status.textContent = message;
}

function clearImportMessage() {
  const status = document.getElementById('import-message');
  if (!status) return;
  status.className = 'inline-message hidden';
  status.textContent = '';
}

function offerUndo(message, restore) {
  showAppFeedback(message, {
    type: 'info',
    actionLabel: 'Hoàn tác',
    onAction: () => {
      restore();
      renderSemesters();
      renderSummary();
      saveData();
      showAppFeedback('Đã hoàn tác thay đổi.', { type: 'success', duration: 3500 });
    },
  });
}

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
  clearTimeout(turnstileLoadTimeout);
  turnstileLoadTimeout = null;
  try {
    turnstileWidgetId = window.turnstile.render('#turnstile-container', {
      sitekey: TURNSTILE_SITE_KEY,
      size: window.matchMedia?.('(max-width: 24rem)').matches ? 'compact' : 'flexible',
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
    resolveTurnstileLoad?.();
  } catch (error) {
    turnstileLoadPromise = null;
    rejectTurnstileLoad?.(error);
  } finally {
    resolveTurnstileLoad = null;
    rejectTurnstileLoad = null;
  }
};

function ensureTurnstileLoaded() {
  if (!TURNSTILE_SITE_KEY) return Promise.reject(new Error('Chưa cấu hình Turnstile Site Key.'));
  if (window.turnstile && turnstileWidgetId !== null) return Promise.resolve();
  if (turnstileLoadPromise) return turnstileLoadPromise;

  turnstileLoadPromise = new Promise((resolve, reject) => {
    resolveTurnstileLoad = resolve;
    rejectTurnstileLoad = reject;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoaded&render=explicit';
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      clearTimeout(turnstileLoadTimeout);
      turnstileLoadTimeout = null;
      turnstileLoadPromise = null;
      resolveTurnstileLoad = null;
      rejectTurnstileLoad = null;
      reject(new Error('Không thể tải bộ xác thực Cloudflare. Vui lòng kiểm tra kết nối.'));
    };
    document.head.appendChild(script);
    turnstileLoadTimeout = setTimeout(() => {
      script.remove();
      turnstileLoadTimeout = null;
      turnstileLoadPromise = null;
      resolveTurnstileLoad = null;
      rejectTurnstileLoad = null;
      reject(new Error('Tải bộ xác thực quá thời gian. Vui lòng thử lại.'));
    }, 15000);
  });
  return turnstileLoadPromise;
}

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
  const originalLabel = parseButton.textContent;
  parseButton.disabled = true;
  parseButton.classList.add('is-busy');
  parseButton.textContent = 'Đang đồng bộ...';
  setSyncStatus('loading', 'Đang xác thực kết nối an toàn…');

  try {
    await ensureTurnstileLoaded();
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
    parseButton.textContent = originalLabel;
    if (window.turnstile && turnstileWidgetId !== null) window.turnstile.reset(turnstileWidgetId);
  }
}

let summaryTimeout;
let goalTimeout;
function scheduleSummary() {
  clearTimeout(summaryTimeout);
  summaryTimeout = setTimeout(renderSummary, 250);
}

function bindEvents() {
  function onStudentInput() {
    data.studentName = document.getElementById('student-name').value.trim();
    data.studentId = document.getElementById('student-id').value.trim();
    scheduleDataSave();
    validateStudentInfo();
  }
  document.getElementById('student-name').addEventListener('input', onStudentInput);
  document.getElementById('student-id').addEventListener('input', onStudentInput);

  document.getElementById('manual-entry-toggle').addEventListener('click', () => {
    updateManualEntryState(true);
    document.querySelector('.sub-name')?.focus();
  });

  document.getElementById('add-semester').addEventListener('click', () => {
    if (data.semesters.length >= MAX_MANUAL_SEMESTERS) {
      showAppFeedback(`Chỉ có thể nhập tay tối đa ${MAX_MANUAL_SEMESTERS} học kỳ.`, { type: 'warning' });
      return;
    }
    const num = data.semesters.length + 1;
    data.semesters.push({ name: `Học kỳ ${num}`, subjects: [{ name: '', credits: '', grade10: '' }] });
    renderSemesters();
    renderSummary();
    saveData();
  });

  document.getElementById('clear-all').addEventListener('click', () => {
    if (confirm('Xóa toàn bộ bảng điểm và mục tiêu đã lưu trên thiết bị này? Thao tác không thể hoàn tác.')) {
      localStorage.removeItem('gpaData');
      data = defaultData();
      renderAll();
      saveData();
    }
  });

  document.getElementById('import-parse').addEventListener('click', () => {
    const text = document.getElementById('import-paste').value;
    clearImportMessage();
    if (!text.trim()) {
      setImportMessage('error', 'Chưa có dữ liệu. Hãy dán toàn bộ trang bảng điểm BKEL vào ô trên.');
      document.getElementById('import-paste').focus();
      return;
    }

    const result = parseBKEL(text);
    if (!result.semesters || result.semesters.length === 0) {
      setImportMessage('error', 'Không tìm thấy học kỳ. Hãy kiểm tra bạn đã sao chép toàn bộ trang bảng điểm BKEL.');
      return;
    }

    const limitError = validateImportLimits(result);
    if (limitError) {
      setImportMessage('error', limitError);
      return;
    }

    parsedImport = result;
    data.semesters = result.semesters;
    if (result.studentName) data.studentName = result.studentName;
    if (result.studentId) data.studentId = result.studentId;
    saveData();
    renderAll();
    clearImportMessage();
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

  document.getElementById('app-feedback').addEventListener('click', (e) => {
    if (!e.target.closest('.app-feedback-action') || !feedbackAction) return;
    const action = feedbackAction;
    feedbackAction = null;
    action();
  });

  document.getElementById('semesters-container').addEventListener('input', (e) => {
    const target = e.target;
    const card = target.closest('.semester-card');
    if (!card) return;

    if (target.matches('.sem-name, .sub-name') && /[\r\n]/.test(target.value)) {
      const caret = target.selectionStart;
      target.value = target.value.replace(/[\r\n]/g, ' ');
      target.setSelectionRange(caret, caret);
    }

    const collected = collectSemesterInput(target, card);
    if (!collected) return;
    if (target.classList.contains('sem-name')) {
      updateSemesterToggleState(card, !card.classList.contains('is-collapsed'));
    }
    scheduleDataSave();
    scheduleSummary();

    if (target.classList.contains('sub-grade10') || target.classList.contains('sub-credits')) {
      const semIndex = collected.semesterIndex;
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
      }
    }

    if (target.classList.contains('sub-name')) {
      const tr = target.closest('tr');
      const nameTd = tr.cells[1];
      const flexDiv = nameTd && nameTd.querySelector('.name-cell');
      if (flexDiv) {
        const semIndex = collected.semesterIndex;
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

  document.getElementById('semesters-container').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('.sem-name, .sub-name')) e.preventDefault();
  });

  document.getElementById('semesters-container').addEventListener('click', (e) => {
    const card = e.target.closest('.semester-card');
    if (!card) return;

    if (e.target.closest('.delete-semester')) {
      if (data.semesters.length <= 1) {
        showAppFeedback('Cần giữ lại ít nhất một học kỳ.', { type: 'warning' });
        return;
      }
      const idx = Array.from(document.querySelectorAll('.semester-card')).indexOf(card);
      const removed = data.semesters.splice(idx, 1)[0];
      renderSemesters();
      renderSummary();
      saveData();
      offerUndo(`Đã xóa ${removed.name || 'học kỳ'}.`, () => {
        data.semesters.splice(Math.min(idx, data.semesters.length), 0, removed);
      });
      return;
    }

    if (e.target.closest('.delete-subject')) {
      const tr = e.target.closest('.delete-subject').closest('tr');
      const tbody = tr.closest('tbody');
      const idx = Array.from(tbody.children).indexOf(tr);
      const semIdx = Array.from(document.querySelectorAll('.semester-card')).indexOf(card);
      const semester = data.semesters[semIdx];
      if (semester.subjects.length > 1) {
        const removed = semester.subjects.splice(idx, 1)[0];
        renderSemesters();
        renderSummary();
        saveData();
        offerUndo(`Đã xóa ${removed.name || `môn ${idx + 1}`}.`, () => {
          semester.subjects.splice(Math.min(idx, semester.subjects.length), 0, removed);
        });
      } else {
        showAppFeedback('Cần giữ lại ít nhất một môn trong học kỳ.', { type: 'warning' });
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
      } else {
        showAppFeedback(`Mỗi học kỳ chỉ có thể nhập tay tối đa ${MAX_MANUAL_SUBJECTS} môn.`, { type: 'warning' });
      }
      return;
    }

    if (e.target.closest('.sem-toggle') || (e.target.closest('.sem-header') && !e.target.closest('button, input, textarea'))) {
      const expanded = card.classList.contains('is-collapsed');
      card.classList.toggle('is-collapsed', !expanded);
      updateSemesterToggleState(card, expanded);
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
    scheduleDataSave();
    clearTimeout(goalTimeout);
    goalTimeout = setTimeout(updateGoalOutputsFromInputs, 150);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderAll();
  bindEvents();
});

window.addEventListener('pagehide', flushDataSave);
