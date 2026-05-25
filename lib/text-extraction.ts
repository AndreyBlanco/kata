/**
 * lib/text-extraction.ts
 *
 * Extracción de texto plano desde PDF o DOCX subido por el docente.
 *
 *  - PDF  → `pdf-parse`
 *  - DOCX → `mammoth` (extractRawText)
 *  - DOC legacy / otros → no soportado en F-1
 *
 * No hay OCR: si el PDF es escaneado (sin capa de texto), `pdf-parse`
 * devuelve string vacío y este módulo lanza una excepción identificable.
 *
 * Pensado para ejecutarse en server (Node runtime), nunca en Edge.
 */

export const MAX_FILE_BYTES = 5 * 1024 * 1024  // 5 MB

export const SUPPORTED_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
] as const

export type SupportedMime = (typeof SUPPORTED_MIMES)[number]

export class TextExtractionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'UNSUPPORTED_MIME'
      | 'TOO_LARGE'
      | 'EMPTY_TEXT'
      | 'PARSE_FAILED'
      | 'EMPTY_FILE',
  ) {
    super(message)
    this.name = 'TextExtractionError'
  }
}

export interface ExtractedTextInfo {
  text: string
  /** Páginas/longitud aproximada — útil para warnings de truncado. */
  pageCount?: number
  charCount: number
}

/**
 * Devuelve true si el mime es uno de los soportados.
 */
export function isSupportedMime(mime: string): mime is SupportedMime {
  return (SUPPORTED_MIMES as readonly string[]).includes(mime)
}

/**
 * Detecta el mime real cuando el navegador manda algo genérico. Se basa en
 * la extensión del nombre del archivo.
 */
export function inferMimeFromFilename(name: string): SupportedMime | null {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.docx'))
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  return null
}

/**
 * Extrae texto plano del archivo subido. Lanza `TextExtractionError` con
 * código identificable cuando algo falla, así la API responde con un mensaje
 * útil al docente.
 */
export async function extractTextFromUpload(input: {
  buffer: Buffer
  mime: string
  filename: string
}): Promise<ExtractedTextInfo> {
  const { buffer, filename } = input

  if (buffer.length === 0) {
    throw new TextExtractionError('El archivo está vacío.', 'EMPTY_FILE')
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new TextExtractionError(
      `El archivo supera el tamaño máximo permitido (${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB).`,
      'TOO_LARGE',
    )
  }

  const mime: string = isSupportedMime(input.mime)
    ? input.mime
    : (inferMimeFromFilename(filename) ?? input.mime)

  if (!isSupportedMime(mime)) {
    throw new TextExtractionError(
      `Tipo de archivo no soportado: ${mime || 'desconocido'}. Subí PDF o DOCX.`,
      'UNSUPPORTED_MIME',
    )
  }

  let text = ''
  let pageCount: number | undefined

  if (mime === 'application/pdf') {
    const result = await parsePdf(buffer)
    text = result.text
    pageCount = result.pageCount
  } else {
    text = await parseDocx(buffer)
  }

  // Limpieza mínima — colapsar múltiples saltos en líneas en blanco simples.
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/\u00A0/g, ' ')        // nbsp → espacio
    .replace(/[ \t]+\n/g, '\n')     // espacios al final de línea
    .replace(/\n{3,}/g, '\n\n')     // 3+ saltos → 2
    .trim()

  if (text.length < 20) {
    throw new TextExtractionError(
      'No se pudo extraer texto del documento. Si es un PDF escaneado, convertilo a Word o aplicale OCR antes de subirlo.',
      'EMPTY_TEXT',
    )
  }

  return {
    text,
    pageCount,
    charCount: text.length,
  }
}

async function parsePdf(buffer: Buffer): Promise<{ text: string; pageCount?: number }> {
  // pdf-parse v2 expone una clase PDFParse. Import dinámico para que Next no
  // intente bundlearlo en Edge (depende de pdfjs-dist).
  let parser: { getText: () => Promise<{ text: string; total?: number }>; destroy: () => Promise<void> } | null = null
  try {
    const mod = (await import('pdf-parse')) as unknown as {
      PDFParse: new (opts: { data: Uint8Array }) => {
        getText: () => Promise<{ text: string; total?: number }>
        destroy: () => Promise<void>
      }
    }
    parser = new mod.PDFParse({ data: new Uint8Array(buffer) })
    const result = await parser.getText()
    return { text: result.text ?? '', pageCount: result.total }
  } catch (e) {
    throw new TextExtractionError(
      `No se pudo leer el PDF: ${e instanceof Error ? e.message : String(e)}`,
      'PARSE_FAILED',
    )
  } finally {
    if (parser) {
      try { await parser.destroy() } catch { /* noop */ }
    }
  }
}

async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value ?? ''
  } catch (e) {
    throw new TextExtractionError(
      `No se pudo leer el Word: ${e instanceof Error ? e.message : String(e)}`,
      'PARSE_FAILED',
    )
  }
}
