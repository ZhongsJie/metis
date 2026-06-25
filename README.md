# Skill Manager

Manage Claude Code skills per-project instead of globally.

## Setup

```bash
git clone <this-repo> ~/skills
cd ~/skills
npm install

# Add to PATH (append to ~/.zshrc or ~/.bashrc)
export PATH="$HOME/skills/bin:$PATH"
```

## Quick Start

```bash
# Add a skill source (marketplace)
skill source add superpowers https://github.com/obra/superpowers.git

# Search available skills
skill search pptx

# Install a skill
skill install pptx-generator

# Initialize a project for skill linking
skill init ~/my-project

# Link skills to your project (interactive checkbox)
skill link -i -t ~/my-project

# List installed skills
skill list

# See what's linked
skill linked
```

## Commands

| Command | Description |
|---------|-------------|
| `skill init [path]` | Create `.claude/skills/` or `.codex/skills/` in project |
| `skill source add <name> <url>` | Add a skill source (marketplace or git) |
| `skill source list` | List configured sources |
| `skill source remove <name>` | Remove a source |
| `skill source update <name>` | Pull latest from source repository |
| `skill search <query>` | Search available skills across all sources |
| `skill install <name>` | Install a skill |
| `skill install <name> -s <url>` | Install directly from a Git URL |
| `skill list` | List installed skills |
| `skill info <name>` | Show skill details and SKILL.md preview |
| `skill update [name]` | Update skill(s) to latest |
| `skill remove [name]` | Remove a skill (`-i` for interactive) |
| `skill link [name]` | Link skill to project (`-i` for interactive checkbox) |
| `skill unlink [name]` | Unlink skill from project (`-i` for interactive checkbox) |
| `skill linked [name]` | Show link status for all or specific skill |

## Interactive Mode

Use `-i` for interactive selection with checkbox UI:

```bash
skill remove -i           # pick skills to remove
skill link -i             # pick skills to link (checkbox)
skill unlink -i           # pick skills to unlink (checkbox)
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
| `-f, --force` | install, remove | Force install/remove |
| `-p, --platform <p>` | init, link, unlink | Platform: `claude-code` (default) or `codex` |
| `-s, --from <url>` | install | Install directly from a Git URL |

## How It Works

```
~/
└── skills/                          # This repo (skill manager)
    ├── .sources/                    # Cloned source repos
    │   ├── superpowers/
    │   │   └── skills/
    │   │       ├── brainstorming/SKILL.md
    │   │       └── ...
    │   └── minimax/
    ├── skills/                      # Installed skills (symlinks → .sources)
    │   ├── superpowers/
    │   │   ├── brainstorming → ../../.sources/superpowers/skills/brainstorming
    │   │   └── ...
    │   ├── minimax/
    │   │   └── pptx-generator → ../../.sources/minimax/skills/pptx-generator
    │   └── .registry.json           # Skill metadata registry
    └── sources.json                 # Configured sources

~/my-project/
└── .claude/
    └── skills/
        ├── brainstorming → ~/skills/skills/superpowers/brainstorming
        └── pptx-generator → ~/skills/skills/minimax/pptx-generator
```

**Marketplace sources** (collections like superpowers) are cloned once to `.sources/<name>/`. Individual skills are symlinked into `skills/<name>/`. Updating the source (`skill source update`) pulls latest for all skills at once.

**Git sources** (single-skill repos) are cloned directly into `skills/<name>/`.

**Project linking** creates a symlink from `<project>/.claude/skills/<name>/` pointing to the skill directory. Claude Code discovers skills in this directory per-project.

## Development

```bash
npm install
npm run dev                    # run CLI via tsx
npm test                       # run unit tests
npm run typecheck              # TypeScript type checking
```

## License

MIT
