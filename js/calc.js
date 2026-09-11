function findGrade(grade10) {
  if (grade10 === '' || grade10 === null || grade10 === undefined) return null;
  const g = parseFloat(grade10);
  if (isNaN(g) || g < 0 || g > 10) return null;
  return HCMUT_SCALE.find(r => g >= r.from) || null;
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

function getImprovementCandidates() {
  return Array.from(getUniqueSubjects().values())
    .map(entry => {
      const grade = findGrade(entry.grade10);
      if (!grade) return null;
      return {
        name: entry.name.trim(),
        credits: entry.credits,
        grade10: entry.grade10,
        currentLetter: grade.letter,
        currentGpa4: grade.gpa4,
      };
    })
    .filter(Boolean)
    .sort((left, right) => (
      left.currentGpa4 - right.currentGpa4
      || left.grade10 - right.grade10
      || left.credits - right.credits
      || left.name.localeCompare(right.name, 'vi')
    ));
}

function finishImprovementScenario(label, selections, basePoints, projectedCredits, deficit) {
  const gain = selections.reduce((sum, item) => sum + item.gain, 0);
  if (gain + 1e-9 < deficit || selections.length === 0) return null;
  return {
    label,
    selections,
    totalCredits: selections.reduce((sum, item) => sum + item.credits, 0),
    aCredits: selections.filter(item => item.targetLetter === 'A').reduce((sum, item) => sum + item.credits, 0),
    bPlusCredits: selections.filter(item => item.targetLetter === 'B+').reduce((sum, item) => sum + item.credits, 0),
    projectedGpa: (basePoints + gain) / projectedCredits,
  };
}

function buildSingleGradeScenario(label, targetLetter, targetGpa4, candidates, deficit, basePoints, projectedCredits) {
  const selections = [];
  let gain = 0;
  for (const candidate of candidates) {
    if (candidate.currentGpa4 >= targetGpa4) continue;
    const itemGain = (targetGpa4 - candidate.currentGpa4) * candidate.credits;
    selections.push({ ...candidate, targetLetter, targetGpa4, gain: itemGain });
    gain += itemGain;
    if (gain + 1e-9 >= deficit) break;
  }
  return finishImprovementScenario(label, selections, basePoints, projectedCredits, deficit);
}

function buildMixedScenario(candidates, deficit, basePoints, projectedCredits) {
  let best = null;
  for (let split = 1; split < candidates.length; split++) {
    const selections = [];
    let gain = 0;
    for (let index = 0; index < candidates.length; index++) {
      const targetLetter = index < split ? 'A' : 'B+';
      const targetGpa4 = targetLetter === 'A' ? 4 : 3.5;
      const candidate = candidates[index];
      if (candidate.currentGpa4 >= targetGpa4) continue;
      const itemGain = (targetGpa4 - candidate.currentGpa4) * candidate.credits;
      selections.push({ ...candidate, targetLetter, targetGpa4, gain: itemGain });
      gain += itemGain;
      if (gain + 1e-9 >= deficit) break;
    }
    if (!selections.some(item => item.targetLetter === 'A') || !selections.some(item => item.targetLetter === 'B+')) continue;
    const scenario = finishImprovementScenario('Phối hợp A và B+', selections, basePoints, projectedCredits, deficit);
    if (!scenario) continue;
    if (!best
      || scenario.totalCredits < best.totalCredits
      || (scenario.totalCredits === best.totalCredits && scenario.aCredits < best.aCredits)
      || (scenario.totalCredits === best.totalCredits && scenario.aCredits === best.aCredits && scenario.selections.length < best.selections.length)) {
      best = scenario;
    }
  }
  return best;
}

function calculateImprovementScenarios(targetGpa, requiredCredits, expectedRemainingGpa) {
  const cumulative = calcCumulative();
  const remainingCredits = Math.max(0, requiredCredits - cumulative.totalCredits);
  const projectedCredits = Math.max(requiredCredits, cumulative.totalCredits);
  const basePoints = cumulative.gpa4 * cumulative.totalCredits + expectedRemainingGpa * remainingCredits;
  const requiredPoints = targetGpa * projectedCredits;
  const deficit = requiredPoints - basePoints;
  const candidates = getImprovementCandidates();
  const projection = {
    currentCredits: cumulative.totalCredits,
    remainingCredits,
    baseProjectedGpa: projectedCredits > 0 ? basePoints / projectedCredits : 0,
  };

  if (deficit <= 1e-9) {
    return { status: 'enough', projectedGpa: projection.baseProjectedGpa, scenarios: [], ...projection };
  }

  const maximumGain = candidates.reduce((sum, item) => sum + (4 - item.currentGpa4) * item.credits, 0);
  if (maximumGain + 1e-9 < deficit) {
    return {
      status: 'impossible',
      maxGpa: projectedCredits > 0 ? (basePoints + maximumGain) / projectedCredits : 0,
      scenarios: [],
      ...projection,
    };
  }

  const possible = [
    buildSingleGradeScenario('Nâng lên A', 'A', 4, candidates, deficit, basePoints, projectedCredits),
    buildSingleGradeScenario('Nâng lên B+', 'B+', 3.5, candidates, deficit, basePoints, projectedCredits),
    buildMixedScenario(candidates, deficit, basePoints, projectedCredits),
  ].filter(scenario => scenario && scenario.projectedGpa + 1e-9 >= targetGpa);
  const seen = new Set();
  const scenarios = possible.filter(scenario => {
    const key = scenario.selections.map(item => `${item.name.toLowerCase()}|${item.targetLetter}`).join(';');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { status: 'scenarios', scenarios, ...projection };
}

function fmt(v) {
  if (v === 0) return '0.00';
  if (!v && v !== 0) return '-';
  return parseFloat(v).toFixed(2);
}
