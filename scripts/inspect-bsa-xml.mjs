import fs from 'fs'
import PizZip from 'pizzip'

const zip = new PizZip(fs.readFileSync('miscelaneos/BSA-2026.docx'))
const xml = zip.file('word/document.xml').asText()
const runs = [...xml.matchAll(/<w:r[\s\S]*?<\/w:r>/g)]

const green = []
for (const m of runs) {
  const block = m[0]
  if (!/w:color w:val="00B050"/.test(block)) continue
  const texts = [...block.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((x) =>
    x[1].replace(/&amp;/g, '&'),
  )
  const t = texts.join('').trim()
  green.push({ t, blockLen: block.length })
}

console.log('green runs:', green.length)
green.forEach((g, i) => console.log(`${i + 1}. ${JSON.stringify(g.t)}`))
