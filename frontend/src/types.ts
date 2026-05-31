export interface DocumentInfo {
  document_id: string
  filename: string
  file_type: string
  upload_date: string
  chunk_count: number
}

export interface QuestionRequest {
  question: string
  document_ids?: string[]
}

export interface SourceCitation {
  document_id: string
  document_name: string
  chunk_text: string
  similarity_score: number
}

export interface QuestionResponse {
  answer: string
  sources: SourceCitation[]
  model_used: string
}

export interface ChatMessage {
  id: string
  question: string
  answer: string
  sources: SourceCitation[]
  timestamp: Date
}

