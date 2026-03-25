// app/page.tsx

'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function HomePage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Katà</h1>
            <p className="text-sm text-gray-500">
              Hola, {session?.user?.name?.split(' ')[0] || 'Docente'}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-sm text-red-500 hover:underline"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Menú principal */}
      <div className="max-w-lg mx-auto p-4 space-y-3">
        <Link
          href="/estudiantes"
          className="block bg-white rounded-lg shadow-sm border p-4
                     hover:border-blue-300 transition-colors"
        >
          <h3 className="font-medium text-gray-900">📋 Estudiantes</h3>
          <p className="text-sm text-gray-500">Gestionar lista de estudiantes</p>
        </Link>

        <Link
          href="/estudiantes"
          className="block bg-white rounded-lg shadow-sm border p-4
                     hover:border-blue-300 transition-colors"
        >
          <h3 className="font-medium text-gray-900">🎯 Objetivos</h3>
          <p className="text-sm text-gray-500">Asignar desde el perfil de cada estudiante</p>
        </Link>

        <Link
          href="/estudiantes"
          className="block bg-white rounded-lg shadow-sm border p-4
                     hover:border-blue-300 transition-colors"
        >
          <h3 className="font-medium text-gray-900">📝 Sesiones</h3>
          <p className="text-sm text-gray-500">Generar y registrar desde el perfil de cada estudiante</p>
        </Link>

        <Link
          href="/valoraciones"
          className="block bg-white rounded-lg shadow-sm border p-4
                     hover:border-blue-300 transition-colors"
        >
          <h3 className="font-medium text-gray-900">📋 Valoraciones</h3>
          <p className="text-sm text-gray-500">Expedientes de valoración integral activos</p>
        </Link>

        <Link
          href="/informes"
          className="block bg-white rounded-lg shadow-sm border p-4
                     hover:border-blue-300 transition-colors"
        >
          <h3 className="font-medium text-gray-900">📄 Informes</h3>
          <p className="text-sm text-gray-500">Generar y exportar informes de periodo</p>
        </Link>
      </div>

      <p className="text-xs text-gray-400 text-center mt-8">
        Katà MVP v0.9 — Piloto
      </p>
    </div>
  )
}