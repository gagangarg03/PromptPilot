import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout for all requests (increased for document operations)
})

// Retry logic for connection errors
const retryRequest = async (config: any, retries = 3, delay = 1000): Promise<any> => {
  try {
    // Use axios directly to avoid circular dependency
    return await axios({
      ...config,
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
        ...(localStorage.getItem('auth_token') ? {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`
        } : {})
      },
      timeout: 30000
    })
  } catch (error: any) {
    // Check if it's a connection error and we have retries left
    const isConnectionError = 
      error.code === 'ECONNREFUSED' || 
      error.code === 'ERR_CONNECTION_REFUSED' ||
      error.message?.includes('ERR_CONNECTION_REFUSED') ||
      error.message?.includes('Network Error') ||
      (!error.response && error.request)
    
    if (isConnectionError && retries > 0) {
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay))
      return retryRequest(config, retries - 1, delay * 1.5)
    }
    throw error
  }
}

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    // Ensure headers object exists
    if (!config.headers) {
      config.headers = {} as any
    }
    // Add Authorization header
    (config.headers as any).Authorization = `Bearer ${token}`
  }
  
  // CRITICAL: For FormData, remove any manually set Content-Type
  // Axios MUST set it automatically with the boundary parameter
  // Without the boundary, FastAPI cannot parse multipart/form-data
  if (config.data instanceof FormData) {
    // Delete manually set Content-Type headers (both cases)
    delete (config.headers as any)?.['Content-Type']
    delete (config.headers as any)?.['content-type']
    // Also remove from the config if set in the request options
    if ((config as any).headers?.['Content-Type'] === 'multipart/form-data') {
      delete (config as any).headers['Content-Type']
    }
  }
  
  return config
})

// Handle 401 errors (unauthorized) and retry connection errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Don't redirect on 401 for endpoints that don't require auth
    // Only redirect for actual authentication failures
    if (error.response?.status === 401) {
      const hadToken = localStorage.getItem('auth_token')
      const requestUrl = error.config?.url || ''
      
      // Don't redirect for multimodal endpoints (they don't require auth)
      // Only redirect for endpoints that actually need authentication
      const publicEndpoints = ['/api/multimodal/', '/api/images/', '/api/documents/upload']
      const isPublicEndpoint = publicEndpoints.some(endpoint => requestUrl.includes(endpoint))
      
      if (hadToken && !isPublicEndpoint) {
        // Clear token and redirect to login only for protected endpoints
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
    
    // Retry on connection errors
    const isConnectionError = 
      error.code === 'ECONNREFUSED' || 
      error.code === 'ERR_CONNECTION_REFUSED' ||
      error.message?.includes('ERR_CONNECTION_REFUSED') ||
      error.message?.includes('Network Error') ||
      (!error.response && error.request)
    
    if (isConnectionError && error.config && !error.config._retry) {
      error.config._retry = true
      return retryRequest(error.config)
    }
    
    return Promise.reject(error)
  }
)

// Document APIs
export const uploadDocument = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  // Don't set Content-Type manually - let axios set it with boundary
  // Use longer timeout for file uploads (30 seconds)
  const response = await api.post('/api/documents/upload', formData, {
    timeout: 30000, // 30 seconds for document processing
  })
  return response.data
}

export const getDocuments = async () => {
  const response = await api.get('/api/documents', {
    timeout: 30000, // 30 seconds for document listing
  })
  return response.data
}

export const deleteDocument = async (documentId: string) => {
  const response = await api.delete(`/api/documents/${documentId}`, {
    timeout: 30000, // 30 seconds for document deletion
  })
  return response.data
}

// Q&A APIs
export const askQuestion = async (data: { question: string; document_ids?: string[] }) => {
  const response = await api.post('/api/qa/ask', data)
  return response.data
}


// Health check
export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const response = await api.get('/api/health', { timeout: 2000 })
    return response.status === 200
  } catch {
    return false
  }
}

// Auth APIs
export const register = async (data: { email: string; password: string; full_name?: string }) => {
  const response = await api.post('/api/auth/register', data)
  return response.data
}

export const login = async (data: { email: string; password: string }, retries = 3) => {
  // Try with retry logic for connection errors
  let lastError: any = null
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await api.post('/api/auth/login', data)
      // Store token and user
      if (response.data.access_token) {
        localStorage.setItem('auth_token', response.data.access_token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
      }
      return response.data
    } catch (error: any) {
      lastError = error
      const isConnectionError = 
        error.code === 'ECONNREFUSED' || 
        error.code === 'ERR_CONNECTION_REFUSED' ||
        error.message?.includes('ERR_CONNECTION_REFUSED') ||
        error.message?.includes('Network Error') ||
        (!error.response && error.request)
      
      // If it's a connection error and we have retries left, wait and retry
      if (isConnectionError && attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        continue
      }
      // Otherwise, throw the error
      throw error
    }
  }
  throw lastError
}

export const uploadCollaborationFile = async (file: File, workspaceId: string) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('workspace_id', workspaceId)
  
  const response = await api.post('/api/collaboration/upload-file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000
  })
  
  return response.data
}

export const logout = () => {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user')
}

export const getCurrentUser = async () => {
  const response = await api.get('/api/auth/me')
  return response.data
}

export const isAuthenticated = () => {
  return !!localStorage.getItem('auth_token')
}

export const getStoredUser = () => {
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

// Report Generation APIs
export const generateReport = async (data: {
  document_ids?: string[]
  report_type?: string
  include_visualizations?: boolean
}) => {
  const response = await api.post('/api/reports/generate', data)
  return response.data
}

// Code Review APIs
export const reviewCode = async (data: {
  document_id?: string
  code_text?: string
  language?: string
  review_type?: string
}) => {
  const response = await api.post('/api/code/review', data)
  return response.data
}

export const generateDocumentation = async (data: {
  document_id?: string
  code_text?: string
  language?: string
  doc_type?: string
}) => {
  const response = await api.post('/api/code/documentation', data)
  return response.data
}

// Support Ticket APIs
export const classifyTicket = async (data: {
  ticket_text: string
  use_document_context?: boolean
  document_ids?: string[]
}) => {
  const response = await api.post('/api/tickets/classify', data)
  return response.data
}

export const generateTicketResponse = async (data: {
  ticket_text: string
  category?: string
  priority?: string
  use_document_context?: boolean
  document_ids?: string[]
  response_style?: string
}) => {
  const response = await api.post('/api/tickets/respond', data)
  return response.data
}

export const batchClassifyTickets = async (data: {
  tickets: string[]
  use_document_context?: boolean
}) => {
  const response = await api.post('/api/tickets/batch-classify', data)
  return response.data
}

// Content Generator APIs
export const generateContent = async (data: {
  content_type: string
  topic: string
  tone?: string
  length?: string
  additional_context?: string
}) => {
  const response = await api.post('/api/content/generate', data)
  return response.data
}

// Summarizer APIs
export const summarizeText = async (data: {
  text?: string
  document_id?: string
  summary_type?: string
  max_length?: number
}) => {
  const response = await api.post('/api/summarize', data)
  return response.data
}

// Translator APIs
export const translateText = async (data: {
  text: string
  target_language: string
  source_language?: string
  preserve_formatting?: boolean
}) => {
  const response = await api.post('/api/translate', data)
  return response.data
}

export const batchTranslate = async (data: {
  texts: string[]
  target_language: string
  source_language?: string
}) => {
  const response = await api.post('/api/translate/batch', data)
  return response.data
}

export const getSupportedLanguages = async () => {
  const response = await api.get('/api/translate/languages')
  return response.data
}

// Image API functions
export const analyzeImage = async (file: File, question?: string): Promise<any> => {
  const formData = new FormData()
  formData.append('file', file)
  if (question) {
    formData.append('question', question)
  }
  
  const response = await api.post('/api/images/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const extractTextFromImage = async (file: File): Promise<any> => {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await api.post('/api/images/ocr', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}