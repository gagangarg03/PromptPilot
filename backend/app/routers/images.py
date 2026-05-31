"""
Image Router
Handles image upload, OCR, and image Q&A
"""

import os
from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import Optional
from app.services.image_service import ImageService
from pydantic import BaseModel, Field

router = APIRouter(
    prefix="/api/images",
    tags=["Images"],
    responses={404: {"description": "Not found"}},
)

image_service = ImageService()


class ImageQuestionRequest(BaseModel):
    """Request model for asking questions about images"""
    question: str = Field(..., description="The question to ask about the image")
    image_id: Optional[str] = Field(None, description="ID of uploaded image (if using existing image)")


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """
    Upload and process an image
    
    Supported formats: PNG, JPG, JPEG, GIF, BMP, WEBP
    """
    try:
        # Validate file type
        allowed_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported image format. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Read file content
        contents = await file.read()
        
        # Validate image
        is_valid, error_msg = image_service.validate_image(contents, file.filename)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Get image info
        image_info = image_service.get_image_info(contents)
        
        # Extract text using OCR
        ocr_result = image_service.extract_text_from_image(contents)
        
        return {
            "success": True,
            "message": "Image processed successfully",
            "filename": file.filename,
            "image_info": image_info,
            "ocr_text": ocr_result.get("text", ""),
            "ocr_success": ocr_result.get("success", False)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")


@router.post("/analyze")
async def analyze_image(
    question: Optional[str] = None,
    file: Optional[UploadFile] = File(None)
):
    """
    Analyze an image or answer questions about it
    
    Either provide a file or use an existing uploaded image
    """
    try:
        if not file:
            raise HTTPException(status_code=400, detail="Image file is required")
        
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
        
        return {
            "success": True,
            "answer": result.get("answer", ""),
            "model": result.get("model", "unknown"),
            "filename": file.filename
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing image: {str(e)}")


@router.post("/ocr")
async def extract_text_from_image(file: UploadFile = File(...)):
    """
    Extract text from image using OCR
    """
    try:
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
        
        return {
            "success": True,
            "text": result.get("text", ""),
            "image_info": result.get("image_info", {})
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting text: {str(e)}")

