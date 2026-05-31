import { useState } from 'react'
import { FileText, Scissors, Copy, Download, RefreshCw, FileUp } from 'lucide-react'
import { summarizeText } from '../services/api'
import { DocumentInfo } from '../types'
import toast from 'react-hot-toast'

interface TextSummarizerProps {
  documents: DocumentInfo[]
  darkMode: boolean
}

export default function TextSummarizer({ documents, darkMode }: TextSummarizerProps) {
  const [inputMode, setInputMode] = useState<'text' | 'document'>('text')
  const [text, setText] = useState('')
  const [selectedDoc, setSelectedDoc] = useState<string>('')
  const [summaryType, setSummaryType] = useState('concise')
  const [maxLength, setMaxLength] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<any>(null)

  const summaryTypes = [
    { value: 'concise', label: '📝 Concise', description: '2-3 sentences' },
    { value: 'detailed', label: '📄 Detailed', description: 'Comprehensive summary' },
    { value: 'bullet_points', label: '• Bullet Points', description: 'Key points list' },
    { value: 'executive', label: '👔 Executive', description: 'Executive summary format' }
  ]

  const handleSummarize = async () => {
    if (inputMode === 'text' && !text.trim()) {
      toast.error('Please enter text to summarize')
      return
    }
    if (inputMode === 'document' && !selectedDoc) {
      toast.error('Please select a document')
      return
    }

    setLoading(true)
    try {
      const result = await summarizeText({
        text: inputMode === 'text' ? text : undefined,
        document_id: inputMode === 'document' ? selectedDoc : undefined,
        summary_type: summaryType,
        max_length: maxLength ? Number(maxLength) : undefined
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        setSummary(result)
        toast.success('Summary generated successfully!')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to generate summary')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (summary?.summary) {
      navigator.clipboard.writeText(summary.summary)
      toast.success('Summary copied!')
    }
  }

  const handleDownload = () => {
    if (summary?.summary) {
      const blob = new Blob([summary.summary], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `summary-${Date.now()}.txt`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Summary downloaded!')
    }
  }

  return (
    <div className={`rounded-2xl shadow-xl p-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-600' : 'bg-indigo-100'}`}>
          <Scissors className={`w-6 h-6 ${darkMode ? 'text-white' : 'text-indigo-600'}`} />
        </div>
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          AI Text Summarizer
        </h2>
      </div>

      {!summary ? (
        <div className="space-y-6">
          {/* Input Mode Selection */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Input Method
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setInputMode('text')}
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                  inputMode === 'text'
                    ? darkMode
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : darkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-300'
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                <FileText className="w-5 h-5 mx-auto mb-1" />
                <div className="text-sm font-medium">Paste Text</div>
              </button>
              <button
                onClick={() => setInputMode('document')}
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                  inputMode === 'document'
                    ? darkMode
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : darkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-300'
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                <FileUp className="w-5 h-5 mx-auto mb-1" />
                <div className="text-sm font-medium">Use Document</div>
              </button>
            </div>
          </div>

          {/* Text Input or Document Selection */}
          {inputMode === 'text' ? (
            <div>
              <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Text to Summarize
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste or type the text you want to summarize here..."
                rows={8}
                className={`w-full p-3 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {text.length} characters
              </p>
            </div>
          ) : (
            <div>
              <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Select Document
              </label>
              <select
                value={selectedDoc}
                onChange={(e) => setSelectedDoc(e.target.value)}
                className={`w-full p-3 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-800'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              >
                <option value="">Select a document...</option>
                {documents.map((doc) => (
                  <option key={doc.document_id} value={doc.document_id}>
                    {doc.filename}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Summary Type */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Summary Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {summaryTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSummaryType(type.value)}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    summaryType === type.value
                      ? darkMode
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : darkMode
                        ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold mb-1">{type.label}</div>
                  <div className="text-xs opacity-75">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Max Length (Optional) */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Max Length (Optional - in words)
            </label>
            <input
              type="number"
              value={maxLength}
              onChange={(e) => setMaxLength(e.target.value ? Number(e.target.value) : '')}
              placeholder="e.g., 100 (leave empty for auto)"
              className={`w-full p-3 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleSummarize}
            disabled={loading || (inputMode === 'text' && !text.trim()) || (inputMode === 'document' && !selectedDoc)}
            className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              darkMode
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Summarizing...
              </>
            ) : (
              <>
                <Scissors className="w-5 h-5" />
                Generate Summary
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Results */}
          <div className={`p-4 rounded-xl border-2 ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Summary
                </h3>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Type: {summaryTypes.find(t => t.value === summary.summary_type)?.label} • 
                  Original: {summary.original_length} chars • 
                  Summary: {summary.summary_length} chars • 
                  Compression: {summary.compression_ratio}%
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-200 text-gray-700'
                  }`}
                  title="Copy"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDownload}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-200 text-gray-700'
                  }`}
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className={`prose prose-sm max-w-none ${darkMode ? 'prose-invert' : ''}`}>
              <p className={`whitespace-pre-wrap ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {summary.summary}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setSummary(null)}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Summarize New
            </button>
            <button
              onClick={handleCopy}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                darkMode
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

