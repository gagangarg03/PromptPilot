"""
Image processing service
Handles image upload, OCR text extraction, and image analysis
"""

import os
import uuid
import base64
from typing import Dict, Optional, Tuple
from io import BytesIO
from PIL import Image
import pytesseract

# Try to import vision-capable LLMs
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import HumanMessage
    GEMINI_VISION_AVAILABLE = True
except ImportError:
    GEMINI_VISION_AVAILABLE = False

try:
    from openai import OpenAI
    OPENAI_VISION_AVAILABLE = True
except ImportError:
    OPENAI_VISION_AVAILABLE = False


class ImageService:
    """Service for image processing, OCR, and analysis"""
    
    def __init__(self):
        # Check if Tesseract is available
        try:
            pytesseract.get_tesseract_version()
            self.ocr_available = True
        except Exception:
            self.ocr_available = False
        
        # Initialize vision-capable LLM if available
        self.vision_llm = self._initialize_vision_llm()
    
    def _initialize_vision_llm(self):
        """Initialize vision-capable LLM for image Q&A"""
        # Try Google Gemini first (free tier available)
        # Check both GOOGLE_API_KEY and GEMINI_API_KEY (for consistency with other services)
        google_api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if google_api_key and GEMINI_VISION_AVAILABLE:
            try:
                # Get model from env or use defaults
                env_model = os.getenv("GEMINI_MODEL", "").strip()
                
                # Try models in order: env model first, then common vision-capable models
                vision_models = []
                if env_model:
                    vision_models.append(env_model)  # Use the model from .env first
                
                # Add other vision-capable models as fallbacks
                vision_models.extend([
                    "gemini-2.5-flash",
                    "gemini-1.5-flash",
                    "gemini-1.5-pro",
                    "gemini-pro"
                ])
                
                # Remove duplicates while preserving order
                seen = set()
                vision_models = [m for m in vision_models if not (m in seen or seen.add(m))]
                
                for model_name in vision_models:
                    try:
                        llm = ChatGoogleGenerativeAI(
                            model=model_name,
                            google_api_key=google_api_key,
                            temperature=0.7
                        )
                        print(f"[INFO] Using Gemini Vision model: {model_name}")
                        return llm
                    except Exception as e:
                        print(f"[WARNING] Model {model_name} failed: {str(e)}")
                        continue
                
                # If all models fail, raise an error
                raise Exception("No available Gemini vision model found. Please check your API key and model availability.")
            except Exception as e:
                # Log the error for debugging
                print(f"[WARNING] Failed to initialize Gemini Vision: {str(e)}")
                pass
        
        # Try OpenAI GPT-4 Vision
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if openai_api_key and OPENAI_VISION_AVAILABLE:
            try:
                return OpenAI(api_key=openai_api_key)
            except Exception:
                pass
        
        return None
    
    def extract_text_from_image(self, image_content: bytes) -> Dict[str, any]:
        """
        Extract text from image using OCR
        
        Returns:
            Dictionary with extracted text and metadata
        """
        if not self.ocr_available:
            return {
                "text": "",
                "error": "OCR not available. Please install Tesseract OCR."
            }
        
        try:
            # Open image
            image = Image.open(BytesIO(image_content))
            
            # Extract text using OCR
            extracted_text = pytesseract.image_to_string(image)
            
            # Get additional info
            image_info = {
                "width": image.width,
                "height": image.height,
                "format": image.format,
                "mode": image.mode
            }
            
            return {
                "text": extracted_text.strip(),
                "image_info": image_info,
                "success": True
            }
        except Exception as e:
            return {
                "text": "",
                "error": f"Failed to extract text: {str(e)}",
                "success": False
            }
    
    async def analyze_image(self, image_content: bytes, question: Optional[str] = None) -> Dict[str, any]:
        """
        Analyze image using vision-capable LLM
        
        Args:
            image_content: Image bytes
            question: Optional question about the image
        
        Returns:
            Dictionary with analysis/answer
        """
        if not self.vision_llm:
            return {
                "error": "Vision-capable LLM not available. Please configure GOOGLE_API_KEY or OPENAI_API_KEY."
            }
        
        try:
            # Convert image to base64
            image_base64 = base64.b64encode(image_content).decode('utf-8')
            
            # Determine image format
            image = Image.open(BytesIO(image_content))
            image_format = image.format.lower() if image.format else 'png'
            mime_type = f"image/{image_format}"
            
            if question:
                # Answer question about image
                prompt = f"Look at this image and answer the following question: {question}\n\nProvide a detailed answer based on what you see in the image."
            else:
                # General image description
                prompt = "Describe this image in detail. Include any text you see, objects, people, scenes, and any other relevant information."
            
            # Use Gemini Vision if available
            if isinstance(self.vision_llm, ChatGoogleGenerativeAI):
                from langchain_core.messages import HumanMessage
                
                # For Gemini Vision, use the correct format with image data
                try:
                    # Method 1: Use base64 image URL format (most reliable)
                    message = HumanMessage(
                        content=[
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{image_base64}"
                                }
                            }
                        ]
                    )
                    
                    response = await self.vision_llm.ainvoke([message])
                    answer = response.content if hasattr(response, 'content') else str(response)
                    
                    return {
                        "answer": answer,
                        "model": getattr(self.vision_llm, 'model', 'gemini-vision'),
                        "success": True
                    }
                except Exception as e:
                    # Method 2: Try simpler format - just text and image URL string
                    try:
                        message = HumanMessage(
                            content=[
                                prompt,
                                f"data:{mime_type};base64,{image_base64}"
                            ]
                        )
                        response = await self.vision_llm.ainvoke([message])
                        answer = response.content if hasattr(response, 'content') else str(response)
                        return {
                            "answer": answer,
                            "model": getattr(self.vision_llm, 'model', 'gemini-vision'),
                            "success": True
                        }
                    except Exception as e2:
                        return {
                            "error": f"Gemini Vision API error: {str(e2)}. Original error: {str(e)}. Please check that your API key has access to vision models.",
                            "success": False
                        }
            
            # Use OpenAI GPT-4 Vision if available
            elif isinstance(self.vision_llm, OpenAI):
                response = self.vision_llm.chat.completions.create(
                    model="gpt-4-vision-preview",
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": prompt
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{mime_type};base64,{image_base64}"
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens=500
                )
                
                answer = response.choices[0].message.content
                
                return {
                    "answer": answer,
                    "model": "gpt-4-vision",
                    "success": True
                }
            
            else:
                return {
                    "error": "Vision LLM not properly initialized"
                }
                
        except Exception as e:
            return {
                "error": f"Failed to analyze image: {str(e)}",
                "success": False
            }
    
    def validate_image(self, image_content: bytes, filename: str) -> Tuple[bool, Optional[str]]:
        """
        Validate image file
        
        Returns:
            (is_valid, error_message)
        """
        try:
            # Check file extension
            allowed_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'}
            file_ext = os.path.splitext(filename)[1].lower()
            if file_ext not in allowed_extensions:
                return False, f"Unsupported image format. Allowed: {', '.join(allowed_extensions)}"
            
            # Try to open image
            image = Image.open(BytesIO(image_content))
            image.verify()
            
            # Check file size (max 10MB)
            if len(image_content) > 10 * 1024 * 1024:
                return False, "Image file too large. Maximum size is 10MB."
            
            return True, None
            
        except Exception as e:
            return False, f"Invalid image file: {str(e)}"
    
    def get_image_info(self, image_content: bytes) -> Dict[str, any]:
        """Get basic information about the image"""
        try:
            image = Image.open(BytesIO(image_content))
            return {
                "width": image.width,
                "height": image.height,
                "format": image.format,
                "mode": image.mode,
                "size_bytes": len(image_content)
            }
        except Exception as e:
            return {
                "error": f"Failed to get image info: {str(e)}"
            }

