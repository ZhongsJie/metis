# Skill Manager — Design Spec

**Date:** 2026-06-25
**Status:** Approved

## Context

当前 Claude Code 的技能完全通过插件系统全局安装（`~/.claude/plugins/cache/`），不能在项目级别按需选择。本项目目标是：

1. 建立一个本地 skill 仓库，支持从 Git 仓库和 Claude Code 市场下载 skill
2. 通过 CLI 工具管理 skill 的安装、搜索、更新、移除
3. 在目标项目中通过 `.claude/skills/` 软链实现项目级别的 skill 选择

## Architecture

### 项目结构

```
skills/                              # 本项目根目录
├── package.json                     # npm 包定义 + CLI bin 入口
├── tsconfig.json
├── README.md
├── bin/
│   └── skill                        # CLI 入口（#!/usr/bin/env node）
├── src/
│   ├── cli.ts                       # Commander 主程序，注册所有子命令
│   ├── registry.ts                  # .registry.json 读写、校验
│   ├── sources/
│   │   ├── index.ts                 # 源接口定义 + 路由器
│   │   ├── marketplace.ts           # Claude Code 市场源
│   │   └── git.ts                   # Git 仓库源
│   ├── commands/
│   │   ├── install.ts
│   │   ├── list.ts
│   │   ├── search.ts
│   │   ├── info.ts
│   │   ├── remove.ts
│   │   ├── update.ts
│   │   ├── link.ts
│   │   ├── unlink.ts
│   │   └── init.ts
│   └── utils/
│       ├── skill-parser.ts          # 解析 SKILL.md frontmatter
│       ├── symlink.ts               # 跨平台软链操作
│       └── fs.ts
├── skills/                          # 已安装的 skill 存放目录
│   └── .registry.json
├── .sources/                        # 源仓库的本地缓存
└── sources.json                     # 配置的源列表
```

### CLI 命令

| 命令 | 功能 |
|------|------|
| `skill install <name>` | 从已配置源安装 skill |
| `skill install <name> --from <url>` | 从指定 Git URL 安装 |
| `skill list [--source <name>]` | 列出已安装的 skill |
| `skill search <query>` | 搜索可用 skill |
| `skill info <name>` | 查看 skill 详情 |
| `skill remove <name>` | 移除 skill |
| `skill update [<name>]` | 更新 skill |
| `skill link <name> [--to <path>]` | 在目标项目创建软链 |
| `skill unlink <name> [--from <path>]` | 移除项目软链 |
| `skill linked [<name>]` | 查看链接状态 |
| `skill init [<project-path>]` | 为项目初始化 `.claude/skills/` |
| `skill source add <name> <url>` | 添加源 |
| `skill source list` | 列出已配置源 |
| `skill source remove <name>` | 移除源 |
| `skill source update <name>` | 更新源仓库 |

### 数据格式

#### `.registry.json`

```json
{
  "version": 1,
  "skills": {
    "brainstorming": {
      "name": "brainstorming",
      "description": "Use before any creative work...",
      "source": "superpowers",
      "sourceType": "marketplace",
      "installPath": "skills/superpowers/brainstorming",
      "version": "6.0.3",
      "installedAt": "2026-06-25T10:30:00Z",
      "updatedAt": "2026-06-25T10:30:00Z",
      "linkedProjects": []
    }
  }
}
```

#### `sources.json`

```json
{
  "version": 1,
  "sources": {
    "superpowers": {
      "name": "superpowers",
      "type": "marketplace",
      "url": "https://github.com/obra/superpowers.git",
      "addedAt": "2026-06-25T10:00:00Z"
    }
  }
}
```

#### 项目链接结构

```
~/my-project/
├── .claude/
│   ├── skills/                      # skill init 创建
│   │   ├── brainstorming -> ../../../../skills/skills/superpowers/brainstorming
│   │   └── tdd -> ...
│   └── skills.json                  # 记录选择的 skill
```

## Key Flows

### 安装流程

1. 遍历 `sources.json` 中所有源
2. 对 marketplace 源：先确保源仓库已 clone 到 `.sources/<name>/`，扫描其 `skills/` 目录，解析 SKILL.md frontmatter 匹配 name，在 `skills/<source>/<name>/` 创建指向 `.sources/<name>/skills/<name>/` 的软链
3. 对 git 源（独立 skill）：clone 到 `skills/<name>/`
4. 写入 `.registry.json`

### Marketplace vs Git 源

| | Marketplace | Git |
|---|---|---|
| 存储方式 | 软链 → `.sources/<source>/skills/<name>/` | 直接存储在 `skills/<name>/` |
| 更新方式 | `git pull` 整个源仓库（一次更新所有 skill） | 在 skill 目录内 `git pull` |
| 示例路径 | `skills/superpowers/brainstorming/` → `.sources/superpowers/skills/brainstorming/` | `skills/my-custom-skill/` |

### 链接流程

1. 验证 skill 已安装、目标项目 `.claude/` 存在（否则提示 `skill init`）
2. `ln -s <absolute-path-to-skill> <project>/.claude/skills/<name>`
3. 更新 registry 中 `linkedProjects`

## Edge Cases

| 场景 | 处理 |
|------|------|
| 安装同名 skill | 提示已存在，`--force` 覆盖 |
| 移除已链接的 skill | 拒绝，列出链接项目，提示先 unlink |
| unlink 后 skills/ 为空 | 保留空目录 |
| 源仓库不可达 | 超时报错，不阻塞其他源 |
| SKILL.md 格式无效 | 跳过并 warning |
| 目标项目无 `.claude/` | link 时提示 `skill init` |
| 跨文件系统软链 | 使用绝对路径 |

## Verification

1. 单元测试：`skill-parser.ts`、`registry.ts`
2. 集成测试：`install → link → list → unlink → remove` 完整流程
3. 手动验证：安装 superpowers 中的 brainstorming，链接到测试项目，确认文件可读
4. Claude Code 验证：确认 `.claude/skills/` 下的 skill 能被加载
