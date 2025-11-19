from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from functools import wraps
import json
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import menu scraper
from menu_scraper import scrape_and_save_menu, scrape_and_save_menu_async

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_DAYS = 30

# LLM Configuration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app without a prefix
app = FastAPI()

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Simple in-memory cache (for production, use Redis)
cache_store = {}

def cache_response(expire_seconds: int = 300):
    """Simple cache decorator"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Create cache key from function name and user_id
            current_user = kwargs.get('current_user')
            if current_user:
                cache_key = f"{func.__name__}:{current_user['id']}"
                
                # Check cache
                if cache_key in cache_store:
                    cached_data, timestamp = cache_store[cache_key]
                    if (datetime.now(timezone.utc).timestamp() - timestamp) < expire_seconds:
                        logger.info(f"Cache hit: {cache_key}")
                        return cached_data
                
                # Execute function
                result = await func(*args, **kwargs)
                
                # Store in cache
                cache_store[cache_key] = (result, datetime.now(timezone.utc).timestamp())
                return result
            else:
                return await func(*args, **kwargs)
        return wrapper
    return decorator

# Create routers with versioning
api_router = APIRouter(prefix="/api")  # Current version (v1)
api_v1_router = APIRouter(prefix="/api/v1")  # Explicit v1

security = HTTPBearer()

# ============= Models =============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    name: str
    meal_plan_amount: float
    semester: str = "fall"  # fall, spring, summer
    is_admin: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSignup(BaseModel):
    email: EmailStr
    password: str
    name: str
    meal_plan_amount: float
    semester: str = "fall"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    token: str
    user: Dict[str, Any]

class Receipt(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    image_url: str
    ocr_text: str
    parsed_data: Dict[str, Any]
    total_amount: float
    items: List[Dict[str, Any]]
    receipt_date: datetime
    memo: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    receipt_id: str
    item_name: str
    category: str  # meal, salad, drinks, convenience
    price: float
    quantity: int
    transaction_date: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    price: float
    description: Optional[str] = None
    available_date: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItemCreate(BaseModel):
    name: str
    category: str
    price: float
    description: Optional[str] = None

class CafeMenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    item_id: str
    name: str
    description: str
    station: str
    meal_period: str  # breakfast, lunch, dinner
    start_time: str
    end_time: str
    dietary_tags: List[str] = []
    calories: Optional[int] = None
    date: str  # YYYY-MM-DD
    scraped_at: str

class ScraperSettings(BaseModel):
    auto_scrape_enabled: bool = True
    scrape_time: str = "04:00"  # Time in HH:MM format
    last_scrape_date: Optional[str] = None
    last_scrape_status: Optional[str] = None

class AnalyticsData(BaseModel):
    total_spent: float
    transactions_count: int
    spending_by_category: Dict[str, float]
    recent_transactions: List[Dict[str, Any]]
    spending_trend: List[Dict[str, Any]]

# ============= Semester Utilities =============

def get_semester_dates(semester: str, year: int) -> tuple:
    """Get start and end dates for a semester"""
    if semester == "fall":
        # Fall Term: August 25 - January 19 (spans years)
        start = datetime(year, 8, 25, tzinfo=timezone.utc)
        end = datetime(year + 1, 1, 19, 23, 59, 59, tzinfo=timezone.utc)
    elif semester == "spring":
        # Spring Term: December 1 - January 18 (spans years)
        start = datetime(year, 12, 1, tzinfo=timezone.utc)
        end = datetime(year + 1, 1, 18, 23, 59, 59, tzinfo=timezone.utc)
    elif semester == "summer":
        # Summer Term: May 1 - May 16
        start = datetime(year, 5, 1, tzinfo=timezone.utc)
        end = datetime(year, 5, 16, 23, 59, 59, tzinfo=timezone.utc)
    else:
        # Default to fall
        start = datetime(year, 8, 25, tzinfo=timezone.utc)
        end = datetime(year + 1, 1, 19, 23, 59, 59, tzinfo=timezone.utc)
    
    return start, end

def get_current_semester_info(semester: str) -> dict:
    """Calculate weeks remaining and recommended weekly spending"""
    now = datetime.now(timezone.utc)
    current_year = now.year
    
    # Try current year first
    start, end = get_semester_dates(semester, current_year)
    
    # If semester hasn't started yet, it might be from previous year
    if now < start:
        start, end = get_semester_dates(semester, current_year - 1)
    
    # If semester ended, use next year
    if now > end:
        start, end = get_semester_dates(semester, current_year + 1)
    
    # Calculate days and weeks remaining
    if now < start:
        days_remaining = (end - start).days
        weeks_remaining = days_remaining / 7
        days_until_start = (start - now).days
        status = "upcoming"
    elif now > end:
        days_remaining = 0
        weeks_remaining = 0
        days_until_start = 0
        status = "ended"
    else:
        days_remaining = (end - now).days
        weeks_remaining = max(days_remaining / 7, 0.5)  # At least 0.5 weeks
        days_until_start = 0
        status = "active"
    
    total_days = (end - start).days
    total_weeks = total_days / 7
    
    return {
        "semester": semester,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "status": status,
        "total_weeks": round(total_weeks, 1),
        "weeks_remaining": round(weeks_remaining, 1),
        "days_remaining": days_remaining,
        "days_until_start": days_until_start
    }

# ============= Auth Utilities =============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    payload = {
        'user_id': user_id,
        'exp': expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if not current_user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ============= Routes =============

@api_router.get("/")
async def root():
    return {"message": "MakersTab API"}

@api_router.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Check database connection
        await db.command("ping")
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    # Check cache
    cache_status = "healthy" if isinstance(cache_store, dict) else "unhealthy"
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "version": "1.0.0",
        "database": db_status,
        "cache": cache_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# Auth Routes
@api_router.post("/auth/signup", response_model=AuthResponse)
@limiter.limit("5/minute")  # Prevent signup spam
async def signup(request: Request, input: UserSignup):
    # Check if user exists
    existing = await db.users.find_one({"email": input.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_data = input.model_dump()
    user_data['password_hash'] = hash_password(user_data.pop('password'))
    
    # First user becomes admin
    user_count = await db.users.count_documents({})
    user_data['is_admin'] = (user_count == 0)
    
    user_obj = User(**user_data)
    
    doc = user_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    token = create_token(user_obj.id)
    # Exclude _id and password_hash from response
    user_response = {k: v for k, v in doc.items() if k not in ['password_hash', '_id']}
    
    return {"token": token, "user": user_response}

@api_router.post("/auth/login", response_model=AuthResponse)
@limiter.limit("10/minute")  # Prevent brute force
async def login(request: Request, input: UserLogin):
    user = await db.users.find_one({"email": input.email}, {"_id": 0})
    if not user or not verify_password(input.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['id'])
    user_response = {k: v for k, v in user.items() if k != 'password_hash'}
    
    return {"token": token, "user": user_response}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {k: v for k, v in current_user.items() if k != 'password_hash'}

@api_router.get("/semester-info")
@cache_response(expire_seconds=300)  # Cache for 5 minutes
async def get_semester_info(current_user: dict = Depends(get_current_user)):
    semester = current_user.get('semester', 'fall')
    semester_info = get_current_semester_info(semester)
    
    # Get spending data
    total_transactions = await db.transactions.find(
        {"user_id": current_user['id']},
        {"_id": 0, "price": 1, "quantity": 1}
    ).to_list(10000)
    
    total_spent = sum(t['price'] * t['quantity'] for t in total_transactions)
    
    # Calculate budget metrics
    remaining_balance = current_user.get('meal_plan_amount', 0)
    original_budget = remaining_balance + total_spent
    
    weeks_remaining = semester_info['weeks_remaining']
    total_weeks = semester_info['total_weeks']
    weeks_elapsed = total_weeks - weeks_remaining
    
    # Calculate recommended weekly spending
    if weeks_remaining > 0:
        recommended_weekly = remaining_balance / weeks_remaining
    else:
        recommended_weekly = 0
    
    # Calculate ideal/expected spending rate
    if total_weeks > 0:
        ideal_weekly_rate = original_budget / total_weeks
    else:
        ideal_weekly_rate = 0
    
    # Calculate actual spending rate
    if weeks_elapsed > 0:
        actual_weekly_rate = total_spent / weeks_elapsed
    else:
        actual_weekly_rate = 0
    
    # Determine budget status
    if weeks_elapsed > 0:
        expected_spent_by_now = ideal_weekly_rate * weeks_elapsed
        spending_difference = total_spent - expected_spent_by_now
        
        if abs(spending_difference) < (ideal_weekly_rate * 0.2):  # Within 20%
            budget_status = "on_track"
            status_message = "You're on track!"
        elif spending_difference > 0:
            budget_status = "over_budget"
            status_message = "Spending faster than planned"
        else:
            budget_status = "under_budget"
            status_message = "Spending slower than planned"
    else:
        budget_status = "on_track"
        status_message = "Semester just started"
        spending_difference = 0
    
    # Calculate percentage of budget used vs time elapsed
    budget_used_percentage = (total_spent / original_budget * 100) if original_budget > 0 else 0
    time_elapsed_percentage = (weeks_elapsed / total_weeks * 100) if total_weeks > 0 else 0
    
    return {
        **semester_info,
        "remaining_balance": remaining_balance,
        "original_budget": original_budget,
        "total_spent": total_spent,
        "recommended_weekly_spending": round(recommended_weekly, 2),
        "ideal_weekly_rate": round(ideal_weekly_rate, 2),
        "actual_weekly_rate": round(actual_weekly_rate, 2),
        "budget_status": budget_status,
        "status_message": status_message,
        "spending_difference": round(spending_difference, 2),
        "budget_used_percentage": round(budget_used_percentage, 1),
        "time_elapsed_percentage": round(time_elapsed_percentage, 1),
        "weeks_elapsed": round(weeks_elapsed, 1)
    }

# Receipt Routes
@api_router.post("/receipts/preview")
@limiter.limit("20/minute")  # Limit OCR requests
async def preview_receipt(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Preview receipt data without saving - for user review"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Validate file size (max 10MB)
        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size must be less than 10MB")
        
        # Compress image if needed
        from PIL import Image
        import io
        
        img = Image.open(io.BytesIO(contents))
        
        # Resize if image is too large (max 2000px on longest side)
        max_size = 2000
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = tuple(int(dim * ratio) for dim in img.size)
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        # Convert to JPEG and compress
        output = io.BytesIO()
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGB')
        img.save(output, format='JPEG', quality=85, optimize=True)
        contents = output.getvalue()
        
        base64_image = base64.b64encode(contents).decode('utf-8')
        
        logger.info(f"Image processed: original size reduced to {len(contents)} bytes")
        
        # Use OpenAI Vision for OCR
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"receipt-preview-{uuid.uuid4()}",
            system_message="You are an expert at reading receipts and extracting structured data. Extract item names, prices, quantities, categories (meal/salad/drinks/convenience store), and total amount."
        ).with_model("openai", "gpt-4o")
        
        image_content = ImageContent(image_base64=base64_image)
        user_message = UserMessage(
            text="""Please analyze this receipt and extract the following information in JSON format:
            {
                "items": [{"name": "item name", "price": 0.00, "quantity": 1, "category": "meal/salad/drinks/convenience"}],
                "total": 0.00,
                "remaining_balance": 0.00,
                "date": "YYYY-MM-DD",
                "time": "HH:MM",
                "merchant": "store name"
            }
            IMPORTANT: 
            1. Look for the REMAINING BALANCE or MEAL PLAN BALANCE on the receipt (usually shown as "Balance", "Remaining", "New Balance", or "Meal Plan Balance"). Extract this exact amount for remaining_balance field.
            2. Extract the TIME from the receipt (usually at the top near the date). Format as HH:MM (24-hour format).
            Be as precise as possible. If you can't determine the category, use 'other'.""",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        # Parse the response
        import json
        import re
        
        # Extract JSON from response - handle nested JSON
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            try:
                parsed_data = json.loads(json_match.group())
            except json.JSONDecodeError:
                parsed_data = {
                    "items": [],
                    "total": 0.0,
                    "remaining_balance": 0.0,
                    "date": datetime.now(timezone.utc).strftime('%Y-%m-%d'),
                    "merchant": "Makers Cafe"
                }
        else:
            # Fallback parsing
            parsed_data = {
                "items": [],
                "total": 0.0,
                "remaining_balance": 0.0,
                "date": datetime.now(timezone.utc).strftime('%Y-%m-%d'),
                "merchant": "Makers Cafe"
            }
        
        # Return preview data with base64 image for display
        return {
            "success": True,
            "preview_data": parsed_data,
            "image_base64": base64_image,
            "ocr_text": response
        }
        
    except Exception as e:
        logging.error(f"Receipt preview error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to preview receipt: {str(e)}")

@api_router.post("/receipts/confirm")
async def confirm_receipt(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Confirm and save receipt with memo"""
    try:
        parsed_data = data.get('parsed_data', {})
        memo = data.get('memo', '')
        
        # Create receipt record with time
        try:
            date_str = parsed_data.get('date', datetime.now(timezone.utc).strftime('%Y-%m-%d'))
            time_str = parsed_data.get('time', '12:00')
            
            # Parse date and time
            receipt_datetime = datetime.strptime(f"{date_str} {time_str}", '%Y-%m-%d %H:%M').replace(tzinfo=timezone.utc)
        except:
            receipt_datetime = datetime.now(timezone.utc)
        
        receipt_date = receipt_datetime
        
        receipt_obj = Receipt(
            user_id=current_user['id'],
            image_url=f"receipt_{uuid.uuid4()}.jpg",
            ocr_text=data.get('ocr_text', ''),
            parsed_data=parsed_data,
            total_amount=float(parsed_data.get('total', 0)),
            items=parsed_data.get('items', []),
            receipt_date=receipt_date
        )
        
        doc = receipt_obj.model_dump()
        doc['receipt_date'] = doc['receipt_date'].isoformat()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['memo'] = memo  # Add memo field
        
        await db.receipts.insert_one(doc)
        
        # Create transactions for each item
        for item in parsed_data.get('items', []):
            transaction = Transaction(
                user_id=current_user['id'],
                receipt_id=receipt_obj.id,
                item_name=item.get('name', 'Unknown'),
                category=item.get('category', 'other'),
                price=float(item.get('price', 0)),
                quantity=int(item.get('quantity', 1)),
                transaction_date=receipt_date
            )
            
            trans_doc = transaction.model_dump()
            trans_doc['transaction_date'] = trans_doc['transaction_date'].isoformat()
            trans_doc['created_at'] = trans_doc['created_at'].isoformat()
            
            await db.transactions.insert_one(trans_doc)
        
        # Detect untracked spending and create mock transactions
        remaining_balance = parsed_data.get('remaining_balance', 0)
        receipt_total = float(parsed_data.get('total', 0))
        current_balance = current_user.get('meal_plan_amount', 0)
        
        if remaining_balance and float(remaining_balance) > 0:
            remaining_balance = float(remaining_balance)
            
            # Calculate expected balance after this receipt
            expected_balance = current_balance - receipt_total
            
            # If actual balance is lower than expected, there's untracked spending
            untracked_amount = expected_balance - remaining_balance
            
            if untracked_amount > 0.01:  # More than 1 cent difference
                logger.info(f"Detected untracked spending: ${untracked_amount:.2f}")
                
                # Get most recent receipt before this one
                previous_receipt = await db.receipts.find_one(
                    {"user_id": current_user['id']},
                    {"_id": 0, "receipt_date": 1},
                    sort=[("receipt_date", -1)]
                )
                
                # Calculate time between receipts for mock transaction
                if previous_receipt:
                    prev_date = datetime.fromisoformat(previous_receipt['receipt_date']) if isinstance(previous_receipt['receipt_date'], str) else previous_receipt['receipt_date']
                    # Place mock transaction halfway between receipts
                    time_diff = receipt_date - prev_date
                    mock_date = prev_date + (time_diff / 2)
                else:
                    # No previous receipt, place 1 hour before current
                    mock_date = receipt_date - timedelta(hours=1)
                
                # Delete existing mock transactions that would be recalculated
                await db.transactions.delete_many({
                    "user_id": current_user['id'],
                    "category": "untracked",
                    "transaction_date": {"$gte": mock_date.isoformat(), "$lte": receipt_date.isoformat()}
                })
                
                # Create mock transaction for untracked spending
                mock_transaction = Transaction(
                    user_id=current_user['id'],
                    receipt_id=receipt_obj.id,
                    item_name="Untracked Purchase (Cash/Other Receipt)",
                    category="untracked",
                    price=untracked_amount,
                    quantity=1,
                    transaction_date=mock_date
                )
                
                mock_doc = mock_transaction.model_dump()
                mock_doc['transaction_date'] = mock_doc['transaction_date'].isoformat()
                mock_doc['created_at'] = mock_doc['created_at'].isoformat()
                
                await db.transactions.insert_one(mock_doc)
                logger.info(f"Created mock transaction for ${untracked_amount:.2f} at {mock_date}")
            
            # Use the remaining balance shown on the receipt
            await db.users.update_one(
                {"id": current_user['id']},
                {"$set": {"meal_plan_amount": remaining_balance}}
            )
        else:
            # Fallback: deduct total if no remaining balance found on receipt
            await db.users.update_one(
                {"id": current_user['id']},
                {"$inc": {"meal_plan_amount": -receipt_total}}
            )
        
        # Remove _id field before returning
        doc.pop('_id', None)
        
        return {"success": True, "receipt": doc, "message": "Receipt saved successfully"}
        
    except Exception as e:
        logging.error(f"Receipt confirm error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save receipt: {str(e)}")

@api_router.post("/receipts/upload")
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        # Read image file
        contents = await file.read()
        base64_image = base64.b64encode(contents).decode('utf-8')
        
        # Use OpenAI Vision for OCR
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"receipt-{uuid.uuid4()}",
            system_message="You are an expert at reading receipts and extracting structured data. Extract item names, prices, quantities, categories (meal/salad/drinks/convenience store), and total amount."
        ).with_model("openai", "gpt-4o")
        
        image_content = ImageContent(image_base64=base64_image)
        user_message = UserMessage(
            text="""Please analyze this receipt and extract the following information in JSON format:
            {
                "items": [{"name": "item name", "price": 0.00, "quantity": 1, "category": "meal/salad/drinks/convenience"}],
                "total": 0.00,
                "remaining_balance": 0.00,
                "date": "YYYY-MM-DD",
                "time": "HH:MM",
                "merchant": "store name"
            }
            IMPORTANT: 
            1. Look for the REMAINING BALANCE or MEAL PLAN BALANCE on the receipt (usually shown as "Balance", "Remaining", "New Balance", or "Meal Plan Balance"). Extract this exact amount for remaining_balance field.
            2. Extract the TIME from the receipt (usually at the top near the date). Format as HH:MM (24-hour format).
            Be as precise as possible. If you can't determine the category, use 'other'.""",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        # Parse the response
        import json
        import re
        
        # Extract JSON from response - handle nested JSON
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            try:
                parsed_data = json.loads(json_match.group())
            except json.JSONDecodeError:
                parsed_data = {
                    "items": [],
                    "total": 0.0,
                    "remaining_balance": 0.0,
                    "date": datetime.now(timezone.utc).strftime('%Y-%m-%d'),
                    "merchant": "Makers Cafe"
                }
        else:
            # Fallback parsing
            parsed_data = {
                "items": [],
                "total": 0.0,
                "remaining_balance": 0.0,
                "date": datetime.now(timezone.utc).strftime('%Y-%m-%d'),
                "merchant": "Makers Cafe"
            }
        
        # Create receipt record
        try:
            receipt_date = datetime.strptime(parsed_data.get('date', datetime.now(timezone.utc).strftime('%Y-%m-%d')), '%Y-%m-%d').replace(tzinfo=timezone.utc)
        except:
            receipt_date = datetime.now(timezone.utc)
        
        receipt_obj = Receipt(
            user_id=current_user['id'],
            image_url=f"receipt_{uuid.uuid4()}.jpg",
            ocr_text=response,
            parsed_data=parsed_data,
            total_amount=float(parsed_data.get('total', 0)),
            items=parsed_data.get('items', []),
            receipt_date=receipt_date
        )
        
        doc = receipt_obj.model_dump()
        doc['receipt_date'] = doc['receipt_date'].isoformat()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await db.receipts.insert_one(doc)
        
        # Create transactions for each item
        for item in parsed_data.get('items', []):
            transaction = Transaction(
                user_id=current_user['id'],
                receipt_id=receipt_obj.id,
                item_name=item.get('name', 'Unknown'),
                category=item.get('category', 'other'),
                price=float(item.get('price', 0)),
                quantity=int(item.get('quantity', 1)),
                transaction_date=receipt_date
            )
            
            trans_doc = transaction.model_dump()
            trans_doc['transaction_date'] = trans_doc['transaction_date'].isoformat()
            trans_doc['created_at'] = trans_doc['created_at'].isoformat()
            
            await db.transactions.insert_one(trans_doc)
        
        # Detect untracked spending and create mock transactions
        remaining_balance = parsed_data.get('remaining_balance', 0)
        receipt_total = float(parsed_data.get('total', 0))
        current_balance = current_user.get('meal_plan_amount', 0)
        
        if remaining_balance and float(remaining_balance) > 0:
            remaining_balance = float(remaining_balance)
            
            # Calculate expected balance after this receipt
            expected_balance = current_balance - receipt_total
            
            # If actual balance is lower than expected, there's untracked spending
            untracked_amount = expected_balance - remaining_balance
            
            if untracked_amount > 0.01:  # More than 1 cent difference
                logger.info(f"Detected untracked spending: ${untracked_amount:.2f}")
                
                # Get most recent receipt before this one
                previous_receipt = await db.receipts.find_one(
                    {"user_id": current_user['id']},
                    {"_id": 0, "receipt_date": 1},
                    sort=[("receipt_date", -1)]
                )
                
                # Calculate time between receipts for mock transaction
                if previous_receipt:
                    prev_date = datetime.fromisoformat(previous_receipt['receipt_date']) if isinstance(previous_receipt['receipt_date'], str) else previous_receipt['receipt_date']
                    # Place mock transaction halfway between receipts
                    time_diff = receipt_date - prev_date
                    mock_date = prev_date + (time_diff / 2)
                else:
                    # No previous receipt, place 1 hour before current
                    mock_date = receipt_date - timedelta(hours=1)
                
                # Delete existing mock transactions that would be recalculated
                await db.transactions.delete_many({
                    "user_id": current_user['id'],
                    "category": "untracked",
                    "transaction_date": {"$gte": mock_date.isoformat(), "$lte": receipt_date.isoformat()}
                })
                
                # Create mock transaction for untracked spending
                mock_transaction = Transaction(
                    user_id=current_user['id'],
                    receipt_id=receipt_obj.id,
                    item_name="Untracked Purchase (Cash/Other Receipt)",
                    category="untracked",
                    price=untracked_amount,
                    quantity=1,
                    transaction_date=mock_date
                )
                
                mock_doc = mock_transaction.model_dump()
                mock_doc['transaction_date'] = mock_doc['transaction_date'].isoformat()
                mock_doc['created_at'] = mock_doc['created_at'].isoformat()
                
                await db.transactions.insert_one(mock_doc)
                logger.info(f"Created mock transaction for ${untracked_amount:.2f} at {mock_date}")
            
            # Use the remaining balance shown on the receipt
            await db.users.update_one(
                {"id": current_user['id']},
                {"$set": {"meal_plan_amount": remaining_balance}}
            )
        else:
            # Fallback: deduct total if no remaining balance found on receipt
            await db.users.update_one(
                {"id": current_user['id']},
                {"$inc": {"meal_plan_amount": -receipt_total}}
            )
        
        # Remove _id field before returning (MongoDB ObjectId is not JSON serializable)
        doc.pop('_id', None)
        
        return {"success": True, "receipt": doc, "message": "Receipt processed successfully"}
        
    except Exception as e:
        logging.error(f"Receipt upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process receipt: {str(e)}")

@api_router.get("/receipts")
async def get_receipts(
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get paginated receipts"""
    skip = (page - 1) * limit
    
    receipts = await db.receipts.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("receipt_date", -1).skip(skip).limit(limit).to_list(limit)
    
    total_count = await db.receipts.count_documents({"user_id": current_user['id']})
    
    return {
        "receipts": receipts,
        "page": page,
        "limit": limit,
        "total": total_count,
        "pages": (total_count + limit - 1) // limit
    }

# Transaction Routes
@api_router.get("/transactions")
async def get_transactions(
    page: int = 1,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get paginated transactions"""
    skip = (page - 1) * limit
    
    transactions = await db.transactions.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("transaction_date", -1).skip(skip).limit(limit).to_list(limit)
    
    total_count = await db.transactions.count_documents({"user_id": current_user['id']})
    
    return {
        "transactions": transactions,
        "page": page,
        "limit": limit,
        "total": total_count,
        "pages": (total_count + limit - 1) // limit
    }

@api_router.get("/transactions/history")
async def get_transaction_history(current_user: dict = Depends(get_current_user)):
    transactions = await db.transactions.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("transaction_date", -1).to_list(1000)
    return {"transactions": transactions, "total": len(transactions)}

# Analytics Routes
@api_router.get("/analytics", response_model=AnalyticsData)
@cache_response(expire_seconds=60)  # Cache for 1 minute
async def get_analytics(current_user: dict = Depends(get_current_user)):
    # Get all transactions
    transactions = await db.transactions.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).to_list(10000)
    
    # Calculate total spent
    total_spent = sum(t['price'] * t['quantity'] for t in transactions)
    
    # Spending by category
    spending_by_category = {}
    for t in transactions:
        category = t['category']
        amount = t['price'] * t['quantity']
        spending_by_category[category] = spending_by_category.get(category, 0) + amount
    
    # Recent transactions
    recent = sorted(transactions, key=lambda x: x['transaction_date'], reverse=True)[:10]
    
    # Spending trend (last 30 days, grouped by day)
    from collections import defaultdict
    trend = defaultdict(float)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    for t in transactions:
        trans_date = datetime.fromisoformat(t['transaction_date']) if isinstance(t['transaction_date'], str) else t['transaction_date']
        if trans_date >= thirty_days_ago:
            date_key = trans_date.strftime('%Y-%m-%d')
            trend[date_key] += t['price'] * t['quantity']
    
    spending_trend = [{"date": k, "amount": v} for k, v in sorted(trend.items())]
    
    return {
        "total_spent": total_spent,
        "transactions_count": len(transactions),
        "spending_by_category": spending_by_category,
        "recent_transactions": recent,
        "spending_trend": spending_trend
    }

# Menu Routes
@api_router.post("/menu", response_model=MenuItem)
async def create_menu_item(
    input: MenuItemCreate,
    current_user: dict = Depends(get_admin_user)
):
    item_data = input.model_dump()
    item_data['available_date'] = datetime.now(timezone.utc)
    item_obj = MenuItem(**item_data)
    
    doc = item_obj.model_dump()
    doc['available_date'] = doc['available_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.menu_items.insert_one(doc)
    return item_obj

@api_router.get("/menu")
async def get_menu():
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    menu_items = await db.menu_items.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return menu_items

@api_router.delete("/menu/{item_id}")
async def delete_menu_item(
    item_id: str,
    current_user: dict = Depends(get_admin_user)
):
    result = await db.menu_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"success": True, "message": "Menu item deleted"}

# Admin Routes
@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_admin_user)):
    users = await db.users.find(
        {},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    return users

@api_router.patch("/admin/users/{user_id}/toggle-admin")
async def toggle_user_admin(
    user_id: str,
    current_user: dict = Depends(get_admin_user)
):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_admin_status = not user.get('is_admin', False)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_admin": new_admin_status}}
    )
    
    return {"success": True, "is_admin": new_admin_status}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(get_admin_user)
):
    # Prevent self-deletion
    if user_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Also delete user's receipts and transactions
    await db.receipts.delete_many({"user_id": user_id})
    await db.transactions.delete_many({"user_id": user_id})
    
    return {"success": True, "message": "User deleted successfully"}

@api_router.get("/admin/today-expenses")
async def get_today_expenses(current_user: dict = Depends(get_admin_user)):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
    transactions = await db.transactions.find(
        {
            "transaction_date": {
                "$gte": today.isoformat(),
                "$lt": tomorrow.isoformat()
            }
        },
        {"_id": 0}
    ).to_list(10000)
    
    total_today = sum(t['price'] * t['quantity'] for t in transactions)
    
    # Get user info for each transaction
    user_ids = list(set(t['user_id'] for t in transactions))
    users = await db.users.find(
        {"id": {"$in": user_ids}},
        {"_id": 0, "id": 1, "name": 1, "email": 1}
    ).to_list(1000)
    
    user_map = {u['id']: u for u in users}
    
    # Add user info to transactions
    for t in transactions:
        t['user'] = user_map.get(t['user_id'], {"name": "Unknown"})
    
    return {
        "transactions": transactions,
        "total_amount": total_today,
        "count": len(transactions)
    }

@api_router.get("/admin/statistics")
async def get_admin_statistics(current_user: dict = Depends(get_admin_user)):
    # Total users
    total_users = await db.users.count_documents({})
    
    # Total transactions
    total_transactions = await db.transactions.count_documents({})
    
    # Total revenue
    all_transactions = await db.transactions.find({}, {"_id": 0, "price": 1, "quantity": 1}).to_list(100000)
    total_revenue = sum(t['price'] * t['quantity'] for t in all_transactions)
    
    # Today's stats
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
    today_transactions = await db.transactions.find(
        {
            "transaction_date": {
                "$gte": today.isoformat(),
                "$lt": tomorrow.isoformat()
            }
        },
        {"_id": 0}
    ).to_list(10000)
    
    today_revenue = sum(t['price'] * t['quantity'] for t in today_transactions)
    
    # Category breakdown
    category_stats = {}
    for t in all_transactions:
        cat = await db.transactions.find_one({"id": t.get('id', '')}, {"_id": 0, "category": 1})
        if cat:
            category = cat.get('category', 'other')
            if category not in category_stats:
                category_stats[category] = {"count": 0, "revenue": 0}
            category_stats[category]['count'] += 1
            category_stats[category]['revenue'] += t['price'] * t['quantity']
    
    # Menu items count
    menu_items_count = await db.menu_items.count_documents({})
    
    # Recent receipts
    recent_receipts = await db.receipts.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "total_users": total_users,
        "total_transactions": total_transactions,
        "total_revenue": total_revenue,
        "today_transactions": len(today_transactions),
        "today_revenue": today_revenue,
        "category_stats": category_stats,
        "menu_items_count": menu_items_count,
        "recent_receipts": recent_receipts
    }

# Cafe Menu Routes
@api_router.get("/cafe-menu")
async def get_cafe_menu(date: Optional[str] = None):
    """
    Get cafe menu filtered by time of day
    - At lunch time (11am-2pm): show all meals for the day
    - At breakfast time (7am-10:30am): show only breakfast
    - At dinner time (5pm-8pm): show only dinner
    - Outside meal times: show next upcoming meal
    """
    try:
        now = datetime.now(timezone.utc)
        hour = now.hour
        
        # Use today's date if not specified
        menu_date = date or now.strftime('%Y-%m-%d')
        
        # Get all menu items for the date
        all_items = await db.cafe_menu_items.find(
            {"date": menu_date},
            {"_id": 0}
        ).to_list(1000)
        
        if not all_items:
            return {
                "menu": {},
                "display_mode": "no_data",
                "message": "No menu data available for this date"
            }
        
        # Organize by meal period
        menu_by_period = {
            'breakfast': [item for item in all_items if item['meal_period'] == 'breakfast'],
            'lunch': [item for item in all_items if item['meal_period'] == 'lunch'],
            'dinner': [item for item in all_items if item['meal_period'] == 'dinner']
        }
        
        # Determine what to show based on time
        if 11 <= hour < 14:
            # Lunch time - show all meals
            display_mode = "all"
            displayed_menu = menu_by_period
        elif 7 <= hour < 11:
            # Breakfast time
            display_mode = "breakfast"
            displayed_menu = {'breakfast': menu_by_period['breakfast']}
        elif 17 <= hour < 20:
            # Dinner time
            display_mode = "dinner"
            displayed_menu = {'dinner': menu_by_period['dinner']}
        elif hour < 7:
            # Before breakfast - show breakfast
            display_mode = "breakfast"
            displayed_menu = {'breakfast': menu_by_period['breakfast']}
        elif 14 <= hour < 17:
            # Between lunch and dinner - show dinner
            display_mode = "dinner"
            displayed_menu = {'dinner': menu_by_period['dinner']}
        else:
            # After dinner - show tomorrow's breakfast or today's menu
            display_mode = "all"
            displayed_menu = menu_by_period
        
        return {
            "menu": displayed_menu,
            "display_mode": display_mode,
            "date": menu_date,
            "current_time": now.strftime('%H:%M')
        }
        
    except Exception as e:
        logger.error(f"Error fetching cafe menu: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/cafe-menu/all")
async def get_all_cafe_menu_items(
    date: Optional[str] = None,
    meal_period: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all cafe menu items (optionally filtered by date and meal period)"""
    try:
        query = {}
        if date:
            query['date'] = date
        if meal_period:
            query['meal_period'] = meal_period
        
        items = await db.cafe_menu_items.find(query, {"_id": 0}).sort("meal_period", 1).to_list(1000)
        
        return {
            "items": items,
            "count": len(items),
            "date": date,
            "meal_period": meal_period
        }
    except Exception as e:
        logger.error(f"Error fetching all cafe menu items: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/scrape-menu")
async def manual_scrape_menu(
    date: Optional[str] = None,
    current_user: dict = Depends(get_admin_user)
):
    """Manually trigger menu scraping (admin only)"""
    try:
        logger.info(f"Manual menu scrape triggered by {current_user.get('email')}")
        result = await scrape_and_save_menu_async(db, date)
        return result
    except Exception as e:
        logger.error(f"Error in manual scrape: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/scraper-settings")
async def get_scraper_settings(current_user: dict = Depends(get_admin_user)):
    """Get scraper settings (admin only)"""
    settings = await db.scraper_settings.find_one({'key': 'menu_scraper'}, {"_id": 0})
    
    if not settings:
        settings = {
            'key': 'menu_scraper',
            'auto_scrape_enabled': True,
            'scrape_time': '04:00'
        }
    
    # Get last scrape metadata
    last_scrape = await db.scrape_metadata.find_one({'key': 'last_menu_scrape'}, {"_id": 0})
    if last_scrape:
        settings['last_scrape_date'] = last_scrape.get('last_date')
        settings['last_scraped'] = last_scrape.get('last_scraped')
        settings['items_count'] = last_scrape.get('items_count', 0)
    
    return settings

@api_router.post("/admin/scraper-settings")
async def update_scraper_settings(
    settings: ScraperSettings,
    current_user: dict = Depends(get_admin_user)
):
    """Update scraper settings (admin only)"""
    try:
        await db.scraper_settings.update_one(
            {'key': 'menu_scraper'},
            {'$set': {
                'key': 'menu_scraper',
                'auto_scrape_enabled': settings.auto_scrape_enabled,
                'scrape_time': settings.scrape_time,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        # Update scheduler if needed
        if hasattr(app.state, 'scheduler'):
            scheduler = app.state.scheduler
            
            # Remove existing job
            if scheduler.get_job('daily_menu_scrape'):
                scheduler.remove_job('daily_menu_scrape')
            
            # Add new job if auto-scrape is enabled
            if settings.auto_scrape_enabled:
                hour, minute = map(int, settings.scrape_time.split(':'))
                scheduler.add_job(
                    scheduled_menu_scrape,
                    CronTrigger(hour=hour, minute=minute),
                    id='daily_menu_scrape',
                    name='Daily Cafe Menu Scrape',
                    replace_existing=True
                )
                logger.info(f"Menu scraper rescheduled for {settings.scrape_time}")
        
        return {"success": True, "message": "Settings updated successfully"}
    except Exception as e:
        logger.error(f"Error updating scraper settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/cafe-items-table")
async def get_cafe_items_table(current_user: dict = Depends(get_admin_user)):
    """Get table of all unique cafe menu items (admin only)"""
    try:
        # Get latest date's menu
        latest_menu = await db.cafe_menu_items.find({}, {"_id": 0}).sort("date", -1).limit(500).to_list(500)
        
        # Get unique items grouped by name and station
        items_dict = {}
        for item in latest_menu:
            key = f"{item['name']}_{item['station']}"
            if key not in items_dict:
                items_dict[key] = {
                    'name': item['name'],
                    'station': item['station'],
                    'description': item.get('description', ''),
                    'dietary_tags': item.get('dietary_tags', []),
                    'calories': item.get('calories'),
                    'meal_periods': [item['meal_period']]
                }
            else:
                # Add meal period if not already included
                if item['meal_period'] not in items_dict[key]['meal_periods']:
                    items_dict[key]['meal_periods'].append(item['meal_period'])
        
        items_list = list(items_dict.values())
        
        # Sort by station and name
        items_list.sort(key=lambda x: (x['station'], x['name']))
        
        return {
            "items": items_list,
            "count": len(items_list)
        }
    except Exception as e:
        logger.error(f"Error fetching cafe items table: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

# API version endpoint
@app.get("/api/version")
async def get_api_version():
    return {
        "version": "1.0.0",
        "api_versions": ["v1"],
        "default": "v1",
        "deprecated": []
    }

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging with more detail
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('/var/log/supervisor/makerstab.log')
    ]
)
logger = logging.getLogger(__name__)

# Add exception handler for better error tracking
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {str(exc)}", exc_info=True)
    return HTTPException(
        status_code=500,
        detail="Internal server error. Please try again later."
    )

@app.on_event("startup")
async def startup_db_client():
    """Create database indexes for performance and initialize scheduler"""
    try:
        # Users collection indexes
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id")
        await db.users.create_index([("is_admin", 1)])
        
        # Receipts collection indexes
        await db.receipts.create_index("id")
        await db.receipts.create_index([("user_id", 1), ("created_at", -1)])
        await db.receipts.create_index([("receipt_date", -1)])
        
        # Transactions collection indexes
        await db.transactions.create_index("id")
        await db.transactions.create_index([("user_id", 1), ("transaction_date", -1)])
        await db.transactions.create_index([("user_id", 1), ("category", 1)])
        await db.transactions.create_index("receipt_id")
        
        # Menu items collection indexes
        await db.menu_items.create_index("id")
        await db.menu_items.create_index([("available_date", -1)])
        
        # Cafe menu items collection indexes
        await db.cafe_menu_items.create_index([("date", -1), ("meal_period", 1)])
        await db.cafe_menu_items.create_index("item_id")
        await db.cafe_menu_items.create_index([("meal_period", 1)])
        await db.cafe_menu_items.create_index([("station", 1)])
        
        logging.info("Database indexes created successfully")
        
        # Initialize scheduler for menu scraping
        scheduler = AsyncIOScheduler()
        
        # Check if auto-scraping is enabled
        scraper_settings = await db.scraper_settings.find_one({'key': 'menu_scraper'})
        if not scraper_settings or scraper_settings.get('auto_scrape_enabled', True):
            # Schedule daily scraping at 4 AM
            scheduler.add_job(
                scheduled_menu_scrape,
                CronTrigger(hour=4, minute=0),
                id='daily_menu_scrape',
                name='Daily Cafe Menu Scrape',
                replace_existing=True
            )
            logging.info("Menu scraper scheduled for 4:00 AM daily")
        
        scheduler.start()
        app.state.scheduler = scheduler
        
    except Exception as e:
        logging.error(f"Error during startup: {str(e)}")

async def scheduled_menu_scrape():
    """Scheduled function to scrape menu daily at 4 AM"""
    try:
        logger.info("Starting scheduled menu scrape...")
        result = scrape_and_save_menu(db)
        
        if result['success']:
            logger.info(f"Scheduled scrape completed: {result.get('total_items', 0)} items")
        else:
            logger.error(f"Scheduled scrape failed: {result.get('error', 'Unknown error')}")
    except Exception as e:
        logger.error(f"Error in scheduled scrape: {str(e)}", exc_info=True)

@app.on_event("shutdown")
async def shutdown_db_client():
    if hasattr(app.state, 'scheduler'):
        app.state.scheduler.shutdown()
    client.close()
