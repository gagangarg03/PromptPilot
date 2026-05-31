"""
AI Translator Service
Translates text between multiple languages
"""

import os
from typing import Dict, Optional, List
from datetime import datetime

from app.services.qa_service import QAService


class TranslatorService:
    """Service for translating text between languages"""
    
    def __init__(self):
        self.qa_service = QAService()
        
        # Supported languages
        self.supported_languages = {
            "english": "en",
            "spanish": "es",
            "french": "fr",
            "german": "de",
            "italian": "it",
            "portuguese": "pt",
            "chinese": "zh",
            "japanese": "ja",
            "korean": "ko",
            "arabic": "ar",
            "hindi": "hi",
            "russian": "ru",
            "dutch": "nl",
            "polish": "pl",
            "turkish": "tr",
            "vietnamese": "vi",
            "thai": "th",
            "indonesian": "id"
        }
    
    async def translate(
        self,
        text: str,
        target_language: str,
        source_language: Optional[str] = None,
        preserve_formatting: bool = True
    ) -> Dict:
        """
        Translate text to target language
        
        Args:
            text: Text to translate
            target_language: Target language (e.g., "spanish", "french")
            source_language: Source language (auto-detected if not provided)
            preserve_formatting: Whether to preserve original formatting
        
        Returns:
            Dictionary containing translation
        """
        # Normalize language names
        target_lang = target_language.lower()
        if target_lang not in self.supported_languages:
            return {"error": f"Unsupported target language: {target_language}"}
        
        source_lang = None
        if source_language:
            source_lang = source_language.lower()
            if source_lang not in self.supported_languages:
                return {"error": f"Unsupported source language: {source_language}"}
        
        # Build translation prompt
        prompt = f"""Translate the following text to {target_language}:
        
{f"Source language: {source_language}" if source_language else "Auto-detect source language"}

Text to translate:
{text}

{"Preserve formatting, line breaks, and structure." if preserve_formatting else ""}

Provide only the translation, no explanations:"""

        try:
            # Call LLM directly (no documents needed for translation)
            translated_text = await self._call_llm_directly(prompt)
            
            return {
                "translation_id": f"translation_{datetime.now().timestamp()}",
                "original_text": text,
                "translated_text": translated_text,
                "source_language": source_language or "auto-detected",
                "target_language": target_language,
                "original_length": len(text),
                "translated_length": len(translated_text),
                "generated_at": datetime.now().isoformat(),
                "model_used": self.qa_service.model_name
            }
        except Exception as e:
            import traceback
            print(f"[ERROR] Translation error: {str(e)}")
            print(traceback.format_exc())
            return {"error": f"Error translating text: {str(e)}"}
    
    async def _call_llm_directly(self, prompt: str) -> str:
        """Call LLM directly without document retrieval"""
        from langchain_core.messages import HumanMessage, SystemMessage
        
        system_prompt = """You are an expert translator. Translate text accurately while preserving meaning, tone, and formatting when requested."""
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=prompt)
        ]
        
        try:
            llm = self.qa_service.llm
            
            try:
                from langchain_community.llms import Ollama
            except ImportError:
                Ollama = None
            
            if Ollama and isinstance(llm, Ollama):
                import asyncio
                prompt_text = f"{system_prompt}\n\n{prompt}"
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(None, llm.invoke, prompt_text)
                answer = response if isinstance(response, str) else str(response)
            elif hasattr(llm, 'ainvoke'):
                response = await llm.ainvoke(messages)
                answer = response.content if hasattr(response, 'content') else str(response)
            elif hasattr(llm, 'invoke'):
                import asyncio
                loop = asyncio.get_event_loop()
                try:
                    response = await loop.run_in_executor(None, llm.invoke, messages)
                    answer = response.content if hasattr(response, 'content') else str(response)
                except (TypeError, AttributeError):
                    prompt_text = f"{system_prompt}\n\n{prompt}"
                    response = await loop.run_in_executor(None, llm.invoke, prompt_text)
                    answer = response if isinstance(response, str) else str(response)
            else:
                raise ValueError("LLM does not support invoke or ainvoke")
            
            return answer
        except Exception as e:
            raise Exception(f"Error calling LLM: {str(e)}")
    
    async def batch_translate(
        self,
        texts: List[str],
        target_language: str,
        source_language: Optional[str] = None
    ) -> Dict:
        """
        Translate multiple texts at once
        
        Args:
            texts: List of texts to translate
            target_language: Target language
            source_language: Source language (optional)
        
        Returns:
            Dictionary containing all translations
        """
        translations = []
        errors = []
        
        for i, text in enumerate(texts):
            try:
                result = await self.translate(text, target_language, source_language)
                if "error" in result:
                    errors.append({"index": i, "error": result["error"]})
                else:
                    translations.append(result)
            except Exception as e:
                errors.append({"index": i, "error": str(e)})
        
        return {
            "batch_id": f"batch_{datetime.now().timestamp()}",
            "total_texts": len(texts),
            "successful": len(translations),
            "failed": len(errors),
            "translations": translations,
            "errors": errors,
            "generated_at": datetime.now().isoformat()
        }
    
    def get_supported_languages(self) -> List[str]:
        """Get list of supported languages"""
        return list(self.supported_languages.keys())

