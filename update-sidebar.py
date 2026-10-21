from pathlib import Path

p = Path("src/App.tsx")
s = p.read_text()

# Add desktop collapse state
state = "const [sidebar, setSidebar] = useState(false)"
if "const [sidebarHidden, setSidebarHidden]" not in s:
    if state not in s:
        raise SystemExit("STOP: sidebar state not found.")
    s = s.replace(
        state,
        state + "\n  const [sidebarHidden, setSidebarHidden] = useState(false)",
        1
    )

# Add a collapse control next to the brand
brand = '<div className="brand">Phorva OnechainAI</div>'
if 'className="sidebar-brand-row"' not in s:
    if brand not in s:
        raise SystemExit("STOP: brand not found.")
    s = s.replace(
        brand,
        '''<div className="sidebar-brand-row">
          <div className="brand">Phorva OnechainAI</div>
          <button className="sidebar-collapse" type="button"
            aria-label="Collapse sidebar" title="Collapse sidebar"
            onClick={() => {
              if (window.innerWidth <= 768) setSidebar(false)
              else setSidebarHidden(v => !v)
            }}>‹</button>
        </div>''',
        1
    )

# Make the main content respond to desktop collapse
if 'className={`main ${sidebarHidden ?' not in s:
    main = '<main className="main">'
    if main not in s:
        raise SystemExit("STOP: main container not found.")
    s = s.replace(
        main,
        '<main className={`main ${sidebarHidden ? "sidebar-hidden" : ""}`}>',
        1
    )

# Add Share before the existing Rename option
if "Share conversation" not in s:
    marker = '<div className="chat-menu">'
    pos = s.find(marker)
    if pos < 0:
        raise SystemExit("STOP: chat menu not found.")
    insert_at = pos + len(marker)
    share = '''
                            <button onClick={async () => {
                              setChatMenu(null)
                              const text = c.messages.map(m =>
                                (m.role === "user" ? "You: " : "OnechainAI: ") + m.content
                              ).join("\\\\n\\\\n")
                              try {
                                if (navigator.share) {
                                  await navigator.share({ title: c.title, text })
                                } else {
                                  await navigator.clipboard.writeText(text)
                                  alert("Conversation copied to clipboard.")
                                }
                              } catch (error) {
                                if (error instanceof Error && error.name !== "AbortError") {
                                  alert("Unable to share this conversation.")
                                }
                              }
                            }}>Share</button>
'''
    s = s[:insert_at] + share + s[insert_at:]

p.write_text(s)
print("Sidebar JSX updated.")
