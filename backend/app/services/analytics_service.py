"""
Analytics service for tracking usage, performance, and insights
"""

import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from collections import defaultdict
import json

# Disable ChromaDB telemetry before import
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")
os.environ.setdefault("CHROMA_TELEMETRY_DISABLED", "True")

# Vector database
import chromadb


class AnalyticsService:
    """Service for analytics and insights"""
    
    def __init__(self):
        # Initialize ChromaDB (same as other services)
        persist_directory = os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_db")
        self.chroma_client = chromadb.PersistentClient(path=persist_directory)
        
        self.collection = self.chroma_client.get_or_create_collection(
            name="documents",
            metadata={"hnsw:space": "cosine"}
        )
        
        # Analytics storage (in production, use database)
        self.analytics_file = os.path.join(persist_directory, "analytics.json")
        self._load_analytics()
    
    def _load_analytics(self):
        """Load analytics data from file"""
        if os.path.exists(self.analytics_file):
            try:
                with open(self.analytics_file, 'r') as f:
                    self.analytics = json.load(f)
            except:
                self.analytics = {
                    "questions": [],
                    "documents": {},
                    "performance": [],
                    "daily_stats": {}
                }
        else:
            self.analytics = {
                "questions": [],
                "documents": {},
                "performance": [],
                "daily_stats": {}
            }
    
    def _save_analytics(self):
        """Save analytics data to file"""
        try:
            os.makedirs(os.path.dirname(self.analytics_file), exist_ok=True)
            with open(self.analytics_file, 'w') as f:
                json.dump(self.analytics, f, default=str)
        except Exception as e:
            print(f"[WARNING] Failed to save analytics: {e}")
    
    def track_question(self, question: str, answer: str, response_time: float, 
                      document_ids: Optional[List[str]] = None, sources_count: int = 0):
        """Track a question asked"""
        entry = {
            "question": question,
            "answer_length": len(answer),
            "response_time": response_time,
            "timestamp": datetime.now().isoformat(),
            "document_ids": document_ids or [],
            "sources_count": sources_count
        }
        
        self.analytics["questions"].append(entry)
        
        # Keep last 1000 questions (most recent)
        if len(self.analytics["questions"]) > 1000:
            self.analytics["questions"] = self.analytics["questions"][-1000:]
        
        # Update document access counts
        if document_ids:
            for doc_id in document_ids:
                self.track_document_access(doc_id)
        
        # Update daily stats
        today = datetime.now().date().isoformat()
        if today not in self.analytics["daily_stats"]:
            self.analytics["daily_stats"][today] = {
                "questions_count": 0,
                "total_response_time": 0,
                "avg_response_time": 0
            }
        
        self.analytics["daily_stats"][today]["questions_count"] += 1
        self.analytics["daily_stats"][today]["total_response_time"] += response_time
        self.analytics["daily_stats"][today]["avg_response_time"] = (
            self.analytics["daily_stats"][today]["total_response_time"] /
            self.analytics["daily_stats"][today]["questions_count"]
        )
        
        self._save_analytics()
    
    def track_document_upload(self, document_id: str, filename: str, chunk_count: int):
        """Track document upload"""
        self.analytics["documents"][document_id] = {
            "filename": filename,
            "chunk_count": chunk_count,
            "upload_date": datetime.now().isoformat(),
            "access_count": 0,
            "last_accessed": None
        }
        self._save_analytics()
    
    def track_document_access(self, document_id: str):
        """Track document access"""
        if document_id in self.analytics["documents"]:
            self.analytics["documents"][document_id]["access_count"] += 1
            self.analytics["documents"][document_id]["last_accessed"] = datetime.now().isoformat()
            self._save_analytics()
    
    def get_overview_stats(self) -> Dict:
        """Get overview statistics"""
        total_questions = len(self.analytics["questions"])
        total_documents = len(self.analytics["documents"])
        
        # Calculate total chunks
        total_chunks = sum(
            doc.get("chunk_count", 0) 
            for doc in self.analytics["documents"].values()
        )
        
        # Calculate average response time
        if self.analytics["questions"]:
            avg_response_time = sum(
                q.get("response_time", 0) 
                for q in self.analytics["questions"]
            ) / len(self.analytics["questions"])
        else:
            avg_response_time = 0
        
        # Get today's stats
        today = datetime.now().date().isoformat()
        today_stats = self.analytics["daily_stats"].get(today, {
            "questions_count": 0,
            "avg_response_time": 0
        })
        
        # Get most active document
        most_active_doc = None
        if self.analytics["documents"]:
            most_active_doc = max(
                self.analytics["documents"].items(),
                key=lambda x: x[1].get("access_count", 0)
            )
        
        return {
            "total_questions": total_questions,
            "total_documents": total_documents,
            "total_chunks": total_chunks,
            "avg_response_time": round(avg_response_time, 2),
            "questions_today": today_stats["questions_count"],
            "avg_response_time_today": round(today_stats.get("avg_response_time", 0), 2),
            "most_active_document": {
                "id": most_active_doc[0] if most_active_doc else None,
                "filename": most_active_doc[1]["filename"] if most_active_doc else None,
                "access_count": most_active_doc[1].get("access_count", 0) if most_active_doc else 0
            } if most_active_doc else None
        }
    
    def get_question_analytics(self, days: int = 7) -> Dict:
        """Get question analytics for last N days"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        recent_questions = [
            q for q in self.analytics["questions"]
            if datetime.fromisoformat(q["timestamp"]) >= cutoff_date
        ]
        
        # Most common questions
        question_counts = defaultdict(int)
        for q in recent_questions:
            question_counts[q["question"].lower()] += 1
        
        most_common = sorted(
            question_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        # Response time distribution
        response_times = [q.get("response_time", 0) for q in recent_questions]
        
        # Questions per day
        daily_questions = defaultdict(int)
        for q in recent_questions:
            date = datetime.fromisoformat(q["timestamp"]).date().isoformat()
            daily_questions[date] += 1
        
        return {
            "total_questions": len(recent_questions),
            "most_common_questions": [
                {"question": q, "count": c} 
                for q, c in most_common
            ],
            "avg_response_time": round(sum(response_times) / len(response_times), 2) if response_times else 0,
            "min_response_time": round(min(response_times), 2) if response_times else 0,
            "max_response_time": round(max(response_times), 2) if response_times else 0,
            "daily_questions": dict(daily_questions),
            "response_time_distribution": {
                "fast": len([rt for rt in response_times if rt < 2]),
                "medium": len([rt for rt in response_times if 2 <= rt < 5]),
                "slow": len([rt for rt in response_times if rt >= 5])
            }
        }
    
    def get_document_analytics(self) -> Dict:
        """Get document analytics"""
        documents = list(self.analytics["documents"].values())
        
        if not documents:
            return {
                "total_documents": 0,
                "total_chunks": 0,
                "most_accessed": [],
                "recent_uploads": [],
                "chunk_distribution": {}
            }
        
        # Most accessed documents
        most_accessed = sorted(
            documents,
            key=lambda x: x.get("access_count", 0),
            reverse=True
        )[:5]
        
        # Recent uploads
        recent_uploads = sorted(
            documents,
            key=lambda x: x.get("upload_date", ""),
            reverse=True
        )[:5]
        
        # Chunk distribution
        chunk_counts = [doc.get("chunk_count", 0) for doc in documents]
        
        return {
            "total_documents": len(documents),
            "total_chunks": sum(chunk_counts),
            "avg_chunks_per_document": round(sum(chunk_counts) / len(chunk_counts), 1) if chunk_counts else 0,
            "most_accessed": [
                {
                    "filename": doc["filename"],
                    "access_count": doc.get("access_count", 0),
                    "chunk_count": doc.get("chunk_count", 0)
                }
                for doc in most_accessed
            ],
            "recent_uploads": [
                {
                    "filename": doc["filename"],
                    "upload_date": doc.get("upload_date", ""),
                    "chunk_count": doc.get("chunk_count", 0)
                }
                for doc in recent_uploads
            ],
            "chunk_distribution": {
                "small": len([c for c in chunk_counts if c < 10]),
                "medium": len([c for c in chunk_counts if 10 <= c < 50]),
                "large": len([c for c in chunk_counts if c >= 50])
            }
        }
    
    def get_performance_metrics(self, days: int = 7) -> Dict:
        """Get performance metrics"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        recent_questions = [
            q for q in self.analytics["questions"]
            if datetime.fromisoformat(q["timestamp"]) >= cutoff_date
        ]
        
        if not recent_questions:
            return {
                "avg_response_time": 0,
                "p95_response_time": 0,
                "p99_response_time": 0,
                "success_rate": 100,
                "total_requests": 0
            }
        
        response_times = sorted([q.get("response_time", 0) for q in recent_questions])
        
        # Calculate percentiles
        p95_index = int(len(response_times) * 0.95)
        p99_index = int(len(response_times) * 0.99)
        
        return {
            "avg_response_time": round(sum(response_times) / len(response_times), 2),
            "p95_response_time": round(response_times[p95_index] if p95_index < len(response_times) else response_times[-1], 2),
            "p99_response_time": round(response_times[p99_index] if p99_index < len(response_times) else response_times[-1], 2),
            "min_response_time": round(min(response_times), 2),
            "max_response_time": round(max(response_times), 2),
            "success_rate": 100,  # Could track errors separately
            "total_requests": len(recent_questions)
        }

