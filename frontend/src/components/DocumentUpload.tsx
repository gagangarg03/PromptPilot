import { useState } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { uploadDocument } from '../services/api'
import toast from 'react-hot-toast'

interface DocumentUploadProps {
  onUploadSuccess: (documentId?: string) => void
  darkMode?: boolean
}

export default function DocumentUpload({ onUploadSuccess, darkMode = false }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleFileSelect = async (file: File) => {
    // Only allow text documents (no images - use Image Q&A feature for images)
    const allowedTypes = ['.pdf', '.docx', '.txt', '.doc']
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()

    // Check if it's an image file
    const imageTypes = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
    if (imageTypes.includes(fileExt)) {
      setUploadStatus({
        type: 'error',
        message: 'Images are not supported here. Please use the "Image Q&A" feature for image uploads and analysis.'
      })
      toast.error('Use "Image Q&A" feature for images')
      return
    }

    if (!allowedTypes.includes(fileExt)) {
      setUploadStatus({
        type: 'error',
        message: `Unsupported file type. Allowed: ${allowedTypes.join(', ')}`
      })
      return
    }

    setIsUploading(true)
    setUploadStatus(null)

    try {
      toast.loading('Uploading and processing document...', { id: 'upload' })
      const response = await uploadDocument(file)
      toast.success(`${file.name} uploaded successfully!`, { id: 'upload' })
      setUploadStatus({
        type: 'success',
        message: `${file.name} uploaded and processed successfully!`
      })
      // Pass the uploaded document info to the callback
      onUploadSuccess(response?.document_id || response?.id)
      
      // Clear status after 3 seconds
      setTimeout(() => setUploadStatus(null), 3000)
    } catch (error: any) {
      let errorMsg = error.response?.data?.detail || 'Failed to upload document'
      
      // Provide helpful message for image uploads in document upload
      if (errorMsg.includes('image') || errorMsg.includes('OCR')) {
        errorMsg = errorMsg + ' Tip: For images, use the "Image Q&A" feature for better results.'
      }
      
      toast.error(errorMsg, { id: 'upload' })
      setUploadStatus({
        type: 'error',
        message: errorMsg
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  return (
    <div className={`rounded-xl shadow-lg p-6 transition-all hover:shadow-xl ${
      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
    }`}>
      <h2 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${
        darkMode ? 'text-white' : 'text-gray-800'
      }`}>
        <FileText className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
        Upload Document
      </h2>

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          isDragging
            ? darkMode 
              ? 'border-indigo-500 bg-indigo-900/20' 
              : 'border-indigo-500 bg-indigo-50'
            : darkMode
              ? 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${
          darkMode ? 'text-gray-400' : 'text-gray-400'
        }`} />
        <p className={`mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Drag and drop a document here, or click to select
        </p>
        <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Supported: PDF, DOCX, TXT
        </p>
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".pdf,.docx,.txt,.doc"
          onChange={handleFileInput}
          disabled={isUploading}
        />
        <label
          htmlFor="file-upload"
          className={`inline-block px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg cursor-pointer hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105 ${
            isUploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isUploading ? 'Processing...' : 'Select File'}
        </label>
      </div>

      {uploadStatus && (
        <div
          className={`mt-4 p-3 rounded-lg flex items-center gap-2 animate-slide-up ${
            uploadStatus.type === 'success'
              ? darkMode ? 'bg-green-900/30 text-green-400 border border-green-700' : 'bg-green-50 text-green-800'
              : darkMode ? 'bg-red-900/30 text-red-400 border border-red-700' : 'bg-red-50 text-red-800'
          }`}
        >
          {uploadStatus.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="text-sm">{uploadStatus.message}</span>
        </div>
      )}
    </div>
  )
}

