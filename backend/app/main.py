"""
Prompt Pilot - FastAPI Backend
Main application entry point
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, status, Request, WebSocket, WebSocketDisconnect, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from typing import List, Optional, Dict
import os
import uuid
import asyncio
import json
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

# Disable ChromaDB telemetry to prevent error messages (must be set before ChromaDB import)
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["CHROMA_TELEMETRY_DISABLED"] = "True"

from app.services.document_service import DocumentService
from app.services.qa_service import QAService
from app.services.analytics_service import AnalyticsService
from app.services.auth_service import AuthService
from app.services.report_service import ReportService
from app.services.code_reviewer_service import CodeReviewerService
from app.services.ticket_classifier_service import TicketClassifierService
from app.services.content_generator_service import ContentGeneratorService
from app.services.summarizer_service import SummarizerService
from app.services.translator_service import TranslatorService
from app.models.schemas import (
    QuestionRequest, QuestionResponse, DocumentInfo,
    ReportRequest, CodeReviewRequest, DocumentationRequest,
    TicketRequest, TicketResponseRequest, BatchTicketRequest,
    ContentGeneratorRequest, SummarizerRequest, TranslatorRequest, BatchTranslatorRequest
)
from app.models.user_schemas import UserCreate, UserLogin, UserResponse, Token
from fastapi.security import HTTPBearer
from datetime import timedelta

# Initialize FastAPI app
app = FastAPI(
    title="Prompt Pilot API",
    description="Comprehensive AI-powered platform with RAG, Content Generation, Code Review, Translation, Summarization, and more",
    version="2.0.0",
    openapi_tags=[
        {
            "name": "Documents",
            "description": "Document management operations (upload, list, delete)"
        },
        {
            "name": "Q&A",
            "description": "Question-answering using RAG (Retrieval-Augmented Generation)"
        },
        {
            "name": "Authentication",
            "description": "User registration, login, and token management"
        },
        {
            "name": "Reports",
            "description": "AI-powered report generation from documents"
        },
        {
            "name": "Code Review",
            "description": "AI-powered code review and documentation generation"
        },
        {
            "name": "Support Tickets",
            "description": "AI-powered ticket classification and response generation"
        },
        {
            "name": "Content Generation",
            "description": "AI-powered content generation (blog posts, emails, social media, etc.)"
        },
        {
            "name": "Summarizer",
            "description": "AI-powered text summarization"
        },
        {
            "name": "Translator",
            "description": "AI-powered text translation between multiple languages"
        },
        {
            "name": "Images",
            "description": "Image upload, OCR text extraction, and image Q&A"
        },
        {
            "name": "Multimodal",
            "description": "Audio and video processing, transcription, and analysis"
        },
        {
            "name": "Collaboration",
            "description": "Real-time collaboration and shared workspaces"
        }
    ]
)

# Add middleware BEFORE any other setup to ensure it wraps everything
# This must be done immediately after app creation

# Custom middleware to ensure CORS headers on ALL responses
# In FastAPI, middleware runs in REVERSE order (last added = runs first/outermost)
# So this middleware wraps everything and runs first
class CORSHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Handle preflight OPTIONS requests
        if request.method == "OPTIONS":
            return JSONResponse(
                content={},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Max-Age": "3600",
                }
            )
        
        try:
            response = await call_next(request)
        except Exception as e:
            # Catch ANY exception and return with CORS headers
            error_msg = str(e)
            response = JSONResponse(
                status_code=500,
                content={"detail": f"Internal server error: {error_msg}"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        # ALWAYS add CORS headers to response
        if hasattr(response, 'headers'):
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "*"
        return response

# IMPORTANT: Middleware order matters!
# In FastAPI/Starlette, middleware runs in REVERSE order (last added = first executed)
# So we add our custom middleware LAST to ensure it runs FIRST (outermost layer)

# Standard CORS middleware (runs second/innermost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],  # Vite default ports
    allow_credentials=False,  # Set to False when using wildcard origins
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Custom CORS middleware (runs FIRST/outermost - added LAST)
# This wraps everything and ensures CORS headers on ALL responses
app.add_middleware(CORSHeaderMiddleware)

# Global exception handlers - MUST be registered before routes
# Note: These handlers ensure CORS headers are always present
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    print(f"[ERROR] HTTPException: {exc.status_code} - {exc.detail}")
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
        }
    )
    return response


@app.exception_handler(StarletteHTTPException)
async def starlette_exception_handler(request: Request, exc: StarletteHTTPException):
    print(f"[ERROR] StarletteHTTPException in {request.url.path}: {exc.status_code} - {exc.detail}")
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
        }
    )
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"[ERROR] RequestValidationError in {request.url.path}: {exc.errors()}")
    response = JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
        }
    )
    return response


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    error_msg = str(exc)
    print(f"[ERROR] Unhandled exception in {request.url.path}: {error_msg}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {error_msg}"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Security
security = HTTPBearer()

# Initialize services (will be recreated on startup)
document_service = None
qa_service = None
analytics_service = None
auth_service = None
report_service = None
code_reviewer_service = None
ticket_classifier_service = None
content_generator_service = None
summarizer_service = None
translator_service = None
image_service = None
multimodal_service = None

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup to ensure fresh instances"""
    global document_service, qa_service, analytics_service, auth_service
    global report_service, code_reviewer_service, ticket_classifier_service
    global content_generator_service, summarizer_service, translator_service
    global image_service, multimodal_service
    
    document_service = DocumentService()
    qa_service = QAService()
    analytics_service = AnalyticsService()
    auth_service = AuthService()
    report_service = ReportService()
    code_reviewer_service = CodeReviewerService()
    ticket_classifier_service = TicketClassifierService()
    content_generator_service = ContentGeneratorService()
    summarizer_service = SummarizerService()
    translator_service = TranslatorService()
    
    # Initialize image and multimodal services
    from app.services.image_service import ImageService
    from app.services.multimodal_service import MultimodalService
    image_service = ImageService()
    multimodal_service = MultimodalService()
    
    print(f"[STARTUP] QAService initialized with model: {qa_service.model_name}")
    if hasattr(qa_service.llm, 'model'):
        print(f"[STARTUP] LLM model attribute: {qa_service.llm.model}")
    print(f"[STARTUP] AuthService initialized")
    print(f"[STARTUP] ReportService initialized")
    print(f"[STARTUP] CodeReviewerService initialized")
    print(f"[STARTUP] TicketClassifierService initialized")
    print(f"[STARTUP] ContentGeneratorService initialized")
    print(f"[STARTUP] SummarizerService initialized")
    print(f"[STARTUP] TranslatorService initialized")
    print(f"[STARTUP] ImageService initialized")
    print(f"[STARTUP] MultimodalService initialized (Whisper available: {multimodal_service.whisper_available})")


@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    """Handle CORS preflight requests"""
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "3600",
        }
    )


@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint"""
    return {
        "message": "Prompt Pilot API is running",
        "version": "2.0.0",
        "endpoints": {
            "docs": "/docs",
            "health": "/api/health"
        }
    }


@app.post("/api/documents/upload", tags=["Documents"])
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and process a document
    
    Supported formats: PDF, DOCX, TXT, PNG, JPG, JPEG, GIF, BMP, WEBP
    """
    try:
        # Validate file type
        allowed_extensions = {'.pdf', '.docx', '.txt', '.doc', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Validate images separately
        if file_ext in ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']:
            from app.services.image_service import ImageService
            image_service = ImageService()
            contents = await file.read()
            is_valid, error_msg = image_service.validate_image(contents, file.filename)
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)
            # Reset file pointer
            await file.seek(0)
        
        # Read file content
        contents = await file.read()
        
        # Process document
        if document_service is None:
            raise HTTPException(status_code=503, detail="Service not initialized. Please restart the server.")
        
        document_id = await document_service.process_document(
            filename=file.filename,
            file_content=contents,
            file_type=file_ext
        )
        
        # Track document upload in analytics
        if analytics_service:
            # Get chunk count from document service
            documents = await document_service.list_documents()
            doc_info = next((d for d in documents if d.document_id == document_id), None)
            if doc_info:
                analytics_service.track_document_upload(
                    document_id=document_id,
                    filename=file.filename,
                    chunk_count=doc_info.chunk_count
                )
        
        return {
            "success": True,
            "message": "Document processed successfully",
            "document_id": document_id,
            "filename": file.filename
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")


@app.get("/api/documents", response_model=List[DocumentInfo], tags=["Documents"])
async def list_documents():
    """Get list of all uploaded documents"""
    try:
        if document_service is None:
            raise HTTPException(status_code=503, detail="Service not initialized. Please restart the server.")
        documents = await document_service.list_documents()
        return documents
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing documents: {str(e)}")


@app.delete("/api/documents/{document_id}", tags=["Documents"])
async def delete_document(document_id: str):
    """Delete a document and its embeddings"""
    try:
        if document_service is None:
            raise HTTPException(status_code=503, detail="Service not initialized. Please restart the server.")
        success = await document_service.delete_document(document_id)
        if success:
            return {"success": True, "message": "Document deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")


@app.post("/api/qa/ask", response_model=QuestionResponse, tags=["Q&A"])
async def ask_question(request: QuestionRequest):
    """
    Ask a question about uploaded documents using RAG
    
    The system will:
    1. Find relevant document chunks
    2. Use LLM to generate answer based on context
    3. Return answer with source citations
    """
    try:
        if qa_service is None:
            raise HTTPException(status_code=503, detail="Service not initialized. Please restart the server.")
        
        if not request.question or not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")
        
        # Process question with RAG
        import time
        start_time = time.time()
        
        response = await qa_service.ask_question(
            question=request.question,
            document_ids=request.document_ids  # Optional: filter by specific documents
        )
        
        response_time = time.time() - start_time
        
        # Track question in analytics
        if analytics_service:
            analytics_service.track_question(
                question=request.question,
                answer=response.answer,
                response_time=response_time,
                document_ids=request.document_ids,
                sources_count=len(response.sources)
            )
            
            # Track document access
            if request.document_ids:
                for doc_id in request.document_ids:
                    analytics_service.track_document_access(doc_id)
        
        return response
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check for services"""
    return {
        "status": "healthy",
        "services": {
            "document_service": "operational" if document_service else "not initialized",
            "qa_service": "operational" if qa_service else "not initialized",
        },
        "llm_model": qa_service.model_name if qa_service else "unknown"
    }




# Authentication endpoints
@app.post("/api/auth/register", tags=["Authentication"])
async def register(user_data: UserCreate):
    """Register a new user"""
    try:
        if auth_service is None:
            return JSONResponse(
                status_code=503,
                content={"detail": "Auth service not initialized"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        user = auth_service.create_user(user_data)
        
        # Return as JSONResponse to ensure CORS headers
        return JSONResponse(
            status_code=200,
            content={
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": user.created_at.isoformat(),
                "is_active": user.is_active
            },
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except HTTPException as e:
        print(f"[ERROR] HTTPException in register: {e.detail}")
        return JSONResponse(
            status_code=e.status_code,
            content={"detail": e.detail},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        error_msg = str(e)
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error creating user: {error_msg}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


@app.post("/api/auth/login", tags=["Authentication"])
async def login(credentials: UserLogin):
    """Login and get access token"""
    try:
        if auth_service is None:
            return JSONResponse(
                status_code=503,
                content={"detail": "Auth service not initialized"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        user = auth_service.authenticate_user(credentials.email, credentials.password)
        if not user:
            return JSONResponse(
                status_code=401,
                content={"detail": "Incorrect email or password"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                    "WWW-Authenticate": "Bearer",
                }
            )
        
        access_token = auth_service.create_access_token(
            data={"sub": user.email},
            expires_delta=timedelta(minutes=30 * 24 * 60)  # 30 days
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "access_token": access_token,
                "token_type": "bearer",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "created_at": user.created_at.isoformat(),
                    "is_active": user.is_active
                }
            },
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        error_msg = str(e)
        print(f"[ERROR] Login error: {error_msg}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error during login: {error_msg}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


@app.get("/api/auth/me", tags=["Authentication"])
async def get_current_user(request: Request):
    """Get current authenticated user"""
    try:
        if auth_service is None:
            return JSONResponse(
                status_code=503,
                content={"detail": "Auth service not initialized"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        # Extract token from Authorization header manually
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Authorization header missing"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                    "WWW-Authenticate": "Bearer",
                }
            )
        
        # Extract token from "Bearer <token>" format
        try:
            scheme, token = auth_header.split()
            if scheme.lower() != "bearer":
                raise ValueError("Invalid scheme")
        except ValueError:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid authorization header format"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                    "WWW-Authenticate": "Bearer",
                }
            )
        
        email = auth_service.verify_token(token)
        if email is None:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid authentication credentials"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                    "WWW-Authenticate": "Bearer",
                }
            )
        
        user = auth_service.get_user_by_email(email)
        if user is None:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "User not found"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                    "WWW-Authenticate": "Bearer",
                }
            )
        
        return JSONResponse(
            status_code=200,
            content={
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": user.created_at.isoformat(),
                "is_active": user.is_active
            },
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        error_msg = str(e)
        print(f"[ERROR] Error in get_current_user: {error_msg}")
        return JSONResponse(
            status_code=401,
            content={"detail": "Authentication required"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
                "WWW-Authenticate": "Bearer",
            }
        )


# ==================== NEW AI FEATURES ====================

# Report Generation Endpoints
@app.post("/api/reports/generate", tags=["Reports"])
async def generate_report(request: ReportRequest):
    """Generate AI-powered report from documents"""
    try:
        if report_service is None:
            return JSONResponse(
                status_code=503,
                content={"detail": "Report service not initialized"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        report = await report_service.generate_report(
            document_ids=request.document_ids,
            report_type=request.report_type,
            include_visualizations=request.include_visualizations
        )
        
        return JSONResponse(
            status_code=200,
            content=report,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        print(f"[ERROR] Report generation error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error generating report: {str(e)}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


# Code Review Endpoints
@app.post("/api/code/review", tags=["Code Review"])
async def review_code(request: CodeReviewRequest):
    """Review code and provide feedback"""
    try:
        if code_reviewer_service is None:
            return JSONResponse(
                status_code=503,
                content={"detail": "Code reviewer service not initialized"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        if not request.document_id and not request.code_text:
            return JSONResponse(
                status_code=400,
                content={"detail": "Either document_id or code_text must be provided"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        review = await code_reviewer_service.review_code(
            document_id=request.document_id,
            code_text=request.code_text,
            language=request.language,
            review_type=request.review_type
        )
        
        return JSONResponse(
            status_code=200,
            content=review,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        print(f"[ERROR] Code review error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error reviewing code: {str(e)}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


@app.post("/api/code/documentation", tags=["Code Review"])
async def generate_documentation(request: DocumentationRequest):
    """Generate technical documentation from code"""
    try:
        if code_reviewer_service is None:
            return JSONResponse(
                status_code=503,
                content={"detail": "Code reviewer service not initialized"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        if not request.document_id and not request.code_text:
            return JSONResponse(
                status_code=400,
                content={"detail": "Either document_id or code_text must be provided"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        documentation = await code_reviewer_service.generate_documentation(
            document_id=request.document_id,
            code_text=request.code_text,
            language=request.language,
            doc_type=request.doc_type
        )
        
        return JSONResponse(
            status_code=200,
            content=documentation,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        print(f"[ERROR] Documentation generation error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error generating documentation: {str(e)}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


# Support Ticket Classification Endpoints
@app.post("/api/tickets/classify", tags=["Support Tickets"])
async def classify_ticket(request: TicketRequest):
    """Classify a support ticket"""
    try:
        if ticket_classifier_service is None:
            return JSONResponse(
                status_code=503,
                content={"detail": "Ticket classifier service not initialized"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        classification = await ticket_classifier_service.classify_ticket(
            ticket_text=request.ticket_text,
            use_document_context=request.use_document_context,
            document_ids=request.document_ids
        )
        
        return JSONResponse(
            status_code=200,
            content=classification,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        print(f"[ERROR] Ticket classification error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error classifying ticket: {str(e)}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


@app.post("/api/tickets/respond", tags=["Support Tickets"])
async def generate_ticket_response(request: TicketResponseRequest):
    """Generate automated response to support ticket"""
    try:
        if ticket_classifier_service is None:
            return JSONResponse(
                status_code=503,
                content={"detail": "Ticket classifier service not initialized"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        response = await ticket_classifier_service.generate_response(
            ticket_text=request.ticket_text,
            category=request.category,
            priority=request.priority,
            use_document_context=request.use_document_context,
            document_ids=request.document_ids,
            response_style=request.response_style
        )
        
        return JSONResponse(
            status_code=200,
            content=response,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        print(f"[ERROR] Ticket response generation error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error generating response: {str(e)}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


@app.post("/api/tickets/batch-classify", tags=["Support Tickets"])
async def batch_classify_tickets(request: BatchTicketRequest):
    """Classify multiple tickets at once"""
    try:
        if ticket_classifier_service is None:
            return JSONResponse(
                status_code=503,
                content={"detail": "Ticket classifier service not initialized"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        results = await ticket_classifier_service.batch_classify(
            tickets=request.tickets,
            use_document_context=request.use_document_context
        )
        
        return JSONResponse(
            status_code=200,
            content=results,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        print(f"[ERROR] Batch ticket classification error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error classifying tickets: {str(e)}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


# Content Generator Endpoints
@app.post("/api/content/generate", tags=["Content Generation"])
async def generate_content(request: ContentGeneratorRequest):
    """Generate AI-powered content"""
    try:
        if content_generator_service is None:
            return JSONResponse(
                status_code=503,
                content={"detail": "Content generator service not initialized"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        result = await content_generator_service.generate_content(
            content_type=request.content_type,
            topic=request.topic,
            tone=request.tone,
            length=request.length,
            additional_context=request.additional_context
        )
        
        return JSONResponse(
            status_code=200,
            content=result,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        print(f"[ERROR] Content generation error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error generating content: {str(e)}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


# Summarizer Endpoints
@app.post("/api/summarize", tags=["Summarizer"])
async def summarize_text(request: SummarizerRequest):
    """Summarize text or document"""
    try:
        if summarizer_service is None:
            return JSONResponse(
                status_code=503,
                content={"detail": "Summarizer service not initialized"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        result = await summarizer_service.summarize(
            text=request.text,
            document_id=request.document_id,
            summary_type=request.summary_type,
            max_length=request.max_length
        )
        
        return JSONResponse(
            status_code=200,
            content=result,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        print(f"[ERROR] Summarization error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error summarizing: {str(e)}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


# Translator Endpoints
@app.post("/api/translate", tags=["Translator"])
async def translate_text(request: TranslatorRequest):
    """Translate text to target language"""
    try:
        if translator_service is None:
            return JSONResponse(
                status_code=503,
                content={"detail": "Translator service not initialized"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        result = await translator_service.translate(
            text=request.text,
            target_language=request.target_language,
            source_language=request.source_language,
            preserve_formatting=request.preserve_formatting
        )
        
        return JSONResponse(
            status_code=200,
            content=result,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        print(f"[ERROR] Translation error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error translating: {str(e)}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


@app.post("/api/translate/batch", tags=["Translator"])
async def batch_translate(request: BatchTranslatorRequest):
    """Translate multiple texts at once"""
    try:
        if translator_service is None:
            return JSONResponse(
                status_code=503,
                content={"detail": "Translator service not initialized"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        result = await translator_service.batch_translate(
            texts=request.texts,
            target_language=request.target_language,
            source_language=request.source_language
        )
        
        return JSONResponse(
            status_code=200,
            content=result,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        print(f"[ERROR] Batch translation error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error translating: {str(e)}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


@app.get("/api/translate/languages", tags=["Translator"])
async def get_supported_languages():
    """Get list of supported languages"""
    try:
        if translator_service is None:
            return JSONResponse(
                status_code=503,
                content={"detail": "Translator service not initialized"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        languages = translator_service.get_supported_languages()
        
        return JSONResponse(
            status_code=200,
            content={"languages": languages},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error getting languages: {str(e)}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


# Image endpoints
@app.post("/api/images/analyze", tags=["Images"])
async def analyze_image(
    question: Optional[str] = None,
    file: UploadFile = File(...)
):
    """
    Analyze an image or answer questions about it using vision AI
    
    Supports: PNG, JPG, JPEG, GIF, BMP, WEBP
    """
    try:
        from app.services.image_service import ImageService
        image_service = ImageService()
        
        # Read file content
        contents = await file.read()
        
        # Validate image
        is_valid, error_msg = image_service.validate_image(contents, file.filename)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Analyze image
        result = await image_service.analyze_image(contents, question)
        
        if result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "answer": result.get("answer", ""),
                "model": result.get("model", "unknown"),
                "filename": file.filename
            },
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error analyzing image: {str(e)}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


@app.post("/api/images/ocr", tags=["Images"])
async def extract_text_from_image(file: UploadFile = File(...)):
    """
    Extract text from image using OCR
    
    Supports: PNG, JPG, JPEG, GIF, BMP, WEBP
    """
    try:
        from app.services.image_service import ImageService
        image_service = ImageService()
        
        # Read file content
        contents = await file.read()
        
        # Validate image
        is_valid, error_msg = image_service.validate_image(contents, file.filename)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Extract text
        result = image_service.extract_text_from_image(contents)
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "OCR failed"))
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "text": result.get("text", ""),
                "image_info": result.get("image_info", {})
            },
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error extracting text: {str(e)}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


# Multi-modal endpoints
@app.post("/api/multimodal/transcribe", tags=["Multimodal"])
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribe audio to text using Whisper
    
    Supports: MP3, WAV, M4A, OGG, FLAC, AAC
    """
    try:
        if multimodal_service is None:
            raise HTTPException(status_code=500, detail="MultimodalService not initialized. Please restart the server.")
        
        contents = await file.read()
        is_valid, error_msg = multimodal_service.validate_audio(contents, file.filename)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        result = await multimodal_service.transcribe_audio(contents, file.filename)
        
        if not result.get("success"):
            error_msg = result.get("error", "Transcription failed")
            # Provide more helpful error messages
            if "Whisper not available" in error_msg:
                raise HTTPException(
                    status_code=503, 
                    detail="Whisper is not available. Please install: pip install openai-whisper. Also ensure FFmpeg is installed on your system."
                )
            elif "FFmpeg" in error_msg or "ffmpeg" in error_msg:
                raise HTTPException(
                    status_code=503,
                    detail="FFmpeg is required for audio transcription. Please install FFmpeg and restart the server."
                )
            else:
                raise HTTPException(status_code=500, detail=error_msg)
        
        return JSONResponse(
            status_code=200,
            content=result,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = str(e)
        print(f"[ERROR] Transcription endpoint error: {error_detail}")
        print(f"[ERROR] Full traceback: {traceback.format_exc()}")
        
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error transcribing audio: {error_detail}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


@app.post("/api/multimodal/analyze-video", tags=["Multimodal"])
async def analyze_video(
    file: UploadFile = File(...),
    question: str = Form("")
):
    """
    Comprehensive video analysis: extract audio, transcribe, extract frames, analyze
    
    Supports: MP4, AVI, MOV, MKV, WEBM, FLV
    """
    try:
        if multimodal_service is None:
            raise HTTPException(status_code=500, detail="MultimodalService not initialized. Please restart the server.")
        
        contents = await file.read()
        is_valid, error_msg = multimodal_service.validate_video(contents, file.filename)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Use None if question is empty string
        question_value = question if question and question.strip() else None
        result = await multimodal_service.analyze_video(contents, file.filename, question_value)
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Video analysis failed"))
        
        return JSONResponse(
            status_code=200,
            content=result,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = str(e)
        traceback_str = traceback.format_exc()
        print(f"[ERROR] Video analysis endpoint error: {error_detail}")
        print(f"[ERROR] Full traceback:\n{traceback_str}")
        
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error analyzing video: {error_detail}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


# WebSocket for real-time collaboration
class ConnectionManager:
    """Manages WebSocket connections for real-time collaboration"""
    
    def __init__(self):
        # workspace_id -> list of connections
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # user_id -> workspace_id
        self.user_workspaces: Dict[str, str] = {}
        # user_id -> user_name
        self.user_names: Dict[str, str] = {}
        # websocket -> user_id (for reverse lookup)
        self.websocket_users: Dict[WebSocket, str] = {}
        # message_id -> message data (for reactions, read receipts, etc.)
        self.messages: Dict[str, dict] = {}
        # message_id -> set of user_ids who read it
        self.read_receipts: Dict[str, set] = {}
        # message_id -> dict of emoji -> list of user_ids
        self.reactions: Dict[str, Dict[str, List[str]]] = {}
    
    async def connect(self, websocket: WebSocket, workspace_id: str, user_id: str, user_name: str = None):
        await websocket.accept()
        
        if workspace_id not in self.active_connections:
            self.active_connections[workspace_id] = []
        
        self.active_connections[workspace_id].append(websocket)
        self.user_workspaces[user_id] = workspace_id
        self.user_names[user_id] = user_name or user_id
        self.websocket_users[websocket] = user_id
        
        # Get list of existing users in workspace with their names
        existing_users = []
        existing_user_names = {}
        for conn in self.active_connections[workspace_id]:
            if conn != websocket and conn in self.websocket_users:
                existing_user_id = self.websocket_users[conn]
                existing_users.append(existing_user_id)
                existing_user_names[existing_user_id] = self.user_names.get(existing_user_id, existing_user_id)
        
        # Send welcome message with existing users list and their names
        await self.send_personal_message({
            "type": "connected",
            "workspace_id": workspace_id,
            "user_id": user_id,
            "user_name": self.user_names.get(user_id, user_id),
            "users": existing_users,
            "user_names": existing_user_names
        }, websocket)
        
        # Notify others in workspace about new user (always include user_name from stored dict)
        await self.broadcast_to_workspace(workspace_id, {
            "type": "user_joined",
            "user_id": user_id,
            "user_name": self.user_names.get(user_id, user_id),
            "workspace_id": workspace_id
        }, exclude=websocket)
    
    def disconnect(self, websocket: WebSocket, user_id: str = None):
        # If user_id not provided, find it from websocket
        if not user_id:
            user_id = self.websocket_users.get(websocket)
        
        if not user_id:
            return
            
        workspace_id = self.user_workspaces.get(user_id)
        if workspace_id and workspace_id in self.active_connections:
            if websocket in self.active_connections[workspace_id]:
                self.active_connections[workspace_id].remove(websocket)
            
            # Notify others
            if workspace_id in self.active_connections:
                asyncio.create_task(self.broadcast_to_workspace(workspace_id, {
                    "type": "user_left",
                    "user_id": user_id,
                    "user_name": self.user_names.get(user_id, user_id),
                    "workspace_id": workspace_id
                }))
            
            if not self.active_connections[workspace_id]:
                del self.active_connections[workspace_id]
        
        if user_id in self.user_workspaces:
            del self.user_workspaces[user_id]
        if user_id in self.user_names:
            del self.user_names[user_id]
        if websocket in self.websocket_users:
            del self.websocket_users[websocket]
    
    async def broadcast_to_workspace(self, workspace_id: str, message: dict, exclude: WebSocket = None):
        if workspace_id not in self.active_connections:
            return
        
        disconnected = []
        for connection in self.active_connections[workspace_id]:
            if connection == exclude:
                continue
            try:
                await connection.send_json(message)
            except:
                disconnected.append(connection)
        
        # Remove disconnected connections
        for conn in disconnected:
            if conn in self.active_connections[workspace_id]:
                self.active_connections[workspace_id].remove(conn)
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except:
            pass


manager = ConnectionManager()


@app.websocket("/ws/collaborate/{workspace_id}")
async def websocket_endpoint(websocket: WebSocket, workspace_id: str):
    """
    WebSocket endpoint for real-time collaboration
    
    Message format:
    {
        "type": "update" | "message" | "cursor" | "typing",
        "user_id": "user123",
        "user_name": "John Doe",
        "content": "...",
        "data": {...}
    }
    """
    user_id = None
    
    try:
        # Get user_id and user_name from query params
        query_params = dict(websocket.query_params)
        user_id = query_params.get("user_id", f"user_{uuid.uuid4().hex[:8]}")
        user_name = query_params.get("user_name", user_id)
        
        # Validate workspace_id - prevent user IDs from being used as workspace names
        if workspace_id.startswith("user_") or len(workspace_id) > 30:
            await websocket.close(code=1008, reason="Invalid workspace ID")
            return
        
        await manager.connect(websocket, workspace_id, user_id, user_name)
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            message_type = message.get("type")
            user_name_from_msg = message.get("user_name") or manager.user_names.get(user_id, user_id)
            
            if message_type == "update":
                # Broadcast document/content updates
                await manager.broadcast_to_workspace(workspace_id, {
                    "type": "update",
                    "user_id": user_id,
                    "user_name": user_name_from_msg,
                    "data": message.get("data", {}),
                    "timestamp": message.get("timestamp")
                }, exclude=websocket)
            
            elif message_type == "message":
                # Generate message ID if not provided
                message_id = message.get("message_id") or f"{user_id}_{message.get('timestamp', int(asyncio.get_event_loop().time() * 1000))}"
                
                # Store message data
                message_data = {
                    "message_id": message_id,
                    "user_id": user_id,
                    "user_name": user_name_from_msg,
                    "content": message.get("content", ""),
                    "file_url": message.get("file_url"),
                    "file_name": message.get("file_name"),
                    "file_type": message.get("file_type"),
                    "is_image": message.get("is_image", False),
                    "timestamp": message.get("timestamp"),
                    "edited": False,
                    "deleted": False
                }
                manager.messages[message_id] = message_data
                
                # Broadcast chat messages to ALL users in workspace (including sender)
                await manager.broadcast_to_workspace(workspace_id, {
                    "type": "message",
                    "message_id": message_id,
                    "user_id": user_id,
                    "user_name": user_name_from_msg,
                    "content": message.get("content", ""),
                    "file_url": message.get("file_url"),
                    "file_name": message.get("file_name"),
                    "file_type": message.get("file_type"),
                    "is_image": message.get("is_image", False),
                    "timestamp": message.get("timestamp")
                })
            
            elif message_type == "edit_message":
                message_id = message.get("message_id")
                if message_id and message_id in manager.messages:
                    # Update message
                    manager.messages[message_id]["content"] = message.get("content", "")
                    manager.messages[message_id]["edited"] = True
                    manager.messages[message_id]["edited_at"] = message.get("timestamp")
                    
                    # Broadcast edit to all users
                    await manager.broadcast_to_workspace(workspace_id, {
                        "type": "message_edited",
                        "message_id": message_id,
                        "content": message.get("content", ""),
                        "edited_at": message.get("timestamp"),
                        "user_id": user_id
                    })
            
            elif message_type == "delete_message":
                message_id = message.get("message_id")
                if message_id and message_id in manager.messages:
                    # Only allow deletion by message owner
                    if manager.messages[message_id]["user_id"] == user_id:
                        manager.messages[message_id]["deleted"] = True
                        
                        # Broadcast deletion to all users
                        await manager.broadcast_to_workspace(workspace_id, {
                            "type": "message_deleted",
                            "message_id": message_id,
                            "user_id": user_id
                        })
            
            elif message_type == "react_to_message":
                message_id = message.get("message_id")
                emoji = message.get("emoji")
                if message_id and emoji:
                    # Ensure emoji is a string and properly encoded
                    emoji_str = str(emoji).strip()
                    
                    if message_id not in manager.reactions:
                        manager.reactions[message_id] = {}
                    if emoji_str not in manager.reactions[message_id]:
                        manager.reactions[message_id][emoji_str] = []
                    
                    # Toggle reaction (add if not present, remove if present)
                    if user_id in manager.reactions[message_id][emoji_str]:
                        manager.reactions[message_id][emoji_str].remove(user_id)
                    else:
                        manager.reactions[message_id][emoji_str].append(user_id)
                    
                    # Remove empty emoji lists
                    if not manager.reactions[message_id][emoji_str]:
                        del manager.reactions[message_id][emoji_str]
                    if not manager.reactions[message_id]:
                        del manager.reactions[message_id]
                    
                    # Broadcast reaction update
                    # Ensure emoji is properly encoded as string
                    reactions_dict = manager.reactions.get(message_id, {})
                    # Convert any non-string keys to strings to ensure proper JSON encoding
                    reactions_dict_clean = {}
                    for emoji_key, user_list in reactions_dict.items():
                        # Ensure emoji is a string and user_list is a list
                        emoji_key_str = str(emoji_key).strip()
                        if emoji_key_str:  # Only add non-empty emoji keys
                            reactions_dict_clean[emoji_key_str] = list(user_list) if isinstance(user_list, list) else []
                    
                    await manager.broadcast_to_workspace(workspace_id, {
                        "type": "message_reacted",
                        "message_id": message_id,
                        "emoji": emoji_str,  # Use cleaned emoji string
                        "user_id": user_id,
                        "user_name": user_name_from_msg,
                        "reactions": reactions_dict_clean
                    })
            
            elif message_type == "mark_read":
                message_id = message.get("message_id")
                if message_id:
                    if message_id not in manager.read_receipts:
                        manager.read_receipts[message_id] = set()
                    manager.read_receipts[message_id].add(user_id)
                    
                    # Broadcast read receipt (optional - can be sent only to sender)
                    await manager.broadcast_to_workspace(workspace_id, {
                        "type": "message_read",
                        "message_id": message_id,
                        "user_id": user_id,
                        "read_by": list(manager.read_receipts[message_id])
                    })
            
            elif message_type == "typing":
                # Broadcast typing indicator to others (not sender)
                await manager.broadcast_to_workspace(workspace_id, {
                    "type": "typing",
                    "user_id": user_id,
                    "user_name": user_name_from_msg,
                    "timestamp": message.get("timestamp")
                }, exclude=websocket)
            
            elif message_type == "cursor":
                # Broadcast cursor position
                await manager.broadcast_to_workspace(workspace_id, {
                    "type": "cursor",
                    "user_id": user_id,
                    "user_name": user_name_from_msg,
                    "position": message.get("position", {}),
                    "timestamp": message.get("timestamp")
                }, exclude=websocket)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        print(f"[ERROR] WebSocket error: {str(e)}")
        manager.disconnect(websocket, user_id)


@app.get("/api/collaboration/workspaces", tags=["Collaboration"])
async def list_workspaces():
    """List all active workspaces"""
    return JSONResponse(
        status_code=200,
        content={
            "workspaces": list(manager.active_connections.keys()),
            "total_users": sum(len(conns) for conns in manager.active_connections.values())
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
        }
    )


@app.post("/api/collaboration/upload-file", tags=["Collaboration"])
async def upload_collaboration_file(
    file: UploadFile = File(...),
    workspace_id: str = Form(...)
):
    """Upload a file for collaboration workspace"""
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = os.path.join("uploads", "collaboration", workspace_id)
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        file_ext = os.path.splitext(file.filename)[1]
        file_id = str(uuid.uuid4())
        file_path = os.path.join(upload_dir, f"{file_id}{file_ext}")
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Determine if it's an image
        is_image = file.content_type and file.content_type.startswith("image/")
        
        # Return file URL (relative path)
        file_url = f"/api/collaboration/files/{workspace_id}/{file_id}{file_ext}"
        
        return JSONResponse(
            status_code=200,
            content={
                "file_url": file_url,
                "file_name": file.filename,
                "file_type": file.content_type or "application/octet-stream",
                "file_size": len(content),
                "is_image": is_image,
                "file_id": file_id
            },
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {str(e)}"
        )


@app.get("/api/collaboration/files/{workspace_id}/{filename:path}", tags=["Collaboration"])
async def get_collaboration_file(workspace_id: str, filename: str):
    """Serve uploaded collaboration files"""
    try:
        file_path = os.path.join("uploads", "collaboration", workspace_id, filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to serve file: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
