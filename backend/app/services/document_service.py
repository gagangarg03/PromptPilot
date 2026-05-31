"""
Document processing service
Handles document upload, text extraction, chunking, and embedding storage
"""

import os
import uuid
from datetime import datetime
from typing import List, Optional
import io

# Disable ChromaDB telemetry before import
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")
os.environ.setdefault("CHROMA_TELEMETRY_DISABLED", "True")

# Document processing
import PyPDF2
from docx import Document as DocxDocument

# LangChain for chunking
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Vector database
import chromadb

# Embeddings
from langchain_openai import OpenAIEmbeddings
from sentence_transformers import SentenceTransformer

from app.models.schemas import DocumentInfo


class DocumentService:
    """Service for document processing and management"""
    
    def __init__(self):
        # Initialize ChromaDB (new API)
        persist_directory = os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_db")
        self.chroma_client = chromadb.PersistentClient(path=persist_directory)
        
        # Get or create collection
        self.collection = self.chroma_client.get_or_create_collection(
            name="documents",
            metadata={"hnsw:space": "cosine"}
        )
        
        # Initialize embeddings
        use_free = os.getenv("USE_FREE_EMBEDDINGS", "false").lower() == "true"
        if use_free:
            # Free, local embeddings
            self.embeddings_model = SentenceTransformer('all-MiniLM-L6-v2')
            self.use_openai_embeddings = False
        else:
            # OpenAI embeddings (requires API key)
            self.embeddings_model = OpenAIEmbeddings()
            self.use_openai_embeddings = True
        
        # Text splitter for chunking
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
    
    async def process_document(
        self, 
        filename: str, 
        file_content: bytes, 
        file_type: str
    ) -> str:
        """
        Process a document: extract text, chunk, embed, and store
        
        Returns:
            document_id: Unique identifier for the document
        """
        # Generate document ID
        document_id = str(uuid.uuid4())
        
        # Extract text based on file type
        text = self._extract_text(file_content, file_type)
        
        if not text or not text.strip():
            # Check if it's an image file
            if file_type.lower() in ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']:
                raise ValueError(
                    "No text could be extracted from the image. "
                    "This might be because: (1) Tesseract OCR is not installed, "
                    "(2) The image doesn't contain readable text, or "
                    "(3) The image quality is too low. "
                    "For better image analysis, please use the 'Image Q&A' feature instead."
                )
            else:
                raise ValueError("No text could be extracted from the document")
        
        # Split into chunks
        chunks = self.text_splitter.split_text(text)
        
        # Generate embeddings and store
        chunk_ids = []
        chunk_texts = []
        chunk_metadatas = []
        embeddings = []
        
        for i, chunk in enumerate(chunks):
            chunk_id = f"{document_id}_chunk_{i}"
            chunk_ids.append(chunk_id)
            chunk_texts.append(chunk)
            chunk_metadatas.append({
                "document_id": document_id,
                "filename": filename,
                "chunk_index": i,
                "file_type": file_type
            })
            
            # Generate embedding
            if self.use_openai_embeddings:
                embedding = await self.embeddings_model.aembed_query(chunk)
            else:
                embedding = self.embeddings_model.encode(chunk).tolist()
            
            embeddings.append(embedding)
        
        # Store in ChromaDB
        self.collection.add(
            ids=chunk_ids,
            documents=chunk_texts,
            metadatas=chunk_metadatas,
            embeddings=embeddings
        )
        
        return document_id
    
    def _extract_text(self, file_content: bytes, file_type: str) -> str:
        """Extract text from different file types"""
        file_type = file_type.lower()
        
        if file_type == '.pdf':
            return self._extract_from_pdf(file_content)
        elif file_type in ['.docx', '.doc']:
            return self._extract_from_docx(file_content)
        elif file_type == '.txt':
            return file_content.decode('utf-8', errors='ignore')
        elif file_type in ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']:
            # Image files - use OCR
            from app.services.image_service import ImageService
            image_service = ImageService()
            result = image_service.extract_text_from_image(file_content)
            if result.get('success') and result.get('text') and result.get('text').strip():
                return result['text']
            elif result.get('error'):
                # If OCR fails, return empty string (will be handled by caller with better error message)
                return ""
            else:
                # No text extracted (empty or whitespace only)
                return ""
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
    
    def _extract_from_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF"""
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        
        return text
    
    def _extract_from_docx(self, file_content: bytes) -> str:
        """Extract text from DOCX"""
        docx_file = io.BytesIO(file_content)
        doc = DocxDocument(docx_file)
        
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        
        return text
    
    async def list_documents(self) -> List[DocumentInfo]:
        """List all uploaded documents"""
        # Get all unique documents from collection
        results = self.collection.get()
        
        # Group by document_id
        documents_dict = {}
        for i, metadata in enumerate(results['metadatas']):
            doc_id = metadata['document_id']
            if doc_id not in documents_dict:
                documents_dict[doc_id] = {
                    'document_id': doc_id,
                    'filename': metadata['filename'],
                    'file_type': metadata['file_type'],
                    'chunk_count': 0
                }
            documents_dict[doc_id]['chunk_count'] += 1
        
        # Convert to DocumentInfo list
        documents = []
        for doc_data in documents_dict.values():
            documents.append(DocumentInfo(
                document_id=doc_data['document_id'],
                filename=doc_data['filename'],
                file_type=doc_data['file_type'],
                upload_date=datetime.now(),  # ChromaDB doesn't store dates, using current
                chunk_count=doc_data['chunk_count']
            ))
        
        return documents
    
    async def delete_document(self, document_id: str) -> bool:
        """Delete a document and all its chunks"""
        # Get all chunks for this document
        results = self.collection.get(
            where={"document_id": document_id}
        )
        
        if not results['ids']:
            return False
        
        # Delete all chunks
        self.collection.delete(ids=results['ids'])
        
        return True
    
    def get_embeddings_model(self):
        """Get the embeddings model for use in Q&A service"""
        return self.embeddings_model, self.use_openai_embeddings

