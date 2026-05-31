import { useState } from 'react'
import { Trash2, FileText, CheckCircle, Search, Filter, Eye, X, Plus, Minus } from 'lucide-react'
import { DocumentInfo } from '../types'
import { deleteDocument } from '../services/api'
import toast from 'react-hot-toast'

interface DocumentListProps {
  documents: DocumentInfo[]
  allDocuments?: DocumentInfo[]
  selectedDocuments: string[]
  onSelectionChange: (ids: string[]) => void
  onDelete: (docId?: string) => void
  onAddToFeature?: (docId: string) => void
  currentFeature?: string
  featureDocumentIds?: string[]
  darkMode?: boolean
}

export default function DocumentList({
  documents,
  allDocuments = [],
  selectedDocuments,
  onSelectionChange,
  onDelete,
  onAddToFeature,
  currentFeature,
  featureDocumentIds = [],
  darkMode = false,
}: DocumentListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [showPreview, setShowPreview] = useState<DocumentInfo | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'chunks'>('date')
  const handleToggleSelection = (documentId: string) => {
    if (selectedDocuments.includes(documentId)) {
      onSelectionChange(selectedDocuments.filter(id => id !== documentId))
    } else {
      onSelectionChange([...selectedDocuments, documentId])
    }
  }

  const handleDelete = async (documentId: string, filename: string) => {
    if (window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      try {
        await deleteDocument(documentId)
        onDelete(documentId)
        toast.success('Document deleted successfully')
      } catch (error) {
        toast.error('Failed to delete document')
      }
    }
  }

  const handleAddToFeature = (documentId: string) => {
    if (onAddToFeature) {
      onAddToFeature(documentId)
      toast.success('Document added to this feature')
    }
  }

  const handleRemoveFromFeature = (documentId: string) => {
    if (onDelete) {
      onDelete(documentId)
      toast.success('Document removed from this feature')
    }
  }

  // Get available documents (not in current feature)
  // Also deduplicate by document_id to prevent showing same document multiple times
  const availableDocuments = allDocuments
    .filter(doc => !featureDocumentIds.includes(doc.document_id))
    .filter((doc, index, self) => 
      index === self.findIndex(d => d.document_id === doc.document_id)
    )

  // Filter and sort documents (feature documents)
  // Deduplicate to prevent showing same document multiple times
  const filteredDocuments = documents
    .filter((doc, index, self) => 
      index === self.findIndex(d => d.document_id === doc.document_id)
    )
    .filter(doc => {
      const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = filterType === 'all' || doc.file_type === filterType
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.filename.localeCompare(b.filename)
        case 'chunks':
          return b.chunk_count - a.chunk_count
        case 'date':
        default:
          return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime()
      }
    })

  // Filter available documents (already deduplicated)
  const filteredAvailableDocuments = availableDocuments
    .filter(doc => {
      const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = filterType === 'all' || doc.file_type === filterType
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.filename.localeCompare(b.filename)
        case 'chunks':
          return b.chunk_count - a.chunk_count
        case 'date':
        default:
          return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime()
      }
    })
    // Final deduplication to ensure no duplicates
    .filter((doc, index, self) => 
      index === self.findIndex(d => d.document_id === doc.document_id)
    )

  const fileTypes = Array.from(new Set([...documents, ...allDocuments].map(d => d.file_type)))

  if (documents.length === 0) {
    return (
      <div className={`rounded-xl shadow-lg p-6 ${
        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
      }`}>
        <h2 className={`text-xl font-semibold mb-4 ${
          darkMode ? 'text-white' : 'text-gray-800'
        }`}>Documents</h2>
        <p className={`text-center py-8 ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          No documents uploaded yet. Upload a document to get started.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className={`rounded-xl shadow-lg p-6 ${
        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-semibold ${
            darkMode ? 'text-white' : 'text-gray-800'
          }`}>
            Documents ({filteredDocuments.length}/{documents.length})
            {currentFeature && (
              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                darkMode ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {currentFeature.toUpperCase()}
              </span>
            )}
          </h2>
        </div>

        {/* Search Bar */}
        <div className="mb-4 relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`px-3 py-1.5 rounded-lg border text-sm ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-800'
            } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          >
            <option value="all">All Types</option>
            {fileTypes.map(type => (
              <option key={type} value={type}>{type.toUpperCase()}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'chunks')}
            className={`px-3 py-1.5 rounded-lg border text-sm ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-800'
            } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="chunks">Sort by Chunks</option>
          </select>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredDocuments.length === 0 ? (
          <div className={`text-center py-8 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {searchQuery || filterType !== 'all' 
                ? 'No documents match your filters' 
                : 'No documents uploaded yet'}
            </p>
          </div>
        ) : (
          filteredDocuments.map((doc) => (
          <div
            key={doc.document_id}
            className={`p-3 border rounded-lg flex items-center justify-between transition-all hover:scale-[1.02] ${
              selectedDocuments.includes(doc.document_id)
                ? darkMode
                  ? 'border-indigo-500 bg-indigo-900/20'
                  : 'border-indigo-500 bg-indigo-50'
                : darkMode
                  ? 'border-gray-700 hover:bg-gray-700/50'
                  : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => handleToggleSelection(doc.document_id)}
                className="flex-shrink-0"
              >
                <CheckCircle
                  className={`w-5 h-5 ${
                    selectedDocuments.includes(doc.document_id)
                      ? 'text-blue-600 fill-blue-600'
                      : 'text-gray-400'
                  }`}
                />
              </button>
              <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  darkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  {doc.filename}
                </p>
                <p className={`text-xs ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {doc.chunk_count} chunks • {doc.file_type.toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowPreview(doc)}
                className={`p-2 rounded transition-colors ${
                  darkMode
                    ? 'text-blue-400 hover:bg-blue-900/30'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
                title="Preview document"
              >
                <Eye className="w-4 h-4" />
              </button>
              {currentFeature && (
                <button
                  onClick={() => handleRemoveFromFeature(doc.document_id)}
                  className={`p-2 rounded transition-colors ${
                    darkMode
                      ? 'text-orange-400 hover:bg-orange-900/30'
                      : 'text-orange-600 hover:bg-orange-50'
                  }`}
                  title="Remove from this feature"
                >
                  <Minus className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => handleDelete(doc.document_id, doc.filename)}
                className={`p-2 rounded transition-colors ${
                  darkMode
                    ? 'text-red-400 hover:bg-red-900/30'
                    : 'text-red-600 hover:bg-red-50'
                }`}
                title="Delete document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          ))
        )}

        {/* Available Documents Section */}
        {currentFeature && filteredAvailableDocuments.length > 0 && (
          <>
            <div className={`mt-6 pt-4 border-t ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-sm font-semibold mb-3 ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Available Documents ({filteredAvailableDocuments.length})
              </h3>
              <p className={`text-xs mb-3 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Add these documents to this feature
              </p>
            </div>
            {filteredAvailableDocuments.map((doc) => (
              <div
                key={doc.document_id}
                className={`p-3 border rounded-lg flex items-center justify-between transition-all hover:scale-[1.02] mb-2 ${
                  darkMode
                    ? 'border-gray-600 hover:bg-gray-700/50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      darkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                      {doc.filename}
                    </p>
                    <p className={`text-xs ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {doc.chunk_count} chunks • {doc.file_type.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowPreview(doc)}
                    className={`p-2 rounded transition-colors ${
                      darkMode
                        ? 'text-blue-400 hover:bg-blue-900/30'
                        : 'text-blue-600 hover:bg-blue-50'
                    }`}
                    title="Preview document"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleAddToFeature(doc.document_id)}
                    className={`p-2 rounded transition-colors ${
                      darkMode
                        ? 'text-green-400 hover:bg-green-900/30'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title="Add to this feature"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      {selectedDocuments.length > 0 && (
        <p className={`mt-4 text-sm ${
          darkMode ? 'text-indigo-400' : 'text-indigo-600'
        }`}>
          {selectedDocuments.length} document(s) selected for Q&A
        </p>
      )}
    </div>

    {/* Document Preview Modal */}
    {showPreview && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPreview(null)}>
        <div
          className={`rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`p-6 border-b ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          } flex items-center justify-between`}>
            <h3 className={`text-xl font-semibold ${
              darkMode ? 'text-white' : 'text-gray-800'
            }`}>
              Document Preview
            </h3>
            <button
              onClick={() => setShowPreview(null)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className={`text-sm font-medium mb-1 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Filename</p>
              <p className={darkMode ? 'text-white' : 'text-gray-800'}>
                {showPreview.filename}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>File Type</p>
                <p className={darkMode ? 'text-white' : 'text-gray-800'}>
                  {showPreview.file_type.toUpperCase()}
                </p>
              </div>
              <div>
                <p className={`text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Chunks</p>
                <p className={darkMode ? 'text-white' : 'text-gray-800'}>
                  {showPreview.chunk_count}
                </p>
              </div>
            </div>
            <div>
              <p className={`text-sm font-medium mb-1 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Upload Date</p>
              <p className={darkMode ? 'text-white' : 'text-gray-800'}>
                {new Date(showPreview.upload_date).toLocaleString()}
              </p>
            </div>
            <div>
              <p className={`text-sm font-medium mb-1 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Document ID</p>
              <p className={`text-xs font-mono ${
                darkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>
                {showPreview.document_id}
              </p>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

