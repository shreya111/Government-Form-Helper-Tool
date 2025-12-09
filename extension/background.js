// Government Form Helper - Background Service Worker
// Handles API communication with the AI backend

const API_BASE_URL = 'https://egovhelper.preview.emergentagent.com/api';

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_FORM_HELP') {
    fetchFormHelp(request.payload)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Required for async sendResponse
  }
});

// Fetch form help from the AI backend
async function fetchFormHelp(payload) {
  const response = await fetch(`${API_BASE_URL}/form-help`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      field_label: payload.fieldLabel,
      field_type: payload.fieldType,
      form_context: payload.formContext || 'Indian Passport Application Form'
    })
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

// Log when extension is installed/updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Government Form Helper installed:', details.reason);
});
