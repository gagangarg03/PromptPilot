import { useState, useEffect } from 'react'
import { Languages, RefreshCw, Copy, Download, ArrowRightLeft } from 'lucide-react'
import { translateText, getSupportedLanguages } from '../services/api'
import toast from 'react-hot-toast'

interface TranslatorProps {
  darkMode: boolean
}

export default function Translator({ darkMode }: TranslatorProps) {
  const [text, setText] = useState('')
  const [sourceLanguage, setSourceLanguage] = useState<string>('')
  const [targetLanguage, setTargetLanguage] = useState('spanish')
  const [preserveFormatting, setPreserveFormatting] = useState(true)
  const [loading, setLoading] = useState(false)
  const [translation, setTranslation] = useState<any>(null)
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>([])

  useEffect(() => {
    fetchSupportedLanguages()
  }, [])

  const fetchSupportedLanguages = async () => {
    try {
      const result = await getSupportedLanguages()
      setSupportedLanguages(result.languages || [])
    } catch (error) {
    }
  }

  const handleTranslate = async () => {
    if (!text.trim()) {
      toast.error('Please enter text to translate')
      return
    }

    setLoading(true)
    try {
      const result = await translateText({
        text,
        target_language: targetLanguage,
        source_language: sourceLanguage || undefined,
        preserve_formatting: preserveFormatting
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        setTranslation(result)
        toast.success('Translation completed!')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to translate')
    } finally {
      setLoading(false)
    }
  }

  const handleSwap = () => {
    if (translation) {
      setText(translation.translated_text)
      setSourceLanguage(targetLanguage)
      setTargetLanguage(translation.source_language === 'auto-detected' ? '' : translation.source_language)
      setTranslation(null)
    }
  }

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy)
    toast.success('Copied to clipboard!')
  }

  const handleDownload = () => {
    if (translation) {
      const content = `Original (${translation.source_language}):\n${translation.original_text}\n\nTranslation (${translation.target_language}):\n${translation.translated_text}`
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `translation-${Date.now()}.txt`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Translation downloaded!')
    }
  }

  return (
    <div className={`rounded-2xl shadow-xl p-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-600' : 'bg-indigo-100'}`}>
          <Languages className={`w-6 h-6 ${darkMode ? 'text-white' : 'text-indigo-600'}`} />
        </div>
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          AI Translator
        </h2>
      </div>

      <div className="space-y-6">
        {/* Language Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Source Language (Optional - Auto-detect)
            </label>
            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              className={`w-full p-3 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-800'
              } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            >
              <option value="">Auto-detect</option>
              {supportedLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Target Language <span className="text-red-500">*</span>
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className={`w-full p-3 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-800'
              } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            >
              {supportedLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Text Input */}
        <div>
          <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Text to Translate
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter or paste the text you want to translate..."
            rows={6}
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

        {/* Options */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preserveFormatting}
              onChange={(e) => setPreserveFormatting(e.target.checked)}
              className="w-5 h-5"
            />
            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
              Preserve formatting and line breaks
            </span>
          </label>
        </div>

        {/* Translate Button */}
        <button
          onClick={handleTranslate}
          disabled={loading || !text.trim()}
          className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
            darkMode
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Translating...
            </>
          ) : (
            <>
              <Languages className="w-5 h-5" />
              Translate
            </>
          )}
        </button>

        {/* Translation Result */}
        {translation && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border-2 ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Translation ({translation.target_language})
                  </h3>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Source: {translation.source_language} • {translation.translated_length} characters
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(translation.translated_text)}
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
                  {translation.translated_text}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setTranslation(null)}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Translate New
              </button>
              <button
                onClick={handleSwap}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  darkMode
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                Swap Languages
              </button>
              <button
                onClick={() => handleCopy(translation.translated_text)}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  darkMode
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

