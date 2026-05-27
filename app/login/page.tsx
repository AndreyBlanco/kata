// app/login/page.tsx

'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KataLogo } from '@/components/ui/kata-logo'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()

  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'signup') {
      try {
        const res = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            name,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data.error || 'No se pudo crear la cuenta')
          setLoading(false)
          return
        }
        // Auto-login
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })
        if (result?.error) {
          setError('Cuenta creada, pero no se pudo iniciar sesión automáticamente.')
          setLoading(false)
          return
        }
        router.push('/')
        router.refresh()
        return
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta')
        setLoading(false)
        return
      }
    }

    const result = await signIn('credentials', { email, password, redirect: false })

    if (result?.error) {
      setError('Credenciales incorrectas')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-kata-surface px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex justify-center">
          <KataLogo width={280} height={100} priority />
        </div>
        <Card className="p-8 shadow-md">
          <p className="mb-6 text-center text-sm text-gray-500">
            Informes finales en minutos
          </p>

          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium ${
                mode === 'login'
                  ? 'border-kata-primary bg-white text-gray-900'
                  : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              Ingresar
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError('') }}
              className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium ${
                mode === 'signup'
                  ? 'border-kata-primary bg-white text-gray-900'
                  : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Nombre completo
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md
                               focus:outline-none focus:ring-2 focus:ring-kata-primary
                               focus:border-transparent text-gray-900"
                    placeholder="Nombre y apellidos"
                  />
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md
                           focus:outline-none focus:ring-2 focus:ring-kata-primary
                           focus:border-transparent text-gray-900"
                placeholder="docente@kata.cr"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md
                           focus:outline-none focus:ring-2 focus:ring-kata-primary
                           focus:border-transparent text-gray-900"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <Button type="submit" fullWidth disabled={loading}>
              {loading
                ? (mode === 'login' ? 'Ingresando...' : 'Creando cuenta...')
                : (mode === 'login' ? 'Ingresar' : 'Crear cuenta')}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            MVP Piloto v0.9
          </p>
        </Card>
      </div>
    </div>
  )
}