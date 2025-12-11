# Master Prompt: Government Form Helper Chrome Extension

## Project Overview

Build a complete AI-powered Chrome Extension called "Government Form Helper" that assists users in filling out Indian government forms, specifically focusing on the Passport Seva portal. The extension should provide real-time, context-aware guidance using AI, with both field-specific help and a general chat interface.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (for logging and history)
- **AI Model**: Gemini 2.5 Flash via emergentintegrations library
- **Key Management**: Use Emergent Universal LLM Key (supports Gemini, OpenAI, Claude)

### Frontend
- **Framework**: React with React Router
- **Styling**: Tailwind CSS + Custom CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios

### Chrome Extension
- **Version**: Manifest V3
- **Architecture**: 
  - `content.js` (content script for DOM manipulation and UI injection)
  - `background.js` (service worker for API communication)
  - `styles.css` (glassmorphic dark theme)
- **Permissions**: activeTab, storage
- **Host Permissions**: *.passportindia.gov.in/*, services1.passportindia.gov.in/*

## Application Architecture

### Three Components

1. **Backend API** (FastAPI)
   - Serves AI guidance endpoints
   - Handles chat with page context
   - Provides extension download endpoint
   - Logs interactions to MongoDB

2. **Web Demo** (React)
   - Landing page with glassmorphic design
   - Interactive form simulator
   - Showcases extension functionality
   - Download banner for extension

3. **Chrome Extension** (Manifest V3)
   - Injects helper panel on government websites
   - Detects form fields automatically
   - Provides AI guidance and chat
   - Persists chat history per domain

## Design System

### Theme: Glassmorphic Dark

**Color Palette:**
- Background: Dark slate (#0f172a, #1e293b, #0f172a gradient)
- Surface: White with 5-10% opacity + backdrop blur
- Borders: White with 10-20% opacity
- Text: White (primary), White 60% (secondary), White 40% (tertiary)
- Accent Colors:
  - Blue: #3b82f6 (questions, info)
  - Green: #10b981 (success, recommendations, emerald-500)
  - Orange: #f59e0b (warnings)
  - Red: #ef4444 (errors)

**UI Elements:**
- Border radius: 12-20px
- Backdrop blur: 10-20px
- Box shadows: Soft glows with color/25 opacity
- Animations: Smooth 200-300ms transitions
- Gradients: Subtle from/to patterns

**Typography:**
- Headings: Bold, 14-18px
- Body: Regular, 13-14px
- Labels: Uppercase, 10-11px, bold, letter-spacing
- Font: System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto)

## Core Features

### Feature 1: Field Help Tab

**Functionality:**
- Automatically triggers when user focuses/clicks on any form field
- Extracts the question/label from the DOM (intelligent traversal)
- Sends field context to AI for guidance
- Displays AI response with advice and warnings

**Field Detection Logic:**
- Detect input, select, textarea elements (exclude hidden, submit, button, reset)
- For SELECT: Extract all options from dropdown
- For RADIO: Find all radio buttons in the group and their labels
- For TEXT/TEXTAREA: Extract label or question text

**DOM Traversal Strategy (Priority Order):**
1. Label with `for` attribute matching element ID
2. Parent `<label>` element containing the field
3. Table row (TR) - check previous cells (TD/TH) for question text
4. Previous sibling elements or text nodes
5. Closest container (div, p, fieldset) with label elements
6. For radio groups: Check first cell of table row, fieldset legend, or parent container
7. Fallback: aria-label, title, placeholder, or formatted field name

**AI Guidance Types:**

1. **Interactive Questions** (for dropdowns/radio with multiple choices):
   - Clarification question: "Which situation applies to you?"
   - Multiple option buttons with scenarios
   - Show recommendation when user selects an option
   - Example: "Are you or your parents government employees?" → Yes/No buttons

2. **Simple Advice** (for text fields):
   - Expert advice card: What to enter
   - Warning card: Common mistakes to avoid

**Response Format from AI:**
```json
{
  "needs_interaction": boolean,
  "clarification_question": string (optional),
  "question_options": [
    {
      "label": "User-friendly scenario description",
      "value": "form_value",
      "recommendation": "Select 'Yes'" or specific instruction
    }
  ],
  "advice": "What to enter and why",
  "warning": "Common mistake to avoid",
  "field_label": "detected question"
}
```

### Feature 2: Chat Tab

**Functionality:**
- General Q&A about the form, eligibility, documents, terms
- Full page context awareness (all visible text + form values)
- Persistent chat history per website domain
- Multi-turn conversation support

**Page Context Extraction:**
- Page title and URL
- All visible text content (limited to 8000 characters)
- Current form field values (name: value pairs)
- Send context with every chat message

**Chat Persistence:**
- Store in Chrome local storage: `chat_{domain}` key
- Save after each message
- Auto-restore on page load
- Session-based (clears on browser close)

**Chat UI:**
- Welcome screen: "Ask Me Anything!" with helpful prompts
- User messages: Right-aligned, gradient background (blue to green)
- AI messages: Left-aligned, glassmorphic surface with border
- Loading state: Spinner with "Thinking..." text
- Error handling: Red-tinted alert with retry option
- Auto-scroll to latest message

## Backend Implementation

### API Endpoints

#### 1. POST /api/form-help
**Purpose:** Get AI guidance for a specific form field

**Request:**
```json
{
  "field_label": "Given Name (First & Middle Name)",
  "field_type": "input" | "select" | "radio" | "checkbox" | "textarea",
  "field_options": "Male, Female, Transgender" (comma-separated for dropdowns),
  "form_context": "Indian Passport Application Form"
}
```

**Response:**
```json
{
  "needs_interaction": true,
  "clarification_question": "What is your gender identity?",
  "question_options": [...],
  "advice": "Select the gender that matches your official documents",
  "warning": "Ensure consistency with Aadhar card and birth certificate",
  "field_label": "Gender",
  "recommended_value": null
}
```

**AI System Prompt:**
```
You are an expert Indian Government document consultant helping users fill the Passport Seva application form.

Your job is to help users understand form questions and advise which option to select based on their situation.

For questions with options (dropdowns, radio buttons), provide:
1. A clarifying question to understand the user's situation
2. Answer options that map to the form options
3. Clear recommendation for each answer

Return JSON with: needs_interaction, clarification_question, question_options (label, value, recommendation), advice, warning

Always return valid JSON only, no markdown.
```

#### 2. POST /api/chat
**Purpose:** Chat with AI about the form with full page context

**Request:**
```json
{
  "message": "What documents do I need for passport?",
  "page_context": {
    "page_title": "Passport Application - Passport Seva",
    "page_url": "https://passportindia.gov.in/...",
    "page_text": "All visible text content (truncated to 8000 chars)",
    "form_data": {
      "given_name": "John",
      "dob": "1990-01-01"
    }
  },
  "chat_history": [
    {"role": "user", "content": "Previous question", "timestamp": "2024-12-10T10:00:00Z"},
    {"role": "assistant", "content": "Previous answer", "timestamp": "2024-12-10T10:00:01Z"}
  ]
}
```

**Response:**
```json
{
  "response": "Based on the page content, you will need: proof of identity, proof of address, and birth certificate...",
  "timestamp": "2024-12-10T10:00:02Z"
}
```

**AI System Prompt:**
```
You are an expert assistant helping users fill out the Indian Passport Seva application form and other government forms.

You have access to the current webpage context including:
- Page Title: {page_title}
- Page URL: {page_url}
- Visible form fields and their current values
- All instructions, terms, and help text on the page

Your role:
1. Answer questions about form fields, requirements, and process
2. Explain what documents are needed
3. Help users understand confusing terminology
4. Guide them through the application process step-by-step
5. Clarify eligibility criteria and requirements
6. Explain consequences of different choices

Use the page context to give accurate, specific answers. Reference specific sections or fields from the page when relevant.
Be concise, helpful, and friendly.
```

#### 3. GET /api/extension/download
**Purpose:** Serve the packaged extension ZIP file

**Response:** Binary file (application/zip)

### Data Models (Pydantic)

```python
class PageContext(BaseModel):
    page_title: Optional[str] = ""
    page_url: Optional[str] = ""
    form_data: Optional[dict] = {}
    page_text: Optional[str] = ""

class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    message: str
    page_context: PageContext
    chat_history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    response: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
```

### MongoDB Collections

1. **form_help_history**: Store field help requests and responses
2. **chat_history**: Store chat interactions with page context
3. **status_checks**: General status/health checks

## Chrome Extension Implementation

### File Structure
```
extension/
├── manifest.json
├── content.js (main logic, DOM detection, UI injection)
├── background.js (service worker, API calls)
├── styles.css (glassmorphic dark theme)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### manifest.json
```json
{
  "manifest_version": 3,
  "name": "Government Form Helper",
  "version": "1.1.0",
  "description": "AI-powered assistant for filling Indian government forms like Passport Seva",
  "permissions": ["activeTab", "storage"],
  "host_permissions": [
    "*://*.passportindia.gov.in/*",
    "*://services1.passportindia.gov.in/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": [
        "*://*.passportindia.gov.in/*",
        "*://services1.passportindia.gov.in/*"
      ],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    },
    "default_title": "Government Form Helper"
  }
}
```

### content.js Structure

**State Management:**
```javascript
let state = {
  isPanelVisible: false,
  isLoading: false,
  activeField: null,
  activeElement: null,
  response: null,
  selectedOption: null,
  error: null,
  detectedOptions: null,
  detectedQuestion: null,
  // Chat state
  activeTab: 'field-help',
  chatMessages: [],
  chatInput: '',
  isChatLoading: false,
  chatError: null
};
```

**Key Functions:**

1. `init()` - Initialize extension when page loads
2. `attachGlobalListeners()` - Listen for focusin, click, change events
3. `handleFieldInteraction(event)` - Check if form element, trigger help
4. `isFormElement(element)` - Validate if element is a form field
5. `processField(element)` - Extract field info, call API, update UI
6. `extractFieldInfoFromDOM(element)` - Main DOM traversal logic
7. `extractSelectOptions(selectEl)` - Get dropdown options
8. `extractRadioGroupOptions(radioEl)` - Get radio group options
9. `findLabelForRadio(radio)` - Find label text for radio button
10. `findQuestionForElement(element)` - Generic question finder
11. `findQuestionInTableRow(element)` - Table-based question extraction
12. `findRadioGroupQuestion(radioEl)` - Radio group question finder
13. `cleanText(text)` - Clean and normalize text
14. `createHelperPanel()` - Inject panel HTML into page
15. `showPanel()` - Display panel with animation
16. `closePanel()` - Hide panel
17. `updatePanelContent()` - Render field help content
18. `getResponseHTML()` - Generate HTML for AI response
19. `attachListeners()` - Attach click handlers to interactive elements
20. `switchTab(tabName)` - Switch between Field Help and Chat tabs
21. `loadChatHistory()` - Load chat from Chrome storage
22. `saveChatHistory()` - Save chat to Chrome storage
23. `extractPageContext()` - Extract page text and form data
24. `sendChatMessage()` - Send message to backend via background.js
25. `renderChatMessages()` - Render chat UI with messages

**Panel HTML Structure:**
```html
<div id="gov-helper-panel" class="gov-helper-panel">
  <!-- Header with logo, title, close button -->
  <div class="gov-helper-header">...</div>
  
  <!-- Tab Switcher -->
  <div class="gov-helper-tabs">
    <button data-tab="field-help">Field Help</button>
    <button data-tab="chat">Chat</button>
  </div>
  
  <!-- Field Help Tab Content -->
  <div id="field-help-content" class="gov-helper-tab-content active">
    <div class="gov-helper-question">Detected Question</div>
    <div class="gov-helper-content">
      <!-- Loading / Error / Response / Idle -->
    </div>
  </div>
  
  <!-- Chat Tab Content -->
  <div id="chat-content" class="gov-helper-tab-content">
    <div class="gov-helper-chat-messages">
      <!-- Chat messages -->
    </div>
    <div class="gov-helper-chat-input-container">
      <textarea id="chat-input"></textarea>
      <button id="chat-send-btn">Send</button>
    </div>
  </div>
  
  <!-- Footer -->
  <div class="gov-helper-footer">AI-powered guidance</div>
</div>
```

### background.js (Service Worker)

**API Configuration:**
```javascript
const API_BASE_URL = 'https://your-backend-url.com/api';
```

**Message Handlers:**
1. `GET_FORM_HELP` - Call /api/form-help endpoint
2. `SEND_CHAT_MESSAGE` - Call /api/chat endpoint

**Functions:**
```javascript
async function fetchFormHelp(payload) {
  // POST to /api/form-help
  // Return response or error
}

async function sendChatMessage(payload) {
  // POST to /api/chat
  // Return response or error
}
```

### styles.css (Key Components)

**Panel:**
- Fixed position, right side, 420px width, full height
- Slide-in animation (right: -440px → right: 0)
- Dark gradient background
- Box shadow for depth

**Tab Switcher:**
- Flex container with equal-width buttons
- Active tab: Green border-bottom, green text, green/10 background
- Inactive tab: Transparent, muted text, hover effects

**Tab Content:**
- `.gov-helper-tab-content` - display: none by default
- `.gov-helper-tab-content.active` - display: flex !important
- Flex column layout, overflow handling

**Field Help Content:**
- Question box: Green gradient background
- Cards: Glassmorphic surface (white/5 bg, backdrop-blur, border)
- Color-coded left borders (blue, green, orange)
- Icons in colored circles
- Spacing: 14-20px between cards

**Chat UI:**
- Messages container: Flex column, auto-scroll
- User messages: Right-aligned, gradient (blue→green), rounded-br-sm
- AI messages: Left-aligned, glassmorphic surface, rounded-bl-sm
- Input container: Sticky bottom, flex row
- Send button: Gradient circle, hover scale effect

**Animations:**
- Panel slide-in: 0.3s cubic-bezier(0.4, 0, 0.2, 1)
- Fade-in for messages: 0.2s ease-in
- Hover lifts: transform scale(1.05)
- Shimmer loading: background-position animation

## React Web Demo Implementation

### Pages

#### 1. LandingPage.jsx
**Layout:**
- Hero section with gradient background
- Feature cards (Field Help, Chat, Smart Detection)
- How It Works section with steps
- Download CTA button
- Glassmorphic design throughout

**Key Elements:**
- Large heading with gradient text
- Feature icons from Lucide React
- Animated background blobs
- Download button linking to /api/extension/download

#### 2. FormSimulator.jsx
**Layout:**
- Header with back button and download button
- Info banner explaining the demo
- Passport application form (sample fields)
- AI Helper Panel (slides in from right)

**Form Sections:**
1. Applicant Details (name, DOB, gender, marital status)
2. Education & Employment (qualification, employment type, ECR status)
3. Present Address (street, city, state, PIN)

**Form Fields (Examples):**
- Text inputs: Given Name, Surname, Place of Birth, etc.
- Date input: Date of Birth
- Dropdowns: Gender, Marital Status, Education, Employment, ECR/ECNR
- All fields trigger the helper panel on focus

**AI Helper Panel Component:**
- Separate component: AIHelperPanel.jsx
- Props: isVisible, isLoading, response, activeField, onClose, error, localData
- Implements both Field Help and Chat tabs
- Same design as extension panel

### Component Structure

```jsx
<FormSimulator>
  <Header with Download Button />
  <InfoBanner />
  <FormContainer>
    <PassportApplicationForm>
      <FormField onFocus={handleFieldFocus} />
      ...
    </PassportApplicationForm>
  </FormContainer>
  <AIHelperPanel 
    isVisible={isPanelVisible}
    activeTab={activeTab}
    response={aiResponse}
    chatMessages={chatMessages}
    onSendChat={handleSendChat}
    ...
  />
</FormSimulator>
```

## Testing Requirements

### Backend Testing
1. **API Endpoint Tests:**
   - POST /api/form-help with various field types
   - POST /api/chat with page context
   - GET /api/extension/download

2. **AI Response Validation:**
   - Verify JSON format for form-help
   - Check interactive vs simple advice logic
   - Validate chat responses use page context

### Extension Testing
1. **DOM Detection:**
   - Test on various government websites
   - Verify field detection accuracy
   - Check question extraction from complex tables

2. **UI/UX Testing:**
   - Panel slide-in animation
   - Tab switching
   - Chat message rendering
   - Loading states
   - Error handling

3. **Storage Testing:**
   - Chat history persistence
   - Cross-page navigation
   - Storage cleanup

### Web Demo Testing
1. **Form Interaction:**
   - Click various field types
   - Verify panel opens with correct content
   - Test tab switching

2. **Chat Functionality:**
   - Send messages
   - Verify context extraction
   - Check message history

## Deliverables

### 1. Backend API
- FastAPI server with all endpoints
- MongoDB integration
- Gemini AI integration via emergentintegrations
- Error handling and logging

### 2. Chrome Extension Package
- extension.zip file containing:
  - manifest.json
  - content.js
  - background.js
  - styles.css
  - icons (16x16, 48x48, 128x128 PNG)
  - README.md with installation instructions

### 3. React Web Application
- Landing page with glassmorphic design
- Form simulator demo
- Download banner
- Routing between pages

### 4. Documentation
- README.md for extension
- API documentation
- User guide
- Installation instructions

## Key Implementation Notes

### 1. DOM Detection Strategy
- Use multiple fallback methods (label, parent, table, sibling, container)
- Clean text thoroughly (remove extra whitespace, special chars)
- Handle complex government website structures (tables, nested divs)
- Prioritize semantic HTML (label[for], aria-label) over heuristics

### 2. AI Prompt Engineering
- System prompts should be specific to government forms
- Always request JSON-only responses (no markdown)
- Include examples in system prompt for consistency
- Provide form context (Passport Seva) in every request
- For chat: Include conversation history (last 10 messages)

### 3. Error Handling
- Network errors: Show user-friendly messages
- AI parsing errors: Provide fallback generic advice
- Storage errors: Log but don't block functionality
- DOM errors: Gracefully skip problematic fields

### 4. Performance Optimization
- Debounce field detection (400ms)
- Truncate page text to 8000 chars
- Limit chat history to 10 messages in API calls
- Use efficient DOM queries (querySelector over traversal)

### 5. Security Considerations
- Validate all user inputs
- Sanitize HTML content (escapeHTML function)
- Use chrome.storage.local (not sync for privacy)
- Don't log sensitive form data
- CORS configuration for API

### 6. UX Best Practices
- Smooth animations (300ms transitions)
- Loading indicators for all async operations
- Auto-scroll chat to latest message
- Highlight active field with green outline
- Clear visual feedback for interactions
- Accessible color contrast ratios

### 7. Code Organization
- Separate concerns (DOM, API, UI, State)
- Reusable utility functions (cleanText, escapeHTML)
- Consistent naming conventions
- Comment complex logic (especially DOM traversal)
- Modular structure for maintainability

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=government_form_helper
EMERGENT_LLM_KEY=your_key_here
CORS_ORIGINS=http://localhost:3000,https://your-domain.com
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=https://your-backend-url.com
```

### Extension (background.js)
```javascript
const API_BASE_URL = 'https://your-backend-url.com/api';
```

## Success Criteria

The application is complete when:

1. ✅ Chrome extension loads on Passport Seva website
2. ✅ Clicking any form field opens the helper panel
3. ✅ Field Help tab shows AI guidance with advice and warnings
4. ✅ Chat tab allows Q&A with full page context
5. ✅ Chat history persists across page navigation
6. ✅ Web demo simulates the same functionality
7. ✅ Landing page showcases the extension
8. ✅ Extension can be downloaded as ZIP
9. ✅ UI is glassmorphic dark theme throughout
10. ✅ All API endpoints return proper responses
11. ✅ Error states are handled gracefully
12. ✅ DOM detection works on complex government websites

---

**Note:** This is a complete specification. Follow it step-by-step, implementing backend first, then extension, then web demo. Test each component independently before integration. Focus on the DOM detection logic as it's the most critical and complex part of the extension.
