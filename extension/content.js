// Government Form Helper - Content Script
// Detects form fields and shows helper panel when fields are clicked/focused

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    panelWidth: 380,
    debounceDelay: 500,
    formContext: 'Indian Passport Application Form (Passport Seva Portal)'
  };

  // State management
  let state = {
    isPanelVisible: false,
    isLoading: false,
    activeField: null,
    activeElement: null,
    response: null,
    selectedOption: null,
    error: null,
    lastRequestedLabel: null
  };

  // DOM Elements
  let helperPanel = null;
  let debounceTimer = null;

  // Initialize the extension
  function init() {
    console.log('Government Form Helper: Initializing on Passport Seva portal');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  function setup() {
    // Create the helper panel
    createHelperPanel();
    
    // Attach global event listeners for form fields
    attachGlobalListeners();
    
    // Set up mutation observer for dynamically added fields
    observeDOMChanges();
    
    console.log('Government Form Helper: Setup complete - click any form field for help');
  }

  // Attach global event listeners using event delegation
  function attachGlobalListeners() {
    // Use focusin for event delegation (it bubbles unlike focus)
    document.addEventListener('focusin', handleFieldFocus, true);
    
    // Also listen for clicks on radio buttons and checkboxes
    document.addEventListener('click', handleFieldClick, true);
  }

  // Handle field focus event
  function handleFieldFocus(event) {
    const element = event.target;
    
    // Check if it's a form element we care about
    if (isFormElement(element)) {
      triggerHelp(element);
    }
  }

  // Handle click event (for radio buttons, checkboxes)
  function handleFieldClick(event) {
    const element = event.target;
    
    // Special handling for radio buttons and checkboxes
    if (element.type === 'radio' || element.type === 'checkbox') {
      triggerHelp(element);
    }
    
    // Also handle clicks on labels that are associated with inputs
    if (element.tagName.toLowerCase() === 'label') {
      const forId = element.getAttribute('for');
      if (forId) {
        const input = document.getElementById(forId);
        if (input && isFormElement(input)) {
          triggerHelp(input);
        }
      }
    }
  }

  // Check if element is a form element we should help with
  function isFormElement(element) {
    if (!element || element.closest('#gov-helper-panel')) return false;
    
    const tagName = element.tagName.toLowerCase();
    const type = element.type?.toLowerCase();
    
    // Include inputs (except hidden, submit, button, reset)
    if (tagName === 'input') {
      const excludedTypes = ['hidden', 'submit', 'button', 'reset', 'image'];
      return !excludedTypes.includes(type);
    }
    
    // Include select and textarea
    return tagName === 'select' || tagName === 'textarea';
  }

  // Trigger help for a form element
  function triggerHelp(element) {
    const label = extractFieldLabel(element);
    
    // Skip if no meaningful label found or same field
    if (!label || label.trim().length < 2) return;
    
    // Debounce to avoid multiple rapid requests
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // Skip if same field is already active and has response
      if (state.lastRequestedLabel === label && state.response && !state.error) {
        // Just show the panel if hidden
        if (!state.isPanelVisible) {
          showPanel();
        }
        highlightField(element);
        return;
      }
      
      fetchHelpForField(element, label);
    }, CONFIG.debounceDelay);
  }

  // Fetch help for a specific field
  async function fetchHelpForField(element, label) {
    state.activeField = label;
    state.activeElement = element;
    state.lastRequestedLabel = label;
    state.isLoading = true;
    state.response = null;
    state.selectedOption = null;
    state.error = null;

    // Show panel with loading state
    showPanel();
    updatePanelContent();

    // Highlight the active field
    highlightField(element);

    // Determine field type
    const fieldType = getFieldType(element);

    try {
      // Send message to background script
      const response = await chrome.runtime.sendMessage({
        type: 'GET_FORM_HELP',
        payload: {
          fieldLabel: label,
          fieldType: fieldType,
          formContext: CONFIG.formContext
        }
      });

      if (response.success) {
        state.response = response.data;
      } else {
        state.error = response.error || 'Failed to get guidance';
      }
    } catch (error) {
      console.error('Government Form Helper: Error fetching help', error);
      state.error = 'Unable to connect to AI service';
    }

    state.isLoading = false;
    updatePanelContent();
  }

  // Get field type for API
  function getFieldType(element) {
    const tagName = element.tagName.toLowerCase();
    const type = element.type?.toLowerCase();
    
    if (tagName === 'select') return 'select';
    if (tagName === 'textarea') return 'textarea';
    if (type === 'radio') return 'radio';
    if (type === 'checkbox') return 'checkbox';
    if (type === 'date') return 'date';
    return 'input';
  }

  // Create the floating helper panel
  function createHelperPanel() {
    helperPanel = document.createElement('div');
    helperPanel.id = 'gov-helper-panel';
    helperPanel.className = 'gov-helper-panel';
    helperPanel.innerHTML = getPanelHTML();
    document.body.appendChild(helperPanel);

    // Attach event listeners
    helperPanel.querySelector('.gov-helper-close-btn').addEventListener('click', closePanel);
  }

  function getPanelHTML() {
    return `
      <div class="gov-helper-panel-header">
        <div class="gov-helper-header-content">
          <div class="gov-helper-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/>
              <path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
            </svg>
          </div>
          <div>
            <h3 class="gov-helper-title">Form Quick Guide</h3>
            <p class="gov-helper-subtitle">Powered by AI</p>
          </div>
        </div>
        <button class="gov-helper-close-btn" title="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="gov-helper-field-indicator" id="gov-helper-field-indicator" style="display: none;">
        <p class="gov-helper-field-label">Current Field</p>
        <p class="gov-helper-field-name" id="gov-helper-field-name"></p>
      </div>
      <div class="gov-helper-content" id="gov-helper-content">
        <div class="gov-helper-idle-state">
          <div class="gov-helper-idle-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/>
              <path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
            </svg>
          </div>
          <h4>Ready to Help!</h4>
          <p>Click on any form field to get instant guidance.</p>
        </div>
      </div>
      <div class="gov-helper-footer">
        <p>Click any field for guidance</p>
      </div>
    `;
  }

  // Extract the label text for a form field
  function extractFieldLabel(element) {
    let label = '';

    // Method 1: Check for associated label element
    if (element.id) {
      const labelEl = document.querySelector(`label[for="${element.id}"]`);
      if (labelEl) {
        label = labelEl.textContent;
      }
    }

    // Method 2: Check parent label
    if (!label) {
      const parentLabel = element.closest('label');
      if (parentLabel) {
        label = parentLabel.textContent;
      }
    }

    // Method 3: For radio buttons, get the group label
    if (!label && element.type === 'radio') {
      const name = element.name;
      if (name) {
        // Look for a label or text near the radio group
        const radioGroup = document.querySelectorAll(`input[name="${name}"]`);
        if (radioGroup.length > 0) {
          const firstRadio = radioGroup[0];
          const container = firstRadio.closest('td, div, fieldset');
          if (container) {
            // Try to find legend or nearby label
            const legend = container.querySelector('legend');
            if (legend) {
              label = legend.textContent;
            } else {
              // Get the specific option label for this radio
              const optionLabel = element.closest('label')?.textContent || 
                                  element.nextSibling?.textContent ||
                                  element.parentElement?.textContent;
              if (optionLabel) {
                label = `Option: ${optionLabel.trim()}`;
              }
            }
          }
        }
      }
    }

    // Method 4: Check previous sibling or parent's previous sibling (table layouts)
    if (!label) {
      const row = element.closest('tr');
      if (row) {
        const cells = row.querySelectorAll('td, th');
        for (let i = 0; i < cells.length; i++) {
          if (cells[i].contains(element) && i > 0) {
            label = cells[i - 1].textContent;
            break;
          }
        }
      }
    }

    // Method 5: Check for nearby text in same cell
    if (!label) {
      const cell = element.closest('td, th');
      if (cell) {
        const textNodes = Array.from(cell.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent.trim())
          .filter(text => text.length > 0);
        if (textNodes.length > 0) {
          label = textNodes[0];
        }
      }
    }

    // Method 6: Check for nearby text nodes in parent
    if (!label) {
      const parent = element.parentElement;
      if (parent) {
        const textNodes = Array.from(parent.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent.trim())
          .filter(text => text.length > 0);
        if (textNodes.length > 0) {
          label = textNodes[0];
        }
      }
    }

    // Method 7: Use placeholder, name, or title attribute
    if (!label) {
      label = element.placeholder || 
              element.title || 
              element.getAttribute('aria-label') || 
              formatNameAttribute(element.name) || 
              '';
    }

    // Clean up the label
    return cleanLabel(label);
  }

  // Format name attribute to readable label
  function formatNameAttribute(name) {
    if (!name) return '';
    return name
      .replace(/[_-]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  // Clean up label text
  function cleanLabel(label) {
    return label
      .replace(/\*/g, '')           // Remove asterisks
      .replace(/:/g, '')            // Remove colons
      .replace(/\s+/g, ' ')         // Normalize whitespace
      .replace(/^\s+|\s+$/g, '')    // Trim
      .substring(0, 100);           // Limit length
  }

  // Show the helper panel
  function showPanel() {
    state.isPanelVisible = true;
    helperPanel.classList.add('visible');
  }

  // Close the helper panel
  function closePanel() {
    state.isPanelVisible = false;
    helperPanel.classList.remove('visible');
    removeFieldHighlight();
  }

  // Highlight the active field
  function highlightField(element) {
    removeFieldHighlight();
    element.classList.add('gov-helper-active-field');
  }

  // Remove field highlight
  function removeFieldHighlight() {
    document.querySelectorAll('.gov-helper-active-field').forEach(el => {
      el.classList.remove('gov-helper-active-field');
    });
  }

  // Update the panel content based on state
  function updatePanelContent() {
    const contentEl = document.getElementById('gov-helper-content');
    const fieldIndicator = document.getElementById('gov-helper-field-indicator');
    const fieldName = document.getElementById('gov-helper-field-name');

    // Update field indicator
    if (state.activeField) {
      fieldIndicator.style.display = 'block';
      fieldName.textContent = state.activeField;
    } else {
      fieldIndicator.style.display = 'none';
    }

    // Update content
    if (state.isLoading) {
      contentEl.innerHTML = getLoadingHTML();
    } else if (state.error) {
      contentEl.innerHTML = getErrorHTML(state.error);
    } else if (state.response) {
      contentEl.innerHTML = getResponseHTML(state.response);
      attachOptionListeners();
    } else {
      contentEl.innerHTML = getIdleHTML();
    }
  }

  // Get loading HTML
  function getLoadingHTML() {
    return `
      <div class="gov-helper-loading">
        <div class="gov-helper-loading-indicator">
          <svg class="gov-helper-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <span>Analyzing field...</span>
        </div>
        <div class="gov-helper-shimmer-container">
          <div class="gov-helper-shimmer"></div>
          <div class="gov-helper-shimmer"></div>
        </div>
      </div>
    `;
  }

  // Get error HTML
  function getErrorHTML(error) {
    return `
      <div class="gov-helper-error">
        <div class="gov-helper-error-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <path d="M12 9v4"/><path d="M12 17h.01"/>
          </svg>
        </div>
        <h4>Something went wrong</h4>
        <p>${error}</p>
      </div>
    `;
  }

  // Get idle state HTML
  function getIdleHTML() {
    return `
      <div class="gov-helper-idle-state">
        <div class="gov-helper-idle-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/>
            <path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
          </svg>
        </div>
        <h4>Ready to Help!</h4>
        <p>Click on any form field to get instant guidance.</p>
      </div>
    `;
  }

  // Get response HTML
  function getResponseHTML(response) {
    if (response.needs_interaction && response.clarification_question) {
      return getInteractiveResponseHTML(response);
    } else {
      return getSimpleResponseHTML(response);
    }
  }

  // Get interactive response HTML (with question options)
  function getInteractiveResponseHTML(response) {
    const optionsHTML = (response.question_options || []).map((opt, idx) => `
      <button class="gov-helper-option" data-value="${opt.value}" data-recommendation="${escapeHTML(opt.recommendation)}">
        <div class="gov-helper-option-radio"></div>
        <span>${escapeHTML(opt.label)}</span>
      </button>
    `).join('');

    return `
      <div class="gov-helper-response">
        <div class="gov-helper-card gov-helper-card-question">
          <div class="gov-helper-card-header">
            <div class="gov-helper-card-icon gov-helper-icon-blue">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
              </svg>
            </div>
            <h4 class="gov-helper-card-title">Quick Question</h4>
          </div>
          <p class="gov-helper-card-text">${escapeHTML(response.clarification_question)}</p>
          <div class="gov-helper-options">
            <p class="gov-helper-options-label">Select your answer:</p>
            ${optionsHTML}
          </div>
          <div class="gov-helper-recommendation" id="gov-helper-recommendation" style="display: none;">
            <div class="gov-helper-recommendation-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </div>
            <div>
              <span class="gov-helper-recommendation-label">Recommendation</span>
              <p class="gov-helper-recommendation-text" id="gov-helper-recommendation-text"></p>
            </div>
          </div>
        </div>
        
        <div class="gov-helper-card gov-helper-card-advice">
          <div class="gov-helper-card-header">
            <div class="gov-helper-card-icon gov-helper-icon-gray">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
              </svg>
            </div>
            <h4 class="gov-helper-card-title">Additional Context</h4>
          </div>
          <p class="gov-helper-card-text">${escapeHTML(response.advice)}</p>
        </div>
        
        <div class="gov-helper-card gov-helper-card-warning">
          <div class="gov-helper-card-header">
            <div class="gov-helper-card-icon gov-helper-icon-orange">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <path d="M12 9v4"/><path d="M12 17h.01"/>
              </svg>
            </div>
            <h4 class="gov-helper-card-title">Avoid This Mistake</h4>
          </div>
          <p class="gov-helper-card-text">${escapeHTML(response.warning)}</p>
        </div>
      </div>
    `;
  }

  // Get simple response HTML (advice only)
  function getSimpleResponseHTML(response) {
    return `
      <div class="gov-helper-response">
        <div class="gov-helper-card gov-helper-card-advice-main">
          <div class="gov-helper-card-header">
            <div class="gov-helper-card-icon gov-helper-icon-blue">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
                <path d="M9 18h6"/><path d="M10 22h4"/>
              </svg>
            </div>
            <h4 class="gov-helper-card-title">Expert Advice</h4>
          </div>
          <p class="gov-helper-card-text">${escapeHTML(response.advice)}</p>
        </div>
        
        <div class="gov-helper-card gov-helper-card-warning">
          <div class="gov-helper-card-header">
            <div class="gov-helper-card-icon gov-helper-icon-orange">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <path d="M12 9v4"/><path d="M12 17h.01"/>
              </svg>
            </div>
            <h4 class="gov-helper-card-title">Common Mistake to Avoid</h4>
          </div>
          <p class="gov-helper-card-text">${escapeHTML(response.warning)}</p>
        </div>
      </div>
    `;
  }

  // Attach event listeners to option buttons
  function attachOptionListeners() {
    const options = helperPanel.querySelectorAll('.gov-helper-option');
    options.forEach(option => {
      option.addEventListener('click', () => handleOptionSelect(option));
    });
  }

  // Handle option selection
  function handleOptionSelect(optionEl) {
    // Remove previous selection
    helperPanel.querySelectorAll('.gov-helper-option').forEach(opt => {
      opt.classList.remove('selected');
    });

    // Add selection to clicked option
    optionEl.classList.add('selected');

    // Show recommendation
    const recommendation = optionEl.dataset.recommendation;
    const recommendationEl = document.getElementById('gov-helper-recommendation');
    const recommendationText = document.getElementById('gov-helper-recommendation-text');
    
    if (recommendation && recommendationEl && recommendationText) {
      recommendationText.textContent = recommendation;
      recommendationEl.style.display = 'flex';
    }
  }

  // Escape HTML to prevent XSS
  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Observe DOM changes for dynamically added fields
  function observeDOMChanges() {
    const observer = new MutationObserver((mutations) => {
      // DOM changed, listeners are already global so no action needed
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Start the extension
  init();
})();
