import { redirect } from 'next/navigation'

/** Ficha del estudiante → hub del expediente interno (Fase 0). */
export default async function StudentRootRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/estudiantes/${id}/expediente`)
}
