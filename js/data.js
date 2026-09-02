let data = { semesters: [] };
let saveStatusTimeout;
let saveWriteTimeout;

function defaultData() {
  return {
    studentName: '',
    studentId: '',
    targetGpa: '',
    expectedRemainingGpa: '3',
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
      if (typeof data.expectedRemainingGpa === 'undefined') data.expectedRemainingGpa = '3';
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

function showSaveStatus() {
  const el = document.getElementById('save-status');
  if (!el) return;
  el.classList.remove('opacity-0');
  el.classList.add('opacity-100');
  clearTimeout(saveStatusTimeout);
  saveStatusTimeout = setTimeout(() => {
    el.classList.remove('opacity-100');
    el.classList.add('opacity-0');
  }, 2000);
}

function persistData() {
  try {
    localStorage.setItem('gpaData', JSON.stringify(data));
    showSaveStatus();
  } catch {}
}

function saveData() {
  clearTimeout(saveWriteTimeout);
  saveWriteTimeout = null;
  persistData();
}

function scheduleDataSave(delay = 250) {
  clearTimeout(saveWriteTimeout);
  saveWriteTimeout = setTimeout(() => {
    saveWriteTimeout = null;
    persistData();
  }, delay);
}

function flushDataSave() {
  if (saveWriteTimeout === null || typeof saveWriteTimeout === 'undefined') return;
  clearTimeout(saveWriteTimeout);
  saveWriteTimeout = null;
  persistData();
}

function collectSemesterInput(target, card) {
  const semesterIndex = Number(card.dataset.semIndex);
  const semester = data.semesters[semesterIndex];
  if (!semester) return null;

  if (target.classList.contains('sem-name')) {
    semester.name = target.value || 'Học kỳ';
    return { semesterIndex, semester, subjectIndex: -1 };
  }

  const row = target.closest('tr');
  const subjectIndex = Number(row?.dataset.subjectIndex);
  const subject = semester.subjects[subjectIndex];
  if (!subject) return { semesterIndex, semester, subjectIndex: -1 };

  if (target.classList.contains('sub-name')) subject.name = target.value;
  if (target.classList.contains('sub-credits')) subject.credits = target.value;
  if (target.classList.contains('sub-grade10')) subject.grade10 = target.value;
  return { semesterIndex, semester, subjectIndex };
}
