import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { authApi } from '../apis/auth'
import { conversationsApi } from '../apis/conversations'
import { Alert } from '../components/ui/Alert'
import { Avatar } from '../components/ui/Avatar'
import { useAuth } from '../contexts/AuthContext'
import { API_BASE_URL, getErrorMessage } from '../lib/http'
import { authStorage } from '../lib/storage'
import type { Conversation, User } from '../types'
import { formatRelativeTime } from '../utils/format'

const PAGE_SIZE = 20

interface SocketMessage {
  payload: Conversation
}

export function ChatPage() {
  const { user, isVerified } = useAuth()
  const [searchParams] = useSearchParams()
  const location = useLocation()
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

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [isVerified])

  // Load conversation từ URL param khi vào trang
  useEffect(() => {
    if (!isVerified || !requestedReceiverId) return
    queueMicrotask(() => void loadConversation(1, true, requestedReceiverId, initialReceiverInfo ?? undefined))
  }, [isVerified, loadConversation, requestedReceiverId]) // eslint-disable-line

  const onSelectUser = (contact: User) => {
    if (contact._id === activeReceiverId) return
    setMessages([])
    void loadConversation(1, true, contact._id, contact)
  }

  const onSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || !activeReceiverId || !content.trim()) return

    const socket = socketRef.current
    if (!socket?.connected) {
      setError('Socket is not connected yet.')
      return
    }

    const message: Conversation = {
      _id: `local-${Date.now()}`,
      sender_id: user._id,
      receiver_id: activeReceiverId,
      content: content.trim(),
      created_at: new Date().toISOString()
    }
    setMessages((current) => [...current, message])
    socket.emit('send_message', {
      payload: { sender_id: user._id, receiver_id: activeReceiverId, content: content.trim() }
    })
    setContent('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && activeReceiverId && content.trim() && isVerified) {
      e.preventDefault()
      onSend(e as unknown as FormEvent<HTMLFormElement>)
    }
  }

  return (
    <section className="flex h-screen animate-fade-in overflow-hidden">
      {/* ── Sidebar danh sách following ── */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-twitter-border bg-twitter-surface/30">
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
                      <p className="truncate text-sm font-bold text-twitter-text">{contact.name}</p>
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
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Chat header */}
        <header className="flex items-center gap-3 border-b border-twitter-border bg-twitter-bg/80 px-5 py-4 backdrop-blur-xl">
          {receiverInfo && activeReceiverId ? (
            <>
              <Avatar src={receiverInfo.avatar} name={receiverInfo.name} size="sm" />
              <div>
                <p className="font-bold text-twitter-text">{receiverInfo.name}</p>
                <p className="text-xs text-twitter-muted">@{receiverInfo.username}</p>
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5">
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
            <div className="space-y-3">
              {messages.map((message) => {
                const isMine = message.sender_id === user?._id
                return (
                  <div key={message._id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {!isMine ? (
                      <Avatar src={receiverInfo?.avatar} name={receiverInfo?.name || 'User'} size="sm" className="shrink-0" />
                    ) : null}
                    <div className={`flex max-w-[72%] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`rounded-3xl px-4 py-2.5 text-sm leading-6 ${
                          isMine
                            ? 'rounded-br-md bg-twitter-blue text-white'
                            : 'rounded-bl-md bg-twitter-surface text-twitter-text'
                        }`}
                      >
                        {message.content}
                      </div>
                      <p className="mt-0.5 px-1 text-[10px] text-twitter-muted">
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

        {/* Send form */}
        <form onSubmit={onSend} className="border-t border-twitter-border bg-twitter-bg p-4">
          <div className="flex gap-3">
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
              disabled={!activeReceiverId || !content.trim() || !isVerified}
              className="rounded-full bg-twitter-blue px-5 py-3 font-black text-white shadow-lg shadow-twitter-blue/20 transition hover:bg-twitter-blue-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
