from pathlib import Path

p = Path("src/App.tsx")
s = p.read_text()

anchor = "const [model, setModel] = useState('OnechainAI')"
if "messageFeedback" not in s:
    if anchor not in s:
        raise SystemExit("STOP: model state not found; no changes made.")
    s = s.replace(
        anchor,
        anchor + "\n  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'like' | 'dislike'>>({})",
        1
    )

anchor = """  function copyText(text: string) {
    navigator.clipboard?.writeText(text)
  }"""

if "async function shareMessage(" not in s:
    if anchor not in s:
        raise SystemExit("STOP: copyText function not found; no changes made.")
    s = s.replace(
        anchor,
        anchor + """

  async function shareMessage(content: string) {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'OnechainAI response', text: content })
      } else {
        await navigator.clipboard?.writeText(content)
        alert('Response copied to clipboard.')
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        alert('Unable to share this response.')
      }
    }
  }""",
        1
    )

start = s.find('<div className="message-actions">')
if start < 0:
    if "assistant-message-actions" in s:
        print("Message toolbar already appears updated.")
        raise SystemExit(0)
    raise SystemExit("STOP: message toolbar not found; no changes saved.")

end = s.find("</div>", start)
if end < 0:
    raise SystemExit("STOP: toolbar closing tag not found; no changes saved.")

end += len("</div>")

new = """<div className={`message-actions ${m.role === 'assistant' ? 'assistant-message-actions' : 'user-message-actions'}`}>
                        {m.role === 'user' && (
                          <button onClick={() => {
                            setInput(m.content)
                            setEditing(i)
                          }}>Edit</button>
                        )}
                        {m.role === 'assistant' && (
                          <>
                            <button type="button" title="Copy" aria-label="Copy response" onClick={() => copyText(m.content)}>▢</button>
                            <button type="button" title="Like" aria-label="Like response" aria-pressed={messageFeedback[`${chat.id}-${i}`] === 'like'} className={messageFeedback[`${chat.id}-${i}`] === 'like' ? 'feedback-selected' : ''} onClick={() => setMessageFeedback(prev => ({ ...prev, [`${chat.id}-${i}`]: 'like' }))}>👍</button>
                            <button type="button" title="Unlike" aria-label="Unlike response" aria-pressed={messageFeedback[`${chat.id}-${i}`] === 'dislike'} className={messageFeedback[`${chat.id}-${i}`] === 'dislike' ? 'feedback-selected' : ''} onClick={() => setMessageFeedback(prev => ({ ...prev, [`${chat.id}-${i}`]: 'dislike' }))}>👎</button>
                            <button type="button" title="Share" aria-label="Share response" onClick={() => shareMessage(m.content)}>↗</button>
                            {i === chat.messages.length - 1 && (
                              <button type="button" title="Regenerate" aria-label="Regenerate response" onClick={regenerate}>↻</button>
                            )}
                          </>
                        )}
                      </div>"""

s = s[:start] + new + s[end:]
p.write_text(s)
print("Message toolbar updated.")
