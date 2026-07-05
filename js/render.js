let expandedState = new Map();

function switchTab(index) {
  currentTab = index;
  const btns = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');
  btns.forEach((btn, i) => {
    const tab = parseInt(btn.dataset.tab);
    if (tab === index) {
      btn.className = 'tab-btn flex-1 py-3.5 px-4 text-center font-semibold text-sm transition-all duration-200 text-indigo-600 border-b-2 border-indigo-600 btn-focus';
    } else {
      btn.className = 'tab-btn flex-1 py-3.5 px-4 text-center font-semibold text-sm transition-all duration-200 text-slate-500 border-b-2 border-transparent hover:text-slate-700 hover:border-slate-300 btn-focus';
    }
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
    sel.innerHTML = '<option value="">— Chọn trường để tự động set thang điểm —</option>';
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
      <td class="px-3 py-2 text-center"><button class="delete-scale-row text-red-400 hover:text-red-600 transition-colors text-lg leading-none" title="Xóa dòng">&times;</button></td>
    </tr>
  `).join('');
}

function renderSemesters() {
  saveExpandedState();
  const container = document.getElementById('semesters-container');
  container.innerHTML = data.semesters.map((sem, si) => {
    const result = calcSemester(sem.subjects);
    return `<div class="semester-card mb-3 rounded-xl border border-slate-200 bg-white overflow-hidden card-lift" data-sem-index="${si}">
      <div class="sem-header flex items-center justify-between px-4 py-3 cursor-pointer select-none bg-gradient-to-r from-slate-50 to-white hover:from-indigo-50/40 transition-colors">
        <div class="flex items-center gap-3">
          <svg class="toggle-icon w-4 h-4 text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
          <input type="text" class="sem-name text-sm font-semibold text-slate-700 bg-transparent border-b border-dashed border-transparent hover:border-slate-300 focus:border-indigo-400 focus:bg-white px-1 py-0.5 rounded transition-all" value="${sem.name}" maxlength="100">
          <span class="text-xs text-slate-400">${result.totalCredits} TC &middot; GPA10: ${fmt(result.gpa10)} &middot; GPA4: ${fmt(result.gpa4)}</span>
        </div>
        <div class="flex items-center gap-2">
          <button class="add-subject text-xs px-2.5 py-1 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all">+ Thêm môn</button>
          <button class="delete-semester text-red-400 hover:text-red-600 transition-colors text-lg leading-none p-1" title="Xóa học kỳ">&times;</button>
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
                  <td class="px-3 py-2 text-center"><button class="delete-subject text-red-400 hover:text-red-600 transition-colors text-lg leading-none" title="Xóa môn">&times;</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="sem-result px-4 py-2.5 bg-gradient-to-r from-indigo-50/60 to-white border-t border-slate-100 text-xs text-slate-600 flex gap-4">
          <span class="font-medium text-indigo-800">Kết quả:</span>
          <span>GPA Hệ 10: <strong class="text-indigo-700">${fmt(result.gpa10)}</strong></span>
          <span>GPA Hệ 4: <strong class="text-indigo-700">${fmt(result.gpa4)}</strong></span>
          <span>Tổng TC: <strong class="text-indigo-700">${result.totalCredits}</strong></span>
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
  const W = 700, H = 320;
  const pt = 24, pr = 55, pb = 94, pl = 48;
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

  let html = `<svg viewBox="0 0 ${W} ${H}" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">`;

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
    const cumOrig = calcCumulativeOriginal();
    const totalGpa10 = data.semesters.reduce((acc, sem) => {
      const r = calcSemester(sem.subjects);
      return acc + r.gpa10 * r.totalCredits;
    }, 0);
    const totalCreditsAll = data.semesters.reduce((acc, sem) => {
      const r = calcSemester(sem.subjects);
      return acc + r.totalCredits;
    }, 0);
    const overallGpa10 = totalCreditsAll > 0 ? totalGpa10 / totalCreditsAll : 0;

    html += `<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="stats-card rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 p-5 text-center">
        <p class="text-xs uppercase tracking-wider text-white font-semibold">GPA Tích lũy (Hệ 4)</p>
        <p class="text-4xl font-extrabold mt-2 text-white">${fmt(cum.gpa4)}</p>
        <p class="text-xs text-white font-medium mt-1">${cum.totalCredits} tín chỉ tích lũy</p>
      </div>
      <div class="stats-card rounded-xl bg-gradient-to-br from-emerald-800 to-green-900 p-5 text-center">
        <p class="text-xs uppercase tracking-wider text-white font-semibold">GPA Tích lũy (Hệ 10)</p>
        <p class="text-4xl font-extrabold mt-2 text-white">${fmt(overallGpa10)}</p>
        <p class="text-xs text-white font-medium mt-1">Tổng ${data.semesters.length} học kỳ</p>
      </div>
      <div class="stats-card rounded-xl bg-gradient-to-br from-amber-800 to-orange-900 p-5 text-center">
        <p class="text-xs uppercase tracking-wider text-white font-semibold">Trước cải thiện</p>
        <p class="text-4xl font-extrabold mt-2 text-white">${fmt(cumOrig.gpa4)}</p>
        <p class="text-xs text-white font-medium mt-1">${cumOrig.totalCredits > 0 ? `Tăng ${fmt(cum.gpa4 - cumOrig.gpa4)}` : '—'}</p>
      </div>
    </div>`;

    html += `<div class="mb-6 bg-white rounded-xl border border-slate-200 p-5">`;
    html += `<h3 class="text-md font-bold text-slate-700 mb-4">Mục tiêu GPA tốt nghiệp</h3>`;

    html += `<div class="flex flex-wrap items-center gap-3 mb-4">`;
    html += `<div class="flex items-center gap-2"><span class="text-sm text-slate-600 whitespace-nowrap">Tổng TC cần tốt nghiệp:</span><input id="goal-credits-input" type="number" class="w-24 px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg transition-all" value="${data.gradRequiredCredits || 130}" min="1" max="300"></div>`;
    html += `<div class="flex items-center gap-2"><span class="text-sm text-slate-600 whitespace-nowrap">GPA mong muốn:</span><input id="goal-gpa-input" type="number" step="0.01" min="0" max="4" class="w-24 px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg transition-all" value="${data.targetGpa || ''}" placeholder="VD: 3.2"><span class="text-sm text-slate-500">/ 4.0</span></div>`;
    html += `<button id="apply-goal" class="px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all">Tính</button>`;
    html += `</div>`;
    const goalRequired = data.gradRequiredCredits || 130;
    const goalRemaining = Math.max(0, goalRequired - cum.totalCredits);
    const goalTarget = parseFloat(data.targetGpa);

    if (goalTarget && goalTarget > 0 && goalTarget <= 4) {
      if (goalRemaining <= 0) {
        html += `<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p class="text-sm font-bold text-emerald-600">Đã đạt đủ tín chỉ yêu cầu!</p>
        </div>`;
      } else {
        const needed = (goalTarget * goalRequired - cum.gpa4 * cum.totalCredits) / goalRemaining;
        if (needed < 0 || needed > 4) {
          html += `<div class="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p class="text-sm font-bold text-red-500">Không khả thi với số TC còn lại</p>
          </div>`;
        } else {
          html += `<div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
            <p class="text-xs text-slate-600 uppercase tracking-wider mb-1">Cần GPA trong ${goalRemaining} TC còn lại</p>
            <p class="text-3xl font-extrabold text-indigo-600">${fmt(needed)}</p>
          </div>`;
        }
      }
    }
    html += `</div>`;

    html += `<div class="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-5 mb-6">`;
    html += `<h3 class="text-md font-bold text-slate-700 mb-4">Biểu đồ xu hướng GPA</h3>`;
    html += renderGPATrendChart();
    html += `</div>`;

    const unique = getUniqueSubjects();
    const totalAllSubjects = data.semesters.reduce((acc, sem) =>
      acc + sem.subjects.filter(s => parseFloat(s.credits) > 0 && s.grade10 !== '').length, 0);
    const retakeCount = totalAllSubjects - unique.size;

    if (retakeCount > 0) {
      html += `<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800 flex items-start gap-3">
        <span class="text-lg shrink-0">&#9888;</span>
        <div>Có <strong>${retakeCount}</strong> môn học cải thiện. GPA tích lũy sử dụng điểm cao nhất của mỗi môn.</div>
      </div>`;
    }

    html += `<h3 class="text-md font-bold text-slate-700 mb-3">Chi tiết từng học kỳ</h3>`;
    html += `<div class="overflow-x-auto rounded-xl border border-slate-200 mb-6"><table class="w-full">
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
      const gpa10Diff = cumNew.gpa10 - cumOrig.gpa10;
      const diffClass = gpa4Diff > 0 ? 'text-emerald-600' : 'text-red-500';

      html += `<div class="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-5 mb-6">
        <h3 class="text-md font-bold text-slate-700 mb-3">Tác động lên GPA tích lũy</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="text-center p-3 bg-white rounded-xl border border-emerald-100">
            <p class="text-xs text-slate-500 uppercase tracking-wider">Trước cải thiện</p>
            <p class="text-xl font-bold text-slate-700 mt-1">${fmt(cumOrig.gpa4)}</p>
            <p class="text-xs text-slate-400">GPA Hệ 4</p>
          </div>
          <div class="text-center p-3 bg-white rounded-xl border border-emerald-100">
            <p class="text-xs text-slate-500 uppercase tracking-wider">Sau cải thiện</p>
            <p class="text-xl font-bold text-emerald-600 mt-1">${fmt(cumNew.gpa4)}</p>
            <p class="text-xs text-slate-400">GPA Hệ 4</p>
          </div>
          <div class="text-center p-3 bg-white rounded-xl border border-emerald-100">
            <p class="text-xs text-slate-500 uppercase tracking-wider">Tăng</p>
            <p class="text-xl font-bold ${diffClass} mt-1">+${fmt(gpa4Diff)}</p>
            <p class="text-xs text-slate-400">GPA Hệ 4</p>
          </div>
        </div>
      </div>`;

      html += `<h3 class="text-md font-bold text-slate-700 mb-3">Môn học cải thiện điểm</h3>`;
      html += `<div class="overflow-x-auto rounded-xl border border-slate-200"><table class="w-full">
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
    html += `<div class="text-center py-12 text-slate-400">
      <p class="text-4xl mb-3">&#128203;</p>
      <p class="text-sm">Chưa có dữ liệu học kỳ. Vui lòng nhập dữ liệu ở tab Học kỳ.</p>
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
