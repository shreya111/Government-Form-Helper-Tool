// Government Form Helper - Content Script
// Detects form fields, extracts questions, and provides AI guidance

(function() {
  'use strict';

  const CONFIG = {
    panelWidth: 380,
    debounceDelay: 400,
    formContext: 'Indian Passport Application Form (Passport Seva Portal)'
  };

  let state = {
    isPanelVisible: false,
    isLoading: false,
    activeField: null,
    activeElement: null,
    response: null,
    selectedOption: null,
    error: null,
    lastRequestedLabel: null,
    detectedOptions: null
  };

  let helperPanel = null;
  let debounceTimer = null;

  function init() {
    console.log('Government Form Helper: Initializing...');
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

  function attachGlobalListeners() {
    document.addEventListener('focusin', handleFieldFocus, true);
    document.addEventListener('click', handleFieldClick, true);
  }

  function handleFieldFocus(event) {
    const element = event.target;
    if (isFormElement(element)) {
      triggerHelp(element);
    }
  }

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

  function triggerHelp(element) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      processField(element);
    }, CONFIG.debounceDelay);
  }

  // Main function to process any field
  async function processField(element) {
    const tagName = element.tagName.toLowerCase();
    const type = element.type?.toLowerCase();
    
    // Extract question/label and options
    const fieldInfo = extractFieldInfo(element);
    
    if (!fieldInfo.label || fieldInfo.label.length < 2) return;
    
    state.activeField = fieldInfo.label;
    state.activeElement = element;
    state.detectedOptions = fieldInfo.options;
    state.isLoading = true;
    state.response = null;
    state.error = null;
    
    showPanel();
    highlightField(element);
    updatePanelContent();
    
    // Always call AI for guidance - it will provide advice on which option to select
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_FORM_HELP',
        payload: {
          fieldLabel: fieldInfo.label,
          fieldType: fieldInfo.type,
          fieldOptions: fieldInfo.options.map(o => o.label).join(', '),
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

  // Extract complete field information including question and options
  function extractFieldInfo(element) {
    const tagName = element.tagName.toLowerCase();
    const type = element.type?.toLowerCase();
    
    let info = {
      label: '',
      type: 'input',
      options: []
    };
    
    // Handle SELECT dropdowns
    if (tagName === 'select') {
      info.type = 'select';
      info.label = extractQuestionLabel(element);
      info.options = Array.from(element.options)
        .filter(opt => opt.value && opt.value.trim() !== '' && opt.value.toLowerCase() !== 'select')
        .map(opt => ({
          label: opt.textContent.trim(),
          value: opt.value,
          selected: opt.selected
        }));
    }
    // Handle RADIO buttons
    else if (type === 'radio') {
      info.type = 'radio';
      info.label = extractRadioGroupQuestion(element);
      info.options = extractRadioOptions(element);
    }
    // Handle CHECKBOX
    else if (type === 'checkbox') {
      info.type = 'checkbox';
      info.label = extractQuestionLabel(element);
      info.options = [
        { label: 'Yes', value: 'yes', selected: element.checked },
        { label: 'No', value: 'no', selected: !element.checked }
      ];
    }
    // Handle TEXT inputs
    else {
      info.type = 'input';
      info.label = extractQuestionLabel(element);
    }
    
    return info;
  }

  // Extract the question/label for radio button groups
  function extractRadioGroupQuestion(radioElement) {
    const name = radioElement.name;
    let question = '';
    
    // Method 1: Look for text in the same table row before the radio buttons
    const row = radioElement.closest('tr');
    if (row) {
      const cells = row.querySelectorAll('td');
      for (let cell of cells) {
        // Find cell with text that doesn't contain the radio button
        if (!cell.contains(radioElement) || cell.querySelector('input[type="radio"]') === null) {
          const text = cell.textContent.trim();
          if (text.length > 5 && !text.match(/^(yes|no)$/i)) {
            question = text;
            break;
          }
        }
      }
      // Also check first cell specifically
      if (!question && cells.length > 0) {
        const firstCellText = cells[0].textContent.trim();
        if (firstCellText.length > 5) {
          question = firstCellText;
        }
      }
    }
    
    // Method 2: Look for nearby label or text element
    if (!question) {
      const container = radioElement.closest('td, div, fieldset, p');
      if (container) {
        // Check for legend
        const legend = container.querySelector('legend');
        if (legend) {
          question = legend.textContent.trim();
        }
        // Check for label
        if (!question) {
          const labels = container.querySelectorAll('label, span, b, strong');
          for (let label of labels) {
            const text = label.textContent.trim();
            if (text.length > 10 && text.includes('?')) {
              question = text;
              break;
            }
          }
        }
      }
    }
    
    // Method 3: Look at previous sibling elements
    if (!question) {
      let prevElement = radioElement.parentElement?.previousElementSibling;
      while (prevElement && !question) {
        const text = prevElement.textContent.trim();
        if (text.length > 10) {
          question = text;
          break;
        }
        prevElement = prevElement.previousElementSibling;
      }
    }
    
    // Method 4: Search the entire row/container for question-like text
    if (!question) {
      const searchContainer = radioElement.closest('tr, div, fieldset') || radioElement.parentElement;
      if (searchContainer) {
        const allText = searchContainer.textContent;
        // Find text that looks like a question (contains ? or ends with specific patterns)
        const questionMatch = allText.match(/([^.!?]*\?)/g);
        if (questionMatch && questionMatch[0]) {
          question = questionMatch[0].trim();
        }
      }
    }
    
    // Clean up and return
    return cleanLabel(question || radioElement.name || 'Radio Selection');
  }

  // Extract all radio options in a group
  function extractRadioOptions(radioElement) {
    const name = radioElement.name;
    if (!name) return [];
    
    const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
    return Array.from(radios).map(radio => {
      let optionLabel = '';
      
      // Check for associated label
      if (radio.id) {
        const labelEl = document.querySelector(`label[for="${radio.id}"]`);
        if (labelEl) optionLabel = labelEl.textContent.trim();
      }
      
      // Check parent label
      if (!optionLabel) {
        const parentLabel = radio.closest('label');
        if (parentLabel) {
          // Get only direct text, not nested elements
          optionLabel = Array.from(parentLabel.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent.trim())
            .join(' ').trim();
          if (!optionLabel) {
            optionLabel = parentLabel.textContent.trim();
          }
        }
      }
      
      // Check next sibling
      if (!optionLabel && radio.nextSibling) {
        optionLabel = radio.nextSibling.textContent?.trim() || '';
      }
      
      // Use value as fallback
      if (!optionLabel) {
        optionLabel = radio.value || 'Option';
      }
      
      // Clean up common patterns
      optionLabel = optionLabel.replace(/^\s*[-:]\s*/, '').trim();
      
      return {
        label: optionLabel,
        value: radio.value,
        selected: radio.checked
      };
    }).filter(opt => opt.label && opt.label.length > 0);
  }

  // Extract question/label for any form element
  function extractQuestionLabel(element) {
    let label = '';
    
    // Method 1: Associated label
    if (element.id) {
      const labelEl = document.querySelector(`label[for="${element.id}"]`);
      if (labelEl) label = labelEl.textContent;
    }
    
    // Method 2: Parent label
    if (!label) {
      const parentLabel = element.closest('label');
      if (parentLabel) label = parentLabel.textContent;
    }
    
    // Method 3: Table row - look for label in previous cells
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
        // Check first cell
        if (!label && cells.length > 0) {
          const firstCell = cells[0];
          if (!firstCell.contains(element)) {
            label = firstCell.textContent;
          }
        }
      }
    }
    
    // Method 4: Previous sibling text
    if (!label) {
      const parent = element.parentElement;
      if (parent) {
        let prev = element.previousSibling;
        while (prev) {
          if (prev.nodeType === Node.TEXT_NODE && prev.textContent.trim()) {
            label = prev.textContent;
            break;
          }
          if (prev.nodeType === Node.ELEMENT_NODE) {
            label = prev.textContent;
            break;
          }
          prev = prev.previousSibling;
        }
      }
    }
    
    // Method 5: Placeholder or name
    if (!label) {
      label = element.placeholder || element.title || element.getAttribute('aria-label') || formatName(element.name) || '';
    }
    
    return cleanLabel(label);
  }

  function formatName(name) {
    if (!name) return '';
    return name.replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, l => l.toUpperCase());
  }

  function cleanLabel(label) {
    if (!label) return '';
    return label
      .replace(/\*/g, '')
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '')
      .substring(0, 150);
  }

  // Create panel
  function createHelperPanel() {
    helperPanel = document.createElement('div');
    helperPanel.id = 'gov-helper-panel';
    helperPanel.className = 'gov-helper-panel';
    helperPanel.innerHTML = `
      <div class="gov-helper-panel-header">
        <div class="gov-helper-header-content">
          <div class="gov-helper-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/>
              <path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
            </svg>
          </div>
          <div>
            <h3 class="gov-helper-title">Passport Quick Guide</h3>
            <p class="gov-helper-subtitle">AI-Powered Assistance</p>
          </div>
        </div>
        <button class="gov-helper-close-btn" title="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="gov-helper-field-indicator" id="gov-helper-field-indicator" style="display: none;">
        <p class="gov-helper-field-label">Question</p>
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
          <p>Click on any form field to get guidance on which option to select.</p>
        </div>
      </div>
      <div class="gov-helper-footer">
        <p id="gov-helper-footer-text">Click any field for guidance</p>
      </div>
    `;
    document.body.appendChild(helperPanel);
    helperPanel.querySelector('.gov-helper-close-btn').addEventListener('click', closePanel);
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
      footerText.textContent = 'Analyzing question...';
    } else if (state.error) {
      contentEl.innerHTML = getErrorHTML(state.error);
      footerText.textContent = 'Error occurred';
    } else if (state.response) {
      contentEl.innerHTML = getResponseHTML(state.response, state.detectedOptions);
      footerText.textContent = 'AI-powered guidance';
      attachOptionListeners();
    } else {
      contentEl.innerHTML = getIdleHTML();
      footerText.textContent = 'Click any field for guidance';
    }
  }

  function getLoadingHTML() {
    return `
      <div class="gov-helper-loading">
        <div class="gov-helper-loading-indicator">
          <svg class="gov-helper-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <span>Analyzing question...</span>
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
        <p>${escapeHTML(error)}</p>
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
        <p>Click on any form field to get guidance on which option to select.</p>
      </div>
    `;
  }

  function getResponseHTML(response, detectedOptions) {
    let html = '<div class="gov-helper-response">';
    
    // Show detected options if available
    if (detectedOptions && detectedOptions.length > 0) {
      html += `
        <div class="gov-helper-card gov-helper-card-options">
          <div class="gov-helper-card-header">
            <div class="gov-helper-card-icon gov-helper-icon-blue">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <h4 class="gov-helper-card-title">Available Options</h4>
          </div>
          <div class="gov-helper-detected-options">
            ${detectedOptions.map(opt => `
              <div class="gov-helper-detected-option ${opt.selected ? 'selected' : ''}">
                <span class="gov-helper-option-bullet">${opt.selected ? '✓' : '○'}</span>
                <span>${escapeHTML(opt.label)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    // Show AI recommendation
    if (response.needs_interaction && response.question_options && response.question_options.length > 0) {
      html += `
        <div class="gov-helper-card gov-helper-card-question">
          <div class="gov-helper-card-header">
            <div class="gov-helper-card-icon gov-helper-icon-green">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
              </svg>
            </div>
            <h4 class="gov-helper-card-title">Which applies to you?</h4>
          </div>
          <p class="gov-helper-hint">${escapeHTML(response.clarification_question || 'Select based on your situation:')}</p>
          <div class="gov-helper-ai-options">
            ${response.question_options.map((opt, idx) => `
              <button class="gov-helper-ai-option" data-idx="${idx}" data-recommendation="${escapeHTML(opt.recommendation || '')}">
                <div class="gov-helper-ai-option-marker"></div>
                <span>${escapeHTML(opt.label)}</span>
              </button>
            `).join('')}
          </div>
          <div class="gov-helper-recommendation" id="gov-helper-recommendation" style="display: none;">
            <div class="gov-helper-recommendation-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </div>
            <div>
              <span class="gov-helper-recommendation-label">Select This Option</span>
              <p class="gov-helper-recommendation-text" id="gov-helper-recommendation-text"></p>
            </div>
          </div>
        </div>
      `;
    } else {
      // Simple advice
      html += `
        <div class="gov-helper-card gov-helper-card-advice">
          <div class="gov-helper-card-header">
            <div class="gov-helper-card-icon gov-helper-icon-green">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
                <path d="M9 18h6"/><path d="M10 22h4"/>
              </svg>
            </div>
            <h4 class="gov-helper-card-title">Recommendation</h4>
          </div>
          <p class="gov-helper-card-text">${escapeHTML(response.advice || 'Fill this field as per your documents.')}</p>
        </div>
      `;
    }
    
    // Warning
    if (response.warning) {
      html += `
        <div class="gov-helper-card gov-helper-card-warning">
          <div class="gov-helper-card-header">
            <div class="gov-helper-card-icon gov-helper-icon-orange">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <path d="M12 9v4"/><path d="M12 17h.01"/>
              </svg>
            </div>
            <h4 class="gov-helper-card-title">Important</h4>
          </div>
          <p class="gov-helper-card-text">${escapeHTML(response.warning)}</p>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }

  function attachOptionListeners() {
    const options = helperPanel.querySelectorAll('.gov-helper-ai-option');
    options.forEach(option => {
      option.addEventListener('click', () => {
        // Remove previous selection
        helperPanel.querySelectorAll('.gov-helper-ai-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        
        // Show recommendation
        const recommendation = option.dataset.recommendation;
        const recEl = document.getElementById('gov-helper-recommendation');
        const recText = document.getElementById('gov-helper-recommendation-text');
        if (recommendation && recEl && recText) {
          recText.textContent = recommendation;
          recEl.style.display = 'flex';
        }
      });
    });
  }

  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  init();
})();
