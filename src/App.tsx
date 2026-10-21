import React, { useEffect, useRef, useState } from 'react'
import './App.css'

type ExecutionJourney = {
  kind: string
  status: string
  intent: string
  stages: Array<{ label: string; status: string }>
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  execution?: ExecutionJourney | null
}

type Chat = {
  id: string
  title: string
  messages: Message[]
}

type AppItem = {
  name: string
  handle: string
  description: string
  connection: {
    type: string
  }
}

export default function App() {
  const [chats, setChats] = useState<Chat[]>([])
  const [temporaryChat, setTemporaryChat] = useState<Chat | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sidebar, setSidebar] = useState(false)
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [temporary, setTemporary] = useState(false)
  const [generating, setGenerating] = useState(false)
  const streamTimer = useRef<number | null>(null)
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const [attachments, setAttachments] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [listening, setListening] = useState(false)
  const [model, setModel] = useState('OnechainAI')
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'like' | 'dislike'>>({})
  const [editing, setEditing] = useState<number | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [chatMenu, setChatMenu] = useState<string | null>(null)
  const [renameInput, setRenameInput] = useState('')
  const [saveHistory, setSaveHistory] = useState(true)

  const [memoryEnabled, setMemoryEnabled] = useState(true)
  const [memories, setMemories] = useState<Array<{
    id: string
    text: string
    createdAt: string
  }>>([])
  const [memoryLoading, setMemoryLoading] = useState(false)



  const [accountEmail, setAccountEmail] = useState(() => {
    return localStorage.getItem('phorva-onchainai-account-email') || ''
  })
  const [page, setPage] = useState<'landing' | 'login' | 'signup' | 'forgot-password' | 'chat' | 'apps' | 'app-detail' | 'authorize' | 'settings'>('landing')

  useEffect(() => {
    if (page !== 'chat' && page !== 'landing') return

    let cancelled = false

    async function loadConversations() {
      try {
        const response = await fetch(
          'http://localhost:8787/api/conversations?userId=local-user'
        )

        if (!response.ok) {
          throw new Error('Failed to load conversations')
        }

        const data = await response.json()

        if (!cancelled) {
          setChats(
            Array.isArray(data.conversations)
              ? data.conversations
              : []
          )

          setSaveHistory(
            data.historyEnabled !== false
          )
        }
      } catch (error) {
        console.error(
          'Failed to load conversations',
          error
        )
      }
    }

    loadConversations()

    return () => {
      cancelled = true
    }
  }, [page])

  useEffect(() => {
    if (
      page !== 'apps' &&
      page !== 'app-detail' &&
      page !== 'authorize'
    ) {
      return
    }

    let cancelled = false

    async function loadApps() {
      try {
        const response = await fetch(
          'http://localhost:8787/api/apps/catalog'
        )

        if (!response.ok) {
          throw new Error(
            'Failed to load app catalog'
          )
        }

        const data = await response.json()

        if (!cancelled) {
          setApps(
            Array.isArray(data.apps)
              ? data.apps
              : []
          )
        }
      } catch (error) {
        console.error(
          'Failed to load app catalog',
          error
        )
      }
    }

    loadApps()

    return () => {
      cancelled = true
    }
  }, [page])

  const [apps, setApps] = useState<AppItem[]>([])
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null)
  const [appSearch, setAppSearch] = useState('')
  const [connectedApps, setConnectedApps] = useState<Record<string, {
    handle: string
    name: string
    authorized: boolean
    status: string
    connectedAt: string
  }>>({})

  useEffect(() => {
    if (
      page !== 'apps' &&
      page !== 'app-detail' &&
      page !== 'authorize'
    ) {
      return
    }

    let cancelled = false

    async function loadConnectedApps() {
      try {
        const response = await fetch(
          'http://localhost:8787/api/apps/connections?userId=local-user'
        )

        if (!response.ok) {
          throw new Error(
            'Failed to load app connections'
          )
        }

        const data = await response.json()

        if (!cancelled) {
          setConnectedApps(
            data.connections &&
            typeof data.connections === 'object'
              ? data.connections
              : {}
          )
        }
      } catch (error) {
        console.error(
          'Failed to load app connections',
          error
        )
      }
    }

    loadConnectedApps()

    return () => {
      cancelled = true
    }
  }, [page])
  const [search, setSearch] = useState('')

  const chat = temporary && temporaryChat?.id === active
    ? temporaryChat
    : chats.find(c => c.id === active)

  useEffect(() => {
    if (page !== 'settings') return

    let cancelled = false

    async function loadMemory() {
      setMemoryLoading(true)

      try {
        const response = await fetch(
          'http://localhost:8787/api/memory?userId=local-user'
        )

        if (!response.ok) {
          throw new Error('Failed to load memory')
        }

        const data = await response.json()

        if (!cancelled) {
          setMemoryEnabled(data.enabled !== false)
          setMemories(
            Array.isArray(data.memories)
              ? data.memories
              : []
          )
        }
      } catch {
        if (!cancelled) {
          setMemoryEnabled(true)
          setMemories([])
        }
      } finally {
        if (!cancelled) {
          setMemoryLoading(false)
        }
      }
    }

    loadMemory()

    return () => {
      cancelled = true
    }
  }, [page])

  useEffect(() => {
    const container = messagesRef.current
    if (!container) return

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight

    if (generating || distanceFromBottom < 180) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: generating ? 'auto' : 'smooth'
      })
    }
  }, [chat?.messages, generating])

  function clearStream() {
    if (streamTimer.current !== null) {
      window.clearInterval(streamTimer.current)
      streamTimer.current = null
    }

    setGenerating(false)
  }

  function newChat() {
    clearStream()

    setActive(null)
    setInput('')
    setFiles([])
    setAttachments(false)
    setTemporaryChat(null)
    setEditing(null)
    setRenaming(null)
    setRenameInput('')
    setChatMenu(null)
    setPage('chat')

    try {
      localStorage.removeItem('phorva-onchainai-active-chat')
    } catch {
      // Ignore storage errors.
    }
  }

  async function renameChat(id: string) {
    const title = renameInput.trim()
    if (!title) return

    try {
      const response = await fetch(
        `http://localhost:8787/api/conversations/${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: 'local-user',
            title: title.slice(0, 80)
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to rename conversation')
      }

      const data = await response.json()

      setChats(prev =>
        prev.map(c =>
          c.id === id
            ? { ...c, title: data.title || title.slice(0, 80) }
            : c
        )
      )

      setRenaming(null)
      setRenameInput('')
    } catch (error) {
      console.error('Failed to rename conversation:', error)
    }
  }

  async function deleteChat(id: string) {
    try {
      const response = await fetch(
        `http://localhost:8787/api/conversations/${id}?userId=local-user`,
        {
          method: 'DELETE'
        }
      )

      if (!response.ok) {
        throw new Error('Failed to delete conversation')
      }

      setChats(prev => prev.filter(c => c.id !== id))

      if (active === id) {
        clearStream()
        setActive(null)
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  async function shareConversation() {
    if (!chat) return

    const text = chat.messages
      .map(m => `${m.role === 'user' ? 'You' : 'OnechainAI'}: ${m.content}`)
      .join('\n\n')

    const shareData = {
      title: chat.title,
      text
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard?.writeText(text)
        alert('Conversation copied to clipboard.')
      }
    } catch {
      // User cancelled sharing.
    }
  }

  function exportConversation() {
    if (!chat) return

    const text = [
      chat.title,
      '',
      ...chat.messages.map(m =>
        `${m.role === 'user' ? 'You' : 'OnechainAI'}: ${m.content}`
      )
    ].join('\n\n')

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${chat.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'onchainai-chat'}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function renderMarkdown(text: string) {
    const lines = text.split('\n')
    const output: React.ReactNode[] = []
    let code: string[] = []
    let inCode = false

    const inline = (value: string) => {
      const parts = value.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g)

      return parts.map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={index} className="inline-code">{part.slice(1, -1)}</code>
        }

        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>
        }

        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={index}>{part.slice(1, -1)}</em>
        }

        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
        if (link) {
          return (
            <a
              key={index}
              href={link[2]}
              target="_blank"
              rel="noreferrer"
            >
              {link[1]}
            </a>
          )
        }

        return <span key={index}>{part}</span>
      })
    }

    lines.forEach((line, index) => {
      if (line.trim().startsWith('```')) {
        if (inCode) {
          const codeText = code.join('\n')
          output.push(
            <div className="code-block" key={`code-${index}`}>
              <button
                className="code-copy"
                onClick={() => copyText(codeText)}
              >
                Copy
              </button>
              <pre><code>{codeText}</code></pre>
            </div>
          )
          code = []
          inCode = false
        } else {
          inCode = true
        }
        return
      }

      if (inCode) {
        code.push(line)
        return
      }

      if (!line.trim()) {
        output.push(<div className="md-space" key={`space-${index}`} />)
        return
      }

      const heading = line.match(/^(#{1,3})\s+(.+)$/)
      if (heading) {
        const level = heading[1].length
        const Tag = `h${level}` as 'h1' | 'h2' | 'h3'
        output.push(
          <Tag key={index}>{inline(heading[2])}</Tag>
        )
        return
      }

      if (/^\s*[-*]\s+/.test(line)) {
        output.push(
          <div className="md-list" key={index}>
            <span>•</span>
            <span>{inline(line.replace(/^\s*[-*]\s+/, ''))}</span>
          </div>
        )
        return
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        const match = line.match(/^\s*(\d+)\.\s+(.+)$/)
        if (match) {
          output.push(
            <div className="md-list" key={index}>
              <span>{match[1]}.</span>
              <span>{inline(match[2])}</span>
            </div>
          )
          return
        }
      }

      output.push(
        <div className="md-line" key={index}>
          {inline(line)}
        </div>
      )
    })

    if (inCode && code.length) {
      const codeText = code.join('\n')
      output.push(
        <div className="code-block" key="unfinished-code">
          <button
            className="code-copy"
            onClick={() => copyText(codeText)}
          >
            Copy
          </button>
          <pre><code>{codeText}</code></pre>
        </div>
      )
    }

    return output
  }

  function copyText(text: string) {
    navigator.clipboard?.writeText(text)
  }

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
  }

  async function rewriteChat(
    targetMessages: Message[],
    temporaryMode = false
  ) {
    if (generating) return

    const targetChat = chat
    if (!targetChat) return

    const conversationId = targetChat.id

    setGenerating(true)

    const baseMessages = targetMessages.filter(
      message => message.content.trim()
    )

    const withEmptyReply: Message[] = [
      ...baseMessages,
      {
        role: 'assistant',
        content: ''
      }
    ]

    if (
      temporaryMode &&
      temporaryChat?.id === conversationId
    ) {
      setTemporaryChat({
        ...targetChat,
        messages: withEmptyReply
      })
    } else {
      setChats(prev =>
        prev.map(c =>
          c.id === conversationId
            ? { ...c, messages: withEmptyReply }
            : c
        )
      )
    }

    try {
      const response = await fetch(
        `http://localhost:8787/api/conversations/${conversationId}/rewrite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: 'local-user',
            temporary: temporaryMode,
            messages: baseMessages
          })
        }
      )

      if (!response.ok) {
        throw new Error(
          `Rewrite failed with status ${response.status}`
        )
      }

      const data = await response.json()

      if (typeof data.content !== 'string') {
        throw new Error('Invalid rewrite response')
      }

      const replyExecution: ExecutionJourney | null = null
      let index = 0

      streamTimer.current = window.setInterval(() => {
        index += 2

        const content = data.content.slice(0, index)

        if (
          temporaryMode &&
          temporaryChat?.id === conversationId
        ) {
          setTemporaryChat(prev => {
            if (!prev) return prev

            const messages = [...prev.messages]

            messages[messages.length - 1] = {
            role: 'assistant',
            content,
            execution: replyExecution
          }

            return {
              ...prev,
              messages
            }
          })
        } else {
          setChats(prev =>
            prev.map(c => {
              if (c.id !== conversationId) return c

              const messages = [...c.messages]

              messages[messages.length - 1] = {
            role: 'assistant',
            content,
            execution: replyExecution
          }

              return {
                ...c,
                messages
              }
            })
          )
        }

        if (index >= data.content.length) {
          clearStream()
          setGenerating(false)
        }
      }, 18)
    } catch (error) {
      console.error(
        'Conversation rewrite failed:',
        error
      )

      const fallback =
        'I couldn’t regenerate the response. Please try again.'

      if (
        temporaryMode &&
        temporaryChat?.id === conversationId
      ) {
        setTemporaryChat(prev => {
          if (!prev) return prev

          const messages = [...prev.messages]

          messages[messages.length - 1] = {
            role: 'assistant',
            content: fallback
          }

          return {
            ...prev,
            messages
          }
        })
      } else {
        setChats(prev =>
          prev.map(c => {
            if (c.id !== conversationId) return c

            const messages = [...c.messages]

            messages[messages.length - 1] = {
              role: 'assistant',
              content: fallback
            }

            return {
              ...c,
              messages
            }
          })
        )
      }

      setGenerating(false)
    }
  }

  function regenerate() {
    if (!chat || generating) return

    const messages = chat.messages
    const lastUserIndex = [...messages]
      .reverse()
      .findIndex(m => m.role === 'user')

    if (lastUserIndex === -1) return

    const userIndex =
      messages.length - 1 - lastUserIndex

    rewriteChat(
      messages.slice(0, userIndex + 1),
      temporary && temporaryChat?.id === chat.id
    )
  }


  function stopGenerating() {
    clearStream()
  }

  function toggleVoice() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setInput(prev => prev || 'Voice input is not supported on this device.')
      return
    }

    if (listening) {
      setListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => setListening(true)

    recognition.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript || ''
      if (text) {
        setInput(prev => prev ? `${prev} ${text}` : text)
      }
    }

    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    recognition.start()
  }

  function pickFiles(accept: string, capture?: boolean) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = true

    if (capture) {
      input.setAttribute('capture', 'environment')
    }

    input.onchange = () => {
      const files = Array.from(input.files || [])
      if (files.length) {
        setFiles(prev => [...prev, ...files])
      }
      setAttachments(false)
    }

    input.click()
  }

  const resizeComposer = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }

  async function send() {
    if (generating) return

    const text = input.trim()
    if (!text) return

    setGenerating(true)
    setInput('')

    const userMessage: Message = {
      role: 'user',
      content: text
    }

    const emptyReply: Message = {
      role: 'assistant',
      content: ''
    }

    const isTemporary = temporary

    let walletContext: { address: string; chainId: string } | undefined
    try {
      const ethereum = (window as any).ethereum
      if (ethereum?.request) {
        const [accounts, chainId] = await Promise.all([
          ethereum.request({ method: 'eth_accounts' }),
          ethereum.request({ method: 'eth_chainId' })
        ])
        if (
          Array.isArray(accounts) &&
          typeof accounts[0] === 'string' &&
          typeof chainId === 'string'
        ) {
          walletContext = {
            address: accounts[0],
            chainId
          }
        }
      }
    } catch {
      // No wallet session available; the assistant will explain the limitation.
    }

    if (isTemporary) {
      const id = chat?.id ?? crypto.randomUUID()

      if (chat) {
        setTemporaryChat({
          ...chat,
          messages: [
            ...chat.messages,
            userMessage,
            emptyReply
          ]
        })
      } else {
        setTemporaryChat({
          id,
          title: text.slice(0, 40),
          messages: [userMessage, emptyReply]
        })
      }

      let replyText = ''
      let replyExecution: ExecutionJourney | null = null

      try {
        const response = await fetch(
          'http://localhost:8787/api/chat',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: 'local-user',
              message: text,
              model,
              walletContext,
              temporary: true,
              messages: [
                ...(chat?.messages || [])
                  .filter(message => message.content)
                  .map(message => ({
                    role: message.role,
                    content: message.content
                  })),
                {
                  role: 'user',
                  content: text
                }
              ]
            })
          }
        )

        if (!response.ok) {
          throw new Error(
            `API request failed with status ${response.status}`
          )
        }

        const data = await response.json()

        if (typeof data.content !== 'string') {
          throw new Error(
            'Invalid response from OnechainAI API'
          )
        }

        replyText = data.content
        replyExecution = data.execution &&
          data.execution.kind === 'state_change_request' &&
          Array.isArray(data.execution.stages)
            ? data.execution as ExecutionJourney
            : null
      } catch (error) {
        console.error(
          'OnechainAI request failed:',
          error
        )

        replyText =
          'I couldn’t connect to the OnechainAI service. Please make sure the OnechainAI API is running and try again.'
      }

      let index = 0

      streamTimer.current = window.setInterval(() => {
        index += 2

        const content = replyText.slice(0, index)

        setTemporaryChat(prev => {
          if (!prev || prev.id !== id) return prev

          const messages = [...prev.messages]

          messages[messages.length - 1] = {
            role: 'assistant',
            content,
            execution: replyExecution
          }

          return {
            ...prev,
            messages
          }
        })

        if (index >= replyText.length) {
          clearStream()
        }
      }, 18)

      return
    }

    const existingConversationId = chat?.id ?? null
    const clientPlaceholderId =
      existingConversationId ?? crypto.randomUUID()

    if (chat) {
      setChats(prev =>
        prev.map(c =>
          c.id === chat.id
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  userMessage,
                  emptyReply
                ]
              }
            : c
        )
      )
    } else {
      setChats(prev => [
        ...prev,
        {
          id: clientPlaceholderId,
          title: text.slice(0, 40),
          messages: [userMessage, emptyReply]
        }
      ])

      setActive(clientPlaceholderId)
    }

    let replyText = ''
    let replyExecution: ExecutionJourney | null = null
    let serverConversationId = existingConversationId

    try {
      const body: Record<string, unknown> = {
        userId: 'local-user',
        message: text,
        model,
        walletContext
      }

      if (existingConversationId) {
        body.conversationId = existingConversationId
      }

      const response = await fetch(
        'http://localhost:8787/api/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      )

      if (!response.ok) {
        throw new Error(
          `API request failed with status ${response.status}`
        )
      }

      const data = await response.json()

      if (typeof data.content !== 'string') {
        throw new Error(
          'Invalid response from OnechainAI API'
        )
      }

      if (
        typeof data.conversationId !== 'string' ||
        !data.conversationId
      ) {
        throw new Error(
          'Server did not return a conversation ID'
        )
      }

      serverConversationId = data.conversationId
      replyText = data.content
        replyExecution = data.execution &&
          data.execution.kind === 'state_change_request' &&
          Array.isArray(data.execution.stages)
            ? data.execution as ExecutionJourney
            : null

      if (!existingConversationId) {
        setChats(prev =>
          prev.map(c =>
            c.id === clientPlaceholderId
              ? {
                  ...c,
                  id: serverConversationId as string
                }
              : c
          )
        )

        setActive(serverConversationId)
      }
    } catch (error) {
      console.error(
        'OnechainAI request failed:',
        error
      )

      replyText =
        'I couldn’t connect to the OnechainAI service. Please make sure the OnechainAI API is running and try again.'
    }

    const streamId =
      serverConversationId ?? clientPlaceholderId

    let index = 0

    streamTimer.current = window.setInterval(() => {
      index += 2

      const content = replyText.slice(0, index)

      setChats(prev =>
        prev.map(c => {
          if (c.id !== streamId) return c

          const messages = [...c.messages]

          messages[messages.length - 1] = {
            role: 'assistant',
            content,
            execution: replyExecution
          }

          return {
            ...c,
            messages
          }
        })
      )

      if (index >= replyText.length) {
        clearStream()
      }
    }, 18)
  }

  useEffect(() => {
    return () => {
      if (streamTimer.current !== null) {
        window.clearInterval(streamTimer.current)
      }
    }
  }, [])

  if (page === 'landing') return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo">P</div>
        <h1>Phorva OnechainAI</h1>
        <p>AI for the on-chain economy.</p>
        <button className="primary-button" onClick={() => setPage('login')}>Log in</button>
        <button className="auth-link" onClick={() => setPage('signup')}>Sign up</button>
      </div>
    </div>
  )

  if (page === 'forgot-password') return (
    <div className="auth-page">
      <div className="auth-card">
        <button className="back-button" onClick={() => setPage('login')}>← Back to login</button>
        <h1>Reset your password</h1>
        <p>Enter your email and we'll send you a password reset link.</p>
        <input className="auth-input" placeholder="Email" type="email" />
        <button className="primary-button">Send reset link</button>
      </div>
    </div>
  )

  if (page === 'login' || page === 'signup') return (
    <div className="auth-page">
      <div className="auth-card">
        <button className="back-button" onClick={() => setPage('landing')}>← Back</button>
        <h1>{page === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <input className="auth-input" placeholder="Email" type="email" />
        <input className="auth-input" placeholder="Password" type="password" />
        <button className="primary-button" onClick={() => setPage('chat')}>
          {page === 'login' ? 'Log in' : 'Create account'}
        </button>
        {page === 'login' && (
          <button className="auth-link" onClick={() => setPage('forgot-password')}>
            Forgot password?
          </button>
        )}

        <button className="auth-link" onClick={() => setPage(page === 'login' ? 'signup' : 'login')}>
          {page === 'login' ? 'Create an account' : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="app">
      <aside className={`sidebar ${sidebar ? 'open' : ''}`}>
        <div className="sidebar-brand-row">
          <div className="brand">Phorva OnechainAI</div>
          <button className="sidebar-collapse" type="button"
            aria-label="Collapse sidebar" title="Collapse sidebar"
            onClick={() => {
              if (window.innerWidth <= 768) setSidebar(false)
              else setSidebarHidden(v => !v)
            }}>‹</button>
        </div>

        <button onClick={() => {
          newChat()
          setTemporary(false)
        }}>＋ New chat</button>

        <div className="nav">
          <input
          className="chat-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search chats"
/>
          <button onClick={() => setPage('apps')}>▦ Explore apps</button>
        </div>

        <div className="history">
          <small>Chats</small>
          {chats
            .filter(c => {
              const q = search.trim().toLowerCase()
              if (!q) return true

              return (
                c.title.toLowerCase().includes(q) ||
                c.messages.some(m => m.content.toLowerCase().includes(q))
              )
            })
            .map(c => (
              <div className="history-item" key={c.id}>
                {renaming === c.id ? (
                  <div className="rename-box">
                    <input
                      value={renameInput}
                      onChange={e => setRenameInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') renameChat(c.id)
                        if (e.key === 'Escape') {
                          setRenaming(null)
                          setRenameInput('')
                        }
                      }}
                      autoFocus
                    />
                    <button onClick={() => renameChat(c.id)}>Save</button>
                  </div>
                ) : (
                  <>
                    <button
                      className="history-title"
                      onClick={() => {
                        if (active !== c.id) clearStream()
                        setActive(c.id)
                        setSidebar(false)
                        setChatMenu(null)
                      }}
                    >
                      {c.title}
                    </button>

                    <button
                      className="history-more"
                      onClick={() => setChatMenu(chatMenu === c.id ? null : c.id)}
                      aria-label="Chat options"
                    >
                      ⋯
                    </button>

                    {chatMenu === c.id && (
                      <div className="chat-menu">
                            <button onClick={async () => {
                              setChatMenu(null)
                              const text = c.messages.map(m =>
                                (m.role === "user" ? "You: " : "OnechainAI: ") + m.content
                              ).join("\\n\\n")
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

                        <button onClick={() => {
                          setRenameInput(c.title)
                          setChatMenu(null)
                          setRenaming(c.id)
                        }}>
                          Rename
                        </button>

                        <button
                          className="danger"
                          onClick={() => {
                            deleteChat(c.id)
                            setChatMenu(null)
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
        </div>

        <button className="account" onClick={() => setPage('settings')}>
  Account
</button>
      </aside>

      {sidebar && (
        <button className="overlay" onClick={() => setSidebar(false)} />
      )}

      <main className={`main ${sidebarHidden ? "sidebar-hidden" : ""}`}>
        <header className="topbar">
          <button className="menu" onClick={() => setSidebar(true)} aria-label="Open sidebar">☰</button>
          <select
            className="model-select"
            value={model}
            onChange={e => setModel(e.target.value)}
          >
            <option>OnechainAI</option>
            <option>OnechainAI Fast</option>
          </select>
          <button
            className={`temporary ${temporary ? 'active' : ''}`}
            onClick={() => setTemporary(v => !v)}
          >
            {temporary ? 'Temporary chat' : 'Temporary'}
          </button>

          {chat && (
            <>
              <button
                className="share-chat"
                onClick={shareConversation}
              >
                Share
              </button>

              <button
                className="export-chat"
                onClick={exportConversation}
              >
                Export
              </button>
            </>
          )}
        </header>

        {page === 'authorize' && selectedApp ? (
          <section className="apps-page">
            <button className="back-button" onClick={() => setPage('apps')}>
              ← Back to apps
            </button>

            <div className="authorize-card">
              <div className="logo">P</div>
              <h1>Authorize {selectedApp.name}</h1>
              <p>
                Allow Phorva OnechainAI to use {selectedApp.name}
                for actions you request through the assistant.
              </p>
              <button
                className="primary-button"
                onClick={async () => {
                  try {
                    const response = await fetch(
                      'http://localhost:8787/api/apps/connect',
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          userId: 'local-user',
                          app: {
                            name: selectedApp.name,
                            handle: selectedApp.handle
                          }
                        })
                      }
                    )

                    if (!response.ok) {
                      throw new Error('Failed to authorize app')
                    }

                    const data = await response.json()

                    if (data.connected) {
                      setConnectedApps(previous => ({
                        ...previous,
                        [data.connected.handle]: data.connected
                      }))
                    }

                    setPage('apps')
                  } catch (error) {
                    console.error(
                      'Failed to authorize app',
                      error
                    )
                  }
                }}
              >
                Authorize
              </button>
            </div>
          </section>
        ) : page === 'settings' ? (
          <section className="settings-page">
            <h1>Settings</h1>

            <div className="settings-card">
              <div>
                <strong>Profile</strong>
                <p>Manage your Phorva OnechainAI account.</p>
              </div>
            </div>

            <div className="settings-card settings-preferences">
              <div>
                <strong>Chat history</strong>
                <p>Save conversations so they remain available after you reopen the app.</p>
              </div>

              <button
                className={`settings-toggle ${saveHistory ? 'active' : ''}`}
                onClick={async () => {
                  const next = !saveHistory

                  try {
                    const response = await fetch(
                      'http://localhost:8787/api/conversations/settings',
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          userId: 'local-user',
                          enabled: next
                        })
                      }
                    )

                    if (!response.ok) {
                      throw new Error(
                        'Failed to update chat history setting'
                      )
                    }

                    const data = await response.json()

                    setSaveHistory(
                      data.enabled !== false
                    )
                  } catch (error) {
                    console.error(
                      'Failed to update chat history setting:',
                      error
                    )
                  }
                }}
                aria-label={saveHistory ? 'Disable chat history' : 'Enable chat history'}
                aria-pressed={saveHistory}
              >
                <span />
              </button>
            </div>

            <div className="settings-card settings-preferences">
              <div>
                <strong>Memory</strong>
                <p className="memory-description">
                  Let OnechainAI remember useful preferences and facts across conversations.
                  Memory is contextual only and never authorizes blockchain actions.
                </p>
              </div>

              <button
                className={`settings-toggle ${memoryEnabled ? 'active' : ''}`}
                onClick={async () => {
                  const next = !memoryEnabled

                  try {
                    const response = await fetch(
                      'http://localhost:8787/api/memory/settings',
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          userId: 'local-user',
                          enabled: next
                        })
                      }
                    )

                    if (!response.ok) {
                      throw new Error('Failed to update memory settings')
                    }

                    setMemoryEnabled(next)
                  } catch {
                    // Keep the current setting if the server update fails.
                  }
                }}
                aria-label={
                  memoryEnabled
                    ? 'Disable memory'
                    : 'Enable memory'
                }
              >
                <span />
              </button>

              <div className="memory-list">
                <div className="memory-list-header">
                  <strong>Saved memories</strong>
                  <span>{memoryLoading ? 'Loading…' : memories.length}</span>
                </div>

                {memoryLoading ? (
                  <div className="memory-empty">
                    Loading memories…
                  </div>
                ) : memories.length === 0 ? (
                  <div className="memory-empty">
                    No saved memories yet.
                  </div>
                ) : (
                  memories.map(memory => (
                    <div className="memory-item" key={memory.id}>
                      <div className="memory-item-text">
                        {memory.text}
                      </div>

                      <button
                        className="memory-delete"
                        onClick={async () => {
                          try {
                            const response = await fetch(
                              `http://localhost:8787/api/memory/${memory.id}?userId=local-user`,
                              {
                                method: 'DELETE'
                              }
                            )

                            if (!response.ok) {
                              throw new Error('Failed to delete memory')
                            }

                            setMemories(current =>
                              current.filter(item => item.id !== memory.id)
                            )
                          } catch {
                            // Keep the memory visible if deletion fails.
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}

                {memories.length > 0 && (
                  <button
                    className="memory-clear"
                    onClick={async () => {
                      if (
                        !window.confirm(
                          'Clear all saved memories?'
                        )
                      ) {
                        return
                      }

                      try {
                        await Promise.all(
                          memories.map(memory =>
                            fetch(
                              `http://localhost:8787/api/memory/${memory.id}?userId=local-user`,
                              {
                                method: 'DELETE'
                              }
                            )
                          )
                        )

                        setMemories([])
                      } catch {
                        // Reload the server state if clearing fails.
                        try {
                          const response = await fetch(
                            'http://localhost:8787/api/memory?userId=local-user'
                          )

                          if (response.ok) {
                            const data = await response.json()
                            setMemories(
                              Array.isArray(data.memories)
                                ? data.memories
                                : []
                            )
                          }
                        } catch {
                          // Ignore reload errors.
                        }
                      }
                    }}
                  >
                    Clear all memories
                  </button>
                )}
              </div>
            </div>

            <div className="settings-card account-settings">
              <div>
                <strong>Account</strong>
                <p>
                  {accountEmail
                    ? accountEmail
                    : 'No account email is configured yet.'}
                </p>
              </div>

              <div className="settings-actions">
                <button
                  onClick={() => setPage('forgot-password')}
                >
                  Change password
                </button>

                <button
                  className="danger-action"
                  onClick={() => {
                    localStorage.removeItem('phorva-onchainai-account-email')
                    setAccountEmail('')
                    setPage('landing')
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </section>
        ) : page === 'app-detail' && selectedApp ? (
          <section className="apps-page app-detail-page">
            <button className="back-button" onClick={() => setPage('apps')}>
              ← Back to apps
            </button>
            <div className="app-detail-card">
              <h1>{selectedApp.name}</h1>
              <span>{selectedApp.handle}</span>
              <p>{selectedApp.description}</p>
              {(() => {
                const connection =
                  connectedApps[
                    selectedApp.handle.toLowerCase()
                  ]

                const isConnected =
                  connection?.authorized === true &&
                  connection?.status === 'connected'

                if (isConnected) {
                  return (
                    <div className="settings-actions">
                      <span className="connected-status">
                        ✓ Connected
                      </span>

                      <button
                        className="danger-action"
                        onClick={async () => {
                          try {
                            const response = await fetch(
                              'http://localhost:8787/api/apps/disconnect',
                              {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                  userId: 'local-user',
                                  handle: selectedApp.handle
                                })
                              }
                            )

                            if (!response.ok) {
                              throw new Error(
                                'Failed to disconnect app'
                              )
                            }

                            setConnectedApps(previous => {
                              const next = {
                                ...previous
                              }

                              delete next[
                                selectedApp.handle.toLowerCase()
                              ]

                              return next
                            })
                          } catch (error) {
                            console.error(
                              'Failed to disconnect app',
                              error
                            )
                          }
                        }}
                      >
                        Disconnect
                      </button>
                    </div>
                  )
                }

                return (
                  <button
                    className="primary-button"
                    onClick={() => setPage('authorize')}
                  >
                    Connect
                  </button>
                )
              })()}
            </div>
          </section>
        ) : page === 'apps' ? (
          <section className="apps-page">
            <h1>Apps</h1>
            <p>Connect with apps across the on-chain economy.</p>

            <input
              className="app-search"
              value={appSearch}
              onChange={e => setAppSearch(e.target.value)}
              placeholder="Search apps"
            />

            <div className="apps-grid">
              {apps
                .filter(app =>
                  `${app.name} ${app.handle} ${app.description}`
                    .toLowerCase()
                    .includes(appSearch.toLowerCase())
                )
                .map(app => {
                  const connection =
                    connectedApps[
                      app.handle.toLowerCase()
                    ]

                  const isConnected =
                    connection?.authorized === true &&
                    connection?.status === 'connected'

                  return (
                    <div className="app-card" key={app.handle}>
                      <button
                        className="app-info"
                        onClick={() => {
                          setSelectedApp(app)
                          setPage('app-detail')
                        }}
                      >
                        <strong>{app.name}</strong>
                        <span>{app.handle}</span>
                        <p>{app.description}</p>
                      </button>

                      <button
                        className="app-add"
                        onClick={() => {
                          setSelectedApp(app)
                          setPage(
                            isConnected
                              ? 'app-detail'
                              : 'authorize'
                          )
                        }}
                        aria-label={
                          isConnected
                            ? `Open ${app.name}`
                            : `Connect ${app.name}`
                        }
                      >
                        {isConnected ? '✓' : '+'}
                      </button>
                    </div>
                  )
                })}
            </div>
          </section>
        ) : (
          <section className="chat">
          {chat ? (
            <div className="messages" ref={messagesRef}>
              {chat.messages.map((m, i) => (
                <div className={`message-row ${m.role}`} key={i}>
                  {editing === i && m.role === 'user' ? (
                    <div className="edit-box">
                      <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                      />
                      <div>
                        <button onClick={() => {
                          setEditing(null)
                          setInput('')
                        }}>Cancel</button>
                        <button onClick={() => {
                          const editedText = input.trim()

                          if (!editedText || !chat) {
                            return
                          }

                          const editedMessages = chat.messages
                            .slice(0, i + 1)
                            .map((message, index) =>
                              index === i
                                ? {
                                    ...message,
                                    content: editedText
                                  }
                                : message
                            )

                          setEditing(null)
                          setInput('')

                          rewriteChat(
                            editedMessages,
                            temporary && temporaryChat?.id === chat.id
                          )
                        }}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={`message ${m.role}`}>
                        {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
                      </div>
                      {m.role === 'assistant' && m.execution && (
                        <div className="execution-journey">
                          <div className="execution-journey-heading">
                            <strong>Execution journey</strong>
                            <span className="journey-pending">
                              <i aria-hidden="true" />
                              Verification pending
                            </span>
                          </div>
                          <p className="execution-journey-note">
                            A state-changing request was detected. This is not an approval.
                            No wallet action or blockchain transaction has been started by this panel.
                          </p>
                          <ol>
                            {m.execution.stages.map((stage, stageIndex) => (
                              <li key={`${stage.label}-${stageIndex}`}
                                  className={`journey-stage ${stage.status}`}>
                                <span className="journey-marker">
                                  {stage.status === 'detected' ? '✓' : stageIndex + 1}
                                </span>
                                <span>{stage.label}</span>
                                <small>{stage.status === 'detected' ? 'Detected' : 'Not started'}</small>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      <div className={`message-actions ${m.role === 'assistant' ? 'assistant-message-actions' : 'user-message-actions'}`}>
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
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="welcome">
              <div className="logo">P</div>
              <h1>What can I help you with?</h1>
              <p>Explore crypto, DeFi, wallets and prediction markets.</p>

              <div className="welcome-prompts">
                <button type="button" onClick={() => setInput('Analyze the current DeFi market and explain the main opportunities and risks.')}>
                  <span>↗</span>
                  <span><strong>Explore DeFi</strong><small>Opportunities and risks</small></span>
                </button>

                <button type="button" onClick={() => setInput('Help me swap tokens safely. Explain the steps, fees and risks before I confirm anything.')}>
                  <span>⇄</span>
                  <span><strong>Swap tokens</strong><small>Plan a token swap</small></span>
                </button>

                <button type="button" onClick={() => setInput('Help me research a prediction market, compare the possible outcomes and understand the risks.')}>
                  <span>◉</span>
                  <span><strong>Prediction markets</strong><small>Research outcomes</small></span>
                </button>

                <button type="button" onClick={() => setInput('Explain how to review a crypto wallet address and assess its on-chain activity and potential risks.')}>
                  <span>⌕</span>
                  <span><strong>Analyze a wallet</strong><small>Review on-chain activity</small></span>
                </button>
              </div>
            </div>
          )}

          <div className="composer">
            {files.length > 0 && (
              <div className="attachment-preview">
                {files.map((file, index) => (
                  <div className="attachment-item" key={`${file.name}-${index}`}>
                    {file.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                      />
                    ) : (
                      <div className="file-icon">📎</div>
                    )}

                    <span title={file.name}>{file.name}</span>

                    <button
                      type="button"
                      onClick={() =>
                        setFiles(prev => prev.filter((_, i) => i !== index))
                      }
                      aria-label={`Remove ${file.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {attachments && (
              <div className="attachment-menu">
                <button onClick={() => pickFiles('image/*', true)}>
                  <span>📷</span>
                  Camera
                </button>

                <button onClick={() => pickFiles('image/*')}>
                  <span>🖼️</span>
                  Photos
                </button>

                <button onClick={() => pickFiles('*/*')}>
                  <span>📎</span>
                  Files
                </button>
              </div>
            )}

            <button
              className="attach-button"
              onClick={() => setAttachments(v => !v)}
              aria-label="Add attachment"
            >
              +
            </button>

            <button
              className={`voice-button ${listening ? 'listening' : ''}`}
              onClick={toggleVoice}
              aria-label={listening ? 'Stop voice input' : 'Voice input'}
            >
              {listening ? '●' : '🎙'}
            </button>

            <textarea
              value={input}
              onChange={e => {
                setInput(e.target.value)
                resizeComposer(e.currentTarget)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (!generating && input.trim()) {
                    send()
                  }
                }
              }}
              onInput={e => resizeComposer(e.currentTarget)}
              placeholder="Message OnechainAI..."
              rows={1}
              disabled={generating}
            />
            <button onClick={generating ? stopGenerating : send}>
              {generating ? '■' : '↑'}
            </button>
          </div>
          <p className="chat-disclaimer">
            OnechainAI can make mistakes. Verify important information before taking action.
          </p>
          </section>
        )}
      </main>
    </div>
  )
}
