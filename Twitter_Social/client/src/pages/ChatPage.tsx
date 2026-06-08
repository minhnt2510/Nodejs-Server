import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { conversationsApi } from '../apis/conversations'
import { Alert } from '../components/ui/Alert'
import { Avatar } from '../components/ui/Avatar'
import { useAuth } from '../contexts/AuthContext'
import { API_BASE_URL, getErrorMessage } from '../lib/http'
import { authStorage } from '../lib/storage'
import type { Conversation } from '../types'
import { formatRelativeTime } from '../utils/format'

const PAGE_SIZE = 20

interface SocketMessage {
  payload: Conversation
}

export function ChatPage() {
  const { user, isVerified } = useAuth()
  const socketRef = useRef<Socket | null>(null)
  const [receiverId, setReceiverId] = useState('')
  const [activeReceiverId, setActiveReceiverId] = useState('')
  const [messages, setMessages] = useState<Conversation[]>([])
  const [content, setContent] = useState('')
  const [page, setPage] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isVerified) return

    const accessToken = authStorage.getAccessToken()
    if (!accessToken) return

    const socket = io(API_BASE_URL, {
      auth: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      setError('')
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('connect_error', (err) => {
      setError(err.message)
    })

    socket.on('receive_message', (data: SocketMessage) => {
      setMessages((current) => [...current, data.payload])
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [isVerified])

  const loadConversation = async (nextPage = 1, replace = true, nextReceiverId = activeReceiverId || receiverId) => {
    if (!nextReceiverId.trim()) return

    setError('')
    setIsLoading(true)
    try {
      const result = await conversationsApi.getConversations(nextReceiverId.trim(), nextPage, PAGE_SIZE)
      const ordered = [...result.conversations].reverse()
      setMessages((current) => (replace ? ordered : [...ordered, ...current]))
      setActiveReceiverId(nextReceiverId.trim())
      setReceiverId(nextReceiverId.trim())
      setPage(result.page)
      setTotalPage(result.total_page)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const onSelectConversation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void loadConversation(1, true, receiverId)
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
      payload: {
        sender_id: user._id,
        receiver_id: activeReceiverId,
        content: content.trim()
      }
    })
    setContent('')
  }

  return (
    <section className="flex h-screen animate-fade-in flex-col">
      <header className="sticky top-0 z-20 border-b border-twitter-border bg-twitter-bg/80 px-5 py-4 backdrop-blur-xl">
        <h1 className="text-xl font-black">Messages</h1>
        <p className={`mt-1 text-sm ${isConnected ? 'text-emerald-300' : 'text-twitter-muted'}`}>
          {isConnected ? 'Socket connected' : 'Socket disconnected'}
        </p>
      </header>

      {!isVerified ? (
        <div className="p-5">
          <Alert type="info">Chat requires a verified account because the socket middleware checks `verify`.</Alert>
        </div>
      ) : null}

      <form onSubmit={onSelectConversation} className="border-b border-twitter-border p-5">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-twitter-muted">Receiver user id</span>
          <div className="flex gap-3">
            <input
              value={receiverId}
              onChange={(event) => setReceiverId(event.target.value)}
              className="min-w-0 flex-1 rounded-full border border-twitter-border bg-twitter-surface px-5 py-3 text-twitter-text outline-none transition focus:border-twitter-blue focus:ring-4 focus:ring-twitter-blue/10"
              placeholder="MongoDB ObjectId of the user to chat with"
            />
            <button
              type="submit"
              disabled={!isVerified || isLoading}
              className="rounded-full bg-twitter-blue px-5 py-3 font-black text-white shadow-lg shadow-twitter-blue/20 transition hover:bg-twitter-blue-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              Open
            </button>
          </div>
        </label>
      </form>

      {error ? (
        <div className="p-5">
          <Alert type="error">{error}</Alert>
        </div>
      ) : null}

      <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
        {page < totalPage ? (
          <button
            type="button"
            onClick={() => void loadConversation(page + 1, false)}
            disabled={isLoading}
            className="mb-5 w-full rounded-full border border-twitter-border px-5 py-2 text-sm font-black text-twitter-text transition hover:bg-white/5 disabled:opacity-60"
          >
            {isLoading ? 'Loading...' : 'Load older messages'}
          </button>
        ) : null}

        {messages.length ? (
          <div className="space-y-4">
            {messages.map((message) => {
              const isMine = message.sender_id === user?._id
              return (
                <div key={message._id} className={`flex items-end gap-3 ${isMine ? 'justify-end' : 'justify-start'}`}>
                  {!isMine ? <Avatar name="Receiver" size="sm" /> : null}
                  <div
                    className={`max-w-[75%] rounded-3xl px-4 py-3 text-sm leading-6 ${
                      isMine
                        ? 'rounded-br-md bg-twitter-blue text-white'
                        : 'rounded-bl-md bg-twitter-surface text-twitter-text'
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className={`mt-1 text-[11px] ${isMine ? 'text-sky-100' : 'text-twitter-muted'}`}>
                      {formatRelativeTime(message.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-twitter-border bg-twitter-surface/40 p-8 text-center text-sm leading-6 text-twitter-muted">
            Enter a receiver user id to load a conversation. The current backend does not expose a contacts endpoint yet.
          </div>
        )}
      </div>

      <form onSubmit={onSend} className="border-t border-twitter-border p-4">
        <div className="flex gap-3">
          <input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={!activeReceiverId || !isVerified}
            className="min-w-0 flex-1 rounded-full border border-twitter-border bg-twitter-surface px-5 py-3 text-twitter-text outline-none transition focus:border-twitter-blue focus:ring-4 focus:ring-twitter-blue/10 disabled:opacity-60"
            placeholder={activeReceiverId ? 'Write a message' : 'Open a conversation first'}
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
    </section>
  )
}
