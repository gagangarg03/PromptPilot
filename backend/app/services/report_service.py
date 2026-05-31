"""
AI Report Generator Service
Generates comprehensive reports from documents with KPI analysis, insights, and visualizations
"""

import os
from typing import Dict, List, Optional
from datetime import datetime
import json

from app.services.qa_service import QAService
from app.services.document_service import DocumentService


class ReportService:
    """Service for generating AI-powered reports from documents"""
    
    def __init__(self):
        self.qa_service = QAService()
        self.document_service = DocumentService()
    
    async def generate_report(
        self,
        document_ids: Optional[List[str]] = None,
        report_type: str = "comprehensive",
        include_visualizations: bool = True
    ) -> Dict:
        """
        Generate a comprehensive report from documents
        
        Args:
            document_ids: Optional list of specific document IDs to analyze
            report_type: Type of report (comprehensive, summary, kpi, insights)
            include_visualizations: Whether to include visualization suggestions
        
        Returns:
            Dictionary containing report data
        """
        # Get all documents or specific ones
        all_documents = await self.document_service.list_documents()
        
        if document_ids:
            documents = [d for d in all_documents if d.document_id in document_ids]
        else:
            documents = all_documents
        
        if not documents:
            return {
                "error": "No documents found",
                "report": None
            }
        
        # Generate different sections of the report
        report_sections = {}
        
        # 1. Executive Summary
        summary = await self._generate_summary(documents)
        report_sections["executive_summary"] = summary
        
        # 2. Key Insights
        insights = await self._extract_insights(documents)
        report_sections["key_insights"] = insights
        
        # 3. KPI Analysis (if applicable)
        if report_type in ["comprehensive", "kpi"]:
            kpis = await self._extract_kpis(documents)
            report_sections["kpi_analysis"] = kpis
        
        # 4. Document Analysis
        document_analysis = await self._analyze_documents(documents)
        report_sections["document_analysis"] = document_analysis
        
        # 5. Recommendations
        recommendations = await self._generate_recommendations(documents, insights)
        report_sections["recommendations"] = recommendations
        
        # 6. Visualization suggestions
        if include_visualizations:
            visualizations = self._suggest_visualizations(kpis if "kpi_analysis" in report_sections else {})
            report_sections["visualization_suggestions"] = visualizations
        
        # Compile full report
        report = {
            "report_id": f"report_{datetime.now().timestamp()}",
            "generated_at": datetime.now().isoformat(),
            "report_type": report_type,
            "documents_analyzed": len(documents),
            "document_ids": [d.document_id for d in documents],
            "sections": report_sections,
            "metadata": {
                "total_documents": len(documents),
                "total_chunks": sum(d.chunk_count for d in documents),
                "model_used": self.qa_service.model_name
            }
        }
        
        return report
    
    async def _generate_summary(self, documents: List) -> Dict:
        """Generate executive summary from documents"""
        # Create a comprehensive question to get summary
        summary_prompt = """Please provide a comprehensive executive summary of the key information in these documents. 
        Include:
        1. Main topics and themes
        2. Key findings or conclusions
        3. Important dates, numbers, or metrics
        4. Overall context and purpose
        
        Be concise but thorough (3-5 paragraphs)."""
        
        try:
            response = await self.qa_service.ask_question(
                question=summary_prompt,
                document_ids=[d.document_id for d in documents]
            )
            
            return {
                "summary": response.answer,
                "sources": len(response.sources),
                "generated_at": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "summary": f"Error generating summary: {str(e)}",
                "sources": 0,
                "error": str(e)
            }
    
    async def _extract_insights(self, documents: List) -> Dict:
        """Extract key insights from documents"""
        insights_prompt = """Analyze the documents and extract the most important insights. 
        Provide:
        1. Top 5-7 key insights or findings
        2. Trends or patterns identified
        3. Notable observations
        4. Critical information that stands out
        
        Format as a numbered list with brief explanations."""
        
        try:
            response = await self.qa_service.ask_question(
                question=insights_prompt,
                document_ids=[d.document_id for d in documents]
            )
            
            # Parse insights into structured format
            insights_list = self._parse_insights(response.answer)
            
            return {
                "insights": insights_list,
                "full_text": response.answer,
                "count": len(insights_list),
                "sources": len(response.sources)
            }
        except Exception as e:
            return {
                "insights": [],
                "error": str(e)
            }
    
    async def _extract_kpis(self, documents: List) -> Dict:
        """Extract KPIs and metrics from documents"""
        kpi_prompt = """Identify and extract all Key Performance Indicators (KPIs), metrics, numbers, percentages, 
        financial data, and quantitative measurements from these documents.
        
        For each metric found, provide:
        - Metric name
        - Value
        - Unit (if applicable)
        - Context or description
        
        Format as a structured list."""
        
        try:
            response = await self.qa_service.ask_question(
                question=kpi_prompt,
                document_ids=[d.document_id for d in documents]
            )
            
            kpis = self._parse_kpis(response.answer)
            
            return {
                "kpis": kpis,
                "count": len(kpis),
                "full_text": response.answer,
                "sources": len(response.sources)
            }
        except Exception as e:
            return {
                "kpis": [],
                "error": str(e)
            }
    
    async def _analyze_documents(self, documents: List) -> List[Dict]:
        """Analyze individual documents"""
        analysis = []
        
        for doc in documents:
            analysis_prompt = f"""Analyze the document "{doc.filename}" and provide:
            1. Main topic or subject
            2. Key points covered
            3. Document type/category
            4. Important dates or timeframes
            5. Key entities (people, organizations, locations) mentioned"""
            
            try:
                response = await self.qa_service.ask_question(
                    question=analysis_prompt,
                    document_ids=[doc.document_id]
                )
                
                analysis.append({
                    "document_id": doc.document_id,
                    "filename": doc.filename,
                    "file_type": doc.file_type,
                    "upload_date": doc.upload_date.isoformat(),
                    "chunk_count": doc.chunk_count,
                    "analysis": response.answer,
                    "sources": len(response.sources)
                })
            except Exception as e:
                analysis.append({
                    "document_id": doc.document_id,
                    "filename": doc.filename,
                    "error": str(e)
                })
        
        return analysis
    
    async def _generate_recommendations(self, documents: List, insights: Dict) -> Dict:
        """Generate actionable recommendations based on documents and insights"""
        recommendations_prompt = """Based on the documents analyzed, provide:
        1. Actionable recommendations
        2. Areas that need attention
        3. Opportunities identified
        4. Next steps or follow-up actions
        
        Format as a prioritized list with brief explanations."""
        
        try:
            response = await self.qa_service.ask_question(
                question=recommendations_prompt,
                document_ids=[d.document_id for d in documents]
            )
            
            recommendations_list = self._parse_recommendations(response.answer)
            
            return {
                "recommendations": recommendations_list,
                "full_text": response.answer,
                "count": len(recommendations_list),
                "priority": "high" if len(recommendations_list) > 0 else "none"
            }
        except Exception as e:
            return {
                "recommendations": [],
                "error": str(e)
            }
    
    def _parse_insights(self, text: str) -> List[str]:
        """Parse insights from text into structured list"""
        insights = []
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            # Look for numbered or bulleted items
            if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
                # Remove numbering/bullets
                clean_line = line.lstrip('0123456789.-•) ').strip()
                if clean_line and len(clean_line) > 10:  # Filter out very short items
                    insights.append(clean_line)
        
        return insights[:7]  # Limit to top 7
    
    def _parse_kpis(self, text: str) -> List[Dict]:
        """Parse KPIs from text into structured format"""
        kpis = []
        lines = text.split('\n')
        
        current_kpi = {}
        for line in lines:
            line = line.strip()
            if not line:
                if current_kpi:
                    kpis.append(current_kpi)
                    current_kpi = {}
                continue
            
            # Try to extract metric name and value
            if ':' in line or '-' in line:
                parts = line.split(':', 1) if ':' in line else line.split('-', 1)
                if len(parts) == 2:
                    name = parts[0].strip()
                    value = parts[1].strip()
                    current_kpi = {
                        "name": name,
                        "value": value,
                        "unit": self._extract_unit(value),
                        "type": self._classify_metric_type(name, value)
                    }
                    kpis.append(current_kpi)
                    current_kpi = {}
        
        if current_kpi:
            kpis.append(current_kpi)
        
        return kpis
    
    def _parse_recommendations(self, text: str) -> List[Dict]:
        """Parse recommendations from text"""
        recommendations = []
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
                clean_line = line.lstrip('0123456789.-•) ').strip()
                if clean_line and len(clean_line) > 15:
                    recommendations.append({
                        "text": clean_line,
                        "priority": "high" if any(word in clean_line.lower() for word in ["critical", "urgent", "important", "must"]) else "medium"
                    })
        
        return recommendations[:10]  # Limit to top 10
    
    def _extract_unit(self, value_str: str) -> Optional[str]:
        """Extract unit from value string"""
        units = ['%', 'USD', '$', 'EUR', 'GBP', 'kg', 'g', 'lb', 'km', 'm', 'cm', 'mm', 'hours', 'days', 'months', 'years']
        for unit in units:
            if unit.lower() in value_str.lower():
                return unit
        return None
    
    def _classify_metric_type(self, name: str, value: str) -> str:
        """Classify metric type"""
        name_lower = name.lower()
        value_lower = value.lower()
        
        if any(word in name_lower for word in ['revenue', 'sales', 'income', 'profit', 'cost', 'price', 'budget']):
            return "financial"
        elif any(word in name_lower for word in ['user', 'customer', 'client', 'visitor', 'subscriber']):
            return "user_metrics"
        elif any(word in name_lower for word in ['time', 'duration', 'period', 'date']):
            return "temporal"
        elif '%' in value_lower or 'percent' in value_lower:
            return "percentage"
        elif any(word in name_lower for word in ['rate', 'ratio', 'efficiency', 'performance']):
            return "performance"
        else:
            return "general"
    
    def _suggest_visualizations(self, kpis: Dict) -> List[Dict]:
        """Suggest visualizations based on KPIs"""
        suggestions = []
        
        if not kpis or "kpis" not in kpis:
            return suggestions
        
        kpi_list = kpis.get("kpis", [])
        
        # Group KPIs by type
        financial_kpis = [k for k in kpi_list if k.get("type") == "financial"]
        user_kpis = [k for k in kpi_list if k.get("type") == "user_metrics"]
        performance_kpis = [k for k in kpi_list if k.get("type") == "performance"]
        
        if financial_kpis:
            suggestions.append({
                "type": "bar_chart",
                "title": "Financial Metrics Overview",
                "description": "Bar chart showing key financial indicators",
                "data_type": "financial"
            })
            suggestions.append({
                "type": "line_chart",
                "title": "Financial Trends",
                "description": "Line chart showing financial trends over time",
                "data_type": "financial"
            })
        
        if user_kpis:
            suggestions.append({
                "type": "pie_chart",
                "title": "User Metrics Distribution",
                "description": "Pie chart showing user-related metrics",
                "data_type": "user_metrics"
            })
        
        if performance_kpis:
            suggestions.append({
                "type": "gauge_chart",
                "title": "Performance Indicators",
                "description": "Gauge chart showing performance metrics",
                "data_type": "performance"
            })
        
        if len(kpi_list) > 0:
            suggestions.append({
                "type": "dashboard",
                "title": "KPI Dashboard",
                "description": "Comprehensive dashboard with all key metrics",
                "data_type": "mixed"
            })
        
        return suggestions

