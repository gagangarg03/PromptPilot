"""
Content Generation Router
Handles AI-powered content generation (blog posts, emails, social media, etc.)
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.models.schemas import ContentGeneratorRequest
from app.services.content_generator_service import content_generator_service

router = APIRouter(
    prefix="/api/content",
    tags=["Content Generation"],
    responses={404: {"description": "Not found"}},
)

@router.post("/generate")
async def generate_content(request: ContentGeneratorRequest):
    """Generate AI-powered content (blog posts, emails, social media, etc.)"""
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

