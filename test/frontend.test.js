import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function frontendContext(files) {
  const context = vm.createContext({ console });
  for (const file of files) {
    vm.runInContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context, { filename: file });
  }
  return context;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('parseBKEL đọc danh tính, lọc môn và đảo học kỳ về cũ đến mới', () => {
  const context = frontendContext(['js/constants.js', 'js/parser.js']);
  const input = [
    'Họ và tên: Nguyễn Văn A',
    'Mã sinh viên: 2313936',
    'Năm học 2024 - 2025 / Học kỳ 2',
    '1\tMT01\tToán 2\t8.5\tA\t3',
    '2\tXX01\tKhông tính\t9\tA+\t3\t\tKhông tính TCTL',
    'Năm học 2024 - 2025 / Học kỳ 1',
    '1\tMT00\tToán 1\t7\tB\t3',
    '2\tGDTC\tGiáo dục thể chất\t8\tRT\t1',
    '3\tZERO\tSinh hoạt\t10\tA+\t0',
  ].join('\n');
  context.input = input;
  const result = plain(vm.runInContext('parseBKEL(input)', context));

  assert.equal(result.studentName, 'Nguyễn Văn A');
  assert.equal(result.studentId, '2313936');
  assert.deepEqual(result.semesters.map(semester => semester.name), ['HK1 (2024 - 2025)', 'HK2 (2024 - 2025)']);
  assert.deepEqual(result.semesters.map(semester => semester.subjects.map(subject => subject.name)), [['Toán 1'], ['Toán 2']]);
});

test('giới hạn import chấp nhận đúng biên và từ chối dữ liệu vượt biên', () => {
  const context = frontendContext(['js/constants.js', 'js/parser.js']);
  const makeResult = (semesterCount, subjectCount) => ({
    semesters: Array.from({ length: semesterCount }, (_, index) => ({
      name: `HK ${index + 1}`,
      subjects: Array.from({ length: subjectCount }, () => ({ name: 'Môn' })),
    })),
  });

  context.atLimit = makeResult(24, 50);
  context.tooManySemesters = makeResult(25, 1);
  context.tooManySubjects = makeResult(1, 51);

  assert.equal(vm.runInContext('validateImportLimits(atLimit)', context), '');
  assert.match(vm.runInContext('validateImportLimits(tooManySemesters)', context), /25 học kỳ/);
  assert.match(vm.runInContext('validateImportLimits(tooManySubjects)', context), /51 môn/);
});

test('thang điểm và GPA tích lũy dùng điểm cao nhất, baseline dùng lần đầu', () => {
  const context = frontendContext(['js/constants.js', 'js/calc.js']);
  const boundaryGrades = plain(vm.runInContext("['9.5', '9.4', '8.0', '7.9', '6.5', '5.5', '5.0', '4.0', '3.9'].map(value => findGrade(value))", context));
  assert.deepEqual(boundaryGrades.map(grade => grade.letter), ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F']);

  context.inputData = {
    semesters: [
      { name: 'HK1', subjects: [{ name: 'Toán', credits: '3', grade10: '5' }] },
      { name: 'HK2', subjects: [{ name: ' toán ', credits: '3', grade10: '8' }] },
    ],
  };
  vm.runInContext('data = inputData', context);
  const cumulative = plain(vm.runInContext('calcCumulative()', context));
  const original = plain(vm.runInContext('calcCumulativeOriginal()', context));

  assert.deepEqual(cumulative, { totalCredits: 3, gpa10: 8, gpa4: 3.5 });
  assert.deepEqual(original, { totalCredits: 3, gpa10: 5, gpa4: 1.5 });
});

test('loadData bổ sung GPA dự kiến mặc định cho dữ liệu cũ', () => {
  const saved = JSON.stringify({
    studentName: 'Nguyễn Văn A',
    studentId: '2313936',
    targetGpa: '3.2',
    gradRequiredCredits: 130,
    semesters: [{ name: 'HK1', subjects: [{ name: 'Toán', credits: '3', grade10: '8' }] }],
  });
  const context = vm.createContext({
    localStorage: { getItem: () => saved },
    setTimeout,
    clearTimeout,
  });
  vm.runInContext(fs.readFileSync(new URL('../js/data.js', import.meta.url), 'utf8'), context);
  const migrated = plain(vm.runInContext('loadData(); data', context));
  assert.equal(migrated.expectedRemainingGpa, '3');
});

test('tạo đủ phương án A, B+ và phối hợp từ các môn đang được tính', () => {
  const context = frontendContext(['js/constants.js', 'js/calc.js']);
  context.inputData = {
    semesters: [{
      name: 'HK1',
      subjects: [
        { name: 'Môn F', credits: '3', grade10: '3' },
        { name: 'Môn D', credits: '3', grade10: '4' },
        { name: 'Môn C', credits: '3', grade10: '5.5' },
        { name: 'Môn B', credits: '3', grade10: '7' },
      ],
    }],
  };
  vm.runInContext('data = inputData', context);
  const result = plain(vm.runInContext('calculateImprovementScenarios(3, 12, 3)', context));

  assert.equal(result.status, 'scenarios');
  assert.deepEqual(result.scenarios.map(scenario => scenario.label), ['Nâng lên A', 'Nâng lên B+', 'Phối hợp A và B+']);
  assert.ok(result.scenarios.every(scenario => scenario.projectedGpa >= 3));
  assert.ok(result.scenarios.find(scenario => scenario.label === 'Nâng lên B+').selections.every(item => item.currentGpa4 < 3.5));
  const mixed = result.scenarios.find(scenario => scenario.label === 'Phối hợp A và B+');
  assert.deepEqual(mixed.selections.map(item => item.targetLetter), ['A', 'B+']);
  assert.equal(mixed.aCredits + mixed.bPlusCredits, mixed.totalCredits);
  assert.equal(result.scenarios.find(scenario => scenario.label === 'Nâng lên A').aCredits, 6);
  assert.equal(result.scenarios.find(scenario => scenario.label === 'Nâng lên B+').bPlusCredits, 6);
});

test('phương án cải thiện chỉ dùng điểm cao nhất và không cộng thêm tín chỉ', () => {
  const context = frontendContext(['js/constants.js', 'js/calc.js']);
  context.inputData = {
    semesters: [
      { name: 'HK1', subjects: [{ name: 'Toán', credits: '3', grade10: '3' }] },
      { name: 'HK2', subjects: [{ name: ' toán ', credits: '3', grade10: '5.5' }] },
    ],
  };
  vm.runInContext('data = inputData', context);
  const result = plain(vm.runInContext('calculateImprovementScenarios(3, 3, 3)', context));
  const scenario = result.scenarios[0];

  assert.equal(scenario.selections.length, 1);
  assert.equal(scenario.selections[0].grade10, 5.5);
  assert.equal(scenario.totalCredits, 3);
  assert.equal(scenario.projectedGpa, 4);
});

test('trả về trạng thái đã đủ, bất khả thi và không tạo phương án phối hợp giả', () => {
  const context = frontendContext(['js/constants.js', 'js/calc.js']);
  context.enoughData = { semesters: [{ name: 'HK1', subjects: [{ name: 'Môn B', credits: '3', grade10: '7' }] }] };
  vm.runInContext('data = enoughData', context);
  const enough = plain(vm.runInContext('calculateImprovementScenarios(3, 6, 3)', context));
  assert.equal(enough.status, 'enough');

  context.impossibleData = { semesters: [{ name: 'HK1', subjects: [{ name: 'Môn F', credits: '3', grade10: '3' }] }] };
  vm.runInContext('data = impossibleData', context);
  const impossible = plain(vm.runInContext('calculateImprovementScenarios(1, 100, 0)', context));
  assert.equal(impossible.status, 'impossible');
  assert.equal(impossible.maxGpa, 0.12);

  const limited = plain(vm.runInContext('calculateImprovementScenarios(3, 3, 0)', context));
  assert.ok(limited.scenarios.length <= 2);
  assert.ok(limited.scenarios.every(scenario => scenario.label !== 'Phối hợp A và B+'));
});

test('mục tiêu 3.60 với 23 tín chỉ còn lại chỉ trả phương án có GPA tổng từ 3.60', () => {
  const context = frontendContext(['js/constants.js', 'js/calc.js', 'js/render.js']);
  context.inputData = {
    semesters: [{
      name: 'HK1',
      subjects: Array.from({ length: 22 }, (_, index) => ({
        name: `Môn B+ ${index + 1}`,
        credits: '5',
        grade10: '8',
      })),
    }],
  };
  vm.runInContext('data = inputData', context);
  const result = plain(vm.runInContext('calculateImprovementScenarios(3.6, 133, 3.5)', context));

  assert.equal(result.currentCredits, 110);
  assert.equal(result.remainingCredits, 23);
  assert.equal(result.status, 'scenarios');
  assert.ok(result.scenarios.length > 0);
  assert.ok(result.scenarios.every(scenario => scenario.projectedGpa >= 3.6));
  const label = vm.runInContext("goalRemainingLabel(parseGoalInputs('133', '3.6', '3.5'), calcCumulative())", context);
  assert.equal(label, 'GPA dự kiến (23 tín) còn lại');

  const html = vm.runInContext('renderImprovementOptions(3.6, 133, 3.5)', context);
  assert.doesNotMatch(html, /<ul>|Môn B\+/);
  assert.match(html, /TC lên A/);
  assert.match(html, /GPA tốt nghiệp tổng dự kiến/);
});

test('kiểm tra trực tiếp ba giá trị mục tiêu đang nhập', () => {
  const context = frontendContext(['js/constants.js', 'js/calc.js', 'js/render.js']);
  context.goal = vm.runInContext("parseGoalInputs('133', '3.6', '3.5')", context);
  const valid = plain(context.goal);
  assert.equal(valid.requiredCredits, 133);
  assert.equal(valid.targetGpa, 3.6);
  assert.equal(valid.expectedRemainingGpa, 3.5);
  assert.equal(valid.requiredValid && valid.targetValid && valid.expectedValid, true);

  const invalid = plain(vm.runInContext("parseGoalInputs('301', '4.1', '')", context));
  assert.equal(invalid.requiredValid, false);
  assert.equal(invalid.targetValid, false);
  assert.equal(invalid.expectedValid, false);
  assert.equal(vm.runInContext("goalRemainingLabel(parseGoalInputs('301', '3.6', '3.5'), { totalCredits: 110 })", context), 'GPA dự kiến (- tín) còn lại');
});
