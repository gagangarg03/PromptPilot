"""
Analytics Router
Handles analytics and metrics endpoints
"""

from fastapi import APIRouter, HTTPException
from app.services.analytics_service import analytics_service

router = APIRouter(
    prefix="/api/analytics",
    tags=["Analytics"],
    responses={404: {"description": "Not found"}},
)

@router.get("/overview")
async def get_analytics_overview():
    """Get overall analytics overview"""
    try:
        if analytics_service is None:
            raise HTTPException(status_code=503, detail="Analytics service not initialized")
        return analytics_service.get_overview()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting analytics: {str(e)}")


@router.get("/questions")
async def get_question_analytics():
    """Get question analytics"""
    try:
        if analytics_service is None:
            raise HTTPException(status_code=503, detail="Analytics service not initialized")
        return analytics_service.get_question_analytics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting question analytics: {str(e)}")


@router.get("/documents")
async def get_document_analytics():
    """Get document analytics"""
    try:
        if analytics_service is None:
            raise HTTPException(status_code=503, detail="Analytics service not initialized")
        return analytics_service.get_document_analytics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting document analytics: {str(e)}")


@router.get("/performance")
async def get_performance_metrics():
    """Get performance metrics"""
    try:
        if analytics_service is None:
            raise HTTPException(status_code=503, detail="Analytics service not initialized")
        return analytics_service.get_performance_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting performance metrics: {str(e)}")

