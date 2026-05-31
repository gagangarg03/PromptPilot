"""
Code Review Router
Handles AI-powered code review and documentation generation
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.models.schemas import CodeReviewRequest, DocumentationRequest
from app.services.code_reviewer_service import code_reviewer_service

router = APIRouter(
    prefix="/api/code",
    tags=["Code Review"],
    responses={404: {"description": "Not found"}},
)

@router.post("/review")
async def review_code(request: CodeReviewRequest):
    """Review code for quality, security, performance, and best practices"""
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
        
        result = await code_reviewer_service.review_code(
            document_id=request.document_id,
            review_type=request.review_type,
            code_text=request.code_text,
            language=request.language
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


@router.post("/documentation")
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
        
        result = await code_reviewer_service.generate_documentation(
            document_id=request.document_id,
            doc_type=request.doc_type,
            code_text=request.code_text,
            language=request.language
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

