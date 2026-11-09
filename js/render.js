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
        <textarea class="sem-name" rows="1" maxlength="100" aria-label="Tên học kỳ">${esc(sem.name)}</textarea>
        <span class="sem-actions">
          <button type="button" class="add-subject btn btn-ghost btn-sm"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>Thêm môn</button>
          <button type="button" class="delete-semester row-delete" title="Xóa học kỳ" aria-label="Xóa ${esc(sem.name)}"></button>
        </span>
      </div>
      <div class="sem-body" id="${bodyId}"><div class="sem-body-inner">
        <div class="responsive-table">
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
                  <td class="col-num muted" data-label="STT">${ri + 1}</td>
                  <td data-label="Tên môn học">
                    <div class="name-cell">
                      <textarea class="sub-name" rows="1" maxlength="200" placeholder="Tên môn học" aria-label="Tên môn ${ri + 1} trong ${esc(sem.name)}">${esc(sub.name)}</textarea>
                      ${retakeInfo ? `<span class="retake-badge" title="Đã học tại ${esc(retakeInfo.semester)} (điểm: ${retakeInfo.grade10 != null ? retakeInfo.grade10 : 'N/A'})">Cải thiện</span>` : ''}
                    </div>
                  </td>
                  <td class="col-num" data-label="Tín chỉ"><input type="number" class="sub-credits" value="${esc(sub.credits)}" min="0" max="20" step="0.5" placeholder="0" aria-label="Tín chỉ của ${esc(subjectLabel)}"></td>
                  <td class="col-num" data-label="Điểm 10"><input type="number" class="sub-grade10" value="${esc(sub.grade10)}" min="0" max="10" step="0.1" placeholder="0.0" aria-label="Điểm hệ 10 của ${esc(subjectLabel)}"></td>
                  <td class="col-num cell-letter ${found ? gradeToneClass(found.gpa4) : 'muted'}" data-label="Điểm chữ">${found ? found.letter : '-'}</td>
                  <td class="col-num cell-gpa4 ${found ? gradeToneClass(found.gpa4) : 'muted'}" data-label="Hệ 4">${found ? fmt(found.gpa4) : '-'}</td>
                  <td class="col-act" data-label="Thao tác"><button type="button" class="delete-subject row-delete" title="Xóa môn" aria-label="Xóa ${esc(subjectLabel)}"></button></td>
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
      </div></div>
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

const GPA_BANDS = [
  { min: 3.6, max: 4, label: 'Xuất sắc', tone: 'band-1' },
  { min: 3.2, max: 3.6, label: 'Giỏi', tone: 'band-2' },
  { min: 2.5, max: 3.2, label: 'Khá', tone: 'band-3' },
  { min: 2, max: 2.5, label: 'Trung bình', tone: 'band-4' },
];

function gpaBandLabel(gpa4) {
  const band = GPA_BANDS.find(b => gpa4 >= b.min);
  return band ? band.label : 'Dưới trung bình';
}

function smoothPath(pts) {
  const n = pts.length;
  const p = v => v.toFixed(1);
  if (n < 3) return pts.map((pt, i) => `${i ? 'L' : 'M'}${p(pt.x)},${p(pt.y)}`).join('');
  const dx = [], m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    m[i] = (pts[i + 1].y - pts[i].y) / dx[i];
  }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  t[n - 1] = m[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${p(pts[0].x)},${p(pts[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${p(pts[i].x + h)},${p(pts[i].y + t[i] * h)} ${p(pts[i + 1].x - h)},${p(pts[i + 1].y - t[i + 1] * h)} ${p(pts[i + 1].x)},${p(pts[i + 1].y)}`;
  }
  return d;
}

function chartDelta(value) {
  if (Math.abs(value) < 0.005) return `<span class="delta is-flat">= 0.00</span>`;
  return value > 0
    ? `<span class="delta is-good">▲ ${fmt(value)}</span>`
    : `<span class="delta is-bad">▼ ${fmt(Math.abs(value))}</span>`;
}

function renderGPATrendChart() {
  const chartData = data.semesters
    .map(sem => ({ ...calcSemester(sem.subjects), name: sem.name }))
    .filter(d => d.totalCredits > 0);
  if (chartData.length < 2) return '';

  const n = chartData.length;
  const cumulative = calcCumulative();
  const targetText = String(data.targetGpa ?? '').trim();
  const target = targetText === '' ? NaN : Number(targetText);
  const hasTarget = Number.isFinite(target) && target >= 0 && target <= 4;

  const values = chartData.flatMap(d => [d.gpa4, d.gpa10 / 2.5]).concat(cumulative.gpa4, hasTarget ? target : []);
  const yMin = Math.min(3, Math.max(0, Math.floor((Math.min(...values) - 0.25) / 0.5) * 0.5));
  const span = 4 - yMin;
  const tickStep = span > 2 ? 1 : 0.5;
  const yPct = v => (1 - (Math.min(4, Math.max(yMin, v)) - yMin) / span) * 100;
  const xPct = i => (i / (n - 1)) * 100;
  const pct = v => `${v.toFixed(2)}%`;

  const pts4 = chartData.map((d, i) => ({ x: xPct(i) * 10, y: yPct(d.gpa4) * 10 }));
  const pts10 = chartData.map((d, i) => ({ x: xPct(i) * 10, y: yPct(d.gpa10 / 2.5) * 10 }));
  const line4 = smoothPath(pts4);
  const line10 = smoothPath(pts10);

  const points = chartData.map((d, i) => ({
    name: d.name,
    gpa4: fmt(d.gpa4),
    gpa10: fmt(d.gpa10),
    credits: d.totalCredits,
    band: gpaBandLabel(d.gpa4),
    delta: i === 0 ? null : Math.round((d.gpa4 - chartData[i - 1].gpa4) * 100) / 100,
    x: xPct(i),
    y4: yPct(d.gpa4),
    y10: yPct(d.gpa10 / 2.5),
  }));

  const labelClass = index => {
    const last = n - 1;
    const atStride = target => index === 0 || index === last || index % Math.max(1, Math.ceil(last / target)) === 0;
    const edge = index === 0 ? ' chart-label-start' : index === last ? ' chart-label-end' : '';
    if (atStride(4)) return `chart-label chart-label-mobile${edge}`;
    if (atStride(8)) return `chart-label chart-label-tablet${edge}`;
    if (atStride(12)) return `chart-label chart-label-desktop${edge}`;
    return `chart-label${edge}`;
  };

  const latest = chartData[n - 1];
  const previous = chartData[n - 2];
  const best = chartData.reduce((a, b) => (b.gpa4 > a.gpa4 ? b : a));
  const worst = chartData.reduce((a, b) => (b.gpa4 < a.gpa4 ? b : a));

  let html = `<div class="chart-stats">
    <div class="chart-stat"><span>Kỳ gần nhất</span><strong>${fmt(latest.gpa4)}</strong>${chartDelta(latest.gpa4 - previous.gpa4)}</div>
    <div class="chart-stat"><span>Cao nhất</span><strong>${fmt(best.gpa4)}</strong><small>${esc(best.name)}</small></div>
    <div class="chart-stat"><span>Thấp nhất</span><strong>${fmt(worst.gpa4)}</strong><small>${esc(worst.name)}</small></div>
  </div>`;

  html += `<div class="chart-viewport" tabindex="0" role="group" aria-roledescription="biểu đồ" aria-label="Biểu đồ GPA ${n} học kỳ, từ ${fmt(chartData[0].gpa4)} đến ${fmt(latest.gpa4)}. Dùng phím mũi tên để xem từng học kỳ." data-ymin="${yMin}" data-points="${esc(JSON.stringify(points))}">
    <div class="chart-frame">
      <div class="chart-axis-col chart-axis-left" aria-hidden="true">`;
  for (let v = 4; v >= yMin - 1e-9; v -= tickStep) {
    html += `<span class="chart-axis chart-axis-4" style="top:${pct(yPct(v))}">${v.toFixed(1)}</span>`;
  }
  html += `</div><div class="chart-plot" aria-hidden="true">`;

  GPA_BANDS.forEach(band => {
    if (band.max <= yMin) return;
    const top = yPct(band.max);
    const height = yPct(Math.max(band.min, yMin)) - top;
    html += `<div class="chart-band ${band.tone}" style="top:${pct(top)};height:${pct(height)}">${height > 9 ? `<span>${band.label}</span>` : ''}</div>`;
  });

  html += `<svg class="chart" viewBox="0 0 1000 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">`;
  for (let v = 4; v >= yMin - 1e-9; v -= tickStep) {
    const y = (yPct(v) * 10).toFixed(1);
    html += `<line x1="0" y1="${y}" x2="1000" y2="${y}" class="chart-grid"/>`;
  }
  html += `<path d="${line4}L1000,1000L0,1000Z" class="chart-area-4"/>`;
  html += `<path d="${line10}" class="chart-line-10"/>`;
  html += `<path d="${line4}" class="chart-line-4"/>`;
  html += `</svg>`;

  html += `<div class="chart-ref chart-ref-cum" style="top:${pct(yPct(cumulative.gpa4))}"><span>Tích lũy ${fmt(cumulative.gpa4)}</span></div>`;
  html += `<div class="chart-ref chart-ref-target${hasTarget ? '' : ' hidden'}" style="top:${pct(yPct(hasTarget ? target : 4))}"><span>Mục tiêu ${hasTarget ? fmt(target) : ''}</span></div>`;

  html += points.map((pt, i) => `<span class="chart-dot-10" style="left:${pct(pt.x)};top:${pct(pt.y10)}" data-i="${i}"></span>`).join('');
  html += points.map((pt, i) => `<span class="chart-dot-4" style="left:${pct(pt.x)};top:${pct(pt.y4)}" data-i="${i}"></span>`).join('');
  html += `<span class="chart-last" style="left:${pct(points[n - 1].x)};top:${pct(points[n - 1].y4)}">${fmt(latest.gpa4)}</span>`;
  html += `<div class="chart-crosshair hidden"></div><div class="chart-tooltip hidden"></div>`;

  html += `</div><div class="chart-axis-col chart-axis-right" aria-hidden="true">`;
  for (let v = 4; v >= yMin - 1e-9; v -= tickStep) {
    html += `<span class="chart-axis chart-axis-10" style="top:${pct(yPct(v))}">${(v * 2.5).toFixed(1)}</span>`;
  }
  html += `</div><div class="chart-xlabels" aria-hidden="true">`;
  chartData.forEach((d, i) => {
    const m = d.name.match(/^(.+?)\s*\((\d{4})\s*-\s*(\d{4})\)$/);
    const short = m ? m[1].trim().replace(/^Học kỳ\s*/i, 'HK') : '';
    const text = m
      ? `<span><b class="lbl-full">${esc(m[1].trim())}</b><b class="lbl-short">${esc(short)}</b></span><span><b class="lbl-full">${m[2]}-${m[3]}</b><b class="lbl-short">${m[2].slice(2)}-${m[3].slice(2)}</b></span>`
      : `<span>${esc(d.name)}</span>`;
    html += `<span class="${labelClass(i)}" style="left:${pct(xPct(i))}">${text}</span>`;
  });
  html += `</div></div></div>
  <div class="chart-legend">
    <button type="button" class="chart-toggle" data-series="4" aria-pressed="true"><span class="key key-4"></span>Hệ 4</button>
    <button type="button" class="chart-toggle" data-series="10" aria-pressed="true"><span class="key key-10"></span>Hệ 10 (quy về thang 4)</button>
    <span class="chart-legend-ref"><span class="key key-ref"></span>Tích lũy / mục tiêu</span>
  </div>
  <p class="sr-only chart-live" aria-live="polite" aria-atomic="true"></p>`;
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
  if (goal.requiredValid) {
    const goalText = document.querySelector('#summary-content .metric-goal');
    const creditsFill = document.querySelector('#summary-content .metric-meter-credits i');
    if (goalText) goalText.textContent = `mục tiêu ${goal.requiredCredits} TC`;
    if (creditsFill) {
      creditsFill.classList.add('fx-meter');
      creditsFill.style.setProperty('--fill', Math.max(0, Math.min(1, cumulative.totalCredits / goal.requiredCredits)).toFixed(4));
    }
  }
  expectedHint.textContent = goalExpectedHint(goal, cumulative);
  resultContainer.innerHTML = renderGoalResult(cumulative, goal);
  scenarioContainer.innerHTML = renderGoalScenarios(goal);
}

function renderSummary() {
  const container = document.getElementById('summary-content');
  const cum = calcCumulative();

  if (cum.totalCredits === 0) {
    container.innerHTML = `<p class="empty-note">Chưa có dữ liệu để tính GPA. Dán bảng điểm ở <a href="#section-import">mục 1</a> hoặc nhập tay ở <a href="#section-semesters">mục 3</a>.</p>`;
    return;
  }

  const meter = (value, max) => `<span class="metric-meter" aria-hidden="true"><i style="--fill:${Math.max(0, Math.min(1, value / max)).toFixed(4)}"></i></span>`;
  let html = `<div class="metric-row">
    <div class="metric metric-lead tone-accent"><span>GPA Hệ 4</span><strong>${fmt(cum.gpa4)}</strong><small>trên 4.00</small>${meter(cum.gpa4, 4)}</div>
    <div class="metric tone-good"><span>GPA Hệ 10</span><strong>${fmt(cum.gpa10)}</strong><small>trên 10.00</small>${meter(cum.gpa10, 10)}</div>
    <div class="metric tone-warm"><span>Tín chỉ tích lũy</span><strong>${cum.totalCredits}</strong><small>${data.semesters.length} học kỳ · <em class="metric-goal">mục tiêu ${data.gradRequiredCredits || 130} TC</em></small>${meter(cum.totalCredits, data.gradRequiredCredits || 130).replace('<span class="metric-meter"', '<span class="metric-meter metric-meter-credits"')}</div>
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
    <div class="responsive-table">
      <table class="data-table semester-summary-table">
        <thead><tr><th>Học kỳ</th><th class="col-num">Số môn</th><th class="col-num">Hệ 10</th><th class="col-num">Hệ 4</th><th class="col-num">Tín chỉ</th></tr></thead>
        <tbody>
          ${data.semesters.map(sem => {
            const r = calcSemester(sem.subjects);
            const count = sem.subjects.filter(s => parseFloat(s.credits) > 0 && s.grade10 !== '').length;
            return `<tr>
              <td data-label="Học kỳ">${esc(sem.name)}</td>
              <td class="col-num muted" data-label="Số môn">${count}</td>
              <td class="col-num" data-label="Hệ 10">${fmt(r.gpa10)}</td>
              <td class="col-num" data-label="Hệ 4">${fmt(r.gpa4)}</td>
              <td class="col-num" data-label="Tín chỉ">${r.totalCredits}</td>
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
      <div class="responsive-table">
        <table class="data-table improvement-table">
          <thead><tr><th>Môn học</th><th>Học kỳ cũ</th><th class="col-num">Điểm cũ</th><th>Học kỳ mới</th><th class="col-num">Điểm mới</th></tr></thead>
          <tbody>
            ${improved.map(s => `<tr>
              <td data-label="Môn học">${esc(s.name)}</td>
              <td class="muted" data-label="Học kỳ cũ">${esc(s.prevSemester)}</td>
              <td class="col-num" data-label="Điểm cũ">${fmt(s.prevGrade)}</td>
              <td class="muted" data-label="Học kỳ mới">${esc(s.curSemester)}</td>
              <td class="col-num" data-label="Điểm mới"><strong>${fmt(s.curGrade)}</strong></td>
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
