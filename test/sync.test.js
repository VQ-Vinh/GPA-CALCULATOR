import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {
  HCMUT_SCALE,
  MAX_SEMESTERS,
  MAX_SUBJECTS,
  calculateRecord,
  sanitizeSemesters,
} from '../functions/api/sync.js';

function makeSemesters(semesterCount, subjectCount) {
  return Array.from({ length: semesterCount }, (_, semesterIndex) => ({
    name: `HK ${semesterIndex + 1}`,
    subjects: Array.from({ length: subjectCount }, (_, subjectIndex) => ({
      name: `Môn ${semesterIndex + 1}-${subjectIndex + 1}`,
      credits: 3,
      grade10: 8,
    })),
  }));
}

test('API chấp nhận đúng giới hạn 24 học kỳ và 50 môn', () => {
  assert.equal(MAX_SEMESTERS, 24);
  assert.equal(MAX_SUBJECTS, 50);
  assert.equal(sanitizeSemesters(makeSemesters(24, 50)).length, 24);
  assert.throws(() => sanitizeSemesters(makeSemesters(25, 1)), /Số học kỳ/);
  assert.throws(() => sanitizeSemesters(makeSemesters(1, 51)), /Số môn/);
});

test('record đồng bộ đánh dấu cải thiện và chỉ tính lần có điểm cao nhất', () => {
  const semesters = [
    { name: 'HK1', subjects: [{ name: 'Toán', credits: 3, grade10: 5 }] },
    { name: 'HK2', subjects: [{ name: ' toán ', credits: 3, grade10: 8 }] },
  ];
  const record = calculateRecord('Nguyễn Văn A', '2313936', semesters);

  assert.equal(record.schemaVersion, 2);
  assert.equal(record.semesters[0].subjects[0].counted, false);
  assert.equal(record.semesters[0].subjects[0].retake, false);
  assert.equal(record.semesters[1].subjects[0].counted, true);
  assert.equal(record.semesters[1].subjects[0].retake, true);
  assert.deepEqual(record.summary, {
    totalCredits: 3,
    gpa10: 8,
    gpa4: 3.5,
    semesterCount: 2,
    beforeImprovement: { totalCredits: 3, gpa10: 5, gpa4: 1.5 },
  });
  assert.deepEqual(record.scaleUsed, HCMUT_SCALE);
});

test('thang điểm frontend và server luôn trùng nhau', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(new URL('../js/constants.js', import.meta.url), 'utf8'), context);
  const frontendScale = JSON.parse(vm.runInContext('JSON.stringify(HCMUT_SCALE)', context));
  assert.deepEqual(frontendScale, HCMUT_SCALE);
});
