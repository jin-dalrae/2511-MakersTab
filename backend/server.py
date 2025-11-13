from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

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
        # Fall Term: July 10 - September 1
        start = datetime(year, 7, 10, tzinfo=timezone.utc)
        end = datetime(year, 9, 1, 23, 59, 59, tzinfo=timezone.utc)
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
        start = datetime(year, 7, 10, tzinfo=timezone.utc)
        end = datetime(year, 9, 1, 23, 59, 59, tzinfo=timezone.utc)
    
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
async def preview_receipt(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Preview receipt data without saving - for user review"""
    try:
        # Read image file
        contents = await file.read()
        base64_image = base64.b64encode(contents).decode('utf-8')
        
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
                "merchant": "store name"
            }
            IMPORTANT: Look for the REMAINING BALANCE or MEAL PLAN BALANCE on the receipt (usually shown as "Balance", "Remaining", "New Balance", or "Meal Plan Balance"). Extract this exact amount for remaining_balance field.
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
        
        # Create receipt record
        try:
            receipt_date = datetime.strptime(parsed_data.get('date', datetime.now(timezone.utc).strftime('%Y-%m-%d')), '%Y-%m-%d').replace(tzinfo=timezone.utc)
        except:
            receipt_date = datetime.now(timezone.utc)
        
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
        
        # Update meal plan amount to remaining balance from receipt
        remaining_balance = parsed_data.get('remaining_balance', 0)
        if remaining_balance and float(remaining_balance) > 0:
            # Use the remaining balance shown on the receipt
            await db.users.update_one(
                {"id": current_user['id']},
                {"$set": {"meal_plan_amount": float(remaining_balance)}}
            )
        else:
            # Fallback: deduct total if no remaining balance found on receipt
            total_amount = float(parsed_data.get('total', 0))
            await db.users.update_one(
                {"id": current_user['id']},
                {"$inc": {"meal_plan_amount": -total_amount}}
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
                "merchant": "store name"
            }
            IMPORTANT: Look for the REMAINING BALANCE or MEAL PLAN BALANCE on the receipt (usually shown as "Balance", "Remaining", "New Balance", or "Meal Plan Balance"). Extract this exact amount for remaining_balance field.
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
        
        # Update meal plan amount to remaining balance from receipt
        remaining_balance = parsed_data.get('remaining_balance', 0)
        if remaining_balance and float(remaining_balance) > 0:
            # Use the remaining balance shown on the receipt
            await db.users.update_one(
                {"id": current_user['id']},
                {"$set": {"meal_plan_amount": float(remaining_balance)}}
            )
        else:
            # Fallback: deduct total if no remaining balance found on receipt
            total_amount = float(parsed_data.get('total', 0))
            await db.users.update_one(
                {"id": current_user['id']},
                {"$inc": {"meal_plan_amount": -total_amount}}
            )
        
        # Remove _id field before returning (MongoDB ObjectId is not JSON serializable)
        doc.pop('_id', None)
        
        return {"success": True, "receipt": doc, "message": "Receipt processed successfully"}
        
    except Exception as e:
        logging.error(f"Receipt upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process receipt: {str(e)}")

@api_router.get("/receipts")
async def get_receipts(current_user: dict = Depends(get_current_user)):
    receipts = await db.receipts.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("receipt_date", -1).to_list(100)
    return receipts

# Transaction Routes
@api_router.get("/transactions")
async def get_transactions(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    transactions = await db.transactions.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("transaction_date", -1).limit(limit).to_list(limit)
    return transactions

@api_router.get("/transactions/history")
async def get_transaction_history(current_user: dict = Depends(get_current_user)):
    transactions = await db.transactions.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("transaction_date", -1).to_list(1000)
    return {"transactions": transactions, "total": len(transactions)}

# Analytics Routes
@api_router.get("/analytics", response_model=AnalyticsData)
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

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db_client():
    """Create database indexes for performance"""
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
        
        logging.info("Database indexes created successfully")
    except Exception as e:
        logging.error(f"Error creating indexes: {str(e)}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
