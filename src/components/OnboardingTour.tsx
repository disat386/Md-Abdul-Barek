import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Zap, Layers, Grid, User } from 'lucide-react';

interface Step {
  title: string;
  description: string;
  targetId: string;
  icon: any;
}

const STEPS: Step[] = [
  {
    title: "Welcome to Auurio",
    description: "Your gateway to a unified AI ecosystem. One account gives you access to multiple specialized powerhouse tools.",
    targetId: "hero-section",
    icon: Zap
  },
  {
    title: "Unified Credit Pool",
    description: "Manage all your resources from a single pool. No more fragmented billing across different services.",
    targetId: "credit-pool-card",
    icon: Layers
  },
  {
    title: "Specialized Toolset",
    description: "Discover tools for audio, motion, news, and more. Each tool is connected by your SSO identity.",
    targetId: "tools-grid",
    icon: Grid
  },
  {
    title: "Personalized Access",
    description: "Sign in to activate global synchronization, track your usage, and access your personal dashboard.",
    targetId: "auth-button",
    icon: User
  }
];

export const OnboardingTour = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('auurio_tour_seen');
    if (!hasSeenTour) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('auurio_tour_seen', 'true');
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      scrollToTarget(STEPS[currentStep + 1].targetId);
    } else {
      handleDismiss();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      scrollToTarget(STEPS[currentStep - 1].targetId);
    }
  };

  const scrollToTarget = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (!isVisible) return null;

  const step = STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={handleDismiss} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl pointer-events-auto overflow-hidden"
      >
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <button 
          onClick={handleDismiss}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors text-white/40 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6">
            <step.icon className="w-8 h-8 text-orange-500" />
          </div>

          <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
          <p className="text-white/60 leading-relaxed mb-8">
            {step.description}
          </p>

          <div className="flex items-center gap-4 w-full">
            {currentStep > 0 && (
              <button 
                onClick={prevStep}
                className="flex-1 px-6 py-3 rounded-xl border border-white/10 font-bold hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            <button 
              onClick={nextStep}
              className="flex-[2] px-6 py-3 rounded-xl bg-orange-500 text-black font-bold hover:bg-white transition-all flex items-center justify-center gap-2"
            >
              {currentStep === STEPS.length - 1 ? 'Get Started' : 'Next Step'}
              {currentStep < STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex gap-2 mt-8">
            {STEPS.map((_, i) => (
              <div 
                key={i}
                className={`h-1 rounded-full transition-all duration-500 ${
                  i === currentStep ? 'w-8 bg-orange-500' : 'w-2 bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
