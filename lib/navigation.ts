/** Ítems de navegación principal (mobile-first, barra inferior). */

export type NavItem = {
  href: string
  label: string
  /** Coincidencia exacta o prefijo de ruta */
  match: 'exact' | 'prefix'
  icon: 'home' | 'students' | 'assessments' | 'reports' | 'profile'
}

export const MAIN_NAV: NavItem[] = [
  { href: '/', label: 'Inicio', match: 'exact', icon: 'home' },
  { href: '/servicio/estudiantes', label: 'Servicio', match: 'prefix', icon: 'students' },
  { href: '/valoraciones', label: 'Valoraciones', match: 'prefix', icon: 'assessments' },
  { href: '/informes', label: 'Informes', match: 'prefix', icon: 'reports' },
  { href: '/perfil', label: 'Perfil', match: 'prefix', icon: 'profile' },
]

/** Rutas sin barra de navegación (pantalla completa). */
export const NAV_HIDDEN_PREFIXES = ['/login']

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.match === 'exact') {
    return pathname === item.href
  }
  if (item.href === '/') return pathname === '/'
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function shouldShowAppNav(pathname: string): boolean {
  return !NAV_HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}
