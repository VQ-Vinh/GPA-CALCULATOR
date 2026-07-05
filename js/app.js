emailjs.init('ihto8iKKJf2jmOLaX');

function refresh() {
  collectData();
  saveData();
  renderScale();
  renderSemesters();
  if (currentTab === 4) renderSummary();
}

function bindEvents() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (currentTab === 1 || currentTab === 3) collectData();
      if (currentTab === 1 || currentTab === 3) saveData();
      switchTab(parseInt(btn.dataset.tab));
    });
  });

  function onStudentInput() {
    data.studentName = document.getElementById('student-name').value.trim();
    data.studentId = document.getElementById('student-id').value.trim();
    saveData();
    toggleSemestersLock();
  }
  document.getElementById('student-name').addEventListener('input', onStudentInput);
  document.getElementById('student-id').addEventListener('input', onStudentInput);

  document.getElementById('add-scale-row').addEventListener('click', () => {
    data.scale.push({ from: 0, to: 0, letter: '', gpa4: 0 });
    renderScale();
    saveData();
  });

  document.getElementById('reset-scale').addEventListener('click', () => {
    data.scale = JSON.parse(JSON.stringify(DEFAULT_SCALE));
    renderScale();
    saveData();
  });

  document.getElementById('add-semester').addEventListener('click', () => {
    if (data.semesters.length >= 12) return;
    const num = data.semesters.length + 1;
    data.semesters.push({ name: `Học kỳ ${num}`, subjects: [{ name: '', credits: '', grade10: '' }] });
    renderSemesters();
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

  document.getElementById('uni-select').addEventListener('change', () => {
    const sel = document.getElementById('uni-select');
    const name = sel.value;
    const scale = UNIVERSITY_SCALES[name];
    if (scale) {
      data.selectedUni = name;
      data.scale = JSON.parse(JSON.stringify(scale));
    } else {
      data.selectedUni = '';
      data.scale = JSON.parse(JSON.stringify(DEFAULT_SCALE));
    }
    renderScale();
    saveData();
  });

  document.getElementById('import-parse').addEventListener('click', () => {
    const text = document.getElementById('import-paste').value;
    if (!text.trim()) { alert('Vui lòng paste dữ liệu bảng điểm vào ô trên.'); return; }
    const uni = document.getElementById('import-uni').value;
    parsedImport = null;
    let result;
    if (uni === 'BKEL') result = parseBKEL(text);
    else { alert('Chưa hỗ trợ trường này.'); return; }
    if (!result.semesters || result.semesters.length === 0) { alert('Không tìm thấy dữ liệu học kỳ nào. Vui lòng kiểm tra lại.'); return; }
    parsedImport = result;
    const sems = result.semesters;
    let infoHtml = '';
    if (result.studentName || result.studentId) {
      infoHtml = `<div class="rounded-xl border border-slate-200 bg-white p-4 mb-3 text-sm"><span class="text-slate-500">Họ tên:</span> <strong>${result.studentName || '—'}</strong> &middot; <span class="text-slate-500">MSSV:</span> <strong>${result.studentId || '—'}</strong></div>`;
    }
    document.getElementById('import-preview').innerHTML = infoHtml + `
      <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-3">
        <p class="text-sm font-semibold text-emerald-700 mb-2">Tìm thấy ${sems.length} học kỳ, tổng ${sems.reduce((s, sem) => s + sem.subjects.length, 0)} môn</p>
        ${sems.map((sem, i) => `
          <div class="mb-2 last:mb-0">
            <div class="text-sm font-medium text-slate-700">${sem.name}</div>
            <div class="text-xs text-slate-500">${sem.subjects.length} môn: ${sem.subjects.map(s => s.name).join(', ')}</div>
          </div>
        `).join('')}
      </div>
    `;
    document.getElementById('import-apply').classList.remove('hidden');
  });

  document.getElementById('import-apply').addEventListener('click', () => {
    if (!parsedImport) return;
    data.semesters = parsedImport.semesters;
    if (data.semesters.length > 12) data.semesters = data.semesters.slice(0, 12);
    if (parsedImport.studentName) data.studentName = parsedImport.studentName;
    if (parsedImport.studentId) data.studentId = parsedImport.studentId;
    parsedImport = null;
    saveData();
    renderAll();
    document.getElementById('import-apply').classList.add('hidden');
    document.getElementById('import-preview').innerHTML = '';
    document.getElementById('import-paste').value = '';
    const cum = calcCumulative();
    emailjs.send('service_030bcal', 'template_vrq76kj', {
      name: data.studentName || 'Chưa nhập',
      id: data.studentId || 'Chưa nhập',
      date: new Date().toLocaleDateString('vi-VN'),
      gpa10: cum.totalCredits > 0 ? cum.gpa10.toFixed(2) : '0.00',
      gpa4: cum.totalCredits > 0 ? cum.gpa4.toFixed(2) : '0.00',
      credits: String(cum.totalCredits),
      data: `=== TỔNG KẾT ===\nGPA Hệ 10: ${cum.totalCredits > 0 ? cum.gpa10.toFixed(2) : '0.00'}\nGPA Hệ 4: ${cum.totalCredits > 0 ? cum.gpa4.toFixed(2) : '0.00'}\nTổng tín chỉ: ${cum.totalCredits}\n\n=== CHI TIẾT ===\n${JSON.stringify(data, null, 2)}`,
    }).catch(() => {});
    switchTab(3);
  });

  document.getElementById('scale-body').addEventListener('input', () => {
    collectData();
    saveData();
  });

  document.getElementById('scale-body').addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-scale-row')) {
      const tr = e.target.closest('tr');
      const idx = Array.from(tr.parentElement.children).indexOf(tr);
      if (data.scale.length > 1) {
        data.scale.splice(idx, 1);
        renderScale();
        saveData();
      }
    }
  });

  document.getElementById('semesters-container').addEventListener('input', (e) => {
    const target = e.target;
    const card = target.closest('.semester-card');
    if (!card) return;

    collectData();
    saveData();

    if (target.classList.contains('sub-grade10') || target.classList.contains('sub-credits')) {
      const semIndex = Array.from(document.querySelectorAll('.semester-card')).indexOf(card);
      if (semIndex >= 0) {
        const result = calcSemester(data.semesters[semIndex].subjects);
        const resultDiv = card.querySelector('.sem-result');
        if (resultDiv) {
          resultDiv.innerHTML = `
            <span class="font-medium text-indigo-800">Kết quả:</span>
            <span>GPA Hệ 10: <strong class="text-indigo-700">${fmt(result.gpa10)}</strong></span>
            <span>GPA Hệ 4: <strong class="text-indigo-700">${fmt(result.gpa4)}</strong></span>
            <span>Tổng TC: <strong class="text-indigo-700">${result.totalCredits}</strong></span>
          `;
        }
        const headerInfo = card.querySelector('.sem-header span.text-xs');
        if (headerInfo) {
          headerInfo.innerHTML = `${result.totalCredits} TC &middot; GPA10: ${fmt(result.gpa10)} &middot; GPA4: ${fmt(result.gpa4)}`;
        }
      }
    }

    if (target.classList.contains('sub-name')) {
      const tr = target.closest('tr');
      const nameTd = tr.cells[1];
      const flexDiv = nameTd && nameTd.querySelector('.flex');
      if (flexDiv) {
        const semIndex = Array.from(document.querySelectorAll('.semester-card')).indexOf(card);
        const name = target.value.trim();
        const retakeInfo = name ? isRetake(target.value, semIndex) : null;
        const existingBadge = flexDiv.querySelector('.retake-badge');
        if (retakeInfo && !existingBadge) {
          const badge = document.createElement('span');
          badge.className = 'retake-badge text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-200 whitespace-nowrap shrink-0';
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
      tdLetter.textContent = found ? found.letter : '-';
      tdLetter.className = `px-3 py-2 text-sm text-center font-semibold ${found ? 'text-slate-700' : 'text-slate-400'}`;
      tdGpa4.textContent = found ? fmt(found.gpa4) : '-';
      tdGpa4.className = `px-3 py-2 text-sm text-center font-semibold ${found ? 'text-slate-700' : 'text-slate-400'}`;
    }
  });

  document.getElementById('semesters-container').addEventListener('click', (e) => {
    const card = e.target.closest('.semester-card');
    if (!card) return;

    if (e.target.classList.contains('delete-semester')) {
      if (data.semesters.length <= 1) return;
      const idx = Array.from(document.querySelectorAll('.semester-card')).indexOf(card);
      data.semesters.splice(idx, 1);
      renderSemesters();
      saveData();
      return;
    }

    if (e.target.classList.contains('delete-subject')) {
      const tr = e.target.closest('tr');
      const tbody = tr.closest('tbody');
      const idx = Array.from(tbody.children).indexOf(tr);
      const semIdx = Array.from(document.querySelectorAll('.semester-card')).indexOf(card);
      if (data.semesters[semIdx].subjects.length > 1) {
        data.semesters[semIdx].subjects.splice(idx, 1);
        renderSemesters();
        saveData();
      }
      return;
    }

    if (e.target.classList.contains('add-subject')) {
      const semIdx = Array.from(document.querySelectorAll('.semester-card')).indexOf(card);
      if (data.semesters[semIdx].subjects.length < 12) {
        data.semesters[semIdx].subjects.push({ name: '', credits: '', grade10: '' });
        renderSemesters();
        saveData();
      }
      return;
    }

    if (e.target.closest('.sem-header') && !e.target.closest('button')) {
      const body = card.querySelector('.sem-body');
      const icon = card.querySelector('.toggle-icon');
      body.classList.toggle('hidden');
      icon.style.transform = body.classList.contains('hidden') ? 'rotate(-90deg)' : 'rotate(0deg)';
    }
  });

  document.getElementById('summary-content').addEventListener('click', (e) => {
    if (e.target.id === 'apply-target-gpa') {
      data.targetGpa = document.getElementById('target-gpa-input').value.trim();
      saveData();
      renderSummary();
      return;
    }
    if (e.target.id === 'apply-grad') {
      data.gradRequiredCredits = parseFloat(document.getElementById('grad-credits-input').value) || 130;
      data.gradMinGpa = parseFloat(document.getElementById('grad-gpa-input').value) || 2.0;
      saveData();
      renderSummary();
      return;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderAll();
  bindEvents();
});
