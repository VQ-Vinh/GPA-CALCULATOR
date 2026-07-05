let parsedImport = null;

function parseBKEL(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const semesters = [];
  let currentSem = null;
  let studentName = '';
  let studentId = '';

  for (const line of lines) {
    const trimmed = line.trim();

    const nameMatch = trimmed.match(/^Họ và tên:\s*(.+)/);
    if (nameMatch) { studentName = nameMatch[1].trim(); continue; }

    const idMatch = trimmed.match(/^Mã sinh viên:\s*(.+)/);
    if (idMatch) { studentId = idMatch[1].trim(); continue; }

    const semMatch = trimmed.match(/Năm học\s+(\d{4}\s*-\s*\d{4})\s*\/\s*Học kỳ\s+(\d+)/);
    if (semMatch) {
      currentSem = { name: `HK${semMatch[2]} (${semMatch[1]})`, subjects: [] };
      semesters.push(currentSem);
      continue;
    }

    if (!currentSem) continue;

    const cols = line.split('\t').map(c => c.trim());
    if (cols.length < 6) continue;
    if (!/^\d+$/.test(cols[0])) continue;

    const stt = parseInt(cols[0]);
    if (isNaN(stt)) continue;

    const name = cols[2];
    const gradeRaw = cols[3];
    const letterGrade = cols[4];
    const creditsRaw = cols[5];
    const status = (cols[7] || '') + (cols[9] || '');

    const credits = parseFloat(creditsRaw);
    if (!credits || credits === 0) continue;
    if (status.includes('Không in trên bảng điểm') || status.includes('Không tính TCTL')) continue;
    if (letterGrade === 'RT' || letterGrade === 'DT' || letterGrade === 'KD' || letterGrade === 'VP' || letterGrade === 'CH' || letterGrade === 'CT') continue;

    const grade10 = parseFloat(gradeRaw);
    if (isNaN(grade10)) continue;

    currentSem.subjects.push({ name, credits: String(credits), grade10: String(grade10) });
  }

  const filtered = semesters.filter(s => s.subjects.length > 0);
  filtered.reverse();
  return {
    semesters: filtered,
    studentName,
    studentId,
  };
}
