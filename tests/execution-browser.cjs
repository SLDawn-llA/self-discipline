const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = process.env.TEST_URL || 'http://localhost:5188';
const data = page => page.evaluate(() => JSON.parse(localStorage.getItem('yidian.data.v1')));
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'Asia/Shanghai'});
    const page = await context.newPage(); const errors = [];
    page.on('pageerror',e => errors.push(e.message));
    await page.clock.install({time:new Date('2026-10-04T03:00:00Z')});
    await page.goto(base);
    // Existing records must survive enabling the new plan.
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('yidian.data.v1')); s.days['2026-10-03'] = structuredClone(s.days['2026-10-04']); s.days['2026-10-03'].note = '不可覆盖的旧记录'; localStorage.setItem('yidian.data.v1',JSON.stringify(s)); });
    await page.reload();
    const oldPast = JSON.stringify((await data(page)).days['2026-10-03']);
    await page.locator('[data-action="coach-starter"]').first().click();
    await page.locator('#starter-form button[type=submit]').click();
    let s = await data(page);
    assert.equal(s.tasks.length,10); assert.equal(s.tasks.filter(t => t.enabled).length,4);
    assert.equal(s.checkpoints.length,3); assert.equal(s.days['2026-10-04'].items.length,2);
    assert.equal(JSON.stringify(s.days['2026-10-03']),oldPast);
    await page.locator('.toast').evaluate(node => node.classList.remove('visible'));
    await page.screenshot({path:path.join(__dirname,'..','test-results','execution-home.png'),fullPage:true});
    await page.locator('.mission-card [data-action="coach-start"][data-mode="minimum"]').click();
    await page.clock.fastForward(60000);
    assert.equal(await page.locator('#focus-clock').textContent(),'04:00');
    await page.locator('[data-action="coach-pause"]').click();
    await page.clock.fastForward(60000);
    assert.equal(await page.locator('#focus-clock').textContent(),'04:00');
    await page.reload();
    assert.equal((await data(page)).session.runningSince,null,'paused timer persists through reload');
    await page.locator('[data-action="coach-resume"]').click();
    assert.equal(await page.locator('#focus-clock').textContent(),'04:00');
    await page.locator('[data-action="coach-pause"]').click();
    await page.clock.fastForward(240001);
    await page.locator('#outcome-form').waitFor();
    s = await data(page);
    assert.equal(s.days['2026-10-04'].items.filter(t => t.done || t.minimumDone).length,0,'timer expiry must not auto-complete');
    await page.locator('#outcome-form [value="minimum"]').check();
    await page.locator('#outcome-form button[type="submit"]').click();
    assert.equal(await page.locator('#coach-error').isVisible(),true,'minimum outcome needs evidence');
    await page.locator('#outcome-evidence').fill('两数之和：写出了输入、输出和 [2,7,11,15] 的例子。');
    await page.locator('#outcome-blocker').selectOption('dont-know');
    await page.locator('#outcome-next').fill('用一个例子手推哈希表。');
    await page.locator('#outcome-form button[type="submit"]').click();
    s = await data(page);
    assert.equal(s.session,null); assert.equal(s.days['2026-10-04'].items[0].minimumDone,true); assert.equal(s.days['2026-10-04'].items[0].done,false);
    assert.equal(s.days['2026-10-04'].sessions.length,1);
    await page.reload(); assert.equal(await page.locator('.mission-success').count(),1);
    // Standard completion still requires a concrete self-reported result.
    await page.locator('.mission-card [data-mode="standard"]').click();
    await page.clock.fastForward(120000);
    await page.locator('[data-action="coach-finish"]').click();
    await page.locator('#outcome-form [value="standard"]').check();
    await page.locator('#outcome-evidence').fill('独立写出了暴力解；说明 O(n²)，对照题解复述哈希表的 O(n) 解。');
    await page.locator('#outcome-form button[type="submit"]').click();
    s = await data(page); assert.equal(s.days['2026-10-04'].items[0].done,true);
    // Direct checkboxes on core tasks open an outcome form rather than fabricating output.
    await page.locator('.task-row .check-button').nth(1).click();
    await page.locator('#outcome-form').waitFor(); await page.locator('#outcome-form [value="attempt"]').check();
    await page.locator('#outcome-evidence').fill('正则化还讲不清，先记下缺口。');
    await page.locator('#outcome-form button[type="submit"]').click();
    assert.equal((await data(page)).days['2026-10-04'].items[1].done,false);
    // Undoing an outcome must also correct claims in the report.
    await page.locator('.task-row .check-button').first().click(); await page.locator('#confirm-submit').click();
    s = await data(page); assert.equal(s.days['2026-10-04'].items[0].minimumDone,false);
    assert.equal(s.days['2026-10-04'].sessions.filter(r => r.level === 'standard').length,0);
    // Friction recovery really starts a two-minute session and retains the stated blocker.
    await page.locator('[data-action="coach-stuck"]').click();
    await page.locator('[data-action="coach-rescue"][data-blocker="too-big"]').click();
    assert.equal(await page.locator('#focus-clock').textContent(),'02:00');
    await page.clock.fastForward(120001);
    assert.equal(await page.locator('#outcome-blocker').inputValue(),'too-big');
    await page.locator('#outcome-form [value="minimum"]').check(); await page.locator('#outcome-evidence').fill('重启：认真手推了一个输入例子。');
    await page.locator('#outcome-form button[type=submit]').click();
    // Checkpoints have dates, deliverables, editable reviewers, and explicit delivery.
    await page.locator('[data-action="coach-checkpoints"]').first().click();
    await page.locator('[data-action="coach-edit-checkpoint"]').first().click();
    await page.locator('#checkpoint-reviewer').fill('约好的同学');
    await page.locator('#checkpoint-form button[type=submit]').click();
    if (await page.locator('#coach-error').count() && await page.locator('#coach-error').isVisible()) throw new Error(await page.locator('#coach-error').textContent());
    assert.equal(new URL(page.url()).search,'','saving a checkpoint must never submit private form fields to the URL');
    await page.locator('[data-action="coach-deliver"]').first().click();
    await page.locator('#deliver-evidence').fill('两道题的复盘笔记已保存，向同学讲了自己的卡点。');
    await page.locator('#deliver-form button[type=submit]').click();
    assert.equal((await data(page)).checkpoints.filter(p => p.done).length,1);
    await page.locator('#execution-dialog [data-action="coach-report"]').click();
    assert.match(await page.locator('#report-text').inputValue(),/重启：认真手推了一个输入例子/);
    assert.match(await page.locator('#report-text').inputValue(),/尝试/);
    assert.doesNotMatch(await page.locator('#report-text').inputValue(),/标准版：独立写出了暴力解/);
    await page.locator('[data-action="coach-close"]').first().click();
    // Tomorrow's first action survives rollover, without erasing yesterday's work.
    await page.locator('[data-action="coach-review"]').first().click();
    await page.locator('#review-next').fill('合上题解，手推哈希表查找顺序。');
    await page.locator('#review-time').fill('09:30');
    await page.locator('#review-form button[type=submit]').click();
    const finishedDay = JSON.stringify((await data(page)).days['2026-10-04']);
    await page.clock.setSystemTime(new Date('2026-10-05T03:00:00Z')); await page.clock.fastForward(30001);
    assert.match(await page.locator('.next-step-note').textContent(),/09:30/);
    assert.equal(JSON.stringify((await data(page)).days['2026-10-04']),finishedDay);
    // Editable task execution fields are retained, while history stays frozen.
    await page.locator('.bottom-nav a[href="#tasks"]').click();
    await page.locator('.managed-task').first().locator('[data-action="edit-task"]').click();
    await page.locator('#task-minimum').fill('打开下一题，先画一个例子。');
    await page.locator('#task-form button[type=submit]').click();
    assert.equal((await data(page)).tasks[0].minimumAction,'打开下一题，先画一个例子。');
    assert.equal(JSON.stringify((await data(page)).days['2026-10-04']),finishedDay);
    for (const width of [320,360,390,430,768]) {
      await page.setViewportSize({width,height:844});
      for (const tab of ['today','history','tasks','settings']) {
        await page.goto(`${base}/#${tab}`);
        const size = await page.evaluate(() => [document.documentElement.scrollWidth,innerWidth]);
        assert.ok(size[0] <= size[1],`${tab} overflow at ${width}`);
      }
    }
    await page.setViewportSize({width:390,height:844}); await page.goto(base + '/#today');
    await page.locator('.mission-card [data-action="coach-start"]').first().click();
    await page.screenshot({path:path.join(__dirname,'..','test-results','execution-focus.png')});
    await page.locator('[data-action="coach-close"]').first().click();
    await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true})); });
    await context.setOffline(true); await page.reload();
    assert.ok((await data(page)).session);
    await page.locator('[data-action="coach-resume"]').click();
    await page.locator('[data-action="coach-finish"]').click();
    await page.locator('#outcome-form [value="attempt"]').check();
    await page.locator('#outcome-evidence').fill('离线时也能保留一次尝试。');
    await page.locator('#outcome-form button[type=submit]').click(); await page.reload();
    assert.equal((await data(page)).session,null);
    assert.equal((await data(page)).days['2026-10-05'].sessions.at(-1).evidence,'离线时也能保留一次尝试。');
    await context.setOffline(false);
    // A focus session spanning midnight still belongs to its original day.
    await page.locator('.mission-card [data-action="coach-start"]').first().click();
    const originalSessionDate = (await data(page)).session.date;
    await page.clock.setSystemTime(new Date('2026-10-06T03:00:00Z')); await page.clock.fastForward(30001);
    assert.equal((await data(page)).session.date,originalSessionDate);
    if (!await page.locator('#outcome-form').count()) await page.locator('[data-action="coach-finish"]').click();
    await page.locator('#outcome-form [value="minimum"]').check();
    await page.locator('#outcome-evidence').fill('跨日一轮的成果归到开始那天。');
    await page.locator('#outcome-form button[type=submit]').click();
    s = await data(page);
    assert.equal(s.days[originalSessionDate].sessions.at(-1).evidence,'跨日一轮的成果归到开始那天。');
    assert.equal(s.days['2026-10-06'].sessions.length,0);
    // Returning after two missed days gives a restart action rather than overdue task debt.
    await page.clock.setSystemTime(new Date('2026-10-09T03:00:00Z')); await page.clock.fastForward(30001);
    assert.equal(await page.locator('.restart-banner').isVisible(),true);
    await page.locator('.restart-banner [data-action="coach-start"]').click();
    assert.equal(await page.locator('#focus-clock').textContent(),'02:00');
    await page.locator('[data-action="coach-finish"]').click();
    await page.locator('#outcome-form button[type=submit]').click();
    assert.deepEqual(errors,[]);
    console.log('PASS: starter pack and history preservation, timer pause/reload/expiry, honest minimum vs standard outcomes, undo report correction, 2-minute recovery, checkpoint editing/delivery, next-day recovery, task execution editing, 20 responsive layouts, offline timer and outcome persistence.');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
