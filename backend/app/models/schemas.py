"""
Pydantic models for request/response validation
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class QuestionRequest(BaseModel):
    """Request model for asking questions"""
    question: str = Field(..., description="The question to ask about the documents")
    document_ids: Optional[List[str]] = Field(
        None, 
        description="Optional: Specific document IDs to search. If None, searches all documents."
    )


class SourceCitation(BaseModel):
    """Source citation for an answer"""
    document_id: str
    document_name: str
    chunk_text: str
    similarity_score: float


class QuestionResponse(BaseModel):
    """Response model for Q&A"""
    answer: str = Field(..., description="The generated answer")
    sources: List[SourceCitation] = Field(..., description="Source citations")
    model_used: str = Field(..., description="LLM model used for generation")


class DocumentInfo(BaseModel):
    """Information about an uploaded document"""
    document_id: str
    filename: str
    file_type: str
    upload_date: datetime
    chunk_count: int = Field(..., description="Number of chunks the document was split into")


# Report Generation Schemas
class ReportRequest(BaseModel):
    """Request model for generating reports"""
    document_ids: Optional[List[str]] = Field(None, description="Specific document IDs to analyze. If None, analyzes all documents.")
    report_type: str = Field("comprehensive", description="Type of report: comprehensive, summary, kpi, insights")
    include_visualizations: bool = Field(True, description="Whether to include visualization suggestions")


# Code Review Schemas
class CodeReviewRequest(BaseModel):
    """Request model for code review"""
    document_id: Optional[str] = Field(None, description="ID of the code document to review (if using uploaded file)")
    code_text: Optional[str] = Field(None, description="Raw code text to review (if not using document_id)")
    language: Optional[str] = Field(None, description="Programming language (auto-detected if not provided)")
    review_type: str = Field("comprehensive", description="Type of review: comprehensive, security, performance, style, all")


class DocumentationRequest(BaseModel):
    """Request model for generating documentation"""
    document_id: Optional[str] = Field(None, description="ID of the code document (if using uploaded file)")
    code_text: Optional[str] = Field(None, description="Raw code text (if not using document_id)")
    language: Optional[str] = Field(None, description="Programming language (auto-detected if not provided)")
    doc_type: str = Field("technical", description="Type of documentation: technical, api, readme, inline")


# Support Ticket Schemas
class TicketRequest(BaseModel):
    """Request model for ticket classification"""
    ticket_text: str = Field(..., description="The support ticket text")
    use_document_context: bool = Field(False, description="Whether to use document knowledge base for context")
    document_ids: Optional[List[str]] = Field(None, description="Optional document IDs to use for context")


class TicketResponseRequest(BaseModel):
    """Request model for generating ticket response"""
    ticket_text: str = Field(..., description="The support ticket text")
    category: Optional[str] = Field(None, description="Ticket category (auto-detected if not provided)")
    priority: Optional[str] = Field(None, description="Ticket priority (auto-detected if not provided)")
    use_document_context: bool = Field(True, description="Whether to use document knowledge base")
    document_ids: Optional[List[str]] = Field(None, description="Optional document IDs for context")
    response_style: str = Field("professional", description="Response style: professional, friendly, technical")


class BatchTicketRequest(BaseModel):
    """Request model for batch ticket classification"""
    tickets: List[str] = Field(..., description="List of ticket texts to classify")
    use_document_context: bool = Field(False, description="Whether to use document context")


# Content Generator Schemas
class ContentGeneratorRequest(BaseModel):
    """Request model for content generation"""
    content_type: str = Field(..., description="Type of content: blog_post, email, social_media, product_description, article, marketing_copy")
    topic: str = Field(..., description="Main topic or subject")
    tone: str = Field("professional", description="Tone: professional, friendly, casual, formal, creative")
    length: str = Field("medium", description="Length: short, medium, long")
    additional_context: Optional[str] = Field(None, description="Additional context or requirements")


# Summarizer Schemas
class SummarizerRequest(BaseModel):
    """Request model for text summarization"""
    text: Optional[str] = Field(None, description="Raw text to summarize")
    document_id: Optional[str] = Field(None, description="ID of document to summarize")
    summary_type: str = Field("concise", description="Type: concise, detailed, bullet_points, executive")
    max_length: Optional[int] = Field(None, description="Maximum length in words")


# Translator Schemas
class TranslatorRequest(BaseModel):
    """Request model for translation"""
    text: str = Field(..., description="Text to translate")
    target_language: str = Field(..., description="Target language (e.g., spanish, french, chinese)")
    source_language: Optional[str] = Field(None, description="Source language (auto-detected if not provided)")
    preserve_formatting: bool = Field(True, description="Preserve original formatting")


class BatchTranslatorRequest(BaseModel):
    """Request model for batch translation"""
    texts: List[str] = Field(..., description="List of texts to translate")
    target_language: str = Field(..., description="Target language")
    source_language: Optional[str] = Field(None, description="Source language")