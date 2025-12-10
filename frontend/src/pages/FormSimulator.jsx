import { useState, useCallback, useRef } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { 
  Bot, 
  FileText, 
  Shield, 
  Download, 
  Chrome, 
  ExternalLink, 
  ArrowLeft,
  Sparkles,
  X,
  Loader2,
  MessageCircleQuestion,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Circle,
  Info,
  Send,
  MessageSquare
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Form field options data
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

const FIELD_TO_OPTIONS = {
  "Gender": "gender",
  "Marital Status": "marital_status",
  "Educational Qualification": "education",
  "Employment Type": "employment",
  "ECR / ECNR Status": "ecr_status"
};

// Glassmorphic Form Field Component
const FormField = ({ label, name, type = "text", placeholder, options, onFieldFocus, isActive, required = true, helpText }) => {
  const handleFocus = () => {
    onFieldFocus(label, type === "select" ? "select" : "input");
  };

  return (
    <div className="mb-5" data-testid={`form-field-${name}`}>
      <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 flex items-center gap-2">
        {label}
        {required && <span className="text-amber-400">*</span>}
      </label>
      {helpText && (
        <p className="text-xs text-white/40 mb-2 flex items-center gap-1">
          <Info className="w-3 h-3" />
          {helpText}
        </p>
      )}
      {type === "select" ? (
        <select
          name={name}
          onFocus={handleFocus}
          className={`w-full bg-white/5 backdrop-blur-sm border rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none transition-all cursor-pointer ${
            isActive 
              ? 'border-emerald-500/50 ring-2 ring-emerald-500/20 bg-emerald-500/5' 
              : 'border-white/10 hover:border-white/20'
          }`}
          data-testid={`select-${name}`}
        >
          <option value="" className="bg-slate-800">Select an option...</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-800">
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          name={name}
          placeholder={placeholder}
          onFocus={handleFocus}
          rows={3}
          className={`w-full bg-white/5 backdrop-blur-sm border rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none transition-all resize-none ${
            isActive 
              ? 'border-emerald-500/50 ring-2 ring-emerald-500/20 bg-emerald-500/5' 
              : 'border-white/10 hover:border-white/20'
          }`}
          data-testid={`textarea-${name}`}
        />
      ) : (
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          onFocus={handleFocus}
          className={`w-full bg-white/5 backdrop-blur-sm border rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none transition-all ${
            isActive 
              ? 'border-emerald-500/50 ring-2 ring-emerald-500/20 bg-emerald-500/5' 
              : 'border-white/10 hover:border-white/20'
          }`}
          data-testid={`input-${name}`}
        />
      )}
    </div>
  );
};

// Section Header
const SectionHeader = ({ title, subtitle }) => (
  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
    <div className="bg-gradient-to-br from-blue-500 to-emerald-500 p-2 rounded-xl">
      <FileText className="w-5 h-5 text-white" />
    </div>
    <div>
      <h3 className="text-base font-bold text-white">{title}</h3>
      {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
    </div>
  </div>
);

// AI Helper Panel - Glassmorphic Style
const AIHelperPanel = ({ isVisible, isLoading, response, activeField, onClose, error, localData }) => {
  const [selectedOption, setSelectedOption] = useState(null);

  if (!isVisible) return null;

  const isLocalResponse = localData && !response && !isLoading;

  return (
    <div className="fixed right-0 top-0 h-full w-[380px] md:w-[420px] bg-slate-900/95 backdrop-blur-xl z-50 border-l border-white/10 flex flex-col shadow-2xl" data-testid="ai-helper-panel">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-emerald-500 p-2.5 rounded-xl">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Passport Quick Guide</h3>
            <p className="text-xs text-white/50">AI-Powered Assistance</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors" data-testid="close-panel-btn">
          <X className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* Field Indicator */}
      {activeField && (
        <div className="bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border-b border-white/10 px-5 py-3">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Question</p>
          <p className="text-sm font-medium text-white">{activeField}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
              <span className="text-sm text-white/60">Analyzing question...</span>
            </div>
            <div className="space-y-3">
              <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
              <div className="h-20 bg-white/5 rounded-xl animate-pulse" />
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-red-500/10 p-4 rounded-2xl mb-4">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Something went wrong</h4>
            <p className="text-sm text-white/50">{error}</p>
          </div>
        ) : isLocalResponse ? (
          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <ChevronDown className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Dropdown Options</span>
              </div>
              <p className="text-xs text-white/50 mb-3">{localData.hint}</p>
              <div className="space-y-2">
                {localData.options.map((opt, idx) => (
                  <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border ${
                    opt.selected ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 bg-white/5'
                  }`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                      opt.selected ? 'bg-emerald-500 text-white' : 'border-2 border-white/20'
                    }`}>
                      {opt.selected && '✓'}
                    </div>
                    <span className="text-sm text-white/80">{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl">
              <Info className="w-4 h-4 text-white/40" />
              <span className="text-xs text-white/40">Select an option from the form. No AI credits used.</span>
            </div>
          </div>
        ) : response ? (
          <div className="space-y-4">
            {response.needs_interaction && response.question_options?.length > 0 ? (
              <>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-emerald-500/20 p-2 rounded-lg">
                      <MessageCircleQuestion className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Which applies to you?</span>
                  </div>
                  <p className="text-sm text-white/70 mb-4">{response.clarification_question}</p>
                  <div className="space-y-2">
                    {response.question_options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedOption(opt)}
                        className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                          selectedOption?.value === opt.value
                            ? 'border-emerald-500/50 bg-emerald-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 transition-all ${
                          selectedOption?.value === opt.value
                            ? 'bg-emerald-500 text-white'
                            : 'border-2 border-white/20'
                        }`}>
                          {selectedOption?.value === opt.value && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                        <span className={`text-sm ${
                          selectedOption?.value === opt.value ? 'text-emerald-400 font-medium' : 'text-white/70'
                        }`}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  {selectedOption?.recommendation && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 border border-emerald-500/30 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className="bg-emerald-500 p-1.5 rounded-lg">
                          <ChevronRight className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Select This</span>
                          <p className="text-sm font-semibold text-white mt-1">{selectedOption.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {response.warning && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Important</span>
                    </div>
                    <p className="text-sm text-white/70">{response.warning}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-blue-500/20 p-2 rounded-lg">
                      <Lightbulb className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Expert Advice</span>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">{response.advice}</p>
                </div>
                {response.warning && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Avoid This Mistake</span>
                    </div>
                    <p className="text-sm text-white/70">{response.warning}</p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-white/5 p-5 rounded-2xl mb-5">
              <Bot className="w-12 h-12 text-white/30" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Ready to Help!</h4>
            <p className="text-sm text-white/50 max-w-[240px]">Click on any form field to get guidance.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 px-5 py-4 bg-slate-900/50">
        <p className="text-xs text-white/30 text-center">AI-powered guidance</p>
      </div>
    </div>
  );
};

// Main Form Simulator Component
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
      
      const optionKey = FIELD_TO_OPTIONS[fieldLabel];
      if (optionKey && FORM_OPTIONS[optionKey]) {
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

  const ecnrOptions = [
    { value: "ecr", label: "ECR - Emigration Check Required" },
    { value: "ecnr", label: "ECNR - Emigration Check Not Required" }
  ];

  const genderOptions = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "transgender", label: "Transgender" }
  ];

  const maritalOptions = [
    { value: "single", label: "Single / Unmarried" },
    { value: "married", label: "Married" },
    { value: "divorced", label: "Divorced" },
    { value: "widowed", label: "Widow / Widower" }
  ];

  const educationOptions = [
    { value: "below_10th", label: "Below 10th Standard" },
    { value: "10th", label: "10th Pass" },
    { value: "12th", label: "12th Pass / Higher Secondary" },
    { value: "graduate", label: "Graduate" },
    { value: "post_graduate", label: "Post Graduate" }
  ];

  const employmentOptions = [
    { value: "government", label: "Government Employee" },
    { value: "private", label: "Private Sector" },
    { value: "self_employed", label: "Self Employed" },
    { value: "student", label: "Student" },
    { value: "retired", label: "Retired" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white" data-testid="form-simulator">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative bg-slate-900/80 backdrop-blur-xl border-b border-white/10 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-emerald-500 p-2 rounded-xl">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Form Helper Demo</h1>
                <p className="text-xs text-white/50">Try the AI assistant</p>
              </div>
            </div>
          </div>
          <a 
            href={`${API}/extension/download`}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-emerald-500 px-5 py-2.5 rounded-full text-sm font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Extension</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Info Banner */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-blue-500/20 to-emerald-500/20 p-3 rounded-xl">
              <Sparkles className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Interactive Demo</h2>
              <p className="text-sm text-white/60">
                Click on any form field below to see the AI assistant in action. 
                <span className="text-emerald-400"> Dropdowns show options instantly</span>, 
                <span className="text-blue-400"> text fields get AI guidance</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex gap-6">
          <div className={`transition-all duration-300 ${isPanelVisible ? 'w-full lg:w-[calc(100%-440px)]' : 'w-full'}`}>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
              {/* Form Header */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <FileText className="w-7 h-7 text-white/80" />
                  <div>
                    <h2 className="text-lg font-bold text-white">Passport Application Form</h2>
                    <p className="text-sm text-white/50">Sample form based on Passport Seva portal</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Applicant Details */}
                <section className="mb-8">
                  <SectionHeader title="Applicant Details" subtitle="Personal information" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <FormField
                      label="Given Name (First & Middle Name)"
                      name="given_name"
                      placeholder="Enter your first and middle name"
                      onFieldFocus={handleFieldFocus}
                      isActive={activeField === "Given Name (First & Middle Name)"}
                      helpText="As printed on documents"
                    />
                    <FormField
                      label="Surname (Last Name)"
                      name="surname"
                      placeholder="Enter your surname"
                      onFieldFocus={handleFieldFocus}
                      isActive={activeField === "Surname (Last Name)"}
                    />
                    <FormField
                      label="Date of Birth"
                      name="dob"
                      type="date"
                      onFieldFocus={handleFieldFocus}
                      isActive={activeField === "Date of Birth"}
                    />
                    <FormField
                      label="Gender"
                      name="gender"
                      type="select"
                      options={genderOptions}
                      onFieldFocus={handleFieldFocus}
                      isActive={activeField === "Gender"}
                    />
                    <FormField
                      label="Place of Birth"
                      name="birth_place"
                      placeholder="City/Town/Village"
                      onFieldFocus={handleFieldFocus}
                      isActive={activeField === "Place of Birth"}
                    />
                    <FormField
                      label="Marital Status"
                      name="marital_status"
                      type="select"
                      options={maritalOptions}
                      onFieldFocus={handleFieldFocus}
                      isActive={activeField === "Marital Status"}
                    />
                  </div>
                </section>

                {/* Education & Employment */}
                <section className="mb-8">
                  <SectionHeader title="Education & Employment" subtitle="Qualification details" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <FormField
                      label="Educational Qualification"
                      name="education"
                      type="select"
                      options={educationOptions}
                      onFieldFocus={handleFieldFocus}
                      isActive={activeField === "Educational Qualification"}
                    />
                    <FormField
                      label="Employment Type"
                      name="employment"
                      type="select"
                      options={employmentOptions}
                      onFieldFocus={handleFieldFocus}
                      isActive={activeField === "Employment Type"}
                    />
                    <FormField
                      label="ECR / ECNR Status"
                      name="ecr_status"
                      type="select"
                      options={ecnrOptions}
                      onFieldFocus={handleFieldFocus}
                      isActive={activeField === "ECR / ECNR Status"}
                      helpText="Important for international travel"
                    />
                  </div>
                </section>

                {/* Address */}
                <section>
                  <SectionHeader title="Present Address" subtitle="Current residential address" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <FormField
                      label="House No. & Street"
                      name="street"
                      placeholder="Enter address"
                      onFieldFocus={handleFieldFocus}
                      isActive={activeField === "House No. & Street"}
                    />
                    <FormField
                      label="City / Town"
                      name="city"
                      placeholder="Enter city"
                      onFieldFocus={handleFieldFocus}
                      isActive={activeField === "City / Town"}
                    />
                    <FormField
                      label="State"
                      name="state"
                      placeholder="Enter state"
                      onFieldFocus={handleFieldFocus}
                      isActive={activeField === "State"}
                    />
                    <FormField
                      label="PIN Code"
                      name="pincode"
                      placeholder="6-digit PIN"
                      onFieldFocus={handleFieldFocus}
                      isActive={activeField === "PIN Code"}
                    />
                  </div>
                </section>

                {/* Submit */}
                <div className="mt-8 pt-6 border-t border-white/10 flex justify-end gap-4">
                  <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:bg-white/10 transition-colors">
                    Save Draft
                  </button>
                  <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all">
                    Submit Application
                  </button>
                </div>
              </div>
            </div>
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
    </div>
  );
};

export default FormSimulator;
