import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { API_BASE_URL } from '../lib/http'
import { authStorage } from '../lib/storage'
import { useAuth } from './AuthContext'

interface NotificationContextValue {
  unreadCount: number
  clearUnread: () => void
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  clearUnread: () => {}
})

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isVerified } = useAuth()
  const location = useLocation()
  const socketRef = useRef<Socket | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const isOnChat = location.pathname === '/chat'

  const clearUnread = () => setUnreadCount(0)

  // Reset unread khi vào trang chat
  useEffect(() => {
    if (isOnChat) setUnreadCount(0)
  }, [isOnChat])

  useEffect(() => {
    if (!isVerified) return
    const accessToken = authStorage.getAccessToken()
    if (!accessToken) return

    const socket = io(API_BASE_URL, {
      auth: { Authorization: `Bearer ${accessToken}` }
    })
    socketRef.current = socket

    socket.on('receive_message', () => {
      // Chỉ tăng unread nếu không đang ở trang chat
      if (!isOnChat) {
        setUnreadCount((prev) => prev + 1)
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [isVerified]) // eslint-disable-line

  return (
    <NotificationContext.Provider value={{ unreadCount, clearUnread }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  return useContext(NotificationContext)
}
