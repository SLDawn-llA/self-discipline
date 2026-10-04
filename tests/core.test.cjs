const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');
test('local date math handles leap day, month and year boundaries', () => {
  assert.equal(C.shiftDate('2024-02-28',1),'2024-02-29');
  assert.equal(C.shiftDate('2026-12-31',1),'2027-01-01');
  assert.equal(C.dayDistance('2026-09-30','2026-10-04'),4);
  assert.equal(C.validDate('2026-02-29'),false);
  assert.equal(C.validDate('2024-02-29'),true);
});
test('new tasks obey creation date, repeat weekdays and pause state', () => {
  const task = C.defaults('2026-10-04').tasks[0];
  assert.equal(C.scheduled(task,'2026-10-03'),false);
  assert.equal(C.scheduled(task,'2026-10-04'),true);
  task.weekdays = [1,2,3,4,5];
  assert.equal(C.scheduled(task,'2026-10-04'),false);
  assert.equal(C.scheduled(task,'2026-10-05'),true);
  task.enabled = false;
  assert.equal(C.scheduled(task,'2026-10-05'),false);
});
test('a small target is enough and empty days do not count', () => {
  const state = C.defaults('2026-10-04'); const day = C.syncToday(state,'2026-10-04');
  day.items.slice(0,3).forEach(item => item.done = true);
  assert.deepEqual(C.progress(day), {done:3,total:6,target:3,hit:true,ratio:1});
  day.items = day.items.slice(0,1);
  assert.equal(C.progress(day).target,1);
  day.items = [];
  assert.equal(C.progress(day).hit,false);
  assert.equal(C.progress(day).ratio,0);
});
test('editing current tasks and goal preserves past snapshots and current checkmarks', () => {
  const state = C.defaults('2026-10-03'); const past = C.syncToday(state,'2026-10-03');
  past.items[0].done = true; past.note = 'one step';
  const savedPast = JSON.stringify(past);
  const today = C.syncToday(state,'2026-10-04'); today.items[0].done = true;
  state.tasks[0].title = 'new title'; state.settings.goal = 2;
  C.syncToday(state,'2026-10-04');
  assert.equal(JSON.stringify(state.days['2026-10-03']),savedPast);
  assert.equal(state.days['2026-10-04'].items[0].done,true);
  assert.equal(state.days['2026-10-04'].items[0].title,'new title');
  assert.equal(state.days['2026-10-04'].goal,2);
  state.tasks.shift(); C.syncToday(state,'2026-10-04');
  assert.equal(state.days['2026-10-04'].items.length,5);
  assert.equal(state.days['2026-10-03'].items.length,6);
});
test('streak tolerates unfinished today, breaks at a missed day, and excludes future', () => {
  const state = C.defaults('2026-10-01');
  for (const date of ['2026-10-01','2026-10-02','2026-10-03','2026-10-04','2026-10-05']) { const d = C.syncToday(state,date); if (date !== '2026-10-04') d.items.slice(0,3).forEach(item => item.done = true); }
  assert.deepEqual(C.statistics(state,'2026-10-04'),{achieved:3,totalDone:9,streak:3});
  state.days['2026-10-04'].items.slice(0,3).forEach(item => item.done = true);
  assert.equal(C.statistics(state,'2026-10-04').streak,4);
  state.days['2026-10-02'].items.forEach(item => item.done = false);
  assert.equal(C.statistics(state,'2026-10-04').streak,2);
});
test('backup validation accepts valid exports and rejects malicious or malformed state', () => {
  const state = C.defaults('2026-10-04'); C.syncToday(state,'2026-10-04');
  assert.deepEqual(C.validate({...state,exportedAt:'metadata'}),state);
  const copy = () => JSON.parse(JSON.stringify(state));
  let bad = copy(); bad.settings.goal = 0; assert.throws(() => C.validate(bad));
  bad = copy(); bad.tasks[0].weekdays = []; assert.throws(() => C.validate(bad));
  bad = copy(); bad.tasks[0].id = 'x\" onclick=\"alert(1)'; assert.throws(() => C.validate(bad));
  bad = copy(); bad.tasks[1].id = bad.tasks[0].id; assert.throws(() => C.validate(bad));
  bad = copy(); bad.days['2026-10-04'].items[0].done = 'true'; assert.throws(() => C.validate(bad));
  bad = copy(); bad.days['2026-10-32'] = bad.days['2026-10-04']; assert.throws(() => C.validate(bad));
  assert.throws(() => C.validate({version:99}));
});
test('version 1 migration retains task IDs and past completion, without inventing study outcomes', () => {
  const source = {version:1,settings:{name:'我',goal:3,planDays:100,startDate:'2026-10-03'},tasks:[{id:'old-task',title:'旧任务',detail:'旧提示',category:'growth',time:'10:00',weekdays:[0,1,2,3,4,5,6],enabled:true,createdDate:'2026-10-03'}],days:{'2026-10-03':{goal:3,note:'原笔记',items:[{id:'old-task',title:'旧名称',detail:'旧提示',category:'growth',time:'10:00',done:true}]}}};
  const migrated = C.validate(source);
  assert.equal(migrated.version,2);
  assert.equal(migrated.tasks[0].id,'old-task');
  assert.equal(migrated.days['2026-10-03'].items[0].title,'旧名称');
  assert.equal(migrated.days['2026-10-03'].items[0].done,true);
  assert.equal(migrated.days['2026-10-03'].note,'原笔记');
  assert.deepEqual(migrated.days['2026-10-03'].sessions,[]);
  assert.equal(migrated.execution.starterInstalled,false);
});
test('minimum outcomes survive sync and remain distinct from standard completion', () => {
  const state = C.defaults('2026-10-04'); state.tasks = C.starterTasks('2026-10-04');
  const day = C.syncToday(state,'2026-10-04'); const id = day.focusId;
  assert.throws(() => C.recordOutcome(state,'2026-10-04',id,{level:'minimum',evidence:''}));
  C.recordOutcome(state,'2026-10-04',id,{level:'minimum',evidence:'写出了输入输出',seconds:300,now:1791060000000});
  assert.equal(day.items[0].done,false); assert.equal(day.items[0].minimumDone,true);
  assert.equal(C.executionProgress(day).focusMet,true);
  C.syncToday(state,'2026-10-04');
  assert.equal(state.days['2026-10-04'].items[0].minimumDone,true);
  assert.equal(state.days['2026-10-04'].sessions.length,1);
  C.recordOutcome(state,'2026-10-04',id,{level:'standard',evidence:'写了暴力解和复杂度',seconds:1200});
  assert.equal(C.progress(state.days['2026-10-04']).done,1);
  assert.equal(C.executionWeek(state,'2026-10-04').standard,1);
  assert.deepEqual(C.validate(state),state);
});
test('timers use absolute time and respect pause, resume and expiry', () => {
  const session = {plannedMs:300000,remainingMs:300000,runningSince:1000000};
  assert.equal(C.sessionRemaining(session,1060000),240000);
  session.remainingMs = C.sessionRemaining(session,1060000); session.runningSince = null;
  assert.equal(C.sessionRemaining(session,9000000),240000);
  session.runningSince = 9000000;
  assert.equal(C.sessionRemaining(session,9030000),210000);
  assert.equal(C.sessionRemaining(session,9900000),0);
  // An expired timer alone never marks a task complete.
  const state = C.defaults('2026-10-04'); C.syncToday(state,'2026-10-04');
  assert.equal(C.progress(state.days['2026-10-04']).done,0);
});
test('backup rejects unsafe URLs, invalid commitments and orphan active timers', () => {
  const state = C.defaults('2026-10-04'); C.syncToday(state,'2026-10-04');
  let bad = structuredClone(state); bad.tasks[0].resource = 'javascript:alert(1)'; assert.throws(() => C.validate(bad));
  bad = structuredClone(state); bad.checkpoints = [{id:'x',title:'deadline',due:'2026-10-33T20:00',deliverable:'note',reviewer:'',done:false,evidence:''}]; assert.throws(() => C.validate(bad));
  bad = structuredClone(state); bad.session = {id:'s',date:'2026-10-04',taskId:'missing',mode:'minimum',plannedMs:300000,remainingMs:1000,runningSince:null,createdAt:123}; assert.throws(() => C.validate(bad));
});
