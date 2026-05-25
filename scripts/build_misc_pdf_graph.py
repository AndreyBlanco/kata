"""Construye graph.json / graph.html / GRAPH_REPORT.md solo desde PDFs de miscelaneos.

Requiere haber ejecutado export_misc_pdfs_to_md.py (texto con pypdf).

NominaCentrosEducativos2025.pdf no forma parte de este grafo: es material administrativo
(listado de centros), fuera del contexto de anexos y cuadernos MEP.

Salida: graphify-out/misc-pdfs/

Además se generan nodos ``role=evidence_chunk`` con el campo ``chunk_text``: el texto
completo del export Markdown troceado (~750–3200 caracteres por nodo), enlazado al hub del
documento. Sirve como fuente consultable en ``graph.json`` (respuestas negativas posibles
tras revisar fragmentos del PDF correspondiente).
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.export import to_html, to_json
from graphify.report import generate

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "graphify-out" / "misc-pdfs"

F1 = "graphify-out/converted/misc-pdfs/Anexo 1 Lneas de accin versin final 2023.pdf.md"
F2 = "graphify-out/converted/misc-pdfs/Anexo 2 - Cuaderno complementario N 1 Preguntas y Respuestas2023.pdf.md"
F3 = "graphify-out/converted/misc-pdfs/Anexo 3 Cuaderno Complementario N2 PEC 2023.pdf.md"
F4 = "graphify-out/converted/misc-pdfs/Anexo 4 Cuaderno N 3 Discapacidad Visual.pdf.md"
F5 = "graphify-out/converted/misc-pdfs/Anexo 5 Cuaderno N 4 Problemas de Aprendizaje - 2023.pdf.md"
FERR = "graphify-out/converted/misc-pdfs/FE ERRATAS Cuaderno N4 - DVM-AC-CIR-0008-02-2023 -.pdf.md"

# Troceo del cuerpo Markdown (caracteres Unicode)
CHUNK_MIN_CHARS = 780
CHUNK_MAX_CHARS = 3200

SOURCES_FOR_EVIDENCE: list[tuple[str, str, str]] = [
    (F1, "misc_pdf_doc_lineas_accion", "Anexo 1"),
    (F2, "misc_pdf_doc_cuaderno_n1_qa", "Cuaderno N°1"),
    (F3, "misc_pdf_doc_cuaderno_n2_pec", "Cuaderno N°2 PEC"),
    (F4, "misc_pdf_doc_cuaderno_n3_dv", "Cuaderno N°3 DV"),
    (F5, "misc_pdf_doc_cuaderno_n4_pa", "Cuaderno N°4 PA"),
    (FERR, "misc_pdf_doc_circular_erratas_n4", "Circular erratas"),
]

CORPUS_SCOPE_TEXT = """
CORPUS MISC-PDFS — Fuente de verdad textual.

Los PDF pedagógicos del Ministerio de Educación Pública listados en este grafo están
representados de forma exhaustiva como secuencia de nodos evidence_chunk; cada uno
incluye el campo chunk_text con un fragmento contiguo del texto extraído del PDF.

Cómo interpretar ausencias: si, tras considerar todos los evidence_chunk cuyo source_file
corresponde a un documento (p. ej. solo Anexo 1 / líneas de acción), ningún fragmento
contiene un término o idea, puede afirmarse que ese documento en este corpus no aborda
ese contenido — salvo error de extracción OCR/pypdf del PDF fuente.

Queda fuera de alcance: NominaCentrosEducativos2025.pdf (listado administrativo, no MEP
pedagógico). Cualquier otro archivo bajo miscelaneos/ que no tenga hub y nodos evidence_chunk en este
grafo no forma parte del corpus misc-pdfs.

Documentos incluidos como evidencia:
• Anexo 1 — Líneas de acción (educación inclusiva)
• Cuaderno complementario N°1 — Preguntas y respuestas
• Cuaderno complementario N°2 — PEC
• Cuaderno complementario N°3 — Discapacidad visual
• Cuaderno complementario N°4 — Problemas de aprendizaje
• Circular — Fe de erratas Cuaderno N°4
""".strip()


def node(
    nid: str,
    label: str,
    source_file: str,
    *,
    file_type: str = "paper",
    location: str | None = None,
) -> dict:
    return {
        "id": nid,
        "label": label,
        "file_type": file_type,
        "source_file": source_file,
        "source_location": location,
        "source_url": None,
        "captured_at": None,
        "author": None,
        "contributor": None,
    }


def edge(
    src: str,
    tgt: str,
    relation: str,
    confidence: str,
    source_file: str,
    *,
    score: float = 1.0,
) -> dict:
    return {
        "source": src,
        "target": tgt,
        "relation": relation,
        "confidence": confidence,
        "confidence_score": score,
        "source_file": source_file,
        "source_location": None,
        "weight": 1.0,
    }


def strip_md_header(raw: str) -> str:
    if raw.startswith("<!--"):
        end = raw.find("-->", 4)
        if end != -1:
            return raw[end + 3 :].lstrip("\n")
    return raw


def paragraph_chunks(body: str, min_chars: int, max_chars: int) -> list[str]:
    """Une párrafos hasta ~max_chars; parte párrafos demasiado largos."""
    parts = [p.strip() for p in re.split(r"\n\s*\n+", body) if p.strip()]
    out: list[str] = []
    buf = ""
    for p in parts:
        candidate = f"{buf}\n\n{p}".strip() if buf else p
        if len(candidate) <= max_chars:
            buf = candidate
            if len(buf) >= min_chars:
                out.append(buf)
                buf = ""
            continue
        if buf:
            out.append(buf)
            buf = ""
        if len(p) <= max_chars:
            buf = p
            if len(buf) >= min_chars:
                out.append(buf)
                buf = ""
            continue
        start = 0
        while start < len(p):
            out.append(p[start : start + max_chars])
            start += max_chars
    if buf.strip():
        out.append(buf.strip())
    return [x for x in out if x.strip()]


def stable_evidence_id(rel_path: str, chunk_index: int) -> str:
    h = hashlib.sha256(f"{rel_path}:{chunk_index}".encode("utf-8")).hexdigest()[:14]
    return f"misc_ev_{h}"


def chunk_surface_label(text: str, doc_short: str, idx: int, total: int) -> str:
    flat = " ".join(text.split())
    snippet = flat[:90] + ("…" if len(flat) > 90 else "")
    return f"{doc_short} [{idx + 1}/{total}] {snippet}"


def merge_extractions(*layers: dict) -> dict:
    nodes: list[dict] = []
    edges: list[dict] = []
    hyperedges: list[dict] = []
    for layer in layers:
        nodes.extend(layer.get("nodes", []))
        edges.extend(layer.get("edges", []))
        hyperedges.extend(layer.get("hyperedges", []))
    return {
        "nodes": nodes,
        "edges": edges,
        "hyperedges": hyperedges,
        "input_tokens": 0,
        "output_tokens": 0,
    }


def evidence_layer() -> dict:
    """Nodos con texto literal completo troceado + nodo de alcance del corpus."""
    nodes: list[dict] = []
    edges: list[dict] = []

    nodes.append(
        {
            "id": "misc_pdf_corpus_truth_scope",
            "label": "Alcance del corpus — uso como fuente de verdad",
            "file_type": "document",
            "source_file": F1,
            "source_location": None,
            "source_url": None,
            "captured_at": None,
            "author": None,
            "contributor": None,
            "role": "corpus_scope",
            "chunk_text": CORPUS_SCOPE_TEXT,
        }
    )

    hub_ids = [hub for _, hub, _ in SOURCES_FOR_EVIDENCE]
    for hub in hub_ids:
        edges.append(
            edge(
                "misc_pdf_corpus_truth_scope",
                hub,
                "defines_corpus_scope_for",
                "EXTRACTED",
                F1,
            )
        )

    for rel_path, hub_id, doc_short in SOURCES_FOR_EVIDENCE:
        path = ROOT / rel_path
        if not path.is_file():
            raise FileNotFoundError(
                f"No existe {path}. Ejecute primero: python scripts/export_misc_pdfs_to_md.py"
            )
        body = strip_md_header(path.read_text(encoding="utf-8"))
        chunks = paragraph_chunks(body, CHUNK_MIN_CHARS, CHUNK_MAX_CHARS)
        if not chunks:
            raise ValueError(f"Troceo vacío para {rel_path}")
        prev_id: str | None = None
        for i, ch in enumerate(chunks):
            cid = stable_evidence_id(rel_path, i)
            lbl = chunk_surface_label(ch, doc_short, i, len(chunks))
            nodes.append(
                {
                    "id": cid,
                    "label": lbl,
                    "file_type": "paper",
                    "source_file": rel_path,
                    "source_location": f"chunk {i + 1}/{len(chunks)}",
                    "source_url": None,
                    "captured_at": None,
                    "author": None,
                    "contributor": None,
                    "role": "evidence_chunk",
                    "chunk_text": ch,
                    "parent_hub_id": hub_id,
                }
            )
            edges.append(edge(cid, hub_id, "evidence_from", "EXTRACTED", rel_path))
            if prev_id:
                edges.append(edge(prev_id, cid, "successor_in_source", "EXTRACTED", rel_path))
            prev_id = cid

    return {"nodes": nodes, "edges": edges, "hyperedges": []}


def extraction() -> dict:
    nodes: list[dict] = []
    edges: list[dict] = []

    # --- Documentos fuente (export markdown) ---
    nodes.extend(
        [
            node(
                "misc_pdf_doc_lineas_accion",
                "Líneas de acción — Avanzar hacia la educación inclusiva (Anexo 1 / MEP)",
                F1,
            ),
            node(
                "misc_pdf_doc_cuaderno_n1_qa",
                "Cuaderno complementario N°1 — Preguntas y respuestas",
                F2,
            ),
            node(
                "misc_pdf_doc_cuaderno_n2_pec",
                "Cuaderno complementario N°2 — Problemas emocionales y de conducta (PEC)",
                F3,
            ),
            node(
                "misc_pdf_doc_cuaderno_n3_dv",
                "Cuaderno complementario N°3 — Discapacidad visual",
                F4,
            ),
            node(
                "misc_pdf_doc_cuaderno_n4_pa",
                "Cuaderno complementario N°4 — Problemas de aprendizaje",
                F5,
            ),
            node(
                "misc_pdf_doc_circular_erratas_n4",
                "Circular DVM-AC-CIR-0008-02-2023 — Fe de erratas Cuaderno N°4",
                FERR,
            ),
        ]
    )

    # --- Marco normativo y principios (Anexo 1) ---
    nodes.extend(
        [
            node("misc_pdf_educacion_inclusiva", "Educación inclusiva", F1),
            node("misc_pdf_ley_8661", "Ley N° 8661 — ratificación Convención CDPD", F1),
            node("misc_pdf_art24_cd_pd", "Artículo 24 Convención CDPD (educación)", F1),
            node("misc_pdf_barreras_entorno", "Enfoque de barreras en el entorno educativo", F1),
            node("misc_pdf_objetivo_ods4", "ODS 4 — educación inclusiva y equitativa", F1),
            node("misc_pdf_lineas_accion_mep", "Líneas de acción servicios de apoyo educativo (MEP)", F1),
            node("misc_pdf_dua", "Diseño Universal para el Aprendizaje (DUA)", F1),
            node("misc_pdf_docencia_compartida", "Docencia compartida", F1),
        ]
    )

    # --- Tres procesos transversales (todos los cuadernos) ---
    nodes.extend(
        [
            node("misc_pdf_proceso1", "Proceso 1 — Identificación necesidades, barreras y recursos", F2),
            node("misc_pdf_proceso2", "Proceso 2 — Implementación de apoyos educativos", F2),
            node("misc_pdf_proceso3", "Proceso 3 — Reflexión para la mejora continua", F2),
            node("misc_pdf_valoracion_integral", "Valoración integral de la persona estudiante", F2),
            node("misc_pdf_autoevaluacion_centro", "Autoevaluación del centro educativo", F2),
            node("misc_pdf_estrategia_acompanamiento", "Estrategia de acompañamiento", F2),
        ]
    )

    # --- PEC (Cuaderno N°2) ---
    nodes.extend(
        [
            node("misc_pdf_evaluacion_funcional", "Evaluación funcional conductual", F3),
            node("misc_pdf_plan_apoyo_conductual", "Plan de apoyo conductual", F3),
            node("misc_pdf_servicio_pec", "Servicio apoyo — problemas emocionales y de conducta", F3),
        ]
    )

    # --- Discapacidad visual (Cuaderno N°3) ---
    nodes.extend(
        [
            node("misc_pdf_servicio_dv", "Servicio apoyo educativo — discapacidad visual", F4),
            node("misc_pdf_acceso_informacion_dv", "Acceso a la información (discapacidad visual)", F4),
        ]
    )

    # --- Problemas de aprendizaje (Cuaderno N°4) ---
    nodes.extend(
        [
            node("misc_pdf_servicio_pa", "Servicio apoyo — problemas de aprendizaje (fija/itinerante)", F5),
            node("misc_pdf_dislexia", "Dislexia", F5),
            node("misc_pdf_discalculia", "Discalculia", F5),
            node("misc_pdf_disortografia", "Disortografía", F5),
            node("misc_pdf_disgrafia", "Disgrafía", F5),
            node("misc_pdf_dispraxia", "Dispraxia", F5),
            node("misc_pdf_tda_aprendizaje", "Trastorno por déficit de atención (en contexto PA)", F5),
            node("misc_pdf_aprendizaje_no_verbal", "Trastorno del aprendizaje no verbal", F5),
            node("misc_pdf_perfil_aprendizaje_lento", "Perfiles de aprendizaje lento", F5),
            node("misc_pdf_plan_apoyo_pa", "Plan de apoyo (cuatro columnas — PA)", F5),
            node("misc_pdf_procesos_aprendizaje", "Procesos implicados en el aprendizaje", F5),
            node("misc_pdf_atencion_tipos", "Tipos de atención", F5),
            node("misc_pdf_ruta_servicio_pa", "Ruta del servicio de problemas de aprendizaje", F5),
        ]
    )

    # --- Circular erratas ---
    nodes.append(
        node(
            "misc_pdf_viceministro_academico_circ",
            "Viceministerio Académico — circular aclaraciones Cuaderno N°4",
            FERR,
        )
    )

    # --- Aristas documento → concepto ---
    def doc_edges(doc_id: str, concepts: list[str], sf: str) -> None:
        for c in concepts:
            edges.append(edge(doc_id, c, "references", "EXTRACTED", sf, score=1.0))

    doc_edges(
        "misc_pdf_doc_lineas_accion",
        [
            "misc_pdf_educacion_inclusiva",
            "misc_pdf_ley_8661",
            "misc_pdf_art24_cd_pd",
            "misc_pdf_barreras_entorno",
            "misc_pdf_objetivo_ods4",
            "misc_pdf_lineas_accion_mep",
            "misc_pdf_dua",
            "misc_pdf_docencia_compartida",
        ],
        F1,
    )

    doc_edges(
        "misc_pdf_doc_cuaderno_n1_qa",
        [
            "misc_pdf_lineas_accion_mep",
            "misc_pdf_proceso1",
            "misc_pdf_proceso2",
            "misc_pdf_proceso3",
            "misc_pdf_valoracion_integral",
            "misc_pdf_autoevaluacion_centro",
            "misc_pdf_estrategia_acompanamiento",
        ],
        F2,
    )

    doc_edges(
        "misc_pdf_doc_cuaderno_n2_pec",
        [
            "misc_pdf_lineas_accion_mep",
            "misc_pdf_proceso1",
            "misc_pdf_proceso2",
            "misc_pdf_proceso3",
            "misc_pdf_evaluacion_funcional",
            "misc_pdf_plan_apoyo_conductual",
            "misc_pdf_servicio_pec",
        ],
        F3,
    )

    doc_edges(
        "misc_pdf_doc_cuaderno_n3_dv",
        [
            "misc_pdf_lineas_accion_mep",
            "misc_pdf_proceso1",
            "misc_pdf_proceso2",
            "misc_pdf_proceso3",
            "misc_pdf_servicio_dv",
            "misc_pdf_acceso_informacion_dv",
        ],
        F4,
    )

    doc_edges(
        "misc_pdf_doc_cuaderno_n4_pa",
        [
            "misc_pdf_lineas_accion_mep",
            "misc_pdf_proceso1",
            "misc_pdf_proceso2",
            "misc_pdf_proceso3",
            "misc_pdf_servicio_pa",
            "misc_pdf_dislexia",
            "misc_pdf_discalculia",
            "misc_pdf_disortografia",
            "misc_pdf_disgrafia",
            "misc_pdf_dispraxia",
            "misc_pdf_tda_aprendizaje",
            "misc_pdf_aprendizaje_no_verbal",
            "misc_pdf_perfil_aprendizaje_lento",
            "misc_pdf_plan_apoyo_pa",
            "misc_pdf_procesos_aprendizaje",
            "misc_pdf_atencion_tipos",
            "misc_pdf_ruta_servicio_pa",
            "misc_pdf_dua",
        ],
        F5,
    )

    edges.extend(
        [
            edge(
                "misc_pdf_doc_circular_erratas_n4",
                "misc_pdf_doc_cuaderno_n4_pa",
                "references",
                "EXTRACTED",
                FERR,
            ),
            edge(
                "misc_pdf_doc_circular_erratas_n4",
                "misc_pdf_viceministro_academico_circ",
                "references",
                "EXTRACTED",
                FERR,
            ),
            edge(
                "misc_pdf_doc_circular_erratas_n4",
                "misc_pdf_ruta_servicio_pa",
                "references",
                "EXTRACTED",
                FERR,
            ),
            edge(
                "misc_pdf_doc_circular_erratas_n4",
                "misc_pdf_atencion_tipos",
                "references",
                "EXTRACTED",
                FERR,
            ),
        ]
    )

    # Relaciones entre conceptos
    edges.extend(
        [
            edge(
                "misc_pdf_valoracion_integral",
                "misc_pdf_proceso1",
                "conceptually_related_to",
                "EXTRACTED",
                F2,
            ),
            edge(
                "misc_pdf_estrategia_acompanamiento",
                "misc_pdf_proceso2",
                "conceptually_related_to",
                "EXTRACTED",
                F2,
            ),
            edge(
                "misc_pdf_evaluacion_funcional",
                "misc_pdf_plan_apoyo_conductual",
                "conceptually_related_to",
                "EXTRACTED",
                F3,
            ),
            edge(
                "misc_pdf_servicio_pa",
                "misc_pdf_dislexia",
                "conceptually_related_to",
                "INFERRED",
                F5,
                score=0.82,
            ),
            edge(
                "misc_pdf_procesos_aprendizaje",
                "misc_pdf_dislexia",
                "conceptually_related_to",
                "INFERRED",
                F5,
                score=0.78,
            ),
            edge(
                "misc_pdf_lineas_accion_mep",
                "misc_pdf_educacion_inclusiva",
                "rationale_for",
                "EXTRACTED",
                F1,
            ),
            edge(
                "misc_pdf_barreras_entorno",
                "misc_pdf_educacion_inclusiva",
                "rationale_for",
                "INFERRED",
                F1,
                score=0.85,
            ),
        ]
    )

    hyperedges = [
        {
            "id": "misc_pdf_h_three_processes",
            "label": "Los tres procesos del servicio de apoyo educativo",
            "nodes": ["misc_pdf_proceso1", "misc_pdf_proceso2", "misc_pdf_proceso3"],
            "relation": "participate_in",
            "confidence": "EXTRACTED",
            "confidence_score": 1.0,
            "source_file": F2,
        }
    ]

    return {
        "nodes": nodes,
        "edges": edges,
        "hyperedges": hyperedges,
        "input_tokens": 0,
        "output_tokens": 0,
    }


def community_labels_from_analysis(G, communities: dict) -> dict[int, str]:
    """Etiquetas breves por comunidad según grado y etiquetas de nodos."""
    labels: dict[int, str] = {}
    for cid, members in communities.items():
        mids = list(members)
        chunkish = sum(1 for n in mids if str(n).startswith("misc_ev_"))
        if chunkish >= max(4, len(mids) // 3):
            labels[cid] = "Fragmentos textuales (PDF)"
            continue
        neigh_labels: list[str] = []
        for nid in members[:12]:
            neigh_labels.append(G.nodes[nid].get("label", nid))
        joined = " ".join(neigh_labels).lower()
        if "pec" in joined or "conductual" in joined:
            labels[cid] = "PEC y conducta"
        elif "visual" in joined or "dv" in joined:
            labels[cid] = "Discapacidad visual"
        elif "dislexia" in joined or "aprendizaje" in joined or "atención" in joined:
            labels[cid] = "Problemas de aprendizaje"
        elif "proceso" in joined or "valoración" in joined or "cuaderno n1" in joined:
            labels[cid] = "Procesos y cuaderno QA"
        elif "ley" in joined or "convención" in joined or "líneas" in joined or "dua" in joined:
            labels[cid] = "Marco MEP e inclusión"
        elif "circular" in joined or "erratas" in joined:
            labels[cid] = "Circular y erratas"
        else:
            labels[cid] = f"Comunidad {cid}"
    return labels


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    combined = merge_extractions(extraction(), evidence_layer())
    evidence_nodes = sum(1 for n in combined["nodes"] if n.get("role") == "evidence_chunk")
    evidence_words = sum(
        len(n.get("chunk_text", "").split())
        for n in combined["nodes"]
        if n.get("role") == "evidence_chunk"
    )

    G = build_from_json(combined)
    communities = cluster(G)
    cohesion = score_all(G, communities)
    detection = {
        "total_files": 6,
        "total_words": evidence_words,
        "needs_graph": True,
        "warning": (
            "PDFs pedagógicos MEP en miscelaneos/. "
            "NominaCentrosEducativos2025.pdf omitido (fuera de contexto). "
            f"Texto fuente en {evidence_nodes} nodos evidence_chunk (campo chunk_text). "
            "Nodo misc_pdf_corpus_truth_scope describe alcance y respuestas negativas."
        ),
        "files": {"paper": [F1, F2, F3, F4, F5, FERR], "code": [], "document": [], "image": []},
        "skipped_sensitive": [],
    }
    tokens = {"input": 0, "output": 0}
    gods = god_nodes(G)
    surprises = surprising_connections(G, communities)
    draft_labels = {cid: f"C{cid}" for cid in communities}
    questions = suggest_questions(G, communities, draft_labels)
    labels = community_labels_from_analysis(G, communities)
    questions = suggest_questions(G, communities, labels)

    root_display = str(ROOT / "miscelaneos") + " (PDFs exportados)"
    report = generate(
        G,
        communities,
        cohesion,
        labels,
        gods,
        surprises,
        detection,
        tokens,
        root_display,
        suggested_questions=questions,
    )
    (OUT / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")
    to_json(G, communities, str(OUT / "graph.json"))
    if G.number_of_nodes() <= 5000:
        to_html(G, communities, str(OUT / "graph.html"), community_labels=labels)
        print("graph.html written")
    else:
        print(f"Omitido graph.html: {G.number_of_nodes()} nodos (>5000 límite graphify)")
    print(
        f"Nodes: {G.number_of_nodes()} (evidence_chunk={evidence_nodes}), "
        f"edges: {G.number_of_edges()}, ~words en evidencia: {evidence_words}, dir: {OUT}"
    )


if __name__ == "__main__":
    main()
