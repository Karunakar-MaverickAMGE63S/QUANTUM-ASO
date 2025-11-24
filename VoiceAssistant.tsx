
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, RaceState } from '../types';
import { processVoiceQuery, generateVoiceGuidance } from '../services/geminiService';

interface VoiceAssistantProps {
  logs: ChatMessage[];
  raceState: RaceState;
  onNewLog: (msg: ChatMessage) => void;
}

// Add type definition for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ logs, raceState, onNewLog }) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Auto-play audio response
  useEffect(() => {
      const lastMsg = logs[logs.length - 1];
      if (lastMsg && lastMsg.role === 'assistant' && lastMsg.audioUrl && audioRef.current) {
          audioRef.current.src = lastMsg.audioUrl;
          audioRef.current.play().catch(e => console.log("Audio play blocked", e));
      }
  }, [logs]);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        
        recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
                .map((result: any) => result[0])
                .map((result) => result.transcript)
                .join('');
            setInput(transcript);
        };

        recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
      if (!recognitionRef.current) {
          alert("Voice input not supported in this browser.");
          return;
      }
      if (isListening) {
          recognitionRef.current.stop();
      } else {
          recognitionRef.current.start();
          setInput('');
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    // Stop listening if user hits enter manually
    if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
    }

    const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: input,
        timestamp: Date.now()
    };
    onNewLog(userMsg);
    setInput('');
    setIsProcessing(true);

    const responseText = await processVoiceQuery(input, raceState);
    const audioUrl = await generateVoiceGuidance(responseText);

    const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: responseText,
        audioUrl: audioUrl || undefined,
        timestamp: Date.now()
    };
    onNewLog(assistantMsg);
    setIsProcessing(false);
  };

  return (
    <div className={`flex flex-col h-full bg-[#0d1117] rounded-3xl border-4 ${isListening ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'border-gray-800'} overflow-hidden shadow-xl relative font-mono text-sm group transition-all duration-300`}>
        <audio ref={audioRef} className="hidden" />
        
        {/* Status Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#161b22] border-b border-gray-700 min-h-[90px]">
            <div className="flex items-center gap-6">
                <button 
                    onClick={toggleListening}
                    className={`flex items-center gap-3 px-6 py-3 rounded-xl border-2 transition-all duration-200 shadow-[0_0_15px_rgba(0,0,0,0.5)] active:scale-95 group ${
                        isListening 
                        ? 'bg-green-600 border-green-400 text-white animate-pulse shadow-green-500/50' 
                        : 'bg-red-600 border-red-500 text-white hover:bg-red-500 hover:shadow-red-500/40'
                    }`}
                >
                    <svg className="w-8 h-8 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                    <span className="text-3xl font-mono-race tracking-wider uppercase italic leading-none pt-1">VOX</span>
                </button>
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">Live Voice Uplink</span>
                    <span className={`text-sm font-bold uppercase tracking-wider ${isProcessing ? 'text-yellow-500' : isListening ? 'text-green-400' : 'text-gray-400'}`}>
                        {isProcessing ? 'TRANSMITTING...' : isListening ? 'CHANNEL OPEN' : 'STANDBY'}
                    </span>
                </div>
            </div>
        </div>

        {/* Scanline Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-0 bg-[length:100%_4px,3px_100%] opacity-20"></div>

        {/* Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 z-10" ref={scrollRef}>
             {logs.length === 0 && (
                <div className="text-gray-600 font-mono text-xs opacity-50">
                    <p>{'>'} SYSTEM INITIALIZED.</p>
                    <p>{'>'} AUDIO INPUT: ONLINE</p>
                    <p>{'>'} CLICK [VOX] TO TRANSMIT_</p>
                </div>
            )}
            {logs.map((msg) => (
                <div key={msg.id} className="flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-1 duration-300">
                    <div className="flex items-baseline gap-2">
                         <span className={`text-[10px] font-bold uppercase w-12 text-right ${msg.role === 'user' ? 'text-orange-500' : 'text-cyan-500'}`}>
                            {msg.role === 'user' ? 'OPR' : 'ASO'}
                         </span>
                         <span className="text-[10px] text-gray-600">{new Date(msg.timestamp).toLocaleTimeString([], {hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                    </div>
                    <div className={`pl-14 text-xs ${msg.role === 'user' ? 'text-orange-300 italic' : 'text-cyan-400 font-bold'}`}>
                         {msg.text}
                    </div>
                </div>
            ))}
            {/* Typing/Listening Indicator */}
            {(isListening || isProcessing) && (
                 <div className="pl-14 mt-2">
                     <div className={`h-1 w-24 rounded-full overflow-hidden ${isListening ? 'bg-green-900/50' : 'bg-yellow-900/50'}`}>
                         <div className={`h-full w-full origin-left animate-progress ${isListening ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                     </div>
                 </div>
            )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 bg-[#0d1117] border-t border-gray-700 z-10">
            <span className="text-green-500 font-bold text-xs">CMD {'>'}</span>
            <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-green-400 font-mono text-xs placeholder-gray-700"
                placeholder={isListening ? "Listening..." : "Type or push VOX..."} 
            />
        </form>
    </div>
  );
};

export default VoiceAssistant;
