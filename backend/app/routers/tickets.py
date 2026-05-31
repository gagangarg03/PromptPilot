"""
Support Ticket Router
Handles AI-powered ticket classification and response generation
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.models.schemas import TicketRequest, TicketResponseRequest, BatchTicketRequest
from app.services.ticket_classifier_service import ticket_classifier_service

router = APIRouter(
    prefix="/api/tickets",
    tags=["Support Tickets"],
    responses={404: {"description": "Not found"}},
)

@router.post("/classify")
async def classify_ticket(request: TicketRequest):
    """Classify a support ticket and suggest category/priority"""
    try:
        if ticket_classifier_service is None:
            return JSONResponse(
                status_code=503,
                content={"detail": "Ticket classifier service not initialized"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        result = await ticket_classifier_service.classify_ticket(
            ticket_text=request.ticket_text,
            use_document_context=request.use_document_context,
            document_ids=request.document_ids
        )
        
        return JSONResponse(
            status_code=200,
            content=result,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        print(f"[ERROR] Ticket classification error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error classifying ticket: {str(e)}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


@router.post("/generate-response")
async def generate_ticket_response(request: TicketResponseRequest):
    """Generate an AI-powered response to a support ticket"""
    try:
        if ticket_classifier_service is None:
            return JSONResponse(
                status_code=503,
                content={"detail": "Ticket classifier service not initialized"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        result = await ticket_classifier_service.generate_response(
            ticket_text=request.ticket_text,
            category=request.category,
            priority=request.priority,
            use_document_context=request.use_document_context,
            document_ids=request.document_ids,
            response_style=request.response_style
        )
        
        return JSONResponse(
            status_code=200,
            content=result,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        print(f"[ERROR] Ticket response generation error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error generating response: {str(e)}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )


@router.post("/batch-classify")
async def batch_classify_tickets(request: BatchTicketRequest):
    """Classify multiple tickets at once"""
    try:
        if ticket_classifier_service is None:
            return JSONResponse(
                status_code=503,
                content={"detail": "Ticket classifier service not initialized"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        results = await ticket_classifier_service.batch_classify(
            tickets=request.tickets,
            use_document_context=request.use_document_context
        )
        
        return JSONResponse(
            status_code=200,
            content=results,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        print(f"[ERROR] Batch ticket classification error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error classifying tickets: {str(e)}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )

