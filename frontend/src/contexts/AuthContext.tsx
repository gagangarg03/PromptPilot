import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getCurrentUser, getStoredUser, logout as apiLogout, isAuthenticated } from '../services/api'
import toast from 'react-hot-toast'

interface User {
  id: string
  email: string
  full_name?: string
  created_at: string
  is_active: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (user: User, token: string) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    if (isAuthenticated()) {
      const storedUser = getStoredUser()
      if (storedUser) {
        // Show UI immediately with stored user (optimistic loading)
        setUser(storedUser)
        setLoading(false)
        
        // Verify token in background (non-blocking)
        const timeoutId = setTimeout(() => {
          getCurrentUser()
            .then((currentUser) => {
              setUser(currentUser)
              localStorage.setItem('user', JSON.stringify(currentUser))
            })
            .catch((error) => {
              // Only logout if it's an actual auth error (401), not connection errors
              const isAuthError = error?.response?.status === 401
              const isConnectionError = 
                error?.code === 'ECONNREFUSED' || 
                error?.code === 'ERR_CONNECTION_REFUSED' ||
                error?.message?.includes('ERR_CONNECTION_REFUSED') ||
                error?.message?.includes('Network Error') ||
                (!error?.response && error?.request)
              
              if (isAuthError && !isConnectionError) {
                // Token invalid, logout silently
                apiLogout()
                setUser(null)
              }
              // For connection errors, keep the stored user (backend might be temporarily down)
            })
        }, 100) // Small delay to not block UI
        
        return () => clearTimeout(timeoutId)
      } else {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  const login = (userData: User, token: string) => {
    setUser(userData)
    localStorage.setItem('auth_token', token)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const logout = () => {
    apiLogout()
    setUser(null)
    toast.success('Logged out successfully')
  }

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      localStorage.setItem('user', JSON.stringify(currentUser))
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

