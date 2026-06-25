# Skill Manager — Design Spec

**Date:** 2026-06-25
**Status:** Approved

## Context

Claude Code currently loads skills globally through the plugin system (`~/.claude/plugins/cache/`), with no per-project selection. This project:

1. Creates a local skill repository with install support from Git repos and Claude Code marketplaces
2. Provides a CLI tool for skill management (install, search, update, remove)
3. Enables per-project skill selection via `.claude/skills/` symlinks

## Architecture

### Project Structure

```
skills/                              # This repo (skill manager)
├── package.json                     # npm package + CLI bin entry
├── tsconfig.json
├── Makefile
├── README.md
├── bin/
│   └── skill                        # CLI entry point (#!/usr/bin/env bash)
├── src/
│   ├── cli.ts                       # Commander.js main, registers all commands
│   ├── registry.ts                  # .registry.json read/write/validate
│   ├── sources/
│   │   ├── index.ts                 # Source interface + router
│   │   ├── marketplace.ts           # Marketplace source handler
│   │   ├── git.ts                   # Git source handler
│   │   └── config.ts                # sources.json management
│   ├── commands/
│   │   ├── init.ts
│   │   ├── source.ts
│   │   ├── install.ts
│   │   ├── list.ts
│   │   ├── search.ts
│   │   ├── info.ts
│   │   ├── remove.ts
│   │   ├── update.ts
│   │   └── link.ts
│   └── utils/
│       ├── skill-parser.ts          # Parse SKILL.md frontmatter
│       ├── symlink.ts               # Cross-platform symlink operations
│       ├── fs.ts                    # Filesystem helpers
│       └── interactive.ts           # Interactive selection UI
├── skills/                          # Installed skills directory
│   └── .registry.json
├── .sources/                        # Cloned source repositories
└── sources.json                     # Configured source list
```

### CLI Commands

| Command | Description |
|---------|-------------|
| `skill install <name>` | Install a skill from configured sources |
| `skill install <name> -s <url>` | Install directly from a Git URL |
| `skill list [--source <name>]` | List installed skills |
| `skill search <query>` | Search available skills across sources |
| `skill info <name>` | Show skill details |
| `skill remove <name>` | Remove a skill (with linked-project check) |
| `skill update [<name>]` | Update skill(s) |
| `skill link <name> [-t <path>]` | Link skill into project |
| `skill unlink <name> [-f <path>]` | Unlink skill from project |
| `skill linked [<name>]` | Show link status |
| `skill init [<path>]` | Initialize `.claude/skills/` or `.codex/skills/` |
| `skill source add <name> <url>` | Add a source |
| `skill source list` | List sources |
| `skill source remove <name>` | Remove a source |
| `skill source update <name>` | Update source repository |

### Interactive Mode

| Command | Flag | Behavior |
|---------|------|----------|
| `skill remove` | `-i` | Checkbox select from installed skills |
| `skill link` | `-i` | Checkbox select from available skills (linked ones shown with indicator) |
| `skill unlink` | `-i` | Checkbox select from linked skills (not-linked ones shown with indicator) |

### Data Formats

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
      "installPath": "superpowers/brainstorming",
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

#### Project Link Structure

```
~/my-project/
└── .claude/
    ├── skills/
    │   ├── brainstorming → ~/skills/skills/superpowers/brainstorming
    │   └── tdd → ~/skills/skills/superpowers/test-driven-development
    └── skills.json
```

## Key Flows

### Install Flow

1. Iterate `sources.json` sources
2. Marketplace: ensure repo cloned to `.sources/<name>/`, scan `skills/` for SKILL.md, parse frontmatter to match name, create symlink `skills/<source>/<name>/` → `.sources/<source>/skills/<name>/`
3. Git (single skill): clone to `skills/<name>/`
4. Write `.registry.json`

### Marketplace vs Git Sources

| | Marketplace | Git |
|---|---|---|
| Storage | Symlink → `.sources/<source>/skills/<name>/` | Direct directory `skills/<name>/` |
| Update | `git pull` entire source repo (all skills at once) | `git pull` in skill directory |
| Path | `skills/superpowers/brainstorming/` | `skills/my-custom-skill/` |

### Link Flow

1. Verify skill installed, auto-create target directory if missing
2. `ln -s <abs-path-to-skill> <project>/.claude/skills/<name>`
3. Update registry `linkedProjects`

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Install duplicate skill | Warn, use `--force` to overwrite |
| Remove linked skill | Reject, list linked projects, ask to unlink first |
| Empty skills dir after unlink | Keep empty directory |
| Source repo unreachable | Timeout, report source name, skip |
| Invalid SKILL.md | Skip with warning |
| Missing `.claude/` on link | Auto-create directory |
| Cross-filesystem symlink | Always use absolute paths |

## Verification

1. Unit tests: `skill-parser.ts`, `registry.ts`
2. Integration test: `install → link → list → unlink → remove` full lifecycle
3. Manual: install brainstorming from superpowers, link to test project, verify readable
4. Claude Code: confirm `.claude/skills/` skills are discovered
