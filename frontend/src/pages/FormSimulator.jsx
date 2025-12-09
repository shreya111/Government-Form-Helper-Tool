import { useState, useCallback, useRef } from "react";
import axios from "axios";
import PassportForm from "@/components/PassportForm";
import AIHelperPanel from "@/components/AIHelperPanel";
import { Bot, FileText, Shield, Download, Chrome, ExternalLink } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FormSimulator = () => {
  const [activeField, setActiveField] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [error, setError] = useState(null);
  const lastRequestedField = useRef(null);
  const debounceTimer = useRef(null);

  const handleFieldFocus = useCallback(async (fieldLabel, fieldType = "input") => {
    // Debounce to avoid multiple rapid requests
    clearTimeout(debounceTimer.current);
    
    debounceTimer.current = setTimeout(async () => {
      // Skip if same field already has response
      if (lastRequestedField.current === fieldLabel && aiResponse && !error) {
        setActiveField(fieldLabel);
        setIsPanelVisible(true);
        return;
      }

      setActiveField(fieldLabel);
      setIsPanelVisible(true);
      setIsLoading(true);
      setError(null);
      setAiResponse(null);
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
    }, 400); // 400ms debounce
  }, [aiResponse, error]);

  const handleClosePanel = useCallback(() => {
    setIsPanelVisible(false);
    setTimeout(() => {
      setActiveField(null);
      setAiResponse(null);
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
                  Use this helper directly on the <strong>Passport Seva portal</strong>. The extension works in real-time 
                  as you fill the actual form at services1.passportindia.gov.in
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
                Simply <strong>click on any form field</strong> below to receive AI-powered guidance. 
                The assistant will intelligently decide whether to ask you clarifying questions or provide direct advice.
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
            <span className="text-[#3498db]">Powered by Gemini AI</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default FormSimulator;
