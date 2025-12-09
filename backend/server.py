from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class FormHelpRequest(BaseModel):
    field_label: str
    field_type: Optional[str] = "input"
    form_context: Optional[str] = "Indian Passport Application Form"

class FormHelpResponse(BaseModel):
    clarification_question: str
    advice: str
    warning: str
    field_label: str

class ChatHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    field_label: str
    response: dict
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# LLM Chat setup
def get_llm_chat(session_id: str) -> LlmChat:
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise ValueError("EMERGENT_LLM_KEY not found in environment variables")
    
    system_message = """You are an expert Indian Government document consultant helping users fill out official forms like the Passport Seva application. 

Your role is to provide clear, practical guidance for each form field. Return responses ONLY as valid JSON with exactly these three keys:

1. clarification_question: A simple, direct question to help the user understand their status or what to enter. Make it conversational and helpful.
2. advice: Clear guidance on what to enter in this field (max 30 words). Be specific to Indian context.
3. warning: One critical mistake to avoid when filling this field.

Always respond with ONLY the JSON object, no additional text or markdown formatting."""
    
    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=system_message
    )
    chat.with_model("gemini", "gemini-2.5-flash")
    return chat

# Routes
@api_router.get("/")
async def root():
    return {"message": "Government Form Helper API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

@api_router.post("/form-help", response_model=FormHelpResponse)
async def get_form_help(request: FormHelpRequest):
    """Get AI-powered guidance for a specific form field."""
    try:
        session_id = f"form-helper-{uuid.uuid4()}"
        chat = get_llm_chat(session_id)
        
        user_prompt = f"""The user is filling an {request.form_context} and is currently focused on the field: '{request.field_label}' (field type: {request.field_type}).

Provide helpful guidance for this specific field in the context of Indian government forms. Return ONLY a valid JSON object with these exact keys:
- clarification_question
- advice  
- warning

JSON response:"""
        
        user_message = UserMessage(text=user_prompt)
        response = await chat.send_message(user_message)
        
        # Parse the JSON response
        try:
            # Clean up the response - remove markdown code blocks if present
            cleaned_response = response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]
            cleaned_response = cleaned_response.strip()
            
            parsed = json.loads(cleaned_response)
            
            result = FormHelpResponse(
                clarification_question=parsed.get("clarification_question", "How can I help you with this field?"),
                advice=parsed.get("advice", "Enter the required information accurately."),
                warning=parsed.get("warning", "Double-check for any typos before submitting."),
                field_label=request.field_label
            )
            
            # Save to history
            history_entry = ChatHistory(
                session_id=session_id,
                field_label=request.field_label,
                response=result.model_dump()
            )
            doc = history_entry.model_dump()
            doc['timestamp'] = doc['timestamp'].isoformat()
            await db.form_help_history.insert_one(doc)
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response: {response}, error: {e}")
            # Return fallback response
            return FormHelpResponse(
                clarification_question="What information do you need help with for this field?",
                advice="Enter the required details as per your official documents.",
                warning="Ensure accuracy to avoid application rejection.",
                field_label=request.field_label
            )
            
    except Exception as e:
        logger.error(f"Error getting form help: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/form-help/history")
async def get_form_help_history(limit: int = 10):
    """Get recent form help queries."""
    history = await db.form_help_history.find(
        {}, 
        {"_id": 0}
    ).sort("timestamp", -1).to_list(limit)
    return history

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
