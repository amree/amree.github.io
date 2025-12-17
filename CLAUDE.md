# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a personal blog built with Hugo, using the Terminal theme (custom fork at `amree/hugo-theme-terminal`). The site is deployed to GitHub Pages at https://amree.dev.

## Common Commands

```bash
# Install Hugo (first time setup)
brew install hugo

# Initialize theme submodule (first time setup)
git submodule add -b amree.dev git@github.com:amree/hugo-theme-terminal.git themes/terminal

# Run local development server
hugo server -t terminal

# Create a new post
hugo new posts/my-post-title.md

# Build for production
hugo --gc --minify
```

## Project Structure

- `content/posts/` - Blog posts in Markdown format
- `layouts/` - Custom layout overrides for the theme
  - `_default/baseof.html` - Base template override
  - `page/archive.html` - Archive page layout
  - `page/random.html` - Random post page layout
  - `partials/head.html` - Custom head partial
- `themes/terminal/` - Theme submodule (custom fork)
- `hugo.toml` - Site configuration

## Deployment

The site auto-deploys via GitHub Actions on push to `main`. The workflow (`.github/workflows/hugo.yml`) uses Hugo extended v0.134.2 and deploys to GitHub Pages.

## Post Format

Posts use front matter with `draft: true` by default. URL structure: `/:year/:month/:day/:title/`
