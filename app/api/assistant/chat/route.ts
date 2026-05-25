import { NextRequest, NextResponse } from 'next/server'
import { getAuthTeacher } from '@/lib/student-access'
import { handleAssistantChat } from '@/lib/assistant/handle-chat'
import type { AssistantChatRequest, AssistantMode } from '@/lib/assistant/types'
import { getAssistantConfig } from '@/lib/assistant/client'

const MODES = new Set<AssistantMode>([
  'interview_questions',
  'interview_synthesis',
  'observation_synthesis',
  'apply_preview',
  'review_vi',
])

export async function GET() {
  const config = getAssistantConfig()
  return NextResponse.json({
    configured: config.configured,
    provider: config.provider,
    model: config.model,
  })
}

export async function POST(req: NextRequest) {
  const auth = await getAuthTeacher(req)
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: AssistantChatRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.studentId || !MODES.has(body.mode)) {
    return NextResponse.json({ error: 'studentId y mode válidos requeridos' }, { status: 400 })
  }

  try {
    const result = await handleAssistantChat(auth.teacherId, body)
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error del asistente'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
