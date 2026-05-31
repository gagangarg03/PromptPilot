import { useState } from 'react'
import { LogIn, Mail, Lock, UserPlus, Eye, EyeOff } from 'lucide-react'
import { login, register } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

interface LoginProps {
  darkMode: boolean
}

export default function Login({ darkMode }: LoginProps) {
  const { login: setAuth } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        const response = await login({ email, password })
        setAuth(response.user, response.access_token)
        toast.success('Welcome back!')
        navigate('/')
      } else {
        const response = await register({ email, password, full_name: fullName })
        toast.success('Account created! Please login.')
        setIsLogin(true)
        setEmail('')
        setPassword('')
        setFullName('')
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'An error occurred'
      toast.error(errorMsg)
      
      // If email already registered, suggest switching to login
      if (errorMsg.includes('already registered') || errorMsg.includes('Email already')) {
        setTimeout(() => {
          setIsLogin(true)
        }, 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      <div className={`w-full max-w-md rounded-2xl shadow-2xl ${
        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
      } p-8`}>
        <div className="text-center mb-8">
          <div className={`inline-flex p-3 rounded-xl mb-4 ${
            darkMode ? 'bg-indigo-600' : 'bg-gradient-to-br from-indigo-600 to-purple-600'
          }`}>
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h2 className={`text-3xl font-bold ${
            darkMode ? 'text-white' : 'text-gray-800'
          } mb-2`}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            {isLogin 
              ? 'Sign in to access your documents' 
              : 'Get started with AI Document Q&A'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Full Name
              </label>
              <div className="relative">
                <UserPlus className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  placeholder="John Doe"
                />
              </div>
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Email
            </label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Password
            </label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={`w-full pl-10 pr-12 py-3 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                placeholder={isLogin ? 'Enter your password' : 'At least 6 characters'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                  darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
              darkMode
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
            }`}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setEmail('')
              setPassword('')
              setFullName('')
            }}
            className={`text-sm ${
              darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
            } transition-colors`}
          >
            {isLogin 
              ? "Don't have an account? Sign up" 
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}

