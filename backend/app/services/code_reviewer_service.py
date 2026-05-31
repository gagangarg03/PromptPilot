"""
AI Code Reviewer & Documentation Generator Service
Analyzes code files and generates technical documentation, reviews, and suggestions
"""

import os
import re
from typing import Dict, List, Optional
from datetime import datetime

from app.services.qa_service import QAService
from app.services.document_service import DocumentService


class CodeReviewerService:
    """Service for code review and documentation generation"""
    
    def __init__(self):
        self.qa_service = QAService()
        self.document_service = DocumentService()
        
        # Supported code file extensions
        self.code_extensions = {
            '.py': 'python',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.go': 'go',
            '.rs': 'rust',
            '.php': 'php',
            '.rb': 'ruby',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.sql': 'sql',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.vue': 'vue',
            '.sh': 'bash',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.json': 'json',
            '.xml': 'xml'
        }
    
    async def review_code(
        self,
        document_id: Optional[str] = None,
        code_text: Optional[str] = None,
        language: Optional[str] = None,
        review_type: str = "comprehensive"
    ) -> Dict:
        """
        Review code and provide feedback
        
        Args:
            document_id: ID of the code document to review (if using uploaded file)
            code_text: Raw code text to review (if not using document_id)
            language: Programming language (required if using code_text)
            review_type: Type of review (comprehensive, security, performance, style)
        
        Returns:
            Dictionary containing review results
        """
        try:
            # Determine if using document or raw code
            doc = None
            filename = "code_snippet.txt"  # Default filename
            
            # Check if code_text is provided
            has_code_text = (
                code_text is not None 
                and isinstance(code_text, str) 
                and code_text.strip() != "" 
                and len(code_text.strip()) > 0
            )
            
            if has_code_text:
                # Using raw code text - doc MUST be None
                doc = None
                if not language:
                    # Try to detect language from code
                    language = self._detect_language_from_code(code_text)
                if not language:
                    language = "unknown"
                filename = f"code_snippet.{self._get_extension_from_language(language)}"
            elif document_id:
                # Get document
                documents = await self.document_service.list_documents()
                doc = next((d for d in documents if d.document_id == document_id), None)
                
                if not doc:
                    return {"error": "Document not found"}
                
                # Determine language from file extension
                language = self.code_extensions.get(doc.file_type.lower(), "unknown")
                filename = doc.filename
            else:
                return {"error": "Either document_id or code_text must be provided"}
            
            # Ensure filename is always set
            if not filename:
                filename = "code_snippet.txt"
            
            # CRITICAL: Ensure doc is None when using code_text
            if has_code_text:
                doc = None
            
            # Generate review based on type
            review_results = {}
            
            # Helper to safely call review methods
            async def safe_review(method_name, coro):
                try:
                    result = await coro
                    return result
                except Exception as e:
                    error_str = str(e)
                    return {"error": f"{method_name} failed: {error_str}"}
            
            if review_type == "comprehensive" or review_type == "all":
                review_results["code_quality"] = await safe_review("code_quality", self._review_code_quality(doc, language, code_text))
                review_results["security"] = await safe_review("security", self._review_security(doc, language, code_text))
                review_results["performance"] = await safe_review("performance", self._review_performance(doc, language, code_text))
                review_results["best_practices"] = await safe_review("best_practices", self._review_best_practices(doc, language, code_text))
                review_results["documentation"] = await safe_review("documentation", self._review_documentation(doc, language, code_text))
            elif review_type == "security":
                review_results["security"] = await safe_review("security", self._review_security(doc, language, code_text))
            elif review_type == "performance":
                review_results["performance"] = await safe_review("performance", self._review_performance(doc, language, code_text))
            elif review_type == "style":
                review_results["code_quality"] = await safe_review("code_quality", self._review_code_quality(doc, language, code_text))
                review_results["best_practices"] = await safe_review("best_practices", self._review_best_practices(doc, language, code_text))
            
            # Generate overall score
            overall_score = self._calculate_score(review_results)
            
            return {
                "review_id": f"review_{datetime.now().timestamp()}",
                "document_id": document_id,
                "filename": filename,
                "language": language,
                "review_type": review_type,
                "generated_at": datetime.now().isoformat(),
                "overall_score": overall_score,
                "reviews": review_results,
                "model_used": self.qa_service.model_name
            }
        except Exception as e:
            error_msg = str(e)
            if "'NoneType' object has no attribute 'filename'" in error_msg or "filename" in error_msg.lower():
                return {"error": "Error: Invalid document or code input"}
            return {"error": f"Error: {error_msg}"}
    
    async def generate_documentation(
        self,
        document_id: Optional[str] = None,
        code_text: Optional[str] = None,
        language: Optional[str] = None,
        doc_type: str = "technical"
    ) -> Dict:
        """
        Generate technical documentation from code
        
        Args:
            document_id: ID of the code document (if using uploaded file)
            code_text: Raw code text (if not using document_id)
            language: Programming language (required if using code_text)
            doc_type: Type of documentation (technical, api, readme, inline)
        
        Returns:
            Dictionary containing generated documentation
        """
        # Determine if using document or raw code
        doc = None
        filename = "code_snippet.txt"  # Default filename
        
        if document_id:
            documents = await self.document_service.list_documents()
            doc = next((d for d in documents if d.document_id == document_id), None)
            
            if not doc:
                return {"error": "Document not found"}
            
            language = self.code_extensions.get(doc.file_type.lower(), "unknown")
            filename = doc.filename
        elif code_text:
            if not language:
                language = self._detect_language_from_code(code_text)
            filename = f"code_snippet.{self._get_extension_from_language(language)}"
        else:
            return {"error": "Either document_id or code_text must be provided"}
        
        if doc_type == "technical":
            documentation = await self._generate_technical_docs(doc, language, code_text)
        elif doc_type == "api":
            documentation = await self._generate_api_docs(doc, language, code_text)
        elif doc_type == "readme":
            documentation = await self._generate_readme(doc, language, code_text)
        elif doc_type == "inline":
            documentation = await self._generate_inline_docs(doc, language, code_text)
        else:
            documentation = await self._generate_technical_docs(doc, language, code_text)
        
        return {
            "documentation_id": f"doc_{datetime.now().timestamp()}",
            "document_id": document_id if document_id else None,
            "filename": filename,
            "language": language,
            "doc_type": doc_type,
            "generated_at": datetime.now().isoformat(),
            "documentation": documentation,
            "model_used": self.qa_service.model_name,
            "source": "document" if document_id else "text"
        }
    
    def _get_code_content(self, doc, code_text: Optional[str]) -> str:
        """Get code content from either document or raw text"""
        if code_text:
            return code_text
        # For document-based, we'll use the document_id in the prompt
        return None
    
    def _detect_language_from_code(self, code_text: str) -> str:
        """Detect programming language from code text"""
        code_lower = code_text.lower()
        
        # Simple heuristics
        if 'def ' in code_text and 'import ' in code_text:
            return 'python'
        elif 'function ' in code_text or 'const ' in code_text or 'let ' in code_text:
            return 'javascript'
        elif 'public class' in code_text or 'public static void main' in code_text:
            return 'java'
        elif '#include' in code_text or 'int main' in code_text:
            return 'cpp'
        elif 'package ' in code_text and 'func ' in code_text:
            return 'go'
        elif 'fn ' in code_text and 'fn main' in code_text:
            return 'rust'
        else:
            return 'unknown'
    
    def _get_extension_from_language(self, language: str) -> str:
        """Get file extension from language name"""
        lang_map = {
            'python': 'py',
            'javascript': 'js',
            'typescript': 'ts',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'csharp': 'cs',
            'go': 'go',
            'rust': 'rs',
            'php': 'php',
            'ruby': 'rb',
            'swift': 'swift',
            'kotlin': 'kt',
            'sql': 'sql'
        }
        return lang_map.get(language, 'txt')
    
    async def _review_code_quality(self, doc, language: str, code_text: Optional[str] = None) -> Dict:
        """Review code quality and style"""
        # Safety check: if code_text is provided, doc MUST be None
        if code_text and doc is not None:
            doc = None
        
        # Use direct LLM call if we have code_text and no document
        if code_text and doc is None:
            prompt = f"""Review this {language} code and provide a CONCISE, user-friendly analysis:

```{language}
{code_text}
```

Format your response as:
**Overall Assessment:** (1-2 sentences)
**Key Issues:** (bullet points, max 5)
**Suggestions:** (bullet points, max 5)

Keep it brief and actionable. For simple code, be brief. Only mention significant issues."""
            
            # Use LLM directly for raw code text
            try:
                answer = await self._call_llm_directly(prompt)
                issues = self._extract_issues(answer, "quality")
                return {
                    "review": answer,
                    "issues": issues,
                    "severity": "medium",
                    "suggestions_count": len(issues)
                }
            except Exception as e:
                return {"error": str(e)}
        elif doc is not None:
            prompt = f"""Review the {language} code in this document and provide a CONCISE, user-friendly analysis.

Format your response as:
**Overall Assessment:** (1-2 sentences)
**Key Issues:** (bullet points, max 5)
**Suggestions:** (bullet points, max 5)

Keep it brief and actionable. For simple code, be brief. Only mention significant issues."""
            
            try:
                response = await self.qa_service.ask_question(
                    question=prompt,
                    document_ids=[doc.document_id]
                )
                
                issues = self._extract_issues(response.answer, "quality")
                
                return {
                    "review": response.answer,
                    "issues": issues,
                    "severity": "medium",
                    "suggestions_count": len(issues)
                }
            except Exception as e:
                return {"error": str(e)}
        else:
            return {"error": "Either code_text or doc must be provided"}
    
    async def _review_security(self, doc, language: str, code_text: Optional[str] = None) -> Dict:
        """Review code for security vulnerabilities"""
        # Safety check: if code_text is provided, doc MUST be None
        if code_text and doc is not None:
            doc = None
        
        if code_text and doc is None:
            prompt = f"""Review this {language} code for security issues. Provide a CONCISE analysis:

```{language}
{code_text}
```

Format your response as:
**Security Status:** (1 sentence - "Secure" or "Issues found")
**Vulnerabilities:** (bullet points, only if found, max 5)
**Recommendations:** (bullet points, only if needed, max 5)

Be brief. If code is simple and secure, just say "No security issues found." Don't over-explain."""
            try:
                answer = await self._call_llm_directly(prompt)
                issues = self._extract_issues(answer, "security")
                severity = self._assess_severity(issues)
                return {
                    "review": answer,
                    "issues": issues,
                    "severity": severity,
                    "critical_count": len([i for i in issues if i.get("severity") == "critical"]),
                    "high_count": len([i for i in issues if i.get("severity") == "high"])
                }
            except Exception as e:
                return {"error": str(e)}
        elif doc is not None:
            prompt = f"""Review the {language} code for security issues. Provide a CONCISE analysis.

Format your response as:
**Security Status:** (1 sentence - "Secure" or "Issues found")
**Vulnerabilities:** (bullet points, only if found, max 5)
**Recommendations:** (bullet points, only if needed, max 5)

Be brief. If code is simple and secure, just say "No security issues found." Don't over-explain."""
            
            try:
                response = await self.qa_service.ask_question(
                    question=prompt,
                    document_ids=[doc.document_id]
                )
                
                issues = self._extract_issues(response.answer, "security")
                severity = self._assess_severity(issues)
                
                return {
                    "review": response.answer,
                    "issues": issues,
                    "severity": severity,
                    "critical_count": len([i for i in issues if i.get("severity") == "critical"]),
                    "high_count": len([i for i in issues if i.get("severity") == "high"])
                }
            except Exception as e:
                return {"error": str(e)}
    
    async def _review_performance(self, doc, language: str, code_text: Optional[str] = None) -> Dict:
        """Review code for performance issues"""
        # Safety check: if code_text is provided, doc MUST be None
        if code_text and doc is not None:
            doc = None
        
        if code_text and doc is None:
            prompt = f"""Review this {language} code for performance. Provide a CONCISE analysis:

```{language}
{code_text}
```

Format your response as:
**Performance Status:** (1 sentence)
**Issues:** (bullet points, only if found, max 5)
**Optimizations:** (bullet points, only if needed, max 5)

Be brief. For simple code, just say "Performance is adequate for this simple code." Don't over-explain."""
            try:
                answer = await self._call_llm_directly(prompt)
                issues = self._extract_issues(answer, "performance")
                return {
                    "review": answer,
                    "issues": issues,
                    "optimization_opportunities": len(issues)
                }
            except Exception as e:
                return {"error": str(e)}
        elif doc is not None:
            prompt = f"""Review the {language} code for performance. Provide a CONCISE analysis.

Format your response as:
**Performance Status:** (1 sentence)
**Issues:** (bullet points, only if found, max 5)
**Optimizations:** (bullet points, only if needed, max 5)

Be brief. For simple code, just say "Performance is adequate for this simple code." Don't over-explain."""
            
            try:
                response = await self.qa_service.ask_question(
                    question=prompt,
                    document_ids=[doc.document_id]
                )
                
                issues = self._extract_issues(response.answer, "performance")
                
                return {
                    "review": response.answer,
                    "issues": issues,
                    "optimization_opportunities": len(issues)
                }
            except Exception as e:
                return {"error": str(e)}
    
    async def _review_best_practices(self, doc, language: str, code_text: Optional[str] = None) -> Dict:
        """Review code against best practices"""
        # Safety check: if code_text is provided, doc MUST be None
        if code_text and doc is not None:
            doc = None
        
        if code_text and doc is None:
            prompt = f"""Review this {language} code for best practices. Provide a CONCISE analysis:

```{language}
{code_text}
```

Format your response as:
**Overall:** (1-2 sentences)
**Best Practices:** (bullet points, what's good, max 3)
**Improvements:** (bullet points, what to improve, max 5)

Be brief and practical. For simple code, keep it simple."""
            try:
                answer = await self._call_llm_directly(prompt)
                issues = self._extract_issues(answer, "best_practices")
                return {
                    "review": answer,
                    "issues": issues,
                    "best_practices_adherence": "good" if len(issues) < 5 else "needs_improvement"
                }
            except Exception as e:
                return {"error": str(e)}
        elif doc is not None:
            prompt = f"""Review the {language} code for best practices. Provide a CONCISE analysis.

Format your response as:
**Overall:** (1-2 sentences)
**Best Practices:** (bullet points, what's good, max 3)
**Improvements:** (bullet points, what to improve, max 5)

Be brief and practical. For simple code, keep it simple."""
            
            try:
                response = await self.qa_service.ask_question(
                    question=prompt,
                    document_ids=[doc.document_id]
                )
                
                issues = self._extract_issues(response.answer, "best_practices")
                
                return {
                    "review": response.answer,
                    "issues": issues,
                    "best_practices_adherence": "good" if len(issues) < 5 else "needs_improvement"
                }
            except Exception as e:
                return {"error": str(e)}
    
    async def _review_documentation(self, doc, language: str, code_text: Optional[str] = None) -> Dict:
        """Review existing documentation"""
        # Safety check: if code_text is provided, doc MUST be None
        if code_text and doc is not None:
            doc = None
        
        if code_text and doc is None:
            prompt = f"""Review documentation in this {language} code. Provide a CONCISE analysis:

```{language}
{code_text}
```

Format your response as:
**Documentation Status:** (1 sentence)
**What's Missing:** (bullet points, max 5)
**Recommendations:** (bullet points, max 5)

Be brief. If code is simple and self-explanatory, say so."""
            try:
                answer = await self._call_llm_directly(prompt)
                return {
                    "review": answer,
                    "completeness": "assessed",
                    "suggestions": answer
                }
            except Exception as e:
                return {"error": str(e)}
        elif doc is not None:
            prompt = f"""Review documentation in the {language} code. Provide a CONCISE analysis.

Format your response as:
**Documentation Status:** (1 sentence)
**What's Missing:** (bullet points, max 5)
**Recommendations:** (bullet points, max 5)

Be brief. If code is simple and self-explanatory, say so."""
            
            try:
                response = await self.qa_service.ask_question(
                    question=prompt,
                    document_ids=[doc.document_id]
                )
                
                return {
                    "review": response.answer,
                    "completeness": "assessed",
                    "suggestions": response.answer
                }
            except Exception as e:
                return {"error": str(e)}
    
    async def _generate_technical_docs(self, doc, language: str, code_text: Optional[str] = None) -> Dict:
        """Generate technical documentation"""
        if code_text and doc is None:
            prompt = f"""Generate comprehensive technical documentation for the following {language} code:

```{language}
{code_text}
```

Include:
1. Overview and purpose
2. Architecture and design
3. Key components and modules
4. Function/class descriptions
5. Data structures used
6. Dependencies and requirements
7. Usage examples

Format as structured technical documentation."""
            try:
                answer = await self._call_llm_directly(prompt)
                return {
                    "documentation": answer,
                    "format": "technical",
                    "sections": self._extract_sections(answer)
                }
            except Exception as e:
                return {"error": str(e)}
        elif doc is not None:
            prompt = f"""Generate comprehensive technical documentation for the {language} code.
        
        Include:
        1. Overview and purpose
        2. Architecture and design
        3. Key components and modules
        4. Function/class descriptions
        5. Data structures used
        6. Dependencies and requirements
        7. Usage examples
        
        Format as structured technical documentation."""
            
            try:
                response = await self.qa_service.ask_question(
                    question=prompt,
                    document_ids=[doc.document_id]
                )
                
                return {
                    "documentation": response.answer,
                    "format": "technical",
                    "sections": self._extract_sections(response.answer)
                }
            except Exception as e:
                return {"error": str(e)}
    
    async def _generate_api_docs(self, doc, language: str, code_text: Optional[str] = None) -> Dict:
        """Generate API documentation"""
        if code_text and doc is None:
            prompt = f"""Generate API documentation for the following {language} code:

```{language}
{code_text}
```

Document:
1. All public functions/methods
2. Parameters and return types
3. Request/response formats
4. Error codes and handling
5. Authentication requirements
6. Rate limiting
7. Example requests and responses

Format as API reference documentation."""
            try:
                answer = await self._call_llm_directly(prompt)
                return {
                    "documentation": answer,
                    "format": "api",
                    "endpoints": self._extract_endpoints(answer)
                }
            except Exception as e:
                return {"error": str(e)}
        elif doc is not None:
            prompt = f"""Generate API documentation for the {language} code.
        
        Document:
        1. All public functions/methods
        2. Parameters and return types
        3. Request/response formats
        4. Error codes and handling
        5. Authentication requirements
        6. Rate limiting
        7. Example requests and responses
        
        Format as API reference documentation."""
            
            try:
                response = await self.qa_service.ask_question(
                    question=prompt,
                    document_ids=[doc.document_id]
                )
                
                return {
                    "documentation": response.answer,
                    "format": "api",
                    "endpoints": self._extract_endpoints(response.answer)
                }
            except Exception as e:
                return {"error": str(e)}
    
    async def _generate_readme(self, doc, language: str, code_text: Optional[str] = None) -> Dict:
        """Generate README documentation"""
        if code_text and doc is None:
            prompt = f"""Generate a comprehensive README.md file for the following {language} code:

```{language}
{code_text}
```

Include:
1. Project title and description
2. Features
3. Installation instructions
4. Usage examples
5. Configuration
6. Contributing guidelines
7. License information

Format as a README.md file."""
            try:
                answer = await self._call_llm_directly(prompt)
                return {
                    "documentation": answer,
                    "format": "readme",
                    "markdown": True
                }
            except Exception as e:
                return {"error": str(e)}
        elif doc is not None:
            prompt = f"""Generate a comprehensive README.md file for the {language} code.
        
        Include:
        1. Project title and description
        2. Features
        3. Installation instructions
        4. Usage examples
        5. Configuration
        6. Contributing guidelines
        7. License information
        
        Format as a README.md file."""
            
            try:
                response = await self.qa_service.ask_question(
                    question=prompt,
                    document_ids=[doc.document_id]
                )
                
                return {
                    "documentation": response.answer,
                    "format": "readme",
                    "markdown": True
                }
            except Exception as e:
                return {"error": str(e)}
    
    async def _generate_inline_docs(self, doc, language: str, code_text: Optional[str] = None) -> Dict:
        """Generate inline documentation/comments"""
        if code_text and doc is None:
            prompt = f"""Generate inline documentation comments for the following {language} code:

```{language}
{code_text}
```

Add:
1. Function/method docstrings
2. Parameter descriptions
3. Return value descriptions
4. Usage examples in comments
5. Class documentation

Format as inline comments appropriate for {language}."""
            try:
                answer = await self._call_llm_directly(prompt)
                return {
                    "documentation": answer,
                    "format": "inline",
                    "comment_style": language
                }
            except Exception as e:
                return {"error": str(e)}
        elif doc is not None:
            prompt = f"""Generate inline documentation comments for the {language} code.
        
        Add:
        1. Function/method docstrings
        2. Parameter descriptions
        3. Return value descriptions
        4. Usage examples in comments
        5. Class documentation
        
        Format as inline comments appropriate for {language}."""
            
            try:
                response = await self.qa_service.ask_question(
                    question=prompt,
                    document_ids=[doc.document_id]
                )
                
                return {
                    "documentation": response.answer,
                    "format": "inline",
                    "comment_style": language
                }
            except Exception as e:
                return {"error": str(e)}
    
    def _extract_issues(self, text: str, issue_type: str) -> List[Dict]:
        """Extract issues from review text"""
        issues = []
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line or len(line) < 10:
                continue
            
            # Look for numbered items or bullet points
            if line[0].isdigit() or line.startswith('-') or line.startswith('•'):
                clean_line = line.lstrip('0123456789.-•) ').strip()
                if clean_line:
                    severity = self._detect_severity(clean_line, issue_type)
                    issues.append({
                        "description": clean_line,
                        "type": issue_type,
                        "severity": severity
                    })
        
        return issues[:20]  # Limit to top 20
    
    def _detect_severity(self, text: str, issue_type: str) -> str:
        """Detect severity from text"""
        text_lower = text.lower()
        
        if issue_type == "security":
            if any(word in text_lower for word in ["critical", "severe", "exploit", "vulnerability"]):
                return "critical"
            elif any(word in text_lower for word in ["high", "important", "serious"]):
                return "high"
            elif any(word in text_lower for word in ["medium", "moderate"]):
                return "medium"
            else:
                return "low"
        else:
            if any(word in text_lower for word in ["critical", "major", "important"]):
                return "high"
            elif any(word in text_lower for word in ["minor", "small", "low"]):
                return "low"
            else:
                return "medium"
    
    def _assess_severity(self, issues: List[Dict]) -> str:
        """Assess overall severity"""
        if not issues:
            return "none"
        
        severities = [i.get("severity", "low") for i in issues]
        if "critical" in severities:
            return "critical"
        elif "high" in severities:
            return "high"
        elif "medium" in severities:
            return "medium"
        else:
            return "low"
    
    def _calculate_score(self, reviews: Dict) -> Dict:
        """Calculate overall review score"""
        total_issues = 0
        critical_issues = 0
        
        for review_type, review_data in reviews.items():
            if isinstance(review_data, dict) and "issues" in review_data:
                issues = review_data.get("issues", [])
                total_issues += len(issues)
                critical_issues += len([i for i in issues if i.get("severity") == "critical"])
        
        # Calculate score (0-100)
        if total_issues == 0:
            score = 100
        else:
            # Penalize based on issues, more penalty for critical
            score = max(0, 100 - (total_issues * 2) - (critical_issues * 10))
        
        return {
            "score": score,
            "grade": self._get_grade(score),
            "total_issues": total_issues,
            "critical_issues": critical_issues,
            "status": "excellent" if score >= 90 else "good" if score >= 70 else "needs_improvement" if score >= 50 else "poor"
        }
    
    def _get_grade(self, score: int) -> str:
        """Get letter grade from score"""
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"
    
    def _extract_sections(self, text: str) -> List[str]:
        """Extract section headers from documentation"""
        sections = []
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            # Look for markdown headers
            if line.startswith('#') or (line and line.isupper() and len(line) < 50):
                sections.append(line.lstrip('#').strip())
        
        return sections[:10]
    
    def _extract_endpoints(self, text: str) -> List[str]:
        """Extract API endpoints from documentation"""
        endpoints = []
        lines = text.split('\n')
        
        for line in lines:
            # Look for HTTP methods and paths
            if any(method in line.upper() for method in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']):
                endpoints.append(line.strip())
        
        return endpoints[:20]
    
    async def _call_llm_directly(self, prompt: str) -> str:
        """Call LLM directly without document retrieval"""
        from langchain_core.messages import HumanMessage, SystemMessage
        
        system_prompt = """You are an expert code reviewer and technical documentation generator. 
Analyze code and provide detailed, actionable feedback and documentation."""
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=prompt)
        ]
        
        try:
            # Use the LLM from qa_service
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

