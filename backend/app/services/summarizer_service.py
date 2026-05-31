"""
AI Text Summarizer Service
Summarizes long documents, articles, meeting notes, etc.
"""

import os
from typing import Dict, Optional, List
from datetime import datetime

from app.services.qa_service import QAService
from app.services.document_service import DocumentService


class SummarizerService:
    """Service for summarizing text and documents"""
    
    def __init__(self):
        self.qa_service = QAService()
        self.document_service = DocumentService()
    
    async def summarize(
        self,
        text: Optional[str] = None,
        document_id: Optional[str] = None,
        summary_type: str = "concise",
        max_length: Optional[int] = None
    ) -> Dict:
        """
        Summarize text or document
        
        Args:
            text: Raw text to summarize
            document_id: ID of document to summarize
            summary_type: Type of summary (concise, detailed, bullet_points, executive)
            max_length: Maximum length of summary in words
        
        Returns:
            Dictionary containing summary
        """
        # Get content to summarize
        content = None
        
        if text:
            content = text
        elif document_id:
            documents = await self.document_service.list_documents()
            doc = next((d for d in documents if d.document_id == document_id), None)
            if not doc:
                return {"error": "Document not found"}
            # Get document content (simplified - in production, retrieve from vector DB)
            content = f"Document: {doc.filename}"
        else:
            return {"error": "Either text or document_id must be provided"}
        
        # Build summary prompt based on type
        summary_prompts = {
            "concise": f"""Provide a concise summary of the following text in 2-3 sentences:

{content[:5000]}  # Limit to prevent token overflow

Summary:""",

            "detailed": f"""Provide a detailed summary of the following text, covering all key points:

{content[:5000]}

Include:
- Main topics
- Key points
- Important details
- Conclusions

Summary:""",

            "bullet_points": f"""Summarize the following text as bullet points:

{content[:5000]}

Format as:
- Key point 1
- Key point 2
- etc.

Summary:""",

            "executive": f"""Provide an executive summary of the following text:

{content[:5000]}

Include:
- Overview
- Key findings
- Recommendations
- Next steps

Executive Summary:"""
        }
        
        if summary_type not in summary_prompts:
            return {"error": f"Unsupported summary type: {summary_type}"}
        
        prompt = summary_prompts[summary_type]
        
        if max_length:
            prompt += f"\n\nKeep the summary under {max_length} words."
        
        try:
            # If we have direct text, call LLM directly (no documents needed)
            # If we have document_id, use RAG to get document content first
            if text:
                # Direct text summarization - call LLM directly
                summary_text = await self._call_llm_directly(prompt)
                return {
                    "summary_id": f"summary_{datetime.now().timestamp()}",
                    "summary_type": summary_type,
                    "summary": summary_text,
                    "original_length": len(content) if content else 0,
                    "summary_length": len(summary_text),
                    "compression_ratio": round(len(summary_text) / len(content) * 100, 2) if content and len(content) > 0 else 0,
                    "generated_at": datetime.now().isoformat(),
                    "model_used": self.qa_service.model_name
                }
            elif document_id:
                # Document-based summarization - use RAG
                response = await self.qa_service.ask_question(
                    question=prompt,
                    document_ids=[document_id]
                )
                return {
                    "summary_id": f"summary_{datetime.now().timestamp()}",
                    "summary_type": summary_type,
                    "summary": response.answer,
                    "original_length": len(content) if content else 0,
                    "summary_length": len(response.answer),
                    "compression_ratio": round(len(response.answer) / len(content) * 100, 2) if content and len(content) > 0 else 0,
                    "generated_at": datetime.now().isoformat(),
                    "model_used": self.qa_service.model_name
                }
            else:
                return {"error": "Either text or document_id must be provided"}
        except Exception as e:
            import traceback
            print(f"[ERROR] Summarization error: {str(e)}")
            print(traceback.format_exc())
            return {"error": f"Error generating summary: {str(e)}"}
    
    async def _call_llm_directly(self, prompt: str) -> str:
        """Call LLM directly without document retrieval"""
        from langchain_core.messages import HumanMessage, SystemMessage
        
        system_prompt = """You are an expert at summarizing text. Provide clear, concise summaries that capture the key points and main ideas."""
        
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

