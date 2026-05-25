'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { KataLogo } from '@/components/ui/kata-logo'

const QUICK_LINKS = [
  {
    href: '/servicio/estudiantes',
    title: 'Servicio PA',
    description: 'Lista operativa con estado de apoyo',
  },
  {
    href: '/estudiantes',
    title: 'Registro de estudiantes',
    description: 'Alta y listado administrativo',
  },
  {
    href: '/valoraciones',
    title: 'Valoraciones',
    description: 'Expedientes de valoración integral',
  },
  {
    href: '/horario',
    title: 'Horario base',
    description: 'Distribución semanal por categoría (Anexo 1)',
  },
  {
    href: '/planificacion',
    title: 'Planificación de acciones',
    description: 'Planes mensuales y exportación Anexo 5',
  },
  {
    href: '/informes',
    title: 'Informes',
    description: 'Generar informe de periodo',
  },
  {
    href: '/instrumentos',
    title: 'Instrumentos',
    description: 'Catálogo MEP y propuestas',
  },
] as const

export default function HomePage() {
  const { data: session } = useSession()
  const firstName = session?.user?.name?.split(' ')[0] || 'Docente'

  return (
    <>
      <header className="border-b bg-white px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <KataLogo width={120} height={44} />
          <button
            type="button"
            onClick={() => signOut()}
            className="text-sm text-red-600 hover:underline"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 p-4">
        <Card>
          <p className="text-sm text-gray-500">Bienvenida/o</p>
          <h1 className="text-lg font-bold text-gray-900">Hola, {firstName}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Problemas de aprendizaje — piloto v0.9
          </p>
        </Card>

        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Accesos rápidos
        </p>

        <div className="space-y-2">
          {QUICK_LINKS.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="transition-colors hover:border-kata-primary/40">
                <h2 className="font-medium text-gray-900">{item.title}</h2>
                <p className="text-sm text-gray-500">{item.description}</p>
              </Card>
            </Link>
          ))}
        </div>

        <p className="pb-2 text-center text-xs text-gray-400">
          Usa la barra inferior para navegar en cualquier momento
        </p>
      </div>
    </>
  )
}
