var INDEX_HEADERS = ['HỌ TÊN', 'MSSV', 'GPA HỆ 4', 'GPA HỆ 10', 'TỔNG TC', 'SỐ HỌC KỲ', 'ĐỒNG BỘ LÚC', 'TRANG TÍNH'];
var SUBJECT_HEADERS = ['HỌC KỲ', 'STT', 'TÊN MÔN HỌC', 'TÍN CHỈ', 'ĐIỂM 10', 'ĐIỂM CHỮ', 'HỆ 4', 'GHI CHÚ'];
var SUMMARY_HEADERS = ['GPA HỆ 4', 'GPA HỆ 10', 'TỔNG TC', 'SỐ HỌC KỲ', 'GPA4 TRƯỚC CẢI THIỆN', 'MỨC TĂNG'];
var TABLE_HEADER_ROW = 9;
var MAX_SHEET_NAME_LENGTH = 100;
var MIN_COLUMN_WIDTH = 72;
var MAX_COLUMN_WIDTH = 280;

var PALETTE = {
  primary: '#4f46e5',
  primaryDark: '#3730a3',
  primaryLight: '#eef2ff',
  headerDark: '#1e293b',
  band: '#f8fafc',
  white: '#ffffff',
  text: '#0f172a',
  border: '#cbd5e1'
};

var TONES = {
  good: { bg: '#d1fae5', fg: '#047857' },
  info: { bg: '#dbeafe', fg: '#1d4ed8' },
  warn: { bg: '#fef3c7', fg: '#b45309' },
  bad: { bg: '#fee2e2', fg: '#b91c1c' },
  muted: { bg: '#f1f5f9', fg: '#64748b' }
};

// Mot mau rieng cho tung muc he 4. A+ va A cung la 4.0 nen dung chung mau.
var GRADE_TONES = {
  '4': { bg: '#a7f3d0', fg: '#065f46' },
  '3.5': { bg: '#d9f99d', fg: '#3f6212' },
  '3': { bg: '#bfdbfe', fg: '#1e40af' },
  '2.5': { bg: '#a5f3fc', fg: '#155e75' },
  '2': { bg: '#fde68a', fg: '#92400e' },
  '1.5': { bg: '#fed7aa', fg: '#9a3412' },
  '1': { bg: '#fecdd3', fg: '#9f1239' },
  '0': { bg: '#fca5a5', fg: '#7f1d1d' }
};

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function safeSheetText(value) {
  var text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function secureEqual(left, right) {
  left = String(left || '');
  right = String(right || '');
  var mismatch = left.length ^ right.length;
  var length = Math.max(left.length, right.length);
  for (var i = 0; i < length; i++) {
    mismatch |= (left.charCodeAt(i % Math.max(left.length, 1)) || 0)
      ^ (right.charCodeAt(i % Math.max(right.length, 1)) || 0);
  }
  return mismatch === 0;
}

function repeat(value, count) {
  var out = [];
  for (var i = 0; i < count; i++) out.push(value);
  return out;
}

// Diem tung mon: gia tri roi rac tu thang diem -> mot mau moi muc.
function gradeTone(gpa4) {
  if (gpa4 === '' || gpa4 == null) return null;
  var value = Number(gpa4);
  if (isNaN(value)) return null;
  return GRADE_TONES[String(value)] || null;
}

// GPA trung binh (vd 3.25): gia tri lien tuc -> to theo khoang.
function gpaBandTone(gpa) {
  if (gpa === '' || gpa == null) return null;
  var value = Number(gpa);
  if (isNaN(value)) return null;
  if (value >= 3.5) return TONES.good;
  if (value >= 2.5) return TONES.info;
  if (value >= 1) return TONES.warn;
  return TONES.bad;
}

function noteTone(note) {
  if (note === 'Cải thiện') return TONES.good;
  if (note === 'Không tính (đã cải thiện)') return TONES.muted;
  if (note === 'Ngoài thang điểm') return TONES.bad;
  return null;
}

function fitColumns(sheet, count) {
  sheet.autoResizeColumns(1, count);
  for (var c = 1; c <= count; c++) {
    var width = sheet.getColumnWidth(c) + 18;
    if (width > MAX_COLUMN_WIDTH) width = MAX_COLUMN_WIDTH;
    if (width < MIN_COLUMN_WIDTH) width = MIN_COLUMN_WIDTH;
    sheet.setColumnWidth(c, width);
  }
}

function sheetSafeName(studentName, studentId) {
  var suffix = '-' + studentId;
  var namePart = String(studentName || '')
    .normalize('NFC')
    .replace(/[\[\]\*\?\/\\:]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^'+|'+$/g, '')
    .trim()
    .slice(0, MAX_SHEET_NAME_LENGTH - suffix.length)
    .trim();
  return namePart ? namePart + suffix : studentId;
}

function readIndexRows(indexSheet) {
  var lastRow = indexSheet.getLastRow();
  if (lastRow < 2) return [];
  return indexSheet.getRange(2, 1, lastRow - 1, INDEX_HEADERS.length).getDisplayValues();
}

function findStudentSheet(spreadsheet, indexRows, studentId) {
  for (var i = 0; i < indexRows.length; i++) {
    if (String(indexRows[i][1]).trim() !== studentId) continue;
    var storedName = String(indexRows[i][7] || '').trim();
    if (storedName) {
      var byStoredName = spreadsheet.getSheetByName(storedName);
      if (byStoredName) return byStoredName;
    }
    break;
  }
  var suffix = '-' + studentId;
  var sheets = spreadsheet.getSheets();
  for (var j = 0; j < sheets.length; j++) {
    var name = sheets[j].getName();
    if (name === studentId || name.slice(-suffix.length) === suffix) return sheets[j];
  }
  return null;
}

function renameStudentSheet(spreadsheet, sheet, desiredName) {
  if (sheet.getName() === desiredName) return;
  if (spreadsheet.getSheetByName(desiredName)) return;
  sheet.setName(desiredName);
}

function formatTimestamp(spreadsheet, isoText) {
  var date = isoText ? new Date(isoText) : new Date();
  if (isNaN(date.getTime())) date = new Date();
  return Utilities.formatDate(date, spreadsheet.getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function subjectNote(subject) {
  if (subject.gpa4 == null) return 'Ngoài thang điểm';
  if (!subject.counted) return 'Không tính (đã cải thiện)';
  return subject.retake ? 'Cải thiện' : '';
}

function buildStudentValues(record, syncedAtText) {
  var summary = record.summary || {};
  var before = summary.beforeImprovement || {};
  var semesters = record.semesters || [];
  var delta = (Number(summary.gpa4) || 0) - (Number(before.gpa4) || 0);

  var rows = [];
  rows.push(['HỌ TÊN', safeSheetText(record.student.name)]);
  rows.push(['MSSV', record.student.id]);
  rows.push(['NGUỒN', safeSheetText(record.source || 'BKEL')]);
  rows.push(['ĐỒNG BỘ LÚC', syncedAtText]);
  rows.push([]);
  rows.push(SUMMARY_HEADERS.slice());
  rows.push([
    summary.gpa4,
    summary.gpa10,
    summary.totalCredits,
    summary.semesterCount != null ? summary.semesterCount : semesters.length,
    before.gpa4,
    Math.round((delta + Number.EPSILON) * 100) / 100,
  ]);
  rows.push([]);
  rows.push(SUBJECT_HEADERS.slice());

  var summaryRowIndexes = [];
  for (var i = 0; i < semesters.length; i++) {
    var semester = semesters[i];
    var semesterName = safeSheetText(semester.name);
    var subjects = semester.subjects || [];
    for (var j = 0; j < subjects.length; j++) {
      var subject = subjects[j];
      rows.push([
        semesterName,
        j + 1,
        safeSheetText(subject.name),
        subject.credits,
        subject.grade10,
        safeSheetText(subject.letter),
        subject.gpa4,
        subjectNote(subject),
      ]);
    }
    summaryRowIndexes.push(rows.length + 1);
    rows.push([
      '▸ ' + String(semester.name) + ' — Tổng kết',
      '',
      '',
      semester.totalCredits,
      semester.gpa10,
      '',
      semester.gpa4,
      '',
    ]);
  }

  var width = SUBJECT_HEADERS.length;
  for (var k = 0; k < rows.length; k++) {
    while (rows[k].length < width) rows[k].push('');
  }
  return { rows: rows, summaryRowIndexes: summaryRowIndexes };
}

function styleStudentBody(sheet, rows, summaryRowIndexes, width) {
  var bodyStart = TABLE_HEADER_ROW + 1;
  var bodyCount = rows.length - TABLE_HEADER_ROW;
  if (bodyCount < 1) return;

  var isSummaryRow = {};
  for (var s = 0; s < summaryRowIndexes.length; s++) isSummaryRow[summaryRowIndexes[s]] = true;

  var backgrounds = [];
  var fontColors = [];
  var fontWeights = [];
  for (var r = bodyStart; r < bodyStart + bodyCount; r++) {
    if (isSummaryRow[r]) {
      backgrounds.push(repeat(PALETTE.primaryLight, width));
      fontColors.push(repeat(PALETTE.primaryDark, width));
      fontWeights.push(repeat('bold', width));
      continue;
    }
    var rowValues = rows[r - 1];
    var background = repeat((r - bodyStart) % 2 === 0 ? PALETTE.white : PALETTE.band, width);
    var fontColor = repeat(PALETTE.text, width);
    var fontWeight = repeat('normal', width);

    var tone = gradeTone(rowValues[6]);
    if (tone) {
      background[5] = tone.bg;
      fontColor[5] = tone.fg;
      fontWeight[5] = 'bold';
      background[6] = tone.bg;
      fontColor[6] = tone.fg;
      fontWeight[6] = 'bold';
    }
    var note = noteTone(rowValues[7]);
    if (note) {
      background[7] = note.bg;
      fontColor[7] = note.fg;
    }
    backgrounds.push(background);
    fontColors.push(fontColor);
    fontWeights.push(fontWeight);
  }

  sheet.getRange(bodyStart, 1, bodyCount, width)
    .setBackgrounds(backgrounds)
    .setFontColors(fontColors)
    .setFontWeights(fontWeights);
  sheet.getRange(bodyStart, 2, bodyCount, 1).setHorizontalAlignment('center');
  sheet.getRange(bodyStart, 4, bodyCount, 1).setNumberFormat('0.##').setHorizontalAlignment('center');
  sheet.getRange(bodyStart, 5, bodyCount, 1).setNumberFormat('0.##').setHorizontalAlignment('center');
  sheet.getRange(bodyStart, 6, bodyCount, 1).setHorizontalAlignment('center');
  sheet.getRange(bodyStart, 7, bodyCount, 1).setNumberFormat('0.00').setHorizontalAlignment('center');
  sheet.getRange(TABLE_HEADER_ROW, 1, bodyCount + 1, width)
    .setBorder(true, true, true, true, true, true, PALETTE.border, SpreadsheetApp.BorderStyle.SOLID);
}

function writeStudentSheet(sheet, record, syncedAtText) {
  var built = buildStudentValues(record, syncedAtText);
  var rows = built.rows;
  var width = SUBJECT_HEADERS.length;

  sheet.clear();
  var maxRows = sheet.getMaxRows();
  if (maxRows < rows.length) sheet.insertRowsAfter(maxRows, rows.length - maxRows);
  var maxColumns = sheet.getMaxColumns();
  if (maxColumns < width) sheet.insertColumnsAfter(maxColumns, width - maxColumns);

  sheet.getRange(1, 1, rows.length, width)
    .setValues(rows)
    .setFontSize(10)
    .setVerticalAlignment('middle');
  sheet.getRange(2, 2).setNumberFormat('@').setValue(record.student.id);

  sheet.getRange(1, 1, 4, 1)
    .setBackground(PALETTE.primaryLight)
    .setFontColor(PALETTE.primaryDark)
    .setFontWeight('bold');
  sheet.getRange(1, 2, 4, 1)
    .setFontWeight('bold')
    .setFontColor(PALETTE.text);

  sheet.getRange(6, 1, 1, SUMMARY_HEADERS.length)
    .setBackground(PALETTE.primary)
    .setFontColor(PALETTE.white)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  sheet.getRange(7, 1, 1, SUMMARY_HEADERS.length)
    .setBackground(PALETTE.primaryLight)
    .setFontColor(PALETTE.primaryDark)
    .setFontWeight('bold')
    .setFontSize(12)
    .setHorizontalAlignment('center')
    .setNumberFormats([['0.00', '0.00', '0.##', '0', '0.00', '+0.00;-0.00;0.00']]);

  sheet.getRange(TABLE_HEADER_ROW, 1, 1, width)
    .setBackground(PALETTE.headerDark)
    .setFontColor(PALETTE.white)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  styleStudentBody(sheet, rows, built.summaryRowIndexes, width);

  sheet.setFrozenRows(TABLE_HEADER_ROW);
  sheet.setTabColor(PALETTE.primary);
  fitColumns(sheet, width);
}

function upsertIndexRow(spreadsheet, indexSheet, indexRows, record, studentSheet, syncedAtText) {
  var summary = record.summary || {};
  var studentId = record.student.id;
  var targetRow = -1;
  for (var i = 0; i < indexRows.length; i++) {
    if (String(indexRows[i][1]).trim() === studentId) {
      targetRow = i + 2;
      break;
    }
  }
  var action = targetRow === -1 ? 'created' : 'updated';
  if (targetRow === -1) targetRow = Math.max(indexSheet.getLastRow() + 1, 2);

  indexSheet.getRange(targetRow, 2).setNumberFormat('@');
  indexSheet.getRange(targetRow, 1, 1, INDEX_HEADERS.length - 1).setValues([[
    safeSheetText(record.student.name),
    studentId,
    summary.gpa4,
    summary.gpa10,
    summary.totalCredits,
    summary.semesterCount != null ? summary.semesterCount : (record.semesters || []).length,
    syncedAtText,
  ]]);

  indexSheet.getRange(targetRow, 1, 1, INDEX_HEADERS.length)
    .setBackground(targetRow % 2 === 0 ? PALETTE.white : PALETTE.band)
    .setFontColor(PALETTE.text)
    .setFontSize(10)
    .setVerticalAlignment('middle')
    .setBorder(true, true, true, true, true, true, PALETTE.border, SpreadsheetApp.BorderStyle.SOLID);
  indexSheet.getRange(targetRow, 1).setFontWeight('bold');
  indexSheet.getRange(targetRow, 3).setNumberFormat('0.00');
  indexSheet.getRange(targetRow, 4).setNumberFormat('0.00');
  indexSheet.getRange(targetRow, 5).setNumberFormat('0.##');
  indexSheet.getRange(targetRow, 6).setNumberFormat('0');
  indexSheet.getRange(targetRow, 2, 1, 6).setHorizontalAlignment('center');

  var tone = gpaBandTone(summary.gpa4);
  if (tone) {
    indexSheet.getRange(targetRow, 3)
      .setBackground(tone.bg)
      .setFontColor(tone.fg)
      .setFontWeight('bold');
  }

  var link = spreadsheet.getUrl() + '#gid=' + studentSheet.getSheetId();
  indexSheet.getRange(targetRow, INDEX_HEADERS.length).setRichTextValue(
    SpreadsheetApp.newRichTextValue()
      .setText(studentSheet.getName())
      .setLinkUrl(link)
      .build()
  );

  fitColumns(indexSheet, INDEX_HEADERS.length);
  return action;
}

function doPost(event) {
  var lock = LockService.getScriptLock();
  try {
    var properties = PropertiesService.getScriptProperties();
    var spreadsheetId = properties.getProperty('SPREADSHEET_ID');
    var indexSheetName = properties.getProperty('INDEX_SHEET_NAME');
    var apiSecret = properties.getProperty('API_SECRET');
    if (!spreadsheetId || !indexSheetName || !apiSecret) {
      throw new Error('Apps Script chưa đủ Script Properties.');
    }

    var input = JSON.parse(event.postData.contents);
    if (!secureEqual(input.secret, apiSecret)) return jsonResponse({ ok: false, error: 'Unauthorized' });
    if (!input.record || !input.record.student) throw new Error('Bản ghi không hợp lệ.');

    var record = input.record;
    var studentName = String(record.student.name || '').normalize('NFC').trim().replace(/\s+/g, ' ');
    var studentId = String(record.student.id || '').trim();
    if (!studentName || !/^\d{7,12}$/.test(studentId)) throw new Error('Danh tính sinh viên không hợp lệ.');
    record.student.name = studentName;
    record.student.id = studentId;

    lock.waitLock(30000);
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var indexSheet = spreadsheet.getSheetByName(indexSheetName);
    if (!indexSheet) indexSheet = spreadsheet.insertSheet(indexSheetName, 0);
    indexSheet.getRange(1, 1, 1, INDEX_HEADERS.length)
      .setValues([INDEX_HEADERS])
      .setBackground(PALETTE.primaryDark)
      .setFontColor(PALETTE.white)
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    indexSheet.setFrozenRows(1);
    indexSheet.setTabColor(PALETTE.primaryDark);

    var indexRows = readIndexRows(indexSheet);
    var desiredName = sheetSafeName(studentName, studentId);
    var studentSheet = findStudentSheet(spreadsheet, indexRows, studentId);
    if (studentSheet) {
      renameStudentSheet(spreadsheet, studentSheet, desiredName);
    } else {
      studentSheet = spreadsheet.insertSheet(desiredName);
    }

    var syncedAtText = formatTimestamp(spreadsheet, record.syncedAt);
    writeStudentSheet(studentSheet, record, syncedAtText);
    var action = upsertIndexRow(spreadsheet, indexSheet, indexRows, record, studentSheet, syncedAtText);
    SpreadsheetApp.flush();
    return jsonResponse({ ok: true, action: action, sheetName: studentSheet.getName() });
  } catch (error) {
    return jsonResponse({ ok: false, error: error && error.message ? error.message : 'Unknown error' });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}
