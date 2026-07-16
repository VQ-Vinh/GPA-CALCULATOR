let expandedState = new Map();

function switchTab(index) {
  currentTab = index;
  const btns = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');
  btns.forEach((btn) => {
    const tab = parseInt(btn.dataset.tab);
    const active = tab === index;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', String(active));
  });
  contents.forEach((c, i) => {
    c.classList.toggle('hidden', i !== index);
    if (i === index) c.classList.add('active');
    else c.classList.remove('active');
  });
  if (index === 1) renderScale();
  if (index === 3) renderSemesters();
  if (index === 4) renderSummary();
}

function renderScale() {
  const sel = document.getElementById('uni-select');
  if (sel) {
    const current = sel.value;
    sel.innerHTML = '<option value="">Chọn trường để tự động đặt thang điểm</option>';
    for (const uni of Object.keys(UNIVERSITY_SCALES)) {
      const opt = document.createElement('option');
      opt.value = uni;
      opt.textContent = uni;
      sel.appendChild(opt);
    }
    sel.value = data.selectedUni || '';
  }
  const tbody = document.getElementById('scale-body');
  tbody.innerHTML = data.scale.map((r, i) => `
    <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} tr-hover">
      <td class="px-4 py-2 text-sm text-slate-400 text-center">${i + 1}</td>
      <td class="px-3 py-2"><input type="number" class="scale-from w-20 px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg transition-all" value="${r.from}" step="0.1" min="0" max="10"></td>
      <td class="px-3 py-2"><input type="number" class="scale-to w-20 px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg transition-all" value="${r.to}" step="0.1" min="0" max="10"></td>
      <td class="px-3 py-2"><input type="text" class="scale-letter w-16 px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg transition-all" value="${r.letter}" maxlength="3"></td>
      <td class="px-3 py-2"><input type="number" class="scale-gpa4 w-20 px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg transition-all" value="${r.gpa4}" step="0.1" min="0" max="4"></td>
      <td class="px-3 py-2 text-center"><button class="delete-scale-row row-delete" title="Xóa dòng" aria-label="Xóa dòng ${i + 1}"><i class="ph ph-trash" aria-hidden="true"></i></button></td>
    </tr>
  `).join('');
}

function renderSemesters() {
  saveExpandedState();
  const container = document.getElementById('semesters-container');
  if (data.semesters.length === 0) {
    container.innerHTML = `<div class="semester-empty">
      <span><i class="ph ph-calendar-plus" aria-hidden="true"></i></span>
      <h3>Chưa có học kỳ</h3>
      <p>Chọn <strong>Thêm học kỳ</strong> để bắt đầu nhập môn học và điểm số.</p>
    </div>`;
    return;
  }
  container.innerHTML = data.semesters.map((sem, si) => {
    const result = calcSemester(sem.subjects);
    return `<div class="semester-card mb-3 rounded-xl border border-slate-200 bg-white overflow-hidden card-lift" data-sem-index="${si}">
      <div class="sem-header flex items-center justify-between px-4 py-3 cursor-pointer select-none bg-gradient-to-r from-slate-50 to-white hover:from-indigo-50/40 transition-colors">
        <div class="sem-heading flex items-center gap-3">
          <i class="toggle-icon ph-bold ph-caret-down w-4 text-slate-400" aria-hidden="true"></i>
          <input type="text" class="sem-name text-sm font-semibold text-slate-700 bg-transparent border-b border-dashed border-transparent hover:border-slate-300 focus:border-indigo-400 focus:bg-white px-1 py-0.5 rounded transition-all" value="${sem.name}" maxlength="100">
          <span class="sem-meta"><span>${result.totalCredits} TC</span><span>GPA10 ${fmt(result.gpa10)}</span><span>GPA4 ${fmt(result.gpa4)}</span></span>
        </div>
        <div class="sem-actions flex items-center gap-2">
          <button class="add-subject text-xs px-2.5 py-1 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all"><i class="ph ph-plus" aria-hidden="true"></i><span>Thêm môn</span></button>
          <button class="delete-semester row-delete" title="Xóa học kỳ" aria-label="Xóa ${sem.name}"><i class="ph ph-trash" aria-hidden="true"></i></button>
        </div>
      </div>
      <div class="sem-body ${si === data.semesters.length - 1 || data.semesters.length <= 1 ? '' : 'hidden'}">
        <div class="overflow-x-auto border-t border-slate-100">
          <table class="w-full">
            <thead>
              <tr class="bg-slate-50">
                <th class="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">STT</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Tên môn học</th>
                <th class="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase w-20">Tín chỉ</th>
                <th class="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase w-24">Điểm 10</th>
                <th class="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase w-16">Chữ</th>
                <th class="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase w-16">Hệ 4</th>
                <th class="px-3 py-2 text-center w-10"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${sem.subjects.map((sub, ri) => {
                const found = sub.grade10 !== '' ? findGrade(sub.grade10) : null;
                const retakeInfo = sub.name.trim() ? isRetake(sub.name, si) : null;
                const grade4Val = found ? found.gpa4 : null;
                return `<tr class="${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} tr-hover">
                  <td class="px-3 py-2 text-sm text-slate-400 text-center">${ri + 1}</td>
                  <td class="px-3 py-2">
                    <div class="flex items-center gap-2">
                      <input type="text" class="sub-name w-full min-w-[140px] px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg transition-all" value="${sub.name}" maxlength="200" placeholder="Tên môn học">
                      ${retakeInfo ? `<span class="retake-badge text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-200 whitespace-nowrap shrink-0" title="Đã học tại ${retakeInfo.semester} (điểm: ${retakeInfo.grade10 != null ? retakeInfo.grade10 : 'N/A'})">Cải thiện</span>` : ''}
                    </div>
                  </td>
                  <td class="px-3 py-2"><input type="number" class="sub-credits w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg transition-all text-center" value="${sub.credits}" min="0" max="20" step="0.5" placeholder="0"></td>
                  <td class="px-3 py-2"><input type="number" class="sub-grade10 w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg transition-all text-center" value="${sub.grade10}" min="0" max="10" step="0.1" placeholder="0.0"></td>
                  <td class="px-3 py-2 text-sm text-center font-semibold ${found ? 'text-slate-700' : 'text-slate-400'}">${found ? found.letter : '-'}</td>
                  <td class="px-3 py-2 text-sm text-center font-semibold ${grade4Val !== null ? 'text-slate-700' : 'text-slate-400'}">${grade4Val !== null ? fmt(grade4Val) : '-'}</td>
                  <td class="px-3 py-2 text-center"><button class="delete-subject row-delete" title="Xóa môn" aria-label="Xóa môn ${ri + 1}"><i class="ph ph-trash" aria-hidden="true"></i></button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="sem-result px-4 py-2.5 bg-gradient-to-r from-indigo-50/60 to-white border-t border-slate-100 text-xs text-slate-600">
          <span class="sem-result-label">Kết quả học kỳ</span>
          <span>GPA Hệ 10 <strong class="text-indigo-700">${fmt(result.gpa10)}</strong></span>
          <span>GPA Hệ 4 <strong class="text-indigo-700">${fmt(result.gpa4)}</strong></span>
          <span>Tổng TC <strong class="text-indigo-700">${result.totalCredits}</strong></span>
        </div>
      </div>
    </div>`;
  }).join('');
  applySemesterStates();
}

function applySemesterStates() {
  document.querySelectorAll('.semester-card').forEach(card => {
    const idx = parseInt(card.dataset.semIndex);
    const body = card.querySelector('.sem-body');
    const icon = card.querySelector('.toggle-icon');
    const wasExpanded = expandedState.has(idx) ? expandedState.get(idx) : (idx === data.semesters.length - 1 || data.semesters.length <= 1);
    if (!wasExpanded) {
      body.classList.add('hidden');
      icon.style.transform = 'rotate(-90deg)';
    }
  });
}

function saveExpandedState() {
  expandedState = new Map();
  document.querySelectorAll('.semester-card').forEach(card => {
    const idx = parseInt(card.dataset.semIndex);
    const body = card.querySelector('.sem-body');
    expandedState.set(idx, !body.classList.contains('hidden'));
  });
}

function renderGPATrendChart() {
  const chartData = data.semesters.map(sem => {
    const r = calcSemester(sem.subjects);
    return { ...r, gpa10n: r.gpa10 / 2.5, name: sem.name };
  });
  if (chartData.length === 0) return '';
  const W = 700, H = 270;
  const pt = 24, pr = 55, pb = 44, pl = 48;
  const cw = W - pl - pr, ch = H - pt - pb;
  const xStep = chartData.length > 1 ? cw / (chartData.length - 1) : cw / 2;
  function yPos(val) { return pt + ch - (val / 4) * ch; }

  const pts4 = chartData.map((d, i) => ({ x: pl + i * xStep, y: yPos(d.gpa4), val: d.gpa4 }));
  const pts10 = chartData.map((d, i) => ({ x: pl + i * xStep, y: yPos(d.gpa10n), val: d.gpa10 }));

  function linePath(pts) {
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');
  }

  function areaPath(pts) {
    if (pts.length < 2) return '';
    const bottom = pt + ch;
    const start = `M${pts[0].x.toFixed(1)},${bottom}L${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    const middle = pts.slice(1).map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');
    const end = `L${pts[pts.length - 1].x.toFixed(1)},${bottom}Z`;
    return start + middle + end;
  }

  let html = `<svg viewBox="0 0 ${W} ${H}" class="summary-chart w-full h-auto" role="img" aria-label="Biểu đồ xu hướng GPA qua các học kỳ" xmlns="http://www.w3.org/2000/svg">`;

  html += `<defs><linearGradient id="gpa4Grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6366f1" stop-opacity="0.15"/><stop offset="100%" stop-color="#6366f1" stop-opacity="0.01"/></linearGradient></defs>`;

  for (let i = 0; i <= 4; i++) {
    const y = yPos(i);
    html += `<line x1="${pl}" y1="${y}" x2="${W - pr}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
    html += `<text x="${pl - 8}" y="${y + 4}" text-anchor="end" fill="#6366f1" font-size="11">${i}.0</text>`;
    const gpa10 = (i * 2.5).toFixed(1);
    html += `<text x="${W - pr + 8}" y="${y + 4}" text-anchor="start" fill="#10b981" font-size="11">${gpa10}</text>`;
  }

  if (pts4.length >= 2) {
    html += `<path d="${areaPath(pts4)}" fill="url(#gpa4Grad)"/>`;
    html += `<path d="${linePath(pts4)}" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    html += pts4.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#6366f1" stroke="white" stroke-width="2"><title>${p.val.toFixed(2)}</title></circle>`).join('');
  }

  if (pts10.length >= 2) {
    html += `<path d="${linePath(pts10)}" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="6,4" stroke-linejoin="round" stroke-linecap="round"/>`;
    html += pts10.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#10b981" stroke="white" stroke-width="2"><title>${p.val.toFixed(2)}</title></circle>`).join('');
  }

  chartData.forEach((d, i) => {
    const x = pl + i * xStep;
    const yearMatch = d.name.match(/^(.+?)\s*\((\d{4})\s*-\s*(\d{4})\)$/);
    if (yearMatch) {
      const shortName = yearMatch[1].trim();
      const yearRange = `${yearMatch[2]}-${yearMatch[3]}`;
      html += `<text x="${x}" y="${pt + ch + 16}" text-anchor="middle" fill="#475569" font-size="9">
        <tspan x="${x}" dy="0">${shortName}</tspan>
        <tspan x="${x}" dy="12">${yearRange}</tspan>
      </text>`;
    } else {
      html += `<text x="${x}" y="${pt + ch + 22}" text-anchor="middle" fill="#475569" font-size="9">${d.name}</text>`;
    }
  });

  html += `<text x="${pl}" y="${pt - 8}" fill="#6366f1" font-size="11" font-weight="600">GPA Hệ 4</text>`;
  html += `<text x="${pl + 80}" y="${pt - 8}" fill="#10b981" font-size="11" font-weight="600">GPA Hệ 10</text>`;
  html += `</svg>`;
  return html;
}

function renderSummary() {
  const container = document.getElementById('summary-content');
  const cum = calcCumulative();
  let html = '';

  if (cum.totalCredits > 0) {
    const totalGpa10 = data.semesters.reduce((acc, sem) => {
      const r = calcSemester(sem.subjects);
      return acc + r.gpa10 * r.totalCredits;
    }, 0);
    const totalCreditsAll = data.semesters.reduce((acc, sem) => {
      const r = calcSemester(sem.subjects);
      return acc + r.totalCredits;
    }, 0);
    const overallGpa10 = totalCreditsAll > 0 ? totalGpa10 / totalCreditsAll : 0;

    html += `<div class="summary-overview mb-6">
      <section class="summary-primary" aria-label="GPA tích lũy Hệ 4">
        <div class="summary-primary-label"><i class="ph ph-medal" aria-hidden="true"></i><span>Kết quả tích lũy</span></div>
        <div class="summary-score"><strong>${fmt(cum.gpa4)}</strong><span>/ 4.00</span></div>
        <p>GPA Hệ 4</p>
      </section>
      <div class="summary-secondary">
        <section class="summary-gpa10" aria-label="GPA Hệ 10">
          <div><i class="ph ph-chart-line-up" aria-hidden="true"></i><span>GPA Hệ 10</span></div>
          <strong>${fmt(overallGpa10)}</strong>
        </section>
        <div class="summary-facts">
          <div><i class="ph ph-stack" aria-hidden="true"></i><strong>${cum.totalCredits}</strong><span>Tín chỉ tích lũy</span></div>
          <div><i class="ph ph-calendar-dots" aria-hidden="true"></i><strong>${data.semesters.length}</strong><span>Học kỳ</span></div>
        </div>
      </div>
    </div>`;

    html += `<div class="summary-analysis-grid mb-6">`;
    html += `<section class="summary-panel chart-panel">`;
    html += `<div class="summary-panel-heading"><span><i class="ph ph-trend-up" aria-hidden="true"></i></span><div><h3>Xu hướng học tập</h3><p>So sánh GPA Hệ 4 và Hệ 10 qua từng học kỳ.</p></div></div>`;
    html += renderGPATrendChart();
    html += `</section>`;

    html += `<section class="summary-panel goal-panel">`;
    html += `<div class="summary-panel-heading"><span><i class="ph ph-target" aria-hidden="true"></i></span><div><h3>Mục tiêu tốt nghiệp</h3><p>Tính GPA cần đạt cho số tín chỉ còn lại.</p></div></div>`;

    html += `<div class="goal-controls mb-4">`;
    html += `<label><span>Tổng tín chỉ yêu cầu</span><input id="goal-credits-input" type="number" class="w-24 px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg transition-all" value="${data.gradRequiredCredits || 130}" min="1" max="300"></label>`;
    html += `<label><span>GPA mong muốn</span><div class="goal-gpa-field"><input id="goal-gpa-input" type="number" step="0.01" min="0" max="4" class="w-24 px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg transition-all" value="${data.targetGpa || ''}" placeholder="VD: 3.2"><span>/ 4.0</span></div></label>`;
    html += `<button id="apply-goal"><i class="ph ph-calculator" aria-hidden="true"></i><span>Tính mục tiêu</span></button>`;
    html += `</div>`;
    const goalRequired = data.gradRequiredCredits || 130;
    const goalRemaining = Math.max(0, goalRequired - cum.totalCredits);
    const goalTarget = parseFloat(data.targetGpa);

    if (goalTarget && goalTarget > 0 && goalTarget <= 4) {
      if (goalRemaining <= 0) {
        html += `<div class="goal-result goal-success">
          <i class="ph ph-check-circle" aria-hidden="true"></i><p>Đã đạt đủ tín chỉ yêu cầu.</p>
        </div>`;
      } else {
        const needed = (goalTarget * goalRequired - cum.gpa4 * cum.totalCredits) / goalRemaining;
        if (needed < 0 || needed > 4) {
          html += `<div class="goal-result goal-error">
            <i class="ph ph-warning-circle" aria-hidden="true"></i><p>Không khả thi với số tín chỉ còn lại.</p>
          </div>`;
        } else {
          html += `<div class="goal-result goal-needed">
            <div><span>GPA cần đạt</span><strong>${fmt(needed)}</strong></div>
            <p>trong ${goalRemaining} tín chỉ còn lại</p>
          </div>`;
        }
      }
    }
    html += `</section>`;
    html += `</div>`;

    const unique = getUniqueSubjects();
    const totalAllSubjects = data.semesters.reduce((acc, sem) =>
      acc + sem.subjects.filter(s => parseFloat(s.credits) > 0 && s.grade10 !== '').length, 0);
    const retakeCount = totalAllSubjects - unique.size;

    if (retakeCount > 0) {
      html += `<div class="summary-alert mb-6">
        <i class="ph ph-warning text-lg shrink-0" aria-hidden="true"></i>
        <div>Có <strong>${retakeCount}</strong> môn học cải thiện. GPA tích lũy sử dụng điểm cao nhất của mỗi môn.</div>
      </div>`;
    }

    html += `<div class="summary-section-title"><span><i class="ph ph-list-checks" aria-hidden="true"></i></span><div><h3>Chi tiết từng học kỳ</h3><p>Xem lại điểm số và tín chỉ của từng kỳ.</p></div></div>`;
    html += `<div class="summary-table overflow-x-auto rounded-xl border border-slate-200 mb-6"><table class="w-full">
      <thead>
        <tr class="bg-gradient-to-r from-slate-100 to-slate-50">
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Học kỳ</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Số môn</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">GPA Hệ 10</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">GPA Hệ 4</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng TC</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        ${data.semesters.map((sem, i) => {
          const r = calcSemester(sem.subjects);
          const count = sem.subjects.filter(s => s.credits > 0 && s.grade10 !== '').length;
          return `<tr class="tr-hover ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}">
            <td class="px-4 py-3 text-sm font-medium text-slate-700">${sem.name}</td>
            <td class="px-4 py-3 text-sm text-slate-600">${count}</td>
            <td class="px-4 py-3 text-sm font-semibold text-slate-700">${fmt(r.gpa10)}</td>
            <td class="px-4 py-3 text-sm font-semibold text-slate-700">${fmt(r.gpa4)}</td>
            <td class="px-4 py-3 text-sm font-semibold text-slate-700">${r.totalCredits}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;

    const improvedSubjects = [];
    const seen = new Map();
    for (let i = 0; i < data.semesters.length; i++) {
      for (const sub of data.semesters[i].subjects) {
        const key = sub.name.trim().toLowerCase();
        if (!key) continue;
        const cr = parseFloat(sub.credits);
        const g10 = parseFloat(sub.grade10);
        if (cr > 0 && !isNaN(g10) && sub.grade10 !== '') {
          if (seen.has(key)) {
            const prev = seen.get(key);
            if (g10 > prev.grade10) {
              const prevG4 = findGrade(String(prev.grade10));
              const curG4 = findGrade(String(g10));
              improvedSubjects.push({
                name: sub.name.trim(),
                prevSemester: prev.semester,
                prevGrade: prev.grade10,
                curSemester: data.semesters[i].name,
                curGrade: g10,
                prevGPA4: prevG4 ? prevG4.gpa4 : 0,
                curGPA4: curG4 ? curG4.gpa4 : 0,
              });
              seen.set(key, { semester: data.semesters[i].name, grade10: g10 });
            }
          } else {
            seen.set(key, { semester: data.semesters[i].name, grade10: g10 });
          }
        }
      }
    }

    if (improvedSubjects.length > 0) {
      const cumOrig = calcCumulativeOriginal();
      const cumNew = calcCumulative();
      const gpa4Diff = cumNew.gpa4 - cumOrig.gpa4;
      const diffClass = gpa4Diff > 0 ? 'text-emerald-600' : 'text-red-500';

      html += `<section class="summary-panel impact-panel mb-6">
        <div class="summary-panel-heading"><span><i class="ph ph-arrow-circle-up-right" aria-hidden="true"></i></span><div><h3>Tác động của môn cải thiện</h3><p>Điểm cao nhất được dùng cho GPA tích lũy.</p></div></div>
        <div class="impact-comparison">
          <div><span>Trước cải thiện</span><strong>${fmt(cumOrig.gpa4)}</strong></div>
          <i class="ph ph-arrow-right impact-arrow" aria-hidden="true"></i>
          <div><span>Sau cải thiện</span><strong>${fmt(cumNew.gpa4)}</strong></div>
          <div class="impact-delta"><span>Mức tăng</span><strong class="${diffClass}">+${fmt(gpa4Diff)}</strong></div>
        </div>
      </section>`;

      html += `<div class="summary-section-title"><span><i class="ph ph-arrow-counter-clockwise" aria-hidden="true"></i></span><div><h3>Môn học cải thiện</h3><p>So sánh điểm cũ và điểm mới.</p></div></div>`;
      html += `<div class="summary-table overflow-x-auto rounded-xl border border-slate-200"><table class="w-full">
        <thead>
          <tr class="bg-gradient-to-r from-slate-100 to-slate-50">
            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Môn học</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Học kỳ cũ</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Điểm cũ</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Học kỳ mới</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Điểm mới</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${improvedSubjects.map((sub, i) => {
            return `<tr class="tr-hover ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}">
              <td class="px-4 py-3 text-sm font-semibold text-slate-700">${sub.name}</td>
              <td class="px-4 py-3 text-sm text-slate-600">${sub.prevSemester}</td>
              <td class="px-4 py-3 text-sm text-slate-600">${fmt(sub.prevGrade)}</td>
              <td class="px-4 py-3 text-sm text-slate-600">${sub.curSemester}</td>
              <td class="px-4 py-3 text-sm font-semibold text-slate-700">${fmt(sub.curGrade)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`;
    }
  } else {
    html += `<div class="summary-empty">
      <span><i class="ph ph-clipboard-text" aria-hidden="true"></i></span>
      <h3>Chưa có kết quả</h3>
      <p>Nhập điểm ở tab Học kỳ để xem GPA và biểu đồ tại đây.</p>
    </div>`;
  }

  container.innerHTML = html;
}

function renderAll() {
  document.getElementById('student-name').value = data.studentName || '';
  document.getElementById('student-id').value = data.studentId || '';
  renderScale();
  renderSemesters();
  toggleSemestersLock();
  if (currentTab === 4) renderSummary();
}

function toggleSemestersLock() {
  const mssvValid = /^\d{7,12}$/.test(data.studentId.trim());
  const nameValid = data.studentName.trim().length > 0;
  const el = document.getElementById('student-id');
  const err = document.getElementById('student-id-error');
  if (data.studentId.trim()) {
    el.classList.toggle('border-red-400', !mssvValid);
    el.classList.toggle('focus:ring-red-300', !mssvValid);
    el.classList.toggle('focus:ring-indigo-300', mssvValid);
    err.classList.toggle('hidden', mssvValid);
  } else {
    el.classList.remove('border-red-400', 'focus:ring-red-300');
    el.classList.add('focus:ring-indigo-300');
    err.classList.add('hidden');
  }
  const locked = !nameValid || !mssvValid;
  document.getElementById('semesters-lock').classList.toggle('hidden', !locked);
  document.getElementById('semesters-body').classList.toggle('hidden', locked);
}
