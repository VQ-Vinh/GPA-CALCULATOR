let expandedState = new Map();

function esc(value) {
  return String(value == null ? '' : value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const GRADE_TONES = {
  '4': 'g-4', '3.5': 'g-35', '3': 'g-3', '2.5': 'g-25',
  '2': 'g-2', '1.5': 'g-15', '1': 'g-1', '0': 'g-0',
};

function gradeToneClass(gpa4) {
  if (gpa4 === '' || gpa4 == null) return '';
  const v = Number(gpa4);
  if (isNaN(v)) return '';
  return GRADE_TONES[String(v)] || '';
}

function renderSemesters() {
  saveExpandedState();
  const container = document.getElementById('semesters-container');
  if (data.semesters.length === 0) {
    container.innerHTML = `<p class="empty-note">Chưa có học kỳ nào. Chọn <strong>Thêm học kỳ</strong> để bắt đầu.</p>`;
    return;
  }
  container.innerHTML = data.semesters.map((sem, si) => {
    const result = calcSemester(sem.subjects);
    const bodyId = `semester-body-${si}`;
    return `<div class="semester-card" data-sem-index="${si}">
      <div class="sem-header">
        <button type="button" class="sem-toggle" aria-expanded="true" aria-controls="${bodyId}" aria-label="Thu gọn ${esc(sem.name)}"></button>
        <input type="text" class="sem-name" value="${esc(sem.name)}" maxlength="100" aria-label="Tên học kỳ">
        <span class="sem-actions">
          <button type="button" class="add-subject btn btn-ghost btn-sm">Thêm môn</button>
          <button type="button" class="delete-semester row-delete" title="Xóa học kỳ" aria-label="Xóa ${esc(sem.name)}"></button>
        </span>
      </div>
      <div class="sem-body" id="${bodyId}">
        <div class="table-scroll" tabindex="0" role="region" aria-label="Bảng môn học của ${esc(sem.name)}, có thể cuộn ngang">
          <table class="data-table subject-table">
            <thead>
              <tr>
                <th class="col-num">#</th>
                <th>Tên môn học</th>
                <th class="col-num">Tín chỉ</th>
                <th class="col-num">Điểm 10</th>
                <th class="col-num">Chữ</th>
                <th class="col-num">Hệ 4</th>
                <th class="col-act"></th>
              </tr>
            </thead>
            <tbody>
              ${sem.subjects.map((sub, ri) => {
                const found = sub.grade10 !== '' ? findGrade(sub.grade10) : null;
                const retakeInfo = sub.name.trim() ? isRetake(sub.name, si) : null;
                const subjectLabel = sub.name.trim() || `môn ${ri + 1}`;
                return `<tr data-subject-index="${ri}">
                  <td class="col-num muted">${ri + 1}</td>
                  <td>
                    <div class="name-cell">
                      <input type="text" class="sub-name" value="${esc(sub.name)}" maxlength="200" placeholder="Tên môn học" aria-label="Tên môn ${ri + 1} trong ${esc(sem.name)}">
                      ${retakeInfo ? `<span class="retake-badge" title="Đã học tại ${esc(retakeInfo.semester)} (điểm: ${retakeInfo.grade10 != null ? retakeInfo.grade10 : 'N/A'})">Cải thiện</span>` : ''}
                    </div>
                  </td>
                  <td class="col-num"><input type="number" class="sub-credits" value="${esc(sub.credits)}" min="0" max="20" step="0.5" placeholder="0" aria-label="Tín chỉ của ${esc(subjectLabel)}"></td>
                  <td class="col-num"><input type="number" class="sub-grade10" value="${esc(sub.grade10)}" min="0" max="10" step="0.1" placeholder="0.0" aria-label="Điểm hệ 10 của ${esc(subjectLabel)}"></td>
                  <td class="col-num cell-letter ${found ? gradeToneClass(found.gpa4) : 'muted'}">${found ? found.letter : '-'}</td>
                  <td class="col-num cell-gpa4 ${found ? gradeToneClass(found.gpa4) : 'muted'}">${found ? fmt(found.gpa4) : '-'}</td>
                  <td class="col-act"><button type="button" class="delete-subject row-delete" title="Xóa môn" aria-label="Xóa ${esc(subjectLabel)}"></button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="sem-result">
          <span>Hệ 10 <strong>${fmt(result.gpa10)}</strong></span>
          <span>Hệ 4 <strong>${fmt(result.gpa4)}</strong></span>
          <span>Tổng TC <strong>${result.totalCredits}</strong></span>
        </div>
      </div>
    </div>`;
  }).join('');
  applySemesterStates();
}

function applySemesterStates() {
  document.querySelectorAll('.semester-card').forEach(card => {
    const idx = parseInt(card.dataset.semIndex);
    const wasExpanded = expandedState.has(idx)
      ? expandedState.get(idx)
      : (idx === data.semesters.length - 1 || data.semesters.length <= 1);
    card.classList.toggle('is-collapsed', !wasExpanded);
    updateSemesterToggleState(card, wasExpanded);
  });
}

function updateSemesterToggleState(card, expanded) {
  const toggle = card.querySelector('.sem-toggle');
  const semesterName = card.querySelector('.sem-name')?.value.trim() || 'học kỳ';
  if (!toggle) return;
  toggle.setAttribute('aria-expanded', String(expanded));
  toggle.setAttribute('aria-label', `${expanded ? 'Thu gọn' : 'Mở rộng'} ${semesterName}`);
}

function saveExpandedState() {
  expandedState = new Map();
  document.querySelectorAll('.semester-card').forEach(card => {
    const idx = parseInt(card.dataset.semIndex);
    expandedState.set(idx, !card.classList.contains('is-collapsed'));
  });
}

function renderGPATrendChart() {
  const chartData = data.semesters
    .map(sem => ({ ...calcSemester(sem.subjects), name: sem.name }))
    .filter(d => d.totalCredits > 0);
  if (chartData.length < 2) return '';

  const W = 720, H = 260;
  const chartMinWidth = Math.max(560, chartData.length * 72);
  const pt = 20, pr = 46, pb = 46, pl = 40;
  const cw = W - pl - pr, ch = H - pt - pb;
  const xStep = cw / (chartData.length - 1);
  const yPos = val => pt + ch - (val / 4) * ch;

  const pts4 = chartData.map((d, i) => ({ x: pl + i * xStep, y: yPos(d.gpa4), val: d.gpa4 }));
  const pts10 = chartData.map((d, i) => ({ x: pl + i * xStep, y: yPos(d.gpa10 / 2.5), val: d.gpa10 }));
  const line = pts => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');

  let html = `<div class="chart-scroll" style="--chart-min-width:${chartMinWidth}px" tabindex="0" role="region" aria-label="Biểu đồ GPA qua các học kỳ, có thể cuộn ngang"><svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Biểu đồ GPA qua các học kỳ" xmlns="http://www.w3.org/2000/svg">`;
  for (let i = 0; i <= 4; i++) {
    const y = yPos(i);
    html += `<line x1="${pl}" y1="${y}" x2="${W - pr}" y2="${y}" class="chart-grid"/>`;
    html += `<text x="${pl - 8}" y="${y + 4}" text-anchor="end" class="chart-axis chart-axis-4">${i}.0</text>`;
    html += `<text x="${W - pr + 8}" y="${y + 4}" text-anchor="start" class="chart-axis chart-axis-10">${(i * 2.5).toFixed(1)}</text>`;
  }
  html += `<path d="${line(pts4)}" class="chart-line-4"/>`;
  html += pts4.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3.5" class="chart-dot-4"><title>Hệ 4: ${p.val.toFixed(2)}</title></circle>`).join('');
  html += `<path d="${line(pts10)}" class="chart-line-10"/>`;
  html += pts10.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3" class="chart-dot-10"><title>Hệ 10: ${p.val.toFixed(2)}</title></circle>`).join('');

  chartData.forEach((d, i) => {
    const x = pl + i * xStep;
    const m = d.name.match(/^(.+?)\s*\((\d{4})\s*-\s*(\d{4})\)$/);
    if (m) {
      html += `<text x="${x}" y="${pt + ch + 18}" text-anchor="middle" class="chart-label"><tspan x="${x}">${esc(m[1].trim())}</tspan><tspan x="${x}" dy="12">${m[2]}-${m[3]}</tspan></text>`;
    } else {
      html += `<text x="${x}" y="${pt + ch + 22}" text-anchor="middle" class="chart-label">${esc(d.name)}</text>`;
    }
  });
  html += `</svg></div>
  <p class="chart-legend"><span class="key key-4"></span>Hệ 4<span class="key key-10"></span>Hệ 10 (quy về thang 4)</p>`;
  return html;
}

function formatCredits(value) {
  const rounded = Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  return String(rounded);
}

function parseGoalInputs(requiredRaw, targetRaw, expectedRaw) {
  const requiredText = String(requiredRaw ?? '').trim();
  const targetText = String(targetRaw ?? '').trim();
  const expectedText = String(expectedRaw ?? '').trim();
  const requiredCredits = Number(requiredText);
  const targetGpa = Number(targetText);
  const expectedRemainingGpa = Number(expectedText);
  return {
    requiredCredits,
    targetGpa,
    expectedRemainingGpa,
    requiredValid: requiredText !== '' && Number.isFinite(requiredCredits) && requiredCredits >= 1 && requiredCredits <= 300,
    targetValid: targetText !== '' && Number.isFinite(targetGpa) && targetGpa >= 0 && targetGpa <= 4,
    expectedValid: expectedText !== '' && Number.isFinite(expectedRemainingGpa) && expectedRemainingGpa >= 0 && expectedRemainingGpa <= 4,
  };
}

function renderGoalResult(cumulative, goal) {
  if (!goal.requiredValid) return `<p class="goal-result is-bad">Tổng tín chỉ cần để tốt nghiệp phải từ 1 đến 300.</p>`;
  if (!goal.targetValid) return `<p class="goal-result is-bad">GPA tốt nghiệp mong muốn phải từ 0 đến 4.</p>`;
  const remainingCredits = Math.max(0, goal.requiredCredits - cumulative.totalCredits);
  if (remainingCredits <= 0) {
    return cumulative.gpa4 >= goal.targetGpa
      ? `<p class="goal-result is-good">Đã đủ ${goal.requiredCredits} tín chỉ và GPA hiện tại đã đạt mục tiêu ${fmt(goal.targetGpa)}.</p>`
      : `<p class="goal-result is-bad">Đã đủ ${goal.requiredCredits} tín chỉ nhưng GPA hiện tại là ${fmt(cumulative.gpa4)}. Cần học cải thiện để đạt ${fmt(goal.targetGpa)}.</p>`;
  }
  const needed = (goal.targetGpa * goal.requiredCredits - cumulative.gpa4 * cumulative.totalCredits) / remainingCredits;
  if (needed < 0) return `<p class="goal-result is-good">GPA hiện tại đã vượt mục tiêu ${fmt(goal.targetGpa)}.</p>`;
  if (needed > 4) {
    return `<p class="goal-result is-warn">Chỉ với ${formatCredits(remainingCredits)} tín chỉ còn lại, bạn cần GPA ${fmt(needed)}, vượt mức tối đa 4.00. Hãy kết hợp học cải thiện theo gợi ý bên cạnh.</p>`;
  }
  return `<p class="goal-result">Nếu không học cải thiện, bạn cần đạt GPA <strong>${fmt(needed)}</strong> cho ${formatCredits(remainingCredits)} tín chỉ còn lại.</p>`;
}

function renderImprovementOptions(goalTarget, goalRequired, expectedRemainingGpa) {
  const analysis = calculateImprovementScenarios(goalTarget, goalRequired, expectedRemainingGpa);
  let html = `<h4>Phương án học cải thiện</h4>`;
  if (analysis.status === 'enough') {
    return `${html}<p class="goal-scenario-state is-good">Với ${formatCredits(analysis.remainingCredits)} tín chỉ còn lại dự kiến đạt GPA ${fmt(expectedRemainingGpa)}, GPA tốt nghiệp tổng dự kiến là <strong>${fmt(analysis.projectedGpa)}</strong>. Bạn không cần học cải thiện để đạt mục tiêu.</p>`;
  }
  if (analysis.status === 'impossible') {
    return `${html}<p class="goal-scenario-state is-bad">Ngay cả khi tính ${formatCredits(analysis.remainingCredits)} tín chỉ còn lại ở GPA ${fmt(expectedRemainingGpa)} và nâng toàn bộ môn phù hợp lên A, GPA tốt nghiệp tổng cao nhất là <strong>${fmt(analysis.maxGpa)}</strong>.</p>`;
  }
  if (analysis.scenarios.length === 0) {
    return `${html}<p class="goal-scenario-state is-bad">Không có phương án học cải thiện phù hợp từ bảng điểm hiện tại.</p>`;
  }

  html += `<p class="goal-scenario-note">Mỗi kết quả là GPA tốt nghiệp tổng, đã gồm ${formatCredits(analysis.currentCredits)} tín chỉ hiện tại, ${formatCredits(analysis.remainingCredits)} tín chỉ chưa học ở GPA ${fmt(expectedRemainingGpa)} và phần tăng do học cải thiện.</p><div class="goal-scenario-list">`;
  html += analysis.scenarios.map((scenario, index) => {
    const improvement = scenario.aCredits > 0 && scenario.bPlusCredits > 0
      ? `${formatCredits(scenario.aCredits)} TC lên A + ${formatCredits(scenario.bPlusCredits)} TC lên B+`
      : scenario.aCredits > 0
        ? `${formatCredits(scenario.aCredits)} TC lên A`
        : `${formatCredits(scenario.bPlusCredits)} TC lên B+`;
    return `<article class="goal-scenario">
      <p class="goal-scenario-title"><span>Phương án ${index + 1}</span><strong>Cải thiện ${improvement}</strong></p>
      <small>GPA tốt nghiệp tổng dự kiến <strong>${fmt(scenario.projectedGpa)}</strong></small>
    </article>`;
  }).join('');
  return `${html}</div>`;
}

function goalRemainingLabel(goal, cumulative) {
  const remaining = goal.requiredValid
    ? formatCredits(Math.max(0, goal.requiredCredits - cumulative.totalCredits))
    : '-';
  return `GPA dự kiến (${remaining} tín) còn lại`;
}

function goalExpectedHint(goal, cumulative) {
  if (!goal.requiredValid) return 'Đây là GPA trung bình bạn dự đoán cho phần tín chỉ chưa học.';
  const remaining = Math.max(0, goal.requiredCredits - cumulative.totalCredits);
  if (remaining === 0) return 'Bạn đã đủ tín chỉ yêu cầu nên giả định này không ảnh hưởng kết quả.';
  return `Đây là GPA trung bình bạn dự đoán cho ${formatCredits(remaining)} tín chỉ chưa học, không phải GPA bắt buộc phải đạt.`;
}

function renderGoalScenarios(goal) {
  if (!goal.requiredValid) return `<h4>Phương án học cải thiện</h4><p class="goal-scenario-state">Nhập tổng tín chỉ cần để tốt nghiệp từ 1 đến 300.</p>`;
  if (!goal.targetValid) return `<h4>Phương án học cải thiện</h4><p class="goal-scenario-state">Nhập GPA tốt nghiệp mong muốn từ 0 đến 4.</p>`;
  if (!goal.expectedValid) return `<h4>Phương án học cải thiện</h4><p class="goal-scenario-state">Nhập GPA dự kiến cho phần tín chỉ còn lại từ 0 đến 4 để xem phương án.</p>`;
  return renderImprovementOptions(goal.targetGpa, goal.requiredCredits, goal.expectedRemainingGpa);
}

function updateGoalOutputsFromInputs() {
  const requiredInput = document.getElementById('goal-credits-input');
  const targetInput = document.getElementById('goal-gpa-input');
  const expectedInput = document.getElementById('goal-expected-input');
  const resultContainer = document.getElementById('goal-result-content');
  const scenarioContainer = document.getElementById('goal-scenarios-content');
  const expectedLabel = document.getElementById('goal-expected-label');
  const expectedHint = document.getElementById('goal-expected-hint');
  if (!requiredInput || !targetInput || !expectedInput || !resultContainer || !scenarioContainer || !expectedLabel || !expectedHint) return;
  const goal = parseGoalInputs(requiredInput.value, targetInput.value, expectedInput.value);
  const cumulative = calcCumulative();
  expectedLabel.textContent = goalRemainingLabel(goal, cumulative);
  expectedHint.textContent = goalExpectedHint(goal, cumulative);
  resultContainer.innerHTML = renderGoalResult(cumulative, goal);
  scenarioContainer.innerHTML = renderGoalScenarios(goal);
}

function renderSummary() {
  const container = document.getElementById('summary-content');
  const cum = calcCumulative();

  if (cum.totalCredits === 0) {
    container.innerHTML = `<p class="empty-note">Chưa có dữ liệu để tính GPA. Dán bảng điểm ở mục 1 hoặc nhập tay ở mục 3.</p>`;
    return;
  }

  let html = `<div class="metric-row">
    <div class="metric metric-lead tone-accent"><span>GPA Hệ 4</span><strong>${fmt(cum.gpa4)}</strong><small>trên 4.00</small></div>
    <div class="metric tone-good"><span>GPA Hệ 10</span><strong>${fmt(cum.gpa10)}</strong><small>trên 10.00</small></div>
    <div class="metric tone-warm"><span>Tín chỉ tích lũy</span><strong>${cum.totalCredits}</strong><small>${data.semesters.length} học kỳ</small></div>
  </div>`;

  const goalRequired = data.gradRequiredCredits || 130;
  const expectedRaw = data.expectedRemainingGpa == null ? '3' : String(data.expectedRemainingGpa);
  const goal = parseGoalInputs(goalRequired, data.targetGpa, expectedRaw);
  html += `<section class="summary-block goal-block">
    <h3>Mục tiêu tốt nghiệp</h3>
    <div class="goal-layout"><div class="goal-main"><div class="goal-controls">
      <label>Tổng tín chỉ cần để tốt nghiệp<input id="goal-credits-input" type="number" value="${goalRequired}" min="1" max="300"></label>
      <label>GPA tốt nghiệp mong muốn<input id="goal-gpa-input" type="number" step="0.01" min="0" max="4" value="${esc(data.targetGpa)}" placeholder="VD: 3.2"></label>
      <label><span id="goal-expected-label">${goalRemainingLabel(goal, cum)}</span><input id="goal-expected-input" type="number" step="0.01" min="0" max="4" value="${esc(expectedRaw)}" placeholder="VD: 3.0" aria-labelledby="goal-expected-label" aria-describedby="goal-expected-hint"></label>
    </div><p id="goal-expected-hint" class="goal-explanation">${goalExpectedHint(goal, cum)}</p><div id="goal-result-content" role="status" aria-live="polite" aria-atomic="true">${renderGoalResult(cum, goal)}</div></div>
    <div id="goal-scenarios-content" class="goal-scenarios">${renderGoalScenarios(goal)}</div>
    </div></section>`;

  const chart = renderGPATrendChart();
  const chartBlock = chart ? `<section class="summary-block insight-chart">
    <h3>Xu hướng qua từng học kỳ</h3>${chart}
  </section>` : '';
  const semesterBlock = `<section class="summary-block insight-semesters">
    <h3>Từng học kỳ</h3>
    <div class="table-scroll" tabindex="0" role="region" aria-label="Bảng tóm tắt GPA từng học kỳ, có thể cuộn ngang">
      <table class="data-table semester-summary-table">
        <thead><tr><th>Học kỳ</th><th class="col-num">Số môn</th><th class="col-num">Hệ 10</th><th class="col-num">Hệ 4</th><th class="col-num">Tín chỉ</th></tr></thead>
        <tbody>
          ${data.semesters.map(sem => {
            const r = calcSemester(sem.subjects);
            const count = sem.subjects.filter(s => parseFloat(s.credits) > 0 && s.grade10 !== '').length;
            return `<tr>
              <td>${esc(sem.name)}</td>
              <td class="col-num muted">${count}</td>
              <td class="col-num">${fmt(r.gpa10)}</td>
              <td class="col-num">${fmt(r.gpa4)}</td>
              <td class="col-num">${r.totalCredits}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </section>`;
  html += `<div class="summary-insights ${chart ? '' : 'is-single'}">${chartBlock}${semesterBlock}</div>`;

  const improved = [];
  const seen = new Map();
  for (let i = 0; i < data.semesters.length; i++) {
    for (const sub of data.semesters[i].subjects) {
      const key = sub.name.trim().toLowerCase();
      if (!key) continue;
      const cr = parseFloat(sub.credits);
      const g10 = parseFloat(sub.grade10);
      if (!(cr > 0) || isNaN(g10) || sub.grade10 === '') continue;
      const prev = seen.get(key);
      if (prev && g10 > prev.grade10) {
        improved.push({
          name: sub.name.trim(),
          prevSemester: prev.semester,
          prevGrade: prev.grade10,
          curSemester: data.semesters[i].name,
          curGrade: g10,
        });
      }
      if (!prev || g10 > prev.grade10) seen.set(key, { semester: data.semesters[i].name, grade10: g10 });
    }
  }

  if (improved.length > 0) {
    const orig = calcCumulativeOriginal();
    const diff = cum.gpa4 - orig.gpa4;
    html += `<section class="summary-block improvement-block">
      <h3>Môn cải thiện</h3>
      <p class="card-note">GPA tích lũy dùng điểm cao nhất của mỗi môn. Trước cải thiện <strong>${fmt(orig.gpa4)}</strong> → sau cải thiện <strong>${fmt(cum.gpa4)}</strong> <span class="delta ${diff >= 0 ? 'is-good' : 'is-bad'}">${diff >= 0 ? '+' : ''}${fmt(diff)}</span></p>
      <div class="table-scroll" tabindex="0" role="region" aria-label="Bảng các môn đã học cải thiện, có thể cuộn ngang">
        <table class="data-table">
          <thead><tr><th>Môn học</th><th>Học kỳ cũ</th><th class="col-num">Điểm cũ</th><th>Học kỳ mới</th><th class="col-num">Điểm mới</th></tr></thead>
          <tbody>
            ${improved.map(s => `<tr>
              <td>${esc(s.name)}</td>
              <td class="muted">${esc(s.prevSemester)}</td>
              <td class="col-num">${fmt(s.prevGrade)}</td>
              <td class="muted">${esc(s.curSemester)}</td>
              <td class="col-num"><strong>${fmt(s.curGrade)}</strong></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>`;
  }

  container.innerHTML = html;
}

function renderAll() {
  document.getElementById('student-name').value = data.studentName || '';
  document.getElementById('student-id').value = data.studentId || '';
  validateStudentInfo();
  renderSemesters();
  renderSummary();
  updateManualEntryState();
}

function hasManualEntryData() {
  if ((data.studentName || '').trim() || (data.studentId || '').trim()) return true;
  if (data.semesters.length !== 1 || data.semesters[0]?.name !== 'Học kỳ 1') return true;
  return data.semesters.some(semester => semester.subjects.some(subject => (
    String(subject.name || '').trim() || String(subject.credits || '').trim() || String(subject.grade10 || '').trim()
  )));
}

function updateManualEntryState(forceOpen = false) {
  const gate = document.getElementById('manual-entry-gate');
  const editor = document.getElementById('manual-editor');
  if (!gate || !editor) return;
  const showEditor = forceOpen || hasManualEntryData();
  gate.classList.toggle('hidden', showEditor);
  editor.classList.toggle('hidden', !showEditor);
}

function validateStudentInfo() {
  const el = document.getElementById('student-id');
  const err = document.getElementById('student-id-error');
  const raw = (data.studentId || '').trim();
  const valid = /^\d{7,12}$/.test(raw);
  const invalid = Boolean(raw) && !valid;
  el.classList.toggle('is-invalid', invalid);
  el.setAttribute('aria-invalid', String(invalid));
  err.classList.toggle('hidden', !raw || valid);
}
