let data = { semesters: [] };
let saveTimeout;

function defaultData() {
  return {
    studentName: '',
    studentId: '',
    targetGpa: '',
    gradRequiredCredits: 130,
    semesters: [{ name: 'Học kỳ 1', subjects: [{ name: '', credits: '', grade10: '' }] }],
  };
}

function loadData() {
  try {
    const saved = localStorage.getItem('gpaData');
    if (saved) {
      data = JSON.parse(saved);
      if (!data.semesters || data.semesters.length === 0) {
        data = defaultData();
      }
      if (typeof data.studentName === 'undefined') data.studentName = '';
      if (typeof data.studentId === 'undefined') data.studentId = '';
      if (typeof data.targetGpa === 'undefined') data.targetGpa = '';
      if (typeof data.gradRequiredCredits === 'undefined') data.gradRequiredCredits = 130;
      delete data.scale;
      delete data.selectedUni;
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
