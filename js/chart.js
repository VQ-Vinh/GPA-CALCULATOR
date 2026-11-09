(() => {
  const hiddenSeries = new Set();
  let activeIndex = -1;

  function esc(value) {
    return String(value == null ? '' : value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function chartParts() {
    const viewport = document.querySelector('#summary-content .chart-viewport');
    if (!viewport) return null;
    let points = viewport._points;
    if (!points) {
      try { points = JSON.parse(viewport.dataset.points || '[]'); } catch { points = []; }
      viewport._points = points;
    }
    return {
      viewport,
      points,
      plot: viewport.querySelector('.chart-plot'),
      tooltip: viewport.querySelector('.chart-tooltip'),
      crosshair: viewport.querySelector('.chart-crosshair'),
      live: document.querySelector('#summary-content .chart-live'),
    };
  }

  function deltaHtml(delta) {
    if (delta == null) return '<em class="delta is-flat">Kỳ đầu tiên</em>';
    if (Math.abs(delta) < 0.005) return '<em class="delta is-flat">= kỳ trước</em>';
    return delta > 0
      ? `<em class="delta is-good">▲ ${delta.toFixed(2)}</em>`
      : `<em class="delta is-bad">▼ ${Math.abs(delta).toFixed(2)}</em>`;
  }

  function deltaText(delta) {
    if (delta == null) return 'kỳ đầu tiên';
    if (Math.abs(delta) < 0.005) return 'bằng kỳ trước';
    return `${delta > 0 ? 'tăng' : 'giảm'} ${Math.abs(delta).toFixed(2)} so với kỳ trước`;
  }

  function show(index, announce) {
    const parts = chartParts();
    if (!parts || !parts.points.length) return;
    const i = Math.max(0, Math.min(parts.points.length - 1, index));
    const pt = parts.points[i];
    activeIndex = i;

    parts.viewport.querySelectorAll('.is-active').forEach(el => el.classList.remove('is-active'));
    parts.viewport.querySelectorAll(`[data-i="${i}"]`).forEach(el => el.classList.add('is-active'));
    parts.viewport.classList.add('is-inspecting');

    parts.crosshair.style.left = `${pt.x}%`;
    parts.crosshair.classList.remove('hidden');

    parts.tooltip.innerHTML = `<strong class="tt-title">${esc(pt.name)}</strong>
      <span class="tt-row${hiddenSeries.has('4') ? ' is-muted' : ''}"><i class="key key-4"></i>Hệ 4<b>${esc(pt.gpa4)}</b>${deltaHtml(pt.delta)}</span>
      <span class="tt-row${hiddenSeries.has('10') ? ' is-muted' : ''}"><i class="key key-10"></i>Hệ 10<b>${esc(pt.gpa10)}</b></span>
      <span class="tt-meta">${esc(pt.credits)} tín chỉ · ${esc(pt.band)}</span>`;
    const anchorTop = Math.min(hiddenSeries.has('4') ? 100 : pt.y4, hiddenSeries.has('10') ? 100 : pt.y10);
    parts.tooltip.style.left = `${pt.x}%`;
    parts.tooltip.style.top = `${Math.min(anchorTop, 100)}%`;
    parts.tooltip.classList.toggle('is-start', pt.x < 22);
    parts.tooltip.classList.toggle('is-end', pt.x > 78);
    parts.tooltip.classList.toggle('is-below', anchorTop < 34);
    parts.tooltip.classList.remove('hidden');

    if (announce && parts.live) {
      parts.live.textContent = `${pt.name}: hệ 4 ${pt.gpa4}, ${deltaText(pt.delta)}; hệ 10 ${pt.gpa10}; ${pt.credits} tín chỉ; ${pt.band}.`;
    }
  }

  function hide() {
    const parts = chartParts();
    activeIndex = -1;
    if (!parts) return;
    parts.viewport.classList.remove('is-inspecting');
    parts.viewport.querySelectorAll('.is-active').forEach(el => el.classList.remove('is-active'));
    parts.tooltip.classList.add('hidden');
    parts.crosshair.classList.add('hidden');
  }

  function indexFromPointer(event, parts) {
    const rect = parts.plot.getBoundingClientRect();
    if (!rect.width) return -1;
    const frac = (event.clientX - rect.left) / rect.width;
    return Math.round(Math.max(0, Math.min(1, frac)) * (parts.points.length - 1));
  }

  function applySeries() {
    const parts = chartParts();
    if (!parts) return;
    ['4', '10'].forEach(series => {
      parts.viewport.classList.toggle(`is-hide-${series}`, hiddenSeries.has(series));
      const button = document.querySelector(`#summary-content .chart-toggle[data-series="${series}"]`);
      if (button) button.setAttribute('aria-pressed', String(!hiddenSeries.has(series)));
    });
  }

  function updateTargetLine(value) {
    const parts = chartParts();
    if (!parts) return;
    const line = parts.viewport.querySelector('.chart-ref-target');
    if (!line) return;
    const yMin = Number(parts.viewport.dataset.ymin);
    const text = String(value ?? '').trim();
    const target = text === '' ? NaN : Number(text);
    const valid = Number.isFinite(target) && target >= yMin && target <= 4;
    line.classList.toggle('hidden', !valid);
    if (!valid) return;
    line.style.top = `${((1 - (target - yMin) / (4 - yMin)) * 100).toFixed(2)}%`;
    line.querySelector('span').textContent = `Mục tiêu ${target.toFixed(2)}`;
  }

  function init() {
    const summary = document.getElementById('summary-content');
    if (!summary) return;

    summary.addEventListener('pointermove', event => {
      const parts = chartParts();
      if (!parts || !parts.plot.contains(event.target)) return;
      const i = indexFromPointer(event, parts);
      if (i !== activeIndex && i >= 0) show(i, false);
    });

    summary.addEventListener('pointerdown', event => {
      const parts = chartParts();
      if (!parts) return;
      if (parts.plot.contains(event.target)) {
        const i = indexFromPointer(event, parts);
        if (i >= 0) show(i, false);
      }
    });

    summary.addEventListener('pointerout', event => {
      if (event.pointerType !== 'mouse') return;
      const parts = chartParts();
      if (!parts || !parts.plot.contains(event.target)) return;
      if (event.relatedTarget && parts.plot.contains(event.relatedTarget)) return;
      if (document.activeElement !== parts.viewport) hide();
    });

    document.addEventListener('pointerdown', event => {
      if (activeIndex >= 0 && !event.target.closest('.chart-viewport')) hide();
    });

    summary.addEventListener('focusin', event => {
      if (event.target.matches('.chart-viewport')) {
        const parts = chartParts();
        if (parts) show(activeIndex >= 0 ? activeIndex : parts.points.length - 1, true);
      }
    });

    summary.addEventListener('focusout', event => {
      if (event.target.matches('.chart-viewport')) hide();
    });

    summary.addEventListener('keydown', event => {
      if (!event.target.matches('.chart-viewport')) return;
      const parts = chartParts();
      if (!parts) return;
      const last = parts.points.length - 1;
      const keys = {
        ArrowRight: activeIndex + 1,
        ArrowDown: activeIndex + 1,
        ArrowLeft: activeIndex - 1,
        ArrowUp: activeIndex - 1,
        Home: 0,
        End: last,
      };
      if (event.key === 'Escape') { hide(); return; }
      if (!(event.key in keys)) return;
      event.preventDefault();
      show(Math.max(0, Math.min(last, keys[event.key])), true);
    });

    summary.addEventListener('click', event => {
      const button = event.target.closest('.chart-toggle');
      if (!button) return;
      const series = button.dataset.series;
      if (hiddenSeries.has(series)) hiddenSeries.delete(series);
      else hiddenSeries.add(series);
      applySeries();
      if (activeIndex >= 0) show(activeIndex, false);
    });

    summary.addEventListener('input', event => {
      if (event.target.matches('#goal-gpa-input')) updateTargetLine(event.target.value);
    });

    new MutationObserver(mutations => {
      if (!mutations.some(m => m.target === summary)) return;
      activeIndex = -1;
      applySeries();
    }).observe(summary, { childList: true });

    applySeries();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
