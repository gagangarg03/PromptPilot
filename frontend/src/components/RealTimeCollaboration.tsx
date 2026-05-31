import { useState, useEffect, useRef } from 'react'
import { Users, MessageSquare, Send, Loader2, Globe, Clock, Smile, Paperclip, Edit2, Trash2, X, Check, CheckCheck, Image as ImageIcon, File } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../services/api'
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'

interface RealTimeCollaborationProps {
  darkMode?: boolean
  workspaceId?: string
  userId?: string
  userName?: string
}

interface Message {
  id: string
  message_id?: string
  user_id: string
  user_name?: string
  content: string
  timestamp: number
  file_url?: string
  file_name?: string
  file_type?: string
  is_image?: boolean
  edited?: boolean
  edited_at?: number
  deleted?: boolean
  reactions?: Record<string, string[]>
  read_by?: string[]
}

interface User {
  id: string
  name: string
}

export default function RealTimeCollaboration({ 
  darkMode = false, 
  workspaceId = 'default',
  userId,
  userName: propUserName
}: RealTimeCollaborationProps) {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [workspaceInput, setWorkspaceInput] = useState(workspaceId)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null)
  const [showFullReactionPicker, setShowFullReactionPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const reactionPickerRef = useRef<HTMLDivElement>(null)

  // Extract user name from ID (email or user ID)
  const getUserName = (userId: string, providedName?: string): string => {
    // If a name was provided, use it
    if (providedName) {
      return providedName
    }
    // Otherwise, extract from email or use shortened ID
    if (userId.includes('@')) {
      return userId.split('@')[0]
    }
    return userId.length > 20 ? userId.substring(0, 20) + '...' : userId
  }

  const currentUserId = userId || `user_${Math.random().toString(36).substr(2, 9)}`
  const currentUserName = propUserName || getUserName(currentUserId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUsers])

  // Ensure workspace input is always a valid workspace name (not user ID)
  useEffect(() => {
    // If workspaceInput looks like a user ID (contains user_ prefix or is very long), reset to default
    if (workspaceInput.startsWith('user_') || workspaceInput.length > 30) {
      setWorkspaceInput('default')
    }
  }, [])

  const connect = () => {
    // Validate workspace ID - must not be a user ID
    const validWorkspace = workspaceInput.trim() || 'default'
    if (validWorkspace.startsWith('user_') || validWorkspace.length > 30) {
      toast.error('Invalid workspace ID. Use a short name like "default", "team-1", etc.')
      setWorkspaceInput('default')
      return
    }

    // Close existing connection if any
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        toast.error('Already connected. Please disconnect first.')
        return
      } else {
        // Clean up any existing connection
        wsRef.current.close()
        wsRef.current = null
      }
    }

    try {
      const wsUrl = `ws://localhost:8000/ws/collaborate/${validWorkspace}?user_id=${encodeURIComponent(currentUserId)}&user_name=${encodeURIComponent(currentUserName)}`
      const websocket = new WebSocket(wsUrl)
      wsRef.current = websocket
      
      // Set a timeout for connection
      const connectionTimeout = setTimeout(() => {
        if (websocket.readyState !== WebSocket.OPEN && websocket.readyState !== WebSocket.CONNECTING) {
          websocket.close()
          setConnected(false)
          setWs(null)
          toast.error('Connection timeout. Please check if the backend server is running on port 8000.')
        }
      }, 10000) // 10 second timeout
      
      websocket.onopen = () => {
        clearTimeout(connectionTimeout)
        setConnected(true)
        setWs(websocket)
        toast.success(`Connected to workspace "${validWorkspace}"!`)
      }

      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        if (data.type === 'connected') {
          setConnected(true)
          // Update user list if provided (with names from user_names dict)
          if (data.users && Array.isArray(data.users)) {
            setUsers(data.users.filter((u: string) => u !== currentUserId).map((u: string) => ({
              id: u,
              name: data.user_names?.[u] || getUserName(u, data.user_names?.[u])
            })))
          }
        } else if (data.type === 'user_joined') {
          const newUser = {
            id: data.user_id,
            name: data.user_name || getUserName(data.user_id, data.user_name)
          }
          setUsers(prev => {
            if (prev.some(u => u.id === newUser.id)) return prev
            return [...prev, newUser]
          })
          if (data.user_id !== currentUserId) {
            toast.success(`${newUser.name} joined the workspace`)
          }
        } else if (data.type === 'user_left') {
          setUsers(prev => prev.filter(u => u.id !== data.user_id))
          const userName = data.user_name || getUserName(data.user_id, data.user_name)
          if (data.user_id !== currentUserId) {
            toast(`${userName} left the workspace`, { icon: 'ℹ️' })
          }
        } else if (data.type === 'message') {
          const messageId = data.message_id || `${data.user_id}_${data.timestamp || Date.now()}`
          // Check if message already exists (to avoid duplicates from optimistic update)
          setMessages(prev => {
            const messageExists = prev.some(
              msg => (msg.message_id || msg.id) === messageId || 
                     (msg.user_id === data.user_id && 
                     msg.content === data.content && 
                     Math.abs(msg.timestamp - (data.timestamp || Date.now())) < 2000)
            )
            if (messageExists) {
              // Replace temp message with real one or update existing
              return prev.map(msg => 
                (msg.id.startsWith('temp_') && msg.user_id === data.user_id && msg.content === data.content) ||
                (msg.message_id || msg.id) === messageId
                  ? {
                      ...msg,
                      id: messageId,
                      message_id: messageId,
                      user_id: data.user_id,
                      user_name: data.user_name || getUserName(data.user_id, data.user_name),
                      content: data.content,
                      file_url: data.file_url,
                      file_name: data.file_name,
                      file_type: data.file_type,
                      is_image: data.is_image,
                      timestamp: data.timestamp || Date.now(),
                      reactions: msg.reactions || {},
                      read_by: msg.read_by || []
                    }
                  : msg
              )
            }
            // Add new message
            return [...prev, {
              id: messageId,
              message_id: messageId,
              user_id: data.user_id,
              user_name: data.user_name || getUserName(data.user_id, data.user_name),
              content: data.content,
              file_url: data.file_url,
              file_name: data.file_name,
              file_type: data.file_type,
              is_image: data.is_image,
              timestamp: data.timestamp || Date.now(),
              reactions: {},
              read_by: []
            }]
          })
          // Mark message as read
          if (data.user_id !== currentUserId && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'mark_read',
              message_id: messageId,
              timestamp: Date.now()
            }))
          }
        } else if (data.type === 'message_edited') {
          setMessages(prev => prev.map(msg => 
            (msg.message_id || msg.id) === data.message_id
              ? { ...msg, content: data.content, edited: true, edited_at: data.edited_at }
              : msg
          ))
        } else if (data.type === 'message_deleted') {
          setMessages(prev => prev.map(msg => 
            (msg.message_id || msg.id) === data.message_id
              ? { ...msg, deleted: true, content: 'This message was deleted' }
              : msg
          ))
        } else if (data.type === 'message_reacted') {
          // Ensure reactions are properly updated with correct emoji encoding
          setMessages(prev => prev.map(msg => {
            if ((msg.message_id || msg.id) === data.message_id) {
              // Use the reactions from the server (most up-to-date)
              const reactions = data.reactions || {}
              const cleanedReactions: Record<string, string[]> = {}
              
              // Ensure all emoji keys are strings and user lists are arrays
              Object.entries(reactions).forEach(([emoji, userIds]) => {
                // Preserve emoji as-is, ensure it's a string
                const emojiStr = String(emoji).trim()
                // Only process if emoji is not empty
                if (emojiStr && emojiStr.length > 0) {
                  const userIdsArray = Array.isArray(userIds) ? userIds : []
                  // Only add if there are users who reacted
                  if (userIdsArray.length > 0) {
                    cleanedReactions[emojiStr] = userIdsArray
                  }
                }
              })
              
              return { 
                ...msg, 
                reactions: cleanedReactions
              }
            }
            return msg
          }))
        } else if (data.type === 'message_read') {
          setMessages(prev => prev.map(msg => 
            (msg.message_id || msg.id) === data.message_id
              ? { ...msg, read_by: data.read_by || [] }
              : msg
          ))
        } else if (data.type === 'typing') {
          if (data.user_id !== currentUserId) {
            // Store user name with typing indicator if available
            setTypingUsers(prev => new Set(prev).add(data.user_id))
            // Also update user list if we have the name but user isn't in list yet
            if (data.user_name) {
              setUsers(prev => {
                if (prev.some(u => u.id === data.user_id)) {
                  // Update existing user's name
                  return prev.map(u => u.id === data.user_id ? { ...u, name: data.user_name || u.name } : u)
                }
                // Add new user if not in list
                return [...prev, { id: data.user_id, name: data.user_name }]
              })
            }
            // Clear typing indicator after 3 seconds
            setTimeout(() => {
              setTypingUsers(prev => {
                const newSet = new Set(prev)
                newSet.delete(data.user_id)
                return newSet
              })
            }, 3000)
          }
        } else if (data.type === 'update') {
          toast(`Update from ${data.user_name || getUserName(data.user_id, data.user_name)}`, { icon: 'ℹ️' })
        }
      }

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error)
        clearTimeout(connectionTimeout)
        setConnected(false)
        setWs(null)
        setUsers([])
        setTypingUsers(new Set())
        // Only show error if connection was not already closed
        if (websocket.readyState !== WebSocket.CLOSED && websocket.readyState !== WebSocket.CLOSING) {
          toast.error('Failed to connect to workspace. Make sure the backend server is running on port 8000.')
        }
      }

      websocket.onclose = (event) => {
        setConnected(false)
        setWs(null)
        setUsers([])
        setTypingUsers(new Set())
        // Only show disconnect message if connection was previously established
        if (event.code !== 1006) { // 1006 = abnormal closure (connection failed)
          toast('Disconnected from workspace', { icon: 'ℹ️' })
        }
      }

      setWs(websocket)
    } catch (error) {
      toast.error('Failed to connect')
      console.error(error)
    }
  }

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
      setWs(null)
      setConnected(false)
      setMessages([])
      setUsers([])
      setTypingUsers(new Set())
    }
  }

  const sendTypingIndicator = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    
    ws.send(JSON.stringify({
      type: 'typing',
      user_id: currentUserId,
      user_name: currentUserName
    }))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value)
    
    // Send typing indicator
    if (connected && ws && ws.readyState === WebSocket.OPEN) {
      sendTypingIndicator()
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        // Typing indicator automatically clears after 3 seconds on server
      }, 1000)
    }
  }

  const uploadFile = async (file: File) => {
    if (!connected || !ws || ws.readyState !== WebSocket.OPEN) {
      toast.error('Not connected to workspace')
      return null
    }

    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('workspace_id', workspaceInput)

      const response = await api.post('/api/collaboration/upload-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000 // 60 seconds for file uploads
      })

      return response.data
    } catch (error: any) {
      toast.error('Failed to upload file')
      console.error('File upload error:', error)
      return null
    } finally {
      setUploadingFile(false)
    }
  }

  const sendMessage = async (fileData?: any) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return
    }

    const messageText = messageInput.trim()
    const hasFile = fileData || selectedFile
    const hasContent = messageText || hasFile

    if (!hasContent) {
      return
    }

    let fileInfo = fileData
    if (selectedFile && !fileData) {
      fileInfo = await uploadFile(selectedFile)
      if (!fileInfo) return
      setSelectedFile(null)
    }

    const timestamp = Date.now()
    const messageId = `${currentUserId}_${timestamp}`

    // Optimistically add message to UI immediately
    const tempMessage: Message = {
      id: messageId,
      message_id: messageId,
      user_id: currentUserId,
      user_name: currentUserName,
      content: messageText,
      timestamp: timestamp,
      file_url: fileInfo?.file_url,
      file_name: fileInfo?.file_name,
      file_type: fileInfo?.file_type,
      is_image: fileInfo?.is_image,
      reactions: {},
      read_by: []
    }
    setMessages(prev => [...prev, tempMessage])
    setMessageInput('')

    // Send to WebSocket
    const message = {
      type: 'message',
      message_id: messageId,
      user_id: currentUserId,
      user_name: currentUserName,
      content: messageText,
      file_url: fileInfo?.file_url,
      file_name: fileInfo?.file_name,
      file_type: fileInfo?.file_type,
      is_image: fileInfo?.is_image,
      timestamp: timestamp
    }

    ws.send(JSON.stringify(message))
  }

  const editMessage = (messageId: string, currentContent: string) => {
    setEditingMessageId(messageId)
    setEditContent(currentContent)
  }

  const saveEdit = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !editingMessageId || !editContent.trim()) {
      return
    }

    ws.send(JSON.stringify({
      type: 'edit_message',
      message_id: editingMessageId,
      content: editContent.trim(),
      timestamp: Date.now()
    }))

    setEditingMessageId(null)
    setEditContent('')
  }

  const deleteMessage = (messageId: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return
    }

    if (window.confirm('Are you sure you want to delete this message?')) {
      ws.send(JSON.stringify({
        type: 'delete_message',
        message_id: messageId,
        timestamp: Date.now()
      }))
    }
  }

  const reactToMessage = (messageId: string, emoji: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return
    }

    ws.send(JSON.stringify({
      type: 'react_to_message',
      message_id: messageId,
      emoji: emoji,
      timestamp: Date.now()
    }))
    
    // Close reaction picker after selecting emoji
    setReactionPickerMessageId(null)
  }

  const handleReactionClick = (messageId: string) => {
    if (reactionPickerMessageId === messageId) {
      setReactionPickerMessageId(null)
    } else {
      setReactionPickerMessageId(messageId)
    }
  }

  const onReactionEmojiClick = (emojiData: EmojiClickData, messageId: string) => {
    reactToMessage(messageId, emojiData.emoji)
    setShowEmojiPicker(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Auto-send file if message input is empty, otherwise wait for send button
      if (!messageInput.trim()) {
        sendMessage()
      }
    }
  }

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (seconds < 60) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const onEmojiClick = (emojiData: EmojiClickData) => {
    const emoji = emojiData.emoji
    const input = messageInputRef.current
    if (input) {
      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      const text = messageInput
      const newText = text.substring(0, start) + emoji + text.substring(end)
      setMessageInput(newText)
      
      // Set cursor position after emoji
      setTimeout(() => {
        input.focus()
        input.setSelectionRange(start + emoji.length, start + emoji.length)
      }, 0)
    } else {
      setMessageInput(prev => prev + emoji)
    }
  }

  useEffect(() => {
    return () => {
      disconnect()
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('button[data-emoji-button]')
      ) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showEmojiPicker])

  // Close reaction picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('button[data-reaction-button]')
      ) {
        setReactionPickerMessageId(null)
        setShowFullReactionPicker(false)
      }
    }

    if (reactionPickerMessageId || showFullReactionPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [reactionPickerMessageId, showFullReactionPicker])

  const bgColor = darkMode ? 'bg-gray-900' : 'bg-white'
  const textColor = darkMode ? 'text-gray-100' : 'text-gray-900'
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-300'
  const inputBg = darkMode ? 'bg-gray-800' : 'bg-gray-50'
  const cardBg = darkMode ? 'bg-gray-800' : 'bg-gray-50'

  return (
    <div className={`flex flex-col h-full ${bgColor} ${textColor}`}>
      {/* Header */}
      <div className={`p-4 border-b ${borderColor}`}>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Real-time Collaboration
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Connect with team members in real-time workspaces
        </p>
      </div>

      {/* Connection Panel */}
      <div className={`p-4 border-b ${borderColor}`}>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={workspaceInput}
            onChange={(e) => {
              const value = e.target.value.trim()
              // Prevent user IDs from being used as workspace names
              if (!value.startsWith('user_') && value.length <= 30) {
                setWorkspaceInput(value)
              }
            }}
            placeholder="Workspace ID (e.g., default, team-1)"
            className={`flex-1 ${inputBg} ${textColor} border ${borderColor} rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            disabled={connected}
          />
          {!connected ? (
            <button
              onClick={connect}
              className={`px-4 py-2 rounded-lg ${
                darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'
              } text-white transition-colors flex items-center gap-2`}
            >
              <Globe className="w-4 h-4" />
              Connect
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>
        {connected && (
          <div className="mt-2 flex items-center gap-2 text-sm flex-wrap">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Connected as <strong>{currentUserName}</strong></span>
            <span className="text-gray-500">•</span>
            <span>Workspace: <strong className="text-indigo-500">{workspaceInput}</strong></span>
            <span className="text-gray-500">•</span>
            <span className="font-medium">{users.length + 1} users online</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No messages yet. Start chatting!</p>
                <p className="text-xs mt-1">Make sure both users are in the same workspace</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isOwnMessage = msg.user_id === currentUserId
                const showAvatar = index === 0 || messages[index - 1].user_id !== msg.user_id
                const userName = msg.user_name || getUserName(msg.user_id, msg.user_name)
                
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {!isOwnMessage && showAvatar && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {!isOwnMessage && !showAvatar && <div className="w-8"></div>}
                    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[70%] group`}>
                      {showAvatar && (
                        <div className="text-xs text-gray-500 mb-1 px-1">
                          {userName} {isOwnMessage && '(You)'}
                        </div>
                      )}
                      <div
                        className={`rounded-lg p-3 relative ${
                          msg.deleted ? 'opacity-50 italic' : ''
                        } ${
                          isOwnMessage
                            ? darkMode
                              ? 'bg-indigo-600 text-white'
                              : 'bg-indigo-500 text-white'
                            : `${cardBg} border ${borderColor}`
                        }`}
                      >
                        {/* File/Image Display */}
                        {msg.file_url && (
                          <div className="mb-2">
                            {msg.is_image ? (
                              <img 
                                src={`http://localhost:8000${msg.file_url}`} 
                                alt={msg.file_name || 'Image'} 
                                className="max-w-full max-h-64 rounded-lg cursor-pointer"
                                onClick={() => window.open(`http://localhost:8000${msg.file_url}`, '_blank')}
                              />
                            ) : (
                              <a 
                                href={`http://localhost:8000${msg.file_url}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 rounded bg-black/10 hover:bg-black/20 transition-colors"
                              >
                                <File className="w-4 h-4" />
                                <span className="text-sm truncate">{msg.file_name || 'File'}</span>
                              </a>
                            )}
                          </div>
                        )}
                        
                        {/* Message Content */}
                        {editingMessageId === (msg.message_id || msg.id) ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className={`flex-1 ${inputBg} ${textColor} border ${borderColor} rounded px-2 py-1 text-sm`}
                              autoFocus
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') saveEdit()
                                if (e.key === 'Escape') {
                                  setEditingMessageId(null)
                                  setEditContent('')
                                }
                              }}
                            />
                            <button
                              onClick={saveEdit}
                              className="p-1 hover:bg-black/20 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingMessageId(null)
                                setEditContent('')
                              }}
                              className="p-1 hover:bg-black/20 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.deleted ? 'This message was deleted' : msg.content}
                            </p>
                            
                            {/* Reactions */}
                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                                  <button
                                    key={`${emoji}-${msg.message_id || msg.id}`}
                                    onClick={() => reactToMessage(msg.message_id || msg.id, emoji)}
                                    className={`px-2 py-1 rounded-full text-xs flex items-center gap-1.5 transition-all hover:scale-105 ${
                                      userIds.includes(currentUserId)
                                        ? darkMode ? 'bg-indigo-500' : 'bg-indigo-200'
                                        : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                                    }`}
                                    title={`${userIds.length} reaction${userIds.length > 1 ? 's' : ''}`}
                                  >
                                    <span 
                                      className="text-lg leading-none inline-block select-none" 
                                      style={{ 
                                        fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Segoe UI Symbol, sans-serif',
                                        lineHeight: '1',
                                        display: 'inline-block',
                                        minWidth: '1.2em',
                                        textAlign: 'center',
                                        fontSize: '1.1em'
                                      }}
                                    >
                                      {emoji}
                                    </span>
                                    {userIds.length > 0 && (
                                      <span className="text-xs font-medium">{userIds.length}</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            
                            {/* Message Actions & Meta */}
                            <div className="flex items-center justify-between mt-2 gap-2">
                              <div className={`text-xs flex items-center gap-1 ${
                                isOwnMessage ? 'text-indigo-100' : 'text-gray-500'
                              }`}>
                                <Clock className="w-3 h-3" />
                                {formatTime(msg.timestamp)}
                                {msg.edited && (
                                  <span className="italic ml-1">(edited)</span>
                                )}
                              </div>
                              
                              {/* Read Receipts */}
                              {isOwnMessage && msg.read_by && msg.read_by.length > 0 && (
                                <div className="flex items-center gap-1" title={`Read by ${msg.read_by.length} user(s)`}>
                                  {msg.read_by.length === users.length + 1 ? (
                                    <CheckCheck className="w-3 h-3 text-blue-400" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Action Buttons (Edit/Delete/React) */}
                            {!msg.deleted && (
                              <div className={`absolute ${isOwnMessage ? 'left-0' : 'right-0'} -top-8 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 relative`}>
                                {isOwnMessage && (
                                  <>
                                    <button
                                      onClick={() => editMessage(msg.message_id || msg.id, msg.content)}
                                      className={`p-1 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                                      title="Edit message"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => deleteMessage(msg.message_id || msg.id)}
                                      className={`p-1 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                                      title="Delete message"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                                <div className="relative">
                                  <button
                                    data-reaction-button
                                    onClick={() => handleReactionClick(msg.message_id || msg.id)}
                                    className={`p-1 rounded ${
                                      reactionPickerMessageId === (msg.message_id || msg.id)
                                        ? darkMode ? 'bg-indigo-600' : 'bg-indigo-100'
                                        : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                                    }`}
                                    title="Add reaction"
                                  >
                                    <Smile className="w-3 h-3" />
                                  </button>
                                  
                                  {/* Quick Reaction Bar (WhatsApp style) */}
                                  {reactionPickerMessageId === (msg.message_id || msg.id) && !showFullReactionPicker && (
                                    <div 
                                      ref={reactionPickerRef}
                                      className={`absolute bottom-full right-0 mb-2 z-50 flex gap-1 p-2 rounded-full shadow-lg ${
                                        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                                      }`}
                                    >
                                      {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() => reactToMessage(msg.message_id || msg.id, emoji)}
                                          className="text-2xl hover:scale-125 transition-transform p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                                          title={`React with ${emoji}`}
                                          style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                      <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                                      <button
                                        onClick={() => {
                                          setShowFullReactionPicker(true)
                                        }}
                                        className="text-lg hover:scale-125 transition-transform p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center w-8 h-8"
                                        title="More emojis"
                                      >
                                        <Smile className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                  
                                  {/* Full Emoji Picker for Reactions */}
                                  {reactionPickerMessageId === (msg.message_id || msg.id) && showFullReactionPicker && (
                                    <div 
                                      ref={reactionPickerRef}
                                      className="absolute bottom-full right-0 mb-2 z-50"
                                    >
                                      <EmojiPicker
                                        onEmojiClick={(emojiData) => onReactionEmojiClick(emojiData, msg.message_id || msg.id)}
                                        theme={darkMode ? ('dark' as any) : ('light' as any)}
                                        width={350}
                                        height={400}
                                        previewConfig={{
                                          showPreview: false
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            
            {/* Typing Indicators */}
            {typingUsers.size > 0 && (
              <div className="flex gap-2 items-center">
                <div className="w-8"></div>
                <div className={`${cardBg} border ${borderColor} rounded-lg px-4 py-2`}>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Array.from(typingUsers).map(id => {
                      const user = users.find(u => u.id === id)
                      return user ? user.name : getUserName(id)
                    }).join(', ')} typing...
                  </p>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          {connected && (
            <div className={`p-4 border-t ${borderColor}`}>
              {selectedFile && (
                <div className="mb-2 flex items-center gap-2 p-2 rounded bg-indigo-50 dark:bg-indigo-900/20">
                  {selectedFile.type.startsWith('image/') ? (
                    <ImageIcon className="w-4 h-4" />
                  ) : (
                    <File className="w-4 h-4" />
                  )}
                  <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-1 hover:bg-black/10 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex gap-2 relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="relative flex-1">
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={messageInput}
                    onChange={handleInputChange}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="Type a message... (Press Enter to send)"
                    className={`w-full ${inputBg} ${textColor} border ${borderColor} rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  />
                  <button
                    data-emoji-button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg ${
                      showEmojiPicker 
                        ? darkMode ? 'bg-indigo-600' : 'bg-indigo-100'
                        : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                    } transition-colors`}
                    title="Add emoji"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                  
                  {/* Emoji Picker */}
                  {showEmojiPicker && (
                    <div 
                      ref={emojiPickerRef}
                      className="absolute bottom-full right-0 mb-2 z-50"
                    >
                      <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        theme={darkMode ? ('dark' as any) : ('light' as any)}
                        width={350}
                        height={400}
                        previewConfig={{
                          showPreview: false
                        }}
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => sendMessage()}
                  disabled={!messageInput.trim() && !selectedFile}
                  className={`px-4 py-2 rounded-lg ${
                    darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'
                  } text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2`}
                >
                  {uploadingFile ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Users Sidebar */}
        {connected && (
          <div className={`w-56 border-l ${borderColor} p-4 ${cardBg} overflow-y-auto`}>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Online Users ({users.length + 1})
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">{currentUserName} (You)</span>
              </div>
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>{user.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
