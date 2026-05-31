import { useState } from 'react'
import { Code, Shield, Zap, Book, FileCode, CheckCircle, AlertCircle } from 'lucide-react'
import { reviewCode, generateDocumentation } from '../services/api'
import { DocumentInfo } from '../types'
import toast from 'react-hot-toast'

interface CodeReviewerProps {
  documents: DocumentInfo[]
  darkMode: boolean
}

export default function CodeReviewer({ documents, darkMode }: CodeReviewerProps) {
  const [inputMode, setInputMode] = useState<'file' | 'text'>('text') // Default to text mode
  const [selectedDoc, setSelectedDoc] = useState<string>('')
  const [codeText, setCodeText] = useState<string>('')
  const [language, setLanguage] = useState<string>('')
  const [reviewType, setReviewType] = useState('comprehensive')
  const [docType, setDocType] = useState('technical')
  const [loading, setLoading] = useState(false)
  const [review, setReview] = useState<any>(null)
  const [documentation, setDocumentation] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'review' | 'documentation'>('review')

  // Filter code files (you can extend this list)
  const codeFiles = documents.filter(doc => {
    const ext = doc.filename.split('.').pop()?.toLowerCase()
    return ['py', 'js', 'ts', 'jsx', 'tsx', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'php', 'rb', 'swift', 'kt', 'sql'].includes(ext || '')
  })

  const handleReview = async () => {
    if (inputMode === 'file' && !selectedDoc) {
      toast.error('Please select a code file')
      return
    }
    if (inputMode === 'text' && !codeText.trim()) {
      toast.error('Please enter or paste your code')
      return
    }

    setLoading(true)
    try {
      const result = await reviewCode({
        document_id: inputMode === 'file' ? selectedDoc : undefined,
        code_text: inputMode === 'text' ? codeText : undefined,
        language: inputMode === 'text' ? language || undefined : undefined,
        review_type: reviewType
      })
      setReview(result)
      setActiveTab('review')
      toast.success('Code review completed!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to review code')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateDocs = async () => {
    if (inputMode === 'file' && !selectedDoc) {
      toast.error('Please select a code file')
      return
    }
    if (inputMode === 'text' && !codeText.trim()) {
      toast.error('Please enter or paste your code')
      return
    }

    setLoading(true)
    try {
      const result = await generateDocumentation({
        document_id: inputMode === 'file' ? selectedDoc : undefined,
        code_text: inputMode === 'text' ? codeText : undefined,
        language: inputMode === 'text' ? language || undefined : undefined,
        doc_type: docType
      })
      setDocumentation(result)
      setActiveTab('documentation')
      toast.success('Documentation generated!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to generate documentation')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500'
    if (score >= 70) return 'text-yellow-500'
    if (score >= 50) return 'text-orange-500'
    return 'text-red-500'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10'
      case 'high': return 'text-orange-500 bg-orange-500/10'
      case 'medium': return 'text-yellow-500 bg-yellow-500/10'
      default: return 'text-blue-500 bg-blue-500/10'
    }
  }

  return (
    <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-600' : 'bg-indigo-100'}`}>
          <Code className={`w-6 h-6 ${darkMode ? 'text-white' : 'text-indigo-600'}`} />
        </div>
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          AI Code Reviewer & Documentation Generator
        </h2>
      </div>

      {!review && !documentation ? (
        <div className="space-y-6">
          {/* Input Mode Toggle */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Input Method
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setInputMode('text')
                  setSelectedDoc('')
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  inputMode === 'text'
                    ? darkMode
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-600 text-white'
                    : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📝 Paste Code
              </button>
              <button
                onClick={() => {
                  setInputMode('file')
                  setCodeText('')
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  inputMode === 'file'
                    ? darkMode
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-600 text-white'
                    : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📁 Uploaded File
              </button>
            </div>
          </div>

          {/* Code Text Input */}
          {inputMode === 'text' && (
            <div className="space-y-3">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Paste Your Code
                </label>
                <textarea
                  value={codeText}
                  onChange={(e) => setCodeText(e.target.value)}
                  placeholder="Paste your code here...&#10;&#10;Example:&#10;def calculate_sum(a, b):&#10;    return a + b"
                  rows={12}
                  className={`w-full p-3 rounded-lg border font-mono text-sm ${
                    darkMode
                      ? 'bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500'
                      : 'bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Programming Language (Optional - Auto-detected if not specified)
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className={`w-full p-3 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-800'
                  }`}
                >
                  <option value="">Auto-detect</option>
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                  <option value="csharp">C#</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                  <option value="php">PHP</option>
                  <option value="ruby">Ruby</option>
                  <option value="swift">Swift</option>
                  <option value="kotlin">Kotlin</option>
                  <option value="sql">SQL</option>
                </select>
              </div>
            </div>
          )}

          {/* File Selection */}
          {inputMode === 'file' && (
            <div>
              {codeFiles.length === 0 ? (
                <div className={`text-center py-6 rounded-lg border-2 border-dashed ${
                  darkMode ? 'border-gray-600 bg-gray-700/50' : 'border-gray-300 bg-gray-50'
                }`}>
                  <FileCode className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    No code files found. Upload code files (.py, .js, .ts, .java, etc.) to use this option.
                  </p>
                </div>
              ) : (
                <>
                  <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Select Code File
                  </label>
                  <select
                    value={selectedDoc}
                    onChange={(e) => setSelectedDoc(e.target.value)}
                    className={`w-full p-3 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  >
                    <option value="">Select a code file...</option>
                    {codeFiles.map(doc => (
                      <option key={doc.document_id} value={doc.document_id}>
                        {doc.filename}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setActiveTab('review')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'review'
                  ? darkMode
                    ? 'text-indigo-400 border-b-2 border-indigo-400'
                    : 'text-indigo-600 border-b-2 border-indigo-600'
                  : darkMode
                    ? 'text-gray-400 hover:text-gray-300'
                    : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Code Review
            </button>
            <button
              onClick={() => setActiveTab('documentation')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'documentation'
                  ? darkMode
                    ? 'text-indigo-400 border-b-2 border-indigo-400'
                    : 'text-indigo-600 border-b-2 border-indigo-600'
                  : darkMode
                    ? 'text-gray-400 hover:text-gray-300'
                    : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Generate Documentation
            </button>
          </div>

          {/* Review Options */}
          {activeTab === 'review' && (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Review Type
                </label>
                <select
                  value={reviewType}
                  onChange={(e) => setReviewType(e.target.value)}
                  className={`w-full p-3 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-800'
                  }`}
                >
                  <option value="comprehensive">Comprehensive Review</option>
                  <option value="security">Security Review</option>
                  <option value="performance">Performance Review</option>
                  <option value="style">Code Style & Best Practices</option>
                  <option value="all">All Reviews</option>
                </select>
              </div>

              <button
                onClick={handleReview}
                disabled={loading || (inputMode === 'file' && !selectedDoc) || (inputMode === 'text' && !codeText.trim())}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  darkMode
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <Code className="w-5 h-5 animate-pulse" />
                    Reviewing Code...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Review Code
                  </>
                )}
              </button>
            </div>
          )}

          {/* Documentation Options */}
          {activeTab === 'documentation' && (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Documentation Type
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className={`w-full p-3 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-800'
                  }`}
                >
                  <option value="technical">Technical Documentation</option>
                  <option value="api">API Documentation</option>
                  <option value="readme">README.md</option>
                  <option value="inline">Inline Comments</option>
                </select>
              </div>

              <button
                onClick={handleGenerateDocs}
                disabled={loading || (inputMode === 'file' && !selectedDoc) || (inputMode === 'text' && !codeText.trim())}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  darkMode
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <Book className="w-5 h-5 animate-pulse" />
                    Generating Documentation...
                  </>
                ) : (
                  <>
                    <Book className="w-5 h-5" />
                    Generate Documentation
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {activeTab === 'review' ? 'Code Review Results' : 'Generated Documentation'}
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {activeTab === 'review' && review?.filename}
                {activeTab === 'documentation' && documentation?.filename}
              </p>
            </div>
            <button
              onClick={() => {
                setReview(null)
                setDocumentation(null)
                setSelectedDoc('')
                setCodeText('')
                setLanguage('')
              }}
              className={`px-4 py-2 rounded-lg ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              New Review
            </button>
          </div>

          {/* Review Results */}
          {activeTab === 'review' && review && (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {/* Overall Score */}
              {review.overall_score && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Overall Score</div>
                      <div className={`text-4xl font-bold ${getScoreColor(review.overall_score.score)}`}>
                        {review.overall_score.score}/100
                      </div>
                      <div className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Grade: {review.overall_score.grade} • {review.overall_score.status}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Issues Found</div>
                      <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {review.overall_score.total_issues}
                      </div>
                      {review.overall_score.critical_issues > 0 && (
                        <div className="text-sm text-red-500 mt-1">
                          {review.overall_score.critical_issues} critical
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Review Sections */}
              {review.reviews && Object.entries(review.reviews).map(([type, data]: [string, any]) => (
                <div key={type} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    {type === 'security' && <Shield className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />}
                    {type === 'performance' && <Zap className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />}
                    {type === 'code_quality' && <Code className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />}
                    {type === 'best_practices' && <CheckCircle className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />}
                    <h4 className={`font-semibold capitalize ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {type.replace('_', ' ')}
                    </h4>
                    {data.severity && (
                      <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(data.severity)}`}>
                        {data.severity}
                      </span>
                    )}
                  </div>
                  
                  {data.review && (
                    <p className={`text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {data.review}
                    </p>
                  )}

                  {data.issues && data.issues.length > 0 && (
                    <div className="space-y-2">
                      <div className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Issues ({data.issues.length}):
                      </div>
                      {data.issues.slice(0, 5).map((issue: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-2 rounded text-sm flex items-start gap-2 ${
                            darkMode ? 'bg-gray-800' : 'bg-white'
                          }`}
                        >
                          <AlertCircle className={`w-4 h-4 mt-0.5 ${
                            issue.severity === 'critical' ? 'text-red-500' :
                            issue.severity === 'high' ? 'text-orange-500' :
                            'text-yellow-500'
                          }`} />
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                            {issue.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Documentation Results */}
          {activeTab === 'documentation' && documentation && (
            <div className={`p-4 rounded-lg max-h-[600px] overflow-y-auto ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-4">
                <Book className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {documentation.doc_type?.toUpperCase()} Documentation
                </h4>
              </div>
              <pre className={`text-sm whitespace-pre-wrap font-mono ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {documentation.documentation?.documentation || documentation.documentation}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

