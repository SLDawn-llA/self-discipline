# 验证

运行 `node --test tests/core.test.cjs`，无需安装依赖。

可选浏览器回归测试需要 Playwright、已安装的 Chrome，以及运行中的 `node serve.js`：

```sh
node tests/browser.cjs
node tests/execution-browser.cjs
```

`PLAYWRIGHT_MODULE` 可指向已有 Playwright，`TEST_URL` 可覆盖默认的 `http://localhost:5188`。测试使用独立浏览器环境，不读取日常使用的浏览器数据。
