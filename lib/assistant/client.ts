export type AssistantProvider = 'google' | 'openai' | 'anthropic'
export type AssistantSource = AssistantProvider | 'local'

export type AssistantConfig = {
  configured: boolean
  provider: AssistantProvider | null
  model: string | null
}

function getGoogleApiKey(): string | undefined {
  return (
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GOOGLEAI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GOOGLE_AI_API_KEY?.trim() ||
    undefined
  )
}

/** Proveedor activo según AI_PROVIDER (default: google) y claves disponibles */
export function resolveAssistantProvider(): AssistantProvider | null {
  const forced = process.env.AI_PROVIDER?.trim().toLowerCase()

  if (forced === 'google' || forced === 'gemini') {
    return getGoogleApiKey() ? 'google' : null
  }
  if (forced === 'openai') {
    return process.env.OPENAI_API_KEY?.trim() ? 'openai' : null
  }
  if (forced === 'anthropic') {
    return process.env.ANTHROPIC_API_KEY?.trim() ? 'anthropic' : null
  }

  // Piloto: preferir Gemini (cuota gratuita)
  if (getGoogleApiKey()) return 'google'
  if (process.env.ANTHROPIC_API_KEY?.trim()) return 'anthropic'
  if (process.env.OPENAI_API_KEY?.trim()) return 'openai'
  return null
}

function modelForProvider(provider: AssistantProvider): string {
  switch (provider) {
    case 'google':
      return process.env.GOOGLE_MODEL?.trim() || 'gemini-2.5-flash'
    case 'openai':
      return process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
    case 'anthropic':
      return process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-20250514'
  }
}

export function getAssistantConfig(): AssistantConfig {
  const provider = resolveAssistantProvider()
  return {
    configured: provider !== null,
    provider,
    model: provider ? modelForProvider(provider) : null,
  }
}

export function isAssistantConfigured(): boolean {
  return getAssistantConfig().configured
}

async function completeGoogle(system: string, user: string): Promise<string> {
  const apiKey = getGoogleApiKey()
  if (!apiKey) throw new Error('GOOGLE_API_KEY no configurada')

  const model = process.env.GOOGLE_MODEL?.trim() || 'gemini-2.5-flash'
  const baseUrl =
    process.env.GOOGLE_API_BASE_URL?.trim() || 'https://generativelanguage.googleapis.com'
  const url = `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 8192,
      },
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 300)}`)
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
    error?: { message?: string }
  }

  if (data.error?.message) throw new Error(`Gemini: ${data.error.message}`)

  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('')
    .trim()

  if (!text) throw new Error('Respuesta vacía de Gemini')
  return text
}

async function completeOpenAI(system: string, user: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new Error('OPENAI_API_KEY no configurada')

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`OpenAI error ${res.status}: ${errText.slice(0, 300)}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Respuesta vacía de OpenAI')
  return text
}

async function completeAnthropic(system: string, user: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')

  const model = process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-20250514'

  const body: Record<string, unknown> = {
    model,
    max_tokens: 8192,
    system,
    messages: [{ role: 'user', content: user }],
  }

  // Opus 4.x+ rechaza temperature en la API actual
  const skipTemperature =
    /opus-4|claude-4-7/i.test(model) ||
    process.env.ANTHROPIC_SKIP_TEMPERATURE === 'true'
  if (!skipTemperature) {
    body.temperature = 0.4
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Anthropic error ${res.status}: ${errText.slice(0, 300)}`)
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[]
  }
  const text = data.content
    ?.filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim()

  if (!text) throw new Error('Respuesta vacía de Anthropic')
  return text
}

export async function completeChat(
  system: string,
  user: string,
): Promise<{ text: string; source: AssistantSource; provider: AssistantProvider; model: string } | null> {
  const provider = resolveAssistantProvider()
  if (!provider) return null

  const model = modelForProvider(provider)

  let text: string
  switch (provider) {
    case 'google':
      text = await completeGoogle(system, user)
      break
    case 'openai':
      text = await completeOpenAI(system, user)
      break
    case 'anthropic':
      text = await completeAnthropic(system, user)
      break
  }

  return { text, source: provider, provider, model }
}
