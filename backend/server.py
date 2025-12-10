from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import FileResponse
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
APP_DIR = ROOT_DIR.parent
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
    field_options: Optional[str] = ""
    form_context: Optional[str] = "Indian Passport Application Form"

class QuestionOption(BaseModel):
    label: str
    value: str
    recommendation: Optional[str] = None

class FormHelpResponse(BaseModel):
    needs_interaction: bool = False
    clarification_question: Optional[str] = None
    question_options: List[QuestionOption] = []
    advice: str
    warning: str
    field_label: str
    recommended_value: Optional[str] = None

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
    
    system_message = """You are an expert Indian Government document consultant helping users fill the Passport Seva application form.

Your job is to help users understand form questions and advise which option to select based on their situation.

For questions with options (dropdowns, radio buttons like Yes/No), provide:
1. A clarifying question to understand the user's situation
2. Answer options that map to the form options
3. Clear recommendation for each answer

Return JSON with:
- needs_interaction: true (if question needs clarification) or false (for simple text fields)
- clarification_question: Question to ask the user (e.g., "Are you or your parents government employees?")
- question_options: Array of scenarios with recommendations:
  [{"label": "Yes, I/my parents are government employees", "value": "yes", "recommendation": "Select 'Yes'"},
   {"label": "No, neither I nor my parents work for the government", "value": "no", "recommendation": "Select 'No'"}]
- advice: Brief explanation of what this field means
- warning: Important mistake to avoid

Examples:
- For "Is either of your parent a government servant?" → Ask if they/parents work for government → Recommend Yes/No
- For "Is applicant eligible for Non-ECR?" → Ask about education level → Recommend Yes if 10th pass
- For "Employment Type" dropdown → Ask about current occupation → Recommend appropriate option

Always return valid JSON only, no markdown."""
    
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
        
        # Build prompt with detected options if available
        options_info = ""
        if request.field_options:
            options_info = f"\nDetected form options: {request.field_options}"
        
        user_prompt = f"""User needs help with this form question:
Question/Field: "{request.field_label}"
Field type: {request.field_type}{options_info}
Form: {request.form_context}

Provide guidance on how to answer this question. If it's a Yes/No question or dropdown, ask a clarifying question to help them decide which option to select.

Return JSON with needs_interaction, clarification_question, question_options (with label, value, recommendation), advice, and warning."""
        
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
            
            # Parse question options if present
            question_options = []
            if parsed.get("needs_interaction") and "question_options" in parsed and isinstance(parsed["question_options"], list):
                for opt in parsed["question_options"]:
                    question_options.append(QuestionOption(
                        label=opt.get("label", ""),
                        value=opt.get("value", ""),
                        recommendation=opt.get("recommendation", "")
                    ))
            
            result = FormHelpResponse(
                needs_interaction=parsed.get("needs_interaction", False),
                clarification_question=parsed.get("clarification_question"),
                question_options=question_options,
                advice=parsed.get("advice", "Enter the required information accurately."),
                warning=parsed.get("warning", "Double-check for any typos before submitting."),
                field_label=request.field_label,
                recommended_value=parsed.get("recommended_value")
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
                needs_interaction=False,
                clarification_question=None,
                question_options=[],
                advice="Enter the required details as per your official documents.",
                warning="Ensure accuracy to avoid application rejection.",
                field_label=request.field_label,
                recommended_value=None
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

@api_router.get("/extension/download")
async def download_extension():
    """Download the Chrome extension as a zip file."""
    extension_path = APP_DIR / "extension.zip"
    if not extension_path.exists():
        raise HTTPException(status_code=404, detail="Extension package not found")
    return FileResponse(
        path=str(extension_path),
        filename="government-form-helper-extension.zip",
        media_type="application/zip"
    )

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
