SHELL := /bin/bash

PNPM := pnpm

.DEFAULT_GOAL := help

.PHONY: help format format-all typecheck build check

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; printf "Available targets:\n"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-14s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

format: ## Format project files
	$(PNPM) run format

format-all: ## Format every non-ignored project file
	$(PNPM) run format-all

typecheck: ## Run TypeScript/Vue type checks
	$(PNPM) run typecheck

build: ## Build the extension
	$(PNPM) run build

check: ## Run the project verification script
	$(PNPM) run check
