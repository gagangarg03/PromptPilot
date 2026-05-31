"""
Authentication service for user management
"""

import os
import json
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import HTTPException, status
from app.models.user_schemas import UserCreate, UserResponse

# JWT settings
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production-min-32-chars")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days


class AuthService:
    """Service for authentication and user management"""
    
    def __init__(self):
        persist_directory = os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_db")
        self.users_file = os.path.join(persist_directory, "users.json")
        self._load_users()
    
    def _load_users(self):
        """Load users from file"""
        if os.path.exists(self.users_file):
            try:
                with open(self.users_file, 'r') as f:
                    self.users = json.load(f)
            except:
                self.users = {}
        else:
            self.users = {}
            self._save_users()
    
    def _save_users(self):
        """Save users to file"""
        try:
            os.makedirs(os.path.dirname(self.users_file), exist_ok=True)
            with open(self.users_file, 'w') as f:
                json.dump(self.users, f, default=str)
        except Exception as e:
            print(f"[WARNING] Failed to save users: {e}")
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        try:
            # Encode password to bytes
            password_bytes = plain_password.encode('utf-8')
            hash_bytes = hashed_password.encode('utf-8')
            return bcrypt.checkpw(password_bytes, hash_bytes)
        except Exception:
            return False
    
    def get_password_hash(self, password: str) -> str:
        """Hash a password"""
        # Encode password to bytes
        password_bytes = password.encode('utf-8')
        # Generate salt and hash
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        # Return as string
        return hashed.decode('utf-8')
    
    def create_user(self, user_data: UserCreate) -> UserResponse:
        """Create a new user"""
        email = user_data.email.lower()
        
        # Reload users to ensure we have the latest data
        self._load_users()
        
        # Check if user already exists
        if email in self.users:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered. Please login instead."
            )
        
        # Create user
        user_id = f"user_{datetime.now().timestamp()}"
        hashed_password = self.get_password_hash(user_data.password)
        
        user = {
            "id": user_id,
            "email": email,
            "full_name": user_data.full_name or "",
            "hashed_password": hashed_password,
            "created_at": datetime.now().isoformat(),
            "is_active": True
        }
        
        self.users[email] = user
        self._save_users()
        
        return UserResponse(
            id=user_id,
            email=email,
            full_name=user_data.full_name,
            created_at=datetime.fromisoformat(user["created_at"]),
            is_active=True
        )
    
    def authenticate_user(self, email: str, password: str) -> Optional[UserResponse]:
        """Authenticate a user"""
        email = email.lower()
        user = self.users.get(email)
        
        if not user:
            return None
        
        if not self.verify_password(password, user["hashed_password"]):
            return None
        
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        return UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user.get("full_name"),
            created_at=datetime.fromisoformat(user["created_at"]),
            is_active=user.get("is_active", True)
        )
    
    def get_user_by_email(self, email: str) -> Optional[UserResponse]:
        """Get user by email"""
        email = email.lower()
        user = self.users.get(email)
        
        if not user:
            return None
        
        return UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user.get("full_name"),
            created_at=datetime.fromisoformat(user["created_at"]),
            is_active=user.get("is_active", True)
        )
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[str]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                return None
            return email
        except JWTError:
            return None

