let expandedState = new Map();

function esc(value) {
  return String(value == null ? '' : value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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
    return `<div class="semester-card" data-sem-index="${si}">
      <div class="sem-header">
        <button type="button" class="sem-toggle" aria-label="Thu gọn học kỳ">▾</button>
        <input type="text" class="sem-name" value="${esc(sem.name)}" maxlength="100" aria-label="Tên học kỳ">
        <span class="sem-meta"><span>${result.totalCredits} TC</span><span>Hệ 10: ${fmt(result.gpa10)}</span><span>Hệ 4: ${fmt(result.gpa4)}</span></span>
        <span class="sem-actions">
          <button type="button" class="add-subject btn btn-ghost btn-sm">Thêm môn</button>
          <button type="button" class="delete-semester row-delete" title="Xóa học kỳ" aria-label="Xóa ${esc(sem.name)}">✕</button>
        </span>
      </div>
      <div class="sem-body">
        <div class="table-scroll">
          <table class="data-table">
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
                return `<tr>
                  <td class="col-num muted">${ri + 1}</td>
                  <td>
                    <div class="name-cell">
                      <input type="text" class="sub-name" value="${esc(sub.name)}" maxlength="200" placeholder="Tên môn học">
                      ${retakeInfo ? `<span class="retake-badge" title="Đã học tại ${esc(retakeInfo.semester)} (điểm: ${retakeInfo.grade10 != null ? retakeInfo.grade10 : 'N/A'})">Cải thiện</span>` : ''}
                    </div>
                  </td>
                  <td class="col-num"><input type="number" class="sub-credits" value="${esc(sub.credits)}" min="0" max="20" step="0.5" placeholder="0"></td>
                  <td class="col-num"><input type="number" class="sub-grade10" value="${esc(sub.grade10)}" min="0" max="10" step="0.1" placeholder="0.0"></td>
                  <td class="col-num cell-letter ${found ? '' : 'muted'}">${found ? found.letter : '–'}</td>
                  <td class="col-num cell-gpa4 ${found ? '' : 'muted'}">${found ? fmt(found.gpa4) : '–'}</td>
                  <td class="col-act"><button type="button" class="delete-subject row-delete" title="Xóa môn" aria-label="Xóa môn ${ri + 1}">✕</button></td>
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
  });
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
  const pt = 20, pr = 46, pb = 46, pl = 40;
  const cw = W - pl - pr, ch = H - pt - pb;
  const xStep = cw / (chartData.length - 1);
  const yPos = val => pt + ch - (val / 4) * ch;

  const pts4 = chartData.map((d, i) => ({ x: pl + i * xStep, y: yPos(d.gpa4), val: d.gpa4 }));
  const pts10 = chartData.map((d, i) => ({ x: pl + i * xStep, y: yPos(d.gpa10 / 2.5), val: d.gpa10 }));
  const line = pts => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');

  let html = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Biểu đồ GPA qua các học kỳ" xmlns="http://www.w3.org/2000/svg">`;
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
  html += `</svg>
  <p class="chart-legend"><span class="key key-4"></span>Hệ 4<span class="key key-10"></span>Hệ 10 (quy về thang 4)</p>`;
  return html;
}

function renderSummary() {
  const container = document.getElementById('summary-content');
  const cum = calcCumulative();

  if (cum.totalCredits === 0) {
    container.innerHTML = `<p class="empty-note">Chưa có điểm nào. Dán bảng điểm ở mục 1, hoặc nhập tay ở mục 3.</p>`;
    return;
  }

  let html = `<div class="metric-row">
    <div class="metric metric-lead"><span>GPA Hệ 4</span><strong>${fmt(cum.gpa4)}</strong><small>trên 4.00</small></div>
    <div class="metric"><span>GPA Hệ 10</span><strong>${fmt(cum.gpa10)}</strong><small>trên 10.00</small></div>
    <div class="metric"><span>Tín chỉ tích lũy</span><strong>${cum.totalCredits}</strong><small>${data.semesters.length} học kỳ</small></div>
  </div>`;

  const chart = renderGPATrendChart();
  if (chart) html += `<div class="card"><h3>Xu hướng qua từng học kỳ</h3>${chart}</div>`;

  const goalRequired = data.gradRequiredCredits || 130;
  const goalRemaining = Math.max(0, goalRequired - cum.totalCredits);
  const goalTarget = parseFloat(data.targetGpa);
  html += `<div class="card">
    <h3>Mục tiêu tốt nghiệp</h3>
    <div class="goal-controls">
      <label>Tổng tín chỉ yêu cầu<input id="goal-credits-input" type="number" value="${goalRequired}" min="1" max="300"></label>
      <label>GPA mong muốn<input id="goal-gpa-input" type="number" step="0.01" min="0" max="4" value="${esc(data.targetGpa)}" placeholder="VD: 3.2"></label>
      <button type="button" id="apply-goal" class="btn btn-primary">Tính</button>
    </div>`;
  if (goalTarget && goalTarget > 0 && goalTarget <= 4) {
    if (goalRemaining <= 0) {
      html += `<p class="goal-result is-good">Đã đạt đủ ${goalRequired} tín chỉ yêu cầu.</p>`;
    } else {
      const needed = (goalTarget * goalRequired - cum.gpa4 * cum.totalCredits) / goalRemaining;
      if (needed < 0) {
        html += `<p class="goal-result is-good">GPA hiện tại đã vượt mục tiêu ${fmt(goalTarget)}.</p>`;
      } else if (needed > 4) {
        html += `<p class="goal-result is-bad">Không thể đạt ${fmt(goalTarget)} với ${goalRemaining} tín chỉ còn lại.</p>`;
      } else {
        html += `<p class="goal-result">Cần đạt <strong>${fmt(needed)}</strong> trong ${goalRemaining} tín chỉ còn lại.</p>`;
      }
    }
  }
  html += `</div>`;

  html += `<div class="card">
    <h3>Từng học kỳ</h3>
    <div class="table-scroll">
      <table class="data-table">
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
  </div>`;

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
    html += `<div class="card">
      <h3>Môn cải thiện</h3>
      <p class="card-note">GPA tích lũy dùng điểm cao nhất của mỗi môn. Trước cải thiện <strong>${fmt(orig.gpa4)}</strong> → sau cải thiện <strong>${fmt(cum.gpa4)}</strong> <span class="delta ${diff >= 0 ? 'is-good' : 'is-bad'}">${diff >= 0 ? '+' : ''}${fmt(diff)}</span></p>
      <div class="table-scroll">
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
    </div>`;
  }

  container.innerHTML = html;
}

function renderAll() {
  document.getElementById('student-name').value = data.studentName || '';
  document.getElementById('student-id').value = data.studentId || '';
  validateStudentInfo();
  renderSemesters();
  renderSummary();
}

function validateStudentInfo() {
  const el = document.getElementById('student-id');
  const err = document.getElementById('student-id-error');
  const raw = (data.studentId || '').trim();
  const valid = /^\d{7,12}$/.test(raw);
  el.classList.toggle('is-invalid', Boolean(raw) && !valid);
  err.classList.toggle('hidden', !raw || valid);
}
