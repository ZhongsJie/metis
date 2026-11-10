<p align="center">
  <img src="docs/assets/metis-icon.png" alt="Metis icon" width="160" height="160">
</p>

# Metis

Per-project skill manager for AI coding assistants — Claude Code, Codex, and more. Μῆτις — the Greek Titaness of skill, wisdom, and craft.

## Setup

```bash
git clone https://github.com/ZhongsJie/metis.git ~/.metis/app
cd ~/.metis/app
npm install

# Add to PATH (prepend so compiled bin takes priority)
echo 'export PATH="$HOME/.metis/app/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## Quick Start

```bash
# Add a git source and scan its skills
metis source add https://github.com/obra/superpowers.git

# Search available skills
metis search pptx

# Link skills to your project (interactive checkbox)
# The platform skills directory is created automatically when needed.
metis link -i -t ~/my-project

# List discovered skills
metis list

# See what's linked
metis linked
```

## Commands

| Command | Description |
|---------|-------------|
| `metis init [path]` | Detect assistants and create `.agents/skills/` (Codex) or `.claude/skills/` |
| `metis source add <url>` | Clone a git source and scan its skills |
| `metis source add <url> --name <name>` | Clone with an explicit source name |
| `metis source list` | List configured sources |
| `metis source remove <name>` | Remove a source repository |
| `metis source update <name>` | Pull latest from source repository |
| `metis search <query>` | Search available skills across all sources |
| `metis list` | List discovered skills |
| `metis info <name>` | Show skill details and SKILL.md preview |
| `metis update [name]` | Update source(s) and rescan skills |
| `metis remove [name]` | Remove a skill from the local registry (`-i` for interactive) |
| `metis link [name]` | Link skill to project (`-i` for interactive checkbox) |
| `metis unlink [name]` | Unlink skill from project (`-i` for interactive checkbox) |
| `metis linked [name]` | Show link status for all or specific skill |

## Interactive Mode

`metis init` and `metis link -i` detect supported assistants from the target project and offer:

```text
◇ Detected harnesses
  Codex CLI        /path/to/project/.agents

? Install for detected harnesses only, or customize?
❯ Detected only (codex)
  Customize…
```

Choose **Detected only** to use all detected assistants, or **Customize…** to select Codex CLI and/or Claude Code with checkboxes. Link then prompts for skills. Selecting no targets or skills cancels without writing files; Ctrl+C also cancels.

Detection prefers project directories: `.agents` or `.codex` for Codex, `.claude` for Claude Code. If none are present, Metis checks the same directories in your home folder. Installation always targets the selected project: Codex uses `.agents/skills`, Claude Code uses `.claude/skills`. Existing `.codex/skills` links remain visible to `linked` and removable with `unlink`; they are not moved automatically.

Use `-p codex` or `-p claude-code` to skip target selection. Without a terminal, automatic selection requires exactly one detected assistant; otherwise pass `-p` explicitly. `metis linked` reports both platforms; `-p` filters its output.

Use `-i` for interactive skill selection with checkbox UI:

```bash
metis remove -i           # pick skills to remove
metis link -i             # pick skills to link (checkbox)
metis unlink -i           # pick skills to unlink (checkbox)
```

- **↑/↓** navigate
- **Space** toggle
- **Enter** confirm
- **Ctrl+C** cancel

Color-coded status indicators:
- `(linked)` in green — already linked
- `(not linked)` in gray — not yet linked

## Options

| Flag | Applies to | Description |
|------|-----------|-------------|
| `-i, --interactive` | remove, link, unlink | Interactive selection mode |
| `-t, --to <path>` | link | Target project path (default: cwd) |
| `-f, --from <path>` | unlink | Source project path (default: cwd) |
| `-f, --force` | source remove, remove | Force removal |
| `-p, --platform <p>` | init, link, unlink, linked | Platform: `codex` or `claude-code`; omit to detect/select |

## How It Works

```
~/Documents/Repository/
└── skills/                          # This repo (skill manager)
    └── bin/metis                    # CLI entry point

~/.metis/                            # Metis data directory
├── sources.json                     # Configured sources
├── registry.json                    # Discovered skill metadata
└── skills/                          # Cloned git source repositories
    ├── superpowers/
    │   └── skills/
    │       ├── brainstorming/SKILL.md
    │       └── ...
    └── my-single-skill/
        └── SKILL.md

~/my-project/
└── .claude/
    └── skills/
        ├── brainstorming → ~/.metis/skills/superpowers/skills/brainstorming
        └── my-single-skill → ~/.metis/skills/my-single-skill
```

**Sources** are git repositories cloned under `~/.metis/skills/<source>/`. A skill is any directory containing a `SKILL.md`, so single-skill repositories, flat collections (`skills/*/`), categorised collections (`skills/<category>/*/`), plugin bundles (`plugins/*/skills/*/`) and `.claude/skills/*` layouts are all discovered by walking the repository. Directories inside a skill are not scanned further, and vendored/test directories (`node_modules`, `dist`, `tests`, `fixtures`, …) are skipped.

**Skill discovery** runs after `source add` and `source update`, writing metadata to `~/.metis/registry.json`.

**Project linking** creates the platform skills directory when needed, then creates a symlink from `<project>/.claude/skills/<name>/` (or `.agents/skills/` for Codex) pointing to the skill directory. `metis init` remains available when you want to initialize the directory explicitly. AI coding assistants discover skills in these directories per-project.

## Development

```bash
npm install
npm run build                  # compile dist/ and bin/metis
npm run dev                    # run CLI via tsx
npm test                       # run unit tests
npm run typecheck              # TypeScript type checking
```

## License

Apache License 2.0. See [LICENSE](LICENSE).
