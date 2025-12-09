import { useState, useEffect } from "react";
import { Bot, X, MessageCircleQuestion, Lightbulb, AlertTriangle, Loader2, CheckCircle2, ChevronRight, Info, ChevronDown, Circle } from "lucide-react";

const ShimmerCard = () => (
  <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm mb-4">
    <div className="shimmer h-4 w-24 rounded mb-3"></div>
    <div className="shimmer h-5 w-full rounded mb-2"></div>
    <div className="shimmer h-5 w-3/4 rounded"></div>
  </div>
);

const ShimmerLoader = () => (
  <div className="space-y-4 px-5 py-4">
    <ShimmerCard />
    <ShimmerCard />
  </div>
);

// Local Options Display (for dropdowns/radios - no AI call)
const LocalOptionsCard = ({ data }) => (
  <div className="space-y-4 card-animate">
    <div 
      className="rounded-xl border border-slate-100 border-l-4 border-l-[#27ae60] bg-[#27ae60]/5 p-5 shadow-sm"
      data-testid="local-options-card"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-[#27ae60]/10 p-2 rounded-lg">
          {data.type === 'select' ? (
            <ChevronDown className="w-4 h-4 text-[#27ae60]" />
          ) : (
            <Circle className="w-4 h-4 text-[#27ae60]" />
          )}
        </div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#27ae60]">
          {data.type === 'select' ? 'Dropdown Options' : 'Radio Options'}
        </h4>
      </div>
      <p className="text-xs text-slate-500 mb-3">{data.hint}</p>
      <div className="space-y-2">
        {data.options.map((opt, idx) => (
          <div 
            key={idx}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              opt.selected 
                ? 'border-[#27ae60] bg-[#27ae60]/5' 
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className={`w-4 h-4 rounded flex items-center justify-center text-xs border-2 ${
              opt.selected 
                ? 'border-[#27ae60] bg-[#27ae60] text-white' 
                : 'border-slate-300'
            }`}>
              {opt.selected && '✓'}
            </div>
            <span className="text-sm text-[#2c3e50]">{opt.label}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
      <Info className="w-4 h-4 text-slate-400" />
      <span className="text-xs text-slate-500">Select an option from the form. No AI credits used.</span>
    </div>
  </div>
);

const QuestionOptionButton = ({ option, isSelected, onClick }) => (
  <button
    onClick={() => onClick(option)}
    className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 group ${
      isSelected 
        ? 'border-[#3498db] bg-[#3498db]/5' 
        : 'border-slate-200 hover:border-[#3498db]/50 hover:bg-slate-50'
    }`}
    data-testid={`option-${option.value}`}
  >
    <div className="flex items-start gap-3">
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-200 ${
        isSelected 
          ? 'border-[#3498db] bg-[#3498db]' 
          : 'border-slate-300 group-hover:border-[#3498db]/50'
      }`}>
        {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${
          isSelected ? 'text-[#3498db]' : 'text-[#2c3e50]'
        }`}>
          {option.label}
        </p>
      </div>
    </div>
  </button>
);

const RecommendationBadge = ({ recommendation }) => (
  <div className="mt-4 p-4 bg-gradient-to-r from-[#27ae60]/10 to-[#27ae60]/5 rounded-xl border border-[#27ae60]/20" data-testid="recommendation-badge">
    <div className="flex items-start gap-3">
      <div className="bg-[#27ae60] p-1.5 rounded-lg shrink-0">
        <ChevronRight className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-xs font-bold text-[#27ae60] uppercase tracking-wider mb-1">Recommendation</p>
        <p className="text-sm font-semibold text-[#2c3e50]">{recommendation}</p>
      </div>
    </div>
  </div>
);

const InteractiveQuestionCard = ({ question, options, onOptionSelect, selectedOption }) => (
  <div 
    className="rounded-xl border border-slate-100 border-l-4 border-l-[#3498db] bg-white p-5 shadow-sm card-animate"
    data-testid="ai-card-question"
  >
    <div className="flex items-start gap-3 mb-4">
      <div className="bg-[#3498db]/10 p-2 rounded-lg shrink-0">
        <MessageCircleQuestion className="w-4 h-4 text-[#3498db]" />
      </div>
      <div className="flex-1">
        <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-[#3498db]">
          Quick Question
        </h4>
        <p className="text-sm text-[#2c3e50] leading-relaxed font-semibold">
          {question}
        </p>
      </div>
    </div>
    
    {options && options.length > 0 && (
      <div className="space-y-2 mt-4">
        <p className="text-xs text-slate-500 font-medium mb-2">Select your answer:</p>
        {options.map((option, index) => (
          <QuestionOptionButton
            key={option.value || index}
            option={option}
            isSelected={selectedOption?.value === option.value}
            onClick={onOptionSelect}
          />
        ))}
      </div>
    )}
    
    {selectedOption?.recommendation && (
      <RecommendationBadge recommendation={selectedOption.recommendation} />
    )}
  </div>
);

const SimpleAdviceCard = ({ advice, warning }) => (
  <div className="space-y-4 card-animate">
    <div 
      className="rounded-xl border border-slate-100 border-l-4 border-l-[#3498db] bg-[#3498db]/5 p-5 shadow-sm"
      data-testid="ai-card-advice"
    >
      <div className="flex items-start gap-3">
        <div className="bg-[#3498db]/10 p-2 rounded-lg shrink-0">
          <Lightbulb className="w-4 h-4 text-[#3498db]" />
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-[#3498db]">
            Expert Advice
          </h4>
          <p className="text-sm text-[#2c3e50] leading-relaxed font-medium">
            {advice}
          </p>
        </div>
      </div>
    </div>
    
    <div 
      className="rounded-xl border border-slate-100 border-l-4 border-l-[#d35400] bg-orange-50/30 p-5 shadow-sm"
      data-testid="ai-card-warning"
    >
      <div className="flex items-start gap-3">
        <div className="bg-[#d35400]/10 p-2 rounded-lg shrink-0">
          <AlertTriangle className="w-4 h-4 text-[#d35400]" />
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-[#d35400]">
            Common Mistake to Avoid
          </h4>
          <p className="text-sm text-[#2c3e50] leading-relaxed font-medium">
            {warning}
          </p>
        </div>
      </div>
    </div>
  </div>
);

const ResponseCard = ({ type, title, content, icon: Icon, delay = 0 }) => {
  const variants = {
    advice: {
      borderClass: "border-l-4 border-l-slate-400 bg-slate-50",
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
      titleColor: "text-slate-700"
    },
    warning: {
      borderClass: "border-l-4 border-l-[#d35400] bg-orange-50/30",
      iconBg: "bg-[#d35400]/10",
      iconColor: "text-[#d35400]",
      titleColor: "text-[#d35400]"
    }
  };

  const style = variants[type] || variants.advice;

  return (
    <div 
      className={`rounded-xl border border-slate-100 ${style.borderClass} p-5 shadow-sm hover:shadow-md transition-shadow duration-200 card-animate hover-lift`}
      style={{ animationDelay: `${delay}ms` }}
      data-testid={`ai-card-${type}`}
    >
      <div className="flex items-start gap-3">
        <div className={`${style.iconBg} p-2 rounded-lg shrink-0`}>
          <Icon className={`w-4 h-4 ${style.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${style.titleColor}`}>
            {title}
          </h4>
          <p className="text-sm text-[#2c3e50] leading-relaxed font-medium">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
};

const IdleState = () => (
  <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
    <div className="bg-slate-100 p-5 rounded-2xl mb-5">
      <Bot className="w-12 h-12 text-slate-400" />
    </div>
    <h3 className="text-lg font-bold text-[#2c3e50] mb-2">Ready to Help!</h3>
    <p className="text-sm text-slate-500 leading-relaxed max-w-[240px]">
      Click on any form field to see available options or get guidance.
    </p>
  </div>
);

const ErrorState = ({ error }) => (
  <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
    <div className="bg-red-100 p-5 rounded-2xl mb-5">
      <AlertTriangle className="w-12 h-12 text-red-500" />
    </div>
    <h3 className="text-lg font-bold text-[#2c3e50] mb-2">Oops! Something went wrong</h3>
    <p className="text-sm text-slate-500 leading-relaxed max-w-[240px]">
      {error}
    </p>
  </div>
);

const AIHelperPanel = ({ isVisible, isLoading, response, activeField, onClose, error, localData }) => {
  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    setSelectedOption(null);
  }, [activeField]);

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };

  if (!isVisible) return null;

  const isLocalResponse = localData && !response && !isLoading;
  const footerText = isLocalResponse 
    ? "Options detected from form" 
    : (isLoading ? "Getting AI guidance..." : "AI-powered guidance");

  return (
    <div 
      className={`fixed right-0 top-0 h-full w-[320px] md:w-[400px] bg-white shadow-2xl z-50 border-l border-slate-200 flex flex-col panel-enter`}
      data-testid="ai-helper-panel"
    >
      {/* Panel Header */}
      <div className="bg-[#2c3e50] px-5 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Form Quick Guide</h3>
            <p className="text-xs text-white/60">Click any field for help</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
          data-testid="close-panel-btn"
        >
          <X className="w-5 h-5 text-white/80" />
        </button>
      </div>

      {/* Active Field Indicator */}
      {activeField && (
        <div className="bg-[#3498db]/5 border-b border-[#3498db]/20 px-5 py-3 shrink-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Current Field</p>
          <p className="text-sm font-bold text-[#2c3e50] truncate">{activeField}</p>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="pt-4">
            <div className="px-5 py-2 flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 text-[#3498db] animate-spin" />
              <span className="text-sm text-slate-500">Getting AI guidance...</span>
            </div>
            <ShimmerLoader />
          </div>
        ) : error ? (
          <ErrorState error={error} />
        ) : isLocalResponse ? (
          <div className="p-5">
            <LocalOptionsCard data={localData} />
          </div>
        ) : response ? (
          <div className="p-5 space-y-4">
            {response.needs_interaction && response.clarification_question ? (
              <>
                <InteractiveQuestionCard
                  question={response.clarification_question}
                  options={response.question_options}
                  onOptionSelect={handleOptionSelect}
                  selectedOption={selectedOption}
                />
                <ResponseCard
                  type="warning"
                  title="Common Mistake to Avoid"
                  content={response.warning}
                  icon={AlertTriangle}
                  delay={300}
                />
              </>
            ) : (
              <SimpleAdviceCard 
                advice={response.advice} 
                warning={response.warning} 
              />
            )}
          </div>
        ) : (
          <IdleState />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 px-5 py-4 bg-slate-50 shrink-0">
        <p className="text-xs text-slate-400 text-center">
          {footerText}
        </p>
      </div>
    </div>
  );
};

export default AIHelperPanel;
