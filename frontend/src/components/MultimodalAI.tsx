import { useState, useRef } from 'react'
import { Video, Music, Upload, Loader2, FileText, Play, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../services/api'

interface MultimodalAIProps {
  darkMode?: boolean
}

export default function MultimodalAI({ darkMode = false }: MultimodalAIProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<'audio' | 'video' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [question, setQuestion] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    // Check by MIME type first
    const audioMimeTypes = [
      'audio/mp3', 'audio/mpeg', 'audio/x-mpeg', 'audio/mpeg3', 'audio/x-mpeg-3',
      'audio/wav', 'audio/x-wav', 'audio/wave',
      'audio/m4a', 'audio/x-m4a', 'audio/mp4',
      'audio/ogg', 'audio/oga', 'audio/opus',
      'audio/flac', 'audio/x-flac',
      'audio/aac', 'audio/x-aac'
    ]
    const videoMimeTypes = [
      'video/mp4', 'video/x-m4v',
      'video/avi', 'video/x-msvideo',
      'video/mov', 'video/quicktime',
      'video/mkv', 'video/x-matroska',
      'video/webm',
      'video/flv', 'video/x-flv'
    ]
    
    // Also check by file extension as fallback (some browsers don't set MIME type correctly)
    const getFileExtension = (filename: string) => {
      return filename.toLowerCase().split('.').pop() || ''
    }
    const extension = getFileExtension(file.name)
    const audioExtensions = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'wma', 'opus']
    const videoExtensions = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', 'm4v']
    
    // Determine file type
    const isAudio = audioMimeTypes.includes(file.type) || audioExtensions.includes(extension)
    const isVideo = videoMimeTypes.includes(file.type) || videoExtensions.includes(extension)
    
    if (isAudio) {
      setFileType('audio')
      setSelectedFile(file)
      setResults(null)
    } else if (isVideo) {
      setFileType('video')
      setSelectedFile(file)
      setResults(null)
    } else {
      toast.error(`Unsupported file type: ${file.type || 'unknown'} (${extension}). Please upload audio (MP3, WAV, M4A) or video (MP4, AVI, MOV) files.`)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const transcribeAudio = async () => {
    if (!selectedFile || fileType !== 'audio') {
      toast.error('Please select an audio file')
      return
    }

    // Check if user is authenticated
    const token = localStorage.getItem('auth_token')
    if (!token) {
      toast.error('Please log in to transcribe audio')
      return
    }

    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile, selectedFile.name)

      // Audio transcription can take time, so use a longer timeout (2 minutes)
      // Don't set Content-Type - axios will set it with boundary for FormData
      const response = await api.post('/api/multimodal/transcribe', formData, {
        timeout: 120000, // 2 minutes for audio transcription
      })

      if (response.data.success) {
        setResults({
          type: 'transcription',
          text: response.data.text,
          language: response.data.language,
          duration: response.data.duration
        })
        toast.success('Audio transcribed successfully!')
      } else {
        throw new Error(response.data.error || 'Transcription failed')
      }
    } catch (error: any) {
      // Don't show error toast if it's a 401 (will redirect to login)
      if (error.response?.status !== 401) {
        // Handle validation errors (422) - format the error message properly
        let errorMessage = 'Failed to transcribe audio'
        if (error.response?.status === 422) {
          const detail = error.response?.data?.detail
          if (Array.isArray(detail)) {
            errorMessage = detail.map((err: any) => err.msg || err.message || JSON.stringify(err)).join(', ')
          } else if (typeof detail === 'string') {
            errorMessage = detail
          } else if (detail) {
            errorMessage = JSON.stringify(detail)
          }
        } else {
          errorMessage = error.response?.data?.detail || error.message || 'Failed to transcribe audio'
        }
        toast.error(errorMessage)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const analyzeVideo = async () => {
    if (!selectedFile || fileType !== 'video') {
      toast.error('Please select a video file')
      return
    }

    // Check if user is authenticated
    const token = localStorage.getItem('auth_token')
    if (!token) {
      toast.error('Please log in to analyze videos')
      return
    }

    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile, selectedFile.name)
      if (question && question.trim()) {
        formData.append('question', question.trim())
      }

      // Video analysis can take time, so use a longer timeout (5 minutes)
      // IMPORTANT: Don't set Content-Type manually - axios will add boundary automatically
      // Setting it manually prevents axios from adding the boundary, causing FastAPI to fail parsing
      const response = await api.post('/api/multimodal/analyze-video', formData, {
        timeout: 300000, // 5 minutes for video processing
      })

      if (response.data.success) {
        setResults({
          type: 'video_analysis',
          ...response.data
        })
        toast.success('Video analyzed successfully!')
      } else {
        throw new Error(response.data.error || 'Video analysis failed')
      }
    } catch (error: any) {
      // Don't show error toast if it's a 401 (will redirect to login)
      if (error.response?.status !== 401) {
        // Handle validation errors (422) - format the error message properly
        let errorMessage = 'Failed to analyze video'
        if (error.response?.status === 422) {
          const detail = error.response?.data?.detail
          if (Array.isArray(detail)) {
            errorMessage = detail.map((err: any) => err.msg || err.message || JSON.stringify(err)).join(', ')
          } else if (typeof detail === 'string') {
            errorMessage = detail
          } else if (detail) {
            errorMessage = JSON.stringify(detail)
          }
        } else {
          errorMessage = error.response?.data?.detail || error.message || 'Failed to analyze video'
        }
        toast.error(errorMessage)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setFileType(null)
    setResults(null)
    setQuestion('')
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
          <Video className="w-5 h-5" />
          Multi-modal AI
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Upload audio or video files for transcription and analysis
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* File Upload Area */}
        {!selectedFile ? (
          <div
            className={`border-2 border-dashed ${borderColor} rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">Drop audio or video here or click to upload</p>
            <p className="text-sm text-gray-500">
              Audio: MP3, WAV, M4A, OGG, FLAC, AAC | Video: MP4, AVI, MOV, MKV, WEBM
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Info */}
            <div className={`${cardBg} rounded-lg p-4 border ${borderColor}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {fileType === 'audio' ? (
                    <Music className="w-5 h-5 text-indigo-500" />
                  ) : (
                    <Video className="w-5 h-5 text-indigo-500" />
                  )}
                  <div>
                    <h3 className="font-medium">{selectedFile.name}</h3>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearFile}
                  className="text-gray-500 hover:text-red-500 transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-2">
                {fileType === 'audio' && (
                  <button
                    onClick={transcribeAudio}
                    disabled={isProcessing}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                      darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'
                    } text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    {isProcessing ? 'Transcribing...' : 'Transcribe Audio'}
                  </button>
                )}

                {fileType === 'video' && (
                  <>
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask a question about the video (optional)..."
                      className={`flex-1 ${inputBg} ${textColor} border ${borderColor} rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    />
                    <button
                      onClick={analyzeVideo}
                      disabled={isProcessing}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                        darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'
                      } text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      {isProcessing ? 'Analyzing...' : 'Analyze Video'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Results */}
            {results && (
              <div className={`${cardBg} rounded-lg p-4 border ${borderColor} space-y-4`}>
                <h3 className="font-medium">Results</h3>

                {results.type === 'transcription' && (
                  <div>
                    <div className="mb-2 text-sm text-gray-500">
                      Language: {results.language} | Duration: {results.duration ? `${results.duration.toFixed(1)}s` : 'N/A'}
                    </div>
                    <div className={`${inputBg} rounded p-3 max-h-96 overflow-y-auto text-sm whitespace-pre-wrap`}>
                      {results.text || 'No transcription text available. The audio might be silent or too short.'}
                    </div>
                  </div>
                )}

                {results.type === 'video_analysis' && (
                  <div className="space-y-4">
                    {results.audio_transcription && results.audio_transcription.text && (
                      <div>
                        <h4 className="font-medium mb-2">Audio Transcription</h4>
                        <div className={`${inputBg} rounded p-3 max-h-48 overflow-y-auto text-sm`}>
                          {results.audio_transcription.text || 'No audio transcription available'}
                        </div>
                      </div>
                    )}

                    {results.frames && results.frames.length > 0 ? (
                      <div>
                        <h4 className="font-medium mb-2">Key Frames ({results.frames.length})</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {results.frames.map((frame: any, idx: number) => (
                            <div key={idx} className="relative">
                              <img
                                src={frame.image_base64}
                                alt={`Frame ${frame.frame_number}`}
                                className="w-full h-auto rounded border"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1">
                                {frame.timestamp?.toFixed(1) || '0.0'}s
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        No frames extracted. The video might be too short or corrupted.
                      </div>
                    )}

                    {results.analysis ? (
                      <div>
                        <h4 className="font-medium mb-2">AI Analysis</h4>
                        <div className={`${inputBg} rounded p-3 text-sm whitespace-pre-wrap`}>
                          {results.analysis}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        {results.llm ? 'AI analysis is being generated...' : 'AI analysis unavailable. Please configure GOOGLE_API_KEY or OPENAI_API_KEY.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

