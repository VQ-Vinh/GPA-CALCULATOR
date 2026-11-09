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
    layoutChart();
  }

  function visibleLabels(labels) {
    return labels.filter(label => getComputedStyle(label).display !== 'none');
  }

  function firstOverlap(list) {
    for (let i = 1; i < list.length; i++) {
      if (list[i - 1].getBoundingClientRect().right + 6 > list[i].getBoundingClientRect().left) return i;
    }
    return -1;
  }

  function fitXLabels(viewport) {
    const labels = [...viewport.querySelectorAll('.chart-label')];
    viewport.classList.remove('fit-compact');
    labels.forEach(label => label.classList.remove('fit-hide'));
    if (firstOverlap(visibleLabels(labels)) === -1) return;
    viewport.classList.add('fit-compact');
    const base = visibleLabels(labels);
    const last = base.length - 1;
    for (let stride = 1; stride <= base.length; stride++) {
      base.forEach((label, i) => label.classList.toggle('fit-hide', !(i % stride === 0 || i === last)));
      let shown = visibleLabels(base);
      if (firstOverlap(shown) === shown.length - 1 && shown.length > 2) {
        shown[shown.length - 2].classList.add('fit-hide');
        shown = visibleLabels(base);
      }
      if (firstOverlap(shown) === -1) return;
    }
  }

  function layoutChart() {
    const parts = chartParts();
    if (!parts || !parts.plot) return;
    const { viewport, plot, points } = parts;
    const W = plot.clientWidth;
    const H = plot.clientHeight;
    if (!W || !H) return;

    fitXLabels(viewport);

    const hide4 = viewport.classList.contains('is-hide-4');
    const hide10 = viewport.classList.contains('is-hide-10');
    const samples = [];
    [['.chart-line-4', hide4], ['.chart-line-10', hide10]].forEach(([selector, hidden]) => {
      const path = plot.querySelector(selector);
      if (hidden || !path || typeof path.getTotalLength !== 'function') return;
      const length = path.getTotalLength();
      for (let i = 0; i <= 160; i++) {
        const p = path.getPointAtLength((length * i) / 160);
        samples.push({ x: (p.x / 1000) * W, y: (p.y / 1000) * H, r: 2 });
      }
    });
    points.forEach(pt => {
      if (!hide4) samples.push({ x: (pt.x / 100) * W, y: (pt.y4 / 100) * H, r: 8, dot: true });
      if (!hide10) samples.push({ x: (pt.x / 100) * W, y: (pt.y10 / 100) * H, r: 7, dot: true });
    });

    const boxes = [];
    const pad = 4;
    const cost = box => {
      let total = 0;
      if (box.l < 0 || box.r > W || box.t < -26 || box.b > H) total += 1000;
      samples.forEach(s => {
        if (s.x + s.r > box.l - pad && s.x - s.r < box.r + pad && s.y + s.r > box.t - pad && s.y - s.r < box.b + pad) {
          total += s.dot ? 8 : 1;
        }
      });
      boxes.forEach(o => {
        if (Math.min(box.r, o.r) - Math.max(box.l, o.l) > -6 && Math.min(box.b, o.b) - Math.max(box.t, o.t) > -4) total += 60;
      });
      return total + (box.bias || 0);
    };
    const best = candidates => candidates.reduce((a, b) => (cost(b) < cost(a) ? b : a));
    const sweep = (w, h, tops, preferRight) => {
      const list = [];
      for (let l = 0; l <= Math.max(0, W - w); l += 6) {
        tops.forEach(t => list.push({ l, t, r: l + w, b: t + h, bias: (preferRight ? (W - w - l) : l) / W * 0.9 }));
      }
      return list;
    };

    const last = plot.querySelector('.chart-last');
    if (last && !hide4 && points.length) {
      const pt = points[points.length - 1];
      const px = (pt.x / 100) * W;
      const py = (pt.y4 / 100) * H;
      const w = last.offsetWidth;
      const h = last.offsetHeight;
      const box = best([
        { l: px - w - 14, t: py - h / 2 },
        { l: px - w - 6, t: py - h - 10 },
        { l: px - w - 6, t: py + 10 },
        { l: px - w / 2, t: py - h - 14, bias: 0.2 },
        { l: px - w / 2, t: py + 14, bias: 0.3 },
      ].map(b => ({ ...b, l: Math.min(b.l, W - w), r: Math.min(b.l, W - w) + w, b: b.t + h })));
      last.style.left = `${(box.l / W) * 100}%`;
      last.style.top = `${(box.t / H) * 100}%`;
      last.classList.add('is-placed');
      boxes.push(box);
    }

    plot.querySelectorAll('.chart-ref:not(.hidden)').forEach(ref => {
      const span = ref.querySelector('span');
      if (!span) return;
      const y = ref.offsetTop;
      const w = span.offsetWidth;
      const h = span.offsetHeight;
      const box = best(sweep(w, h, [y - h - 3, y + 3], ref.classList.contains('chart-ref-target')));
      span.style.left = `${(box.l / W) * 100}%`;
      span.style.right = 'auto';
      span.style.top = `${box.t - y}px`;
      span.style.bottom = 'auto';
      boxes.push(box);
    });

    plot.querySelectorAll('.chart-band').forEach(band => {
      const span = band.querySelector('span');
      if (!span) return;
      const top = band.offsetTop;
      const height = band.offsetHeight;
      const w = span.offsetWidth;
      const h = span.offsetHeight;
      span.classList.remove('fit-hide');
      if (height < h + 6) { span.classList.add('fit-hide'); return; }
      const box = best(sweep(w, h, [top + 3, top + height - h - 3], true));
      if (cost({ ...box, bias: 0 }) >= 8) { span.classList.add('fit-hide'); return; }
      span.style.left = `${(box.l / W) * 100}%`;
      span.style.right = 'auto';
      span.style.top = `${box.t - top}px`;
      boxes.push(box);
    });
  }

  let layoutFrame = 0;
  function scheduleLayout() {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(layoutChart);
  }

  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(scheduleLayout) : null;
  function watchViewport() {
    const parts = chartParts();
    if (resizeObserver) {
      resizeObserver.disconnect();
      if (parts) resizeObserver.observe(parts.viewport);
    }
    layoutChart();
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
      layoutChart();
      if (activeIndex >= 0) show(activeIndex, false);
    });

    summary.addEventListener('input', event => {
      if (event.target.matches('#goal-gpa-input')) updateTargetLine(event.target.value);
    });

    new MutationObserver(mutations => {
      if (!mutations.some(m => m.target === summary)) return;
      activeIndex = -1;
      applySeries();
      watchViewport();
    }).observe(summary, { childList: true });

    applySeries();
    watchViewport();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleLayout);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
