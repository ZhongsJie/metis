.PHONY: install dev test typecheck clean help link unlink

SHELL := /bin/bash
BIN := ./bin/metis

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Install npm dependencies
	npm install

dev: ## Run CLI in development mode (pass args via ARGS="...")
	npx tsx src/cli.ts $(ARGS)

test: ## Run unit tests
	node --import tsx --test src/**/*.test.ts

typecheck: ## TypeScript type checking
	npx tsc --noEmit

clean: ## Remove installed skills and cached sources
	rm -rf skills/*/ .sources/*/ skills/.registry.json sources.json
	@echo "Cleaned skills and sources"

list: ## List installed skills
	$(BIN) list

search: ## Search skills (usage: make search Q="pptx")
	$(BIN) search $(Q)

info: ## Show skill info (usage: make info S="brainstorming")
	$(BIN) info $(S)

source-add: ## Add a skill source (usage: make source-add NAME="superpowers" URL="https://...")
	$(BIN) source add $(NAME) $(URL)

source-list: ## List configured sources
	$(BIN) source list

source-update: ## Update all sources
	$(BIN) update

link: ## Link skills interactively (usage: make link TO="/path/to/project")
	$(BIN) link -i -t $(TO)

unlink: ## Unlink skills interactively (usage: make unlink FROM="/path/to/project")
	$(BIN) unlink -i -f $(FROM)

linked: ## Show link status
	$(BIN) linked

init-project: ## Initialize a project for skill linking (usage: make init-project TO="/path/to/project")
	$(BIN) init $(TO)
