# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a personal blog built with Hugo, using the Terminal theme (custom fork at `amree/hugo-theme-terminal` on branch `amree.dev`). The site is deployed to GitHub Pages at https://amree.dev.

## Common Commands

```bash
# Run local development server
hugo server -t terminal

# Create a new post
hugo new posts/my-post-title.md

# Build for production
hugo --gc --minify
```

## Project Structure

- `content/posts/` - Blog posts in Markdown format
- `content/archive.md` - Archive page (uses `layout: "archive"`)
- `content/random.md` - Random links page (uses `layout: "random"`)
- `data/random/` - YAML files for Random page (x.yaml, facebook.yml, talks.yml)
- `layouts/_default/` - Custom layout overrides (archive.html, random.html)
- `static/style.css` - CSS variable overrides for dark theme
- `static/images/posts/{date}/` - Images organized by post date
- `themes/terminal/` - Theme submodule (custom fork)
- `hugo.toml` - Site configuration

## Theme Fork

The theme is a custom fork (`amree/hugo-theme-terminal`) because:
- Uses Prism.js with Okaidia dark theme for syntax highlighting (upstream uses Chroma)
- Custom `prism.css` in `themes/terminal/assets/css/`

### Updating the Theme

To pull upstream changes while keeping customizations:

```bash
cd themes/terminal
git fetch upstream  # upstream = panr/hugo-theme-terminal
git merge upstream/master
# Resolve conflicts - keep our prism.css and syntax.css
git push origin amree.dev
cd ../..
git add themes/terminal
git commit -m "Update theme submodule"
```

**Important:** After committing in the theme submodule, you must also commit the submodule reference update in the main repo, otherwise GitHub Actions will use the old theme version.

## Styling

Dark theme colors are set in `static/style.css`:
```css
:root {
  --background: #1a1a1a;
  --foreground: #e0e0e0;
  --accent: #ffb366;
}
```

## Adding Random Links

Add entries to `data/random/x.yaml` (or other YAML files):
```yaml
- title: Your Title Here
  url: https://example.com
  date: 2025-01-01T00:00:00Z
```

## Deployment

The site auto-deploys via GitHub Actions on push to `main`. The workflow uses Hugo extended and deploys to GitHub Pages. Submodules are fetched recursively.

## Post Format

Posts use front matter. URL structure: `/:year/:month/:day/:title/`

```yaml
---
title: Post Title
date: 2025-01-01
tags: [tag1, tag2]
---
```
