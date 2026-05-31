"""
AI Content Generator Service
Generates various types of content: blog posts, emails, social media posts, etc.
"""

import os
from typing import Dict, Optional
from datetime import datetime

from app.services.qa_service import QAService


class ContentGeneratorService:
    """Service for generating AI-powered content"""
    
    def __init__(self):
        self.qa_service = QAService()
    
    async def generate_content(
        self,
        content_type: str,
        topic: str,
        tone: str = "professional",
        length: str = "medium",
        additional_context: Optional[str] = None
    ) -> Dict:
        """
        Generate content based on type and parameters
        
        Args:
            content_type: Type of content (blog_post, email, social_media, product_description, etc.)
            topic: Main topic or subject
            tone: Tone of writing (professional, friendly, casual, formal, creative)
            length: Length of content (short, medium, long)
            additional_context: Additional context or requirements
        
        Returns:
            Dictionary containing generated content
        """
        # Map content types to prompts
        content_prompts = {
            "blog_post": f"""Write a comprehensive blog post about: {topic}

Requirements:
- Tone: {tone}
- Length: {length}
{f"- Additional context: {additional_context}" if additional_context else ""}

Include:
1. Engaging introduction
2. Well-structured body with key points
3. Compelling conclusion
4. Call-to-action if appropriate

Make it informative, engaging, and well-written.""",

            "email": f"""Write a professional email about: {topic}

Requirements:
- Tone: {tone}
- Length: {length}
{f"- Additional context: {additional_context}" if additional_context else ""}

Include:
1. Clear subject line
2. Appropriate greeting
3. Main message
4. Professional closing

Make it clear, concise, and professional.""",

            "social_media": f"""Create a social media post about: {topic}

Requirements:
- Tone: {tone}
- Length: {length}
{f"- Additional context: {additional_context}" if additional_context else ""}

Make it:
- Engaging and attention-grabbing
- Appropriate for social media
- Include relevant hashtags if suitable
- Encourage interaction""",

            "product_description": f"""Write a product description for: {topic}

Requirements:
- Tone: {tone}
- Length: {length}
{f"- Additional context: {additional_context}" if additional_context else ""}

Include:
1. Compelling headline
2. Key features and benefits
3. Use cases
4. Call-to-action

Make it persuasive and informative.""",

            "article": f"""Write an article about: {topic}

Requirements:
- Tone: {tone}
- Length: {length}
{f"- Additional context: {additional_context}" if additional_context else ""}

Structure:
1. Introduction with hook
2. Main content with sections
3. Conclusion
4. Key takeaways

Make it well-researched and comprehensive.""",

            "marketing_copy": f"""Write marketing copy for: {topic}

Requirements:
- Tone: {tone}
- Length: {length}
{f"- Additional context: {additional_context}" if additional_context else ""}

Make it:
- Persuasive and compelling
- Highlight benefits
- Include strong call-to-action
- Create urgency if appropriate"""
        }
        
        if content_type not in content_prompts:
            return {"error": f"Unsupported content type: {content_type}"}
        
        prompt = content_prompts[content_type]
        
        try:
            # Call LLM directly (not through RAG - no documents needed)
            generated_text = await self._call_llm_directly(prompt)
            
            return {
                "content_id": f"content_{datetime.now().timestamp()}",
                "content_type": content_type,
                "topic": topic,
                "tone": tone,
                "length": length,
                "generated_content": generated_text,
                "generated_at": datetime.now().isoformat(),
                "model_used": self.qa_service.model_name
            }
        except Exception as e:
            import traceback
            print(f"[ERROR] Content generation error: {str(e)}")
            print(traceback.format_exc())
            return {"error": f"Error generating content: {str(e)}"}
    
    async def _call_llm_directly(self, prompt: str) -> str:
        """Call LLM directly without document retrieval"""
        from langchain_core.messages import HumanMessage, SystemMessage
        
        system_prompt = """You are an expert content writer. Generate high-quality, engaging content based on the user's requirements. 
Be creative, informative, and follow the specified tone and length requirements."""
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=prompt)
        ]
        
        try:
            llm = self.qa_service.llm
            
            # Check for Ollama specifically (sync LLM that needs special handling)
            try:
                from langchain_community.llms import Ollama
            except ImportError:
                Ollama = None
            
            # Handle different LLM types
            if Ollama and isinstance(llm, Ollama):
                # Ollama uses synchronous invoke with combined prompt text
                import asyncio
                prompt_text = f"{system_prompt}\n\n{prompt}"
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(None, llm.invoke, prompt_text)
                answer = response if isinstance(response, str) else str(response)
            elif hasattr(llm, 'ainvoke'):
                # Async LLM (ChatOpenAI, ChatAnthropic, ChatGoogleGenerativeAI)
                response = await llm.ainvoke(messages)
                answer = response.content if hasattr(response, 'content') else str(response)
            elif hasattr(llm, 'invoke'):
                # Other sync LLMs - try with messages first, then fallback to prompt
                import asyncio
                loop = asyncio.get_event_loop()
                try:
                    # Try with messages (some sync LLMs accept messages)
                    response = await loop.run_in_executor(None, llm.invoke, messages)
                    answer = response.content if hasattr(response, 'content') else str(response)
                except (TypeError, AttributeError):
                    # Fallback to prompt text if messages don't work
                    prompt_text = f"{system_prompt}\n\n{prompt}"
                    response = await loop.run_in_executor(None, llm.invoke, prompt_text)
                    answer = response if isinstance(response, str) else str(response)
            else:
                raise ValueError("LLM does not support invoke or ainvoke")
            
            return answer
        except Exception as e:
            raise Exception(f"Error calling LLM: {str(e)}")

