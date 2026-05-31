"""
Question-Answering service using RAG
Handles question processing, retrieval, and answer generation
Supports multiple LLM providers: OpenAI, Ollama, Hugging Face, Google Gemini, Anthropic
"""

from typing import List, Optional
import os

# Disable ChromaDB telemetry before import
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")
os.environ.setdefault("CHROMA_TELEMETRY_DISABLED", "True")

# LangChain for RAG
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
try:
    from langchain_huggingface import HuggingFaceEndpoint
except ImportError:
    HuggingFaceEndpoint = None
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage
try:
    from langchain_community.llms import Ollama
except ImportError:
    # Fallback if langchain-community not available
    Ollama = None

# Vector database
import chromadb

from app.models.schemas import QuestionResponse, SourceCitation
from app.services.document_service import DocumentService


class QAService:
    """Service for question-answering using RAG"""
    
    def __init__(self):
        # Initialize ChromaDB (new API, same as document service)
        persist_directory = os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_db")
        self.chroma_client = chromadb.PersistentClient(path=persist_directory)
        
        self.collection = self.chroma_client.get_or_create_collection(
            name="documents",
            metadata={"hnsw:space": "cosine"}
        )
        
        # Initialize LLM based on configuration
        self.llm = self._initialize_llm()
        self.model_name = self._get_model_name()
        
        # Get embeddings model from document service
        self.document_service = DocumentService()
        self.embeddings_model, self.use_openai_embeddings = self.document_service.get_embeddings_model()
        
        # RAG prompt template - we'll build messages manually to ensure proper formatting
        # Store template structure for later use
        self.system_prompt = """You are a helpful assistant that answers questions based on the provided context from documents.

IMPORTANT: You MUST use the context provided below to answer the question. The context contains relevant information from uploaded documents.

Rules:
- Answer ONLY based on the provided context
- Use the information from the context to answer the question
- If the context contains relevant information, provide a detailed answer
- If the context doesn't contain enough information, say so clearly
- Be concise but complete
- Cite which document you're using when possible"""
    
    def _initialize_llm(self):
        """Initialize LLM based on environment configuration"""
        # Check for Ollama (local, free)
        if os.getenv("USE_OLLAMA", "false").lower() == "true":
            if Ollama is None:
                raise ValueError(
                    "Ollama support requires langchain-community. "
                    "Install with: pip install langchain-community"
                )
            base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            model = os.getenv("OLLAMA_MODEL", "llama3.2")
            return Ollama(base_url=base_url, model=model, temperature=0.7)
        
        # Check for Hugging Face
        if os.getenv("USE_HUGGINGFACE", "false").lower() == "true":
            if HuggingFaceEndpoint is None:
                raise ValueError(
                    "Hugging Face support requires langchain-huggingface. "
                    "Install with: pip install langchain-huggingface"
                )
            api_token = os.getenv("HUGGINGFACE_API_TOKEN")
            model = os.getenv("HUGGINGFACE_MODEL", "mistralai/Mistral-7B-Instruct-v0.2")
            if not api_token:
                raise ValueError("HUGGINGFACE_API_TOKEN is required when USE_HUGGINGFACE=true")
            return HuggingFaceEndpoint(
                endpoint_url=f"https://api-inference.huggingface.co/pipeline/text-generation/{model}",
                huggingfacehub_api_token=api_token,
                task="text-generation",
                model_kwargs={"temperature": 0.7, "max_length": 1000}
            )
        
        # Check for Google Gemini
        if os.getenv("USE_GEMINI", "false").lower() == "true":
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise ValueError("GEMINI_API_KEY is required when USE_GEMINI=true")
            
            # Try different model names - some API keys may not have access to newer models
            # List of models to try in order
            user_model = os.getenv("GEMINI_MODEL", "").strip()
            models_to_try = []
            
            if user_model:
                models_to_try.append(user_model)
            
            # Add common fallback models (newer models first, then older)
            models_to_try.extend([
                "gemini-2.5-flash",  # Newer, faster, widely available
                "gemini-2.0-flash",  # Stable newer model
                "gemini-2.5-pro",   # Better quality
                "gemini-pro",        # Older, legacy
                "gemini-1.5-flash",  # Older
                "gemini-1.5-pro"     # Older
            ])
            
            # Remove duplicates while preserving order
            models_to_try = list(dict.fromkeys(models_to_try))
            
            last_error = None
            for model in models_to_try:
                try:
                    llm = ChatGoogleGenerativeAI(
                        model=model,
                        google_api_key=api_key,
                        temperature=0.7
                    )
                    return llm
                except Exception as e:
                    last_error = e
                    print(f"[WARNING] Failed to initialize with {model}: {str(e)[:200]}")
                    continue
            
            # If all models failed, raise the last error
            raise ValueError(f"Failed to initialize Gemini with any model. Last error: {last_error}")
        
        # Check for Anthropic Claude
        if os.getenv("USE_ANTHROPIC", "false").lower() == "true":
            api_key = os.getenv("ANTHROPIC_API_KEY")
            model = os.getenv("ANTHROPIC_MODEL", "claude-3-haiku-20240307")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY is required when USE_ANTHROPIC=true")
            return ChatAnthropic(
                model=model,
                anthropic_api_key=api_key,
                temperature=0.7
            )
        
        # Default: OpenAI (requires API key)
        api_key = os.getenv("OPENAI_API_KEY")
        model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        if not api_key:
            raise ValueError(
                "No LLM provider configured. Please set one of:\n"
                "- USE_OLLAMA=true (for local Ollama)\n"
                "- USE_HUGGINGFACE=true with HUGGINGFACE_API_TOKEN\n"
                "- USE_GEMINI=true with GEMINI_API_KEY\n"
                "- USE_ANTHROPIC=true with ANTHROPIC_API_KEY\n"
                "- OPENAI_API_KEY (for OpenAI)"
            )
        return ChatOpenAI(
            model=model,
            openai_api_key=api_key,
            temperature=0.7
        )
    
    def _get_model_name(self) -> str:
        """Get the model name for display"""
        if isinstance(self.llm, Ollama):
            return f"Ollama/{os.getenv('OLLAMA_MODEL', 'llama3.2')}"
        elif HuggingFaceEndpoint and isinstance(self.llm, HuggingFaceEndpoint):
            return f"HuggingFace/{os.getenv('HUGGINGFACE_MODEL', 'mistralai/Mistral-7B-Instruct-v0.2')}"
        elif isinstance(self.llm, ChatGoogleGenerativeAI):
            # Get actual model from LLM object if available
            actual_model = getattr(self.llm, 'model', None)
            if actual_model:
                # Remove 'models/' prefix if present
                model_name = actual_model.replace('models/', '')
                return f"Gemini/{model_name}"
            return f"Gemini/{os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')}"
        elif isinstance(self.llm, ChatAnthropic):
            return f"Claude/{os.getenv('ANTHROPIC_MODEL', 'claude-3-haiku-20240307')}"
        elif isinstance(self.llm, ChatOpenAI):
            return f"OpenAI/{os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo')}"
        else:
            return "Unknown"
    
    async def ask_question(
        self, 
        question: str, 
        document_ids: Optional[List[str]] = None
    ) -> QuestionResponse:
        """
        Answer a question using RAG
        
        Process:
        1. Convert question to embedding
        2. Search vector database for similar chunks (filtered by user_id)
        3. Retrieve top-k relevant chunks
        4. Generate answer using LLM with context
        5. Return answer with source citations
        """
        # Generate question embedding
        if self.use_openai_embeddings:
            question_embedding = await self.embeddings_model.aembed_query(question)
        else:
            question_embedding = self.embeddings_model.encode(question).tolist()
        
        # Build query filter if specific documents requested
        where_filter = None
        if document_ids:
            where_filter = {"document_id": {"$in": document_ids}}
        
        # Search for similar chunks (top 5)
        results = self.collection.query(
            query_embeddings=[question_embedding],
            n_results=5,
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )
        
        if not results['ids'][0]:
            return QuestionResponse(
                answer="No relevant documents found. Please upload documents first.",
                sources=[],
                model_used=self.model_name
            )
        
        # Extract retrieved chunks
        chunks = results['documents'][0]
        metadatas = results['metadatas'][0]
        distances = results['distances'][0]
        
        # Build context from chunks
        context_parts = []
        sources = []
        
        for i, (chunk, metadata, distance) in enumerate(zip(chunks, metadatas, distances)):
            # Ensure chunk is not empty
            if chunk and chunk.strip():
                context_parts.append(f"[Document: {metadata['filename']}]\n{chunk}")
                
                # Create source citation
                sources.append(SourceCitation(
                    document_id=metadata['document_id'],
                    document_name=metadata['filename'],
                    chunk_text=chunk[:200] + "..." if len(chunk) > 200 else chunk,  # Truncate for display
                    similarity_score=1 - distance  # Convert distance to similarity
                ))
        
        # Check if we have any context
        if not context_parts:
            return QuestionResponse(
                answer="No relevant content found in the retrieved document chunks. The documents may be empty or the text extraction may have failed.",
                sources=[],
                model_used=self.model_name
            )
        
        context = "\n\n---\n\n".join(context_parts)
        
        # Generate answer using LLM
        # Create messages directly with actual context and question (not template variables)
        # This ensures the values are properly substituted
        user_content = f"""Use the following context from documents to answer the question:

{context}

Question: {question}

Based on the context above, provide a detailed answer:"""
        
        messages = [
            SystemMessage(content=self.system_prompt),
            HumanMessage(content=user_content)
        ]
        
        # Handle different LLM types
        if Ollama and isinstance(self.llm, Ollama):
            # Ollama uses synchronous invoke
            import asyncio
            prompt_text = f"{messages[0].content}\n\n{messages[1].content}"
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, self.llm.invoke, prompt_text)
            answer = response if isinstance(response, str) else str(response)
        else:
            # Other LLMs use async invoke
            try:
                response = await self.llm.ainvoke(messages)
                answer = response.content if hasattr(response, 'content') else str(response)
            except Exception as e:
                # Enhanced error logging
                error_msg = str(e)
                print(f"[ERROR] LLM invocation failed: {error_msg}")
                if isinstance(self.llm, ChatGoogleGenerativeAI):
                    current_model = getattr(self.llm, 'model', 'UNKNOWN')
                    print(f"[ERROR] Model being used: {current_model}")
                    
                    # Check if it's a model not found error
                    if "404" in error_msg and "not found" in error_msg.lower():
                        print(f"[ERROR] The model '{current_model}' is not available for your API key.")
                        print(f"[ERROR] Please update GEMINI_MODEL in .env to one of: gemini-pro, gemini-1.5-flash, gemini-1.5-pro")
                        print(f"[ERROR] Or remove GEMINI_MODEL to use the default (gemini-pro)")
                raise
        
        return QuestionResponse(
            answer=answer,
            sources=sources,
            model_used=self.model_name
        )

