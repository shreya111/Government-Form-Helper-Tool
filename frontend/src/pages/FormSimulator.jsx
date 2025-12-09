import { useState, useCallback } from "react";
import axios from "axios";
import PassportForm from "@/components/PassportForm";
import AIHelperPanel from "@/components/AIHelperPanel";
import { Bot, FileText, Shield } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FormSimulator = () => {
  const [activeField, setActiveField] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [error, setError] = useState(null);

  const handleFieldFocus = useCallback(async (fieldLabel, fieldType = "input") => {
    setActiveField(fieldLabel);
    setIsPanelVisible(true);
    setIsLoading(true);
    setError(null);
    setAiResponse(null);

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
  }, []);

  const handleClosePanel = useCallback(() => {
    setIsPanelVisible(false);
    setTimeout(() => {
      setActiveField(null);
      setAiResponse(null);
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
        {/* Introduction Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="bg-[#3498db]/10 p-3 rounded-xl">
              <Bot className="w-8 h-8 text-[#3498db]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#2c3e50] mb-1">Welcome to the Form Helper Demo</h2>
              <p className="text-slate-600 leading-relaxed">
                Click on any form field below to receive AI-powered guidance. The assistant will help you understand 
                what to enter, ask clarifying questions, and warn you about common mistakes.
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
