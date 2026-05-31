import { useState } from 'react'
import { User, LogOut, Mail, Calendar } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

interface UserProfileProps {
  darkMode: boolean
  compact?: boolean
}

export default function UserProfile({ darkMode, compact = false }: UserProfileProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) return null

  // Get user initials for avatar
  const getInitials = () => {
    if (user.full_name) {
      return user.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return user.email[0].toUpperCase()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`${compact ? 'w-full' : ''} flex items-center gap-2 ${compact ? 'p-3' : 'p-1.5'} rounded-lg transition-all ${
          darkMode
            ? showMenu 
              ? 'bg-indigo-600/20 border border-indigo-500/50' 
              : 'hover:bg-gray-800 text-gray-300'
            : showMenu
              ? 'bg-indigo-50 border border-indigo-200'
              : 'hover:bg-gray-100 text-gray-700'
        }`}
      >
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs shadow-lg flex-shrink-0 ${
          darkMode 
            ? 'bg-gradient-to-br from-indigo-600 to-purple-600' 
            : 'bg-gradient-to-br from-indigo-600 to-purple-600'
        }`}>
          <span className="text-white">{getInitials()}</span>
        </div>
        {!compact && (
          <div className="flex-1 text-left min-w-0 max-w-[100px]">
            <p className={`text-sm font-semibold truncate ${
              darkMode ? 'text-white' : 'text-gray-800'
            }`}>
              {user.full_name || user.email.split('@')[0]}
            </p>
          </div>
        )}
        {!compact && (
          <div className={`transition-transform flex-shrink-0 ${showMenu ? 'rotate-180' : ''}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className={`absolute ${
            compact 
              ? 'right-0 top-full mt-2' 
              : 'right-0 top-full mt-2 w-80'
          } rounded-xl shadow-2xl z-50 animate-slide-up ${
            darkMode 
              ? 'bg-gray-800 border-2 border-gray-700' 
              : 'bg-white border-2 border-gray-200'
          }`}>
            {/* Profile Header */}
            <div className={`p-3 border-b ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-lg flex-shrink-0 ${
                  darkMode 
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-600' 
                    : 'bg-gradient-to-br from-indigo-600 to-purple-600'
                }`}>
                  <span className="text-white">{getInitials()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${
                    darkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {user.full_name || user.email.split('@')[0]}
                  </p>
                  <p className={`text-xs truncate mt-0.5 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {user.email.length > 30 ? user.email.substring(0, 27) + '...' : user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="p-3">
              <div className={`p-3 rounded-lg mb-3 ${
                darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Mail className={`w-4 h-4 flex-shrink-0 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <span className={`text-xs truncate ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {user.email}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className={`w-4 h-4 flex-shrink-0 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <span className={`text-xs ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Joined {new Date(user.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={handleLogout}
                className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg transition-all font-medium ${
                  darkMode
                    ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30 border border-red-800/50'
                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

