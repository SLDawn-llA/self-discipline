(() => {
  'use strict';
  const C = window.Yidian;
  const STORAGE_KEY = 'yidian.data.v1';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const paths = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2m-8 3h2"/>',
    tasks: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m7 8 1 1 2-2m3 1h4m-10 5 1 1 2-2m3 1h4m-10 5h3m3 0h4"/>',
    settings: '<path d="m9 3-.7 2.1-2 .9-2.1-.4-1.5 2.6 1.4 1.6-.2 2.2-1.5 1.6 1.5 2.6 2.2-.4 2 .9.7 2.1h3l.7-2.1 2-.9 2.2.4 1.5-2.6-1.5-1.6-.2-2.2 1.4-1.6-1.5-2.6-2.1.4-2-.9L12 3Z" transform="translate(1 1)"/><circle cx="11.5" cy="11.6" r="3"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    left: '<path d="m14 6-6 6 6 6"/>',
    right: '<path d="m10 6 6 6-6 6"/>',
    up: '<path d="m6 14 6-6 6 6"/>',
    down: '<path d="m6 10 6 6 6-6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    leaf: '<path d="M19 4C9 2 3 7 5 14c2 5 12 6 14-10Z"/><path d="M4 21c1-6 5-10 10-13"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".5"/>',
    cup: '<path d="M5 8h12v9a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z"/><path d="M17 10h2a3 3 0 0 1 0 6h-2M8 3v2m5-2v2"/>',
    book: '<path d="M12 5v15M12 5C9 2 4 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-1-1-6-2-9 1Z"/>',
    home: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',
    moon: '<path d="M20 14A8.5 8.5 0 0 1 10 3a9 9 0 1 0 10 11Z"/>',
    heart: '<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 4 0 8 8 15 8-7 12-11 8-15Z"/>',
    pen: '<path d="m14 5 5 5M4 20l5-1L20 8a2 2 0 0 0-4-4L5 15Z"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
    upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 16v5h16v-5"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
    spark: '<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.leaf}</svg>`;
  const categoryIcons = { health: 'cup', growth: 'book', life: 'home', rest: 'moon' };
  const weekLabels = ['日','一','二','三','四','五','六'];
  const navs = [['today','sun','今日'],['history','calendar','足迹'],['tasks','tasks','任务'],['settings','settings','我的']];
  let today = C.dateKey(), selectedDate = today, historyDate = today, calendarMonth = today.slice(0,7), filter = 'all';
  let state, storageBlocked = false, storageMessage = '', deferredInstall = null, confirmCallback = null, toastTimeout;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state = raw ? C.validate(JSON.parse(raw)) : C.defaults(today);
  } catch (error) {
    state = C.defaults(today); storageBlocked = true;
    storageMessage = '本机数据暂时无法读取。原有数据没有被覆盖；当前操作只暂存在内存中。可在“我的”导出临时记录，或导入有效备份恢复。';
  }
  const E = window.createExecutionCoach({ C, icon, esc, state: () => state, today: () => today, save, render, toast, ensureToday, openTask, confirmAction, navigate });
  function save() {
    if (storageBlocked) { showStorageWarning(); return false; }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
    catch {
      storageBlocked = true; storageMessage = '浏览器没有成功保存数据（存储空间不足或权限受限）。当前记录只暂存在内存中，请在“我的”导出备份，避免关闭页面后丢失。';
      showStorageWarning(); return false;
    }
  }
  function showStorageWarning() { $('#storage-warning').hidden = !storageBlocked; $('#storage-warning').textContent = storageMessage; }
  function ensureToday() { C.syncToday(state, today); save(); }
  function toast(message) { clearTimeout(toastTimeout); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimeout = setTimeout(() => $('#toast').classList.remove('visible'), 2800); }
  function currentTab() { const tab = location.hash.slice(1); return navs.some(([id]) => id === tab) ? tab : 'today'; }
  function navigate(tab) { if (currentTab() === tab) render(); else location.hash = tab; }
  function dateText(date, year = false) { const d = C.parseDate(date); return `${year ? `${d.getFullYear()} 年 ` : ''}${d.getMonth()+1} 月 ${d.getDate()} 日`; }
  function dateWeek(date) { return `星期${weekLabels[C.parseDate(date).getDay()]}`; }
  function repeatText(task) {
    if (task.weekdays.length === 7) return '每天';
    if ([1,2,3,4,5].every(d => task.weekdays.includes(d)) && task.weekdays.length === 5) return '工作日';
    if (task.weekdays.length === 2 && task.weekdays.includes(0) && task.weekdays.includes(6)) return '周末';
    return '每周' + [1,2,3,4,5,6,0].filter(d => task.weekdays.includes(d)).map(d => weekLabels[d]).join('、');
  }
  function planChip() {
    if (state.execution.starterInstalled) { const n = Math.max(1,C.dayDistance(state.execution.startDate,today)+1); return `<span class="plan-chip">${icon('leaf')}${n <= 7 ? `起步第 ${n} / 7 天` : '继续向前'}</span>`; }
    const day = C.dayDistance(state.settings.startDate, today) + 1;
    const label = day < 1 ? '计划即将开始' : day > state.settings.planDays ? '继续向前' : `第 ${day} / ${state.settings.planDays} 天`;
    return `<span class="plan-chip">${icon('leaf')}${label}</span>`;
  }
  function top(eyebrow, title, subtitle = '', action = planChip()) { return `<div class="page-top"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1>${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}</div>${action}</div>`; }
  function empty(title, text, action = '') { return `<div class="empty-state"><span class="empty-symbol">${icon('leaf')}</span><h3>${title}</h3><p>${text}</p>${action}</div>`; }
  function taskRow(item, date) {
    return `<div class="task-row ${item.done ? 'completed' : ''}" data-task-row="${esc(item.id)}"><span class="task-icon tone-${item.category}">${icon(categoryIcons[item.category])}</span><div class="task-copy"><h3>${esc(item.title)}</h3><div class="task-meta">${E.taskBadge(item)}${item.time ? `<span>${item.time}</span><span class="dot">·</span>` : ''}${esc(item.detail || C.categories[item.category])}</div>${date === today && !item.done ? `<button class="text-button task-start" data-action="coach-start" data-id="${item.id}" data-mode="minimum">${icon('right')}${item.minMinutes} 分钟开始</button>` : ''}${item.minimumDone && !item.done ? `<button class="text-button" data-action="coach-reset-outcome" data-id="${item.id}" data-date="${date}">撤销成果</button>` : ''}</div><button class="check-button" data-action="complete" data-id="${esc(item.id)}" data-date="${date}" aria-label="${item.done ? '撤销完成' : '完成'}：${esc(item.title)}" aria-pressed="${item.done}">${icon('check')}</button></div>`;
  }
  function weeklyCard() {
    const weekday = C.parseDate(today).getDay();
    const monday = C.shiftDate(today, -(weekday === 0 ? 6 : weekday - 1));
    const dates = Array.from({length:7}, (_, i) => C.shiftDate(monday,i));
    const hits = dates.filter(date => date <= today && C.progress(state.days[date]).hit).length;
    return `<div class="card week-card"><div class="card-heading">${icon('calendar')}<h3>这一周的小脚印</h3></div><div class="week-days">${dates.map(date => { const p = C.progress(state.days[date]); return `<div class="week-day ${date === today ? 'current' : ''}" aria-label="${dateText(date)}，${date > today ? '还没到' : p.hit ? '已达标' : p.done ? `完成 ${p.done} 项` : '未打卡'}"><span>${weekLabels[C.parseDate(date).getDay()]}</span><span class="week-mark ${p.hit ? 'hit' : p.done ? 'partial' : ''}">${p.hit ? icon('check') : date > today ? '·' : p.done || '·'}</span></div>`; }).join('')}</div><p class="week-caption">${icon('leaf')}${hits ? `这周已经有 ${hits} 天，做到了自己的小目标。` : '今天做一点，慢慢留下自己的足迹。'}</p></div>`;
  }
  function todayView() {
    const day = state.days[selectedDate];
    const p = C.progress(day);
    const isToday = selectedDate === today;
    const name = state.settings.name ? `${esc(state.settings.name)}，` : '';
    const heading = isToday ? `${name}先开始，再慢慢来` : '回看这一天';
    let heroTitle = p.hit ? '今天的你，已经很棒了。' : '不用满分，也在向前。';
    let heroDescription = p.hit ? '小目标已经完成，多做一点是惊喜。' : p.done ? `已经完成 ${p.done} 项，再做 ${p.target - p.done} 项就达标。` : '挑一件能做到的小事，就从现在开始。';
    if (!isToday) { heroTitle = p.hit ? '这一天，你做到了。' : p.done ? '每一小步，都值得记住。' : '允许留白，继续向前。'; heroDescription = '过去的记录可以补打卡，今天继续慢慢来。'; }
    if (!p.total) { heroTitle = '给今天留一点空间。'; heroDescription = isToday ? '今天没有安排任务。休息，或添加一件小事。' : '这一天没有留下任务记录。'; }
    const items = (day?.items || []).filter(item => filter === 'all' || (filter === 'done' ? item.done : !item.done));
    const circumference = 2 * Math.PI * 52;
    return `${top('ONE CLEAR STEP, RIGHT NOW', heading, '今天只守住一件主线。先做到最低版，再考虑多做一点。')}
      ${isToday ? E.todayPanel(day) : `<div class="hero" id="progress-hero"><div class="progress-ring" role="img" aria-label="完成 ${p.done} 项，目标 ${p.target} 项"><svg viewBox="0 0 120 120"><circle class="ring-track" cx="60" cy="60" r="52"/><circle class="ring-fill" cx="60" cy="60" r="52" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference * (1 - p.ratio)}"/></svg><div class="ring-number"><strong>${p.done}<span> / ${p.target}</span></strong><small>${p.hit ? '常规目标已达标' : '当天常规目标'}</small></div></div><div class="hero-copy"><h2><span>${heroTitle.replace('，','，</span><span>')}</span></h2><p>${heroDescription}</p></div></div>`}
      <div class="date-row"><div class="date-control"><button class="icon-button small" data-action="previous-day" aria-label="前一天">${icon('left')}</button><label class="date-label">${dateText(selectedDate)} · ${dateWeek(selectedDate)}<input id="day-picker" type="date" value="${selectedDate}" max="${today}" min="2000-01-01" aria-label="选择打卡日期"></label><button class="icon-button small" data-action="next-day" aria-label="后一天" ${isToday ? 'disabled' : ''}>${icon('right')}</button></div>${!isToday ? '<button class="today-link" data-action="back-today">回到今天</button>' : ''}<span class="date-hint">${isToday ? '今天' : '历史记录'} · ${p.done} / ${p.total} 项完成</span></div>
      <div class="content-grid" style="margin-top:0"><section><div class="section-bar"><div class="section-title"><h2>${isToday ? '今天的小事' : '当天的小事'}</h2><small>${p.total} 项</small></div><button class="text-button" data-action="manage">管理任务${icon('right')}</button></div><div class="filter-row" role="group" aria-label="任务筛选">${[['all','全部'],['todo','待完成'],['done','已完成']].map(([id,label]) => `<button class="filter-button ${filter === id ? 'selected' : ''}" aria-pressed="${filter === id}" data-action="filter" data-filter="${id}">${label}${id === 'todo' ? ` ${p.total-p.done}` : id === 'done' ? ` ${p.done}` : ''}</button>`).join('')}</div><div class="card task-list">${items.length ? items.map(item => taskRow(item,selectedDate)).join('') : empty(p.total ? filter === 'todo' ? '今天安排的小事，全都完成了' : '还没有完成的小事' : isToday ? '今天，从一件小事开始' : '这一天还没有记录', p.total ? filter === 'todo' ? '可以停下来，好好享受这一刻。' : '挑一件最容易的，给自己一个开始。' : isToday ? '添加一个容易做到的任务，或者给自己放一天假。' : '历史页只保留当时的任务，不会把新任务加进过去。')}</div>${isToday ? `<button class="add-row" data-action="add-task">${icon('plus')}添加一件小事</button>` : '<p class="history-notice">这里保留当时的任务和目标。可以补打卡、写下感想。</p>'}</section><aside class="side-stack"><div class="card note-card"><div class="card-heading">${icon('pen')}<h3>给${isToday ? '今天' : '这一天'}留一句话</h3></div><span class="hint">一点感想、一个小确幸，或对自己的鼓励。</span><textarea class="note-textarea" id="daily-note" data-date="${selectedDate}" maxlength="1000" placeholder="今天有什么值得记住的事？" aria-label="每日感想" ${!day ? 'disabled' : ''}>${esc(day?.note || '')}</textarea><div class="note-bottom"><span id="note-status">${day ? storageBlocked ? '仅暂存，请导出备份' : '输入后自动保存' : '当天没有记录'}</span><span id="note-count">${(day?.note || '').length} / 1000</span></div></div>${weeklyCard()}<div class="quote-card"><div class="quote-mark">“</div><p>不必一下子改变整个生活，<br>只要把今天过得比昨天好一点。</p><small>送给正在努力的你</small></div></aside></div>`;
  }
  function historyView() {
    const stats = C.statistics(state,today);
    const first = `${calendarMonth}-01`;
    const firstWeek = (C.parseDate(first).getDay() + 6) % 7;
    const monthEnd = C.parseDate(first); monthEnd.setMonth(monthEnd.getMonth()+1,0);
    const days = monthEnd.getDate();
    const selected = state.days[historyDate]; const p = C.progress(selected);
    return `${top('YOUR SMALL STEPS', '走过的每一步', '不为连续打卡焦虑，只记住真实的进步。')}
      <div class="stats-grid"><div class="card stat-card"><div class="stat-value">${stats.achieved}<span>天</span></div><div class="stat-label">累计达标</div></div><div class="card stat-card"><div class="stat-value">${stats.totalDone}<span>项</span></div><div class="stat-label">完成的小事</div></div><div class="card stat-card"><div class="stat-value">${stats.streak}<span>天</span></div><div class="stat-label">当前连续达标</div></div></div>
      <div class="card calendar-card"><div class="calendar-top"><h2>${Number(calendarMonth.slice(0,4))} 年 ${Number(calendarMonth.slice(5))} 月</h2><div class="calendar-top-controls"><button class="text-button" data-action="calendar-today">本月</button><button class="icon-button small" data-action="previous-month" aria-label="上个月" ${calendarMonth <= '2000-01' ? 'disabled' : ''}>${icon('left')}</button><button class="icon-button small" data-action="next-month" aria-label="下个月" ${calendarMonth >= today.slice(0,7) ? 'disabled' : ''}>${icon('right')}</button></div></div><div class="calendar-grid">${['一','二','三','四','五','六','日'].map(label => `<span class="weekday">${label}</span>`).join('')}${'<span></span>'.repeat(firstWeek)}${Array.from({length:days},(_,i) => { const date = `${calendarMonth}-${String(i+1).padStart(2,'0')}`; const d = C.progress(state.days[date]); return `<button class="calendar-day ${d.hit ? 'hit' : d.done ? 'partial' : ''} ${date === today ? 'today' : ''} ${date === historyDate ? 'selected' : ''} ${date > today ? 'future' : ''}" data-action="select-history" data-date="${date}" aria-label="${dateText(date)}，${d.hit ? '达标，' : ''}${d.done} 项完成" aria-pressed="${date === historyDate}" ${date > today ? 'disabled' : ''}><span>${i+1}</span>${d.total ? `<small>${d.done} / ${d.target}</small>` : '<small>·</small>'}</button>`; }).join('')}</div><div class="calendar-legend"><span><i class="legend-dot hit"></i>目标达成</span><span><i class="legend-dot partial"></i>有一点进步</span><span><i class="legend-dot"></i>允许留白</span></div></div>
      <div class="card history-detail"><div class="section-bar"><h3>${dateText(historyDate)} · ${dateWeek(historyDate)}</h3>${p.total ? `<span class="subtle-chip">${p.hit ? '小目标已达成' : `${p.done} / ${p.target} 项目标`}</span>` : ''}</div>${selected?.items.length ? selected.items.map(item => taskRow(item,historyDate)).join('') : empty('给生活一点留白','这一天没有任务记录。新的开始，随时都可以。')}${selected?.note ? `<p class="history-note">${esc(selected.note)}</p>` : ''}${selected ? `<button class="text-button" data-action="open-day" data-date="${historyDate}">${icon('pen')}查看这天 / 写点感想${icon('right')}</button>` : ''}</div>`;
  }
  function tasksView() {
    const enabled = state.tasks.filter(task => task.enabled).length;
    return `${top('MAKE ROOM FOR WHAT MATTERS', '自己的节奏，自己定', `${state.tasks.length} 件小事 · ${enabled} 项启用`, `<button class="button" data-action="add-task">${icon('plus')}新任务</button>`)}<div class="management-info">${icon('info')}可以暂停、调整或删掉任务。修改会更新今天和未来的安排，过去的记录会保留。</div>${state.tasks.length ? state.tasks.map((task,index) => `<article class="card managed-task ${!task.enabled ? 'inactive' : ''}"><span class="task-icon tone-${task.category}">${icon(categoryIcons[task.category])}</span><div class="task-copy"><h3>${esc(task.title)}</h3><div class="task-meta">${C.categories[task.category]}<span class="dot">·</span>${repeatText(task)}${task.time ? `<span class="dot">·</span>${task.time}` : ''}${!task.enabled ? '<span class="dot">·</span>已暂停' : ''}</div></div><div class="managed-actions"><button role="switch" class="switch" aria-checked="${task.enabled}" aria-label="${task.enabled ? '暂停' : '启用'}：${esc(task.title)}" data-action="toggle-task" data-id="${task.id}"><span></span></button><button class="icon-button small" data-action="edit-task" data-id="${task.id}" aria-label="编辑：${esc(task.title)}">${icon('pen')}</button><button class="icon-button small" data-action="delete-task" data-id="${task.id}" aria-label="删除：${esc(task.title)}">${icon('trash')}</button><div class="manage-order"><button class="icon-button small" data-action="move-task" data-direction="-1" data-id="${task.id}" aria-label="上移：${esc(task.title)}" ${index === 0 ? 'disabled' : ''}>${icon('up')}</button><button class="icon-button small" data-action="move-task" data-direction="1" data-id="${task.id}" aria-label="下移：${esc(task.title)}" ${index === state.tasks.length-1 ? 'disabled' : ''}>${icon('down')}</button></div></div></article>`).join('') : `<div class="card">${empty('先从一件小事开始','不需要宏大的计划。喝一杯水、读一页书，都是好的开始。', `<button class="button" data-action="add-task">${icon('plus')}创建第一个任务</button>`)}</div>`}<button class="add-row" data-action="add-task">${icon('plus')}为生活添加一件小事</button>`;
  }
  function settingsView() {
    const s = state.settings;
    const elapsed = Math.max(0, C.dayDistance(s.startDate,today)+1);
    const track = Math.min(elapsed/s.planDays,1)*100;
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    return `${top('GROW AT YOUR OWN PACE', '让计划适合你', '自律不是苛刻，而是认真照顾自己的生活。')}
      <div class="settings-grid"><section class="card settings-card"><h2>我的小计划</h2><form id="settings-form"><div class="field"><label for="setting-name">怎么称呼你</label><input id="setting-name" name="name" maxlength="24" value="${esc(s.name)}" placeholder="留空也可以"></div><div class="field"><label for="setting-goal">每天完成几项，就算达标</label><input id="setting-goal" name="goal" type="number" min="1" max="20" required value="${s.goal}"><small>建议从 2–3 项开始。当天任务少于目标时，以当天任务数为准；没有任务时不计为达标。</small></div><div class="input-pair"><div class="field"><label for="setting-start">计划开始日期</label><input id="setting-start" name="startDate" type="date" min="2000-01-01" max="2199-12-31" required value="${s.startDate}"></div><div class="field"><label for="setting-days">计划天数</label><input id="setting-days" name="planDays" type="number" min="1" max="365" required value="${s.planDays}"></div></div><p class="form-error" id="settings-error" role="alert" hidden></p><button class="button" type="submit">${icon('check')}保存我的计划</button></form><div class="plan-track"><span style="width:${track}%"></span></div><div class="plan-info"><span>${elapsed > s.planDays ? '计划周期已结束，习惯可以继续' : elapsed ? `已经走过 ${elapsed} 天` : '新的计划，准备出发'}</span><span>${s.planDays} 天计划</span></div></section>
      <section class="card settings-card"><h2>把小小的进步保存好</h2><p class="settings-description">任务和打卡保存在当前浏览器里，无需账号。不同设备或浏览器不会自动同步；换手机、清理浏览器数据前，记得导出备份。</p><div class="backup-actions"><button class="button outline" data-action="export">${icon('download')}导出备份</button><button class="button outline" data-action="import">${icon('upload')}导入备份</button></div><div class="install-block"><h3>${standalone ? '已经在桌面上陪着你' : '放到手机桌面，随手打开'}</h3>${standalone ? '<p class="settings-description">离线时也能打卡。偶尔连上网络，让应用保持更新。</p>' : `<ol class="install-steps"><li>用安卓 Chrome 打开这个网页。</li><li>点浏览器菜单，选择“添加到主屏幕”或“安装应用”。</li><li>首次打开后，安全连接下可离线使用。</li></ol><p class="hint">应用安装与离线功能需要 HTTPS，电脑上的 localhost 也支持。局域网 HTTP 地址可以在线使用和打卡。</p>${deferredInstall ? `<button class="button secondary" data-action="install">${icon('plus')}安装一点</button>` : ''}`}</div><p class="storage-line">${icon('shield')}${storageBlocked ? '目前仅内存暂存，请先导出备份' : '数据保存在这台设备 · 输入后自动保存'}</p></section></div>`;
  }
  function render() {
    const tab = currentTab();
    document.title = `一点 · ${navs.find(([id]) => id === tab)[2]}`;
    const nav = navs.map(([id, symbol, label]) => `<a href="#${id}" class="nav-item ${id === tab ? 'active' : ''}" ${id === tab ? 'aria-current="page"' : ''}>${icon(symbol)}<span class="nav-label">${label}</span>${id === tab ? '<span class="nav-dot"></span>' : ''}</a>`).join('');
    $('.desktop-nav').innerHTML = nav; $('.bottom-nav').innerHTML = nav;
    $('#main').innerHTML = ({ today: todayView, history: historyView, tasks: tasksView, settings: settingsView })[tab]();
    if (tab === 'today' && $('.week-card')) $('.week-card').outerHTML = E.weekCard();
    if (tab === 'settings') {
      $('.settings-grid').insertAdjacentHTML('afterbegin',E.settingsPanel());
      $('label[for="setting-goal"]').textContent = '常规任务标准完成目标（辅助）';
    }
    if (tab === 'tasks' && !state.execution.starterInstalled) $('.page-top').insertAdjacentHTML('afterend',E.starterCard());
    if (tab === 'history') {
      $('.history-detail').insertAdjacentHTML('beforeend',E.historyPanel(historyDate));
      const week = C.executionWeek(state,today); const cards = document.querySelectorAll('.stat-card');
      cards[0].innerHTML = `<div class="stat-value">${week.startDays}<span>天</span></div><div class="stat-label">近 7 天有开始</div>`;
      cards[1].innerHTML = `<div class="stat-value">${week.workedDays}<span>天</span></div><div class="stat-label">近 7 天主线行动</div>`;
      cards[2].querySelector('.stat-value').innerHTML = `${C.statistics(state,today).totalDone}<span>项</span>`;
      cards[2].querySelector('.stat-label').textContent = '累计标准完成';
      document.querySelectorAll('.calendar-day').forEach(button => {
        const day = state.days[button.dataset.date]; const xp = C.executionProgress(day);
        if (xp.focusMet || xp.minimum) { button.classList.add('hit'); button.classList.remove('partial'); button.querySelector('small').textContent = xp.standard ? `标准 ${xp.standard}` : '最低版'; button.setAttribute('aria-label',`${dateText(button.dataset.date)}，最低版 ${xp.minimum} 项，标准 ${xp.standard} 项`); }
        else if (xp.started) button.classList.add('partial');
      });
      $('.calendar-legend').innerHTML = '<span><i class="legend-dot hit"></i>最低版 / 标准做到</span><span><i class="legend-dot partial"></i>已经开始</span><span><i class="legend-dot"></i>允许留白</span>';
    }
    showStorageWarning();
  }
  function openTask(id = '') {
    if (!id && state.tasks.length >= 200) return toast('最多保留 200 个任务，先整理一下现有的小事吧。');
    const task = state.tasks.find(task => task.id === id) || { title: '', detail: '', category: 'health', time: '', weekdays: [0,1,2,3,4,5,6] };
    $('#task-form').innerHTML = `<input type="hidden" name="id" value="${id}"><div class="modal-header"><h2>${id ? '调整这件小事' : '添加一件小事'}</h2><button type="button" class="icon-button" data-action="close-task" aria-label="关闭">${icon('close')}</button></div><div class="field"><label for="task-title">想坚持做什么</label><input id="task-title" name="title" maxlength="80" required placeholder="比如：每天散步 20 分钟" value="${esc(task.title)}"></div><div class="field"><label for="task-detail">给自己一句小提示（选填）</label><input id="task-detail" name="detail" maxlength="140" placeholder="把任务拆小一点，更容易开始" value="${esc(task.detail)}"></div><fieldset class="field" style="padding:0;border:0"><legend class="field-label" style="margin-bottom:9px">属于生活的哪一部分</legend><div class="category-options">${Object.entries(C.categories).map(([value,label]) => `<label class="category-option"><input type="radio" name="category" value="${value}" ${task.category === value ? 'checked' : ''}>${icon(categoryIcons[value])}${label}</label>`).join('')}</div></fieldset><div class="field"><label for="task-time">计划时间（选填）</label><input id="task-time" name="time" type="time" value="${task.time}"><small>时间只作安排提示；此版本不会推送系统通知。</small></div><fieldset class="field" style="padding:0;border:0"><legend class="field-label">哪些日子做这件事</legend><div class="weekday-options">${[1,2,3,4,5,6,0].map(day => `<label class="weekday-option"><input type="checkbox" name="weekdays" value="${day}" ${task.weekdays.includes(day) ? 'checked' : ''} aria-label="星期${weekLabels[day]}"><span>${weekLabels[day]}</span></label>`).join('')}</div><div class="schedule-presets"><button type="button" class="text-button" data-action="schedule" data-days="0,1,2,3,4,5,6">每天</button><button type="button" class="text-button" data-action="schedule" data-days="1,2,3,4,5">工作日</button><button type="button" class="text-button" data-action="schedule" data-days="0,6">周末</button></div></fieldset><p class="form-error" id="task-error" role="alert" hidden></p><div class="form-actions"><button type="button" class="button secondary" data-action="close-task">取消</button><button type="submit" class="button">${id ? '保存修改' : '添加任务'}</button></div>`;
    $('#task-form .form-actions').insertAdjacentHTML('beforebegin',E.taskFields(task));
    $('#task-dialog').showModal();
    // Avoid opening the keyboard automatically on phones; desktop users can type immediately.
    if (window.innerWidth > 820) $('#task-title').focus();
  }
  function confirmAction(title, body, label, callback, destructive = true) {
    $('#confirm-content').innerHTML = `<h2>${esc(title)}</h2><p>${esc(body)}</p>`;
    $('#confirm-submit').textContent = label;
    $('#confirm-submit').className = `button ${destructive ? 'danger' : ''}`;
    confirmCallback = callback;
    $('#confirm-dialog').showModal();
  }
  function complete(id, date) {
    if (date > today) return;
    const day = state.days[date]; const item = day?.items.find(item => item.id === id);
    if (!item) return;
    const before = C.progress(day).hit;
    item.done = !item.done; const checked = item.done; save(); render();
    const replacement = document.querySelector(`button[data-action="complete"][data-id="${id}"][data-date="${date}"]`);
    replacement?.focus({preventScroll:true});
    if (checked && !before && C.progress(day).hit) {
      toast(storageBlocked ? '小目标达成！请导出备份保存记录。' : date === today ? '今天的小目标达成了，给自己一个肯定 ✦' : '这一天的小目标，也完成了 ✦');
      $('#progress-hero')?.classList.add('goal-celebration');
    } else if (storageBlocked) toast('打卡已暂存，请导出备份。');
  }
  function exportData() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString() },null,2)],{type:'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = `一点备份-${today}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
    toast('备份已生成，记得保管好下载的文件。');
  }
  function rollover() {
    const next = C.dateKey();
    if (next === today) return;
    if (selectedDate === today) selectedDate = next;
    if (historyDate === today) historyDate = next;
    if (calendarMonth === today.slice(0,7)) calendarMonth = next.slice(0,7);
    today = next; ensureToday(); render(); toast('新的一天，继续向前一点。');
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
    if (E.handleAction(button)) return;
    const { action, id, date } = button.dataset;
    switch (action) {
      case 'settings': navigate('settings'); break;
      case 'manage': navigate('tasks'); break;
      case 'add-task': openTask(); break;
      case 'edit-task': openTask(id); break;
      case 'close-task': $('#task-dialog').close(); break;
      case 'cancel-confirm': confirmCallback = null; $('#confirm-dialog').close(); break;
      case 'complete': complete(id,date); break;
      case 'filter': filter = button.dataset.filter; render(); break;
      case 'previous-day': if (selectedDate > '2000-01-01') { selectedDate = C.shiftDate(selectedDate,-1); render(); } break;
      case 'next-day': if (selectedDate < today) { selectedDate = C.shiftDate(selectedDate,1); render(); } break;
      case 'back-today': selectedDate = today; render(); break;
      case 'open-day': selectedDate = date; filter = 'all'; navigate('today'); window.scrollTo(0,0); break;
      case 'previous-month': case 'next-month': {
        const d = C.parseDate(`${calendarMonth}-01`); d.setMonth(d.getMonth()+(action === 'previous-month' ? -1 : 1)); calendarMonth = C.dateKey(d).slice(0,7); render(); break;
      }
      case 'calendar-today': calendarMonth = today.slice(0,7); historyDate = today; render(); break;
      case 'select-history': historyDate = date; render(); break;
      case 'schedule': $('#task-form').querySelectorAll('[name="weekdays"]').forEach(input => { input.checked = button.dataset.days.split(',').includes(input.value); }); break;
      case 'toggle-task': { const task = state.tasks.find(task => task.id === id); if (!task) break; task.enabled = !task.enabled; ensureToday(); render(); toast(task.enabled ? '已启用，按你设定的日子出现在清单里。' : '已暂停，给自己留点空间。'); break; }
      case 'move-task': {
        const index = state.tasks.findIndex(task => task.id === id); const next = index + Number(button.dataset.direction);
        if (index >= 0 && next >= 0 && next < state.tasks.length) { [state.tasks[index],state.tasks[next]] = [state.tasks[next],state.tasks[index]]; ensureToday(); render(); } break;
      }
      case 'delete-task': {
        const task = state.tasks.find(task => task.id === id); if (!task) break;
        confirmAction('删掉这件小事？', `“${task.title}”将从今天和未来的清单中移除，今天该任务的打卡也会移除。过去的记录会保留。`, '删除任务', () => { state.tasks = state.tasks.filter(task => task.id !== id); ensureToday(); render(); toast('任务已删除，过去的足迹仍然保留。'); }); break;
      }
      case 'export': exportData(); break;
      case 'import': $('#import-file').click(); break;
      case 'install': if (deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.then(result => { if (result.outcome === 'accepted') toast('一点已添加到你的应用中。'); deferredInstall = null; if (currentTab() === 'settings') render(); }); } break;
    }
  });
  document.addEventListener('input', event => {
    if (event.target.id !== 'daily-note') return;
    const day = state.days[event.target.dataset.date]; if (!day) return;
    day.note = event.target.value.slice(0,1000); const saved = save();
    $('#note-status').textContent = saved ? '已自动保存' : '仅暂存，请导出备份'; $('#note-count').textContent = `${day.note.length} / 1000`;
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'day-picker') { const value = event.target.value; if (C.validDate(value) && value <= today) { selectedDate = value; render(); } }
  });
  $('#task-form').addEventListener('submit', event => {
    event.preventDefault(); rollover();
    const data = new FormData(event.target); const id = data.get('id'); const original = state.tasks.find(task => task.id === id);
    const weekdays = data.getAll('weekdays').map(Number); const title = String(data.get('title')).trim();
    if (!title || !weekdays.length) { $('#task-error').hidden = false; $('#task-error').textContent = !title ? '给这件小事起个名字吧。' : '至少选择一个要做这件事的日子。'; return; }
    const task = { id: original?.id || C.uid(), title, detail: String(data.get('detail')).trim(), category: data.get('category'), time: data.get('time'), weekdays, enabled: original?.enabled ?? true, createdDate: original?.createdDate || today, ...E.fieldsFromForm(data) };
    try { C.validate({...state,tasks: original ? state.tasks.map(t => t.id === original.id ? task : t) : [...state.tasks,task]}); }
    catch (error) { $('#task-error').hidden = false; $('#task-error').textContent = error.message; return; }
    if (original) state.tasks[state.tasks.indexOf(original)] = task; else state.tasks.push(task);
    ensureToday(); $('#task-dialog').close(); render(); toast(storageBlocked ? '任务已暂存，请导出备份。' : original ? '已调整，找到适合自己的节奏。' : '新的一小步，已经安排好。');
  });
  document.addEventListener('submit', event => {
    if (E.handleSubmit(event)) return;
    if (event.target.id !== 'settings-form') return;
    event.preventDefault();
    const data = new FormData(event.target); const settings = { name: String(data.get('name')).trim(), goal: Number(data.get('goal')), planDays: Number(data.get('planDays')), startDate: data.get('startDate') };
    try { C.validate({...state,settings}); }
    catch (error) { $('#settings-error').hidden = false; $('#settings-error').textContent = error.message; return; }
    state.settings = settings; ensureToday(); render(); toast(storageBlocked ? '计划已暂存，请导出备份。' : '计划已保存，从今天起按自己的节奏来。');
  });
  $('#confirm-form').addEventListener('submit', event => { event.preventDefault(); const callback = confirmCallback; confirmCallback = null; $('#confirm-dialog').close(); callback?.(); });
  $('#confirm-dialog').addEventListener('cancel', () => { confirmCallback = null; });
  $('#import-file').addEventListener('change', async event => {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error('备份文件过大，请选择小于 8 MB 的 JSON 备份。');
      const imported = C.validate(JSON.parse(await file.text()));
      confirmAction('恢复这份备份？', `备份包含 ${imported.tasks.length} 个任务、${Object.keys(imported.days).length} 天记录。导入会替换这台设备的全部现有数据，建议先导出当前备份。`, '导入并替换', () => {
        try { C.syncToday(imported,today); localStorage.setItem(STORAGE_KEY,JSON.stringify(imported)); }
        catch { toast('浏览器未能写入备份，现有数据没有被替换。'); return; }
        state = imported; storageBlocked = false; storageMessage = ''; selectedDate = today; historyDate = today; calendarMonth = today.slice(0,7); render(); toast('备份已恢复，继续向前一点。');
      });
    } catch (error) { toast(error instanceof SyntaxError ? '无法读取这个文件，请选择一点导出的 JSON 备份。' : error.message); }
  });
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0,0); });
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstall = event; if (currentTab() === 'settings') render(); });
  window.addEventListener('appinstalled', () => { deferredInstall = null; if (currentTab() === 'settings') render(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) rollover(); });
  // Other tabs may edit the same local data; reload after those saves to prevent stale overwrite.
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY) return;
    try {
      if (!event.newValue) { storageBlocked = true; storageMessage = '这个浏览器的数据已在其他页面被清理。当前记录仍在内存中，请导出备份，再导入恢复。'; showStorageWarning(); return; }
      state = C.validate(JSON.parse(event.newValue)); storageBlocked = false; render(); toast('已同步此浏览器另一个页面的记录。');
    } catch { storageBlocked = true; storageMessage = '其他页面保存了无法识别的数据。当前记录已暂存，请导出备份。'; showStorageWarning(); }
  });
  setInterval(rollover,30000);
  $('#header-settings').innerHTML = icon('settings');
  ensureToday(); render();
  if ('serviceWorker' in navigator && window.isSecureContext && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => { /* Online use and local saving still work if offline setup is unavailable. */ });
})();
