# Skill Manager

Manage Claude Code skills per-project instead of globally.

## Setup

```bash
# Clone this repo
git clone <this-repo> ~/skills
cd ~/skills
npm install

# Add to PATH (add this to ~/.zshrc or ~/.bashrc)
export PATH="$HOME/skills/bin:$PATH"
```

## Quick Start

```bash
# Add the superpowers skill collection
skill source add superpowers https://github.com/obra/superpowers.git

# Search for available skills
skill search brainstorming

# Install a skill
skill install brainstorming

# Initialize a project for skill linking
skill init ~/my-project

# Link the skill to your project
skill link brainstorming --to ~/my-project

# See what's linked
skill linked
```

## Commands

| Command | Description |
|---------|-------------|
| `skill init [path]` | Create `.claude/skills/` in project |
| `skill source add <name> <url>` | Add a skill source |
| `skill source list` | List configured sources |
| `skill source remove <name>` | Remove a source |
| `skill source update <name>` | Update source repository |
| `skill search <query>` | Search available skills |
| `skill install <name>` | Install a skill |
| `skill install <name> --from <url>` | Install from Git URL |
| `skill list` | List installed skills |
| `skill info <name>` | Show skill details |
| `skill update [name]` | Update skill(s) |
| `skill remove <name>` | Remove a skill |
| `skill link <name> --to <path>` | Link skill to project |
| `skill unlink <name> --from <path>` | Unlink skill from project |
| `skill linked [name]` | Show link status |

## How It Works

Skills are stored in `skills/` and managed via `.registry.json`. Marketplace sources (like superpowers) are cloned to `.sources/` and individual skills are symlinked into `skills/<source>/<name>/`.

When you run `skill link`, it creates a symlink in `<project>/.claude/skills/<name>/` pointing to the actual skill directory. Claude Code can then discover and use the skill in that project.
