import React, { useState, useEffect } from "react";
import { 
  Linkedin, 
  Twitter, 
  Instagram, 
  Sparkles, 
  Copy, 
  Check, 
  Image as ImageIcon, 
  Settings, 
  RefreshCw, 
  Download, 
  AlertCircle, 
  Trash2, 
  History, 
  Heart, 
  MessageCircle, 
  Repeat, 
  Bookmark, 
  ExternalLink,
  Info,
  Sliders,
  Send,
  Plus,
  Eye,
  PenTool,
  CheckCircle2,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PlatformDraft {
  text: string;
  imagePrompt: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
  imageError?: string;
  aspectRatio: string;
  imageSize: string;
  imageModel: string;
  isFallback?: boolean;
  fallbackReason?: string;
}

interface GeneratedResults {
  linkedin: PlatformDraft;
  twitter: PlatformDraft;
  instagram: PlatformDraft;
}

interface HistoryItem {
  id: string;
  timestamp: string;
  idea: string;
  tone: string;
  textModel: string;
  results: GeneratedResults;
}

const TONES = [
  { id: "professional", label: "Professional", icon: "💼", desc: "Corporate, informative, authoritative" },
  { id: "witty", label: "Witty & Fun", icon: "🧠", desc: "Humorous, clever, high engagement" },
  { id: "urgent", label: "Bold & Urgent", icon: "🔥", desc: "Compelling, direct, call-to-action" },
  { id: "educational", label: "Educational", icon: "📚", desc: "Insightful, explanatory, value-driven" },
  { id: "inspirational", label: "Inspirational", icon: "✨", desc: "Motivating, storytelling, uplifting" },
  { id: "casual", label: "Casual/Friendly", icon: "👋", desc: "Approachable, conversational, warm" },
  { id: "custom", label: "Custom Tone...", icon: "🎨", desc: "Define your own unique style voice" }
];

const TEXT_MODELS = [
  { id: "gemini-3.5-flash", name: "Balanced (Gemini 3.5 Flash)", desc: "Excellent overall speed and creative copywriting." },
  { id: "gemini-3.1-pro-preview", name: "Creative/Smart (Gemini 3.1 Pro)", desc: "Advanced reasoning, intricate structure, premium quality." },
  { id: "gemini-3.1-flash-lite", name: "Fast (Gemini 3.1 Flash Lite)", desc: "Ultra-low latency generation for rapid iterations." }
];

const ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"];
const IMAGE_SIZES = ["1K", "2K", "4K"];

export default function App() {
  // Main settings state
  const [idea, setIdea] = useState("");
  const [selectedTone, setSelectedTone] = useState("professional");
  const [customToneText, setCustomToneText] = useState("");
  const [textModel, setTextModel] = useState("gemini-3.5-flash");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results State
  const [results, setResults] = useState<GeneratedResults | null>(null);
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Server health state
  const [hasApiKey, setHasApiKey] = useState(true);
  const [isHealthChecking, setIsHealthChecking] = useState(true);

  // Copy notification state
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  // Active view tab: 'linkedin' | 'twitter' | 'instagram' | 'compare'
  const [activeTab, setActiveTab] = useState<"linkedin" | "twitter" | "instagram" | "compare">("compare");

  // Loading process steps during generation
  const [generationStep, setGenerationStep] = useState(0);
  const loadingSteps = [
    "Analyzing social target demographics...",
    "Brainstorming engaging platform hooks...",
    "Drafting customized LinkedIn, Twitter, and Instagram copy...",
    "Structuring perfect visual composition prompts...",
    "Polishing emoji accents and semantic tagging..."
  ];

  // Progressive loading interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setGenerationStep(0);
      interval = setInterval(() => {
        setGenerationStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Load history & check server health on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("social_studio_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load history from local storage:", e);
    }

    async function checkHealth() {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        setHasApiKey(data.hasApiKey);
      } catch (e) {
        console.error("Health check failed:", e);
        // Fallback assumes key is set or handled server side
      } finally {
        setIsHealthChecking(false);
      }
    }
    checkHealth();
  }, []);

  // Save history helper
  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem("social_studio_history", JSON.stringify(newHistory));
  };

  // Main generation handler
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;

    setIsGenerating(true);
    setError(null);
    setResults(null);

    const activeTone = selectedTone === "custom" ? customToneText : selectedTone;

    try {
      const response = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          tone: activeTone,
          textModel,
          additionalInstructions
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate drafts.");
      }

      const data = await response.json();

      // Setup raw generated data with platform-specific optimal default aspect ratios
      const formattedResults: GeneratedResults = {
        linkedin: {
          text: data.linkedin.text,
          imagePrompt: data.linkedin.imagePrompt,
          aspectRatio: "16:9", // Landscape optimal for LinkedIn posts
          imageSize: "1K",
          imageModel: "gemini-3.1-flash-image-preview",
        },
        twitter: {
          text: data.twitter.text,
          imagePrompt: data.twitter.imagePrompt,
          aspectRatio: "16:9", // Twitter preview optimal
          imageSize: "1K",
          imageModel: "gemini-3.1-flash-image-preview",
        },
        instagram: {
          text: data.instagram.text,
          imagePrompt: data.instagram.imagePrompt,
          aspectRatio: "1:1", // Instagram square grid optimal
          imageSize: "1K",
          imageModel: "gemini-3.1-flash-image-preview",
        }
      };

      setResults(formattedResults);

      // Add to history
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        idea,
        tone: activeTone,
        textModel,
        results: formattedResults
      };
      saveHistory([historyItem, ...history]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred while generating content.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Platform specific image generation handler
  const handleGenerateImage = async (platform: keyof GeneratedResults) => {
    if (!results) return;

    // Set platform-specific image generating state
    setResults((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [platform]: {
          ...prev[platform],
          isGeneratingImage: true,
          imageError: undefined
        }
      };
    });

    try {
      const platformData = results[platform];
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: platformData.imagePrompt,
          aspectRatio: platformData.aspectRatio,
          imageSize: platformData.imageSize,
          model: platformData.imageModel
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate image.");
      }

      const data = await response.json();

      setResults((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          [platform]: {
            ...prev[platform],
            imageUrl: data.imageUrl,
            isFallback: data.isFallback,
            fallbackReason: data.fallbackReason,
            isGeneratingImage: false
          }
        };
      });

      // Update history reference as well
      const updatedHistory = history.map((item) => {
        if (item.idea === idea) {
          return {
            ...item,
            results: {
              ...item.results,
              [platform]: {
                ...item.results[platform],
                imageUrl: data.imageUrl,
                isFallback: data.isFallback,
                fallbackReason: data.fallbackReason
              }
            }
          };
        }
        return item;
      });
      saveHistory(updatedHistory);
    } catch (err: any) {
      console.error(err);
      setResults((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          [platform]: {
            ...prev[platform],
            imageError: err.message || "Image generation failed.",
            isGeneratingImage: false
          }
        };
      });
    }
  };

  // Helper to handle text/prompt modification by user
  const handleEditDraft = (platform: keyof GeneratedResults, field: "text" | "imagePrompt", value: string) => {
    setResults((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [platform]: {
          ...prev[platform],
          [field]: value
        }
      };
    });
  };

  // Helper to update specific platform configuration (ratio, size, model)
  const handleUpdatePlatformConfig = (platform: keyof GeneratedResults, field: "aspectRatio" | "imageSize" | "imageModel", value: string) => {
    setResults((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [platform]: {
          ...prev[platform],
          [field]: value
        }
      };
    });
  };

  // Clipboard copy utility
  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedStates((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  // Load history item
  const handleLoadHistory = (item: HistoryItem) => {
    setIdea(item.idea);
    const matchedTone = TONES.find((t) => t.id === item.tone);
    if (matchedTone) {
      setSelectedTone(matchedTone.id);
    } else {
      setSelectedTone("custom");
      setCustomToneText(item.tone);
    }
    setTextModel(item.textModel);
    setResults(item.results);
    setIsHistoryOpen(false);
  };

  // Clear history item
  const handleClearHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((item) => item.id !== id);
    saveHistory(updated);
  };

  // Trigger download of generated image
  const handleDownloadImage = (platformName: string, url: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `social-studio-${platformName}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans flex flex-col selection:bg-blue-500 selection:text-white relative overflow-hidden">
      {/* Decorative background blur bubbles for Frosted Glass theme */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-blue-600/15 blur-[135px] animate-pulse" style={{ animationDuration: '10s' }}></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-purple-600/12 blur-[165px] animate-pulse" style={{ animationDuration: '15s' }}></div>
      </div>

      {/* Header Banner for missing API Key */}
      {!isHealthChecking && !hasApiKey && (
        <div className="relative z-50 bg-amber-600/90 backdrop-blur-md text-white py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2 shadow-md border-b border-amber-500/30">
          <Lock className="w-4 h-4 shrink-0" />
          <span>To make API calls to Gemini and Nano Banana image generators, please supply your <strong className="underline">GEMINI_API_KEY</strong> in the <strong>Settings &gt; Secrets</strong> tab of your AI Studio interface.</span>
        </div>
      )}

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/5 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between shadow-lg relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/10">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg tracking-tight text-white flex items-center gap-2">
              Social Content Studio
              <span className="text-xs font-normal text-blue-300 bg-white/10 px-2 py-0.5 rounded-full border border-white/5">v1.2</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Cross-platform drafting & graphic design pipeline</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* History Toggle Button */}
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${
              isHistoryOpen 
                ? "bg-white/15 border-white/20 text-white" 
                : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white"
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
            {history.length > 0 && (
              <span className={`text-xs ml-1 px-1.5 py-0.5 rounded-full font-bold ${
                isHistoryOpen ? "bg-blue-500/30 text-blue-200" : "bg-white/10 text-slate-300"
              }`}>
                {history.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
        
        {/* Left Side: Creative Console Input */}
        <aside className="w-full lg:w-[420px] shrink-0 bg-white/5 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-white/10 p-6 flex flex-col gap-6 overflow-y-auto max-h-[100vh] lg:max-h-[calc(100vh-73px)] relative z-10">
          
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Sliders className="w-4 h-4 text-blue-400" />
            <h2 className="font-display font-semibold text-white text-sm tracking-wide uppercase">Creative Console</h2>
          </div>

          <form onSubmit={handleGenerate} className="flex flex-col gap-6">
            
            {/* Core Idea Textarea */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-blue-300 uppercase tracking-wider flex justify-between items-center">
                <span>1. Content Idea or Topic</span>
                <span className="text-[10px] text-slate-400 font-normal normal-case">Details help yield better posts</span>
              </label>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="E.g., A launch campaign for an eco-friendly smart bottle that tracks hydration levels, cleans itself using UV-C light, and filters water on the go. Focus on modern lifestyle, zero-waste, and fitness."
                className="w-full h-32 px-3 py-2 text-sm border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all bg-black/25 placeholder:text-white/20 font-sans leading-relaxed text-white"
                required
              />
            </div>

            {/* Tone Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                2. Select Core Tone
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTone(t.id);
                      if (t.id !== "custom") setCustomToneText("");
                    }}
                    className={`p-2 text-left rounded-xl border transition-all text-xs flex flex-col gap-1 cursor-pointer ${
                      selectedTone === t.id 
                        ? "bg-blue-500/30 border-blue-400/50 ring-2 ring-blue-400/30 text-white" 
                        : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-bold">
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 line-clamp-1 leading-normal">{t.desc}</span>
                  </button>
                ))}
              </div>

              {/* Custom Tone Input */}
              <AnimatePresence>
                {selectedTone === "custom" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-1"
                  >
                    <input
                      type="text"
                      value={customToneText}
                      onChange={(e) => setCustomToneText(e.target.value)}
                      placeholder="Enter custom tone (e.g., Sarcastic, Academic, Cyberpunk)..."
                      className="w-full px-3 py-2 text-xs border border-white/10 rounded-lg bg-black/35 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      required
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Expandable Pro Settings */}
            <div className="border-t border-white/10 pt-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Advanced Settings</span>
                <span className="text-[10px] bg-white/10 border border-white/5 text-blue-200 px-2 py-0.5 rounded font-mono">Model Configuration</span>
              </div>

              {/* Gemini Model for copywriting */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-300">Text Copywriting Model</label>
                <select
                  value={textModel}
                  onChange={(e) => setTextModel(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-white/10 rounded-lg bg-black/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                >
                  {TEXT_MODELS.map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                      {m.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 leading-normal">
                  {TEXT_MODELS.find(m => m.id === textModel)?.desc}
                </p>
              </div>

              {/* Custom Guidelines */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-300 flex justify-between">
                  <span>Custom Context / Guidelines</span>
                  <span className="text-[9px] text-slate-400 font-normal">Optional</span>
                </label>
                <textarea
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="E.g., Include specific call-to-actions, list features as checkmarks, avoid corporate slang."
                  className="w-full h-16 px-2.5 py-1.5 text-xs border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-black/25 placeholder:text-white/20 text-white leading-normal"
                />
              </div>
            </div>

            {/* Launch Campaign CTA */}
            <button
              type="submit"
              disabled={isGenerating}
              className={`w-full py-3.5 rounded-xl text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                isGenerating 
                  ? "bg-white/10 text-white/40 cursor-not-allowed" 
                  : "bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-transform cursor-pointer"
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Drafting posts...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-blue-200" />
                  <span>Generate Platform Drafts</span>
                </>
              )}
            </button>
          </form>
        </aside>

        {/* Right Side: Primary Results Workspace */}
        <main className="flex-1 bg-transparent p-6 flex flex-col gap-6 overflow-y-auto max-h-[100vh] lg:max-h-[calc(100vh-73px)] relative z-10">
          
          {/* History Sidebar/Drawer */}
          <AnimatePresence>
            {isHistoryOpen && (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.3 }}
                className="absolute right-0 top-0 bottom-0 w-80 bg-slate-950/90 backdrop-blur-2xl shadow-2xl border-l border-white/15 z-50 p-5 flex flex-col gap-4 overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-400" />
                    <h3 className="font-display font-bold text-white text-sm">Draft History</h3>
                  </div>
                  <button 
                    onClick={() => setIsHistoryOpen(false)} 
                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                  >
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                  {history.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-center p-4">
                      <History className="w-8 h-8 text-white/10 mb-2" />
                      <p className="text-xs text-slate-400 font-medium">No previous generations saved in this session.</p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleLoadHistory(item)}
                        className="p-3 bg-white/5 border border-white/10 rounded-xl hover:border-blue-500/50 hover:bg-white/10 cursor-pointer transition-all group flex flex-col gap-1.5"
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] text-slate-400 font-medium">{item.timestamp}</span>
                          <button
                            onClick={(e) => handleClearHistoryItem(item.id, e)}
                            className="text-slate-400 hover:text-red-400 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs font-semibold text-slate-200 line-clamp-2 leading-relaxed">
                          {item.idea}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] bg-white/10 text-blue-300 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            {item.tone}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {item.textModel.replace("gemini-", "")}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Central Workspace area */}
          <div className="max-w-6xl mx-auto w-full flex flex-col gap-6 h-full">
            
            {/* Display active status or loaders */}
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="flex-1 flex flex-col items-center justify-center p-8 bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 relative">
                    <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                    <Sparkles className="w-4 h-4 text-blue-300 absolute top-1 right-1 animate-bounce" />
                  </div>
                  
                  <h3 className="font-display font-bold text-lg text-white mb-2">Architecting Social Media Content...</h3>
                  
                  {/* Step Loader Indicators */}
                  <div className="w-full max-w-sm flex flex-col gap-1">
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-4">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-blue-400 to-indigo-500"
                        animate={{ width: `${((generationStep + 1) / loadingSteps.length) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    {loadingSteps.map((step, idx) => (
                      <div 
                        key={idx} 
                        className={`flex items-center gap-2.5 text-xs transition-colors duration-300 ${
                          idx === generationStep 
                            ? "text-blue-400 font-semibold" 
                            : idx < generationStep 
                              ? "text-emerald-400" 
                              : "text-white/30"
                        }`}
                      >
                        {idx < generationStep ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : idx === generationStep ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-white/10" />
                        )}
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : results ? (
                /* Main Generation Workspace Display */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-6"
                >
                  {/* Workspace Subheading / Controls */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <h3 className="font-display font-bold text-xl text-white flex items-center gap-2">
                        Draft Generation Workspace
                        <span className="text-xs font-mono bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                          Tone: {selectedTone === "custom" ? customToneText : selectedTone}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 leading-normal">
                        Inspect, edit, configure aspect ratios, and generate studio illustrations for each social post.
                      </p>
                    </div>

                    {/* View selectors */}
                    <div className="bg-white/5 border border-white/10 p-1 rounded-xl flex self-start md:self-auto shadow-inner backdrop-blur-sm">
                      <button
                        onClick={() => setActiveTab("compare")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeTab === "compare" 
                            ? "bg-white/15 text-white shadow-xs" 
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        Compare All
                      </button>
                      <button
                        onClick={() => setActiveTab("linkedin")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          activeTab === "linkedin" 
                            ? "bg-blue-500/25 text-blue-300 shadow-xs border border-blue-400/20" 
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        <Linkedin className="w-3.5 h-3.5 text-blue-400" />
                        <span>LinkedIn</span>
                      </button>
                      <button
                        onClick={() => setActiveTab("twitter")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          activeTab === "twitter" 
                            ? "bg-sky-500/25 text-sky-300 shadow-xs border border-sky-400/20" 
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        <Twitter className="w-3.5 h-3.5 text-sky-400" />
                        <span>Twitter/X</span>
                      </button>
                      <button
                        onClick={() => setActiveTab("instagram")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          activeTab === "instagram" 
                            ? "bg-pink-500/25 text-pink-300 shadow-xs border border-pink-400/20" 
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        <Instagram className="w-3.5 h-3.5 text-pink-400" />
                        <span>Instagram</span>
                      </button>
                    </div>
                  </div>

                  {/* Rendering Platform Layouts */}
                  <div className={`grid gap-6 ${activeTab === "compare" ? "grid-cols-1 xl:grid-cols-3" : "grid-cols-1"}`}>
                    
                    {/* LINKEDIN POST PLATFORM CARD */}
                    {(activeTab === "compare" || activeTab === "linkedin") && (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-300 uppercase tracking-wider">
                          <Linkedin className="w-4 h-4 text-blue-400" />
                          <span>LinkedIn Professional Hub</span>
                        </div>
                        
                        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col justify-between h-full hover:border-white/20 transition-all">
                          {/* LinkedIn Mock Post Header */}
                          <div className="p-4 flex items-start gap-3 border-b border-white/10 bg-white/5">
                            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 shrink-0 flex items-center justify-center font-bold text-white font-display text-sm">
                              ME
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-white">Your Brand Executive</h4>
                              <p className="text-[10px] text-slate-400 truncate">Content Director • 1st</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[9px] text-slate-400">Just now</span>
                                <span className="text-[9px] text-slate-400">•</span>
                                <svg className="w-2.5 h-2.5 text-slate-400" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM4.5 7.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5z"/>
                                </svg>
                              </div>
                            </div>
                            <button className="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors shrink-0">
                              + Follow
                            </button>
                          </div>

                          {/* LinkedIn Mock Post Editable Text Content */}
                          <div className="p-4 flex-1 flex flex-col gap-3">
                            <div className="relative group">
                              <textarea
                                value={results.linkedin.text}
                                onChange={(e) => handleEditDraft("linkedin", "text", e.target.value)}
                                className="w-full min-h-[160px] text-xs text-gray-100 bg-black/20 p-3 rounded-xl border border-white/5 hover:border-white/20 focus:border-blue-500/50 focus:bg-black/30 focus:outline-none transition-all resize-y font-sans leading-relaxed whitespace-pre-wrap"
                              />
                              <div className="absolute top-2 right-2 flex gap-1 opacity-10 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleCopyText(results.linkedin.text, "linkedin")}
                                  className="p-1.5 bg-white/10 border border-white/10 rounded-lg shadow-sm text-white/70 hover:text-white transition-colors"
                                  title="Copy text"
                                >
                                  {copiedStates["linkedin"] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            {/* Image Workspace for this platform */}
                            <ImageControlWorkspace 
                              platform="linkedin"
                              platformData={results.linkedin}
                              onGenerateImage={() => handleGenerateImage("linkedin")}
                              onUpdateConfig={(f, v) => handleUpdatePlatformConfig("linkedin", f, v)}
                              onEditPrompt={(v) => handleEditDraft("linkedin", "imagePrompt", v)}
                              onDownloadImage={(url) => handleDownloadImage("linkedin", url)}
                            />
                          </div>

                          {/* LinkedIn Mock Post Footer Interactives */}
                          <div className="px-4 py-2 bg-white/5 border-t border-white/10 flex items-center justify-between text-[11px] font-bold text-slate-400 select-none">
                            <button className="hover:bg-white/10 hover:text-white p-1.5 rounded flex items-center gap-1.5 flex-1 justify-center transition-colors">
                              👍 <span>Like</span>
                            </button>
                            <button className="hover:bg-white/10 hover:text-white p-1.5 rounded flex items-center gap-1.5 flex-1 justify-center transition-colors">
                              💬 <span>Comment</span>
                            </button>
                            <button className="hover:bg-white/10 hover:text-white p-1.5 rounded flex items-center gap-1.5 flex-1 justify-center transition-colors">
                              🔁 <span>Repost</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TWITTER POST PLATFORM CARD */}
                    {(activeTab === "compare" || activeTab === "twitter") && (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 uppercase tracking-wider">
                          <Twitter className="w-4 h-4 text-sky-400" />
                          <span>Twitter / X micro-post</span>
                        </div>

                        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col justify-between h-full hover:border-white/20 transition-all text-white">
                          {/* Twitter Mock Header */}
                          <div className="p-4 flex items-start gap-3 border-b border-white/10 bg-white/5">
                            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/25 shrink-0 flex items-center justify-center font-bold text-slate-300 font-display text-sm">
                              X
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-white flex items-center gap-1">
                                <span>Your Brand Handle</span>
                                <span className="text-[10px] bg-sky-500 p-0.5 rounded-full text-white inline-block">✓</span>
                              </h4>
                              <p className="text-[10px] text-slate-400">@YourHandle • Now</p>
                            </div>
                            <button className="text-[11px] font-bold bg-white text-slate-950 px-3 py-1 rounded-full hover:bg-slate-100 transition-colors shrink-0">
                              Follow
                            </button>
                          </div>

                          {/* Twitter Mock Editable Content */}
                          <div className="p-4 flex-1 flex flex-col gap-3">
                            <div className="relative group">
                              <textarea
                                value={results.twitter.text}
                                onChange={(e) => handleEditDraft("twitter", "text", e.target.value)}
                                className="w-full min-h-[120px] text-xs text-slate-100 bg-black/20 p-3 rounded-xl border border-white/5 hover:border-white/20 focus:border-sky-500/50 focus:bg-black/30 focus:outline-none transition-all resize-y font-sans leading-relaxed whitespace-pre-wrap"
                              />
                              <div className="absolute top-2 right-2 flex gap-1 opacity-10 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleCopyText(results.twitter.text, "twitter")}
                                  className="p-1.5 bg-white/10 border border-white/10 rounded-lg shadow-sm text-slate-300 hover:text-white"
                                  title="Copy text"
                                >
                                  {copiedStates["twitter"] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            {/* Character Count Bar */}
                            <div className="flex justify-end items-center gap-1.5 text-[10px] text-slate-400">
                              <span>Length:</span>
                              <span className={results.twitter.text.length > 280 ? "text-red-400 font-bold" : "text-slate-400"}>
                                {results.twitter.text.length} / 280
                              </span>
                            </div>

                            {/* Image Workspace for Twitter */}
                            <ImageControlWorkspace 
                              platform="twitter"
                              platformData={results.twitter}
                              onGenerateImage={() => handleGenerateImage("twitter")}
                              onUpdateConfig={(f, v) => handleUpdatePlatformConfig("twitter", f, v)}
                              onEditPrompt={(v) => handleEditDraft("twitter", "imagePrompt", v)}
                              onDownloadImage={(url) => handleDownloadImage("twitter", url)}
                              isDarkTheme={true}
                            />
                          </div>

                          {/* Twitter Post Actions */}
                          <div className="px-4 py-2.5 bg-white/5 border-t border-white/10 flex items-center justify-between text-slate-400 select-none text-[11px]">
                            <button className="hover:text-sky-400 flex items-center gap-1.5 justify-center flex-1 transition-colors">
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>24</span>
                            </button>
                            <button className="hover:text-emerald-400 flex items-center gap-1.5 justify-center flex-1 transition-colors">
                              <Repeat className="w-3.5 h-3.5" />
                              <span>89</span>
                            </button>
                            <button className="hover:text-pink-500 flex items-center gap-1.5 justify-center flex-1 transition-colors">
                              <Heart className="w-3.5 h-3.5" />
                              <span>312</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* INSTAGRAM POST PLATFORM CARD */}
                    {(activeTab === "compare" || activeTab === "instagram") && (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-pink-400 uppercase tracking-wider">
                          <Instagram className="w-4 h-4 text-pink-400" />
                          <span>Instagram Aesthetic Feed</span>
                        </div>

                        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col justify-between h-full hover:border-white/20 transition-all text-white">
                          {/* Instagram Header */}
                          <div className="p-4 flex items-center gap-3 border-b border-white/10 bg-white/5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 p-[2px] shrink-0">
                              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-slate-300 font-display text-sm">
                                ME
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-white">your_aesthetic_brand</h4>
                              <p className="text-[9px] text-slate-450">Original Audio</p>
                            </div>
                            <button className="text-slate-400 hover:text-white font-bold tracking-widest text-xs transition-colors">
                              •••
                            </button>
                          </div>

                          {/* Instagram Mock Workspace */}
                          <div className="p-4 flex-1 flex flex-col gap-4">
                            
                            {/* Image Block: Put visual on top for Instagram since it's visual-first! */}
                            <ImageControlWorkspace 
                              platform="instagram"
                              platformData={results.instagram}
                              onGenerateImage={() => handleGenerateImage("instagram")}
                              onUpdateConfig={(f, v) => handleUpdatePlatformConfig("instagram", f, v)}
                              onEditPrompt={(v) => handleEditDraft("instagram", "imagePrompt", v)}
                              onDownloadImage={(url) => handleDownloadImage("instagram", url)}
                            />

                            {/* Instagram Post Caption Editable */}
                            <div className="relative group mt-1">
                              <textarea
                                value={results.instagram.text}
                                onChange={(e) => handleEditDraft("instagram", "text", e.target.value)}
                                className="w-full min-h-[140px] text-xs text-gray-100 bg-black/20 p-3 rounded-xl border border-white/5 hover:border-white/20 focus:border-pink-500/50 focus:bg-black/30 focus:outline-none transition-all resize-y font-sans leading-relaxed whitespace-pre-wrap"
                              />
                              <div className="absolute top-2 right-2 flex gap-1 opacity-10 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleCopyText(results.instagram.text, "instagram")}
                                  className="p-1.5 bg-white/10 border border-white/10 rounded-lg shadow-sm text-white/70 hover:text-white transition-colors"
                                  title="Copy text"
                                >
                                  {copiedStates["instagram"] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Instagram Interaction Bar */}
                          <div className="px-4 py-2 bg-white/5 border-t border-white/10 flex items-center justify-between text-slate-400 select-none">
                            <div className="flex items-center gap-3">
                              <Heart className="w-4 h-4 hover:text-red-500 cursor-pointer transition-colors" />
                              <MessageCircle className="w-4 h-4 hover:text-sky-400 cursor-pointer transition-colors" />
                              <Send className="w-4 h-4 hover:text-pink-450 cursor-pointer transition-colors" />
                            </div>
                            <Bookmark className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </motion.div>
              ) : (
                /* Empty / Intro Splash State */
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-1 flex flex-col items-center justify-center p-12 bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-blue-400">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <h3 className="font-display font-extrabold text-2xl text-white mb-2">Cross-Platform Social Post Engine</h3>
                  <p className="text-sm text-slate-350 max-w-lg mb-8 leading-relaxed">
                    Provide an overarching campaign or post idea, choose your desired tone, and let our pipeline design optimized copywriting drafts alongside tailored artistic graphics in correct platform-specific aspect ratios.
                  </p>
                  
                  {/* Tips or Guide */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl text-left">
                    <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">💡 Tip 1</span>
                      <h4 className="text-xs font-bold text-white">Elaborate Content Details</h4>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Specific targets, product names, and core values yield highly targeted copy for audiences.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">📐 Tip 2</span>
                      <h4 className="text-xs font-bold text-white">Dynamic Aspect Ratios</h4>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Change aspect ratios on the fly for Stories, banners, or square feeds, then regenerate instantly.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">🧠 Tip 3</span>
                      <h4 className="text-xs font-bold text-white">Tweak Image Prompts</h4>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Adjust Gemini's visual prompt manually to inject your own visual styling preference before generating.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* General Error Banner */}
            {error && (
              <div className="backdrop-blur-xl bg-red-950/20 border border-red-500/30 text-red-200 p-5 rounded-2xl flex flex-col md:flex-row items-start gap-4 shadow-xl">
                <AlertCircle className="w-6 h-6 shrink-0 text-red-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-sm tracking-wide text-white">System Generation Alert</h4>
                  <p className="text-xs mt-1 leading-relaxed opacity-90">{error}</p>
                  
                  {/* Smart Fallback Hint for 503/429 load spikes */}
                  {(error.toLowerCase().includes("503") || 
                    error.toLowerCase().includes("demand") || 
                    error.toLowerCase().includes("unavailable") || 
                    error.toLowerCase().includes("busy")) && (
                    <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/10 text-[11px] leading-relaxed text-blue-200 flex flex-col gap-1">
                      <span className="font-bold flex items-center gap-1 text-white">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        Quick Tips to bypass model load:
                      </span>
                      <ul className="list-disc list-inside space-y-1 pl-1 text-slate-300">
                        <li>Wait 5 to 10 seconds and click <strong className="text-white">Generate Platform Drafts</strong> again.</li>
                        <li>In the <strong className="text-white">Creative Console</strong> settings, change the copywriting model to <strong className="text-blue-300">Fast (Gemini 3.1 Flash Lite)</strong>.</li>
                        <li>These demand spikes are brief and automatically cleared.</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </main>

      </div>
    </div>
  );
}

// Sub-component to manage Image prompt configuration and generation actions
interface ImageControlProps {
  platform: string;
  platformData: PlatformDraft;
  onGenerateImage: () => void;
  onUpdateConfig: (field: "aspectRatio" | "imageSize" | "imageModel", value: string) => void;
  onEditPrompt: (value: string) => void;
  onDownloadImage: (url: string) => void;
  isDarkTheme?: boolean;
}

function ImageControlWorkspace({
  platform,
  platformData,
  onGenerateImage,
  onUpdateConfig,
  onEditPrompt,
  onDownloadImage,
  isDarkTheme = false
}: ImageControlProps) {
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/5 text-slate-200 backdrop-blur-md shadow-inner flex flex-col gap-3 transition-colors">
      {/* Banner / Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1 text-slate-300">
          <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
          <span>Tailored Visual Asset</span>
        </span>

        {/* Toggle prompt/config advanced */}
        <button
          type="button"
          onClick={() => setIsConfigExpanded(!isConfigExpanded)}
          className="text-[10px] font-bold underline text-slate-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Settings className="w-3 h-3" />
          <span>{isConfigExpanded ? "Hide Settings" : "Configure Graphics"}</span>
        </button>
      </div>

      {/* Editable Image Prompt Block */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
          Edit Image prompt
        </label>
        <textarea
          value={platformData.imagePrompt}
          onChange={(e) => onEditPrompt(e.target.value)}
          className="w-full text-[11px] p-2 rounded-lg bg-black/25 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none h-14 leading-relaxed"
          placeholder="E.g., A sleek modern glass hydration flask floating dramatically on a minimalistic beige podium, professional lighting..."
        />
      </div>

      {/* Config parameters (expandable section) */}
      <AnimatePresence>
        {isConfigExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden flex flex-col gap-3 pt-2 border-t border-white/10"
          >
            <div className="grid grid-cols-2 gap-3">
              {/* Aspect ratio */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase text-slate-400">Aspect Ratio</span>
                <select
                  value={platformData.aspectRatio}
                  onChange={(e) => onUpdateConfig("aspectRatio", e.target.value)}
                  className="text-[11px] p-1.5 rounded border border-white/10 bg-black/35 text-white focus:outline-none cursor-pointer"
                >
                  {ASPECT_RATIOS.map((ratio) => (
                    <option key={ratio} value={ratio} className="bg-slate-900 text-white">
                      {ratio} {ratio === "1:1" && platform === "instagram" ? "(Instagram Opt)" : ""} {ratio === "16:9" && (platform === "linkedin" || platform === "twitter") ? "(Optimal)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resolution / size */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase text-slate-400">Image Size</span>
                <select
                  value={platformData.imageSize}
                  onChange={(e) => onUpdateConfig("imageSize", e.target.value)}
                  className="text-[11px] p-1.5 rounded border border-white/10 bg-black/35 text-white focus:outline-none cursor-pointer"
                >
                  {IMAGE_SIZES.map((size) => (
                    <option key={size} value={size} className="bg-slate-900 text-white">
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Model Selector */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase text-slate-400">Graphics Engine Model</span>
              <select
                value={platformData.imageModel}
                onChange={(e) => onUpdateConfig("imageModel", e.target.value)}
                className="text-[11px] p-1.5 rounded border border-white/10 bg-black/35 text-white focus:outline-none cursor-pointer"
              >
                <option value="gemini-3.1-flash-image-preview" className="bg-slate-900 text-white">General (Gemini 3.1 Flash Image)</option>
                <option value="gemini-3-pro-image-preview" className="bg-slate-900 text-white">Studio Quality (Gemini 3 Pro Image)</option>
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual Result display area or action triggers */}
      <div className="mt-2 flex flex-col gap-2">
        {platformData.imageUrl ? (
          <div className="flex flex-col gap-2">
            <div className="relative group rounded-xl overflow-hidden shadow-xs border border-white/10">
              <img
                src={platformData.imageUrl}
                alt={`Generated content for ${platform}`}
                referrerPolicy="no-referrer"
                className="w-full h-auto object-cover max-h-[360px]"
              />
              
              {/* Fallback Badge Overlay */}
              {platformData.isFallback && (
                <div className="absolute top-2 left-2 bg-amber-500/95 backdrop-blur-xs text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md select-none">
                  <Sparkles className="w-3 h-3 text-slate-950 fill-current" />
                  <span>CURATED DESIGN</span>
                </div>
              )}

              {/* Hover Download Overlay */}
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => onDownloadImage(platformData.imageUrl!)}
                  className="bg-white text-slate-900 p-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow hover:bg-white/95 transition-colors cursor-pointer"
                  title="Download this illustration"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={onGenerateImage}
                  className="bg-white/15 text-white p-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow hover:bg-white/20 border border-white/10 transition-colors cursor-pointer"
                  title="Regenerate this image"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>

            {/* Informational Banner under the graphic card */}
            {platformData.isFallback && (
              <div className="text-[10px] text-amber-200 bg-amber-950/20 p-2.5 rounded-xl border border-amber-500/20 flex items-start gap-2 leading-relaxed backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-white text-[11px] mb-0.5">Adaptive Art Fallback Applied</span>
                  <p className="opacity-85">{platformData.fallbackReason || "We've loaded a curated high-quality stock visual matched to your keywords because the AI graphics engine is experiencing high demand."}</p>
                </div>
              </div>
            )}
          </div>
        ) : platformData.isGeneratingImage ? (
          /* custom elegant skeleton loader during image processing */
          <div className="p-6 rounded-xl flex flex-col items-center justify-center text-center gap-3 border border-dashed border-white/20 bg-black/20">
            <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-white">Synthesizing illustration...</span>
              <span className="text-[9px] text-slate-400">Resolving {platformData.imageSize} graphics size ({platformData.aspectRatio})</span>
            </div>
          </div>
        ) : (
          /* Generate visual trigger CTA */
          <button
            type="button"
            onClick={onGenerateImage}
            className="w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 border border-white/10 bg-white/10 text-white hover:bg-white/15 cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>Generate Image ({platformData.aspectRatio})</span>
          </button>
        )}

        {/* Localized Platform Image Error */}
        {platformData.imageError && (
          <div className="text-[10px] text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{platformData.imageError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
