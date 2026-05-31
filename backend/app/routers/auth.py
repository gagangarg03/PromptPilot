"""
Authentication Router
Handles user registration, login, and token management
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.user_schemas import UserCreate, UserLogin, UserResponse, Token
from app.services.auth_service import auth_service
from datetime import timedelta
import os

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
    responses={404: {"description": "Not found"}},
)

security = HTTPBearer()

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """Register a new user"""
    try:
        if auth_service is None:
            raise HTTPException(status_code=503, detail="Auth service not initialized")
        
        user = auth_service.create_user(user_data)
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error registering user: {str(e)}")


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login and get access token"""
    try:
        if auth_service is None:
            raise HTTPException(status_code=503, detail="Auth service not initialized")
        
        user = auth_service.authenticate_user(credentials.email, credentials.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=30 * 24 * 60)  # 30 days
        access_token = auth_service.create_access_token(
            data={"sub": user.email},
            expires_delta=access_token_expires
        )
        
        return Token(access_token=access_token, token_type="bearer")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error logging in: {str(e)}")


@router.get("/me", response_model=UserResponse)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    try:
        if auth_service is None:
            return JSONResponse(
                status_code=503,
                content={"detail": "Auth service not initialized"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        token = credentials.credentials
        email = auth_service.verify_token(token)
        if email is None:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or expired token"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        user = auth_service.get_user_by_email(email)
        if not user:
            return JSONResponse(
                status_code=404,
                content={"detail": "User not found"},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        return JSONResponse(
            status_code=200,
            content={
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": user.created_at.isoformat(),
                "is_active": user.is_active
            },
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error getting user: {str(e)}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
            }
        )

