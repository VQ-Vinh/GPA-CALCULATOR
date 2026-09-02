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

test('giải thích phân biệt GPA dự kiến với GPA bắt buộc và GPA tốt nghiệp tổng', () => {
  const context = frontendContext(['js/constants.js', 'js/calc.js', 'js/render.js']);
  context.inputData = {
    semesters: [{ name: 'HK1', subjects: [{ name: 'Môn B+', credits: '110', grade10: '8' }] }],
  };
  vm.runInContext('data = inputData', context);

  const goal = "parseGoalInputs('133', '3.6', '3.5')";
  const hint = vm.runInContext(`goalExpectedHint(${goal}, calcCumulative())`, context);
  const result = vm.runInContext("renderGoalResult(calcCumulative(), parseGoalInputs('133', '3.5', '3.5'))", context);
  const scenarios = vm.runInContext('renderImprovementOptions(3.6, 133, 3.5)', context);

  assert.match(hint, /23 tín chỉ chưa học/);
  assert.match(hint, /không phải GPA bắt buộc/);
  assert.match(result, /Nếu không học cải thiện/);
  assert.match(scenarios, /Mỗi kết quả là GPA tốt nghiệp tổng/);
});

test('template giữ nhãn truy cập và trạng thái accordion', () => {
  const page = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const render = fs.readFileSync(new URL('../js/render.js', import.meta.url), 'utf8');

  assert.match(page, /<label class="sr-only" for="import-paste">/);
  assert.match(page, /id="save-status"[^>]+aria-live="polite"/);
  assert.match(page, /id="student-id"[^>]+aria-describedby="student-id-error"/);
  assert.match(render, /class="sem-toggle" aria-expanded="true" aria-controls=/);
  assert.match(render, /setAttribute\('aria-expanded', String\(expanded\)\)/);
  assert.match(render, /aria-label="Tín chỉ của \$\{esc\(subjectLabel\)\}"/);
  assert.match(render, /aria-label="Điểm hệ 10 của \$\{esc\(subjectLabel\)\}"/);
});

test('hardening cung cấp inline feedback, giới hạn rõ và hoàn tác xóa', () => {
  const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

  assert.doesNotMatch(app, /\balert\s*\(/);
  assert.match(app, /function setImportMessage\(/);
  assert.match(app, /Chỉ có thể nhập tay tối đa/);
  assert.match(app, /Mỗi học kỳ chỉ có thể nhập tay tối đa/);
  assert.match(app, /function offerUndo\(/);
  assert.match(app, /actionLabel: 'Hoàn tác'/);
  assert.match(app, /updateSemesterToggleState\(card, expanded\)/);
});

test('mobile adaptation giữ bảng cuộn có nhãn và safe area', () => {
  const page = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const render = fs.readFileSync(new URL('../js/render.js', import.meta.url), 'utf8');
  const style = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

  assert.match(page, /viewport-fit=cover/);
  assert.equal((render.match(/class="table-scroll" tabindex="0" role="region"/g) || []).length, 3);
  assert.match(style, /env\(safe-area-inset-bottom\)/);
  assert.match(style, /\.sem-header \{ display: grid; grid-template-columns: 44px minmax\(0, 1fr\); \}/);
  assert.match(style, /input\[type="text"\], input\[type="number"\], textarea \{ font-size: 16px; \}/);
});

test('biểu đồ tăng chiều rộng theo số học kỳ thay vì ép nhãn trên mobile', () => {
  const context = frontendContext(['js/constants.js', 'js/calc.js', 'js/render.js']);
  context.inputData = {
    semesters: Array.from({ length: 24 }, (_, index) => ({
      name: `HK${index + 1} (2024 - 2025)`,
      subjects: [{ name: `Môn ${index + 1}`, credits: '3', grade10: '8' }],
    })),
  };
  vm.runInContext('data = inputData', context);
  const chart = vm.runInContext('renderGPATrendChart()', context);

  assert.match(chart, /class="chart-scroll"/);
  assert.match(chart, /--chart-min-width:1728px/);
  assert.match(chart, /có thể cuộn ngang/);
});

test('editor nhập tay chỉ mở sẵn khi đã có dữ liệu', () => {
  const context = frontendContext(['js/render.js']);
  context.emptyData = {
    studentName: '',
    studentId: '',
    semesters: [{ name: 'Học kỳ 1', subjects: [{ name: '', credits: '', grade10: '' }] }],
  };
  context.existingData = {
    studentName: '',
    studentId: '',
    semesters: [{ name: 'Học kỳ 1', subjects: [{ name: 'Toán', credits: '3', grade10: '8' }] }],
  };

  vm.runInContext('data = emptyData', context);
  assert.equal(vm.runInContext('hasManualEntryData()', context), false);
  vm.runInContext('data = existingData', context);
  assert.equal(vm.runInContext('hasManualEntryData()', context), true);
});

test('phương án rút gọn không lặp tên profile', () => {
  const context = frontendContext(['js/constants.js', 'js/calc.js', 'js/render.js']);
  context.inputData = {
    semesters: [{ name: 'HK1', subjects: [{ name: 'Môn D', credits: '3', grade10: '4' }] }],
  };
  vm.runInContext('data = inputData', context);
  const html = vm.runInContext('renderImprovementOptions(3, 6, 3)', context);

  assert.match(html, /Phương án 1/);
  assert.match(html, /Cải thiện .*TC lên A/);
  assert.doesNotMatch(html, /Nâng lên A/);
});

test('nhập môn chỉ cập nhật đúng bản ghi thay vì quét lại toàn bộ DOM', () => {
  const context = frontendContext(['js/data.js']);
  context.inputData = {
    semesters: [
      { name: 'HK1', subjects: [{ name: 'Toán', credits: '3', grade10: '7' }] },
      { name: 'HK2', subjects: [{ name: 'Lý', credits: '4', grade10: '8' }] },
    ],
  };
  context.card = { dataset: { semIndex: '1' } };
  context.row = { dataset: { subjectIndex: '0' } };
  context.target = {
    value: '9',
    classList: { contains: name => name === 'sub-grade10' },
    closest: selector => selector === 'tr' ? context.row : null,
  };
  vm.runInContext('data = inputData; collectSemesterInput(target, card)', context);

  assert.equal(context.inputData.semesters[0].subjects[0].grade10, '7');
  assert.equal(context.inputData.semesters[1].subjects[0].grade10, '9');

  const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const handler = app.slice(
    app.indexOf("document.getElementById('semesters-container').addEventListener('input'"),
    app.indexOf("document.getElementById('semesters-container').addEventListener('click'"),
  );
  assert.match(handler, /collectSemesterInput\(target, card\)/);
  assert.doesNotMatch(handler, /collectData\(\)/);
});

test('ghi localStorage được gom lại và flush ngay khi cần', async () => {
  let writes = 0;
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    localStorage: {
      setItem() { writes += 1; },
      getItem() { return null; },
    },
    document: { getElementById() { return null; } },
  });
  vm.runInContext(fs.readFileSync(new URL('../js/data.js', import.meta.url), 'utf8'), context);

  vm.runInContext('scheduleDataSave(10); scheduleDataSave(10); scheduleDataSave(10)', context);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(writes, 1);

  vm.runInContext('scheduleDataSave(100); flushDataSave()', context);
  assert.equal(writes, 2);
  await new Promise(resolve => setTimeout(resolve, 120));
  assert.equal(writes, 2);
});

test('polish đồng bộ browser surface, focus và icon CSS', () => {
  const page = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const render = fs.readFileSync(new URL('../js/render.js', import.meta.url), 'utf8');
  const style = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

  assert.match(page, /name="theme-color" content="#f3f6fc"/);
  assert.match(style, /::selection/);
  assert.match(style, /caret-color: var\(--accent\)/);
  assert.match(style, /font-variant-numeric: tabular-nums/);
  assert.match(style, /\.row-delete:focus-visible/);
  assert.match(style, /\.sem-toggle::before/);
  assert.doesNotMatch(render, />[▾✕]<\/button>/);
});

test('hardening giữ tên accordion đồng bộ và chữ phụ trên nền tint đủ tương phản', () => {
  const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const style = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  const luminance = (hex) => {
    const channels = hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const contrast = (foreground, background) => {
    const first = luminance(foreground);
    const second = luminance(background);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  };

  assert.match(app, /target\.classList\.contains\('sem-name'\)[\s\S]+updateSemesterToggleState\(card/);
  assert.match(style, /--muted-on-tint: #475569/);
  assert.ok(contrast('#475569', '#eef2ff') >= 4.5);
  assert.ok(contrast('#475569', '#f0f9ff') >= 4.5);
});

test('Turnstile chỉ tải một lần khi đồng bộ và có timeout phục hồi', async () => {
  const page = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const scripts = [];
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    TURNSTILE_SITE_KEY: 'site-key',
    flushDataSave() {},
    window: { addEventListener() {} },
    document: {
      addEventListener() {},
      createElement() { return { remove() {} }; },
      head: { appendChild(script) { scripts.push(script); } },
    },
  });
  vm.runInContext(app, context);

  assert.doesNotMatch(page, /challenges\.cloudflare\.com\/turnstile/);
  assert.match(app, /function ensureTurnstileLoaded\(/);
  assert.match(app, /await ensureTurnstileLoaded\(\)/);
  assert.match(app, /script\.src = 'https:\/\/challenges\.cloudflare\.com\/turnstile/);
  assert.match(app, /Tải bộ xác thực quá thời gian/);

  const firstLoad = vm.runInContext('ensureTurnstileLoaded()', context);
  assert.equal(scripts.length, 1);
  context.window.turnstile = { render() { return 1; } };
  vm.runInContext('window.onTurnstileLoaded()', context);
  await firstLoad;
  await vm.runInContext('ensureTurnstileLoaded()', context);
  assert.equal(scripts.length, 1);
});

test('colorize giữ màu giao diện trong token, ngoại trừ thang màu điểm', () => {
  const style = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  const rulesAfterTokens = style.slice(style.indexOf('/* ---------- shell ---------- */'));
  const withoutGradeScale = rulesAfterTokens.replace(/\.g-4[\s\S]+?\.g-0[^\n]+/m, '');

  assert.doesNotMatch(withoutGradeScale, /#[0-9a-fA-F]{3,8}(?![\w-])|rgba\(/);
  assert.match(style, /--shadow-panel:/);
  assert.match(style, /--accent-surface:/);
});
