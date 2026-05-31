import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { 
  Sparkles, Brain, MessageSquare, 
  FileBarChart, Code, Ticket, PenTool, FileCheck, Languages, Image, Video, Users,
  Menu, ChevronRight
} from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './components/Login'
import UserProfile from './components/UserProfile'
import DocumentUpload from './components/DocumentUpload'
import DocumentList from './components/DocumentList'
import QAChat from './components/QAChat'
import ReportGenerator from './components/ReportGenerator'
import CodeReviewer from './components/CodeReviewer'
import TicketClassifier from './components/TicketClassifier'
import ContentGenerator from './components/ContentGenerator'
import TextSummarizer from './components/TextSummarizer'
import Translator from './components/Translator'
import ImageQA from './components/ImageQ&A'
import MultimodalAI from './components/MultimodalAI'
import RealTimeCollaboration from './components/RealTimeCollaboration'
import { DocumentInfo } from './types'
import { getDocuments } from './services/api'

function App() {
  const { user, loading } = useAuth()
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [darkMode, setDarkMode] = useState(false)
  // Feature-specific document mapping: feature -> document IDs
  const [featureDocuments, setFeatureDocuments] = useState<Record<string, string[]>>({
    qa: [],
    report: [],
    code: [],
    ticket: [],
    summarize: []
  })

  // All hooks must be called before any conditional returns
  useEffect(() => {
    // Apply dark mode class to body
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const fetchDocuments = async () => {
    try {
      const data = await getDocuments()
      setDocuments(data || [])
    } catch (error: any) {
      console.error('Error fetching documents:', error)
      setDocuments([])
    }
  }

  useEffect(() => {
    if (user) {
      fetchDocuments()
    }
  }, [user])

  const handleDocumentUploaded = async (documentId?: string, featureId?: string) => {
    // Fetch updated documents
    await fetchDocuments()
    
    // If we have the document ID from upload response, add it directly
    if (documentId && featureId) {
      setFeatureDocuments(prev => {
        // Check if document is already in the feature
        if (!prev[featureId]?.includes(documentId)) {
          return {
            ...prev,
            [featureId]: [...(prev[featureId] || []), documentId]
          }
        }
        return prev
      })
    } else if (featureId) {
      // Fallback: if no document ID, wait and get the latest document
      setTimeout(() => {
        setDocuments(currentDocs => {
          const latestDoc = currentDocs[currentDocs.length - 1]
          if (latestDoc) {
            setFeatureDocuments(prev => {
              if (!prev[featureId]?.includes(latestDoc.document_id)) {
                return {
                  ...prev,
                  [featureId]: [...(prev[featureId] || []), latestDoc.document_id]
                }
              }
              return prev
            })
          }
          return currentDocs
        })
      }, 500)
    }
  }

  // Get documents for current feature
  const getFeatureDocuments = (featureId: string): DocumentInfo[] => {
    const featureDocIds = featureDocuments[featureId] || []
    // Remove duplicates from featureDocIds first
    const uniqueFeatureDocIds = Array.from(new Set(featureDocIds))
    // Filter documents and deduplicate
    const featureDocs = documents.filter(doc => uniqueFeatureDocIds.includes(doc.document_id))
    // Return unique documents by document_id
    return featureDocs.filter((doc, index, self) => 
      index === self.findIndex(d => d.document_id === doc.document_id)
    )
  }

  // Add document to feature
  const addDocumentToFeature = (featureId: string, documentId: string) => {
    setFeatureDocuments(prev => {
      const currentList = prev[featureId] || []
      // Check if document is already in the feature to prevent duplicates
      if (currentList.includes(documentId)) {
        return prev
      }
      return {
        ...prev,
        [featureId]: [...currentList, documentId]
      }
    })
  }

  // Remove document from feature
  const removeDocumentFromFeature = (featureId: string, documentId: string) => {
    setFeatureDocuments(prev => ({
      ...prev,
      [featureId]: (prev[featureId] || []).filter(id => id !== documentId)
    }))
  }

  // If not authenticated, show login
  if (!loading && !user) {
    return (
      <Routes>
        <Route path="/login" element={<Login darkMode={darkMode} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
          : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
      }`}>
        <div className="text-center">
          <Brain className={`w-12 h-12 animate-pulse mx-auto mb-4 ${
            darkMode ? 'text-indigo-400' : 'text-indigo-600'
          }`} />
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainApp
              documents={documents}
              setDocuments={setDocuments}
              selectedDocuments={selectedDocuments}
              setSelectedDocuments={setSelectedDocuments}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              handleDocumentUploaded={handleDocumentUploaded}
              featureDocuments={featureDocuments}
              setFeatureDocuments={setFeatureDocuments}
              getFeatureDocuments={getFeatureDocuments}
              addDocumentToFeature={addDocumentToFeature}
              removeDocumentFromFeature={removeDocumentFromFeature}
            />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<Login darkMode={darkMode} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

interface MainAppProps {
  documents: DocumentInfo[]
  setDocuments: (docs: DocumentInfo[]) => void
  selectedDocuments: string[]
  setSelectedDocuments: (ids: string[]) => void
  darkMode: boolean
  setDarkMode: (dark: boolean) => void
  handleDocumentUploaded: (documentId?: string, featureId?: string) => void
  featureDocuments: Record<string, string[]>
  setFeatureDocuments: React.Dispatch<React.SetStateAction<Record<string, string[]>>>
  getFeatureDocuments: (featureId: string) => DocumentInfo[]
  addDocumentToFeature: (featureId: string, documentId: string) => void
  removeDocumentFromFeature: (featureId: string, documentId: string) => void
}

function MainApp({
  documents,
  setDocuments,
  selectedDocuments,
  setSelectedDocuments,
  darkMode,
  setDarkMode,
  handleDocumentUploaded,
  featureDocuments,
  setFeatureDocuments,
  getFeatureDocuments,
  addDocumentToFeature,
  removeDocumentFromFeature,
}: MainAppProps) {
  const { user } = useAuth()
  const [activeFeature, setActiveFeature] = useState<'qa' | 'report' | 'code' | 'ticket' | 'content' | 'summarize' | 'translate' | 'image' | 'multimodal' | 'collaboration'>('qa')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedSection, setExpandedSection] = useState<string | null>('ai-features')
  
  const fetchDocuments = async () => {
    try {
      const data = await getDocuments()
      setDocuments(data || [])
      // Also remove deleted documents from all feature lists
      setFeatureDocuments(prev => {
        const updated = { ...prev }
        const existingDocIds = new Set((data || []).map((d: DocumentInfo) => d.document_id))
        // Clean up feature lists to remove deleted document IDs
        Object.keys(updated).forEach(featureId => {
          updated[featureId] = updated[featureId].filter(id => existingDocIds.has(id))
        })
        return updated
      })
    } catch (error: any) {
      console.error('Error fetching documents:', error)
      setDocuments([])
    }
  }

  useEffect(() => {
    // Fetch documents when component mounts (user is already verified in parent)
    if (user) {
      fetchDocuments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])


  const sidebarSections = [
    {
      id: 'ai-features',
      title: 'AI Features',
      icon: Sparkles,
      items: [
        { id: 'qa', label: 'Q&A Chat', icon: MessageSquare, description: 'Ask questions about documents' },
        { id: 'report', label: 'Report Generator', icon: FileBarChart, description: 'Generate reports from documents' },
        { id: 'code', label: 'Code Reviewer', icon: Code, description: 'Review and analyze code' },
        { id: 'ticket', label: 'Ticket Classifier', icon: Ticket, description: 'Classify support tickets' },
        { id: 'content', label: 'Content Generator', icon: PenTool, description: 'Generate content with AI' },
        { id: 'summarize', label: 'Text Summarizer', icon: FileCheck, description: 'Summarize documents' },
        { id: 'translate', label: 'Translator', icon: Languages, description: 'Translate text' },
        { id: 'image', label: 'Image Q&A', icon: Image, description: 'Ask questions about images' },
        { id: 'multimodal', label: 'Multi-modal AI', icon: Video, description: 'Audio & video processing' },
        { id: 'collaboration', label: 'Real-time Collaboration', icon: Users, description: 'Team workspaces' },
      ]
    },
  ]

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId)
  }

  const handleFeatureClick = (featureId: string) => {
    setActiveFeature(featureId as any)
  }

  return (
    <div className={`min-h-screen transition-all duration-500 flex ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950' 
        : 'bg-gradient-to-br from-indigo-50 via-white to-purple-50'
    }`}>
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20 ${
          darkMode ? 'bg-indigo-500' : 'bg-indigo-300'
        } animate-pulse`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-20 ${
          darkMode ? 'bg-purple-500' : 'bg-purple-300'
        } animate-pulse`} style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Sidebar */}
      <aside className={`${
        sidebarOpen ? 'w-72' : 'w-20'
      } transition-all duration-300 flex-shrink-0 relative z-20 ${
        darkMode 
          ? 'bg-gray-900/95 backdrop-blur-xl border-r border-gray-800' 
          : 'bg-white/95 backdrop-blur-xl border-r border-gray-200'
      } shadow-2xl`}>
        {/* Sidebar Header */}
        <div className={`p-4 border-b ${
          darkMode ? 'border-gray-800' : 'border-gray-200'
        } flex items-center justify-between`}>
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
            darkMode 
                  ? 'bg-gradient-to-br from-indigo-600 to-purple-600' 
                  : 'bg-gradient-to-br from-indigo-600 to-purple-600'
              }`}>
                <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                <h1 className={`text-lg font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                    GenAI Platform
                  </h1>
                <p className={`text-xs ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  AI-Powered Tools
                  </p>
                </div>
            </div>
          )}
          {!sidebarOpen && (
            <div className="flex justify-center w-full">
              <div className={`p-2 rounded-xl ${
                darkMode 
                  ? 'bg-gradient-to-br from-indigo-600 to-purple-600' 
                  : 'bg-gradient-to-br from-indigo-600 to-purple-600'
              }`}>
                <Brain className="w-6 h-6 text-white" />
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {sidebarSections.map((section) => {
            const Icon = section.icon
            const isExpanded = expandedSection === section.id
            
            return (
              <div key={section.id} className="mb-4">
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    darkMode 
                      ? 'hover:bg-gray-800 text-gray-300'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${
                    darkMode ? 'text-indigo-400' : 'text-indigo-600'
                  }`} />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left font-semibold text-sm">
                        {section.title}
                      </span>
                      <ChevronRight className={`w-4 h-4 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`} />
                    </>
                  )}
                </button>
                
                {sidebarOpen && isExpanded && (
                  <div className="mt-2 ml-8 space-y-1">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon
                      const isActive = activeFeature === item.id
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleFeatureClick(item.id)}
                          className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all text-left group ${
                            isActive
                              ? darkMode
                                ? 'bg-indigo-600/20 text-indigo-300 border-l-2 border-indigo-500'
                                : 'bg-indigo-50 text-indigo-700 border-l-2 border-indigo-500'
                              : darkMode
                                ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200'
                                : 'hover:bg-gray-50 text-gray-600 hover:text-gray-800'
                          }`}
                          title={sidebarOpen ? undefined : item.label}
                        >
                          <ItemIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            isActive
                              ? darkMode ? 'text-indigo-400' : 'text-indigo-600'
                              : darkMode ? 'text-gray-500' : 'text-gray-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{item.label}</div>
                            {sidebarOpen && (
                              <div className={`text-xs mt-0.5 ${
                                darkMode ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                                {item.description}
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className={`p-4 border-t ${
          darkMode ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <div className={`flex items-center gap-3 p-2 rounded-lg ${
            darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
          } transition-colors`}>
                <button
                  onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-all ${
                    darkMode 
                  ? 'text-gray-400 hover:bg-gray-700 hover:text-yellow-400'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-yellow-600'
              }`}
                  title="Toggle dark mode"
                >
                  {darkMode ? '☀️' : '🌙'}
                </button>
            {sidebarOpen && (
              <span className={`text-sm font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative z-10">
        {/* Top Header Bar */}
        <header className={`${
          darkMode 
            ? 'bg-gray-900/80 backdrop-blur-xl border-b border-gray-800' 
            : 'bg-white/80 backdrop-blur-xl border-b border-gray-200'
        } sticky top-0 z-30 shadow-sm`}>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-2xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {activeFeature === 'qa' && 'Q&A Chat'}
                  {activeFeature === 'report' && 'Report Generator'}
                  {activeFeature === 'code' && 'Code Reviewer'}
                  {activeFeature === 'ticket' && 'Ticket Classifier'}
                  {activeFeature === 'content' && 'Content Generator'}
                  {activeFeature === 'summarize' && 'Text Summarizer'}
                  {activeFeature === 'translate' && 'Translator'}
                  {activeFeature === 'image' && 'Image Q&A'}
                  {activeFeature === 'multimodal' && 'Multi-modal AI'}
                  {activeFeature === 'collaboration' && 'Real-time Collaboration'}
                </h2>
                <p className={`text-sm mt-1 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {activeFeature === 'qa' && 'Ask questions about your documents'}
                  {activeFeature === 'report' && 'Generate comprehensive reports'}
                  {activeFeature === 'code' && 'Review and analyze code quality'}
                  {activeFeature === 'ticket' && 'Classify and organize support tickets'}
                  {activeFeature === 'content' && 'Generate content with AI assistance'}
                  {activeFeature === 'summarize' && 'Summarize long documents'}
                  {activeFeature === 'translate' && 'Translate text between languages'}
                  {activeFeature === 'image' && 'Ask questions about images and extract text'}
                  {activeFeature === 'multimodal' && 'Process audio and video files with AI'}
                  {activeFeature === 'collaboration' && 'Work together in real-time workspaces'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <UserProfile darkMode={darkMode} compact={false} />
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6 h-[calc(100vh-120px)] overflow-y-auto">
          {/* Features that require document upload */}
          {(activeFeature === 'qa' || activeFeature === 'report' || activeFeature === 'code' || activeFeature === 'ticket' || activeFeature === 'summarize') && (
            <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <DocumentUpload 
                    onUploadSuccess={(docId) => handleDocumentUploaded(docId, activeFeature)} 
              darkMode={darkMode}
            />
            <DocumentList
                    documents={getFeatureDocuments(activeFeature)}
                    allDocuments={documents}
              selectedDocuments={selectedDocuments}
              onSelectionChange={setSelectedDocuments}
                    onDelete={async (docId) => {
                      if (docId) {
                        // Remove from feature first
                        removeDocumentFromFeature(activeFeature, docId)
                      }
                      // Always refresh documents list to update total count
                      await fetchDocuments()
                    }}
                    onAddToFeature={(docId) => addDocumentToFeature(activeFeature, docId)}
                    currentFeature={activeFeature}
                    featureDocumentIds={featureDocuments[activeFeature] || []}
              darkMode={darkMode}
            />
          </div>
                <div className="lg:col-span-2">
            {activeFeature === 'qa' && (
              <QAChat 
                      selectedDocumentIds={selectedDocuments.length > 0 ? selectedDocuments : featureDocuments.qa}
                darkMode={darkMode}
              />
            )}
            {activeFeature === 'report' && (
              <ReportGenerator 
                      documents={getFeatureDocuments('report')}
                darkMode={darkMode}
              />
            )}
            {activeFeature === 'code' && (
              <CodeReviewer 
                      documents={getFeatureDocuments('code')}
                darkMode={darkMode}
              />
            )}
            {activeFeature === 'ticket' && (
              <TicketClassifier 
                      documents={getFeatureDocuments('ticket')}
                      darkMode={darkMode}
                    />
                  )}
                  {activeFeature === 'summarize' && (
                    <TextSummarizer 
                      documents={getFeatureDocuments('summarize')}
                darkMode={darkMode}
              />
            )}
                </div>
              </div>
            </div>
          )}
          
          {/* Features that don't require document upload */}
            {activeFeature === 'content' && (
              <ContentGenerator 
                darkMode={darkMode}
              />
            )}
          
            {activeFeature === 'translate' && (
              <Translator 
                darkMode={darkMode}
              />
            )}
            {activeFeature === 'image' && (
              <ImageQA 
                darkMode={darkMode}
              />
            )}
            {activeFeature === 'multimodal' && (
              <MultimodalAI 
                darkMode={darkMode}
              />
            )}
            {activeFeature === 'collaboration' && (
              <RealTimeCollaboration 
                darkMode={darkMode}
                userId={user?.id || user?.email}
                userName={user?.full_name || user?.email?.split('@')[0] || 'User'}
              />
            )}
          </div>
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: darkMode ? '#1f2937' : '#fff',
            color: darkMode ? '#fff' : '#000',
            border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  )
}

export default App

