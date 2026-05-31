"""
AI Support Ticket Classifier & Auto-Responder Service
Automatically categorizes support tickets and generates smart responses
"""

import os
from typing import Dict, List, Optional
from datetime import datetime
from enum import Enum

from app.services.qa_service import QAService
from app.services.document_service import DocumentService


class TicketCategory(str, Enum):
    """Support ticket categories"""
    TECHNICAL = "technical"
    BILLING = "billing"
    FEATURE_REQUEST = "feature_request"
    BUG_REPORT = "bug_report"
    ACCOUNT = "account"
    GENERAL = "general"
    URGENT = "urgent"


class TicketPriority(str, Enum):
    """Ticket priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"
    CRITICAL = "critical"


class TicketClassifierService:
    """Service for classifying and responding to support tickets"""
    
    def __init__(self):
        self.qa_service = QAService()
        self.document_service = DocumentService()
        
        # Common categories and keywords
        self.category_keywords = {
            TicketCategory.TECHNICAL: ["error", "bug", "crash", "not working", "broken", "issue", "problem", "technical"],
            TicketCategory.BILLING: ["payment", "invoice", "charge", "billing", "refund", "subscription", "cost", "price"],
            TicketCategory.FEATURE_REQUEST: ["feature", "add", "suggest", "improvement", "enhancement", "new"],
            TicketCategory.BUG_REPORT: ["bug", "error", "defect", "glitch", "malfunction", "failure"],
            TicketCategory.ACCOUNT: ["login", "password", "account", "access", "permission", "user"],
            TicketCategory.URGENT: ["urgent", "critical", "emergency", "asap", "immediately", "down"]
        }
    
    async def classify_ticket(
        self,
        ticket_text: str,
        use_document_context: bool = False,
        document_ids: Optional[List[str]] = None
    ) -> Dict:
        """
        Classify a support ticket
        
        Args:
            ticket_text: The support ticket text
            use_document_context: Whether to use document knowledge base for context
            document_ids: Optional document IDs to use for context
        
        Returns:
            Dictionary containing classification results
        """
        # Classify category
        category_result = await self._classify_category(ticket_text, use_document_context, document_ids)
        
        # Determine priority
        priority_result = await self._classify_priority(ticket_text, category_result)
        
        # Extract key information
        key_info = await self._extract_key_info(ticket_text)
        
        # Suggest tags
        tags = self._suggest_tags(ticket_text, category_result)
        
        return {
            "ticket_id": f"ticket_{datetime.now().timestamp()}",
            "classified_at": datetime.now().isoformat(),
            "category": category_result,
            "priority": priority_result,
            "key_information": key_info,
            "tags": tags,
            "confidence": category_result.get("confidence", 0.0),
            "model_used": self.qa_service.model_name
        }
    
    async def generate_response(
        self,
        ticket_text: str,
        category: str,
        priority: str,
        use_document_context: bool = True,
        document_ids: Optional[List[str]] = None,
        response_style: str = "professional"
    ) -> Dict:
        """
        Generate an automated response to a support ticket
        
        Args:
            ticket_text: The support ticket text
            category: Ticket category
            priority: Ticket priority
            use_document_context: Whether to use document knowledge base
            document_ids: Optional document IDs for context
            response_style: Response style (professional, friendly, technical)
        
        Returns:
            Dictionary containing generated response
        """
        # First classify if not already done
        classification = await self.classify_ticket(ticket_text, use_document_context, document_ids)
        
        # Generate response based on category and priority
        response_prompt = self._build_response_prompt(
            ticket_text,
            category,
            priority,
            response_style
        )
        
        try:
            if use_document_context and document_ids:
                response = await self.qa_service.ask_question(
                    question=response_prompt,
                    document_ids=document_ids
                )
                response_text = response.answer
                sources = response.sources
            else:
                # Use general knowledge
                response = await self.qa_service.ask_question(
                    question=response_prompt,
                    document_ids=None
                )
                response_text = response.answer
                sources = response.sources
            
            # Enhance response with additional context
            enhanced_response = await self._enhance_response(
                response_text,
                ticket_text,
                category,
                priority
            )
            
            return {
                "response_id": f"response_{datetime.now().timestamp()}",
                "generated_at": datetime.now().isoformat(),
                "response": enhanced_response,
                "original_response": response_text,
                "category": category,
                "priority": priority,
                "sources_used": len(sources),
                "response_style": response_style,
                "suggested_actions": self._suggest_actions(category, priority),
                "model_used": self.qa_service.model_name
            }
        except Exception as e:
            return {
                "error": str(e),
                "fallback_response": self._generate_fallback_response(category, priority)
            }
    
    async def batch_classify(
        self,
        tickets: List[str],
        use_document_context: bool = False
    ) -> Dict:
        """
        Classify multiple tickets at once
        
        Args:
            tickets: List of ticket texts
            use_document_context: Whether to use document context
        
        Returns:
            Dictionary containing batch classification results
        """
        results = []
        
        for ticket_text in tickets:
            classification = await self.classify_ticket(
                ticket_text,
                use_document_context
            )
            results.append({
                "ticket_text": ticket_text[:100] + "..." if len(ticket_text) > 100 else ticket_text,
                "classification": classification
            })
        
        # Aggregate statistics
        categories = [r["classification"]["category"]["category"] for r in results]
        priorities = [r["classification"]["priority"]["priority"] for r in results]
        
        return {
            "batch_id": f"batch_{datetime.now().timestamp()}",
            "processed_at": datetime.now().isoformat(),
            "total_tickets": len(tickets),
            "results": results,
            "statistics": {
                "category_distribution": self._count_distribution(categories),
                "priority_distribution": self._count_distribution(priorities),
                "average_confidence": sum(r["classification"]["confidence"] for r in results) / len(results) if results else 0
            }
        }
    
    async def _classify_category(
        self,
        ticket_text: str,
        use_context: bool,
        document_ids: Optional[List[str]]
    ) -> Dict:
        """Classify ticket into a category"""
        prompt = f"""Analyze this support ticket and classify it into one of these categories:
        - technical: Technical issues, errors, bugs
        - billing: Payment, invoices, subscriptions
        - feature_request: Requests for new features
        - bug_report: Reports of bugs or defects
        - account: Account access, login, permissions
        - general: General inquiries
        - urgent: Urgent or critical issues
        
        Ticket text: "{ticket_text}"
        
        Provide:
        1. The most appropriate category
        2. Confidence level (0-1)
        3. Reasoning for the classification
        4. Alternative categories if applicable"""
        
        try:
            if use_context and document_ids:
                response = await self.qa_service.ask_question(
                    question=prompt,
                    document_ids=document_ids
                )
            else:
                response = await self.qa_service.ask_question(
                    question=prompt,
                    document_ids=None
                )
            
            # Parse category from response
            category = self._parse_category(response.answer)
            confidence = self._extract_confidence(response.answer)
            
            return {
                "category": category,
                "confidence": confidence,
                "reasoning": response.answer,
                "alternatives": self._find_alternatives(ticket_text)
            }
        except Exception as e:
            # Fallback to keyword-based classification
            return {
                "category": self._keyword_classify(ticket_text),
                "confidence": 0.6,
                "reasoning": "Keyword-based classification",
                "error": str(e)
            }
    
    async def _classify_priority(
        self,
        ticket_text: str,
        category_result: Dict
    ) -> Dict:
        """Determine ticket priority"""
        prompt = f"""Determine the priority level for this support ticket.
        
        Ticket: "{ticket_text}"
        Category: {category_result.get('category', 'unknown')}
        
        Priority levels:
        - critical: System down, data loss, security breach
        - urgent: Major functionality broken, high impact
        - high: Important issue affecting users
        - medium: Moderate impact, standard issue
        - low: Minor issue, enhancement request
        
        Provide priority level and reasoning."""
        
        try:
            response = await self.qa_service.ask_question(
                question=prompt,
                document_ids=None
            )
            
            priority = self._parse_priority(response.answer)
            
            return {
                "priority": priority,
                "reasoning": response.answer,
                "estimated_resolution_time": self._estimate_resolution_time(priority, category_result.get('category'))
            }
        except Exception as e:
            return {
                "priority": self._keyword_priority(ticket_text),
                "reasoning": "Keyword-based priority",
                "error": str(e)
            }
    
    async def _extract_key_info(self, ticket_text: str) -> Dict:
        """Extract key information from ticket"""
        prompt = f"""Extract key information from this support ticket:
        
        "{ticket_text}"
        
        Extract:
        1. User/account information mentioned
        2. Error messages or codes
        3. Steps to reproduce (if applicable)
        4. System/environment details
        5. Timestamps or dates
        6. Contact information
        
        Format as structured data."""
        
        try:
            response = await self.qa_service.ask_question(
                question=prompt,
                document_ids=None
            )
            
            return {
                "extracted_info": response.answer,
                "has_error_message": "error" in ticket_text.lower() or "exception" in ticket_text.lower(),
                "has_steps": "step" in ticket_text.lower() or "reproduce" in ticket_text.lower(),
                "word_count": len(ticket_text.split())
            }
        except Exception as e:
            return {"error": str(e)}
    
    def _build_response_prompt(
        self,
        ticket_text: str,
        category: str,
        priority: str,
        style: str
    ) -> str:
        """Build prompt for generating response"""
        style_instructions = {
            "professional": "Use professional, courteous language. Be clear and concise.",
            "friendly": "Use warm, friendly language. Show empathy and understanding.",
            "technical": "Use technical language. Include specific details and solutions."
        }
        
        return f"""Generate a {style} support ticket response.
        
        {style_instructions.get(style, style_instructions['professional'])}
        
        Ticket: "{ticket_text}"
        Category: {category}
        Priority: {priority}
        
        The response should:
        1. Acknowledge the issue
        2. Show understanding of the problem
        3. Provide helpful information or next steps
        4. Set appropriate expectations
        5. Offer additional assistance if needed
        
        Keep the response concise but complete."""
    
    async def _enhance_response(
        self,
        response_text: str,
        ticket_text: str,
        category: str,
        priority: str
    ) -> str:
        """Enhance response with additional context"""
        # Add priority-specific language
        if priority in ["urgent", "critical"]:
            response_text = f"[High Priority] {response_text}"
        
        # Add category-specific closing
        closings = {
            "technical": "If you need further technical assistance, please don't hesitate to reach out.",
            "billing": "If you have any billing questions, our team is here to help.",
            "bug_report": "Thank you for reporting this. We'll investigate and keep you updated.",
            "feature_request": "We appreciate your suggestion and will consider it for future updates."
        }
        
        closing = closings.get(category, "Please let us know if you need any further assistance.")
        response_text = f"{response_text}\n\n{closing}"
        
        return response_text
    
    def _suggest_actions(self, category: str, priority: str) -> List[str]:
        """Suggest actions based on category and priority"""
        actions = []
        
        if priority in ["urgent", "critical"]:
            actions.append("Escalate to senior support team")
            actions.append("Set up immediate follow-up")
        
        if category == "technical":
            actions.append("Request system logs")
            actions.append("Schedule technical review")
        elif category == "billing":
            actions.append("Review account history")
            actions.append("Verify payment method")
        elif category == "bug_report":
            actions.append("Add to bug tracking system")
            actions.append("Assign to development team")
        
        actions.append("Send acknowledgment email")
        actions.append("Update ticket status")
        
        return actions
    
    def _generate_fallback_response(self, category: str, priority: str) -> str:
        """Generate a fallback response if AI generation fails"""
        return f"""Thank you for contacting support. We have received your {category} ticket and marked it as {priority} priority.
        
        Our team will review your request and respond as soon as possible. For urgent matters, please contact us directly.
        
        Ticket Reference: {datetime.now().strftime('%Y%m%d-%H%M%S')}
        
        Best regards,
        Support Team"""
    
    def _parse_category(self, text: str) -> str:
        """Parse category from response text"""
        text_lower = text.lower()
        
        for category in TicketCategory:
            if category.value in text_lower:
                return category.value
        
        # Keyword fallback
        return self._keyword_classify(text)
    
    def _parse_priority(self, text: str) -> str:
        """Parse priority from response text"""
        text_lower = text.lower()
        
        priority_map = {
            "critical": TicketPriority.CRITICAL,
            "urgent": TicketPriority.URGENT,
            "high": TicketPriority.HIGH,
            "medium": TicketPriority.MEDIUM,
            "low": TicketPriority.LOW
        }
        
        for key, priority in priority_map.items():
            if key in text_lower:
                return priority.value
        
        return TicketPriority.MEDIUM.value
    
    def _extract_confidence(self, text: str) -> float:
        """Extract confidence score from text"""
        import re
        # Look for percentage or decimal
        patterns = [
            r'(\d+\.?\d*)\s*%',
            r'confidence[:\s]+(\d+\.?\d*)',
            r'(\d+\.?\d*)\s*out of 1',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                value = float(match.group(1))
                if value > 1:
                    return value / 100
                return value
        
        return 0.7  # Default confidence
    
    def _keyword_classify(self, text: str) -> str:
        """Fallback keyword-based classification"""
        text_lower = text.lower()
        scores = {}
        
        for category, keywords in self.category_keywords.items():
            score = sum(1 for keyword in keywords if keyword in text_lower)
            scores[category.value] = score
        
        if scores:
            return max(scores, key=scores.get)
        return TicketCategory.GENERAL.value
    
    def _keyword_priority(self, text: str) -> str:
        """Fallback keyword-based priority"""
        text_lower = text.lower()
        
        urgent_keywords = ["urgent", "critical", "emergency", "asap", "immediately", "down", "broken"]
        high_keywords = ["important", "major", "significant", "affecting"]
        low_keywords = ["minor", "small", "enhancement", "suggestion"]
        
        if any(kw in text_lower for kw in urgent_keywords):
            return TicketPriority.URGENT.value
        elif any(kw in text_lower for kw in high_keywords):
            return TicketPriority.HIGH.value
        elif any(kw in text_lower for kw in low_keywords):
            return TicketPriority.LOW.value
        else:
            return TicketPriority.MEDIUM.value
    
    def _suggest_tags(self, text: str, category_result: Dict) -> List[str]:
        """Suggest tags for the ticket"""
        tags = [category_result.get("category", "general")]
        
        text_lower = text.lower()
        
        # Add technology tags
        tech_keywords = {
            "api": ["api", "endpoint", "rest"],
            "database": ["database", "db", "sql", "query"],
            "authentication": ["login", "auth", "password", "token"],
            "payment": ["payment", "stripe", "paypal", "billing"],
            "mobile": ["mobile", "ios", "android", "app"],
            "web": ["website", "browser", "frontend", "ui"]
        }
        
        for tag, keywords in tech_keywords.items():
            if any(kw in text_lower for kw in keywords):
                tags.append(tag)
        
        return list(set(tags))[:5]  # Limit to 5 unique tags
    
    def _find_alternatives(self, text: str) -> List[str]:
        """Find alternative category suggestions"""
        alternatives = []
        scores = {}
        
        for category, keywords in self.category_keywords.items():
            score = sum(1 for keyword in keywords if keyword in text.lower())
            if score > 0:
                scores[category.value] = score
        
        # Get top 2 alternatives
        sorted_categories = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        alternatives = [cat for cat, _ in sorted_categories[1:3]]  # Skip the top one
        
        return alternatives
    
    def _estimate_resolution_time(self, priority: str, category: str) -> str:
        """Estimate resolution time"""
        time_map = {
            TicketPriority.CRITICAL: "1-2 hours",
            TicketPriority.URGENT: "4-8 hours",
            TicketPriority.HIGH: "1-2 business days",
            TicketPriority.MEDIUM: "3-5 business days",
            TicketPriority.LOW: "1-2 weeks"
        }
        
        return time_map.get(TicketPriority(priority), "3-5 business days")
    
    def _count_distribution(self, items: List[str]) -> Dict[str, int]:
        """Count distribution of items"""
        distribution = {}
        for item in items:
            distribution[item] = distribution.get(item, 0) + 1
        return distribution

