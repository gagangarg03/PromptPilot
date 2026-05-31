"""
Translator Router
Handles AI-powered text translation
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.models.schemas import TranslatorRequest, BatchTranslatorRequest
from app.services.translator_service import translator_service

router = APIRouter(
    prefix="/api/translate",
    tags=["Translator"],
    responses={404: {"description": "Not found"}},
)

@router.post("")
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
                "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


@router.post("/batch")
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


@router.get("/languages")
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

