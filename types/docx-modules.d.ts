declare module 'docxtemplater' {
  import type PizZip from 'pizzip'

  export type DocxtemplaterOptions = {
    paragraphLoop?: boolean
    linebreaks?: boolean
    nullGetter?: (part: unknown) => string
    delimiters?: { start: string; end: string }
  }

  export default class Docxtemplater {
    constructor(zip: PizZip, options?: DocxtemplaterOptions)
    render(data: Record<string, unknown>): void
    getZip(): PizZip
  }
}

declare module 'pizzip' {
  export type GenerateOptions = {
    type: 'nodebuffer' | 'uint8array' | 'arraybuffer' | 'blob'
    compression?: 'DEFLATE' | 'STORE'
  }

  export default class PizZip {
    constructor(data?: Buffer | ArrayBuffer | Uint8Array | Record<string, string>)
    file(name: string): PizZipFile | null
    file(name: string, content: string | Buffer, options?: { binary?: boolean }): PizZip
    generate(options: GenerateOptions): Buffer
  }

  export interface PizZipFile {
    asText(): string
  }
}
