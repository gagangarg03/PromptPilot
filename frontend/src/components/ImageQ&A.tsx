import { useState, useRef, useEffect } from 'react'
import { Image as ImageIcon, Send, Upload, X, Loader2, Eye, FileText } from 'lucide-react'
import { analyzeImage, extractTextFromImage } from '../services/api'
import toast from 'react-hot-toast'

interface ImageQAProps {
  darkMode?: boolean
}

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  imageUrl?: string
  timestamp: Date
}

export default function ImageQA({ darkMode = false }: ImageQAProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractedText, setExtractedText] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleImageSelect = (file: File) => {
    // Validate image file
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Unsupported image format. Please use PNG, JPG, JPEG, GIF, BMP, or WEBP.')
      return
    }

    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image file too large. Maximum size is 10MB.')
      return
    }

    setSelectedImage(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    setExtractedText(null)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleImageSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const extractText = async () => {
    if (!selectedImage) {
      toast.error('Please select an image first')
      return
    }

    setIsExtracting(true)
    try {
      const result = await extractTextFromImage(selectedImage)
      if (result.success && result.text) {
        setExtractedText(result.text)
        toast.success('Text extracted successfully!')
      } else {
        toast.error('Failed to extract text from image')
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to extract text'
      toast.error(errorMsg)
    } finally {
      setIsExtracting(false)
    }
  }

  const askQuestion = async () => {
    if (!selectedImage) {
      toast.error('Please select an image first')
      return
    }

    if (!question.trim()) {
      toast.error('Please enter a question')
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: question,
      imageUrl: imagePreview || undefined,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setQuestion('')
    setIsAnalyzing(true)

    try {
      const result = await analyzeImage(selectedImage, question)
      if (result.success && result.answer) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: result.answer,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
        toast.success('Image analyzed successfully!')
      } else {
        throw new Error(result.error || 'Failed to analyze image')
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to analyze image'
      toast.error(errorMsg)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Error: ${errorMsg}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsAnalyzing(false)
    }
  }

  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setExtractedText(null)
    setMessages([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const bgColor = darkMode ? 'bg-gray-900' : 'bg-white'
  const textColor = darkMode ? 'text-gray-100' : 'text-gray-900'
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-300'
  const inputBg = darkMode ? 'bg-gray-800' : 'bg-gray-50'
  const cardBg = darkMode ? 'bg-gray-800' : 'bg-gray-50'

  return (
    <div className={`flex flex-col h-full ${bgColor} ${textColor}`}>
      {/* Header */}
      <div className={`p-4 border-b ${borderColor}`}>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Image Q&A & OCR
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Upload an image and ask questions about it, or extract text using OCR
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Image Upload Area */}
        {!selectedImage ? (
          <div
            className={`border-2 border-dashed ${borderColor} rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">Drop an image here or click to upload</p>
            <p className="text-sm text-gray-500">
              Supports: PNG, JPG, JPEG, GIF, BMP, WEBP (Max 10MB)
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Image Preview */}
            <div className={`${cardBg} rounded-lg p-4 border ${borderColor}`}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium">Selected Image</h3>
                <button
                  onClick={clearImage}
                  className="text-gray-500 hover:text-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className={`relative rounded-lg overflow-hidden border ${borderColor}`}>
                <img
                  src={imagePreview || ''}
                  alt="Preview"
                  className="w-full h-auto max-h-96 object-contain"
                />
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={extractText}
                  disabled={isExtracting}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'
                  } text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                >
                  {isExtracting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  {isExtracting ? 'Extracting...' : 'Extract Text (OCR)'}
                </button>
              </div>
            </div>

            {/* Extracted Text */}
            {extractedText && (
              <div className={`${cardBg} rounded-lg p-4 border ${borderColor}`}>
                <h3 className="font-medium mb-2">Extracted Text</h3>
                <div className={`${inputBg} rounded p-3 max-h-48 overflow-y-auto text-sm whitespace-pre-wrap`}>
                  {extractedText || 'No text found in image'}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.length > 0 && (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-2 ${
                      msg.type === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    {msg.imageUrl && msg.type === 'user' && (
                      <div className={`max-w-xs rounded-lg overflow-hidden border ${borderColor}`}>
                        <img src={msg.imageUrl} alt="Question context" className="w-full h-auto" />
                      </div>
                    )}
                    <div
                      className={`max-w-2xl rounded-lg p-4 ${
                        msg.type === 'user'
                          ? darkMode
                            ? 'bg-indigo-600 text-white'
                            : 'bg-indigo-500 text-white'
                          : `${cardBg} border ${borderColor}`
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-2">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      {selectedImage && (
        <div className={`p-4 border-t ${borderColor}`}>
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && askQuestion()}
              placeholder="Ask a question about this image..."
              className={`flex-1 ${inputBg} ${textColor} border ${borderColor} rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              disabled={isAnalyzing}
            />
            <button
              onClick={askQuestion}
              disabled={isAnalyzing || !question.trim()}
              className={`px-6 py-2 rounded-lg ${
                darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'
              } text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2`}
            >
              {isAnalyzing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              Ask
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

