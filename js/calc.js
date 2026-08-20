function findGrade(grade10) {
  if (grade10 === '' || grade10 === null || grade10 === undefined) return null;
  const g = parseFloat(grade10);
  if (isNaN(g)) return null;
  for (const r of HCMUT_SCALE) {
    if (g >= r.from && g <= r.to) return r;
  }
  return null;
}

function calcSemester(subjects) {
  let totalCredits = 0, sum10 = 0, sum4 = 0;
  for (const sub of subjects) {
    const cr = parseFloat(sub.credits);
    const g10 = parseFloat(sub.grade10);
    if (cr > 0 && !isNaN(g10) && sub.grade10 !== '') {
      const found = findGrade(sub.grade10);
      if (found) {
        totalCredits += cr;
        sum10 += g10 * cr;
        sum4 += found.gpa4 * cr;
      }
    }
  }
  return {
    totalCredits,
    gpa10: totalCredits > 0 ? sum10 / totalCredits : 0,
    gpa4: totalCredits > 0 ? sum4 / totalCredits : 0,
  };
}

function getUniqueSubjects() {
  const map = new Map();
  for (const sem of data.semesters) {
    for (const sub of sem.subjects) {
      const key = sub.name.trim().toLowerCase();
      if (!key) continue;
      const cr = parseFloat(sub.credits);
      const g10 = parseFloat(sub.grade10);
      if (cr > 0 && !isNaN(g10) && sub.grade10 !== '') {
        const existing = map.get(key);
        if (!existing || g10 > existing.grade10) {
          map.set(key, { ...sub, credits: cr, grade10: g10 });
        }
      }
    }
  }
  return map;
}

function isRetake(name, semIndex) {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  for (let i = 0; i < semIndex; i++) {
    for (const sub of data.semesters[i].subjects) {
      if (sub.name.trim().toLowerCase() === key) {
        const g10 = parseFloat(sub.grade10);
        return { semester: data.semesters[i].name, grade10: isNaN(g10) ? null : g10 };
      }
    }
  }
  return null;
}

function calcCumulative() {
  const unique = getUniqueSubjects();
  let totalCredits = 0, sum10 = 0, sum4 = 0;
  for (const [, entry] of unique) {
    const found = findGrade(String(entry.grade10));
    if (found) {
      totalCredits += entry.credits;
      sum10 += entry.grade10 * entry.credits;
      sum4 += found.gpa4 * entry.credits;
    }
  }
  return {
    totalCredits,
    gpa10: totalCredits > 0 ? sum10 / totalCredits : 0,
    gpa4: totalCredits > 0 ? sum4 / totalCredits : 0,
  };
}

function calcCumulativeOriginal() {
  const seen = new Map();
  let totalCredits = 0, sum10 = 0, sum4 = 0;
  for (const sem of data.semesters) {
    for (const sub of sem.subjects) {
      const key = sub.name.trim().toLowerCase();
      if (!key) continue;
      const cr = parseFloat(sub.credits);
      const g10 = parseFloat(sub.grade10);
      if (cr > 0 && !isNaN(g10) && sub.grade10 !== '') {
        if (!seen.has(key)) {
          seen.set(key, true);
          const found = findGrade(sub.grade10);
          if (found) {
            totalCredits += cr;
            sum10 += g10 * cr;
            sum4 += found.gpa4 * cr;
          }
        }
      }
    }
  }
  return {
    totalCredits,
    gpa10: totalCredits > 0 ? sum10 / totalCredits : 0,
    gpa4: totalCredits > 0 ? sum4 / totalCredits : 0,
  };
}

function fmt(v) {
  if (v === 0) return '0.00';
  if (!v && v !== 0) return '-';
  return parseFloat(v).toFixed(2);
}
