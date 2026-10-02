# SQA Documentation Platform — Design Spec

**Date:** 2026-10-02  
**Author:** Design session  
**Status:** Approved

---

## 1. Overview

A self-hosted documentation platform for a Software Quality Assurance team. SQA leads upload Word documents (.docx) into organized folders on GitHub. A CI pipeline automatically converts each document to PDF and generates a viewable page. The published GitHub Pages site gives every team member a browser-readable view of every document plus a one-click download of the original .docx.

**Success criteria:**
- One person uploads a .docx → site updates automatically within ~2 minutes
- Any team member can read the document in a browser without downloading anything
- Any team member can download the original .docx with one click
- Folders in the repo map directly to navigation sections on the site
- Zero manual build steps after initial setup

---

## 2. Technology Stack

| Layer | Choice | Reason |
|---|---|---|
| Site generator | MkDocs + Material theme | Best-in-class docs UI, folder-based nav, Python |
| Document conversion | LibreOffice headless (via GitHub Actions) | Reliable .docx → .pdf, free, no external API |
| Hosting | GitHub Pages | Free, integrates natively with the repo |
| CI/CD | GitHub Actions | Triggered on push, handles conversion + deploy |
| PDF rendering | Native browser `<iframe>` | Zero JS dependency, works in all modern browsers |

---

## 3. Repository Structure

```
sqa-docs/
├── .github/
│   └── workflows/
│       └── ci.yml                  # Single workflow: convert + build + deploy
├── docs/
│   ├── index.md                    # Home page (written once, static)
│   ├── assets/
│   │   └── pdf-page.html           # Jinja2 template override for doc pages
│   └── <category>/                 # e.g. test-planning/, tools/, best-practices/
│       └── <document>.docx         # User uploads here
├── scripts/
│   └── generate_pages.py           # Scans docs/, creates .md + copies .pdf
├── mkdocs.yml                      # Site config: nav, theme, plugins
├── requirements.txt                # mkdocs-material, mkdocs-with-pdf (optional)
└── README.md                       # Contributor guide (how to upload a doc)
```

---

## 4. CI/CD Pipeline (`.github/workflows/ci.yml`)

Triggered on every push to `main`.

### Steps (in order):

1. **Checkout** repo
2. **Install LibreOffice** (headless) via `apt-get`
3. **Run `scripts/generate_pages.py`**:
   - Walks `docs/**/*.docx`
   - Converts each `.docx` → `.pdf` using `libreoffice --headless --convert-to pdf`
   - Writes a `.md` file alongside, containing:
     - Page title (derived from filename, snake_case → Title Case)
     - Embedded `<iframe>` pointing at the `.pdf` (relative path)
     - A prominent **Download .docx** button (relative path)
4. **Commit generated files** back to the repo (pdfs + md stubs) using `git commit --no-verify`
   - Only commits if there are changes (guards against infinite loop)
5. **Install Python deps** (`pip install -r requirements.txt`)
6. **Run `mkdocs build`** — outputs to `site/`
7. **Deploy** `site/` to the `gh-pages` branch using `peaceiris/actions-gh-pages`

### Loop-guard:
The workflow only triggers on pushes that include `.docx` changes OR changes to `mkdocs.yml`, `scripts/`, or `docs/index.md`. Generated `.pdf` and `.md` commits are made with `[skip ci]` in the message to prevent re-triggering.

---

## 5. Page Generation (`scripts/generate_pages.py`)

For every `.docx` file found under `docs/`:

```
Input:  docs/test-planning/regression-test-plan.docx
Output: docs/test-planning/regression-test-plan.pdf   (converted)
        docs/test-planning/regression-test-plan.md    (generated page)
```

Generated `.md` content:

```markdown
---
title: Regression Test Plan
---

# Regression Test Plan

<div class="doc-viewer">
  <iframe src="regression-test-plan.pdf" width="100%" height="800px"></iframe>
</div>

[⬇ Download .docx](regression-test-plan.docx){ .md-button .md-button--primary }
```

The `mkdocs-awesome-pages` plugin handles nav automatically — it reads the folder structure at build time. The script does not touch `mkdocs.yml`.

---

## 6. MkDocs Configuration (`mkdocs.yml`)

```yaml
site_name: SQA Documentation
site_url: https://<username>.github.io/sqa-docs/
theme:
  name: material
  palette:
    - scheme: default
      toggle:
        icon: material/brightness-7
        name: Switch to dark mode
    - scheme: slate
      toggle:
        icon: material/brightness-4
        name: Switch to light mode
  features:
    - navigation.tabs
    - navigation.sections
    - navigation.top
    - search.highlight
    - search.suggest
plugins:
  - search
  - awesome-pages          # auto-generates nav from folder structure
extra_css:
  - assets/extra.css       # iframe sizing, download button styling
```

---

## 7. User Workflow (Day-to-Day)

```
You (SQA Lead)
  │
  ├─ Go to github.com/your-org/sqa-docs
  ├─ Navigate to docs/<category>/
  ├─ Click "Add file" → "Upload files"
  ├─ Drag & drop your .docx file
  ├─ Click "Commit changes"
  │
  └─ GitHub Actions runs (~90 seconds)
       ├─ Converts .docx → .pdf
       ├─ Generates .md page
       └─ Deploys updated site

Team Members
  └─ Visit https://<username>.github.io/sqa-docs/
       ├─ Browse folder tree in left sidebar
       ├─ Click a document → reads PDF inline
       └─ Click "Download .docx" to get original
```

---

## 8. Initial Folder Structure (Starter Categories)

```
docs/
├── index.md
├── test-planning/
├── test-types/
├── tools-and-frameworks/
├── best-practices/
├── templates/
└── release-checklists/
```

These are empty folders with a `.gitkeep` to initialize them. The user renames/adds/removes folders freely — the nav updates automatically.

---

## 9. Edge Cases & Constraints

| Scenario | Handling |
|---|---|
| .docx with embedded images | LibreOffice preserves them in the PDF |
| Filename with spaces | Script slugifies to kebab-case for .pdf/.md filenames |
| User deletes a .docx | Script detects missing source and removes corresponding .pdf + .md |
| Very large PDF (>20MB) | GitHub Pages serves it fine; browser may be slow to render |
| Private repo | GitHub Pages requires GitHub Pro/Team for private repos; recommend public or org plan |
| Branch other than main | Workflow only runs on main; feature branches are safe for drafts |

---

## 10. Out of Scope

- User authentication / access control (GitHub handles repo-level access)
- In-browser document editing
- Version history UI (Git history covers this natively)
- Comments or annotations on documents
