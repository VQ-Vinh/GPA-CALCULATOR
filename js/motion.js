(() => {
  const reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const canAnimate = () => !(reduceQuery && reduceQuery.matches) && typeof Element.prototype.animate === 'function';
  const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const EASE_IN = 'cubic-bezier(0.4, 0, 1, 1)';

  function play(el, keyframes, options) {
    if (!el || !canAnimate()) return null;
    return el.animate(keyframes, { easing: EASE_OUT, ...options });
  }

  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
      let order = 0;
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        revealObserver.unobserve(el);
        el.classList.remove('fx-pending');
        play(el, [
          { opacity: 0, transform: 'translateY(16px)' },
          { opacity: 1, transform: 'none' },
        ], { duration: 460, delay: order * 60, fill: 'backwards' });
        if (el.classList.contains('insight-chart')) drawChart(el, order * 60 + 120);
        order += 1;
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    : null;

  function reveal(elements, skipVisible = false) {
    if (!revealObserver || !canAnimate()) return;
    const fold = window.innerHeight;
    elements.forEach(el => {
      if (skipVisible && el.getBoundingClientRect().top < fold) {
        if (el.classList.contains('insight-chart')) drawChart(el, 150);
        return;
      }
      el.classList.add('fx-pending');
      revealObserver.observe(el);
    });
  }

  function drawChart(scope, delay = 0) {
    const drawMs = 1100;
    play(scope.querySelector('.chart'), [
      { clipPath: 'inset(-2% 100% -2% 0)' },
      { clipPath: 'inset(-2% 0% -2% 0)' },
    ], { duration: drawMs, delay, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'backwards' });
    scope.querySelectorAll('.chart-band').forEach((band, i) => {
      play(band, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: delay + i * 70, fill: 'backwards' });
    });
    const dots4 = [...scope.querySelectorAll('.chart-dot-4')];
    const dots10 = [...scope.querySelectorAll('.chart-dot-10')];
    const count = Math.max(1, dots4.length - 1);
    [...dots10, ...dots4].forEach(dot => {
      const i = Number(dot.dataset.i) || 0;
      play(dot, [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(0)' },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1.4)', offset: 0.6 },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
      ], { duration: 380, delay: delay + (i / count) * drawMs * 0.92, fill: 'backwards' });
    });
    scope.querySelectorAll('.chart-ref').forEach((ref, i) => {
      play(ref, [{ opacity: 0, transform: 'scaleX(0.6)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: delay + drawMs + i * 120, fill: 'backwards' });
    });
    play(scope.querySelector('.chart-last'), [
      { opacity: 0, transform: 'scale(0.8)' },
      { opacity: 1, transform: 'none' },
    ], { duration: 420, delay: delay + drawMs, fill: 'backwards' });
    scope.querySelectorAll('.chart-stat').forEach((stat, i) => {
      play(stat, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: delay + i * 80, fill: 'backwards' });
    });
  }

  function decimalsOf(text) {
    const part = String(text).split('.')[1];
    return part ? part.length : 0;
  }

  function countUp(el, from, to, finalText) {
    if (!canAnimate() || from === to || !Number.isFinite(from) || !Number.isFinite(to)) {
      el.textContent = finalText;
      return;
    }
    const decimals = decimalsOf(finalText);
    const duration = from === 0 ? 900 : 450;
    const start = performance.now();
    const step = now => {
      if (!el.isConnected) return;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = t < 1 ? (from + (to - from) * eased).toFixed(decimals) : finalText;
      if (t < 1) requestAnimationFrame(step);
    };
    el.textContent = from.toFixed(decimals);
    requestAnimationFrame(step);
  }

  let previousMetrics = [];
  let previousMeters = [];
  let summaryPopulated = false;
  let previousGoalText = '';
  let previousScenarioText = '';

  function onSummaryRendered() {
    const container = document.getElementById('summary-content');
    const metrics = [...container.querySelectorAll('.metric strong')];
    const meters = [...container.querySelectorAll('.metric-meter i')];
    const populated = metrics.length > 0;

    if (!populated) {
      summaryPopulated = false;
      previousMetrics = [];
      previousMeters = [];
      return;
    }

    const firstFill = !summaryPopulated;
    const nextMetrics = metrics.map(el => el.textContent);
    metrics.forEach((el, i) => {
      const finalText = el.textContent;
      const from = firstFill ? 0 : parseFloat(previousMetrics[i]);
      countUp(el, from, parseFloat(finalText), finalText);
    });

    const nextMeters = meters.map(el => el.style.getPropertyValue('--fill'));
    if (canAnimate()) {
      meters.forEach((el, i) => {
        const target = nextMeters[i];
        const from = firstFill ? '0' : (previousMeters[i] || target);
        if (from === target) return;
        el.style.setProperty('--fill', from);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          el.classList.add('fx-meter');
          el.style.setProperty('--fill', target);
        }));
      });
    }

    previousMetrics = nextMetrics;
    previousMeters = nextMeters;

    if (firstFill) {
      summaryPopulated = true;
      reveal([...container.querySelectorAll('.metric, .summary-block')]);
    }
    syncGoalTexts(false);
  }

  function syncGoalTexts(animate) {
    const result = document.getElementById('goal-result-content');
    const scenarios = document.getElementById('goal-scenarios-content');
    const resultText = result ? result.textContent : '';
    const scenarioText = scenarios ? scenarios.textContent : '';
    if (animate) {
      if (result && resultText !== previousGoalText) {
        play(result.firstElementChild, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260 });
      }
      if (scenarios && scenarioText !== previousScenarioText) {
        scenarios.querySelectorAll('.goal-scenario, .goal-scenario-state, .goal-scenario-note').forEach((el, i) => {
          play(el, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: i * 40, fill: 'backwards' });
        });
      }
    }
    previousGoalText = resultText;
    previousScenarioText = scenarioText;
  }

  let semesterSnapshot = [];
  let pendingFocus = false;

  function armFocus() {
    pendingFocus = true;
    setTimeout(() => { pendingFocus = false; }, 0);
  }

  function snapshotSemesters() {
    return [...document.querySelectorAll('#semesters-container .semester-card')]
      .map(card => card.querySelectorAll('tbody tr').length);
  }

  function armCards() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelectorAll('#semesters-container .semester-card').forEach(card => card.classList.add('fx-ready'));
    }));
  }

  function enterHighlight(el) {
    play(el, [
      { opacity: 0, transform: 'translateY(-6px)', backgroundColor: 'var(--accent-soft)' },
      { opacity: 1, transform: 'none', backgroundColor: 'var(--accent-soft)', offset: 0.45 },
      { opacity: 1, transform: 'none' },
    ], { duration: 900 });
  }

  function onSemestersRendered() {
    const next = snapshotSemesters();
    const prev = semesterSnapshot;
    semesterSnapshot = next;
    armCards();

    const cards = document.querySelectorAll('#semesters-container .semester-card');
    let added = null;
    if (next.length === prev.length + 1) {
      const index = next.findIndex((count, i) => prev[i] !== count);
      const card = cards[index === -1 ? next.length - 1 : index];
      if (card) {
        added = card.querySelector('.sub-name');
        play(card, [{ opacity: 0, transform: 'translateY(12px) scale(0.98)' }, { opacity: 1, transform: 'none' }], { duration: 420 });
      }
    } else if (next.length === prev.length) {
      const changed = next.map((count, i) => count - prev[i]);
      const grew = changed.filter(d => d !== 0);
      if (grew.length === 1 && grew[0] === 1) {
        const cardIndex = changed.indexOf(1);
        const rows = cards[cardIndex]?.querySelectorAll('tbody tr') || [];
        const row = rows[rows.length - 1];
        if (row) {
          enterHighlight(row);
          added = row.querySelector('.sub-name');
        }
      }
    }

    if (pendingFocus && added) {
      added.focus({ preventScroll: true });
      added.scrollIntoView({ block: 'nearest', behavior: canAnimate() ? 'smooth' : 'auto' });
    }
    pendingFocus = false;
  }

  const gradeLetters = new WeakMap();

  function onGradeCellChanged(td) {
    const letter = td.textContent;
    if (gradeLetters.get(td) === letter) return;
    gradeLetters.set(td, letter);
    play(td, [
      { transform: 'scale(0.85)', opacity: 0.4 },
      { transform: 'scale(1.08)', opacity: 1, offset: 0.6 },
      { transform: 'scale(1)' },
    ], { duration: 320 });
  }

  function interceptDelete(event) {
    const button = event.target.closest('.delete-subject, .delete-semester');
    if (!button || button.dataset.fxReplay === '1' || !canAnimate()) return;
    const card = button.closest('.semester-card');
    if (!card) return;
    const isSemester = button.classList.contains('delete-semester');
    const target = isSemester ? card : button.closest('tr');
    const siblings = isSemester
      ? document.querySelectorAll('#semesters-container .semester-card').length
      : target.parentElement.children.length;
    if (siblings <= 1 || target.dataset.fxLeaving === '1') return;

    event.stopPropagation();
    event.preventDefault();
    target.dataset.fxLeaving = '1';
    const animation = play(target, [
      { opacity: 1, transform: 'none' },
      { opacity: 0, transform: isSemester ? 'scale(0.97)' : 'translateX(24px)' },
    ], { duration: 180, easing: EASE_IN, fill: 'forwards' });
    const replay = () => {
      button.dataset.fxReplay = '1';
      button.click();
      delete button.dataset.fxReplay;
      if (target.isConnected) {
        if (animation) animation.cancel();
        delete target.dataset.fxLeaving;
      }
    };
    if (animation) animation.onfinish = replay;
    else replay();
  }

  function setupNav() {
    const nav = document.querySelector('.section-nav');
    if (!nav) return;
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    const sections = links.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);

    const setActive = id => {
      links.forEach(link => {
        const active = link.getAttribute('href') === `#${id}`;
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };

    if ('IntersectionObserver' in window) {
      const visible = new Map();
      const spy = new IntersectionObserver(entries => {
        entries.forEach(entry => visible.set(entry.target.id, entry.isIntersecting));
        const current = sections.find(section => visible.get(section.id));
        if (current) setActive(current.id);
      }, { rootMargin: '-35% 0px -55% 0px' });
      sections.forEach(section => spy.observe(section));
    }

    const header = document.querySelector('.app-header');
    const onScroll = () => nav.classList.toggle('is-stuck', header ? header.getBoundingClientRect().bottom < 0 : window.scrollY > 0);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    nav.addEventListener('click', event => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const section = document.querySelector(link.getAttribute('href'));
      if (!section) return;
      setActive(section.id);
      requestAnimationFrame(() => section.focus({ preventScroll: true }));
    });
  }

  function setupPastePulse() {
    const paste = document.getElementById('import-paste');
    const button = document.getElementById('import-parse');
    if (!paste || !button) return;
    paste.addEventListener('paste', () => {
      requestAnimationFrame(() => {
        if (!paste.value.trim()) return;
        play(button, [
          { boxShadow: '0 0 0 0 var(--accent-line)', transform: 'scale(1)' },
          { boxShadow: '0 0 0 10px transparent', transform: 'scale(1.04)', offset: 0.5 },
          { boxShadow: '0 0 0 0 transparent', transform: 'scale(1)' },
        ], { duration: 700, iterations: 2 });
      });
    });
  }

  function setupImportResult() {
    const preview = document.getElementById('import-preview');
    if (!preview) return;
    new MutationObserver(() => {
      play(preview.querySelector('.import-result'), [
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'none' },
      ], { duration: 380 });
    }).observe(preview, { childList: true });
  }

  function init() {
    document.documentElement.classList.add('motion');
    const summary = document.getElementById('summary-content');
    const semesters = document.getElementById('semesters-container');

    semesterSnapshot = snapshotSemesters();
    armCards();
    document.querySelectorAll('#semesters-container .cell-letter').forEach(td => gradeLetters.set(td, td.textContent));

    summaryPopulated = Boolean(summary && summary.querySelector('.metric'));
    if (summaryPopulated) {
      previousMetrics = [...summary.querySelectorAll('.metric strong')].map(el => el.textContent);
      previousMeters = [...summary.querySelectorAll('.metric-meter i')].map(el => el.style.getPropertyValue('--fill'));
      previousMetrics.forEach((_, i) => {
        const el = summary.querySelectorAll('.metric strong')[i];
        countUp(el, 0, parseFloat(el.textContent), el.textContent);
      });
      summary.querySelectorAll('.metric-meter i').forEach(el => {
        const target = el.style.getPropertyValue('--fill');
        if (!canAnimate()) return;
        el.style.setProperty('--fill', '0');
        requestAnimationFrame(() => requestAnimationFrame(() => {
          el.classList.add('fx-meter');
          el.style.setProperty('--fill', target);
        }));
      });
    }
    syncGoalTexts(false);

    reveal([...document.querySelectorAll('.panel')], true);
    if (summaryPopulated) {
      reveal([...summary.querySelectorAll('.summary-block')], true);
    }

    if (summary) {
      new MutationObserver(mutations => {
        if (mutations.some(m => m.target === summary)) onSummaryRendered();
        else syncGoalTexts(true);
      }).observe(summary, { childList: true, subtree: true });
    }

    if (semesters) {
      new MutationObserver(mutations => {
        if (mutations.some(m => m.target === semesters)) {
          onSemestersRendered();
          return;
        }
        mutations.forEach(m => {
          if (m.target.classList && m.target.classList.contains('cell-letter')) onGradeCellChanged(m.target);
        });
      }).observe(semesters, { childList: true, subtree: true });

      document.addEventListener('click', interceptDelete, true);
      semesters.addEventListener('click', event => {
        if (event.target.closest('.add-subject')) armFocus();
      }, true);
    }

    const addSemester = document.getElementById('add-semester');
    if (addSemester) addSemester.addEventListener('click', armFocus, true);

    setupNav();
    setupPastePulse();
    setupImportResult();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
