// prisma/seed.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('kata2026', 10)

  const teacher = await prisma.teacher.upsert({
    where: { email: 'docente@kata.cr' },
    update: {},
    create: {
      email: 'docente@kata.cr',
      passwordHash,
      name: 'Nadya Alán Soto',
      centerName: 'Escuela IDA Garabito',
      circuit: '04 Aguas Zarcas',
      specialty: 'Problemas de Aprendizaje',
    },
  })

  console.log('✅ Seed completado:', teacher.name)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })