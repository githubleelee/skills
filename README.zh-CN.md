# Skills

[English](README.md)

三个需要显式调用的 Pi skills，串起从讨论、计划、任务拆解到执行的流程。

## Skill 简介

### `to-brief` — 整理计划

把当前讨论提炼成简明、可执行的计划。它按需核实项目事实，澄清会影响方案的关键决策，并先给你审阅草稿。确认后，计划按项目约定保存；没有约定时保存到 `docs/plans/<topic>.md`。

### `to-tasks` — 拆解任务

把讨论或计划拆成一份 Markdown 任务清单，每项任务都有可检验的成果、完成条件、状态和 FS／SS／FF／SF 类型的依赖。附带的程序检查事件级循环依赖，并列出可单独启动或同时启动的任务。清单经审阅后按项目约定保存；没有约定时保存到 `docs/tasks/<topic>.md`。

### `run-tasks` — 推进执行

沿着已审阅任务清单的依赖关系持续执行。主 agent 先展示执行安排并取得一次授权，再协调当前可启动的任务，在条件允许时并行推进独立任务，按各项 `Done when` 验证成果并更新进度。每轮结束后汇报；遇到阻碍及时汇报，同时继续不受影响的任务。

## 安装

```bash
pi install git:github.com/githubleelee/skills
```

在已打开的 Pi 会话中运行 `/reload`。三个 skill 都通过命令显式调用：

```text
/skill:to-brief <主题>
/skill:to-tasks <讨论内容或计划文件路径>
/skill:run-tasks <任务文件路径>
```

也可以将仓库 `skills/` 下的三个目录复制到 `~/.pi/agent/skills/` 手动安装。

## 任务校验程序

`to-tasks` 附带依赖与状态校验程序，支持读取 Markdown 任务文件或从标准输入读取草稿：

```bash
node skills/to-tasks/scripts/check-tasks.mjs docs/tasks/example.md
node skills/to-tasks/scripts/check-tasks.mjs --stdin < docs/tasks/example.md
```

程序识别 FS、SS、FF、SF 关系，报告不可行的事件循环和状态冲突，并列出可单独启动的任务及可同时启动的组合。它只使用 Node.js 内置模块。

运行测试：

```bash
node --test skills/to-tasks/scripts/check-tasks.test.mjs
```

## 许可证

MIT，详见 [LICENSE](LICENSE)。
