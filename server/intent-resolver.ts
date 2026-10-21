export type ResolvedIntent = {
  request: string
  provider: string | null
  providerExplicit: boolean
}

export function resolveIntent(
  message: string,
  knownProviders: string[] = []
): ResolvedIntent {
  const request = message.trim()

  if (!request) {
    return {
      request: '',
      provider: null,
      providerExplicit: false
    }
  }

  const handles = knownProviders
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)

  const providerPatterns = [
    /\buse\s+(@?[a-z0-9_-]+)/i,
    /\bthrough\s+(@?[a-z0-9_-]+)/i,
    /\bvia\s+(@?[a-z0-9_-]+)/i,
    /\busing\s+(@?[a-z0-9_-]+)/i
  ]

  for (const pattern of providerPatterns) {
    const match = request.match(pattern)

    if (!match) {
      continue
    }

    const candidate = match[1].startsWith('@')
      ? match[1].toLowerCase()
      : `@${match[1].toLowerCase()}`

    if (handles.length === 0 || handles.includes(candidate)) {
      return {
        request,
        provider: candidate,
        providerExplicit: true
      }
    }
  }

  const directMention = request.match(
    /(^|\s)(@[a-z0-9_-]+)/i
  )?.[2]?.toLowerCase()

  if (
    directMention &&
    (handles.length === 0 || handles.includes(directMention))
  ) {
    return {
      request,
      provider: directMention,
      providerExplicit: true
    }
  }

  return {
    request,
    provider: null,
    providerExplicit: false
  }
}
