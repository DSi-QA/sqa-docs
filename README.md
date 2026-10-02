# SQA Documentation

A documentation hub for the QA team. Upload Word documents to GitHub — they're published automatically as browsable pages.

**Live site:** [https://DSi-QA.github.io/sqa-docs/](https://DSi-QA.github.io/sqa-docs/)

---

## For SQA Leads: How to Upload a Document

### Step 1 — Open the right folder on GitHub

Go to: `https://github.com/DSi-QA/sqa-docs/tree/main/docs`

Click the folder that matches your document type (e.g., `test-planning/`).

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

**https://DSi-QA.github.io/sqa-docs/**

---

## How to Add a New Category Folder

1. Go to: `https://github.com/DSi-QA/sqa-docs/tree/main/docs`
2. Click **Add file** → **Create new file**
3. Type the path as: `docs/your-new-category/.gitkeep`
4. Click **Commit changes**

The new section appears in the sidebar automatically on the next deploy.

---

## Available Categories

| Folder | Purpose |
|---|---|
| `test-planning/` | Test strategies and test plan documents |
| `test-types/` | Guides for functional, regression, API, performance testing |
| `tools-and-frameworks/` | Tool setup and usage references |
| `best-practices/` | Bug reporting, standards, review checklists |
| `templates/` | Reusable document templates |
| `release-checklists/` | Pre and post-release verification checklists |

---

## For Developers: Local Setup

Requires Python 3.12+ and LibreOffice (for `.docx` conversion).

```bash
pip3 install -r requirements.txt
mkdocs serve                      # Preview at http://localhost:8000
python3 scripts/generate_pages.py # Run conversion locally (needs LibreOffice)
```

To manually trigger a site rebuild without uploading a file:
1. Go to: `https://github.com/DSi-QA/sqa-docs/actions`
2. Click **Build and Deploy SQA Docs** → **Run workflow**

Planning documents (spec and implementation plan) are in `planning/` at the repo root — they are intentionally excluded from the published site.

---

## Technical Notes

- Deployment uses [`peaceiris/actions-gh-pages@v4`](https://github.com/peaceiris/actions-gh-pages).
- The CI workflow triggers on changes to: `docs/**/*.docx`, `docs/index.md`, `mkdocs.yml`, `scripts/**`, or `requirements.txt`. It can also be triggered manually from the Actions tab.
- Generated `.pdf` and auto-generated `.md` files are committed back to `main` with `[skip ci]` so the workflow does not re-trigger itself.
- The `planning/` directory holds internal design docs and is not included in the site.
