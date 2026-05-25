import { redirect } from 'next/navigation'

/** Ruta legacy 0.5 → informe de periodo correcto. */
export default async function EstudianteInformeRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/informes/${id}`)
}
