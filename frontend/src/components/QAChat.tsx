import { useState, useRef, useEffect } from 'react'
import { Send, MessageSquare, Loader2, FileText, Copy, Check, Download, Sparkles, History, X, Clock, RefreshCw, RotateCcw, FileDown, ChevronDown } from 'lucide-react'
import { askQuestion } from '../services/api'
import { ChatMessage, SourceCitation } from '../types'
import toast from 'react-hot-toast'

interface QAChatProps {
  selectedDocumentIds?: string[]
  darkMode?: boolean
}

interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  timestamp: Date
  documentIds?: string[]
}

const SUGGESTED_QUESTIONS = [
  "What is this document about?",
  "Summarize the key points",
  "What are the main features?",
  "Explain the purpose",
]

const STORAGE_KEY = 'chat_history_sessions'

export default function QAChat({ selectedDocumentIds, darkMode = false }: QAChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load chat history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const sessions = JSON.parse(saved).map((s: any) => ({
          ...s,
          timestamp: new Date(s.timestamp),
          messages: s.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }))
        setChatSessions(sessions)
      } catch (e) {
      }
    }
  }, [])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      const sessionId = currentSessionId || Date.now().toString()
      setCurrentSessionId(sessionId)
      
      const session: ChatSession = {
        id: sessionId,
        title: messages[0]?.question || 'New Chat',
        messages,
        timestamp: new Date(),
        documentIds: selectedDocumentIds
      }

      const existing = chatSessions.filter(s => s.id !== sessionId)
      const updated = [session, ...existing].slice(0, 50) // Keep last 50 sessions
      setChatSessions(updated)
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }
  }, [messages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleCopy = async (text: string, messageId: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(messageId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const exportToMarkdown = () => {
    if (messages.length === 0) {
      toast.error('No messages to export')
      return
    }

    const date = new Date().toISOString().split('T')[0]
    let markdown = `# Chat History Export\n\n`
    markdown += `**Date:** ${date}\n`
    markdown += `**Total Messages:** ${messages.length}\n\n`
    markdown += `---\n\n`

    messages.forEach((msg, index) => {
      markdown += `## Question ${index + 1}\n\n`
      markdown += `**Question:** ${msg.question}\n\n`
      markdown += `**Answer:**\n${msg.answer}\n\n`
      
      if (msg.sources && msg.sources.length > 0) {
        markdown += `**Sources:**\n`
        msg.sources.forEach((source, idx) => {
          markdown += `${idx + 1}. ${source.document_name} (Similarity: ${(source.similarity_score * 100).toFixed(1)}%)\n`
        })
        markdown += `\n`
      }
      
      markdown += `**Timestamp:** ${msg.timestamp.toLocaleString()}\n\n`
      markdown += `---\n\n`
    })

    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-history-${date}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Chat history exported to Markdown')
    setShowExportMenu(false)
  }

  const exportToPDF = () => {
    if (messages.length === 0) {
      toast.error('No messages to export')
      return
    }

    try {
      // Create HTML content for PDF
      const date = new Date().toISOString().split('T')[0]
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Chat History - ${date}</title>
          <style>
            @media print {
              @page { margin: 1cm; }
            }
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              line-height: 1.6; 
              color: #1F2937;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 { 
              color: #4F46E5; 
              border-bottom: 2px solid #4F46E5; 
              padding-bottom: 10px; 
              margin-bottom: 20px;
            }
            h2 { 
              color: #6366F1; 
              margin-top: 30px; 
              font-size: 1.2em;
            }
            .question { 
              background: #F3F4F6; 
              padding: 15px; 
              border-radius: 8px; 
              margin: 15px 0;
              border-left: 4px solid #6366F1;
            }
            .answer { 
              background: #EEF2FF; 
              padding: 15px; 
              border-radius: 8px; 
              margin: 15px 0;
              white-space: pre-wrap;
            }
            .sources { 
              background: #F9FAFB; 
              padding: 10px; 
              border-left: 4px solid #4F46E5; 
              margin: 10px 0;
              font-size: 0.9em;
            }
            .sources ul {
              margin: 5px 0;
              padding-left: 20px;
            }
            .timestamp { 
              color: #6B7280; 
              font-size: 0.85em; 
              margin-top: 10px; 
              font-style: italic;
            }
            .separator { 
              border-top: 1px solid #E5E7EB; 
              margin: 30px 0; 
            }
            .meta-info {
              margin-bottom: 20px;
              color: #6B7280;
            }
          </style>
        </head>
        <body>
          <h1>Chat History Export</h1>
          <div class="meta-info">
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Total Messages:</strong> ${messages.length}</p>
          </div>
          <div class="separator"></div>
      `

      messages.forEach((msg, index) => {
        // Escape HTML in question and answer
        const question = msg.question.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        const answer = msg.answer.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
        
        html += `
          <h2>Question ${index + 1}</h2>
          <div class="question">
            <strong>Question:</strong><br>
            ${question}
          </div>
          <div class="answer">
            <strong>Answer:</strong><br>
            ${answer}
          </div>
        `
        
        if (msg.sources && msg.sources.length > 0) {
          html += `<div class="sources"><strong>Sources:</strong><ul>`
          msg.sources.forEach((source) => {
            html += `<li>${source.document_name} (Similarity: ${(source.similarity_score * 100).toFixed(1)}%)</li>`
          })
          html += `</ul></div>`
        }
        
        html += `<div class="timestamp">Timestamp: ${msg.timestamp.toLocaleString()}</div>`
        if (index < messages.length - 1) {
          html += `<div class="separator"></div>`
        }
      })

      html += `</body></html>`

      // Create blob URL
      const blob = new Blob([html], { type: 'text/html' })
      const blobUrl = URL.createObjectURL(blob)
      
      // Try to open print dialog
      const printWindow = window.open(blobUrl, '_blank', 'width=800,height=600')
      
      if (printWindow) {
        // Wait for content to load
        const checkLoad = setInterval(() => {
          if (printWindow.document.readyState === 'complete') {
            clearInterval(checkLoad)
            setTimeout(() => {
              printWindow.focus()
              printWindow.print()
              toast.success('Print dialog opened. Select "Save as PDF" to download.')
            }, 300)
          }
        }, 100)
        
        // Timeout fallback
        setTimeout(() => {
          clearInterval(checkLoad)
          if (!printWindow.closed) {
            printWindow.print()
            toast.success('Print dialog opened. Select "Save as PDF" to download.')
          }
        }, 2000)
      } else {
        // Popup blocked - download HTML file as fallback
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = `chat-history-${date}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        toast.success('HTML file downloaded. Open it and use Print > Save as PDF.')
      }
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
      setShowExportMenu(false)
    } catch (error) {
      toast.error('Failed to export PDF. Please try again.')
      console.error('PDF export error:', error)
    }
  }

  const exportToJSON = () => {
    if (messages.length === 0) {
      toast.error('No messages to export')
      return
    }

    const chatData = messages.map(msg => ({
      question: msg.question,
      answer: msg.answer,
      timestamp: msg.timestamp.toISOString(),
      sources: msg.sources.map(s => ({
        document_name: s.document_name,
        document_id: s.document_id,
        similarity_score: s.similarity_score,
        chunk_text: s.chunk_text
      }))
    }))
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-history-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Chat history exported to JSON')
    setShowExportMenu(false)
  }

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportMenu])

  const handleLoadSession = (session: ChatSession) => {
    setMessages(session.messages)
    setCurrentSessionId(session.id)
    setShowHistory(false)
  }

  const handleNewChat = () => {
    setMessages([])
    setCurrentSessionId(null)
    setShowHistory(false)
  }

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = chatSessions.filter(s => s.id !== sessionId)
    setChatSessions(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    
    if (currentSessionId === sessionId) {
      handleNewChat()
    }
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
  }

  const askQuestionToAPI = async (question: string, messageId?: string) => {
    setIsLoading(true)
    toast.loading('Thinking...', { id: 'question' })

    try {
      const response = await askQuestion({
        question,
        document_ids: selectedDocumentIds,
      })

      if (messageId) {
        // Regenerating existing answer
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId
              ? { ...msg, answer: response.answer, sources: response.sources }
              : msg
          )
        )
        toast.success('Answer regenerated!', { id: 'question' })
      } else {
        // New question
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          question,
          answer: response.answer,
          sources: response.sources,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, userMessage])
        toast.success('Got your answer!', { id: 'question' })
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to get answer'
      toast.error(errorMessage, { id: 'question' })
      
      if (messageId) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId
              ? { ...msg, answer: `Error: ${errorMessage}`, sources: [] }
              : msg
          )
        )
      } else {
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          question,
          answer: `Error: ${errorMessage}`,
          sources: [],
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, userMessage])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const question = input.trim()
    setInput('')
    await askQuestionToAPI(question)
  }

  const handleRegenerate = async (messageId: string, question: string) => {
    await askQuestionToAPI(question, messageId)
  }

  const handleReAsk = (question: string) => {
    setInput(question)
    // Focus on input
    setTimeout(() => {
      const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement
      inputElement?.focus()
    }, 100)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Focus search (if we add global search)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        // Could focus document search
      }
      // Cmd/Ctrl + N: New chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        handleNewChat()
      }
      // Escape: Close modals/history
      if (e.key === 'Escape') {
        if (showHistory) {
          setShowHistory(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [showHistory])

  return (
    <div className={`rounded-xl shadow-lg flex flex-col h-[600px] relative ${
      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
    }`}>
      {/* Header */}
      <div className={`p-4 border-b ${
        darkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className={`text-xl font-semibold flex items-center gap-2 ${
                darkMode ? 'text-white' : 'text-gray-800'
              }`}>
                <MessageSquare className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                Ask Questions
              </h2>
              {selectedDocumentIds && selectedDocumentIds.length > 0 && (
                <p className={`text-sm mt-1 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Searching in {selectedDocumentIds.length} selected document(s)
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              } ${showHistory ? (darkMode ? 'bg-gray-700' : 'bg-gray-100') : ''}`}
              title="View chat history"
            >
              <History className="w-5 h-5" />
            </button>
            {messages.length > 0 && (
              <>
                <button
                  onClick={handleNewChat}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    darkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title="New chat"
                >
                  New
                </button>
                <div className="relative" ref={exportMenuRef}>
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={messages.length === 0}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${
                      messages.length === 0
                        ? 'opacity-50 cursor-not-allowed'
                        : darkMode
                        ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="Export chat history"
                  >
                    <Download className="w-5 h-5" />
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {showExportMenu && (
                    <div className={`absolute right-0 top-full mt-2 w-48 rounded-lg shadow-xl z-50 border-2 ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200'
                    }`}>
                      <button
                        onClick={exportToMarkdown}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                          darkMode
                            ? 'hover:bg-gray-700 text-gray-200'
                            : 'hover:bg-gray-50 text-gray-700'
                        } first:rounded-t-lg`}
                      >
                        <FileText className="w-4 h-4" />
                        Export as Markdown
                      </button>
                      <button
                        onClick={exportToPDF}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                          darkMode
                            ? 'hover:bg-gray-700 text-gray-200'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <FileDown className="w-4 h-4" />
                        Export as PDF
                      </button>
                      <button
                        onClick={exportToJSON}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                          darkMode
                            ? 'hover:bg-gray-700 text-gray-200'
                            : 'hover:bg-gray-50 text-gray-700'
                        } last:rounded-b-lg`}
                      >
                        <FileText className="w-4 h-4" />
                        Export as JSON
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {showHistory && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setShowHistory(false)}
        />
      )}

      {/* Chat History Sidebar */}
      {showHistory && (
        <div className={`absolute right-0 top-0 h-full w-80 z-50 border-l ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } shadow-2xl flex flex-col animate-slide-up`}>
          <div className={`p-4 border-b ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          } flex items-center justify-between`}>
            <h3 className={`text-lg font-semibold ${
              darkMode ? 'text-white' : 'text-gray-800'
            }`}>
              Chat History
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className={`p-1 rounded-lg transition-colors ${
                darkMode
                  ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {chatSessions.length === 0 ? (
              <div className={`text-center py-8 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No chat history yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleLoadSession(session)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      currentSessionId === session.id
                        ? darkMode
                          ? 'bg-indigo-900/30 border border-indigo-700'
                          : 'bg-indigo-50 border border-indigo-200'
                        : darkMode
                          ? 'bg-gray-700/50 hover:bg-gray-700 border border-gray-600'
                          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    } group`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          darkMode ? 'text-white' : 'text-gray-800'
                        }`}>
                          {session.title.length > 40 
                            ? session.title.substring(0, 40) + '...' 
                            : session.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className={`w-3 h-3 ${
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                          }`} />
                          <p className={`text-xs ${
                            darkMode ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            {formatDate(session.timestamp)}
                          </p>
                        </div>
                        <p className={`text-xs mt-1 ${
                          darkMode ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          {session.messages.length} message(s)
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                          darkMode
                            ? 'text-red-400 hover:bg-red-900/30'
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                        title="Delete session"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${
        darkMode ? 'bg-gray-900/50' : 'bg-gray-50'
      }`}>
        {messages.length === 0 ? (
          <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="relative mb-6">
              <MessageSquare className={`w-16 h-16 mx-auto ${darkMode ? 'text-gray-700' : 'text-gray-300'}`} />
              <Sparkles className={`w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${
                darkMode ? 'text-indigo-500' : 'text-indigo-400'
              } animate-pulse-slow`} />
            </div>
            <p className="mb-4">Start a conversation by asking a question</p>
            
            {/* Suggested Questions */}
            <div className="mt-6 space-y-2 max-w-md mx-auto">
              <p className={`text-sm mb-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Suggested questions:
              </p>
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestedQuestion(q)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-all text-sm ${
                    darkMode
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                      : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                  } hover:scale-[1.02] hover:shadow-md`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="space-y-3 animate-fade-in">
              {/* User Question */}
              <div className="flex justify-end">
                <div className={`rounded-2xl px-4 py-2.5 max-w-[80%] shadow-md group relative ${
                  darkMode
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                }`}>
                  <p className="text-sm">{message.question}</p>
                  <button
                    onClick={() => handleReAsk(message.question)}
                    className={`absolute -left-10 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded transition-all ${
                      darkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                    title="Re-ask this question"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* AI Answer */}
              {message.answer && (
                <div className="flex justify-start">
                  <div className={`rounded-2xl px-4 py-3 max-w-[80%] shadow-md ${
                    darkMode
                      ? 'bg-gray-700 text-gray-100'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className={`text-sm whitespace-pre-wrap flex-1 ${
                        darkMode ? 'text-gray-100' : 'text-gray-800'
                      }`}>
                        {message.answer}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleRegenerate(message.id, message.question)}
                          className={`p-1.5 rounded transition-colors ${
                            darkMode
                              ? 'hover:bg-gray-600 text-gray-400 hover:text-white'
                              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                          }`}
                          title="Regenerate answer"
                          disabled={isLoading}
                        >
                          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleCopy(message.answer, message.id)}
                          className={`p-1.5 rounded transition-colors ${
                            darkMode
                              ? 'hover:bg-gray-600 text-gray-400 hover:text-white'
                              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                          }`}
                          title="Copy answer"
                        >
                          {copiedId === message.id ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Sources */}
                    {message.sources.length > 0 && (
                      <div className={`mt-3 pt-3 border-t ${
                        darkMode ? 'border-gray-600' : 'border-gray-300'
                      }`}>
                        <p className={`text-xs font-semibold mb-2 ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Sources:
                        </p>
                        <div className="space-y-2">
                          {message.sources.map((source: SourceCitation, idx: number) => (
                            <div
                              key={idx}
                              className={`text-xs p-2.5 rounded-lg border ${
                                darkMode
                                  ? 'bg-gray-800 border-gray-700'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <FileText className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                                  darkMode ? 'text-indigo-400' : 'text-indigo-600'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`font-medium truncate ${
                                    darkMode ? 'text-gray-300' : 'text-gray-700'
                                  }`}>
                                    {source.document_name}
                                  </p>
                                  <p className={`mt-1 line-clamp-2 ${
                                    darkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                    {source.chunk_text}
                                  </p>
                                  <p className={`mt-1 ${
                                    darkMode ? 'text-gray-500' : 'text-gray-500'
                                  }`}>
                                    Similarity: {(source.similarity_score * 100).toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className={`rounded-2xl px-4 py-3 shadow-md ${
              darkMode ? 'bg-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <Loader2 className={`w-5 h-5 animate-spin ${
                darkMode ? 'text-indigo-400' : 'text-indigo-600'
              }`} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className={`p-4 border-t ${
        darkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents..."
            className={`flex-1 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 transition-all ${
              darkMode
                ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:ring-indigo-500'
                : 'bg-white border border-gray-300 text-gray-800 placeholder-gray-500 focus:ring-indigo-500'
            }`}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`px-6 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
              darkMode
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
