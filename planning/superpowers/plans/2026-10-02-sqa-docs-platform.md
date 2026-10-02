# SQA Documentation Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GitHub-hosted documentation site where SQA leads upload `.docx` files into folders and a CI pipeline automatically converts them to PDF, generates browsable pages, and deploys to GitHub Pages.

**Architecture:** A Python script (`generate_pages.py`) walks `docs/**/*.docx`, calls LibreOffice headless to convert each file to PDF, and writes a Markdown page embedding the PDF in an `<iframe>` with a download button. GitHub Actions runs this script on every push to `main`, commits the generated files back, builds the MkDocs Material site, and deploys to the `gh-pages` branch.

**Tech Stack:** Python 3.12, MkDocs Material, mkdocs-awesome-pages-plugin, LibreOffice (headless, in CI), GitHub Actions, GitHub Pages, pytest.

**Spec:** `docs/superpowers/specs/2026-10-02-sqa-docs-platform-design.md`

---

## Global Constraints

- Python 3.12+
- MkDocs Material 9.5+
- mkdocs-awesome-pages-plugin 2.9+
- Generated files (`.pdf`, auto-generated `.md`) are committed to `main` with `[skip ci]` in the message to prevent workflow re-triggering
- The `scripts/` directory is skipped when MkDocs scans for pages (`docs_dir: docs`)
- Starter folders contain a `.gitkeep` so Git tracks them — remove `.gitkeep` only when a real file lands in the folder
- `docs/index.md` and `docs/assets/` are never modified by the script
- Filenames with spaces are slugified: `"My Test Plan.docx"` → `"my-test-plan.pdf"` + `"my-test-plan.md"`

---

## Review Focus

1. **Filename with spaces or special chars** — `"Smoke & Sanity (v2).docx"` must slugify to `smoke-sanity-v2` without crashing and generate a valid `.md` with matching `src=` and `href=` attributes.
2. **Overwrite on re-upload** — uploading the same `.docx` twice must overwrite the existing `.pdf` and `.md`, not create duplicates.
3. **Delete propagation** — removing a `.docx` from the repo must cause the script to delete its corresponding `.pdf` and `.md` so no ghost pages appear on the site.
4. **Nested subfolder (2+ levels deep)** — a `.docx` placed in `docs/tools/selenium/guide.docx` must be discovered, converted, and linked correctly.
5. **Empty category folders** — folders containing only `.gitkeep` must not generate error pages or broken nav entries.

---

## File Map

| Path | Status | Responsibility |
|---|---|---|
| `scripts/generate_pages.py` | Create | Converts `.docx` → `.pdf`, generates `.md` pages, cleans orphans |
| `tests/test_generate_pages.py` | Create | Full unit test suite for the script |
| `.github/workflows/ci.yml` | Create | CI: convert → commit → build → deploy |
| `mkdocs.yml` | Create | Site config: theme, plugins, nav |
| `requirements.txt` | Create | Python deps for local dev and CI |
| `docs/index.md` | Create | Home page (static, never overwritten by script) |
| `docs/assets/extra.css` | Create | PDF iframe sizing, download button style |
| `docs/test-planning/.gitkeep` | Create | Starter category folder |
| `docs/test-types/.gitkeep` | Create | Starter category folder |
| `docs/tools-and-frameworks/.gitkeep` | Create | Starter category folder |
| `docs/best-practices/.gitkeep` | Create | Starter category folder |
| `docs/templates/.gitkeep` | Create | Starter category folder |
| `docs/release-checklists/.gitkeep` | Create | Starter category folder |
| `README.md` | Create | Non-technical guide: how to upload a doc |

---

## Task 1: Project Scaffold

**Files:**
- Create: `mkdocs.yml`
- Create: `requirements.txt`
- Create: `docs/index.md`
- Create: `docs/assets/extra.css`
- Create: `docs/test-planning/.gitkeep`
- Create: `docs/test-types/.gitkeep`
- Create: `docs/tools-and-frameworks/.gitkeep`
- Create: `docs/best-practices/.gitkeep`
- Create: `docs/templates/.gitkeep`
- Create: `docs/release-checklists/.gitkeep`
- Create: `README.md`

**Interfaces:**
- Produces: A runnable MkDocs site (`mkdocs serve` works, shows home page with 6 empty nav sections)

---

- [ ] **Step 1: Initialize git repository**

```bash
cd /Users/rasel/Downloads/PROJECTS/Docs
git init
git checkout -b main
```

- [ ] **Step 2: Create `requirements.txt`**

```
mkdocs-material==9.5.44
mkdocs-awesome-pages-plugin==2.9.3
pytest==8.3.3
```

- [ ] **Step 3: Install dependencies**

```bash
pip install -r requirements.txt
```

Expected: No errors. `mkdocs --version` prints `mkdocs, version 1.6.x`.

- [ ] **Step 4: Create `mkdocs.yml`**

```yaml
site_name: SQA Documentation
site_url: https://YOUR_GITHUB_USERNAME.github.io/sqa-docs/
theme:
  name: material
  palette:
    - scheme: default
      primary: indigo
      accent: indigo
      toggle:
        icon: material/brightness-7
        name: Switch to dark mode
    - scheme: slate
      primary: indigo
      accent: indigo
      toggle:
        icon: material/brightness-4
        name: Switch to light mode
  features:
    - navigation.tabs
    - navigation.sections
    - navigation.top
    - navigation.expand
    - search.highlight
    - search.suggest
plugins:
  - search
  - awesome-pages
extra_css:
  - assets/extra.css
```

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username before pushing.

- [ ] **Step 5: Create `docs/index.md`**

```markdown
# SQA Documentation

Welcome to the SQA team's central knowledge base. Browse by category using the left sidebar, or use the search bar at the top.

## How to Read a Document

Click any document in the sidebar. It opens directly in your browser — no download needed.

## How to Download

Every document page has a **⬇ Download .docx** button to get the original Word file.

## Categories

| Category | Description |
|---|---|
| [Test Planning](test-planning/) | Test strategies and test plan templates |
| [Test Types](test-types/) | Functional, regression, API, and performance testing guides |
| [Tools & Frameworks](tools-and-frameworks/) | Setup guides and usage references |
| [Best Practices](best-practices/) | Bug reporting, review checklists, standards |
| [Templates](templates/) | Reusable document templates |
| [Release Checklists](release-checklists/) | Pre and post-release verification checklists |
```

- [ ] **Step 6: Create `docs/assets/extra.css`**

```css
.pdf-viewer {
  border: 1px solid var(--md-default-fg-color--lightest);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.pdf-viewer iframe {
  display: block;
  min-height: 700px;
  width: 100%;
  border: none;
}

/* Override MkDocs button color for the download button */
.md-button--primary {
  background-color: rgb(63, 81, 181);
  border-color: rgb(63, 81, 181);
}
```

- [ ] **Step 7: Create starter category folders**

```bash
mkdir -p docs/test-planning docs/test-types docs/tools-and-frameworks \
         docs/best-practices docs/templates docs/release-checklists

touch docs/test-planning/.gitkeep
touch docs/test-types/.gitkeep
touch docs/tools-and-frameworks/.gitkeep
touch docs/best-practices/.gitkeep
touch docs/templates/.gitkeep
touch docs/release-checklists/.gitkeep
```

- [ ] **Step 8: Create `README.md`**

````markdown
# SQA Documentation

A documentation hub for the QA team. Docs are written in Word, uploaded to GitHub, and published automatically.

---

## For SQA Leads: How to Upload a Document

### Step 1 — Open the right folder on GitHub

Go to: `https://github.com/YOUR_USERNAME/sqa-docs/tree/main/docs`

Click the folder that matches your document (e.g., `test-planning/`).

### Step 2 — Upload your `.docx` file

1. Click **Add file** → **Upload files**
2. Drag and drop your `.docx` file
3. Scroll down → click **Commit changes**

### Step 3 — Wait ~2 minutes

GitHub automatically:
- Converts your `.docx` to PDF
- Creates a browsable page for it
- Republishes the site

### Step 4 — Share the link

Site URL: `https://YOUR_USERNAME.github.io/sqa-docs/`

---

## For Developers: Local Setup

Requires Python 3.12+ and (for conversion) LibreOffice.

```bash
pip install -r requirements.txt
mkdocs serve          # Preview at http://localhost:8000
python scripts/generate_pages.py   # Run conversion locally
pytest                # Run tests
```
````

- [ ] **Step 9: Verify MkDocs serves the site**

```bash
mkdocs serve
```

Open `http://localhost:8000`. Expected:
- Home page renders with the welcome text and category table
- Left sidebar shows 6 empty sections (test-planning, test-types, etc.)
- Dark/light mode toggle works
- Search bar is present

Press `Ctrl+C` to stop.

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: project scaffold — mkdocs, starter folders, home page"
```

---

## Task 2: Conversion Script + Tests

**Files:**
- Create: `scripts/__init__.py` (empty, makes scripts a package for pytest)
- Create: `scripts/generate_pages.py`
- Create: `tests/__init__.py` (empty)
- Create: `tests/test_generate_pages.py`

**Interfaces:**
- Produces:
  - `slugify(name: str) -> str`
  - `title_from_slug(slug: str) -> str`
  - `convert_docx_to_pdf(docx_path: Path) -> Path`
  - `generate_md_page(docx_path: Path) -> Path`
  - `collect_docx_files() -> list[Path]`
  - `collect_orphaned_files() -> list[Path]`
  - `main() -> None` (entry point called by CI)

---

- [ ] **Step 1: Create package init files**

```bash
mkdir -p scripts tests
touch scripts/__init__.py tests/__init__.py
```

- [ ] **Step 2: Write the failing tests first**

Create `tests/test_generate_pages.py`:

```python
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))
from scripts.generate_pages import (
    slugify,
    title_from_slug,
    generate_md_page,
    collect_docx_files,
    collect_orphaned_files,
    SKIP_DIRS,
)


# ── slugify ───────────────────────────────────────────────────────────────────

class TestSlugify:
    def test_spaces_become_hyphens(self):
        assert slugify("My Test Plan") == "my-test-plan"

    def test_underscores_become_hyphens(self):
        assert slugify("regression_test_v2") == "regression-test-v2"

    def test_special_chars_removed(self):
        # Review Focus #1: special chars
        assert slugify("Test (Final) v2!") == "test-final-v2"

    def test_ampersand_removed(self):
        # Review Focus #1: ampersand
        assert slugify("Smoke & Sanity") == "smoke-sanity"

    def test_already_a_slug(self):
        assert slugify("already-good") == "already-good"

    def test_leading_trailing_whitespace(self):
        assert slugify("  padded  ") == "padded"


# ── title_from_slug ───────────────────────────────────────────────────────────

class TestTitleFromSlug:
    def test_basic(self):
        assert title_from_slug("my-test-plan") == "My Test Plan"

    def test_single_word(self):
        assert title_from_slug("smoke") == "Smoke"


# ── generate_md_page ──────────────────────────────────────────────────────────

class TestGenerateMdPage:
    def test_creates_md_file_with_slug_name(self, tmp_path):
        docx = tmp_path / "My Test Plan.docx"
        docx.write_bytes(b"fake")
        (tmp_path / "My Test Plan.pdf").write_bytes(b"fake pdf")

        md_path = generate_md_page(docx)

        assert md_path.name == "my-test-plan.md"
        assert md_path.exists()

    def test_md_contains_h1_title(self, tmp_path):
        docx = tmp_path / "Regression Test Plan.docx"
        docx.write_bytes(b"fake")
        (tmp_path / "Regression Test Plan.pdf").write_bytes(b"fake pdf")

        content = generate_md_page(docx).read_text()

        assert "# Regression Test Plan" in content

    def test_md_embeds_pdf_iframe(self, tmp_path):
        docx = tmp_path / "api-test-guide.docx"
        docx.write_bytes(b"fake")
        (tmp_path / "api-test-guide.pdf").write_bytes(b"fake pdf")

        content = generate_md_page(docx).read_text()

        assert 'src="api-test-guide.pdf"' in content

    def test_md_has_download_href_to_docx(self, tmp_path):
        docx = tmp_path / "api-test-guide.docx"
        docx.write_bytes(b"fake")
        (tmp_path / "api-test-guide.pdf").write_bytes(b"fake pdf")

        content = generate_md_page(docx).read_text()

        assert 'href="api-test-guide.docx"' in content
        assert "Download .docx" in content

    def test_pdf_renamed_to_slug(self, tmp_path):
        # Review Focus #1: filename with spaces
        docx = tmp_path / "My Test Plan.docx"
        docx.write_bytes(b"fake")
        (tmp_path / "My Test Plan.pdf").write_bytes(b"fake pdf")

        generate_md_page(docx)

        assert (tmp_path / "my-test-plan.pdf").exists()
        assert not (tmp_path / "My Test Plan.pdf").exists()

    def test_overwrites_existing_md(self, tmp_path):
        # Review Focus #2: re-upload same file
        docx = tmp_path / "smoke-test.docx"
        docx.write_bytes(b"fake")
        (tmp_path / "smoke-test.pdf").write_bytes(b"fake pdf")
        (tmp_path / "smoke-test.md").write_text("old stale content")

        content = generate_md_page(docx).read_text()

        assert "old stale content" not in content
        assert "# Smoke Test" in content

    def test_special_chars_in_filename(self, tmp_path):
        # Review Focus #1: special chars in filename
        docx = tmp_path / "Smoke & Sanity (v2).docx"
        docx.write_bytes(b"fake")
        (tmp_path / "Smoke & Sanity (v2).pdf").write_bytes(b"fake pdf")

        md_path = generate_md_page(docx)

        assert md_path.name == "smoke-sanity-v2.md"
        content = md_path.read_text()
        assert 'src="smoke-sanity-v2.pdf"' in content


# ── collect_docx_files ────────────────────────────────────────────────────────

class TestCollectDocxFiles:
    def test_finds_docx_in_subdir(self, tmp_path, monkeypatch):
        monkeypatch.setattr("scripts.generate_pages.DOCS_DIR", tmp_path)
        (tmp_path / "test-planning").mkdir()
        (tmp_path / "test-planning" / "plan.docx").write_bytes(b"fake")

        result = collect_docx_files()

        assert len(result) == 1
        assert result[0].name == "plan.docx"

    def test_finds_docx_in_nested_subdir(self, tmp_path, monkeypatch):
        # Review Focus #4: 2+ level deep folder
        monkeypatch.setattr("scripts.generate_pages.DOCS_DIR", tmp_path)
        (tmp_path / "tools" / "selenium").mkdir(parents=True)
        (tmp_path / "tools" / "selenium" / "guide.docx").write_bytes(b"fake")

        result = collect_docx_files()

        assert len(result) == 1
        assert result[0].name == "guide.docx"

    def test_skips_superpowers_dir(self, tmp_path, monkeypatch):
        monkeypatch.setattr("scripts.generate_pages.DOCS_DIR", tmp_path)
        (tmp_path / "superpowers").mkdir()
        (tmp_path / "superpowers" / "spec.docx").write_bytes(b"fake")

        result = collect_docx_files()

        assert result == []

    def test_skips_assets_dir(self, tmp_path, monkeypatch):
        monkeypatch.setattr("scripts.generate_pages.DOCS_DIR", tmp_path)
        (tmp_path / "assets").mkdir()
        (tmp_path / "assets" / "template.docx").write_bytes(b"fake")

        result = collect_docx_files()

        assert result == []

    def test_ignores_non_docx_files(self, tmp_path, monkeypatch):
        monkeypatch.setattr("scripts.generate_pages.DOCS_DIR", tmp_path)
        (tmp_path / "test-planning").mkdir()
        (tmp_path / "test-planning" / "plan.pdf").write_bytes(b"fake")
        (tmp_path / "test-planning" / "plan.md").write_text("fake")

        result = collect_docx_files()

        assert result == []


# ── collect_orphaned_files ────────────────────────────────────────────────────

class TestCollectOrphanedFiles:
    def test_detects_orphaned_pdf(self, tmp_path, monkeypatch):
        # Review Focus #3: delete propagation
        monkeypatch.setattr("scripts.generate_pages.DOCS_DIR", tmp_path)
        (tmp_path / "test-planning").mkdir()
        # .docx was deleted, but .pdf and .md remain
        (tmp_path / "test-planning" / "old-plan.pdf").write_bytes(b"fake")
        (tmp_path / "test-planning" / "old-plan.md").write_text("fake")

        orphans = collect_orphaned_files()

        assert any(f.name == "old-plan.pdf" for f in orphans)
        assert any(f.name == "old-plan.md" for f in orphans)

    def test_does_not_flag_index_md(self, tmp_path, monkeypatch):
        monkeypatch.setattr("scripts.generate_pages.DOCS_DIR", tmp_path)
        (tmp_path / "index.md").write_text("home page")

        orphans = collect_orphaned_files()

        assert not any(f.name == "index.md" for f in orphans)

    def test_does_not_flag_file_with_live_docx(self, tmp_path, monkeypatch):
        monkeypatch.setattr("scripts.generate_pages.DOCS_DIR", tmp_path)
        (tmp_path / "test-planning").mkdir()
        (tmp_path / "test-planning" / "plan.docx").write_bytes(b"fake")
        (tmp_path / "test-planning" / "plan.pdf").write_bytes(b"fake")
        (tmp_path / "test-planning" / "plan.md").write_text("fake")

        orphans = collect_orphaned_files()

        assert orphans == []

    def test_empty_folder_with_gitkeep_not_flagged(self, tmp_path, monkeypatch):
        # Review Focus #5: empty folders with .gitkeep
        monkeypatch.setattr("scripts.generate_pages.DOCS_DIR", tmp_path)
        (tmp_path / "templates").mkdir()
        (tmp_path / "templates" / ".gitkeep").write_text("")

        orphans = collect_orphaned_files()

        assert orphans == []
```

- [ ] **Step 3: Run the tests — confirm they all fail with ImportError**

```bash
pytest tests/test_generate_pages.py -v
```

Expected: `ModuleNotFoundError: No module named 'scripts.generate_pages'`

- [ ] **Step 4: Write `scripts/generate_pages.py`**

```python
#!/usr/bin/env python3
"""
Converts .docx files in docs/ to PDF and generates MkDocs .md pages.
Called by GitHub Actions on every push to main.
"""

import re
import subprocess
from pathlib import Path

DOCS_DIR = Path("docs")
SKIP_DIRS = {"assets", "superpowers"}


def slugify(name: str) -> str:
    name = re.sub(r"[^\w\s-]", "", name).strip().lower()
    return re.sub(r"[\s_]+", "-", name)


def title_from_slug(slug: str) -> str:
    return slug.replace("-", " ").title()


def convert_docx_to_pdf(docx_path: Path) -> Path:
    """Run LibreOffice headless to convert docx_path to PDF in the same directory."""
    subprocess.run(
        [
            "libreoffice",
            "--headless",
            "--convert-to", "pdf",
            "--outdir", str(docx_path.parent),
            str(docx_path),
        ],
        check=True,
        capture_output=True,
    )
    return docx_path.with_suffix(".pdf")


def generate_md_page(docx_path: Path) -> Path:
    """Generate a .md page embedding the PDF and linking the .docx for download."""
    stem = docx_path.stem
    slug = slugify(stem)
    title = title_from_slug(slug)

    # LibreOffice names output after the original stem; rename to slug
    original_pdf = docx_path.parent / f"{stem}.pdf"
    slug_pdf = docx_path.parent / f"{slug}.pdf"
    if original_pdf.exists() and original_pdf != slug_pdf:
        original_pdf.rename(slug_pdf)

    md_path = docx_path.parent / f"{slug}.md"
    md_path.write_text(
        f"""---
title: {title}
---

# {title}

<div class="pdf-viewer">
  <iframe src="{slug}.pdf" width="100%" height="800px"></iframe>
</div>

<p>
  <a href="{docx_path.name}" class="md-button md-button--primary">⬇ Download .docx</a>
</p>
""",
        encoding="utf-8",
    )
    return md_path


def collect_docx_files() -> list[Path]:
    """Return all .docx paths under DOCS_DIR, skipping SKIP_DIRS."""
    return [
        p for p in DOCS_DIR.rglob("*.docx")
        if not any(part in SKIP_DIRS for part in p.parts)
    ]


def collect_orphaned_files() -> list[Path]:
    """Return .pdf and .md files whose source .docx no longer exists."""
    orphans = []
    for path in DOCS_DIR.rglob("*"):
        if path.suffix not in (".pdf", ".md"):
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.name == "index.md":
            continue
        slug = path.stem
        has_source = any(
            slugify(d.stem) == slug
            for d in path.parent.glob("*.docx")
        )
        if not has_source:
            orphans.append(path)
    return orphans


def main() -> None:
    docx_files = collect_docx_files()
    print(f"Found {len(docx_files)} .docx file(s)")

    for docx_path in docx_files:
        print(f"  Converting: {docx_path}")
        convert_docx_to_pdf(docx_path)
        generate_md_page(docx_path)
        print(f"  ✓ {docx_path.name}")

    orphans = collect_orphaned_files()
    for orphan in orphans:
        print(f"  Removing orphan: {orphan}")
        orphan.unlink()

    print("Done.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Run tests — confirm they all pass**

```bash
pytest tests/test_generate_pages.py -v
```

Expected: All tests pass. Zero failures.

- [ ] **Step 6: Commit**

```bash
git add scripts/ tests/
git commit -m "feat: generate_pages script with full test suite"
```

---

## Task 3: GitHub Actions CI Workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `scripts/generate_pages.py:main()`, `requirements.txt`, `mkdocs.yml`
- Produces: Live site at `https://<username>.github.io/sqa-docs/` updated on every push

---

- [ ] **Step 1: Create the workflow directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Write `.github/workflows/ci.yml`**

```yaml
name: Build and Deploy SQA Docs

on:
  push:
    branches: [main]
    paths:
      - "docs/**/*.docx"
      - "docs/index.md"
      - "mkdocs.yml"
      - "scripts/**"
      - "requirements.txt"
  workflow_dispatch:   # allows manual trigger from GitHub UI

permissions:
  contents: write    # needed to commit generated files back to main
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0           # full history needed for gh-pages deploy

      - name: Install LibreOffice
        run: sudo apt-get update -qq && sudo apt-get install -y libreoffice

      - name: Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install Python dependencies
        run: pip install -r requirements.txt

      - name: Convert .docx files and generate pages
        run: python scripts/generate_pages.py

      - name: Commit generated files back to main
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add docs/
          if git diff --staged --quiet; then
            echo "Nothing new to commit."
          else
            git commit -m "chore: regenerate pdf and md pages [skip ci]"
            git push origin main
          fi

      - name: Build MkDocs site
        run: mkdocs build --strict

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./site
          publish_branch: gh-pages
          force_orphan: true       # keeps gh-pages clean; no build history bloat
```

- [ ] **Step 3: Add `peaceiris/actions-gh-pages` note to README**

Add this block to the bottom of `README.md`:

```markdown
---

## Technical Notes

- Deployment uses [`peaceiris/actions-gh-pages@v4`](https://github.com/peaceiris/actions-gh-pages) — no extra setup required beyond enabling GitHub Pages in repo settings.
- The workflow only runs when `.docx`, `mkdocs.yml`, or `scripts/` files change. Edits to README or other files skip the build.
- Generated `.pdf` and auto-generated `.md` files are committed back to `main` with `[skip ci]` so the workflow does not re-trigger itself.
```

- [ ] **Step 4: Commit**

```bash
git add .github/ README.md
git commit -m "feat: GitHub Actions CI — convert, build, deploy"
```

---

## Task 4: Publish to GitHub and Verify End-to-End

**Files:** None created — this is a verification and publishing task.

**Interfaces:**
- Consumes: All files from Tasks 1–3
- Produces: A live public URL the user can share with the team

---

- [ ] **Step 1: Create the GitHub repository**

Go to `https://github.com/new` and:
- Repository name: `sqa-docs`
- Visibility: **Public** (required for free GitHub Pages)
- Do NOT check "Add README" (we already have one)
- Click **Create repository**

- [ ] **Step 2: Update `mkdocs.yml` with your actual GitHub username**

Open `mkdocs.yml` and replace `YOUR_GITHUB_USERNAME`:

```yaml
site_url: https://YOUR_ACTUAL_USERNAME.github.io/sqa-docs/
```

Commit the change:

```bash
git add mkdocs.yml
git commit -m "chore: set site_url to actual GitHub Pages URL"
```

- [ ] **Step 3: Push the repository to GitHub**

```bash
git remote add origin https://github.com/YOUR_ACTUAL_USERNAME/sqa-docs.git
git push -u origin main
```

- [ ] **Step 4: Enable GitHub Pages**

1. Go to your repo on GitHub → **Settings** → **Pages**
2. Under **Source**, select: **Deploy from a branch**
3. Branch: **`gh-pages`** / Folder: **`/ (root)`**
4. Click **Save**

> Note: The `gh-pages` branch is created automatically by the first successful CI run. If it doesn't appear yet, wait for the first push to trigger the workflow, then set Pages here.

- [ ] **Step 5: Trigger and watch the first CI run**

The `git push` in Step 3 triggers the CI workflow automatically. Watch it:

1. Go to your repo → **Actions** tab
2. Click the running workflow: **"Build and Deploy SQA Docs"**
3. Wait ~2–3 minutes for it to complete (LibreOffice install takes ~60s)

Expected: Green checkmark on all steps. No red failures.

- [ ] **Step 6: Verify the live site**

Open: `https://YOUR_ACTUAL_USERNAME.github.io/sqa-docs/`

Confirm:
- Home page loads with the welcome text
- Left sidebar shows 6 category sections
- Dark/light mode toggle works
- Search bar is functional

- [ ] **Step 7: Upload a test `.docx` and verify the full pipeline**

1. Create a simple Word document on your machine (any content, save as `.docx`)
2. Go to `https://github.com/YOUR_USERNAME/sqa-docs/tree/main/docs/test-planning`
3. Click **Add file** → **Upload files**
4. Drag your `.docx` in → scroll down → **Commit changes**
5. Go to **Actions** tab → watch the new workflow run (~2 min)
6. After it completes, visit `https://YOUR_USERNAME.github.io/sqa-docs/test-planning/your-doc-name/`

Confirm:
- PDF renders inline in the browser
- **⬇ Download .docx** button is present and downloads the original file
- Document appears in the sidebar under **Test Planning**

- [ ] **Step 8: Final commit and tag**

```bash
git pull origin main    # pull back the generated files the CI committed
git tag v1.0.0
git push origin v1.0.0
```

---

## Post-Launch: Adding a New Category Folder

When the SQA lead needs a new category that doesn't exist yet:

1. Go to the repo on GitHub
2. Navigate to `docs/`
3. Click **Add file** → **Create new file**
4. Type the path: `docs/new-category/.gitkeep`
5. Commit — the new section appears in the sidebar automatically on next deploy

---
