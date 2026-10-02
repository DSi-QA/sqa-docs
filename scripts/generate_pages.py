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
  <a href="{docx_path.name}" class="md-button md-button--primary">&#8681; Download .docx</a>
</p>
""",
        encoding="utf-8",
    )
    return md_path


def collect_docx_files() -> list:
    """Return all .docx paths under DOCS_DIR, skipping SKIP_DIRS."""
    return [
        p for p in DOCS_DIR.rglob("*.docx")
        if not any(part in SKIP_DIRS for part in p.parts)
    ]


def collect_orphaned_files() -> list:
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
