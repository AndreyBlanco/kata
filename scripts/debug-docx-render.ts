import fs from 'fs'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'

const template = fs.readFileSync('templates/bsa-2026.docx')

function render(label: string, data: Record<string, unknown>) {
  const zip = new PizZip(template)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  })
  doc.render(data)
  const xml = doc.getZip().file('word/document.xml')!.asText()
  console.log(`\n--- ${label} ---`)
  console.log('centerName tag left?', xml.includes('{institution.centerName}'))
  console.log('TEST CENTRO?', xml.includes('TEST CENTRO'))
  console.log('TEST NOMBRE?', xml.includes('TEST NOMBRE'))
  console.log('viDate1 tag left?', xml.includes('{viDate1}'))
  console.log('01/01/2026?', xml.includes('01/01/2026'))
}

render('nested', {
  institution: { centerName: 'TEST CENTRO', circuit: '', budgetCode: '', directorName: '', referenceDateDisplay: '' },
  student: { fullName: 'TEST NOMBRE', birthDateDisplay: '', ageAsWritten: '', cedula: '', contactPhone: '', legalGuardian: '', residence: '', referringTeacher: '', grade: '' },
  request: { educationalSituations: 'SITUACIONES', studentSchedule: 'HORARIO' },
  resolution: { supportDetermination: 'DETERMINACION', serviceProvisionNotes: 'NOTAS' },
  viDate1: '01/01/2026',
  svc_aprendizaje: true,
})

render('flat dotted keys', {
  'institution.centerName': 'TEST CENTRO',
  'student.fullName': 'TEST NOMBRE',
  'request.educationalSituations': 'SITUACIONES',
  viDate1: '01/01/2026',
  svc_aprendizaje: true,
})
