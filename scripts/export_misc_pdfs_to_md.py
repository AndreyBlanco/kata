"""Export miscelaneos PDF text to graphify-out/converted/misc-pdfs/.

Fuera de alcance del grafo pedagógico MEP (por decisión de dominio, no por tamaño):
NominaCentrosEducativos2025.pdf — listado administrativo de centros, sin relación con anexos/cuadernos.
"""
from __future__ import annotations

from pathlib import Path

from graphify.detect import extract_pdf_text

ROOT = Path(__file__).resolve().parents[1]
MISC = ROOT / "miscelaneos"
OUT = ROOT / "graphify-out" / "converted" / "misc-pdfs"

# Nombre exacto del PDF excluido del corpus del grafo misc-pdfs.
EXCLUDED_CONTEXT_PDFS = frozenset({"NominaCentrosEducativos2025.pdf"})


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for pdf in sorted(MISC.rglob("*.pdf")):
        if pdf.name in EXCLUDED_CONTEXT_PDFS:
            print("omitido (fuera de contexto):", pdf.name)
            continue
        text = extract_pdf_text(pdf)
        rel = pdf.relative_to(MISC)
        stem = rel.as_posix().replace("/", "_")
        md = OUT / f"{stem}.md"
        md.write_text(
            f"<!-- source: miscelaneos/{rel.as_posix()} -->\n\n{text}",
            encoding="utf-8",
        )
        print(md.relative_to(ROOT), len(text.split()), "words")


if __name__ == "__main__":
    main()
