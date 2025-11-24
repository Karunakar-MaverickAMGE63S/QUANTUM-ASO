import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RaceState, StrategyResponse, ChatMessage, CommandType } from './types';
import { fetchStrategyRecommendation, generateVoiceGuidance } from './services/geminiService';
import CommandCenter from './components/CommandCenter';
import AnalysisConsole from './components/AnalysisConsole';

const INITIAL_STATE: RaceState = {
  currentLap: 22,
  totalLaps: 65,
  tireWear: 55, // percent
  fuelRemaining: 40, // liters
  fuelCapacity: 100,
  rivalGap: 1.5, // seconds ahead
  rivalPaceDelta: 0.1, // seconds faster
  lapProgress: 0,
  isSafetyCar: false,
  weather: {
      airTemp: 28.6,
      trackTemp: 43.2,
      humidity: 62,
      windSpeed: 23,
      rain: 0
  },
  telemetry: {
    speed: 185,
    gear: 4,
    rpm: 6200,
    throttle_pedal: 85,
    throttle_blade: 85,
    brakePressureF: 0,
    brakePressureR: 0,
    steeringAngle: 0,
    latG: 0.1,
    longG: 0.2
  },
  sectorData: {
    s1: 32.8, s1_benchmark: 32.6,
    s2: 54.8, s2_benchmark: 54.3,
    s3: 60.5, s3_benchmark: 59.9
  }
};

const SIMULATION_TICK_MS = 1000;

export default function App() {
  const [raceState, setRaceState] = useState<RaceState>(INITIAL_STATE);
  const [strategy, setStrategy] = useState<StrategyResponse | null>(null);
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(false);
  const [commsLogs, setCommsLogs] = useState<ChatMessage[]>([]);
  const [currentView, setCurrentView] = useState<'command' | 'analysis'>('command');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Simulation Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setRaceState(prev => {
        const newProgress = prev.lapProgress + 2; // Move 2% per tick
        let nextLap = prev.currentLap;
        let progress = newProgress;

        if (newProgress >= 100) {
            progress = 0;
            nextLap = Math.min(prev.currentLap + 1, prev.totalLaps);
        }

        // Simulate Dynamics
        const wearRate = 0.3 + (Math.random() * 0.1);
        const fuelBurn = 1.2;
        const gapChange = (Math.random() * 0.2) - 0.1; 
        
        // Fluctuate Rival Pace (Simulate lap time variance)
        const paceFluctuation = (Math.random() * 0.2) - 0.1;
        let newPaceDelta = prev.rivalPaceDelta + paceFluctuation;
        if (newPaceDelta > 3) newPaceDelta = 3;
        if (newPaceDelta < -3) newPaceDelta = -3;

        // Simulate SRO Telemetry
        const isBraking = Math.random() > 0.7;
        const isTurning = Math.random() > 0.5;
        
        // Detailed SRO Physics Simulation
        const rpm = isBraking ? prev.telemetry.rpm - 1500 : Math.min(7400, prev.telemetry.rpm + 500);
        const aps = isBraking ? 0 : Math.min(100, prev.telemetry.throttle_pedal + 20);
        // Throttle blade (ath) slightly lags or leads based on traction control logic (simulated)
        const ath = isBraking ? 0 : Math.min(100, aps * 0.98); 
        
        // Brake Bias Simulation (approx 60/40)
        const brakeTotal = isBraking ? 45 + Math.random() * 20 : 0;
        const pbrake_f = brakeTotal * 0.6;
        const pbrake_r = brakeTotal * 0.4;

        const newTelemetry = {
            speed: isBraking ? Math.max(60, prev.telemetry.speed - 30) : Math.min(240, prev.telemetry.speed + 10),
            gear: isBraking ? Math.max(2, prev.telemetry.gear - 1) : Math.min(6, prev.telemetry.gear + (Math.random() > 0.8 ? 1 : 0)),
            rpm: rpm,
            throttle_pedal: aps,
            throttle_blade: ath,
            brakePressureF: pbrake_f,
            brakePressureR: pbrake_r,
            steeringAngle: isTurning ? (Math.random() * 60) - 30 : 0, 
            latG: isTurning ? (Math.random() * 2.5) - 1.25 : 0,
            longG: isBraking ? -1.5 : 0.5
        };

        // Weather Dynamics (Slow cooling of track)
        const newWeather = {
            ...prev.weather,
            trackTemp: Math.max(20, prev.weather.trackTemp - 0.05), // Cooling as evening approaches
            airTemp: prev.weather.airTemp + (Math.random() * 0.1 - 0.05)
        };

        // Simulate Sector Performance vs Benchmark
        // Fluctuate sector times slightly to simulate driver inconsistency
        const sectorNoise = () => (Math.random() * 0.4) - 0.1;
        const newSectorData = {
          ...prev.sectorData,
          s1: Math.max(prev.sectorData.s1_benchmark, prev.sectorData.s1_benchmark + sectorNoise()),
          s2: Math.max(prev.sectorData.s2_benchmark, prev.sectorData.s2_benchmark + sectorNoise()),
          s3: Math.max(prev.sectorData.s3_benchmark, prev.sectorData.s3_benchmark + sectorNoise()),
        };

        return {
            ...prev,
            lapProgress: progress,
            currentLap: nextLap,
            tireWear: Math.min(prev.tireWear + wearRate, 100),
            fuelRemaining: Math.max(prev.fuelRemaining - fuelBurn, 0),
            rivalGap: prev.rivalGap + gapChange,
            rivalPaceDelta: newPaceDelta,
            isSafetyCar: Math.random() > 0.99 ? !prev.isSafetyCar : prev.isSafetyCar,
            telemetry: newTelemetry,
            weather: newWeather,
            sectorData: newSectorData
        };
      });
    }, SIMULATION_TICK_MS);

    return () => clearInterval(interval);
  }, []);

  // Strategy Trigger Logic
  const handleStrategyUpdate = useCallback(async () => {
    setIsLoadingStrategy(true);
    const result = await fetchStrategyRecommendation(raceState);
    setStrategy(result);
    setIsLoadingStrategy(false);

    // If urgent command, switch to command view and alert
    if (result.primary_command !== CommandType.HOLD_STINT) {
        setCurrentView('command');
        const voiceText = `${result.primary_command.replace('_', ' ')}. ${result.strategy_rationale.split('.')[0]}.`;
        const audioUrl = await generateVoiceGuidance(voiceText);
        if (audioUrl) {
             const alertMsg: ChatMessage = {
                id: Date.now().toString(),
                role: 'assistant',
                text: `ALERT: ${result.primary_command}`,
                audioUrl: audioUrl,
                timestamp: Date.now()
             };
             setCommsLogs(prev => [...prev, alertMsg]);
        }
    }
  }, [raceState]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col p-4 md:p-6 overflow-hidden">
      <audio ref={audioRef} className="hidden" />
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
             {/* Brand Block */}
             <div className="flex flex-col">
                 <div className="flex items-center gap-2">
                    <span className="bg-black text-white px-2 py-0.5 font-bold italic tracking-tighter">GR</span>
                    <h1 className="text-3xl font-black font-mono-race tracking-tight text-red-600">
                        QUANTUM ASO
                    </h1>
                 </div>
                 <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase mt-1">
                    TOYOTA GAZOO Racing NA | TRD Data Link
                 </span>
             </div>
        </div>

        {/* Navigation Tabs (Pill Style) */}
        <div className="flex bg-white rounded-full p-1 border-2 border-gray-200 shadow-sm">
            <button 
                onClick={() => setCurrentView('command')}
                className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${
                    currentView === 'command' 
                    ? 'bg-red-600 text-white shadow-md' 
                    : 'text-gray-500 hover:text-red-600'
                }`}
            >
                Action Center
            </button>
            <button 
                onClick={() => setCurrentView('analysis')}
                className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${
                    currentView === 'analysis' 
                    ? 'bg-red-600 text-white shadow-md' 
                    : 'text-gray-500 hover:text-red-600'
                }`}
            >
                Analysis Console
            </button>
        </div>

        <div className="flex items-center gap-4">
            <button 
                onClick={handleStrategyUpdate}
                disabled={isLoadingStrategy}
                className={`
                    px-6 py-3 rounded-xl font-mono font-bold uppercase tracking-wider transition-all shadow-lg border-b-4 active:border-b-0 active:translate-y-1
                    ${isLoadingStrategy 
                        ? 'bg-gray-300 border-gray-400 text-gray-500 cursor-not-allowed' 
                        : 'bg-red-600 border-red-800 text-white hover:bg-red-500'}
                `}
            >
                {isLoadingStrategy ? 'Calculating...' : 'Vet & Generate'}
            </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative">
        {currentView === 'command' ? (
            <CommandCenter 
                raceState={raceState} 
                strategy={strategy} 
                commsLogs={commsLogs} 
                onNewLog={(msg) => setCommsLogs(prev => [...prev, msg])}
                loading={isLoadingStrategy}
            />
        ) : (
            <AnalysisConsole 
                strategy={strategy} 
                raceState={raceState}
            />
        )}
      </main>
    </div>
  );
}