// Government Form Helper - Content Script
// Detects form fields and shows helper panel - uses DOM detection for dropdowns/radios to save API credits

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    panelWidth: 380,
    debounceDelay: 300,
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
    lastRequestedLabel: null,
    isLocalResponse: false
  };

  // DOM Elements
  let helperPanel = null;
  let debounceTimer = null;

  // Initialize the extension
  function init() {
    console.log('Government Form Helper: Initializing on Passport Seva portal');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  function setup() {
    createHelperPanel();
    attachGlobalListeners();
    console.log('Government Form Helper: Ready - click any form field');
  }

  // Attach global event listeners
  function attachGlobalListeners() {
    document.addEventListener('focusin', handleFieldFocus, true);
    document.addEventListener('click', handleFieldClick, true);
  }

  // Handle field focus event
  function handleFieldFocus(event) {
    const element = event.target;
    if (isFormElement(element)) {
      triggerHelp(element);
    }
  }

  // Handle click event
  function handleFieldClick(event) {
    const element = event.target;
    
    if (element.type === 'radio' || element.type === 'checkbox') {
      triggerHelp(element);
    }
    
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

  // Check if element is a form element
  function isFormElement(element) {
    if (!element || element.closest('#gov-helper-panel')) return false;
    
    const tagName = element.tagName.toLowerCase();
    const type = element.type?.toLowerCase();
    
    if (tagName === 'input') {
      const excludedTypes = ['hidden', 'submit', 'button', 'reset', 'image'];
      return !excludedTypes.includes(type);
    }
    
    return tagName === 'select' || tagName === 'textarea';
  }

  // Trigger help for a form element
  function triggerHelp(element) {
    const label = extractFieldLabel(element);
    if (!label || label.trim().length < 2) return;
    
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // Check if we can handle this locally (dropdown/radio)
      const localResponse = tryLocalDetection(element, label);
      
      if (localResponse) {
        // Show local response without API call
        showLocalResponse(element, label, localResponse);
      } else {
        // Only call API for text inputs that need guidance
        fetchHelpForField(element, label);
      }
    }, CONFIG.debounceDelay);
  }

  // Try to detect options locally from DOM (no API call)
  function tryLocalDetection(element, label) {
    const tagName = element.tagName.toLowerCase();
    const type = element.type?.toLowerCase();
    
    // Handle SELECT dropdowns
    if (tagName === 'select') {
      return detectSelectOptions(element, label);
    }
    
    // Handle RADIO buttons
    if (type === 'radio') {
      return detectRadioOptions(element, label);
    }
    
    // Handle CHECKBOX
    if (type === 'checkbox') {
      return detectCheckboxOption(element, label);
    }
    
    return null; // Need API call
  }

  // Detect SELECT dropdown options from DOM
  function detectSelectOptions(selectElement, label) {
    const options = Array.from(selectElement.options)
      .filter(opt => opt.value && opt.value.trim() !== '')
      .map(opt => ({
        label: opt.textContent.trim(),
        value: opt.value,
        selected: opt.selected
      }));
    
    if (options.length === 0) return null;
    
    return {
      type: 'select',
      fieldLabel: label,
      options: options,
      hint: 'Select one of the available options below:'
    };
  }

  // Detect RADIO button options from DOM
  function detectRadioOptions(radioElement, label) {
    const name = radioElement.name;
    if (!name) return null;
    
    const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
    const options = Array.from(radios).map(radio => {
      // Try to find label for this radio
      let optionLabel = '';
      
      // Check for label element
      if (radio.id) {
        const labelEl = document.querySelector(`label[for="${radio.id}"]`);
        if (labelEl) optionLabel = labelEl.textContent.trim();
      }
      
      // Check parent label
      if (!optionLabel) {
        const parentLabel = radio.closest('label');
        if (parentLabel) {
          optionLabel = parentLabel.textContent.trim();
        }
      }
      
      // Check next sibling text
      if (!optionLabel && radio.nextSibling) {
        optionLabel = radio.nextSibling.textContent?.trim() || '';
      }
      
      // Use value as fallback
      if (!optionLabel) {
        optionLabel = radio.value;
      }
      
      return {
        label: optionLabel,
        value: radio.value,
        selected: radio.checked
      };
    }).filter(opt => opt.label);
    
    if (options.length === 0) return null;
    
    // Try to get the group label
    const groupLabel = getRadioGroupLabel(radioElement) || label;
    
    return {
      type: 'radio',
      fieldLabel: groupLabel,
      options: options,
      hint: 'Choose one option:'
    };
  }

  // Get radio group label
  function getRadioGroupLabel(radioElement) {
    // Check for fieldset legend
    const fieldset = radioElement.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend) return cleanLabel(legend.textContent);
    }
    
    // Check table row
    const row = radioElement.closest('tr');
    if (row) {
      const firstCell = row.querySelector('td, th');
      if (firstCell && !firstCell.contains(radioElement)) {
        return cleanLabel(firstCell.textContent);
      }
    }
    
    return null;
  }

  // Detect checkbox option
  function detectCheckboxOption(checkboxElement, label) {
    let optionLabel = label;
    
    // Try to get better label
    if (checkboxElement.id) {
      const labelEl = document.querySelector(`label[for="${checkboxElement.id}"]`);
      if (labelEl) optionLabel = labelEl.textContent.trim();
    }
    
    if (!optionLabel) {
      const parentLabel = checkboxElement.closest('label');
      if (parentLabel) optionLabel = parentLabel.textContent.trim();
    }
    
    return {
      type: 'checkbox',
      fieldLabel: cleanLabel(optionLabel),
      options: [
        { label: 'Yes / Checked', value: 'yes', selected: checkboxElement.checked },
        { label: 'No / Unchecked', value: 'no', selected: !checkboxElement.checked }
      ],
      hint: 'Check this box if applicable:'
    };
  }

  // Show local response (no API call)
  function showLocalResponse(element, label, localResponse) {
    state.activeField = localResponse.fieldLabel;
    state.activeElement = element;
    state.isLoading = false;
    state.error = null;
    state.response = null;
    state.isLocalResponse = true;
    state.localData = localResponse;
    
    showPanel();
    highlightField(element);
    updatePanelContent();
  }

  // Fetch help from API (only for text inputs)
  async function fetchHelpForField(element, label) {
    // Skip API call if same field
    if (state.lastRequestedLabel === label && state.response && !state.error && !state.isLocalResponse) {
      if (!state.isPanelVisible) showPanel();
      highlightField(element);
      return;
    }
    
    state.activeField = label;
    state.activeElement = element;
    state.lastRequestedLabel = label;
    state.isLoading = true;
    state.response = null;
    state.selectedOption = null;
    state.error = null;
    state.isLocalResponse = false;
    state.localData = null;

    showPanel();
    updatePanelContent();
    highlightField(element);

    const fieldType = getFieldType(element);

    try {
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
      console.error('Government Form Helper: Error', error);
      state.error = 'Unable to connect to AI service';
    }

    state.isLoading = false;
    updatePanelContent();
  }

  // Get field type
  function getFieldType(element) {
    const tagName = element.tagName.toLowerCase();
    const type = element.type?.toLowerCase();
    
    if (tagName === 'select') return 'select';
    if (tagName === 'textarea') return 'textarea';
    if (type === 'date') return 'date';
    return 'input';
  }

  // Create the helper panel
  function createHelperPanel() {
    helperPanel = document.createElement('div');
    helperPanel.id = 'gov-helper-panel';
    helperPanel.className = 'gov-helper-panel';
    helperPanel.innerHTML = getPanelHTML();
    document.body.appendChild(helperPanel);
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
            <p class="gov-helper-subtitle">Click any field for help</p>
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
          <p>Click on any form field to see available options.</p>
        </div>
      </div>
      <div class="gov-helper-footer">
        <p id="gov-helper-footer-text">Click any field for guidance</p>
      </div>
    `;
  }

  // Extract field label
  function extractFieldLabel(element) {
    let label = '';

    if (element.id) {
      const labelEl = document.querySelector(`label[for="${element.id}"]`);
      if (labelEl) label = labelEl.textContent;
    }

    if (!label) {
      const parentLabel = element.closest('label');
      if (parentLabel) label = parentLabel.textContent;
    }

    if (!label && element.type === 'radio') {
      const name = element.name;
      if (name) {
        const container = element.closest('td, div, fieldset, tr');
        if (container) {
          const legend = container.querySelector('legend');
          if (legend) label = legend.textContent;
        }
      }
    }

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

    if (!label) {
      const cell = element.closest('td, th');
      if (cell) {
        const textNodes = Array.from(cell.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent.trim())
          .filter(text => text.length > 0);
        if (textNodes.length > 0) label = textNodes[0];
      }
    }

    if (!label) {
      label = element.placeholder || element.title || element.getAttribute('aria-label') || formatNameAttribute(element.name) || '';
    }

    return cleanLabel(label);
  }

  function formatNameAttribute(name) {
    if (!name) return '';
    return name.replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, l => l.toUpperCase());
  }

  function cleanLabel(label) {
    return label.replace(/\*/g, '').replace(/:/g, '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '').substring(0, 100);
  }

  function showPanel() {
    state.isPanelVisible = true;
    helperPanel.classList.add('visible');
  }

  function closePanel() {
    state.isPanelVisible = false;
    helperPanel.classList.remove('visible');
    removeFieldHighlight();
  }

  function highlightField(element) {
    removeFieldHighlight();
    element.classList.add('gov-helper-active-field');
  }

  function removeFieldHighlight() {
    document.querySelectorAll('.gov-helper-active-field').forEach(el => {
      el.classList.remove('gov-helper-active-field');
    });
  }

  // Update panel content
  function updatePanelContent() {
    const contentEl = document.getElementById('gov-helper-content');
    const fieldIndicator = document.getElementById('gov-helper-field-indicator');
    const fieldName = document.getElementById('gov-helper-field-name');
    const footerText = document.getElementById('gov-helper-footer-text');

    if (state.activeField) {
      fieldIndicator.style.display = 'block';
      fieldName.textContent = state.activeField;
    } else {
      fieldIndicator.style.display = 'none';
    }

    if (state.isLoading) {
      contentEl.innerHTML = getLoadingHTML();
      footerText.textContent = 'Getting AI guidance...';
    } else if (state.error) {
      contentEl.innerHTML = getErrorHTML(state.error);
      footerText.textContent = 'Error occurred';
    } else if (state.isLocalResponse && state.localData) {
      contentEl.innerHTML = getLocalResponseHTML(state.localData);
      footerText.textContent = 'Options detected from form';
    } else if (state.response) {
      contentEl.innerHTML = getAIResponseHTML(state.response);
      footerText.textContent = 'AI-powered guidance';
    } else {
      contentEl.innerHTML = getIdleHTML();
      footerText.textContent = 'Click any field for guidance';
    }
  }

  // Get LOCAL response HTML (dropdown/radio options from DOM)
  function getLocalResponseHTML(data) {
    const typeLabel = data.type === 'select' ? 'Dropdown Options' : 
                      data.type === 'radio' ? 'Radio Options' : 'Checkbox';
    const typeIcon = data.type === 'select' ? 
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>' :
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>';
    
    const optionsHTML = data.options.map(opt => `
      <div class="gov-helper-local-option ${opt.selected ? 'selected' : ''}">
        <div class="gov-helper-local-option-marker">${opt.selected ? '✓' : ''}</div>
        <span>${escapeHTML(opt.label)}</span>
      </div>
    `).join('');

    return `
      <div class="gov-helper-response">
        <div class="gov-helper-card gov-helper-card-local">
          <div class="gov-helper-card-header">
            <div class="gov-helper-card-icon gov-helper-icon-green">
              ${typeIcon}
            </div>
            <h4 class="gov-helper-card-title">${typeLabel}</h4>
          </div>
          <p class="gov-helper-hint">${escapeHTML(data.hint)}</p>
          <div class="gov-helper-local-options">
            ${optionsHTML}
          </div>
        </div>
        <div class="gov-helper-tip">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
          <span>Select an option from the form. No AI credits used.</span>
        </div>
      </div>
    `;
  }

  // Get AI response HTML
  function getAIResponseHTML(response) {
    if (response.needs_interaction && response.clarification_question) {
      return getInteractiveResponseHTML(response);
    } else {
      return getSimpleResponseHTML(response);
    }
  }

  function getLoadingHTML() {
    return `
      <div class="gov-helper-loading">
        <div class="gov-helper-loading-indicator">
          <svg class="gov-helper-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <span>Getting AI guidance...</span>
        </div>
        <div class="gov-helper-shimmer-container">
          <div class="gov-helper-shimmer"></div>
          <div class="gov-helper-shimmer"></div>
        </div>
      </div>
    `;
  }

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
        <p>Click on any form field to see options or get guidance.</p>
      </div>
    `;
  }

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

  // Attach option listeners
  function attachOptionListeners() {
    const options = helperPanel.querySelectorAll('.gov-helper-option');
    options.forEach(option => {
      option.addEventListener('click', () => handleOptionSelect(option));
    });
  }

  function handleOptionSelect(optionEl) {
    helperPanel.querySelectorAll('.gov-helper-option').forEach(opt => opt.classList.remove('selected'));
    optionEl.classList.add('selected');
    
    const recommendation = optionEl.dataset.recommendation;
    const recommendationEl = document.getElementById('gov-helper-recommendation');
    const recommendationText = document.getElementById('gov-helper-recommendation-text');
    
    if (recommendation && recommendationEl && recommendationText) {
      recommendationText.textContent = recommendation;
      recommendationEl.style.display = 'flex';
    }
  }

  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Re-attach option listeners after content update
  const originalUpdatePanelContent = updatePanelContent;
  updatePanelContent = function() {
    originalUpdatePanelContent();
    attachOptionListeners();
  };

  init();
})();
