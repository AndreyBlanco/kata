import fs from 'fs'

const xml = fs.readFileSync('miscelaneos/BSA-2026/word/document.xml', 'utf8')
const runs = [...xml.matchAll(/<w:r[\s\S]*?<\/w:r>/g)]
const green = []
const red = []

for (const block of runs.map((m) => m[0])) {
  const isGreen = /w:color w:val="00B050"/.test(block)
  const isRed = /w:color w:val="FF0000"/.test(block)
  const texts = [...block.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((x) =>
    x[1].replace(/&amp;/g, '&'),
  )
  const t = texts.join('').trim()
  if (!t) continue
  if (isGreen) green.push(t)
  if (isRed) red.push(t)
}

console.log('=== VERDE (editable) ===')
green.forEach((t, i) => console.log(`${i + 1}. ${JSON.stringify(t)}`))
console.log(`\nTotal verde: ${green.length}`)

console.log('\n=== ROJO (instrucción MEP — NO tocar) ===')
red.forEach((t, i) => console.log(`${i + 1}. ${JSON.stringify(t)}`))
