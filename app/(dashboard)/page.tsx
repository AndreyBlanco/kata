// app/(dashboard)/page.tsx

export default function DashboardHomePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Inicio del panel
        </h1>
        <p className="text-sm text-gray-600">
          Esta vista servirá como resumen general del trabajo con tus estudiantes.
          Por ahora, utiliza el menú principal para navegar a Estudiantes, Sesiones,
          Objetivos e Informes.
        </p>
      </div>
    </div>
  )
}
