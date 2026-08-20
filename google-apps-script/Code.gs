var INDEX_HEADERS = ['HỌ TÊN', 'MSSV', 'GPA HỆ 4', 'GPA HỆ 10', 'TỔNG TC', 'SỐ HỌC KỲ', 'ĐỒNG BỘ LÚC', 'TRANG TÍNH'];
var SUBJECT_HEADERS = ['HỌC KỲ', 'STT', 'TÊN MÔN HỌC', 'TÍN CHỈ', 'ĐIỂM 10', 'ĐIỂM CHỮ', 'HỆ 4', 'GHI CHÚ'];
var SUMMARY_HEADERS = ['GPA HỆ 4', 'GPA HỆ 10', 'TỔNG TC', 'SỐ HỌC KỲ', 'GPA4 TRƯỚC CẢI THIỆN', 'MỨC TĂNG'];
var TABLE_HEADER_ROW = 9;
var MAX_SHEET_NAME_LENGTH = 100;

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

function writeStudentSheet(sheet, record, syncedAtText) {
  var built = buildStudentValues(record, syncedAtText);
  var rows = built.rows;

  sheet.clear();
  var maxRows = sheet.getMaxRows();
  if (maxRows < rows.length) sheet.insertRowsAfter(maxRows, rows.length - maxRows);
  var maxColumns = sheet.getMaxColumns();
  if (maxColumns < SUBJECT_HEADERS.length) sheet.insertColumnsAfter(maxColumns, SUBJECT_HEADERS.length - maxColumns);

  sheet.getRange(1, 1, rows.length, SUBJECT_HEADERS.length).setValues(rows);
  sheet.getRange(2, 2).setNumberFormat('@').setValue(record.student.id);

  sheet.getRange(1, 1, 4, 1).setFontWeight('bold');
  sheet.getRange(6, 1, 1, SUMMARY_HEADERS.length).setFontWeight('bold').setBackground('#e0e7ff');
  sheet.getRange(7, 1, 1, SUMMARY_HEADERS.length).setFontWeight('bold');
  sheet.getRange(TABLE_HEADER_ROW, 1, 1, SUBJECT_HEADERS.length).setFontWeight('bold').setBackground('#e2e8f0');

  for (var i = 0; i < built.summaryRowIndexes.length; i++) {
    sheet.getRange(built.summaryRowIndexes[i], 1, 1, SUBJECT_HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#f1f5f9');
  }

  sheet.setFrozenRows(TABLE_HEADER_ROW);
  sheet.autoResizeColumns(1, SUBJECT_HEADERS.length);
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

  var link = spreadsheet.getUrl() + '#gid=' + studentSheet.getSheetId();
  indexSheet.getRange(targetRow, INDEX_HEADERS.length).setRichTextValue(
    SpreadsheetApp.newRichTextValue()
      .setText(studentSheet.getName())
      .setLinkUrl(link)
      .build()
  );

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
    indexSheet.getRange(1, 1, 1, INDEX_HEADERS.length).setValues([INDEX_HEADERS]).setFontWeight('bold');
    indexSheet.setFrozenRows(1);

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
