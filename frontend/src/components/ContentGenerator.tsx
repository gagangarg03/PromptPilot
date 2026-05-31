import { useState } from 'react'
import { Sparkles, Copy, Download, RefreshCw } from 'lucide-react'
import { generateContent } from '../services/api'
import toast from 'react-hot-toast'

interface ContentGeneratorProps {
  darkMode: boolean
}

export default function ContentGenerator({ darkMode }: ContentGeneratorProps) {
  const [contentType, setContentType] = useState('blog_post')
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('professional')
  const [length, setLength] = useState('medium')
  const [additionalContext, setAdditionalContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)

  const contentTypes = [
    { value: 'blog_post', label: '📝 Blog Post', description: 'Comprehensive blog articles' },
    { value: 'email', label: '📧 Email', description: 'Professional emails' },
    { value: 'social_media', label: '📱 Social Media', description: 'Social media posts' },
    { value: 'product_description', label: '🛍️ Product Description', description: 'Product marketing copy' },
    { value: 'article', label: '📄 Article', description: 'Long-form articles' },
    { value: 'marketing_copy', label: '📢 Marketing Copy', description: 'Persuasive marketing content' }
  ]

  const tones = [
    { value: 'professional', label: 'Professional' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'casual', label: 'Casual' },
    { value: 'formal', label: 'Formal' },
    { value: 'creative', label: 'Creative' }
  ]

  const lengths = [
    { value: 'short', label: 'Short (100-200 words)' },
    { value: 'medium', label: 'Medium (300-500 words)' },
    { value: 'long', label: 'Long (600+ words)' }
  ]

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic')
      return
    }

    setLoading(true)
    try {
      const result = await generateContent({
        content_type: contentType,
        topic,
        tone,
        length,
        additional_context: additionalContext || undefined
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        setGeneratedContent(result.generated_content)
        toast.success('Content generated successfully!')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to generate content')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent)
      toast.success('Content copied to clipboard!')
    }
  }

  const handleDownload = () => {
    if (generatedContent) {
      const blob = new Blob([generatedContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `generated-content-${Date.now()}.txt`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Content downloaded!')
    }
  }

  const handleReset = () => {
    setTopic('')
    setAdditionalContext('')
    setGeneratedContent(null)
  }

  return (
    <div className={`rounded-2xl shadow-xl p-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-600' : 'bg-indigo-100'}`}>
          <Sparkles className={`w-6 h-6 ${darkMode ? 'text-white' : 'text-indigo-600'}`} />
        </div>
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          AI Content Generator
        </h2>
      </div>

      {/* Info Box */}
      <div className={`p-4 rounded-lg mb-6 ${darkMode ? 'bg-blue-900/20 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
        <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
          <strong>💡 No documents needed!</strong> This feature generates content from scratch based on your topic. Just enter a topic and let AI create professional content for you.
        </p>
      </div>

      {!generatedContent ? (
        <div className="space-y-6">
          {/* Content Type Selection */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Content Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {contentTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setContentType(type.value)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    contentType === type.value
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

          {/* Topic Input */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Topic / Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., 'The Future of Artificial Intelligence', 'Product Launch Announcement'"
              className={`w-full p-3 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            />
          </div>

          {/* Tone and Length */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className={`w-full p-3 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-800'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              >
                {tones.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Length
              </label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className={`w-full p-3 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-800'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              >
                {lengths.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Additional Context */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Additional Context (Optional)
            </label>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="e.g., 'Target audience: developers', 'Include statistics', 'Focus on benefits'"
              rows={3}
              className={`w-full p-3 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              darkMode
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Content
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Generated Content */}
          <div className={`p-4 rounded-xl border-2 ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Generated Content
              </h3>
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
                {generatedContent}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Generate New
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
