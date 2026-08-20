const MAX_BODY_BYTES = 256 * 1024;
const MAX_SEMESTERS = 12;
const MAX_SUBJECTS = 12;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string') throw new Error('Dữ liệu văn bản không hợp lệ.');
  const cleaned = value.normalize('NFC').trim().replace(/\s+/g, ' ');
  if (!cleaned || cleaned.length > maxLength) throw new Error('Dữ liệu văn bản không hợp lệ.');
  return cleaned;
}

function finiteNumber(value, min, max, field) {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${field} không hợp lệ.`);
  }
  return number;
}

function sanitizeScale(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 20) {
    throw new Error('Thang điểm không hợp lệ.');
  }
  return input.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Thang điểm không hợp lệ.');
    const from = finiteNumber(item.from, 0, 10, 'Cận dưới');
    const to = finiteNumber(item.to, 0, 10, 'Cận trên');
    if (from > to) throw new Error('Khoảng quy đổi điểm không hợp lệ.');
    return {
      from,
      to,
      letter: cleanText(item.letter, 8),
      gpa4: finiteNumber(item.gpa4, 0, 4, 'GPA4'),
    };
  });
}

function sanitizeSemesters(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_SEMESTERS) {
    throw new Error('Số học kỳ không hợp lệ.');
  }
  return input.map((semester) => {
    if (!semester || typeof semester !== 'object') throw new Error('Dữ liệu học kỳ không hợp lệ.');
    if (!Array.isArray(semester.subjects) || semester.subjects.length < 1 || semester.subjects.length > MAX_SUBJECTS) {
      throw new Error('Số môn trong học kỳ không hợp lệ.');
    }
    return {
      name: cleanText(semester.name, 100),
      subjects: semester.subjects.map((subject) => {
        if (!subject || typeof subject !== 'object') throw new Error('Dữ liệu môn học không hợp lệ.');
        return {
          name: cleanText(subject.name, 200),
          credits: finiteNumber(subject.credits, 0.1, 50, 'Tín chỉ'),
          grade10: finiteNumber(subject.grade10, 0, 10, 'Điểm hệ 10'),
        };
      }),
    };
  });
}

function findGrade(grade10, scale) {
  return scale.find((range) => grade10 >= range.from && grade10 <= range.to) || null;
}

function calculateSubjects(subjects, scale) {
  let totalCredits = 0;
  let sum10 = 0;
  let sum4 = 0;
  for (const subject of subjects) {
    const grade = findGrade(subject.grade10, scale);
    if (!grade) continue;
    totalCredits += subject.credits;
    sum10 += subject.grade10 * subject.credits;
    sum4 += grade.gpa4 * subject.credits;
  }
  return {
    totalCredits,
    gpa10: totalCredits ? sum10 / totalCredits : 0,
    gpa4: totalCredits ? sum4 / totalCredits : 0,
  };
}

function subjectKey(name) {
  return name.trim().toLowerCase();
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function publicResult(result) {
  return {
    totalCredits: round2(result.totalCredits),
    gpa10: round2(result.gpa10),
    gpa4: round2(result.gpa4),
  };
}

function calculateRecord(studentName, studentId, semesters, scale) {
  const highest = new Map();
  const first = new Map();
  const firstSeenAt = new Map();

  semesters.forEach((semester, semesterIndex) => {
    semester.subjects.forEach((subject, subjectIndex) => {
      const key = subjectKey(subject.name);
      if (!first.has(key)) {
        first.set(key, subject);
        firstSeenAt.set(key, semesterIndex);
      }
      const previous = highest.get(key);
      if (!previous || subject.grade10 > previous.entry.grade10) {
        highest.set(key, { entry: subject, semesterIndex, subjectIndex });
      }
    });
  });

  const calculatedSemesters = semesters.map((semester, semesterIndex) => ({
    name: semester.name,
    ...publicResult(calculateSubjects(semester.subjects, scale)),
    subjects: semester.subjects.map((subject, subjectIndex) => {
      const key = subjectKey(subject.name);
      const grade = findGrade(subject.grade10, scale);
      const best = highest.get(key);
      return {
        name: subject.name,
        credits: subject.credits,
        grade10: subject.grade10,
        letter: grade ? grade.letter : '',
        gpa4: grade ? grade.gpa4 : null,
        retake: firstSeenAt.get(key) < semesterIndex,
        counted: Boolean(grade) && best.semesterIndex === semesterIndex && best.subjectIndex === subjectIndex,
      };
    }),
  }));

  const highestEntries = [...highest.values()].map((item) => item.entry);

  return {
    schemaVersion: 2,
    student: { name: studentName, id: studentId },
    source: 'BKEL',
    syncedAt: new Date().toISOString(),
    scaleUsed: scale,
    semesters: calculatedSemesters,
    summary: {
      ...publicResult(calculateSubjects(highestEntries, scale)),
      semesterCount: semesters.length,
      beforeImprovement: publicResult(calculateSubjects([...first.values()], scale)),
    },
  };
}

async function verifyTurnstile(token, request, secret) {
  if (typeof token !== 'string' || token.length < 1 || token.length > 2048) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  const remoteIp = request.headers.get('CF-Connecting-IP');
  if (remoteIp) form.append('remoteip', remoteIp);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  if (!response.ok) return false;
  const result = await response.json();
  const requestHostname = new URL(request.url).hostname.toLowerCase();
  return result.success === true
    && result.action === 'sync_grades'
    && typeof result.hostname === 'string'
    && result.hostname.toLowerCase() === requestHostname;
}

function hasRequiredEnvironment(env) {
  return env.TURNSTILE_SECRET_KEY && env.GOOGLE_APPS_SCRIPT_URL && env.SHEET_SYNC_SECRET;
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ ok: false, error: 'Chỉ hỗ trợ phương thức POST.' }, 405);
  if (!hasRequiredEnvironment(env)) return json({ ok: false, error: 'Máy chủ chưa được cấu hình đồng bộ.' }, 503);
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) {
    return json({ ok: false, error: 'Content-Type không hợp lệ.' }, 415);
  }

  const declaredLength = Number(request.headers.get('Content-Length') || 0);
  if (declaredLength > MAX_BODY_BYTES) return json({ ok: false, error: 'Dữ liệu vượt quá giới hạn.' }, 413);

  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return json({ ok: false, error: 'Dữ liệu vượt quá giới hạn.' }, 413);
    }
    const input = JSON.parse(raw);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Dữ liệu gửi lên không hợp lệ.');

    let verified = false;
    try {
      verified = await verifyTurnstile(input.turnstileToken, request, env.TURNSTILE_SECRET_KEY);
    } catch (error) {
      console.error('Turnstile verification failed', error);
    }
    if (!verified) return json({ ok: false, error: 'Xác thực Cloudflare không thành công.' }, 403);

    const studentName = cleanText(input.studentName, 100);
    const studentId = typeof input.studentId === 'string' ? input.studentId.trim() : '';
    if (!/^\d{7,12}$/.test(studentId)) throw new Error('MSSV phải gồm 7–12 chữ số.');
    const semesters = sanitizeSemesters(input.semesters);
    const scale = sanitizeScale(input.scale);
    const record = calculateRecord(studentName, studentId, semesters, scale);

    let googleResponse;
    try {
      googleResponse = await fetch(env.GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: JSON.stringify({ secret: env.SHEET_SYNC_SECRET, record }),
        redirect: 'follow',
      });
    } catch (error) {
      console.error('Google Apps Script request failed', error);
      return json({ ok: false, error: 'Không thể kết nối Google Sheet.' }, 502);
    }
    const googleText = await googleResponse.text();
    let googleResult;
    try {
      googleResult = JSON.parse(googleText);
    } catch {
      googleResult = null;
    }
    if (!googleResponse.ok || !googleResult || googleResult.ok !== true) {
      console.error('Google Apps Script sync failed', googleResponse.status, googleText.slice(0, 500));
      return json({ ok: false, error: 'Google Sheet tạm thời không phản hồi.' }, 502);
    }
    return json({
      ok: true,
      action: googleResult.action === 'updated' ? 'updated' : 'created',
      sheetName: typeof googleResult.sheetName === 'string' ? googleResult.sheetName.slice(0, 120) : '',
    });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ ok: false, error: 'JSON không hợp lệ.' }, 400);
    if (error instanceof Error && error.message) return json({ ok: false, error: error.message }, 400);
    return json({ ok: false, error: 'Không thể xử lý yêu cầu.' }, 500);
  }
}
