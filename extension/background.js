// Government Form Helper - Background Service Worker

const API_BASE_URL = 'https://formaid.preview.emergentagent.com/api';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_FORM_HELP') {
    fetchFormHelp(request.payload)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function fetchFormHelp(payload) {
  const response = await fetch(`${API_BASE_URL}/form-help`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      field_label: payload.fieldLabel,
      field_type: payload.fieldType,
      field_options: payload.fieldOptions || '',
      form_context: payload.formContext || 'Indian Passport Application Form'
    })
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Government Form Helper installed:', details.reason);
});
