// The execution coach keeps scheduling, self-reported outcomes, and timers separate.
window.createExecutionCoach = function (ctx) {
  'use strict';
  const { C, icon, esc, save, render, toast, ensureToday, openTask, confirmAction } = ctx;
  const $ = selector => document.querySelector(selector);
  const state = () => ctx.state();
  const today = () => ctx.today();
  const dialog = () => $('#execution-dialog');
  const blockers = { '': '没有明显阻力', 'too-big': '任务太大，不知从哪开始', 'dont-know': '不会做 / 怕做不好', phone: '手机或其他事情分心', energy: '精力不足', forgot: '没有固定开始时间' };
  let resultContext = null;
  const options = current => Object.entries(blockers).map(([value,label]) => `<option value="${value}" ${current === value ? 'selected' : ''}>${label}</option>`).join('');
  const head = title => `<div class="modal-header"><h2>${title}</h2><button type="button" class="icon-button" data-action="coach-close" aria-label="关闭">${icon('close')}</button></div>`;
  const errorBox = '<p class="form-error" id="coach-error" role="alert" hidden></p>';
  function show(html) { $('#execution-content').innerHTML = html; if (!dialog().open) dialog().showModal(); }
  function fail(message) { const error = $('#coach-error'); if (error) { error.textContent = message; error.hidden = false; } else toast(message); }
  function update() { save(); render(); }
  function focusTask(day) { return day?.items.find(item => item.id === day.focusId); }
  function sessionTask() { const s = state().session; return s && state().days[s.date]?.items.find(item => item.id === s.taskId); }
  function dueLabel(point) {
    const delta = new Date(point.due).getTime() - Date.now();
    if (point.done) return '已交付';
    if (delta < 0) return '已过约定时间 · 重新安排或交一份最小成果';
    if (delta < 3600000) return `还剩 ${Math.max(1,Math.ceil(delta/60000))} 分钟`;
    if (delta < 86400000) return `还剩 ${Math.ceil(delta/3600000)} 小时`;
    return `${point.due.slice(5,10).replace('-','月')}日 ${point.due.slice(11)} 前`;
  }
  function starterCard() {
    return `<section class="starter-banner"><span class="starter-symbol">${icon('book')}</span><div><h3>为算法岗，先建立 7 天的起步节奏</h3><p>LeetCode、八股、项目表达、岗位准备。每天只选一件主线，先做最低版。</p></div><button class="button" data-action="coach-starter">查看起步包 ${icon('right')}</button></section>`;
  }
  function todayPanel(day) {
    const s = state(); const task = focusTask(day); const p = C.executionProgress(day); const week = C.executionWeek(s,today());
    const missed = s.execution.starterInstalled && C.dayDistance(s.execution.startDate,today()) >= 2 && !C.executionProgress(s.days[C.shiftDate(today(),-1)]).started && !C.executionProgress(s.days[C.shiftDate(today(),-2)]).started;
    const yesterday = s.days[C.shiftDate(today(),-1)]?.review;
    const point = s.checkpoints.filter(p => !p.done).sort((a,b) => a.due.localeCompare(b.due))[0];
    const active = s.session;
    return `${!s.execution.starterInstalled ? starterCard() : ''}${active ? `<div class="session-banner"><span>${icon('sun')}有一轮${C.sessionRemaining(active) === 0 ? '待记录成果' : active.runningSince === null ? '已暂停的专注' : '正在进行的专注'}：${esc(sessionTask()?.title || '任务')}</span><button class="text-button" data-action="coach-resume">${C.sessionRemaining(active) === 0 ? '记录结果' : '回到专注'} ${icon('right')}</button></div>` : ''}
      ${missed ? `<div class="restart-banner">${icon('leaf')}不用补前两天。今天只恢复一个 2 分钟的开头。<button class="text-button" data-action="coach-start" data-id="${task?.id || ''}" data-mode="rescue">现在重启</button></div>` : ''}
      ${task ? `<section class="mission-card ${p.focusMet ? 'mission-met' : ''}"><div class="mission-heading"><span class="mission-eyebrow">${icon('target')}今天只守住这一件</span><button class="text-button" data-action="coach-choose">换一件 ${icon('down')}</button></div><h2>${esc(task.title)}</h2><div class="mission-levels"><div><span class="level-label">最低版 · ${task.minMinutes} 分钟</span><p>${esc(task.minimumAction)}</p></div><div><span class="level-label">标准版 · ${task.focusMinutes} 分钟</span><p>${esc(task.criterion)}</p></div></div><div class="mission-cue">${icon('sun')}<span>${esc(task.cue || (task.time ? `${task.time}，坐到固定位置，先打开要用的材料` : '选一个固定时刻、固定位置，先打开要用的材料'))}</span></div>${yesterday?.nextStep ? `<p class="next-step-note">昨天给今天留的第一步：${esc(yesterday.nextTime)} ${esc(yesterday.nextStep)}</p>` : ''}${p.focusMet ? `<div class="mission-success">${icon('check')}今天的主线最低版已做到。${task.done ? '标准成果也已记录。' : '有余力，再向标准版走一步。'}</div><p class="earned-reward">给自己的奖励：${esc(s.execution.reward || '安心休息一会儿')}</p><div class="mission-buttons"><button class="button secondary" data-action="coach-start" data-id="${task.id}" data-mode="standard">${task.done ? '再专注一轮' : '继续标准版'}</button><button class="text-button" data-action="coach-review">给明天留个开头 ${icon('right')}</button></div>` : `<div class="mission-buttons"><button class="button start-button" data-action="coach-start" data-id="${task.id}" data-mode="minimum">${icon('right')}只开始 ${task.minMinutes} 分钟</button><button class="button secondary" data-action="coach-start" data-id="${task.id}" data-mode="standard">专注 ${task.focusMinutes} 分钟</button></div><div class="mission-bottom"><button class="text-button" data-action="coach-stuck">我现在不想做 / 卡住了</button><button class="text-button" data-action="coach-outcome" data-id="${task.id}" data-date="${today()}">已经做了，记成果 ${icon('pen')}</button></div>`}<p class="mission-footnote">最低版也算行动；计时结束后按实际成果记录，不会自动算完成。</p></section>` : '<div class="card empty-state"><h3>今天没有安排主线</h3><p>可以休息，也可以添加一件很小的事。</p><button class="button" data-action="add-task">添加任务</button></div>'}
      <div class="execution-strip"><div><strong>${p.started}</strong><span>件已开始</span></div><div><strong>${p.minimum}</strong><span>件做到最低版</span></div><div><strong>${p.standard}</strong><span>件标准完成</span></div><div><strong>${week.workedDays}<small> / ${s.execution.weeklyDays}</small></strong><span>近 7 天主线行动日</span></div></div>
      <div class="checkpoint-preview"><div><span class="mission-eyebrow">${icon('calendar')}把 deadline 拉近一点</span><h3>${point ? esc(point.title) : '给这一周约一个小验收'}</h3><p>${point ? esc(dueLabel(point)) + (point.reviewer ? ` · 与 ${esc(point.reviewer)} 约定` : ' · 可选一位同学验收') : '明确日期 + 交付物；有同学约好验收，更容易把它当真。'}</p></div><button class="text-button" data-action="coach-checkpoints">${point ? '查看 / 交付' : '设截止点'}${icon('right')}</button></div>`;
  }
  function historyPanel(date) {
    const day = state().days[date]; if (!day) return '';
    const p = C.executionProgress(day); const records = day.sessions || [];
    return `<section class="evidence-card"><div class="section-bar"><h3>行动与实际成果</h3><span class="hint">已开始 ${p.started} · 最低版 ${p.minimum} · 标准 ${p.standard}</span></div>${records.length ? records.slice().reverse().map(record => `<div class="evidence-record"><div><span class="level-chip ${record.level}">${record.level === 'standard' ? '标准版' : record.level === 'minimum' ? '最低版' : '尝试过'}</span><strong>${esc(record.title)}</strong><small>${Math.round(record.seconds/60)} 分钟 · 自己记录</small></div><p>${esc(record.evidence || '暂时没有产出，已经记录这次尝试。')}</p>${record.blocker ? `<small>卡点：${esc(blockers[record.blocker] || record.blocker)}</small>` : ''}${record.nextStep ? `<small>下一步：${esc(record.nextStep)}</small>` : ''}</div>`).join('') : '<p class="hint">还没有成果记录。旧版打卡仍然保留。</p>'}</section>`;
  }
  function weekCard() {
    const s = state(); const w = C.executionWeek(s,today());
    const task = focusTask(s.days[today()]);
    const counts = {};
    for (const record of w.sessions) if (record.blocker) counts[record.blocker] = (counts[record.blocker] || 0) + 1;
    const repeated = Object.entries(counts).sort((a,b) => b[1]-a[1])[0];
    let advice = '先练回来开始，每周允许有几天留白。';
    if (w.workedDays >= s.execution.weeklyDays && w.standard === 0) advice = '你已经能回来开始了。接下来选两天做标准版，把开始变成面试可讲的成果。';
    else if (repeated?.[1] >= 2) advice = `最近有 ${repeated[1]} 次记录「${blockers[repeated[0]] || repeated[0]}」。下一轮先用“我卡住了”把这个阻力缩小。`;
    else if (w.startDays >= 2 && w.workedDays === 0) advice = '你已经开始过，但还没留下最低版成果。把第一步缩小到一句话或一个例子。';
    return `<section class="card week-card"><div class="card-heading">${icon('calendar')}<h3>近 7 天的小脚印</h3></div><div class="week-days">${w.dates.map(date => { const p = C.executionProgress(s.days[date]); return `<div class="week-day ${date === today() ? 'current' : ''}" aria-label="${date}，${p.focusMet ? '主线最低版已做' : p.started ? '已经开始' : '留白'}"><span>${date.slice(5).replace('-','/')}</span><span class="week-mark ${p.focusMet ? 'hit' : p.started ? 'partial' : ''}">${p.focusMet ? icon('check') : p.started ? '·' : '—'}</span></div>`; }).join('')}</div><p class="week-caption">${icon('leaf')}主线行动 ${w.workedDays} / ${s.execution.weeklyDays} 天，记录标准成果 ${w.standard} 次。</p><p class="weekly-advice">${esc(advice)}</p>${task && w.workedDays >= s.execution.weeklyDays && w.standard === 0 ? `<button class="text-button" data-action="coach-start" data-id="${task.id}" data-mode="standard">试一次标准版 ${icon('right')}</button>` : '<button class="text-button" data-action="coach-report">看具体成果，而不是只看连续天数 '+icon('right')+'</button>'}</section>`;
  }
  function settingsPanel() {
    const e = state().execution;
    return `<section class="card settings-card execution-settings"><h2>让开始更容易</h2><form id="execution-settings-form"><div class="field"><label for="weekly-days">近 7 天，做到主线最低版的目标天数</label><input id="weekly-days" name="weeklyDays" type="number" min="1" max="7" required value="${e.weeklyDays}"><small>起步建议 4 天。允许留白，关注回来继续做。</small></div><div class="field"><label for="execution-reward">做完主线后，给自己一个小奖励</label><input id="execution-reward" name="reward" maxlength="140" value="${esc(e.reward)}" placeholder="比如：安心看一集喜欢的视频"></div><button class="button" type="submit">保存执行节奏</button></form><div class="coach-settings-actions"><button class="button outline" data-action="coach-checkpoints">${icon('calendar')}小截止点</button><button class="button outline" data-action="coach-report">${icon('pen')}7 天行动报告</button>${!e.starterInstalled ? '<button class="button secondary" data-action="coach-starter">启用算法岗起步包</button>' : ''}</div><p class="hint">不会自动发送报告或催促别人，也不会在后台推送。可以把固定开始时间设到手机闹钟里。</p></section>`;
  }
  function taskFields(task) {
    const b = C.behavior(task);
    return `<div class="task-execution-fields"><div class="field"><label class="checkbox-line"><input type="checkbox" name="essential" ${b.essential ? 'checked' : ''}>这是推进实习 / 重要目标的主线任务</label></div><div class="field"><label for="task-kind">任务方向</label><select id="task-kind" name="kind">${Object.entries(C.kinds).map(([value,label]) => `<option value="${value}" ${value === b.kind ? 'selected' : ''}>${label}</option>`).join('')}</select></div><div class="field"><label for="task-minimum">没动力时，也能做的第一步</label><textarea id="task-minimum" name="minimumAction" maxlength="240" placeholder="比如：打开一道题，写出输入和输出">${esc(b.minimumAction)}</textarea></div><div class="field"><label for="task-criterion">做到什么，算标准完成</label><textarea id="task-criterion" name="criterion" maxlength="360" placeholder="写具体交付物，比如：尝试一题，并写出思路或卡点">${esc(b.criterion)}</textarea></div><details class="advanced-execution"><summary>安排开始时刻、时长和卡住后的办法</summary><div class="input-pair"><div class="field"><label for="task-min-minutes">最低版（分钟）</label><input id="task-min-minutes" name="minMinutes" type="number" min="1" max="15" required value="${b.minMinutes}"></div><div class="field"><label for="task-focus-minutes">标准版（分钟）</label><input id="task-focus-minutes" name="focusMinutes" type="number" min="1" max="120" required value="${b.focusMinutes}"></div></div><div class="field"><label for="task-cue">当什么发生 / 在哪里，就开始</label><input id="task-cue" name="cue" maxlength="240" value="${esc(b.cue)}" placeholder="早餐后，坐到书桌，手机翻面，打开题目"></div><div class="field"><label for="task-obstacle">如果卡住，我就……</label><textarea id="task-obstacle" name="obstaclePlan" maxlength="360" placeholder="10 分钟没思路，就先写暴力解或看一小段题解">${esc(b.obstaclePlan)}</textarea></div><div class="field"><label for="task-resource">直接打开的材料链接（选填）</label><input id="task-resource" name="resource" type="url" maxlength="1000" value="${esc(b.resource)}" placeholder="https://..."><small>链接须为 HTTPS。</small></div></details></div>`;
  }
  function fieldsFromForm(data) { return { essential: data.has('essential'), kind: data.get('kind') || 'other', minimumAction: String(data.get('minimumAction') || '').trim() || '打开材料，先认真做第一小步', criterion: String(data.get('criterion') || '').trim() || '完成任务，并记录一个实际结果', cue: String(data.get('cue') || '').trim(), obstaclePlan: String(data.get('obstaclePlan') || '').trim(), minMinutes: Number(data.get('minMinutes') || 5), focusMinutes: Number(data.get('focusMinutes') || 25), resource: String(data.get('resource') || '').trim() }; }
  function taskBadge(item) { return `${item.essential ? '<span class="level-chip core">主线</span>' : ''}${item.minimumDone && !item.done ? '<span class="level-chip minimum">最低版已做</span>' : ''}`; }
  function guard(id) { if (state().session?.taskId === id) { toast('这件事正在专注中，请先记录这一轮的结果，再修改安排。'); return true; } return false; }
  function start(id, mode = 'minimum', initialBlocker = '') {
    if (state().session) return showSession();
    ensureToday();
    const item = state().days[today()].items.find(item => item.id === id); if (!item) return toast('今天没有安排这件事，请先选一件任务。');
    const minutes = mode === 'rescue' ? 2 : mode === 'standard' ? item.focusMinutes : item.minMinutes;
    const now = Date.now(); item.startedAt ||= now;
    state().session = { id: C.uid(), taskId: id, date: today(), mode, plannedMs: minutes*60000, remainingMs: minutes*60000, runningSince: now, createdAt: now, initialBlocker };
    update(); showSession();
  }
  function showSession() {
    const s = state().session; const item = sessionTask(); if (!s || !item) return;
    if (C.sessionRemaining(s) <= 0) return showOutcome(s.taskId,s.date,true);
    const action = s.mode === 'standard' ? item.criterion : s.mode === 'rescue' ? '只打开材料，写出第一句话或一个例子。2 分钟后再决定。' : item.minimumAction;
    show(`${head('这一轮，只做这一件')}<div class="focus-timer"><span class="level-chip">${s.mode === 'standard' ? '标准版' : s.mode === 'rescue' ? '2 分钟重启' : '最低版'}</span><h3>${esc(item.title)}</h3><div id="focus-clock" class="focus-clock" aria-label="剩余时间"></div><div class="focus-bar"><span id="focus-bar-fill"></span></div><p class="focus-instruction">${esc(action)}</p>${item.resource ? `<a class="button outline resource-link" href="${esc(item.resource)}" target="_blank" rel="noopener noreferrer">打开题目 / 材料 ${icon('right')}</a>` : ''}<p class="hint">把手机翻面，用电脑或手边材料做这一步。回来后记录实际结果。</p><div class="focus-controls"><button class="button secondary" data-action="coach-pause" id="focus-pause">${s.runningSince === null ? '继续计时' : '暂停'}</button><button class="button" data-action="coach-finish">结束并记结果</button></div><button class="text-button" data-action="coach-close">收起计时，继续做 ${icon('down')}</button></div>`);
    tick();
  }
  function tick() {
    const s = state().session;
    if (!s) { if ($('#focus-clock')) dialog().close(); return; }
    const left = C.sessionRemaining(s);
    const clock = $('#focus-clock'); if (!clock) return;
    if (left <= 0) { s.remainingMs = 0; s.runningSince = null; save(); return showOutcome(s.taskId,s.date,true); }
    const seconds = Math.ceil(left/1000);
    clock.textContent = `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
    $('#focus-bar-fill').style.width = `${100*(1-left/s.plannedMs)}%`;
    $('#focus-pause').textContent = s.runningSince === null ? '继续计时' : '暂停';
  }
  function showOutcome(id,date,fromSession = false) {
    const item = state().days[date]?.items.find(item => item.id === id); if (!item) return;
    const s = fromSession ? state().session : null;
    let seconds = 0;
    if (s) { const left = C.sessionRemaining(s); seconds = Math.round((s.plannedMs-left)/1000); s.remainingMs = left; s.runningSince = null; save(); }
    resultContext = {id,date,seconds,sessionId:s?.id || ''};
    show(`${head('这一轮，实际做到了什么？')}<form id="outcome-form"><p class="result-task">${esc(item.title)}</p><div class="outcome-options"><label><input type="radio" name="level" value="attempt" checked><span><strong>尝试过，暂时没成果</strong><small>也记录这次开始，找到卡点</small></span></label><label><input type="radio" name="level" value="minimum"><span><strong>最低版做到了</strong><small>${esc(item.minimumAction)}</small></span></label><label><input type="radio" name="level" value="standard"><span><strong>标准版做到了</strong><small>${esc(item.criterion)}</small></span></label></div><div class="field"><label for="outcome-evidence">留下一个实际结果 / 卡点</label><textarea id="outcome-evidence" name="evidence" maxlength="1000" placeholder="比如：两数之和；想到了暴力解，哈希表查找顺序还不熟"></textarea><small>自己如实记录；只计时、只打开页面，不等于已经学会。</small></div><div class="input-pair"><div class="field"><label for="outcome-minutes">实际投入（分钟）</label><input id="outcome-minutes" name="minutes" type="number" min="0" max="120" required value="${Math.floor(seconds/60)}"></div><div class="field"><label for="outcome-blocker">主要卡点</label><select id="outcome-blocker" name="blocker">${options(s?.initialBlocker || '')}</select></div></div><div class="field"><label for="outcome-next">下次一打开，就先做什么（选填）</label><input id="outcome-next" name="nextStep" maxlength="240" placeholder="比如：用 [2,7,11,15] 手推一次哈希表"></div>${errorBox}<div class="form-actions">${s ? '<button type="button" class="button secondary" data-action="coach-resume-timer">回到这一轮</button>' : '<button type="button" class="button secondary" data-action="coach-close">取消</button>'}<button class="button" type="submit">如实保存这一步</button></div></form>`);
  }
  function showStuck() {
    const task = focusTask(state().days[today()]); if (!task) return;
    show(`${head('先把阻力变小')}<div class="stuck-options"><button data-action="coach-rescue" data-id="${task.id}" data-blocker="too-big"><strong>任务太大，开始不了</strong><span>今天先打开材料、写一句话。只做 2 分钟。</span></button><button data-action="coach-rescue" data-id="${task.id}" data-blocker="dont-know"><strong>不会做，怕浪费时间</strong><span>${esc(task.obstaclePlan || '先写下不懂的一个点，再找一个例子。暂时不会也可以记录。')}</span></button><button data-action="coach-rescue" data-id="${task.id}" data-blocker="phone"><strong>一直想刷手机</strong><span>先把手机放到够不到的位置；材料打开后，再做 2 分钟。</span></button><button data-action="coach-rescue" data-id="${task.id}" data-blocker="energy"><strong>今天真的没精力</strong><span>可以只做最低版，也可以休息。不给明天加倍的欠账。</span></button></div><button class="text-button" data-action="coach-review">今天先休息，给明天留个开头 ${icon('right')}</button>`);
  }
  function showStarter() {
    if (state().session) return toast('先结束正在进行的专注，再启用起步包。');
    show(`${head('7 天实习起步包')}<form id="starter-form"><p class="settings-description">第一周先练“回来开始”。每天守住一件主线最低版，有余力再做标准版。算法方向不同，八股问题和项目内容由你自行调整。</p><div class="starter-items">${C.starterTasks(today()).map(task => `<div><span class="level-chip core">${C.kinds[task.kind]}</span><h3>${esc(task.title)}</h3><p>${esc(task.minimumAction)}</p><small>${task.weekdays.length === 7 ? '每天安排，可任选其一' : task.kind === 'project' ? '周一 / 三 / 五' : '周二 / 六'} · 最低 ${task.minMinutes} 分钟</small></div>`).join('')}</div><p class="hint">附带第 3、5、7 天的成果截止点，日期、交付物和验收人都能改。</p><label class="checkbox-line"><input type="checkbox" name="pauseOld" checked>暂时暂停旧任务，让今天的清单更短（之后可恢复）</label>${errorBox}<div class="form-actions"><button type="button" class="button secondary" data-action="coach-close">再想想</button><button class="button" type="submit">启用我的起步计划</button></div></form>`);
  }
  function showChoose() {
    const day = state().days[today()];
    show(`${head('今天，只守住哪一件？')}<p class="settings-description">优先选能推进实习的任务。其他事情有余力再做。</p><div class="choose-mission">${day.items.map(item => `<button class="${item.id === day.focusId ? 'selected' : ''}" data-action="coach-set-focus" data-id="${item.id}">${taskBadge(item)}<strong>${esc(item.title)}</strong><small>${esc(item.minimumAction)}</small>${icon('right')}</button>`).join('')}</div>`);
  }
  function showReview() {
    const day = state().days[today()]; const r = day.review;
    show(`${head('给明天，留一个容易的开头')}<form id="review-form"><p class="settings-description">不写宏大计划。只约定什么时候开始、第一步做什么。</p><div class="field"><label for="review-blocker">今天最大的阻力</label><select id="review-blocker" name="blocker">${options(r.blocker)}</select></div><div class="field"><label for="review-time">明天的开始时间</label><input id="review-time" name="nextTime" type="time" value="${r.nextTime || '10:00'}"></div><div class="field"><label for="review-next">坐下来后，第一步就……</label><input id="review-next" name="nextStep" maxlength="240" required value="${esc(r.nextStep)}" placeholder="打开两数之和，手推一个例子"></div><p class="hint">把这个时间也设成手机闹钟；闹钟标题直接写第一步。网页关闭时不会自动提醒。</p>${errorBox}<div class="form-actions"><button type="button" class="button secondary" data-action="coach-close">取消</button><button class="button" type="submit">保存明天的开头</button></div></form>`);
  }
  function showCheckpoints() {
    const points = state().checkpoints.slice().sort((a,b) => a.due.localeCompare(b.due));
    show(`${head('小截止点，真实交一份成果')}<p class="settings-description">每隔几天交一份小成果。可以自己验收，也可以先和同学约好时间；填验收人不会自动联系对方。</p><div class="checkpoint-list">${points.map(point => `<article class="checkpoint-item ${point.done ? 'delivered' : ''}"><span class="level-chip">${esc(dueLabel(point))}</span><h3>${esc(point.title)}</h3><p>${esc(point.deliverable)}</p><small>验收：${esc(point.reviewer || '自己；可约一位同学')}</small>${point.evidence ? `<p class="checkpoint-evidence">已交付：${esc(point.evidence)}</p>` : ''}<div class="checkpoint-actions"><button class="text-button" data-action="coach-edit-checkpoint" data-id="${point.id}">修改约定</button>${!point.done ? `<button class="button secondary" data-action="coach-deliver" data-id="${point.id}">交成果</button>` : `<button class="text-button" data-action="coach-undo-checkpoint" data-id="${point.id}">撤销交付</button>`}<button class="icon-button small" data-action="coach-delete-checkpoint" data-id="${point.id}" aria-label="删除截止点">${icon('trash')}</button></div></article>`).join('') || '<p class="hint">还没有截止点。先定一个小到能交出来的成果。</p>'}</div><div class="form-actions"><button class="button outline" data-action="coach-report">生成 7 天报告</button><button class="button" data-action="coach-edit-checkpoint">${icon('plus')}新截止点</button></div>`);
  }
  function editCheckpoint(id = '') {
    if (!id && state().checkpoints.length >= 100) return toast('最多保留 100 个截止点，先整理一下。');
    const point = state().checkpoints.find(p => p.id === id) || {title:'',deliverable:'',reviewer:'',due:`${C.shiftDate(today(),2)}T20:00`};
    show(`${head('约一个能交出来的小成果')}<form id="checkpoint-form"><input type="hidden" name="id" value="${id}"><div class="field"><label for="checkpoint-title">这一站要完成什么</label><input id="checkpoint-title" name="title" required maxlength="80" value="${esc(point.title)}" placeholder="把前两道题讲给同学听"></div><div class="field"><label for="checkpoint-due">明确的截止日期和时间</label><input id="checkpoint-due" name="due" type="datetime-local" min="2000-01-01T00:00" max="2199-12-31T23:59" required value="${point.due}"></div><div class="field"><label for="checkpoint-deliverable">验收时，具体交什么</label><textarea id="checkpoint-deliverable" name="deliverable" maxlength="360" required placeholder="两道题的思路和卡点 + 3 个八股问题的口述提纲">${esc(point.deliverable)}</textarea></div><div class="field"><label for="checkpoint-reviewer">谁来验收（选填）</label><input id="checkpoint-reviewer" name="reviewer" maxlength="80" value="${esc(point.reviewer)}" placeholder="比如：同学小王 / 自己录音验收"><small>约对方时间需要你自己沟通；这里只记录约定。</small></div>${errorBox}<div class="form-actions"><button type="button" class="button secondary" data-action="coach-checkpoints">返回</button><button class="button" type="submit">保存约定</button></div></form>`);
  }
  function showDeliver(id) {
    const point = state().checkpoints.find(p => p.id === id); if (!point) return;
    show(`${head('交一份真实的成果')}<form id="deliver-form"><input type="hidden" name="id" value="${id}"><h3>${esc(point.title)}</h3><p class="settings-description">约定交付：${esc(point.deliverable)}</p><div class="field"><label for="deliver-evidence">实际交了什么 / 文件位置 / 讲给谁听了</label><textarea id="deliver-evidence" name="evidence" required maxlength="1000" placeholder="如：完成两题复盘，文档在……，已向同学演示"></textarea></div>${errorBox}<div class="form-actions"><button type="button" class="button secondary" data-action="coach-checkpoints">返回</button><button class="button" type="submit">记录这份交付</button></div></form>`);
  }
  function reportText() {
    const s = state(); const w = C.executionWeek(s,today());
    const lines = [`一点 · 近 7 天实习准备报告（${w.dates[0]} — ${today()}）`,`开始了 ${w.startDays} 天；做到当天主线最低版 ${w.workedDays} 天；记录标准版成果 ${w.standard} 次。`,`投入时间（自己记录）：${w.minutes} 分钟。`,'','具体成果 / 尝试：'];
    for (const r of w.sessions) lines.push(`${r.date}｜${r.title}｜${r.level === 'standard' ? '标准版' : r.level === 'minimum' ? '最低版' : '尝试'}：${r.evidence || '暂时无成果'}${r.blocker ? `；卡点：${blockers[r.blocker] || r.blocker}` : ''}`);
    if (!w.sessions.length) lines.push('这 7 天还没有记录实际成果。');
    lines.push('','下一个截止点：');
    const point = s.checkpoints.filter(p => !p.done).sort((a,b) => a.due.localeCompare(b.due))[0];
    lines.push(point ? `${point.due.replace('T',' ')}｜${point.title}｜交付：${point.deliverable}｜验收：${point.reviewer || '自己'}` : '暂未设置。');
    const review = s.days[today()]?.review;
    if (review?.nextStep) lines.push('',`下次启动：${review.nextTime} ${review.nextStep}`);
    return lines.join('\n');
  }
  function showReport() { show(`${head('把行动交给自己看')}<p class="settings-description">可以手动复制给约好验收的同学。只包含自己记录的事实，尝试、最低版和标准版分开列出。</p><textarea id="report-text" class="report-text" readonly aria-label="近 7 天行动报告">${esc(reportText())}</textarea><div class="form-actions"><button class="button outline" data-action="coach-download-report">下载文本</button><button class="button" data-action="coach-copy-report">复制报告</button></div>`); }
  function handleAction(button) {
    const {action,id,date,mode} = button.dataset;
    if (['delete-task','toggle-task','edit-task'].includes(action) && guard(id)) return true;
    if (action === 'complete') {
      const item = state().days[date]?.items.find(item => item.id === id);
      if (item?.essential && !item.done) { showOutcome(id,date,state().session?.taskId === id && state().session?.date === date); return true; }
      if (item?.essential && item.done) { resetOutcome(id,date); return true; }
    }
    if (!action.startsWith('coach-')) return false;
    switch (action) {
      case 'coach-close': dialog().close(); break;
      case 'coach-starter': showStarter(); break;
      case 'coach-start': start(id,mode); break;
      case 'coach-rescue': start(id,'rescue',button.dataset.blocker); break;
      case 'coach-stuck': showStuck(); break;
      case 'coach-resume': showSession(); break;
      case 'coach-pause': { const s = state().session; if (!s) break; s.remainingMs = C.sessionRemaining(s); s.runningSince = s.runningSince === null ? Date.now() : null; save(); tick(); render(); break; }
      case 'coach-finish': { const s = state().session; if (s) showOutcome(s.taskId,s.date,true); break; }
      case 'coach-resume-timer': { const s = state().session; if (!s) break; if (C.sessionRemaining(s) <= 0) { toast('这轮时间已经结束，按实际结果保存即可。'); break; } s.runningSince = Date.now(); save(); showSession(); break; }
      case 'coach-outcome': showOutcome(id,date || today()); break;
      case 'coach-reset-outcome': resetOutcome(id,date); break;
      case 'coach-choose': showChoose(); break;
      case 'coach-set-focus': state().days[today()].focusId = id; update(); dialog().close(); break;
      case 'coach-review': showReview(); break;
      case 'coach-checkpoints': showCheckpoints(); break;
      case 'coach-edit-checkpoint': editCheckpoint(id); break;
      case 'coach-deliver': showDeliver(id); break;
      case 'coach-undo-checkpoint': { const p = state().checkpoints.find(p => p.id === id); if (p) { p.done = false; p.evidence = ''; update(); showCheckpoints(); } break; }
      case 'coach-delete-checkpoint': dialog().close(); confirmAction('删除这个截止点？','这条截止约定和它的交付记录会被移除，每日学习记录仍然保留。','删除',() => { state().checkpoints = state().checkpoints.filter(p => p.id !== id); update(); showCheckpoints(); }); break;
      case 'coach-report': showReport(); break;
      case 'coach-copy-report': {
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(reportText()).then(() => toast('报告已复制，由你决定发给谁。')).catch(() => { $('#report-text').select(); toast('请长按报告文字复制，或下载文本。'); });
        else { $('#report-text').select(); toast('请长按报告文字复制，或下载文本。'); } break;
      }
      case 'coach-download-report': { const url = URL.createObjectURL(new Blob([reportText()],{type:'text/plain;charset=utf-8'})); const a = document.createElement('a'); a.href = url; a.download = `一点行动报告-${today()}.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); break; }
    }
    return true;
  }
  function resetOutcome(id,date) {
    confirmAction('撤销这件事的成果标记？','最低版和标准完成标记都会撤销，开始过的记录保留。报告中的对应成果会改记为尝试。','撤销成果',() => {
      const day = state().days[date]; const item = day?.items.find(item => item.id === id); if (!item) return;
      item.done = false; item.minimumDone = false; item.evidence = '';
      for (const record of day.sessions) if (record.taskId === id && record.level !== 'attempt') { record.level = 'attempt'; record.evidence = `已撤销成果标记；${record.evidence}`.slice(0,1000); }
      update(); toast('成果标记已撤销，尝试记录仍在。');
    });
  }
  function handleSubmit(event) {
    const form = event.target;
    // Named form controls may shadow form.id; read the DOM attribute explicitly.
    const formId = form.getAttribute('id');
    if (!['outcome-form','starter-form','review-form','checkpoint-form','deliver-form','execution-settings-form'].includes(formId)) return false;
    event.preventDefault(); const data = new FormData(form);
    try {
      if (formId === 'outcome-form') {
        if (!resultContext) throw new Error('请重新选择要记录的任务。');
        if (resultContext.sessionId && state().session?.id !== resultContext.sessionId) throw new Error('这一轮已在其他页面变动，请关闭后重新打开。');
        const minutes = Number(data.get('minutes'));
        if (!Number.isFinite(minutes) || minutes < 0 || minutes > 120) throw new Error('实际投入请填写 0–120 分钟。');
        const result = C.recordOutcome(state(),resultContext.date,resultContext.id,{level:data.get('level'),evidence:data.get('evidence'),seconds:minutes*60,blocker:data.get('blocker'),nextStep:data.get('nextStep')});
        if (resultContext.sessionId) state().session = null;
        if (result.nextStep) state().days[resultContext.date].review.nextStep = result.nextStep;
        resultContext = null; update(); dialog().close(); toast(result.level === 'attempt' ? '记录了这次开始。下一步把阻力再缩小一点。' : result.level === 'minimum' ? '最低版做到了。今天没有白过。' : '标准成果已记录，这一步扎扎实实。');
      } else if (formId === 'starter-form') {
        if (state().execution.starterInstalled) throw new Error('起步包已经启用；可以在任务页自由调整。');
        if (state().tasks.length + 4 > 200) throw new Error('现有任务过多，请先整理到 196 项以内。');
        if (data.has('pauseOld')) state().tasks.forEach(task => { task.enabled = false; });
        state().tasks.unshift(...C.starterTasks(today())); state().execution.starterInstalled = true; state().execution.startDate = today();
        const seeds = [['第 3 天：交一份学习小样','2 道题的思路 / 卡点复盘 + 3 个基础问题的口述提纲',2],['第 5 天：把项目讲出来','一段 3 分钟项目讲述 + 2 个目标岗位的要求对照',4],['第 7 天：做一次小模拟','20 分钟自测或同学模拟：1 题、2 个基础问题、1 个项目；写下下周一个缺口',6]];
        state().checkpoints.push(...seeds.map(([title,deliverable,offset]) => ({id:C.uid(),title,deliverable,reviewer:'',due:`${C.shiftDate(today(),offset)}T20:00`,done:false,evidence:''})));
        ensureToday(); render(); dialog().close(); ctx.navigate('today'); toast('起步计划已启用。现在只开始第一件的 5 分钟。');
      } else if (formId === 'review-form') {
        state().days[today()].review = {blocker:data.get('blocker'),nextStep:String(data.get('nextStep')).trim(),nextTime:data.get('nextTime')}; update(); dialog().close(); toast('明天的开头已保存。给手机设一个同名闹钟吧。');
      } else if (formId === 'checkpoint-form') {
        const id = data.get('id'); const old = state().checkpoints.find(p => p.id === id);
        const point = {id:old?.id || C.uid(),title:String(data.get('title')).trim(),deliverable:String(data.get('deliverable')).trim(),reviewer:String(data.get('reviewer')).trim(),due:data.get('due'),done:old?.done || false,evidence:old?.evidence || ''};
        const candidate = old ? state().checkpoints.map(p => p.id === id ? point : p) : [...state().checkpoints,point];
        C.validate({...state(),checkpoints:candidate}); state().checkpoints = candidate; update(); showCheckpoints(); toast('约定已保存。选验收人时，记得自己先约好时间。');
      } else if (formId === 'deliver-form') {
        const point = state().checkpoints.find(p => p.id === data.get('id')); if (!point) throw new Error('截止点已变动。');
        const evidence = String(data.get('evidence')).trim(); if (!evidence) throw new Error('先写下交付了什么。');
        point.done = true; point.evidence = evidence; update(); showCheckpoints(); toast('这份交付，留下了真实的进步。');
      } else {
        const weeklyDays = Number(data.get('weeklyDays')); if (!Number.isInteger(weeklyDays) || weeklyDays < 1 || weeklyDays > 7) throw new Error('每周行动目标请填写 1–7 天。');
        state().execution.weeklyDays = weeklyDays; state().execution.reward = String(data.get('reward')).trim(); update(); toast('执行节奏已保存。');
      }
    } catch (error) { fail(error.message); }
    return true;
  }
  setInterval(tick,1000);
  document.addEventListener('visibilitychange',() => { if (!document.hidden) tick(); });
  return { todayPanel, historyPanel, settingsPanel, taskFields, fieldsFromForm, taskBadge, handleAction, handleSubmit, reportText, starterCard, weekCard };
};
