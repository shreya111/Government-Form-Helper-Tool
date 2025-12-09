import { useState, useCallback, useRef } from "react";
import axios from "axios";
import PassportForm from "@/components/PassportForm";
import AIHelperPanel from "@/components/AIHelperPanel";
import { Bot, FileText, Shield, Download, Chrome, ExternalLink } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Form field options data (to detect locally without API)
const FORM_OPTIONS = {
  gender: [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
    { label: "Transgender", value: "transgender" }
  ],
  marital_status: [
    { label: "Single / Unmarried", value: "single" },
    { label: "Married", value: "married" },
    { label: "Divorced", value: "divorced" },
    { label: "Widow / Widower", value: "widowed" },
    { label: "Separated", value: "separated" }
  ],
  education: [
    { label: "Below 10th Standard", value: "below_10th" },
    { label: "10th Pass", value: "10th" },
    { label: "12th Pass / Higher Secondary", value: "12th" },
    { label: "Graduate", value: "graduate" },
    { label: "Post Graduate", value: "post_graduate" },
    { label: "Professional Degree", value: "professional" }
  ],
  employment: [
    { label: "Government Employee", value: "government" },
    { label: "PSU Employee", value: "psu" },
    { label: "Statutory Body Employee", value: "statutory_body" },
    { label: "Private Sector Employee", value: "private" },
    { label: "Self Employed / Business", value: "self_employed" },
    { label: "Homemaker", value: "homemaker" },
    { label: "Student", value: "student" },
    { label: "Retired", value: "retired" },
    { label: "Others", value: "others" }
  ],
  ecr_status: [
    { label: "ECR - Emigration Check Required", value: "ecr" },
    { label: "ECNR - Emigration Check Not Required", value: "ecnr" }
  ]
};

// Map field labels to option keys
const FIELD_TO_OPTIONS = {
  "Gender": "gender",
  "Marital Status": "marital_status",
  "Educational Qualification": "education",
  "Employment Type": "employment",
  "ECR / ECNR Status": "ecr_status"
};

const FormSimulator = () => {
  const [activeField, setActiveField] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [localData, setLocalData] = useState(null);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [error, setError] = useState(null);
  const lastRequestedField = useRef(null);
  const debounceTimer = useRef(null);

  const handleFieldFocus = useCallback(async (fieldLabel, fieldType = "input") => {
    clearTimeout(debounceTimer.current);
    
    debounceTimer.current = setTimeout(async () => {
      setActiveField(fieldLabel);
      setIsPanelVisible(true);
      setError(null);
      
      // Check if this is a dropdown/select field with known options
      const optionKey = FIELD_TO_OPTIONS[fieldLabel];
      if (optionKey && FORM_OPTIONS[optionKey]) {
        // Show local options - no API call needed
        setIsLoading(false);
        setAiResponse(null);
        setLocalData({
          type: 'select',
          fieldLabel: fieldLabel,
          options: FORM_OPTIONS[optionKey].map(opt => ({ ...opt, selected: false })),
          hint: 'Select one of the available options below:'
        });
        lastRequestedField.current = fieldLabel;
        return;
      }
      
      // For text inputs, call AI API
      // Skip if same field already has response
      if (lastRequestedField.current === fieldLabel && aiResponse && !error) {
        return;
      }

      setIsLoading(true);
      setAiResponse(null);
      setLocalData(null);
      lastRequestedField.current = fieldLabel;

      try {
        const response = await axios.post(`${API}/form-help`, {
          field_label: fieldLabel,
          field_type: fieldType,
          form_context: "Indian Passport Application Form"
        });
        setAiResponse(response.data);
      } catch (err) {
        console.error("Error fetching form help:", err);
        setError("Unable to fetch guidance. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, [aiResponse, error]);

  const handleClosePanel = useCallback(() => {
    setIsPanelVisible(false);
    setTimeout(() => {
      setActiveField(null);
      setAiResponse(null);
      setLocalData(null);
      lastRequestedField.current = null;
    }, 300);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc]" data-testid="form-simulator">
      {/* Header */}
      <header className="bg-[#2c3e50] text-white py-4 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight font-manrope">Government Form Helper</h1>
              <p className="text-sm text-white/70">AI-powered form assistance demo</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">Secure & Private</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Chrome Extension Banner */}
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#34495e] rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-3 rounded-xl">
                <Chrome className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Get the Chrome Extension</h2>
                <p className="text-white/70 text-sm leading-relaxed max-w-xl">
                  Use this helper directly on the <strong>Passport Seva portal</strong>. The extension detects 
                  dropdowns and radio buttons automatically - <strong>no AI credits used for those!</strong>
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a 
                href={`${API}/extension/download`}
                className="flex items-center justify-center gap-2 bg-white text-[#2c3e50] px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-white/90 transition-colors shadow-lg"
                data-testid="download-extension-btn"
              >
                <Download className="w-4 h-4" />
                Download Extension
              </a>
              <a 
                href="https://services1.passportindia.gov.in/forms/PreLogin"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-white/10 text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-white/20 transition-colors border border-white/20"
                data-testid="visit-portal-btn"
              >
                <ExternalLink className="w-4 h-4" />
                Visit Passport Seva
              </a>
            </div>
          </div>
        </div>

        {/* Introduction Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="bg-[#3498db]/10 p-3 rounded-xl">
              <Bot className="w-8 h-8 text-[#3498db]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#2c3e50] mb-1">Welcome to the Form Helper Demo</h2>
              <p className="text-slate-600 leading-relaxed">
                Simply <strong>click on any form field</strong> below. For <span className="text-[#27ae60] font-semibold">dropdowns and radio buttons</span>, 
                we show options directly (no AI call). For <span className="text-[#3498db] font-semibold">text fields</span>, we provide AI-powered guidance.
              </p>
            </div>
          </div>
        </div>

        {/* Form Container with Panel */}
        <div className="flex gap-6">
          {/* Form Section */}
          <div className={`transition-all duration-300 ease-out ${
            isPanelVisible ? 'w-full lg:w-[calc(100%-420px)]' : 'w-full'
          }`}>
            <PassportForm onFieldFocus={handleFieldFocus} activeField={activeField} />
          </div>

          {/* AI Panel */}
          <AIHelperPanel
            isVisible={isPanelVisible}
            isLoading={isLoading}
            response={aiResponse}
            localData={localData}
            activeField={activeField}
            onClose={handleClosePanel}
            error={error}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-slate-500">
            This is a demonstration of the Government Form Helper Chrome Extension concept.
            <br />
            <span className="text-[#27ae60]">Dropdowns: Local detection</span> • <span className="text-[#3498db]">Text fields: AI-powered</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default FormSimulator;
