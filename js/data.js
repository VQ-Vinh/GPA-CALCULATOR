let data = { scale: [], semesters: [] };
let currentTab = 0;
let saveTimeout;

function defaultData() {
  return {
    studentName: '',
    studentId: '',
    selectedUni: '',
    targetGpa: '',
    gradRequiredCredits: 130,
    scale: JSON.parse(JSON.stringify(DEFAULT_SCALE)),
    semesters: [{ name: 'Học kỳ 1', subjects: [{ name: '', credits: '', grade10: '' }] }],
  };
}

function loadData() {
  try {
    const saved = localStorage.getItem('gpaData');
    if (saved) {
      data = JSON.parse(saved);
      if (!data.scale || !data.semesters || data.semesters.length === 0) {
        data = defaultData();
      }
      if (typeof data.studentName === 'undefined') data.studentName = '';
      if (typeof data.studentId === 'undefined') data.studentId = '';
      if (typeof data.selectedUni === 'undefined') data.selectedUni = '';
          if (typeof data.targetGpa === 'undefined') data.targetGpa = '';
          if (typeof data.gradRequiredCredits === 'undefined') data.gradRequiredCredits = 130;
    } else {
      data = defaultData();
    }
  } catch {
    data = defaultData();
  }
}

function saveData() {
  try {
    localStorage.setItem('gpaData', JSON.stringify(data));
    const el = document.getElementById('save-status');
    if (el) {
      el.classList.remove('opacity-0');
      el.classList.add('opacity-100');
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => { el.classList.remove('opacity-100'); el.classList.add('opacity-0'); }, 2000);
    }
  } catch {}
}

function collectData() {
  data.studentName = document.getElementById('student-name')?.value || '';
  data.studentId = document.getElementById('student-id')?.value || '';

  const scaleRows = document.querySelectorAll('#scale-body tr');
  data.scale = Array.from(scaleRows).map(tr => ({
    from: parseFloat(tr.querySelector('.scale-from').value) || 0,
    to: parseFloat(tr.querySelector('.scale-to').value) || 0,
    letter: tr.querySelector('.scale-letter').value || '',
    gpa4: parseFloat(tr.querySelector('.scale-gpa4').value) || 0,
  }));

  const semCards = document.querySelectorAll('.semester-card');
  data.semesters = Array.from(semCards).map(card => {
    const name = card.querySelector('.sem-name').value || 'Học kỳ';
    const rows = card.querySelectorAll('tbody tr');
    const subjects = Array.from(rows).map(row => ({
      name: row.querySelector('.sub-name')?.value || '',
      credits: row.querySelector('.sub-credits')?.value || '',
      grade10: row.querySelector('.sub-grade10')?.value || '',
    }));
    return { name, subjects };
  });
}
