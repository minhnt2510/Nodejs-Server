import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { authApi } from '../apis/auth'
import { conversationsApi } from '../apis/conversations'
import { Alert } from '../components/ui/Alert'
import { Avatar } from '../components/ui/Avatar'
import { useAuth } from '../contexts/AuthContext'
import { API_BASE_URL, getErrorMessage } from '../lib/http'
import { authStorage } from '../lib/storage'
import { mediasApi } from '../apis/medias'
import type { Conversation, Media, User } from '../types'
import { MediaType } from '../types'
import { formatRelativeTime } from '../utils/format'

const PAGE_SIZE = 20

interface SocketMessage {
  payload: Conversation
}

export function ChatPage() {
  const { user, isVerified } = useAuth()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const requestedReceiverId = searchParams.get('receiver_id') || ''
  const initialReceiverInfo = (location.state as { receiverInfo?: User } | null)?.receiverInfo ?? null

  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Danh sách contacts (following + followers + chat history)
  const [contacts, setContacts] = useState<User[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)

  // Unread messages per contact
  const [unreadContacts, setUnreadContacts] = useState<Record<string, number>>({})

  // Chat state
  const [receiverInfo, setReceiverInfo] = useState<User | null>(initialReceiverInfo)
  const [activeReceiverId, setActiveReceiverId] = useState(requestedReceiverId)
  const [messages, setMessages] = useState<Conversation[]>([])
  const [content, setContent] = useState('')
  const [page, setPage] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [contextMsgId, setContextMsgId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<{ file: File; previewUrl: string; type: 'image' | 'video' }[]>([])
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const videoInputRef = useRef<HTMLInputElement | null>(null)

  // Ref to always have the latest activeReceiverId in socket events
  const activeReceiverIdRef = useRef(activeReceiverId)
  useEffect(() => {
    activeReceiverIdRef.current = activeReceiverId
  }, [activeReceiverId])

  // Clear unread count when active contact changes
  useEffect(() => {
    if (activeReceiverId) {
      setUnreadContacts((prev) => {
        if (!prev[activeReceiverId]) return prev
        const next = { ...prev }
        delete next[activeReceiverId]
        return next
      })
    }
  }, [activeReceiverId])

  // Auto-scroll khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load danh sách contacts
  useEffect(() => {
    if (!isVerified) return
    setContactsLoading(true)
    authApi
      .getContacts()
      .then((res) => {
        // Nếu có requestedReceiverId từ profile page mà chưa có trong contacts, thêm tạm thời
        if (requestedReceiverId && initialReceiverInfo && !res.some((c) => c._id === requestedReceiverId)) {
          setContacts([initialReceiverInfo, ...res])
        } else {
          setContacts(res)
        }
      })
      .catch(() => {})
      .finally(() => setContactsLoading(false))
  }, [isVerified, requestedReceiverId, initialReceiverInfo])

  const loadConversation = useCallback(
    async (nextPage: number, replace: boolean, receiverId: string, receiver?: User) => {
      if (!receiverId.trim()) return
      setError('')
      setIsLoading(true)
      try {
        const result = await conversationsApi.getConversations(receiverId.trim(), nextPage, PAGE_SIZE)
        const ordered = [...result.conversations].reverse()
        setMessages((current) => (replace ? ordered : [...ordered, ...current]))
        setActiveReceiverId(receiverId.trim())
        if (receiver) setReceiverInfo(receiver)
        setPage(result.page)
        setTotalPage(result.total_page)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  // Socket.io setup
  useEffect(() => {
    if (!isVerified) return
    const accessToken = authStorage.getAccessToken()
    if (!accessToken) return

    const socket = io(API_BASE_URL, { auth: { Authorization: `Bearer ${accessToken}` } })
    socketRef.current = socket

    socket.on('connect', () => { setIsConnected(true); setError('') })
    socket.on('disconnect', () => setIsConnected(false))
    socket.on('connect_error', (err) => setError(err.message))
    socket.on('receive_message', (data: SocketMessage) => {
      const msg = data.payload
      if (msg.sender_id === activeReceiverIdRef.current) {
        setMessages((current) => [...current, msg])
      } else {
        // Tăng số tin nhắn chưa đọc
        setUnreadContacts((prev) => ({
          ...prev,
          [msg.sender_id]: (prev[msg.sender_id] || 0) + 1
        }))
        // Nếu người gửi chưa có trong danh sách, refetch contacts
        setContacts((current) => {
          if (!current.some((c) => c._id === msg.sender_id)) {
            authApi.getContacts().then(setContacts).catch(() => {})
          }
          return current
        })
      }
    })

    // Listen block status changes
    socket.on('block_status_changed', (data: { blocker_id: string; blocked_id: string; is_blocked: boolean }) => {
      const targetId = data.blocker_id
      setContacts((prev) =>
        prev.map((c) => (c._id === targetId ? { ...c, blocked_by: data.is_blocked } : c))
      )
      setReceiverInfo((prev) => {
        if (prev && prev._id === targetId) {
          return { ...prev, blocked_by: data.is_blocked }
        }
        return prev
      })
    })

    // Listen deleted messages
    socket.on('message_deleted', (data: { message_id: string }) => {
      setMessages((current) =>
        current.map((m) =>
          m._id === data.message_id
            ? { ...m, is_deleted: true, content: 'Tin nhắn đã bị thu hồi', medias: [] }
            : m
        )
      )
    })

    // Listen reactions
    socket.on('message_reacted', (data: { message_id: string; reactions: any[] }) => {
      setMessages((current) =>
        current.map((m) =>
          m._id === data.message_id ? { ...m, reactions: data.reactions } : m
        )
      )
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [isVerified])

  // Sync state with URL search parameters
  useEffect(() => {
    if (!isVerified) return
    if (!requestedReceiverId) {
      setActiveReceiverId('')
      setReceiverInfo(null)
      setMessages([])
      return
    }
    queueMicrotask(() => void loadConversation(1, true, requestedReceiverId, initialReceiverInfo ?? undefined))
  }, [isVerified, loadConversation, requestedReceiverId, initialReceiverInfo])

  const onSelectUser = (contact: User) => {
    if (contact._id === activeReceiverId) return
    setMessages([])
    navigate(`/chat?receiver_id=${contact._id}`, { state: { receiverInfo: contact } })
  }

  const onBackToContacts = () => {
    navigate('/chat')
  }

  const onSelectImages = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setMediaFiles((prev) => [
      ...prev,
      ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file), type: 'image' as const }))
    ])
    e.target.value = ''
  }

  const onSelectVideo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaFiles((prev) => [...prev, { file, previewUrl: URL.createObjectURL(file), type: 'video' as const }])
    e.target.value = ''
  }

  const removeMedia = (previewUrl: string) => {
    setMediaFiles((prev) => {
      const target = prev.find((m) => m.previewUrl === previewUrl)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((m) => m.previewUrl !== previewUrl)
    })
  }

  const onSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || !activeReceiverId || (!content.trim() && mediaFiles.length === 0)) return

    const socket = socketRef.current
    if (!socket?.connected) {
      setError('Socket is not connected yet.')
      return
    }

    // Upload media trước khi send
    let medias: Media[] = []
    if (mediaFiles.length > 0) {
      setIsUploadingMedia(true)
      try {
        const imageFiles = mediaFiles.filter((m) => m.type === 'image').map((m) => m.file)
        const videoFile = mediaFiles.find((m) => m.type === 'video')?.file
        if (imageFiles.length) {
          const uploaded = await mediasApi.uploadImages(imageFiles)
          medias.push(...uploaded)
        }
        if (videoFile) {
          const uploaded = await mediasApi.uploadVideo(videoFile)
          medias.push(...uploaded)
        }
      } catch (err: any) {
        setError(getErrorMessage(err))
        setIsUploadingMedia(false)
        return
      }
      setIsUploadingMedia(false)
    }

    // Optimistic update với medias
    const message: Conversation = {
      _id: `local-${Date.now()}`,
      sender_id: user._id,
      receiver_id: activeReceiverId,
      content: content.trim(),
      medias,
      created_at: new Date().toISOString()
    }
    setMessages((current) => [...current, message])

    socket.emit('send_message', {
      payload: { sender_id: user._id, receiver_id: activeReceiverId, content: content.trim(), medias }
    })
    setContent('')
    // Cleanup previews
    mediaFiles.forEach((m) => URL.revokeObjectURL(m.previewUrl))
    setMediaFiles([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && activeReceiverId && (content.trim() || mediaFiles.length > 0) && isVerified) {
      e.preventDefault()
      onSend(e as unknown as FormEvent<HTMLFormElement>)
    }
  }

  const handleBlockToggle = async () => {
    if (!receiverInfo) return
    setShowMenu(false)
    try {
      if (receiverInfo.is_blocked) {
        await authApi.unblock(receiverInfo._id)
        setReceiverInfo(prev => prev ? { ...prev, is_blocked: false } : null)
        setContacts(prev => prev.map(c => c._id === receiverInfo._id ? { ...c, is_blocked: false } : c))
      } else {
        await authApi.block(receiverInfo._id)
        setReceiverInfo(prev => prev ? { ...prev, is_blocked: true } : null)
        setContacts(prev => prev.map(c => c._id === receiverInfo._id ? { ...c, is_blocked: true } : c))
      }
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const onDeleteConversation = async () => {
    if (!activeReceiverId) return
    if (!window.confirm('Xóa toàn bộ cuộc trò chuyện này?')) return
    setShowMenu(false)
    setShowSearch(false)
    try {
      await conversationsApi.deleteConversation(activeReceiverId)
      setMessages([])
      setStatus('Cuộc trò chuyện đã được xóa.')
      setTimeout(() => setStatus(''), 3000)
    } catch (err: any) {
      setError(getErrorMessage(err))
    }
  }

  const onReact = (messageId: string, emoji: string) => {
    if (!socketRef.current?.connected || !activeReceiverId) return

    // Optimistic update
    setMessages((current) =>
      current.map((m) => {
        if (m._id === messageId) {
          const currentReactions = m.reactions || []
          const existingIdx = currentReactions.findIndex((r) => r.user_id === user?._id)
          let nextReactions = [...currentReactions]
          if (existingIdx > -1) {
            if (nextReactions[existingIdx].emoji === emoji) {
              nextReactions.splice(existingIdx, 1) // Toggle off
            } else {
              nextReactions[existingIdx] = { user_id: user?._id || '', emoji }
            }
          } else {
            nextReactions.push({ user_id: user?._id || '', emoji })
          }
          return { ...m, reactions: nextReactions }
        }
        return m
      })
    )

    socketRef.current.emit('react_message', {
      message_id: messageId,
      receiver_id: activeReceiverId,
      emoji
    })
  }

  const onCopyText = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setContextMsgId(null)
  }

  const onDelete = (messageId: string) => {
    if (!socketRef.current?.connected || !activeReceiverId) return
    if (!window.confirm('Bạn có chắc chắn muốn thu hồi tin nhắn này?')) return

    // Optimistic update
    setMessages((current) =>
      current.map((m) =>
        m._id === messageId ? { ...m, is_deleted: true, content: 'Tin nhắn đã bị thu hồi', medias: [] } : m
      )
    )

    socketRef.current.emit('delete_message', {
      message_id: messageId,
      receiver_id: activeReceiverId
    })
  }

  return (
    <section className={`flex animate-fade-in overflow-hidden ${
      activeReceiverId ? 'h-dvh' : 'h-[calc(100dvh-64px)] md:h-screen'
    }`}>
      {/* ── Sidebar danh sách following ── */}
      <aside className={`flex flex-col border-r border-twitter-border bg-twitter-surface/30 md:w-72 md:shrink-0 w-full ${
        activeReceiverId ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Header sidebar */}
        <div className="border-b border-twitter-border px-4 py-4">
          <h1 className="text-xl font-black text-twitter-text">Messages</h1>
          <p className={`mt-0.5 text-xs font-medium ${isConnected ? 'text-emerald-400' : 'text-twitter-muted'}`}>
            {isConnected ? '● Connected' : '○ Disconnected'}
          </p>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {!isVerified ? (
            <p className="p-4 text-sm text-twitter-muted">Verify your account to use chat.</p>
          ) : contactsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="size-6 animate-spin rounded-full border-2 border-twitter-border border-t-twitter-blue" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-twitter-muted">No contacts yet.</p>
              <p className="mt-1 text-xs text-twitter-soft">Follow or get followed by users to chat.</p>
            </div>
          ) : (
            <ul>
              {contacts.map((contact) => (
                <li key={contact._id}>
                  <button
                    type="button"
                    onClick={() => onSelectUser(contact)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/5 ${
                      activeReceiverId === contact._id ? 'border-l-2 border-twitter-blue bg-twitter-blue/5' : ''
                    }`}
                  >
                    <Avatar src={contact.avatar} name={contact.name} size="sm" className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-bold text-twitter-text">{contact.name}</p>
                        {contact.is_blocked && (
                          <span className="rounded bg-rose-500/10 px-1 py-0.25 text-[9px] font-bold text-rose-500">Blocked</span>
                        )}
                      </div>
                      <p className="truncate text-xs text-twitter-muted">@{contact.username}</p>
                    </div>
                    {unreadContacts[contact._id] > 0 && (
                      <span className="flex size-5 items-center justify-center rounded-full bg-twitter-blue text-xs font-black text-white shrink-0">
                        {unreadContacts[contact._id]}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Main chat area ── */}
      <div className={`flex-1 flex-col overflow-hidden relative ${activeReceiverId ? 'flex' : 'hidden md:flex'}`}>
        {/* Chat header */}
        <header className="flex items-center gap-3 border-b border-twitter-border bg-twitter-bg/80 px-5 py-4 backdrop-blur-xl z-20">
          {receiverInfo && activeReceiverId ? (
            <>
              <button
                type="button"
                onClick={onBackToContacts}
                className="mr-1 rounded-full p-2 hover:bg-white/5 md:hidden"
                aria-label="Back to contacts"
              >
                <svg className="size-5 text-twitter-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <Avatar src={receiverInfo.avatar} name={receiverInfo.name} size="sm" />
              <div>
                <p className="font-bold text-twitter-text">{receiverInfo.name}</p>
                <p className="text-xs text-twitter-muted">@{receiverInfo.username}</p>
              </div>

              {/* Chat options dropdown */}
              <div className="relative ml-auto">
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  className="rounded-full p-2 hover:bg-white/5 transition text-twitter-text"
                  aria-label="Chat options"
                >
                  <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                  </svg>
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-twitter-border bg-twitter-bg shadow-2xl z-50 py-1">
                    <button
                      type="button"
                      onClick={() => { setShowMenu(false); navigate(`/${receiverInfo.username}`) }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-twitter-text transition hover:bg-white/5"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      View profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false)
                        const url = `${window.location.origin}/${receiverInfo.username}`
                        navigator.clipboard.writeText(url).catch(() => {})
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-twitter-text transition hover:bg-white/5"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share contact
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowMenu(false); setShowSearch(!showSearch); setSearchQuery('') }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-twitter-text transition hover:bg-white/5"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Search messages
                    </button>
                    <hr className="border-twitter-border mx-2 my-1" />
                    <button
                      type="button"
                      onClick={onDeleteConversation}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-rose-500 transition hover:bg-white/5"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete conversation
                    </button>
                    <button
                      type="button"
                      onClick={handleBlockToggle}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-white/5 ${
                        receiverInfo.is_blocked ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'
                      }`}
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      {receiverInfo.is_blocked ? 'Unblock User' : 'Block User'}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-twitter-muted">Select a contact to start chatting</p>
          )}
        </header>

        {error ? (
          <div className="p-4">
            <Alert type="error">{error}</Alert>
          </div>
        ) : null}

        {/* Search bar */}
        {showSearch && activeReceiverId && (
          <div className="border-b border-twitter-border px-4 py-3">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full rounded-full border border-twitter-border bg-twitter-surface px-4 py-2 text-sm text-twitter-text outline-none transition focus:border-twitter-blue focus:ring-4 focus:ring-twitter-blue/10"
              autoFocus
            />
          </div>
        )}

        {status ? (
          <div className="px-4 pt-2">
            <Alert type="success">{status}</Alert>
          </div>
        ) : null}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 z-10">
          {page < totalPage ? (
            <button
              type="button"
              onClick={() => void loadConversation(page + 1, false, activeReceiverId)}
              disabled={isLoading}
              className="mb-5 w-full rounded-full border border-twitter-border px-5 py-2 text-sm font-black text-twitter-text transition hover:bg-white/5 disabled:opacity-60"
            >
              {isLoading ? 'Loading...' : 'Load older messages'}
            </button>
          ) : null}

          {!activeReceiverId ? (
            <div className="flex h-full items-center justify-center">
              <div className="rounded-[2rem] border border-dashed border-twitter-border bg-twitter-surface/40 p-8 text-center">
                <p className="text-3xl">💬</p>
                <p className="mt-3 text-sm font-semibold text-twitter-text">Select someone to chat</p>
                <p className="mt-1 text-xs text-twitter-muted">Choose a contact from the left sidebar</p>
              </div>
            </div>
          ) : messages.length === 0 && !isLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-twitter-muted">No messages yet. Say hello! 👋</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(searchQuery
                ? messages.filter((m) => !m.is_deleted && m.content.toLowerCase().includes(searchQuery.toLowerCase()))
                : messages
              ).map((message) => {
                const isMine = message.sender_id === user?._id
                return (
                  <div key={message._id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {!isMine ? (
                      <Avatar src={receiverInfo?.avatar} name={receiverInfo?.name || 'User'} size="sm" className="shrink-0" />
                    ) : null}
                    <div className={`flex max-w-[72%] flex-col relative group ${isMine ? 'items-end' : 'items-start'}`}>
                      {/* Bubble — chỉ khi có text hoặc deleted */}
                      {(message.content || message.is_deleted) ? (
                        <div
                          className={`rounded-3xl px-4 py-2.5 text-sm leading-6 relative ${
                            message.is_deleted
                              ? 'bg-twitter-surface/20 text-twitter-muted italic border border-twitter-border/40'
                              : isMine
                              ? 'rounded-br-md bg-twitter-blue text-white'
                              : 'rounded-bl-md bg-twitter-surface text-twitter-text'
                          }`}
                        >
                          {message.content}
                          {message.medias && message.medias.length > 0 && (
                            <div className={`mt-2 -mx-4 -mb-2.5 overflow-hidden rounded-b-[inherit] ${message.medias.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} grid gap-0`}>
                              {message.medias.map((media) =>
                                media.type === MediaType.Image ? (
                                  <img
                                    key={media.url}
                                    src={media.url}
                                    alt=""
                                    loading="lazy"
                                    className="w-full bg-black/10 object-cover"
                                    style={{ maxHeight: '200px' }}
                                  />
                                ) : (
                                  <video
                                    key={media.url}
                                    src={media.url}
                                    controls
                                    preload="metadata"
                                    className="w-full bg-black object-cover"
                                    style={{ maxHeight: '200px' }}
                                  />
                                )
                              )}
                            </div>
                          )}
                        </div>
                      ) : null}

                      {/* Media-only — không bubble background, tràn viền bo góc */}
                      {message.medias && message.medias.length > 0 && !message.content && !message.is_deleted && (
                        <div className={`overflow-hidden ${isMine ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md'} ${message.medias.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} grid gap-0`}>
                          {message.medias.map((media) =>
                            media.type === MediaType.Image ? (
                              <img
                                key={media.url}
                                src={media.url}
                                alt=""
                                loading="lazy"
                                className="w-full bg-black/10 object-cover"
                                style={{ maxHeight: '300px' }}
                              />
                            ) : (
                              <video
                                key={media.url}
                                src={media.url}
                                controls
                                preload="metadata"
                                className="w-full bg-black object-cover"
                                style={{ maxHeight: '300px' }}
                              />
                            )
                          )}
                        </div>
                      )}

                      {/* Emojis Reactions list */}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className={`flex items-center gap-1 rounded-full border border-twitter-border bg-twitter-surface px-1.5 py-0.5 text-[10px] shadow-sm mt-1 max-w-fit ${
                          isMine ? 'mr-1' : 'ml-1'
                        }`}>
                          {message.reactions.map((r, i) => (
                            <span key={i} title={r.user_id === user?._id ? 'Bạn' : 'Người khác'}>
                              {r.emoji}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Hover: emoji reactions bar (pt-4 giup khong bi mat hover khi di chuyen chuot) */}
                      {!message.is_deleted && (
                        <div className={`absolute -top-9 ${isMine ? 'right-1' : 'left-1'} hidden group-hover:flex items-center gap-1.5 rounded-full bg-twitter-surface border border-twitter-border px-2.5 py-1.5 shadow-xl z-30 animate-fade-in pt-4 pb-1 -mt-3`}>
                          {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => onReact(message._id, emoji)}
                              className="text-sm transition hover:scale-125 duration-100 cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* 3-dot context button + dropdown (hover, de bam hon) */}
                      {!message.is_deleted && (
                        <div className={`absolute ${isMine ? '-left-7' : '-right-7'} top-0 hidden group-hover:block z-30`}>
                          <button
                            type="button"
                            onClick={() => setContextMsgId(contextMsgId === message._id ? null : message._id)}
                            className="flex size-7 items-center justify-center rounded-full bg-twitter-surface border border-twitter-border text-twitter-muted hover:text-twitter-text shadow-md transition"
                          >
                            <svg className="size-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          {contextMsgId === message._id && (
                            <div className={`absolute ${isMine ? 'left-0' : 'right-0'} top-8 w-44 rounded-xl border border-twitter-border bg-twitter-bg shadow-2xl z-40 py-1 animate-fade-in`}>
                              {message.content && (
                                <button
                                  type="button"
                                  onClick={() => onCopyText(message.content)}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-twitter-text transition hover:bg-white/5"
                                >
                                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                  </svg>
                                  Copy text
                                </button>
                              )}
                              {isMine && !message._id.startsWith('local-') && (
                                <button
                                  type="button"
                                  onClick={() => { setContextMsgId(null); onDelete(message._id) }}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-rose-500 transition hover:bg-white/5"
                                >
                                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Recall
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Click outside to close context menu */}
                      {contextMsgId && (
                        <div className="fixed inset-0 z-20" onClick={() => setContextMsgId(null)} />
                      )}

                      {/* Timestamp */}
                      <p className="mt-1 px-1 text-[9px] text-twitter-muted">
                        {formatRelativeTime(message.created_at)}
                      </p>
                    </div>
                    {isMine ? (
                      <Avatar src={user?.avatar} name={user?.name || 'Me'} size="sm" className="shrink-0" />
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Banner if Blocked or Blocking, otherwise Send form */}
        {receiverInfo && (receiverInfo.is_blocked || receiverInfo.blocked_by) ? (
          <div className="border-t border-twitter-border bg-twitter-surface/30 p-5 text-center z-10 animate-fade-in">
            {receiverInfo.is_blocked ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-bold text-twitter-text">Bạn đã chặn người dùng này</p>
                <button
                  type="button"
                  onClick={handleBlockToggle}
                  className="rounded-full bg-twitter-blue px-5 py-1.5 text-xs font-black text-white hover:bg-twitter-blue-hover transition shadow-md shadow-twitter-blue/20"
                >
                  Bỏ chặn
                </button>
              </div>
            ) : (
              <p className="text-sm font-bold text-twitter-muted">Tài khoản này hiện không khả dụng để nhắn tin</p>
            )}
          </div>
        ) : (
          <form onSubmit={onSend} className="border-t border-twitter-border bg-twitter-bg z-10">
            {/* Media preview */}
            {mediaFiles.length > 0 && (
              <div className="flex gap-2 overflow-x-auto border-b border-twitter-border px-4 py-3">
                {mediaFiles.map((media) => (
                  <div key={media.previewUrl} className="group relative shrink-0">
                    {media.type === 'image' ? (
                      <img src={media.previewUrl} alt="" className="h-20 w-20 rounded-xl object-cover" />
                    ) : (
                      <video src={media.previewUrl} className="h-20 w-20 rounded-xl bg-black object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(media.previewUrl)}
                      className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 p-4">
              {/* Image picker */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onSelectImages}
                disabled={!activeReceiverId || !isVerified}
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={!activeReceiverId || !isVerified}
                className="flex shrink-0 items-center gap-1 rounded-full p-2 text-twitter-muted transition hover:bg-twitter-blue/10 hover:text-twitter-blue disabled:opacity-50"
                title="Gửi ảnh"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Video picker */}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
                className="hidden"
                onChange={onSelectVideo}
                disabled={!activeReceiverId || !isVerified}
              />
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={!activeReceiverId || !isVerified}
                className="flex shrink-0 items-center gap-1 rounded-full p-2 text-twitter-muted transition hover:bg-twitter-blue/10 hover:text-twitter-blue disabled:opacity-50"
                title="Gửi video"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>

              <input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!activeReceiverId || !isVerified}
                className="min-w-0 flex-1 rounded-full border border-twitter-border bg-twitter-surface px-5 py-3 text-sm text-twitter-text outline-none transition focus:border-twitter-blue focus:ring-4 focus:ring-twitter-blue/10 disabled:opacity-50"
                placeholder={activeReceiverId ? 'Write a message… (Enter to send)' : 'Select a contact first'}
              />
              <button
                type="submit"
                disabled={!activeReceiverId || (!content.trim() && mediaFiles.length === 0) || !isVerified || isUploadingMedia}
                className="rounded-full bg-twitter-blue px-5 py-3 font-black text-white shadow-lg shadow-twitter-blue/20 transition hover:bg-twitter-blue-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploadingMedia ? 'Uploading...' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
