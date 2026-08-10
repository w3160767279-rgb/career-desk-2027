# Career Desk · 2027 秋招工作台

本地启动：

```powershell
node server.mjs
```

打开 `http://localhost:4173`。页面中的求职偏好、收藏和投递进度存储在浏览器本地。

## 每日更新

`scripts/update-data.mjs` 会检查所有官方招聘链接并更新同步时间。项目推送到 GitHub 后，`.github/workflows/daily-update.yml` 每天北京时间 07:15 自动执行。也可以本地运行：

```powershell
node scripts/update-data.mjs
```

新增或修订职位时直接维护 `data/jobs.json`。不得将第三方聚合页标为官方来源；未公告的 2027 届时间需保留“待公告”说明。
