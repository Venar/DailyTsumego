(() => {
  'use strict';
  const bands = ['beginner', 'intermediate', 'advanced', 'dan'];
  const bandLabels = {
    beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', dan: 'Dan'
  };
  const appRoot = new URL('./', window.location.href);
  const state = { dates: [], selectedDate: null, selectedBand: 'intermediate', month: null, record: null, reveal: false };
  const $ = (id) => document.getElementById(id);
  const el = {
    date: $('puzzle-date'), title: $('puzzle-title'), badge: $('rank-badge'), board: $('board-wrap'),
    empty: $('empty-state'), side: $('side-to-play'), show: $('show-solution'), hide: $('hide-solution'),
    solution: $('solution-panel'), solutionList: $('solution-list'), band: $('band-select'),
    month: $('month-label'), calendar: $('calendar-grid'), status: $('archive-status')
  };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const dataUrl = (path) => new URL(path, appRoot).toString();

  async function getJson(path) {
    const response = await fetch(dataUrl(path), { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status + ' loading ' + path);
    return response.json();
  }
  function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); }
  function dateKey(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }
  function monthText(date) { return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); }

  function drawCalendar() {
    if (!state.month) return;
    const y = state.month.getFullYear(), m = state.month.getMonth();
    el.month.textContent = monthText(state.month);
    el.calendar.replaceChildren();
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((day) => {
      const node = document.createElement('div'); node.className = 'weekday'; node.setAttribute('role', 'columnheader'); node.textContent = day; el.calendar.append(node);
    });
    const first = new Date(y, m, 1, 12);
    const offset = (first.getDay() + 6) % 7;
    const count = new Date(y, m + 1, 0).getDate();
    const dateSet = new Set(state.dates);
    for (let i = 0; i < offset; i++) { const blank = document.createElement('div'); blank.className = 'day-cell'; el.calendar.append(blank); }
    for (let d = 1; d <= count; d++) {
      const key = dateKey(new Date(y, m, d, 12));
      const cell = document.createElement(dateSet.has(key) ? 'button' : 'div');
      cell.className = 'day-cell' + (key === state.selectedDate ? ' selected' : '');
      cell.textContent = String(d);
      if (dateSet.has(key)) {
        cell.type = 'button'; cell.setAttribute('role', 'gridcell'); cell.setAttribute('aria-label', key);
        cell.addEventListener('click', () => { state.selectedDate = key; state.reveal = false; drawCalendar(); loadPuzzle(key, state.selectedBand); });
      }
      el.calendar.append(cell);
    }
  }

  function addSvg(parent, name, attrs = {}, text = null) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text !== null) node.textContent = String(text);
    parent.append(node); return node;
  }

  function drawBoard(record, reveal) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'board-svg'); svg.setAttribute('viewBox', '0 0 800 480'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${record.rank_display} Go problem, ${record.description}`);
    addSvg(svg, 'rect', { width: 800, height: 480, fill: '#f7f6f1' });
    addSvg(svg, 'text', { x: 36, y: 42, 'font-family': 'Arial,sans-serif', 'font-size': 17, 'font-weight': 700, 'letter-spacing': 2, fill: '#222' }, 'DAILY TSUMEGO');
    addSvg(svg, 'text', { x: 764, y: 42, 'text-anchor': 'end', 'font-family': 'Arial,sans-serif', 'font-size': 14, 'font-weight': 700, 'letter-spacing': 1.2, fill: '#444' }, `${record.rank_display} · ${reveal ? 'SOLUTION' : 'PROBLEM'}`);
    addSvg(svg, 'line', { x1: 36, y1: 59, x2: 764, y2: 59, stroke: '#222', 'stroke-width': 1.5 });
    (record.grid_x || []).forEach(g => addSvg(svg, 'line', { x1: g.p, y1: 102, x2: g.p, y2: 422, stroke: '#262626', 'stroke-width': 1.25 }));
    (record.grid_y || []).forEach(g => addSvg(svg, 'line', { x1: 92, y1: g.p, x2: 412, y2: g.p, stroke: '#262626', 'stroke-width': 1.25 }));
    (record.grid_x || []).forEach(g => {
      addSvg(svg, 'text', { x: g.p, y: 88, 'text-anchor': 'middle', 'font-family': 'Arial,sans-serif', 'font-size': 12, 'font-weight': 700, fill: '#444' }, g.l);
      addSvg(svg, 'text', { x: g.p, y: 443, 'text-anchor': 'middle', 'font-family': 'Arial,sans-serif', 'font-size': 12, 'font-weight': 700, fill: '#444' }, g.l);
    });
    (record.grid_y || []).forEach(g => {
      addSvg(svg, 'text', { x: 64, y: g.p, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'Arial,sans-serif', 'font-size': 12, 'font-weight': 700, fill: '#444' }, g.l);
      addSvg(svg, 'text', { x: 440, y: g.p, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'Arial,sans-serif', 'font-size': 12, 'font-weight': 700, fill: '#444' }, g.l);
    });
    (record.stones || []).forEach(s => addSvg(svg, 'circle', { cx: s.x, cy: s.y, r: s.r, fill: s.c === 'B' ? '#171717' : '#fffefa', stroke: s.c === 'B' ? '#111' : '#222', 'stroke-width': 1.4 }));
    if (reveal) (record.moves || []).forEach(m => {
      addSvg(svg, 'circle', { cx: m.x, cy: m.y, r: m.r, fill: m.c === 'B' ? '#171717' : '#fffefa', stroke: '#111', 'stroke-width': 1.4 });
      addSvg(svg, 'text', { x: m.x, y: m.y, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'Arial,sans-serif', 'font-size': 12, 'font-weight': 700, fill: m.c === 'B' ? '#fff' : '#111' }, m.n);
    });
    addSvg(svg, 'line', { x1: 452, y1: 88, x2: 452, y2: 432, stroke: '#c4c2bb', 'stroke-width': 1.4 });
    addSvg(svg, 'text', { x: 484, y: 127, 'font-family': 'Arial,sans-serif', 'font-size': 13, 'font-weight': 700, 'letter-spacing': 1.3, fill: '#666' }, "TODAY'S PROBLEM");
    addSvg(svg, 'text', { x: 484, y: 190, 'font-family': 'Arial,sans-serif', 'font-size': 40, 'font-weight': 700, fill: '#171717' }, record.rank_display);
    addSvg(svg, 'text', { x: 484, y: 235, 'font-family': 'Arial,sans-serif', 'font-size': 23, fill: '#222' }, record.description);
    addSvg(svg, 'line', { x1: 484, y1: 258, x2: 738, y2: 258, stroke: '#bbb9b1' });
    if (reveal) {
      addSvg(svg, 'text', { x: 484, y: 286, 'font-family': 'Arial,sans-serif', 'font-size': 12, 'font-weight': 700, 'letter-spacing': 1.2, fill: '#666' }, 'CORRECT LINE');
      (record.moves || []).forEach(m => {
        const color = m.c === 'B' ? 'Black' : 'White';
        addSvg(svg, 'text', { x: 484, y: m.ly, 'font-family': 'Arial,sans-serif', 'font-size': 14, fill: '#333' }, `${m.n}  ${color}  ${m.coord}`);
      });
      if (record.more_moves_label) addSvg(svg, 'text', { x: 484, y: 446, 'font-family': 'Arial,sans-serif', 'font-size': 11, fill: '#666' }, record.more_moves_label);
      addSvg(svg, 'rect', { x: 641, y: 110, width: 97, height: 25, rx: 12.5, fill: 'none', stroke: '#555' });
      addSvg(svg, 'text', { x: 689.5, y: 127, 'text-anchor': 'middle', 'font-family': 'Arial,sans-serif', 'font-size': 10, 'font-weight': 700, fill: '#444' }, 'SOLUTION');
    } else {
      addSvg(svg, 'text', { x: 484, y: 300, 'font-family': 'Arial,sans-serif', 'font-size': 17, fill: '#333' }, 'Find the best move.');
      addSvg(svg, 'rect', { x: 484, y: 342, width: 192, height: 38, rx: 19, fill: '#222' });
      addSvg(svg, 'text', { x: 580, y: 367, 'text-anchor': 'middle', 'font-family': 'Arial,sans-serif', 'font-size': 13, 'font-weight': 700, 'letter-spacing': 1, fill: '#fff' }, 'SOLUTION HIDDEN');
    }
    addSvg(svg, 'text', { x: 764, y: 463, 'text-anchor': 'end', 'font-family': 'Arial,sans-serif', 'font-size': 11, 'letter-spacing': .7, fill: '#666' }, record.date_display);
    el.board.replaceChildren(svg);
  }

  function paint(record) {
    state.record = record;
    el.empty.hidden = true;
    el.date.textContent = record.date_display || record.date;
    el.title.textContent = `${record.band_label || bandLabels[record.band_key]} · ${record.description}`;
    el.badge.textContent = record.rank_display || record.rank_requested;
    el.side.textContent = `${record.description} · ${record.band_label || bandLabels[record.band_key]}`;
    el.show.hidden = state.reveal;
    el.solution.hidden = !state.reveal;
    if (state.reveal) fillSolution(record); else el.solutionList.replaceChildren();
    drawBoard(record, state.reveal);
  }
  function fillSolution(record) {
    el.solutionList.replaceChildren();
    (record.solution_line || []).forEach(move => {
      const li = document.createElement('li');
      li.textContent = `${move.n}. ${move.c === 'B' ? 'Black' : 'White'} ${move.coord}`;
      el.solutionList.append(li);
    });
  }
  function showMessage(message) {
    state.record = null; el.date.textContent = 'No puzzle loaded'; el.title.textContent = 'Daily Tsumego';
    el.badge.textContent = '—'; el.side.textContent = '';
    const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = message; el.board.replaceChildren(p);
    el.show.hidden = true; el.solution.hidden = true;
  }
  async function loadPuzzle(date, band) {
    el.status.textContent = `Loading ${bandLabels[band]} for ${date}…`;
    try {
      const record = await getJson(`archive/${date}/${band}.json`);
      state.selectedDate = date; state.selectedBand = band; state.reveal = false;
      paint(record); el.status.textContent = `${state.dates.length} archived day(s).`;
    } catch (err) { showMessage('No archived puzzle was found for this date and band.'); el.status.textContent = 'That archive entry could not be loaded.'; }
  }
  async function loadLatest(band) {
    if (!state.dates.length) return showMessage('The daily archive has not been published yet.');
    const latest = state.dates[0]; state.selectedDate = latest; state.month = parseDate(latest); drawCalendar();
    try {
      const record = await getJson(`current/${band}.json`);
      state.selectedBand = band; state.reveal = false; paint(record); el.status.textContent = `${state.dates.length} archived day(s).`;
    } catch (err) { loadPuzzle(latest, band); }
  }
  $('prev-month').addEventListener('click', () => { state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1, 12); drawCalendar(); });
  $('next-month').addEventListener('click', () => { state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1, 12); drawCalendar(); });
  $('latest-button').addEventListener('click', () => loadLatest(el.band.value));
  el.band.addEventListener('change', () => {
    state.selectedBand = el.band.value;
    if (state.selectedDate) loadPuzzle(state.selectedDate, state.selectedBand);
  });
  el.show.addEventListener('click', () => { if (state.record) { state.reveal = true; paint(state.record); } });
  el.hide.addEventListener('click', () => { if (state.record) { state.reveal = false; paint(state.record); } });

  getJson('archive/index.json').then(index => {
    state.dates = Array.isArray(index.dates) ? index.dates.slice().sort().reverse() : [];
    el.status.textContent = state.dates.length ? `${state.dates.length} archived day(s).` : 'No puzzles have been archived yet.';
    if (state.dates.length) {
      state.month = parseDate(state.dates[0]); state.selectedDate = state.dates[0];
      drawCalendar(); loadLatest(el.band.value);
    } else {
      state.month = new Date(); drawCalendar(); showMessage('The daily archive has not been published yet. Once the generator runs, choose a date in the calendar.');
    }
  }).catch(() => {
    state.month = new Date(); drawCalendar();
    el.status.textContent = 'Waiting for the first daily publish.';
    showMessage('The daily archive has not been published yet. Once the generator runs, choose a date in the calendar.');
  });
})();
