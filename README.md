# Prompt Pilot - All-in-One Generative AI Productivity Platform

A comprehensive **Generative AI (GenAI)** application that combines multiple AI features in one platform. Prompt Pilot helps you upload documents, ask questions, generate reports, review code, translate text, summarize documents, classify tickets, and generate content - all powered by cutting-edge AI technology!

![Prompt Pilot](https://img.shields.io/badge/Prompt-Pilot-purple) ![Python](https://img.shields.io/badge/Python-3.9+-blue) ![React](https://img.shields.io/badge/React-18+-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green)

---

## 📚 Table of Contents

1. [What is This Project?](#-what-is-this-project)
2. [Understanding Generative AI (GenAI) - For Beginners](#-understanding-generative-ai-genai---for-beginners)
3. [RAG Architecture - How It Works](#-rag-architecture---how-it-works)
4. [Complete Feature List with Detailed Explanations](#-complete-feature-list-with-detailed-explanations)
5. [Where and How We Use GenAI](#-where-and-how-we-use-genai)
6. [Technologies Used - Explained](#-technologies-used---explained)
7. [Project Structure](#-project-structure)
8. [Setup Instructions](#-setup-instructions)
9. [How to Use Each Feature](#-how-to-use-each-feature)
10. [API Endpoints](#-api-endpoints)
11. [Complete Dependencies List](#-complete-dependencies-list)

---

## 🎯 What is This Project?

This is a **full-stack AI application** that demonstrates real-world use of Generative AI technologies. It's like having multiple AI assistants in one platform:

- 📄 **Document Intelligence**: Upload documents and ask questions about them
- 📊 **AI Report Generator**: Automatically create comprehensive reports
- 💻 **AI Code Reviewer**: Review code quality and generate documentation
- 🎫 **AI Ticket Classifier**: Automatically categorize and respond to support tickets
- 📝 **AI Content Generator**: Generate blog posts, emails, and marketing content
- 📄 **AI Text Summarizer**: Summarize long documents intelligently
- 🌍 **AI Translator**: Translate text between multiple languages
- 🖼️ **Image Q&A**: Upload images, extract text (OCR), and ask questions about images
- 🎤 **Multi-modal AI**: Process audio and video files (transcription, analysis, frame extraction)
- 👥 **Real-time Collaboration**: Team workspaces with live chat, file sharing, reactions, and read receipts
- 🔐 **User Authentication**: Secure login and user management

**In simple terms**: It's a complete AI platform that can read, understand, analyze, generate, and translate content - all in one beautiful interface!

---

## 🧠 Understanding Generative AI (GenAI) - For Beginners

### What is Generative AI?

**Generative AI** (GenAI) is a type of artificial intelligence that can **create new content** based on what it has learned from training data. Think of it like a very smart assistant that can:

- **Understand** text, documents, code, and context
- **Generate** answers, reports, summaries, and new content
- **Learn** from examples and patterns
- **Create** new content that makes sense and is contextually relevant

### Real-World Examples:

1. **ChatGPT**: Can have conversations and answer questions
2. **GitHub Copilot**: Suggests code while you program
3. **DALL-E**: Creates images from text descriptions
4. **This Project**: Reads your documents, answers questions, generates reports, reviews code, and more!

### How Does GenAI Work?

1. **Training Phase**: The AI model is trained on millions of documents, books, code repositories, etc.
2. **Learning Phase**: It learns patterns, relationships, meanings, and context
3. **Generation Phase**: When you provide input, it uses what it learned to create a relevant response

**Think of it like this:**
- A student reads thousands of books (training)
- Learns patterns, facts, and writing styles (learning)
- Can answer exam questions and write essays (generation)

### Types of GenAI Used in This Project:

1. **RAG (Retrieval-Augmented Generation)**: For document Q&A - combines document search with AI generation
2. **Text Generation**: For reports, content, summaries, translations
3. **Code Analysis**: For code review and documentation
4. **Classification**: For ticket categorization
5. **Embeddings**: For semantic search and understanding

---

## 🔍 RAG Architecture - How It Works

### What is RAG?

**RAG** stands for **Retrieval-Augmented Generation**. It's a powerful technique that makes AI answers more accurate by combining:
- **Retrieval**: Finding relevant information from your documents
- **Augmentation**: Adding that information to the AI's context
- **Generation**: Creating an answer based on both the AI's knowledge and your documents

### The RAG Process - Visual Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        INDEXING PHASE                            │
│  (Happens when you upload documents)                            │
└─────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │  Documents  │  (PDF, DOCX, TXT files)
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Chunking   │  (Split into smaller pieces)
    └──────┬──────┘
           │
           ▼
    ┌──────────────────────┐
    │  Embedding Model     │  (Converts text to numbers)
    │  (for Indexing)      │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │  Vectorize           │  (Text → Vector of numbers)
    │  [0.2, 0.5, 0.1...]  │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │  Vector Store        │  (ChromaDB - stores all vectors)
    │  ┌─────┐ ┌─────┐    │
    │  │Node1│ │Node2│    │
    │  └─────┘ └─────┘    │
    └──────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              QUERY, AUGMENT, AND GENERATE PHASE                 │
│  (Happens when you ask a question)                               │
└─────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │    User     │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Query     │  (Your question)
    └──────┬──────┘
           │
           ▼
    ┌──────────────────────┐
    │  Embedding Model     │  (Converts question to vector)
    │  (for Query)         │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │  Vectorize           │  (Question → Vector)
    │  [0.3, 0.4, 0.2...]  │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │  Search              │  (Find similar vectors in store)
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │  Vector Store        │  (Returns relevant chunks)
    │  ┌─────┐ ┌─────┐    │
    │  │Node1│ │Node2│    │
    │  └─────┘ └─────┘    │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────┐
    │  Retrieve            │  (Get relevant document chunks)
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────────────────────┐
    │  Augment                             │
    │  ┌─────────────┐                     │
    │  │   Query     │  (Your question)    │
    │  └─────────────┘                     │
    │  ┌─────────────────────┐             │
    │  │ Relevant Contexts   │  (From docs)│
    │  │ ─────────────────   │             │
    │  │ Prompt              │             │
    │  └─────────────────────┘             │
    └──────┬───────────────────────────────┘
           │
           ▼
    ┌─────────────┐
    │     LLM     │  (Large Language Model)
    │  (Gemini/   │  Generates answer using
    │   GPT/      │  query + context
    │   Claude)   │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Response   │  (AI-generated answer
    │             │   with source citations)
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │    User     │  (Sees the answer)
    └─────────────┘
```

### Why RAG is Powerful:

1. ✅ **Accurate**: Answers based on YOUR documents, not just generic knowledge
2. ✅ **Source Citations**: Shows which document/chunk was used for each part
3. ✅ **Up-to-date**: Works with any documents you upload (no retraining needed)
4. ✅ **Context-aware**: Understands meaning, not just keywords
5. ✅ **Transparent**: You can see where the information came from

### Where We Use RAG in This Project:

- **Document Q&A**: Primary use - ask questions about uploaded documents
- **Report Generator**: Uses RAG to extract information from documents for reports
- **Text Summarizer**: Can use RAG to summarize specific documents

---

## ✨ Complete Feature List with Detailed Explanations

### 1. 📄 Document Q&A (RAG-Based) - **Core Feature**

**What it does:**
Ask questions about your uploaded documents and get intelligent, accurate answers with source citations.

**How GenAI is used:**
- **RAG (Retrieval-Augmented Generation)**: Combines document retrieval with AI generation
- **Embeddings**: Converts documents and questions to vectors for semantic search
- **LLM (Large Language Model)**: Generates answers using retrieved context
- **Vector Database (ChromaDB)**: Stores document chunks as vectors for fast similarity search

**Where it's implemented:**
- **Backend**: `app/services/qa_service.py` - RAG implementation
- **Backend**: `app/services/document_service.py` - Document processing and vector storage
- **Frontend**: `frontend/src/components/QAChat.tsx` - User interface

**How it works:**
1. Upload document → Split into chunks → Convert to vectors → Store in ChromaDB
2. Ask question → Convert question to vector → Search for similar chunks → Retrieve top matches
3. Send question + context to LLM → Generate answer → Return with source citations

**Example Use Cases:**
- "What are the main findings in this research paper?"
- "Summarize the key points from the quarterly report"
- "What does the document say about machine learning?"

---

### 2. 📊 AI Report Generator

**What it does:**
Automatically generates comprehensive reports from your documents, extracting insights, KPIs, and recommendations.

**How GenAI is used:**
- **LLM Analysis**: Analyzes document content to extract key information
- **Structured Generation**: Creates well-formatted reports with sections
- **Insight Extraction**: Identifies important patterns and findings
- **KPI Detection**: Finds and highlights key performance indicators

**Where it's implemented:**
- **Backend**: `app/services/report_service.py` - Report generation logic
- **Backend**: `app/routers/reports.py` - API endpoints
- **Frontend**: `frontend/src/components/ReportGenerator.tsx` - UI

**How it works:**
1. Select documents → Extract content → Analyze with LLM
2. LLM identifies: Executive summary, key insights, KPIs, recommendations
3. Format into structured report → Return to user

**Report Types:**
- **Comprehensive**: Full detailed analysis
- **Summary**: Brief overview
- **KPI Analysis**: Focus on metrics and numbers
- **Insights**: Key findings and patterns

**Example Use Cases:**
- Generate quarterly business reports
- Create research paper summaries
- Extract insights from meeting notes
- Analyze performance metrics

---

### 3. 💻 AI Code Reviewer & Documentation Generator

**What it does:**
Reviews code for quality, security, performance, and best practices. Also generates technical documentation.

**How GenAI is used:**
- **Code Analysis**: LLM analyzes code structure, logic, and patterns
- **Security Scanning**: Identifies potential vulnerabilities
- **Performance Review**: Suggests optimizations
- **Documentation Generation**: Creates technical docs from code

**Where it's implemented:**
- **Backend**: `app/services/code_reviewer_service.py` - Code analysis logic
- **Backend**: `app/routers/code_review.py` - API endpoints
- **Frontend**: `frontend/src/components/CodeReviewer.tsx` - UI

**How it works:**
1. Input code (paste or upload) → Detect language → Analyze with LLM
2. LLM reviews: Code quality, security, performance, style, best practices
3. Generate feedback with scores and suggestions → Return review

**Review Types:**
- **Comprehensive**: All aspects (quality, security, performance, style)
- **Security Focus**: Security vulnerabilities and best practices
- **Performance Focus**: Optimization suggestions
- **Style Focus**: Code quality and formatting

**Documentation Types:**
- **Technical Documentation**: Detailed technical specs
- **API Documentation**: API endpoints and usage
- **README**: Project documentation
- **Inline Comments**: Code comments

**Example Use Cases:**
- Review pull requests before merging
- Generate documentation for legacy code
- Learn best practices from AI feedback
- Ensure code security before deployment

---

### 4. 🎫 AI Support Ticket Classifier & Auto-Responder

**What it does:**
Automatically categorizes support tickets and generates professional responses.

**How GenAI is used:**
- **Text Classification**: LLM classifies tickets into categories (Technical, Billing, Bug, Feature Request, etc.)
- **Priority Detection**: Determines urgency level (High, Medium, Low)
- **Response Generation**: Creates professional, context-aware responses
- **Sentiment Analysis**: Understands customer tone and urgency

**Where it's implemented:**
- **Backend**: `app/services/ticket_classifier_service.py` - Classification logic
- **Backend**: `app/routers/tickets.py` - API endpoints
- **Frontend**: `frontend/src/components/TicketClassifier.tsx` - UI

**How it works:**
1. Input ticket text → Analyze with LLM → Classify category and priority
2. Generate response based on category and context → Return classification + response

**Categories:**
- Technical Support
- Billing/Account
- Bug Report
- Feature Request
- General Inquiry
- Urgent Issues

**Example Use Cases:**
- Automate customer support ticket routing
- Generate first-response templates
- Batch process multiple tickets
- Improve response time

---

### 5. 📝 AI Content Generator

**What it does:**
Generates various types of content including blog posts, emails, social media posts, and marketing copy.

**How GenAI is used:**
- **Text Generation**: LLM creates original content based on prompts
- **Style Adaptation**: Adjusts tone and style (professional, casual, creative)
- **Template-Based**: Uses templates for different content types
- **Context Awareness**: Maintains consistency and relevance

**Where it's implemented:**
- **Backend**: `app/services/content_generator_service.py` - Content generation logic
- **Backend**: `app/routers/content.py` - API endpoints
- **Frontend**: `frontend/src/components/ContentGenerator.tsx` - UI

**How it works:**
1. Select content type → Provide topic/prompt → Set parameters (tone, length)
2. LLM generates content based on type and parameters → Return formatted content

**Content Types:**
- Blog Posts
- Emails
- Social Media Posts
- Marketing Copy
- Product Descriptions
- Press Releases

**Example Use Cases:**
- Generate blog post ideas and content
- Create marketing email campaigns
- Write social media posts
- Generate product descriptions

---

### 6. 📄 AI Text Summarizer

**What it does:**
Intelligently summarizes long documents, articles, or text into concise summaries.

**How GenAI is used:**
- **Extractive Summarization**: Identifies and extracts key sentences
- **Abstractive Summarization**: Generates new summary text (LLM-based)
- **Length Control**: Adjusts summary length (concise, detailed, bullet points)
- **Context Preservation**: Maintains important information

**Where it's implemented:**
- **Backend**: `app/services/summarizer_service.py` - Summarization logic
- **Backend**: `app/routers/summarizer.py` - API endpoints
- **Frontend**: `frontend/src/components/TextSummarizer.tsx` - UI

**How it works:**
1. Input text (paste or select document) → Choose summary type → Set length
2. LLM analyzes content → Extracts/generates key points → Creates summary

**Summary Types:**
- **Concise**: 2-3 sentences
- **Detailed**: Comprehensive summary
- **Bullet Points**: Key points list
- **Executive**: Executive summary format

**Example Use Cases:**
- Summarize long research papers
- Create meeting notes summaries
- Extract key points from articles
- Generate executive summaries

---

### 7. 🌍 AI Translator

**What it does:**
Translates text between multiple languages while preserving meaning and context.

**How GenAI is used:**
- **Neural Translation**: LLM translates with context awareness
- **Language Detection**: Automatically detects source language
- **Context Preservation**: Maintains meaning, tone, and style
- **Format Preservation**: Keeps formatting and structure

**Where it's implemented:**
- **Backend**: `app/services/translator_service.py` - Translation logic
- **Backend**: `app/routers/translator.py` - API endpoints
- **Frontend**: `frontend/src/components/Translator.tsx` - UI

**How it works:**
1. Input text → Select source and target languages → Translate with LLM
2. LLM translates with context awareness → Return translated text

**Features:**
- Support for 50+ languages
- Batch translation
- Format preservation
- Context-aware translation

**Example Use Cases:**
- Translate documents
- Localize content
- Multi-language communication
- Real-time translation

---

### 8. 🖼️ Image Q&A (OCR & Vision AI)

**What it does:**
Upload images, extract text using OCR, and ask questions about images using vision-capable AI models.

**How GenAI is used:**
- **OCR (Optical Character Recognition)**: Extracts text from images using `pytesseract`
- **Vision AI**: Analyzes images using vision-capable LLMs (Gemini Vision, GPT-4 Vision)
- **Image Understanding**: Describes images, answers questions about visual content
- **Text Extraction**: Converts image text to searchable/editable format

**Where it's implemented:**
- **Backend**: `app/services/image_service.py` - Image processing and vision AI
- **Backend**: `app/routers/images.py` - API endpoints
- **Frontend**: `frontend/src/components/ImageQ&A.tsx` - UI

**How it works:**
1. Upload image → Extract text using OCR (optional)
2. Ask question about image → Send to vision LLM
3. Vision LLM analyzes image and question → Returns answer

**Features:**
- OCR text extraction from images
- Image description and analysis
- Visual Q&A (ask questions about image content)
- Support for PNG, JPG, JPEG, GIF, WEBP formats
- Vision model support (Gemini Vision, GPT-4 Vision)

**Example Use Cases:**
- Extract text from scanned documents
- Analyze charts and diagrams
- Describe images for accessibility
- Answer questions about visual content
- Process receipts and forms

---

### 9. 🎤 Multi-modal AI (Audio & Video Processing)

**What it does:**
Process audio and video files for transcription, analysis, and frame extraction.

**How GenAI is used:**
- **Audio Transcription**: Converts speech to text using OpenAI Whisper
- **Video Analysis**: Extracts frames, audio, and analyzes content
- **Multi-modal Understanding**: Combines audio, video, and text analysis
- **Content Summarization**: Generates summaries from audio/video content

**Where it's implemented:**
- **Backend**: `app/services/multimodal_service.py` - Audio/video processing
- **Backend**: `app/routers/multimodal.py` - API endpoints (in `main.py`)
- **Frontend**: `frontend/src/components/MultimodalAI.tsx` - UI

**How it works:**
1. **Audio**: Upload audio file → Transcribe with Whisper → Analyze with LLM
2. **Video**: Upload video → Extract frames and audio → Analyze both → Generate insights

**Features:**
- Audio transcription (MP3, WAV, M4A)
- Video transcription (MP4, AVI, MOV)
- Frame extraction from videos
- Audio extraction from videos
- AI-powered content analysis
- Duration calculation
- Support for multiple audio/video formats

**Example Use Cases:**
- Transcribe meeting recordings
- Generate summaries from video content
- Extract insights from audio podcasts
- Analyze video content for key moments
- Create transcripts for accessibility

**Technical Requirements:**
- FFmpeg must be installed on the system for audio/video processing
- Whisper model downloads automatically on first use

---

### 10. 👥 Real-time Collaboration

**What it does:**
Team workspaces with live chat, file sharing, message reactions, read receipts, and real-time updates.

**How it works:**
- **WebSocket Communication**: Real-time bidirectional communication
- **Team Workspaces**: Create and join shared workspaces
- **Live Chat**: Send messages, files, and images in real-time
- **Message Features**: Edit, delete, react to messages
- **User Presence**: See who's online, typing indicators
- **Read Receipts**: Track message read status

**Where it's implemented:**
- **Backend**: `app/main.py` - WebSocket endpoint and ConnectionManager
- **Backend**: `app/routers/collaboration.py` - File upload endpoints (in `main.py`)
- **Frontend**: `frontend/src/components/RealTimeCollaboration.tsx` - UI

**Features:**
- Real-time messaging
- File and image sharing
- Message editing and deletion
- Emoji reactions (quick reactions + full emoji picker)
- Read receipts (single/double checkmark)
- Typing indicators
- Online user list
- Workspace management
- Message history
- Optimistic UI updates

**Example Use Cases:**
- Team collaboration on projects
- Real-time document discussion
- Quick team communication
- Share files and images instantly
- React to messages with emojis

---

### 11. 🔐 User Authentication

**What it does:**
Secure user registration, login, and session management.

**How it works:**
- JWT (JSON Web Tokens) for authentication
- Password hashing for security
- Protected routes
- User profile management

**Where it's implemented:**
- **Backend**: `app/services/auth_service.py` - Authentication logic
- **Backend**: `app/routers/auth.py` - Auth endpoints
- **Frontend**: `frontend/src/components/Login.tsx` - Login UI
- **Frontend**: `frontend/src/contexts/AuthContext.tsx` - Auth state

---

### 12. 📈 Statistics Dashboard

**What it does:**
Displays key statistics about your documents and usage.

**Features:**
- Document count
- Usage statistics

**Where it's implemented:**
- **Frontend**: `frontend/src/components/StatsDashboard.tsx` - UI

---

## 🎯 Where and How We Use GenAI

### 1. **RAG (Retrieval-Augmented Generation)**
   - **Used in**: Document Q&A, Report Generator (partially)
   - **Technology**: LangChain + ChromaDB + LLM
   - **Purpose**: Answer questions based on your documents

### 2. **Text Generation**
   - **Used in**: Content Generator, Report Generator, Ticket Responses
   - **Technology**: LLM (Gemini/GPT/Claude)
   - **Purpose**: Generate new text content

### 3. **Text Analysis & Classification**
   - **Used in**: Ticket Classifier, Code Reviewer
   - **Technology**: LLM with classification prompts
   - **Purpose**: Categorize and analyze text

### 4. **Summarization**
   - **Used in**: Text Summarizer
   - **Technology**: LLM with summarization prompts
   - **Purpose**: Condense long text into summaries

### 5. **Translation**
   - **Used in**: Translator
   - **Technology**: LLM with translation prompts
   - **Purpose**: Translate between languages

### 6. **Code Analysis**
   - **Used in**: Code Reviewer
   - **Technology**: LLM with code analysis prompts
   - **Purpose**: Review and analyze code quality

### 7. **Embeddings (Vector Representations)**
   - **Used in**: Document Q&A (RAG), Semantic Search
   - **Technology**: OpenAI Embeddings or Sentence Transformers
   - **Purpose**: Convert text to vectors for similarity search

---

## 🛠️ Technologies Used - Explained

### Backend Technologies

#### **FastAPI**
- **What it is**: Modern Python web framework for building APIs
- **Why we use it**: Fast, automatic API documentation, easy to use
- **What it does**: Handles HTTP requests, routes, and responses
- **Location**: `backend/app/main.py`

#### **LangChain**
- **What it is**: Framework for building AI applications
- **Why we use it**: Simplifies working with LLMs, embeddings, and RAG
- **What it does**: Connects code to AI models, handles text processing
- **Location**: Used in all service files

#### **ChromaDB**
- **What it is**: Vector database (stores data as vectors)
- **Why we use it**: Fast semantic search, free, runs locally
- **What it does**: Stores document chunks as vectors, enables similarity search
- **Location**: `backend/app/services/document_service.py`

#### **LLM (Large Language Models)**
We support multiple LLM providers:

1. **Google Gemini** (Default)
   - **What it is**: Google's AI model
   - **Why we use it**: Free tier available, good performance
   - **What it does**: Generates answers, reviews code, creates reports
   - **Location**: `backend/app/services/qa_service.py`

2. **OpenAI GPT**
   - **What it is**: ChatGPT's underlying model
   - **Why we use it**: Very powerful, widely used
   - **What it does**: Same as Gemini, but requires API key

3. **Anthropic Claude**
   - **What it is**: Anthropic's AI model
   - **Why we use it**: High quality responses
   - **What it does**: Same as above

4. **Ollama** (Local)
   - **What it is**: Run AI models on your computer
   - **Why we use it**: Free, no API keys needed, private
   - **What it does**: Same as above, but runs locally

#### **Embeddings Models**
- **What they are**: Convert text to vectors (numbers)
- **Why we use them**: Enable semantic search
- **Options**:
  - **OpenAI Embeddings**: High quality, requires API key
  - **Sentence Transformers**: Free, runs locally
- **Location**: `backend/app/services/document_service.py`

#### **PyPDF2 & python-docx**
- **What they are**: Libraries to read PDF and Word documents
- **Why we use them**: Extract text from documents
- **What they do**: Convert PDF/DOCX files to readable text
- **Location**: `backend/app/services/document_service.py`

### Frontend Technologies

#### **React**
- **What it is**: JavaScript library for building user interfaces
- **Why we use it**: Popular, component-based, easy to maintain
- **What it does**: Creates the UI you see in the browser
- **Location**: `frontend/src/`

#### **TypeScript**
- **What it is**: JavaScript with type checking
- **Why we use it**: Catches errors early, better code quality
- **What it does**: Makes code more reliable and easier to debug

#### **Vite**
- **What it is**: Build tool for frontend projects
- **Why we use it**: Fast development, quick builds
- **What it does**: Compiles and serves your React app

#### **Tailwind CSS**
- **What it is**: CSS framework for styling
- **Why we use it**: Fast styling, responsive design
- **What it does**: Makes the UI look modern and beautiful

#### **Axios**
- **What it is**: Library for making HTTP requests
- **Why we use it**: Easy to use, handles errors well
- **What it does**: Sends requests to the backend API
- **Location**: `frontend/src/services/api.ts`

---

## 📁 Project Structure

```
project/
├── backend/                          # Python backend
│   ├── app/
│   │   ├── main.py                   # FastAPI app, API endpoints
│   │   ├── models/                   # Data models (schemas)
│   │   │   ├── schemas.py            # Request/response models
│   │   │   └── user_schemas.py      # User authentication models
│   │   ├── routers/                  # API route handlers
│   │   │   ├── auth.py               # Authentication endpoints
│   │   │   ├── documents.py          # Document management
│   │   │   ├── qa.py                 # Q&A endpoints
│   │   │   ├── reports.py            # Report generation
│   │   │   ├── code_review.py        # Code review
│   │   │   ├── tickets.py            # Ticket classification
│   │   │   ├── content.py            # Content generation
│   │   │   ├── summarizer.py         # Text summarization
│   │   │   └── translator.py          # Translation
│   │   └── services/                 # Business logic
│   │       ├── document_service.py   # Document processing & vector storage
│   │       ├── qa_service.py         # RAG implementation (Q&A)
│   │       ├── report_service.py     # AI report generation
│   │       ├── code_reviewer_service.py  # Code review & docs
│   │       ├── ticket_classifier_service.py  # Ticket classification
│   │       ├── content_generator_service.py  # Content generation
│   │       ├── summarizer_service.py  # Text summarization
│   │       ├── translator_service.py  # Translation
│   │       ├── auth_service.py       # User authentication
│   │       └── analytics_service.py   # Analytics tracking
│   ├── requirements.txt              # Python dependencies
│   ├── .env.example                  # Environment variables template
│   └── chroma_db/                    # Vector database storage (auto-created)
│
├── frontend/                         # React frontend
│   ├── src/
│   │   ├── App.tsx                   # Main app component
│   │   ├── components/               # React components
│   │   │   ├── Login.tsx             # Login/Register page
│   │   │   ├── QAChat.tsx            # Document Q&A interface
│   │   │   ├── ReportGenerator.tsx   # Report generation UI
│   │   │   ├── CodeReviewer.tsx      # Code review UI
│   │   │   ├── TicketClassifier.tsx  # Ticket classification UI
│   │   │   ├── ContentGenerator.tsx  # Content generation UI
│   │   │   ├── TextSummarizer.tsx    # Text summarization UI
│   │   │   ├── Translator.tsx        # Translation UI
│   │   │   ├── ImageQ&A.tsx           # Image Q&A UI
│   │   │   ├── MultimodalAI.tsx      # Audio/video processing UI
│   │   │   ├── RealTimeCollaboration.tsx  # Real-time collaboration UI
│   │   │   ├── DocumentUpload.tsx    # Document upload UI
│   │   │   ├── DocumentList.tsx      # Document list UI
│   │   │   ├── StatsDashboard.tsx    # Statistics display
│   │   │   └── UserProfile.tsx       # User profile dropdown
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx       # Authentication state
│   │   ├── services/
│   │   │   └── api.ts                # API client (Axios)
│   │   └── types.ts                  # TypeScript type definitions
│   ├── package.json                  # Node.js dependencies
│   └── vite.config.ts                # Vite configuration
│
└── README.md                         # This file
```

---

## 🚀 Setup Instructions

### Prerequisites

- **Python 3.9+** - [Download here](https://www.python.org/downloads/)
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd Project
```

### Step 2: Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env  # Windows
# OR
cp .env.example .env    # Mac/Linux
```

### Step 3: Configure Environment Variables

Edit `backend/.env`:

```env
# LLM Configuration (choose one)
# Option 1: Google Gemini (Free, recommended for beginners)
GOOGLE_API_KEY=your-google-api-key-here  # Optional, works without it too

# Option 2: OpenAI (requires paid API key)
OPENAI_API_KEY=your-openai-api-key-here

# Option 3: Anthropic Claude (requires paid API key)
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Option 4: Use free local embeddings
USE_FREE_EMBEDDINGS=true

# JWT Secret (for authentication)
JWT_SECRET_KEY=your-secret-key-min-32-characters-long

# ChromaDB storage location
CHROMA_PERSIST_DIRECTORY=./chroma_db
```

**For beginners**: You can start without any API keys! The system will use free local models.

### Step 4: Start Backend Server

```bash
# Make sure you're in backend directory with venv activated
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will run on: `http://localhost:8000`

### Step 5: Frontend Setup

Open a **new terminal window**:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on: `http://localhost:5173`

### Step 6: Access the Application

- **Frontend**: Open `http://localhost:5173` in your browser
- **Backend API Docs**: Open `http://localhost:8000/docs` to see all API endpoints

---

## 📖 How to Use Each Feature

### 1. User Authentication

1. **Register**: Click "Sign Up", enter email, password, and name
2. **Login**: Enter your email and password
3. **Access**: Once logged in, you can access all features

### 2. Document Q&A (RAG)

1. **Upload Document**: 
   - Navigate to Q&A Chat
   - Click "Upload Document" or drag and drop
   - Select PDF/DOCX/TXT file
   - Wait for processing (document is chunked and stored as vectors)

2. **Ask Questions**: 
   - Type your question in the chat input
   - Click send or press Enter
   - AI searches your documents and generates answer

3. **View Sources**: 
   - Each answer shows source citations
   - Click on sources to see which document chunks were used
   - Similarity scores show relevance

**Example Questions**:
- "What is the main topic of this document?"
- "Summarize the key points"
- "What does it say about [specific topic]?"

### 3. AI Report Generator

1. **Select Documents**: 
   - Choose which documents to analyze (or leave empty for all)
   - Documents are shown with checkboxes

2. **Choose Report Type**: 
   - **Comprehensive**: Full detailed analysis
   - **Summary**: Brief overview
   - **KPI Analysis**: Focus on metrics
   - **Insights**: Key findings

3. **Options**:
   - Check "Include Visualization Suggestions" for chart ideas

4. **Generate**: Click "Generate Report"
5. **View Report**: See executive summary, insights, KPIs, and recommendations

### 4. AI Code Reviewer

1. **Choose Input Method**:
   - **Paste Code**: Select "Paste Code" tab, paste your code
   - **Upload File**: Select "Uploaded File" tab, choose a code file

2. **Select Language**: 
   - Choose programming language from dropdown
   - Or select "Auto-detect" for automatic detection

3. **Choose Review Type**:
   - **Comprehensive**: All aspects (quality, security, performance, style)
   - **Security**: Security vulnerabilities and best practices
   - **Performance**: Optimization suggestions
   - **Style**: Code quality and formatting

4. **Review**: Click "Review Code"
5. **View Results**: 
   - Quality score (0-100)
   - Issues categorized by type
   - Suggestions for improvement
   - Code snippets with line numbers

**Generate Documentation**:
1. Follow steps 1-2 above
2. Click "Generate Documentation" tab
3. Choose documentation type:
   - **Technical**: Detailed technical documentation
   - **API**: API documentation
   - **README**: Project README
   - **Inline**: Code comments
4. Get generated documentation

### 5. AI Support Ticket Classifier

1. **Enter Ticket**: 
   - Type or paste support ticket text in the input field
   - Or click on example tickets to use them

2. **Classify**: Click "Classify Ticket"
3. **View Results**: 
   - Category (Technical, Billing, Bug, Feature Request, etc.)
   - Priority (High, Medium, Low)
   - Confidence score

4. **Generate Response**: 
   - Click "Generate Response" to get AI-generated reply
   - Response is context-aware and professional

5. **Batch Process**: 
   - Upload multiple tickets at once
   - Get classifications for all tickets

### 6. AI Content Generator

1. **Select Content Type**: 
   - Blog Post, Email, Social Media, Marketing Copy, etc.

2. **Enter Details**:
   - Topic or subject
   - Tone (Professional, Casual, Creative, etc.)
   - Length (Short, Medium, Long)

3. **Generate**: Click "Generate Content"
4. **View Result**: See generated content, copy, or regenerate

### 7. AI Text Summarizer

1. **Choose Input Method**:
   - **Paste Text**: Paste text directly
   - **Use Document**: Select from uploaded documents

2. **Select Summary Type**:
   - **Concise**: 2-3 sentences
   - **Detailed**: Comprehensive summary
   - **Bullet Points**: Key points list
   - **Executive**: Executive summary format

3. **Set Length** (Optional):
   - Enter max word count (e.g., 100)
   - Leave empty for auto-length

4. **Generate**: Click "Generate Summary"
5. **View Summary**: See condensed version of your text

### 8. AI Translator

1. **Enter Text**: 
   - Paste or type text to translate
   - Or select from uploaded documents

2. **Select Languages**:
   - Source language (or auto-detect)
   - Target language

3. **Translate**: Click "Translate"
4. **View Result**: See translated text, copy, or translate back

5. **Batch Translation**: 
   - Upload multiple texts
   - Translate all at once

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get token
- `GET /api/auth/me` - Get current user (protected)

### Documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents` - List all documents
- `DELETE /api/documents/{id}` - Delete document

### Q&A (RAG)
- `POST /api/qa/ask` - Ask question about documents

### Reports
- `POST /api/reports/generate` - Generate AI report

### Code Review
- `POST /api/code/review` - Review code
- `POST /api/code/documentation` - Generate documentation

### Support Tickets
- `POST /api/tickets/classify` - Classify ticket
- `POST /api/tickets/response` - Generate response
- `POST /api/tickets/batch` - Batch classify tickets

### Content Generation
- `POST /api/content/generate` - Generate content

### Summarization
- `POST /api/summarizer/summarize` - Summarize text

### Translation
- `POST /api/translator/translate` - Translate text
- `POST /api/translator/batch` - Batch translate

### Image Processing
- `POST /api/images/ocr` - Extract text from image (OCR)
- `POST /api/images/analyze` - Analyze image with vision AI

### Multi-modal AI
- `POST /api/multimodal/transcribe` - Transcribe audio file
- `POST /api/multimodal/analyze-video` - Analyze video file

### Real-time Collaboration
- `WS /ws/collaborate/{workspace_id}` - WebSocket endpoint for real-time chat
- `POST /api/collaboration/upload-file/{workspace_id}` - Upload file for collaboration
- `GET /api/collaboration/files/{workspace_id}/{filename}` - Download shared file

**Full API Documentation**: Visit `http://localhost:8000/docs` when server is running

---

## 🎓 Learning Resources

### Understanding RAG
- [LangChain RAG Tutorial](https://python.langchain.com/docs/use_cases/question_answering/)
- [What is RAG?](https://www.pinecone.io/learn/retrieval-augmented-generation/)

### Understanding Vector Databases
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Vector Databases Explained](https://www.pinecone.io/learn/vector-database/)

### Understanding LLMs
- [Large Language Models Explained](https://www.ibm.com/topics/large-language-models)
- [How ChatGPT Works](https://www.youtube.com/watch?v=wjZofJX0v4M)

### Understanding GenAI
- [Generative AI Explained](https://www.ibm.com/topics/generative-ai)
- [Introduction to Generative AI](https://cloud.google.com/learn/what-is-generative-ai)

---

## 🐛 Troubleshooting

### Backend Issues

**Problem**: `ModuleNotFoundError`
- **Solution**: Make sure virtual environment is activated and dependencies are installed

**Problem**: `Port 8000 already in use`
- **Solution**: Change port: `uvicorn app.main:app --reload --port 8001`

**Problem**: API key errors
- **Solution**: Check `.env` file, or use free local models by setting `USE_FREE_EMBEDDINGS=true`

**Problem**: ChromaDB errors
- **Solution**: Delete `chroma_db` folder and restart (will recreate)

### Frontend Issues

**Problem**: `Cannot connect to backend`
- **Solution**: Make sure backend is running on `http://localhost:8000`

**Problem**: `npm install` fails
- **Solution**: Make sure Node.js 18+ is installed, try deleting `node_modules` and `package-lock.json`, then run `npm install` again

**Problem**: Documents not showing after upload
- **Solution**: Check browser console for errors, ensure backend is running

---

## 📝 License

MIT License - Feel free to use this project for learning and portfolio purposes!

---

## 🤝 Contributing

This is a portfolio/learning project. Feel free to:
- Fork and customize
- Add new features
- Improve documentation
- Share with others

---

## 📦 Complete Dependencies List

This section lists **all installed dependencies** for both backend and frontend. Use this as a reference when setting up the project.

### Backend Dependencies (`backend/requirements.txt`)

**Core Framework:**
- `fastapi==0.104.1` - Web framework for building APIs
- `uvicorn[standard]==0.24.0` - ASGI server with standard extras
- `python-multipart==0.0.6` - File upload support

**AI & LLM Libraries:**
- `langchain>=0.1.0` - AI application framework
- `langchain-openai>=0.0.2` - OpenAI integration for LangChain
- `langchain-anthropic>=0.1.0` - Anthropic Claude integration
- `langchain-google-genai>=0.0.6` - Google Gemini integration
- `langchain-community>=0.0.20` - Community integrations
- `openai>=1.6.1` - OpenAI API client
- `anthropic>=0.18.1` - Anthropic API client
- `google-generativeai>=0.3.2` - Google Gemini API client

**Vector Database:**
- `chromadb==0.4.22` - Vector database for embeddings storage

**Document Processing:**
- `pypdf2==3.0.1` - PDF reading and text extraction
- `python-docx==1.1.0` - Word document reading

**Image Processing:**
- `Pillow>=10.0.0` - Image manipulation library
- `pytesseract>=0.3.10` - OCR text extraction from images (requires Tesseract OCR installed on system)

**Audio/Video Processing:**
- `moviepy>=1.0.3` - Video processing and audio extraction (requires FFmpeg)
- `opencv-python>=4.8.0` - Video frame extraction
- `openai-whisper>=20231117` - Audio transcription (requires FFmpeg installed on system)
- `pydub>=0.25.1` - Audio manipulation
- `ffmpeg-python>=0.2.0` - Python wrapper for FFmpeg
- `imageio-ffmpeg>=0.4.0` - FFmpeg wrapper for imageio (dependency of moviepy)

**Whisper Dependencies (installed automatically, listed for clarity):**
- `torch>=2.0.0` - Deep learning framework (required by Whisper)
- `numba>=0.56.0` - JIT compiler (required by Whisper)
- `tiktoken>=0.5.0` - Tokenizer (required by Whisper)

**WebSocket Support:**
- `websockets>=12.0` - WebSocket support
- `python-socketio>=5.10.0` - Socket.IO support

**Embeddings (Free Alternative):**
- `sentence-transformers>=2.2.0,<3.0.0` - Free embeddings model
- `huggingface-hub<0.20.0` - Hugging Face integration
- `numpy<2.0.0,>=1.22.0` - Numerical computing

**Utilities:**
- `python-dotenv==1.0.0` - Environment variables management
- `pydantic==2.5.2` - Data validation
- `pydantic-settings==2.1.0` - Settings management
- `httpx==0.25.2` - HTTP client
- `email-validator>=2.0.0` - Email validation

**Authentication:**
- `python-jose[cryptography]>=3.3.0` - JWT tokens
- `bcrypt>=4.0.0` - Password hashing

### Frontend Dependencies (`frontend/package.json`)

**Core Dependencies:**
- `react@^18.2.0` - UI library
- `react-dom@^18.2.0` - React DOM renderer
- `react-router-dom@^7.9.6` - Routing library

**HTTP & API:**
- `axios@^1.6.2` - HTTP client for API requests

**UI & Styling:**
- `tailwindcss@^3.3.6` - CSS framework (installed as dev dependency but used in production)
- `lucide-react@^0.294.0` - Icon library

**Notifications:**
- `react-hot-toast@^2.6.0` - Toast notification library

**Features:**
- `emoji-picker-react@^4.16.1` - Emoji picker component for reactions

**Charts (Optional):**
- `recharts@^3.5.1` - Chart library for data visualization

**Development Dependencies:**
- `typescript@^5.2.2` - Type checking
- `vite@^5.0.8` - Build tool and dev server
- `@vitejs/plugin-react@^4.2.1` - Vite React plugin
- `@types/react@^18.2.43` - TypeScript types for React
- `@types/react-dom@^18.2.17` - TypeScript types for React DOM
- `@typescript-eslint/eslint-plugin@^6.14.0` - ESLint plugin for TypeScript
- `@typescript-eslint/parser@^6.14.0` - ESLint parser for TypeScript
- `eslint@^8.55.0` - Code linting
- `eslint-plugin-react-hooks@^4.6.0` - ESLint plugin for React hooks
- `eslint-plugin-react-refresh@^0.4.5` - ESLint plugin for React refresh
- `autoprefixer@^10.4.16` - CSS autoprefixing
- `postcss@^8.4.32` - CSS processing

### System Dependencies (Required for Full Functionality)

These must be installed separately on your system (not via pip/npm):

**For Image Q&A (OCR):**
- **Tesseract OCR** - Required for text extraction from images
  - Windows: `winget install UB-Mannheim.TesseractOCR` or download from [GitHub Releases](https://github.com/UB-Mannheim/tesseract/wiki)
  - Mac: `brew install tesseract`
  - Linux: `sudo apt-get install tesseract-ocr`

**For Multi-modal AI (Audio/Video):**
- **FFmpeg** - Required for audio/video processing
  - Windows: `winget install FFmpeg` or download from [FFmpeg website](https://ffmpeg.org/download.html)
  - Mac: `brew install ffmpeg`
  - Linux: `sudo apt-get install ffmpeg`

**Note**: These are optional. The app will work without them, but Image Q&A and Multi-modal AI features will be limited.

### Installation Commands

**Backend:**
```bash
cd backend
python -m venv venv
# Activate venv (Windows: venv\Scripts\activate, Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

---

## 🎉 Summary

This project demonstrates:
- ✅ **RAG (Retrieval-Augmented Generation)** - Modern AI technique for document Q&A
- ✅ **Vector Databases** - Semantic search technology (ChromaDB)
- ✅ **LLM Integration** - Multiple AI model support (Gemini, GPT, Claude, Ollama)
- ✅ **Vision AI** - Image understanding and OCR capabilities
- ✅ **Multi-modal AI** - Audio and video processing
- ✅ **Real-time Collaboration** - WebSocket-based team workspaces
- ✅ **Full-Stack Development** - Backend (FastAPI) + Frontend (React)
- ✅ **Production Features** - Authentication, Analytics, Multiple AI Services
- ✅ **10 AI Features** - Q&A, Reports, Code Review, Tickets, Content, Summarization, Translation, Image Q&A, Multi-modal AI, Real-time Collaboration

**Perfect for**:
- Learning GenAI and RAG
- Portfolio projects
- Understanding modern AI applications
- Building production-ready AI systems
- Demonstrating full-stack AI development skills

**Happy coding! 🚀**

---

## 📧 Contact & Support

For questions, issues, or contributions, please open an issue on the repository.

---

*Last Updated: 2024*
