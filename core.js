(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Yidian = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const categories = { health: '健康', growth: '成长', life: '生活', rest: '休息' };
  const pad = n => String(n).padStart(2, '0');
  function dateKey(date = new Date()) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
  function parseDate(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 12); }
  function shiftDate(key, amount) { const date = parseDate(key); date.setDate(date.getDate() + amount); return dateKey(date); }
  function dayDistance(a, b) {
    const utc = key => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d); };
    return Math.round((utc(b) - utc(a)) / 86400000);
  }
  function validDate(key) { return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key) && key >= '2000-01-01' && key <= '2199-12-31' && dateKey(parseDate(key)) === key; }
  function uid() { return globalThis.crypto?.randomUUID?.() || `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`; }
  const kinds = { coding: 'LeetCode', interview: '八股 / 基础', project: '项目表达', apply: '岗位 / 投递', other: '自定义' };
  function executionDefaults(today = dateKey()) { return { starterInstalled: false, startDate: today, reward: '完成主线后，安心享受半小时娱乐', weeklyDays: 4 }; }
  function behavior(task) { return { kind: task.kind || 'other', essential: task.essential || false, minimumAction: task.minimumAction || '打开要用的材料，认真做第一小步', criterion: task.criterion || task.detail || '完成任务，并记录一个实际结果', cue: task.cue || '', obstaclePlan: task.obstaclePlan || '', minMinutes: task.minMinutes ?? 5, focusMinutes: task.focusMinutes ?? 25, resource: task.resource || '' }; }
  function defaults(today = dateKey()) {
    const seeds = [
      ['起床后，喝一杯温水', '照顾自己，从一杯水开始', 'health', '07:30'],
      ['动一动，运动 30 分钟', '散步、拉伸或跑步，都算数', 'health', '18:00'],
      ['留 45 分钟给专注学习', '放下手机，只做一件事', 'growth', '09:00'],
      ['读书 10 页', '在文字里，遇见新的世界', 'growth', '21:00'],
      ['认真吃一顿饭', '好好吃饭，也是一种自律', 'life', '12:00'],
      ['23 点前，放下手机', '让今天好好结束', 'rest', '22:45']
    ];
    return { version: 2, settings: { name: '', goal: 3, planDays: 100, startDate: today }, tasks: seeds.map(([title, detail, category, time]) => ({ id: uid(), title, detail, category, time, weekdays: [0,1,2,3,4,5,6], enabled: true, createdDate: today, ...behavior({detail}) })), days: {}, execution: executionDefaults(today), checkpoints: [], session: null };
  }
  function scheduled(task, date) { return task.enabled && task.createdDate <= date && task.weekdays.includes(parseDate(date).getDay()); }
  function snapshot(task, done = false) { return { id: task.id, title: task.title, detail: task.detail, category: task.category, time: task.time, done, ...behavior(task), minimumDone: task.minimumDone ?? done, startedAt: task.startedAt || 0, evidence: task.evidence || '' }; }
  function syncToday(state, today = dateKey()) {
    const old = state.days[today];
    const previous = new Map((old?.items || []).map(item => [item.id, item]));
    const items = state.tasks.filter(task => scheduled(task, today)).map(task => { const oldItem = previous.get(task.id); return snapshot({ ...task, minimumDone: oldItem?.minimumDone || oldItem?.done || false, startedAt: oldItem?.startedAt || 0, evidence: oldItem?.evidence || '' }, oldItem?.done || false); });
    const focusId = items.some(item => item.id === old?.focusId) ? old.focusId : (items.find(item => item.essential && !item.done) || items.find(item => item.essential) || items.find(item => item.category === 'growth' && !item.done) || items[0])?.id || '';
    const day = { goal: state.settings.goal, note: old?.note || '', items, focusId, sessions: old?.sessions || [], review: old?.review || { blocker: '', nextStep: '', nextTime: '' } };
    state.days[today] = day;
    return day;
  }
  function progress(day) {
    if (!day) return { done: 0, total: 0, target: 0, hit: false, ratio: 0 };
    const done = day.items.filter(item => item.done).length;
    const total = day.items.length;
    const target = Math.min(day.goal, total);
    return { done, total, target, hit: target > 0 && done >= target, ratio: target > 0 ? Math.min(done / target, 1) : 0 };
  }
  function statistics(state, today = dateKey()) {
    const days = Object.entries(state.days).filter(([date]) => date <= today);
    const achieved = days.filter(([,day]) => progress(day).hit).length;
    const totalDone = days.reduce((sum, [,day]) => sum + progress(day).done, 0);
    let cursor = progress(state.days[today]).hit ? today : shiftDate(today, -1);
    let streak = 0;
    while (progress(state.days[cursor]).hit) { streak++; cursor = shiftDate(cursor, -1); }
    return { achieved, totalDone, streak };
  }
  function executionProgress(day) {
    const items = day?.items || [];
    const focus = items.find(item => item.id === day?.focusId);
    return { started: items.filter(item => item.startedAt || item.minimumDone || item.done).length, minimum: items.filter(item => item.minimumDone || item.done).length, standard: items.filter(item => item.done).length, focusMet: Boolean(focus && (focus.minimumDone || focus.done)), coreMinimum: items.filter(item => item.essential && (item.minimumDone || item.done)).length };
  }
  function sessionRemaining(session, now = Date.now()) { return session ? Math.max(0, Math.min(session.plannedMs, session.remainingMs - (session.runningSince === null ? 0 : Math.max(0,now - session.runningSince)))) : 0; }
  function recordOutcome(state, date, taskId, result) {
    const day = state.days[date]; const item = day?.items.find(item => item.id === taskId);
    if (!item) throw new Error('这一天的任务已变动，请重新选择。');
    if (!['attempt','minimum','standard'].includes(result.level)) throw new Error('请选择实际完成的程度。');
    const evidence = String(result.evidence || '').trim();
    if (result.level !== 'attempt' && !evidence) throw new Error('写下一个实际做出的结果，再保存。');
    if (evidence.length > 1000) throw new Error('成果记录请控制在 1000 字以内。');
    const now = result.now ?? Date.now();
    item.startedAt ||= now;
    if (result.level !== 'attempt') { item.minimumDone = true; item.evidence = evidence; }
    if (result.level === 'standard') item.done = true;
    const record = { id: uid(), taskId, title: item.title, kind: item.kind, essential: item.essential, level: result.level, evidence, seconds: Math.min(86400,Math.max(0,Math.round(result.seconds || 0))), blocker: result.blocker || '', nextStep: String(result.nextStep || '').slice(0,240), endedAt: now };
    day.sessions.push(record); if (day.sessions.length > 300) day.sessions.shift();
    return record;
  }
  function executionWeek(state, today = dateKey()) {
    const dates = Array.from({length:7},(_,i) => shiftDate(today,i-6));
    const workedDays = dates.filter(date => executionProgress(state.days[date]).focusMet).length;
    const startDays = dates.filter(date => executionProgress(state.days[date]).started > 0).length;
    const sessions = dates.flatMap(date => (state.days[date]?.sessions || []).map(session => ({...session,date})));
    const standard = sessions.filter(session => session.level === 'standard').length;
    return { dates, workedDays, startDays, standard, sessions, minutes: Math.floor(sessions.reduce((sum,s) => sum + s.seconds,0)/60) };
  }
  function starterTasks(today = dateKey()) {
    const make = (kind,title,minimumAction,criterion,cue,obstaclePlan,time,focusMinutes,weekdays,resource = '') => ({ id: uid(), title, detail: '先做最低版，有余力再做标准版', category: 'growth', time, weekdays, enabled: true, createdDate: today, ...behavior({kind,essential:true,minimumAction,criterion,cue,obstaclePlan,focusMinutes,resource}) });
    return [
      make('coding','LeetCode：1 题 + 1 条复盘','打开「两数之和」或当前题，读题并写出输入、输出和一个例子','独立尝试约 20 分钟，再记录思路、复杂度或卡点；不会做也要复述题解','早餐后坐到书桌，把手机翻面，就打开今天这道题','如果 10 分钟没思路，就先写暴力解；仍卡住，看一小段题解再合上复述','10:00',25,[0,1,2,3,4,5,6],'https://leetcode.cn/problems/two-sum/'),
      make('interview','八股：闭卷讲清 1 个问题','选一个基础问题，先不看答案，尝试说出 3 句话','闭卷讲 1–2 分钟，再对照材料补齐一个缺口；记录问题和关键点','午饭后回到书桌，打开自己整理的基础问题清单','如果完全不会，先读一段，再合上材料用自己的话讲 30 秒','14:00',15,[0,1,2,3,4,5,6]),
      make('project','项目：讲清一段真实经历','打开已有简历，用 3 句话说清一个项目做了什么','用 3 分钟讲清问题、自己的贡献、结果与局限；写下一个可能被追问的点','下午学习结束后，对着录音或空白文档讲一个项目','如果不知怎么讲，就按「问题—方法—我的贡献—结果」各写一句','16:00',15,[1,3,5]),
      make('apply','岗位：看 1 个 JD，迈向投递','找到一个目标岗位，写下它要求的 3 个关键词','对照 JD 找出一个准备缺口；条件基本匹配时记录一次投递或下一步','周二或周六下午，打开目标公司的实习招聘页面','如果还不敢投，就先标出必须补齐的一个要求并安排一个小任务','16:00',20,[2,6])
    ];
  }
  function validate(data) {
    const fail = message => { throw new Error(message); };
    const str = (value, max, nonempty = false) => typeof value === 'string' && value.length <= max && (!nonempty || value.trim().length > 0);
    const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
    const idOK = value => str(value, 100, true) && /^[a-zA-Z0-9_-]+$/.test(value);
    const itemOK = item => item && idOK(item.id) && str(item.title, 80, true) && str(item.detail, 140) && Object.hasOwn(categories, item.category) && (item.time === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time));
    if (!data || ![1,2].includes(data.version) || !data.settings || !Array.isArray(data.tasks) || !data.days || typeof data.days !== 'object' || Array.isArray(data.days)) fail('这不是有效的一点备份文件。');
    const validTime = time => typeof time === 'string' && (time === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(time));
    const timestamp = value => Number.isFinite(value) && value >= 0 && value <= 7300000000000;
    function checkedBehavior(item) {
      const b = behavior(item);
      if (item.essential !== undefined && typeof item.essential !== 'boolean') fail('主线任务标记格式有误。');
      if (!Object.hasOwn(kinds,b.kind) || typeof b.essential !== 'boolean' || !str(b.minimumAction,240) || !str(b.criterion,360) || !str(b.cue,240) || !str(b.obstaclePlan,360) || !integer(b.minMinutes,1,15) || !integer(b.focusMinutes,1,120) || !str(b.resource,1000)) fail('备份中的执行任务设置有误。');
      if (b.resource) { try { if (new URL(b.resource).protocol !== 'https:') fail('任务链接须使用 HTTPS。'); } catch { fail('任务链接格式不正确。'); } }
      if (item.minimumDone !== undefined && typeof item.minimumDone !== 'boolean' || item.startedAt !== undefined && !timestamp(item.startedAt) || item.evidence !== undefined && !str(item.evidence,1000)) fail('备份中的成果记录有误。');
      return b;
    }
    const s = data.settings;
    if (!str(s.name, 24) || !integer(s.goal, 1, 20) || !integer(s.planDays, 1, 365) || !validDate(s.startDate)) fail('备份中的计划设置不完整。');
    if (data.tasks.length > 200) fail('备份任务超过 200 项。');
    const ids = new Set();
    const tasks = data.tasks.map(task => {
      if (!itemOK(task) || ids.has(task.id) || typeof task.enabled !== 'boolean' || !validDate(task.createdDate) || !Array.isArray(task.weekdays) || task.weekdays.length < 1 || task.weekdays.length > 7 || new Set(task.weekdays).size !== task.weekdays.length || !task.weekdays.every(n => integer(n,0,6))) fail('备份中有不完整或重复的任务。');
      ids.add(task.id);
      return { id: task.id, title: task.title.trim(), detail: task.detail, category: task.category, time: task.time, enabled: task.enabled, createdDate: task.createdDate, weekdays: [...task.weekdays], ...checkedBehavior(task) };
    });
    const dates = Object.keys(data.days);
    if (dates.length > 10000) fail('备份日期过多。');
    const days = {};
    for (const date of dates) {
      const day = data.days[date];
      if (!validDate(date) || !day || !integer(day.goal,1,20) || !str(day.note,1000) || !Array.isArray(day.items) || day.items.length > 200) fail('备份中的每日记录不完整。');
      const itemIds = new Set();
      const items = day.items.map(item => {
        if (!itemOK(item) || typeof item.done !== 'boolean' || itemIds.has(item.id)) fail('备份中的打卡记录有误。');
        itemIds.add(item.id); checkedBehavior(item); return snapshot(item, item.done);
      });
      const sessions = day.sessions || [];
      if (!Array.isArray(sessions) || sessions.length > 300) fail('每天的执行记录数量有误。');
      for (const record of sessions) if (!record || !idOK(record.id) || !idOK(record.taskId) || !str(record.title,80,true) || !Object.hasOwn(kinds,record.kind) || typeof record.essential !== 'boolean' || !['attempt','minimum','standard'].includes(record.level) || !str(record.evidence,1000) || !integer(record.seconds,0,86400) || !str(record.blocker,80) || !str(record.nextStep,240) || !timestamp(record.endedAt)) fail('备份中的专注记录有误。');
      const review = day.review || { blocker: '', nextStep: '', nextTime: '' };
      if (!str(review.blocker,80) || !str(review.nextStep,240) || !validTime(review.nextTime)) fail('每日重启计划格式有误。');
      const focusId = day.focusId || '';
      if (!str(focusId,100) || focusId && !items.some(item => item.id === focusId)) fail('每日主线任务有误。');
      days[date] = { goal: day.goal, note: day.note, items, focusId, sessions: sessions.map(record => ({...record})), review: {...review} };
    }
    const execution = data.execution || executionDefaults(s.startDate);
    if (typeof execution.starterInstalled !== 'boolean' || !validDate(execution.startDate) || !str(execution.reward,140) || !integer(execution.weeklyDays,1,7)) fail('执行计划配置有误。');
    const checkpoints = data.checkpoints || [];
    const dateTime = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) && validDate(value.slice(0,10)) && validTime(value.slice(11));
    if (!Array.isArray(checkpoints) || checkpoints.length > 100 || new Set(checkpoints.map(p => p?.id)).size !== checkpoints.length) fail('截止点配置有误。');
    for (const point of checkpoints) if (!point || !idOK(point.id) || !str(point.title,80,true) || !str(point.deliverable,360) || !str(point.reviewer,80) || !dateTime(point.due) || typeof point.done !== 'boolean' || !str(point.evidence,1000)) fail('备份中的截止点有误。');
    const session = data.session || null;
    if (session && (!idOK(session.id) || !validDate(session.date) || !days[session.date]?.items.some(item => item.id === session.taskId) || !['minimum','standard','rescue'].includes(session.mode) || !integer(session.plannedMs,60000,7200000) || !Number.isFinite(session.remainingMs) || session.remainingMs < 0 || session.remainingMs > session.plannedMs || session.runningSince !== null && !timestamp(session.runningSince) || !timestamp(session.createdAt) || session.initialBlocker !== undefined && !str(session.initialBlocker,80))) fail('进行中的专注计时格式有误。');
    return { version: 2, settings: { name: s.name, goal: s.goal, planDays: s.planDays, startDate: s.startDate }, tasks, days, execution: {...execution}, checkpoints: checkpoints.map(point => ({...point})), session: session ? {...session} : null };
  }
  return { categories, kinds, dateKey, parseDate, shiftDate, dayDistance, validDate, uid, defaults, scheduled, syncToday, progress, statistics, validate, behavior, executionDefaults, executionProgress, sessionRemaining, recordOutcome, executionWeek, starterTasks };
});
