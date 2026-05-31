"""
Text Summarizer Router
Handles AI-powered text summarization
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.models.schemas import SummarizerRequest
from app.services.summarizer_service import summarizer_service

router = APIRouter(
    prefix="/api/summarize",
    tags=["Summarizer"],
    responses={404: {"description": "Not found"}},
)

@router.post("")
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

