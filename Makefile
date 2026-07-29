SHELL := /bin/bash

PNPM := pnpm
DEVELOPER_DIR := /Applications/Xcode.app/Contents/Developer
MACOS_PROJECT_DIR := apps/macos/Dark Mode Lite
MACOS_PROJECT := $(MACOS_PROJECT_DIR)/Dark Mode Lite.xcodeproj
MACOS_DERIVED_DATA := /Users/gocanto/.codex/work/codex/dark-mode-lite-derived
MACOS_UI_DERIVED_DATA := /Users/gocanto/.codex/work/codex/dark-mode-lite-ui-derived
MACOS_APP := $(MACOS_DERIVED_DATA)/Build/Products/Debug/Dark Mode Lite.app

# Cloudflare Pages deploy target (override CF_BRANCH=<branch> for a preview deploy).
CF_PAGES_PROJECT := ex-dark-mode-lite
CF_BRANCH ?= main

.DEFAULT_GOAL := help

.PHONY: help format format-all typecheck build check web build-web deploy-web run macos-sync macos-build macos-run-build macos-test macos-format

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

web: ## Run the landing-page dev server (VitePress)
	$(PNPM) run dev:web

build-web: ## Build the landing page (VitePress)
	$(PNPM) run build:web

deploy-web: build-web ## Build & deploy the landing page to Cloudflare Pages (CF_BRANCH=main)
	cd apps/web && npx wrangler pages deploy .vitepress/dist --project-name $(CF_PAGES_PROJECT) --branch $(CF_BRANCH)

check: ## Run the project verification script
	$(PNPM) run check

macos-sync: ## Build and sync the bundled Safari controller
	$(PNPM) run sync:safari

macos-build: macos-sync ## Build the unsigned macOS app locally
	DEVELOPER_DIR=$(DEVELOPER_DIR) xcodebuild -project "$(MACOS_PROJECT)" -scheme "Dark Mode Lite" -configuration Debug -derivedDataPath "$(MACOS_DERIVED_DATA)" CODE_SIGNING_ALLOWED=NO build

macos-run-build: macos-sync ## Build an ad-hoc signed macOS app for local use
	DEVELOPER_DIR=$(DEVELOPER_DIR) xcodebuild -project "$(MACOS_PROJECT)" -scheme "Dark Mode Lite" -configuration Debug -derivedDataPath "$(MACOS_DERIVED_DATA)" CODE_SIGN_IDENTITY=- CODE_SIGNING_REQUIRED=YES CODE_SIGN_ENTITLEMENTS="Dark Mode Lite/Dark Mode Lite.local.entitlements" build

macos-test: ## Run Swift core/UI tests and an unsigned Xcode build
	cd apps/macos && DEVELOPER_DIR=$(DEVELOPER_DIR) xcrun swift test
	$(MAKE) macos-build
	DEVELOPER_DIR=$(DEVELOPER_DIR) xcodebuild -project "$(MACOS_PROJECT)" -scheme "Dark Mode Lite UITests" -configuration Debug -derivedDataPath "$(MACOS_UI_DERIVED_DATA)" CODE_SIGN_IDENTITY=- CODE_SIGNING_REQUIRED=YES CODE_SIGN_ENTITLEMENTS= test

macos-format: ## Format macOS Swift sources and tests
	DEVELOPER_DIR=$(DEVELOPER_DIR) xcrun swift-format format --in-place --recursive apps/macos/Package.swift "apps/macos/Dark Mode Lite/Dark Mode Lite" "apps/macos/Dark Mode Lite/Dark Mode Lite Extension" "apps/macos/Dark Mode Lite/Dark Mode Lite UITests" apps/macos/Tests

run: macos-run-build ## Build and launch the local menu-bar app
	@pkill -x "Dark Mode Lite" 2>/dev/null || true
	open -n "$(MACOS_APP)" --env DML_SHOW_POPOVER_ON_LAUNCH=1
