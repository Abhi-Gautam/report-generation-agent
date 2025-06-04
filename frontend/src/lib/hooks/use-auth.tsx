'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
  hasSubscription: boolean
  subscriptionTier?: string
}

interface AuthContextType {
  user: User | null
  login: (credentials: { email: string; password: string }) => Promise<void>
  register: (data: { email: string; password: string; name: string }) => Promise<void>
  logout: () => void
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const router = useRouter()

  // Check for existing token on mount
  useEffect(() => {
    const initAuth = async () => {
      if (typeof window === 'undefined') {
        setIsInitialized(true)
        return
      }
      
      const token = localStorage.getItem('auth_token')
      if (token) {
        await checkAuthStatus(token)
      } else {
        setIsInitialized(true)
      }
    }
    
    initAuth()
  }, [])

  const checkAuthStatus = async (token: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.data.user)
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token')
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
      }
    } finally {
      setIsInitialized(true)
    }
  }

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', data.data.token)
      }
      setUser(data.data.user)
      
      // Redirect to reports
      router.push('/reports')
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (userData: { email: string; password: string; name: string }) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', data.data.token)
      }
      setUser(data.data.user)
      
      // Redirect to reports
      router.push('/reports')
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
    setUser(null)
    router.push('/')
  }

  const value = {
    user,
    login,
    register,
    logout,
    isLoading,
    isAuthenticated: !!user
  }

  if (!isInitialized) {
    return (
      <AuthContext.Provider value={{
        user: null,
        login: async () => {},
        register: async () => {},
        logout: () => {},
        isLoading: true,
        isAuthenticated: false
      }}>
        <div>Loading...</div>
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider value={value}>
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
