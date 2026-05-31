import { useState } from 'react'
import { MessageSquare, Tag, Clock, Send, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { classifyTicket, generateTicketResponse } from '../services/api'
import { DocumentInfo } from '../types'
import toast from 'react-hot-toast'

interface TicketClassifierProps {
  documents: DocumentInfo[]
  darkMode: boolean
}

export default function TicketClassifier({ documents, darkMode }: TicketClassifierProps) {
  const [ticketText, setTicketText] = useState('')
  const [useDocumentContext, setUseDocumentContext] = useState(false)
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [responseStyle, setResponseStyle] = useState('professional')
  const [loading, setLoading] = useState(false)
  const [classification, setClassification] = useState<any>(null)
  const [response, setResponse] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'classify' | 'respond'>('classify')

  const handleClassify = async () => {
    if (!ticketText.trim()) {
      toast.error('Please enter ticket text')
      return
    }

    setLoading(true)
    try {
      const result = await classifyTicket({
        ticket_text: ticketText,
        use_document_context: useDocumentContext,
        document_ids: selectedDocs.length > 0 ? selectedDocs : undefined
      })
      setClassification(result)
      setActiveTab('classify')
      toast.success('Ticket classified!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to classify ticket')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateResponse = async () => {
    if (!ticketText.trim()) {
      toast.error('Please enter ticket text')
      return
    }

    setLoading(true)
    try {
      const result = await generateTicketResponse({
        ticket_text: ticketText,
        category: classification?.category?.category,
        priority: classification?.priority?.priority,
        use_document_context: useDocumentContext,
        document_ids: selectedDocs.length > 0 ? selectedDocs : undefined,
        response_style: responseStyle
      })
      setResponse(result)
      setActiveTab('respond')
      toast.success('Response generated!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to generate response')
    } finally {
      setLoading(false)
    }
  }

  const toggleDocument = (docId: string) => {
    setSelectedDocs(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white'
      case 'urgent': return 'bg-orange-500 text-white'
      case 'high': return 'bg-yellow-500 text-white'
      case 'medium': return 'bg-blue-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      technical: 'bg-blue-500/20 text-blue-400 border-blue-500',
      billing: 'bg-green-500/20 text-green-400 border-green-500',
      feature_request: 'bg-purple-500/20 text-purple-400 border-purple-500',
      bug_report: 'bg-red-500/20 text-red-400 border-red-500',
      account: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
      urgent: 'bg-orange-500/20 text-orange-400 border-orange-500',
      general: 'bg-gray-500/20 text-gray-400 border-gray-500'
    }
    return colors[category] || colors.general
  }

  return (
    <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-600' : 'bg-indigo-100'}`}>
          <MessageSquare className={`w-6 h-6 ${darkMode ? 'text-white' : 'text-indigo-600'}`} />
        </div>
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          AI Support Ticket Classifier & Auto-Responder
        </h2>
      </div>

      {!classification && !response ? (
        <div className="space-y-6">
          {/* Info Box */}
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/20 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
              <strong>💡 What this does:</strong> Paste a support ticket and AI will automatically categorize it (Technical, Billing, Bug, etc.) and determine priority. You can also generate automated responses!
            </p>
          </div>

          {/* Example Tickets */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Try Example Tickets (Click to use)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { text: "I can't log into my account. It says my password is incorrect but I'm sure it's right.", category: "Account" },
                { text: "I was charged $99 but I only signed up for the $49 plan. Can I get a refund?", category: "Billing" },
                { text: "The app crashes every time I try to save a file. This started happening yesterday.", category: "Bug Report" },
                { text: "Would it be possible to add dark mode? I work late and the bright screen hurts my eyes.", category: "Feature Request" },
                { text: "I'm getting an error message 'Connection timeout' when uploading files larger than 10MB.", category: "Technical" },
                { text: "URGENT: Our entire system is down and customers can't access their accounts. Please fix ASAP!", category: "Urgent" }
              ].map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => setTicketText(example.text)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-indigo-500 text-gray-200'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-indigo-300 text-gray-700'
                  }`}
                >
                  <div className="text-xs font-semibold mb-1 text-indigo-500">{example.category}</div>
                  <div className="text-sm line-clamp-2">{example.text}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Ticket Input */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Support Ticket Text
            </label>
            <textarea
              value={ticketText}
              onChange={(e) => setTicketText(e.target.value)}
              placeholder="Paste or type your support ticket here...&#10;&#10;Example: 'I can't log into my account. The login button doesn't work on mobile devices.'"
              rows={6}
              className={`w-full p-3 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            />
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              💡 Tip: The more details you provide, the better the classification and response will be.
            </p>
          </div>

          {/* Document Context Option */}
          {documents.length > 0 && (
            <div className="space-y-3">
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useDocumentContext}
                    onChange={(e) => setUseDocumentContext(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <div className="flex-1">
                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Use Document Knowledge Base for Context
                    </span>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      AI will use your uploaded documents (FAQs, manuals, etc.) to provide more accurate responses
                    </p>
                  </div>
                </label>
              </div>

              {useDocumentContext && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Select Knowledge Base Documents (Optional)
                  </label>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {documents.map(doc => (
                      <label
                        key={doc.document_id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          darkMode
                            ? selectedDocs.includes(doc.document_id)
                              ? 'bg-indigo-900/30 border border-indigo-600'
                              : 'bg-gray-700 hover:bg-gray-600 border border-gray-600'
                            : selectedDocs.includes(doc.document_id)
                              ? 'bg-indigo-50 border border-indigo-300'
                              : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDocs.includes(doc.document_id)}
                          onChange={() => toggleDocument(doc.document_id)}
                          className="w-4 h-4"
                        />
                        <span className={`text-sm flex-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          {doc.filename}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setActiveTab('classify')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'classify'
                  ? darkMode
                    ? 'text-indigo-400 border-b-2 border-indigo-400'
                    : 'text-indigo-600 border-b-2 border-indigo-600'
                  : darkMode
                    ? 'text-gray-400 hover:text-gray-300'
                    : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Classify Ticket
            </button>
            <button
              onClick={() => setActiveTab('respond')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'respond'
                  ? darkMode
                    ? 'text-indigo-400 border-b-2 border-indigo-400'
                    : 'text-indigo-600 border-b-2 border-indigo-600'
                  : darkMode
                    ? 'text-gray-400 hover:text-gray-300'
                    : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Generate Response
            </button>
          </div>

          {/* Response Style (for respond tab) */}
          {activeTab === 'respond' && (
            <div>
              <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Response Style
              </label>
              <select
                value={responseStyle}
                onChange={(e) => setResponseStyle(e.target.value)}
                className={`w-full p-3 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="technical">Technical</option>
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleClassify}
              disabled={loading || !ticketText.trim()}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                darkMode
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {loading && activeTab === 'classify' ? (
                <>
                  <Tag className="w-5 h-5 animate-pulse" />
                  Classifying...
                </>
              ) : (
                <>
                  <Tag className="w-5 h-5" />
                  Classify
                </>
              )}
            </button>

            {activeTab === 'respond' && (
              <button
                onClick={handleGenerateResponse}
                disabled={loading || !ticketText.trim()}
                className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                  darkMode
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {loading && activeTab === 'respond' ? (
                  <>
                    <Send className="w-5 h-5 animate-pulse" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Generate Response
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {activeTab === 'classify' ? 'Classification Results' : 'Generated Response'}
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {classification && `Confidence: ${(classification.confidence * 100).toFixed(1)}%`}
              </p>
            </div>
            <button
              onClick={() => {
                setClassification(null)
                setResponse(null)
                setTicketText('')
              }}
              className={`px-4 py-2 rounded-lg ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              New Ticket
            </button>
          </div>

          {/* Classification Results */}
          {activeTab === 'classify' && classification && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category */}
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Category
                    </span>
                  </div>
                  <div className={`px-3 py-2 rounded border inline-block mt-2 ${
                    darkMode ? getCategoryColor(classification.category?.category || 'general') : getCategoryColor(classification.category?.category || 'general')
                  }`}>
                    {classification.category?.category || 'general'}
                  </div>
                </div>

                {/* Priority */}
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className={`w-5 h-5 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Priority
                    </span>
                  </div>
                  <div className={`px-3 py-2 rounded inline-block mt-2 ${getPriorityColor(classification.priority?.priority || 'medium')}`}>
                    {classification.priority?.priority || 'medium'}
                  </div>
                  {classification.priority?.estimated_resolution_time && (
                    <div className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <Clock className="w-3 h-3 inline mr-1" />
                      Est. Resolution: {classification.priority.estimated_resolution_time}
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              {classification.tags && classification.tags.length > 0 && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Suggested Tags
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {classification.tags.map((tag: string, idx: number) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded text-xs ${
                          darkMode ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Information */}
              {classification.key_information && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      Key Information
                    </span>
                  </div>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {classification.key_information.extracted_info}
                  </p>
                </div>
              )}

              {/* Generate Response Button */}
              <button
                onClick={handleGenerateResponse}
                disabled={loading}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  darkMode
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                <Send className="w-5 h-5" />
                Generate Response
              </button>
            </div>
          )}

          {/* Response Results */}
          {activeTab === 'respond' && response && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Generated Response
                  </span>
                  <span className={`ml-auto text-xs px-2 py-1 rounded ${
                    darkMode ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {response.response_style}
                  </span>
                </div>
                <div className={`p-4 rounded border ${
                  darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                }`}>
                  <p className={`text-sm whitespace-pre-wrap ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {response.response || response.original_response}
                  </p>
                </div>
              </div>

              {/* Suggested Actions */}
              {response.suggested_actions && response.suggested_actions.length > 0 && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Suggested Actions
                  </div>
                  <ul className="space-y-1">
                    {response.suggested_actions.map((action: string, idx: number) => (
                      <li key={idx} className={`text-sm flex items-start gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className="text-indigo-500 mt-1">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

