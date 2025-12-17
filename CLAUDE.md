# CLAUDE.md

## Overview

Personal blog built with Hugo using a custom Terminal theme fork (`amree/hugo-theme-terminal` branch `amree.dev`). Deployed to GitHub Pages at https://amree.dev.

## Theme Submodule Rules

**Critical:** Always push the theme submodule BEFORE pushing the main repo.

```bash
# After making theme changes:
cd themes/terminal
git push origin amree.dev
cd ../..
git push
```

GitHub Actions will fail if the main repo references a theme commit that hasn't been pushed yet.

## Project-Specific Structure

- `assets/css/custom.css` - Custom styles (minified by Hugo)
- `assets/js/custom.js` - Theme toggle, progress bar (minified by Hugo)
- `layouts/partials/` - Overrides for head.html, extended_head.html, extended_footer.html
- `data/random/` - YAML files for the Random links page

## Theme Fork

Uses Prism.js with Okaidia theme (upstream uses Chroma). When merging upstream changes, keep our `prism.css`.
