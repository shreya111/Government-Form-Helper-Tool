import { Bot, X, MessageCircleQuestion, Lightbulb, AlertTriangle, Loader2 } from "lucide-react";

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
    <ShimmerCard />
  </div>
);

const ResponseCard = ({ type, title, content, icon: Icon, delay = 0 }) => {
  const variants = {
    question: {
      borderClass: "border-l-4 border-l-[#3498db] bg-blue-50/30",
      iconBg: "bg-[#3498db]/10",
      iconColor: "text-[#3498db]",
      titleColor: "text-[#3498db]"
    },
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
      Click on any form field to get AI-powered guidance and helpful tips.
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

const AIHelperPanel = ({ isVisible, isLoading, response, activeField, onClose, error }) => {
  if (!isVisible) return null;

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
            <h3 className="text-sm font-bold text-white">Form Assistant</h3>
            <p className="text-xs text-white/60">Powered by Gemini AI</p>
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
              <span className="text-sm text-slate-500">Analyzing field...</span>
            </div>
            <ShimmerLoader />
          </div>
        ) : error ? (
          <ErrorState error={error} />
        ) : response ? (
          <div className="p-5 space-y-4">
            <ResponseCard
              type="question"
              title="Clarification Question"
              content={response.clarification_question}
              icon={MessageCircleQuestion}
              delay={100}
            />
            <ResponseCard
              type="advice"
              title="Expert Advice"
              content={response.advice}
              icon={Lightbulb}
              delay={200}
            />
            <ResponseCard
              type="warning"
              title="Common Mistake to Avoid"
              content={response.warning}
              icon={AlertTriangle}
              delay={300}
            />
          </div>
        ) : (
          <IdleState />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 px-5 py-4 bg-slate-50 shrink-0">
        <p className="text-xs text-slate-400 text-center">
          Guidance based on official form requirements.
          <br />
          Always verify with official sources.
        </p>
      </div>
    </div>
  );
};

export default AIHelperPanel;
