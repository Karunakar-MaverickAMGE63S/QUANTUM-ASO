
import React, { useState } from 'react';
import { StrategyResponse, RaceState } from '../types';
import TelemetryGauge from './TelemetryGauge';
import PitWindowChart from './PitWindowChart';

interface AnalysisConsoleProps {
  strategy: StrategyResponse | null;
  raceState: RaceState;
}

const AnalysisConsole: React.FC<AnalysisConsoleProps> = ({ strategy, raceState }) => {
  const { telemetry, weather, sectorData } = raceState;
  const [showPitWindow, setShowPitWindow] = useState(false);

  if (!strategy) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
         <div className="w-16 h-16 border-4 border-gray-300 border-t-red-500 rounded-full animate-spin mb-4"></div>
         <span className="font-mono-race font-bold text-xl uppercase tracking-widest">System Idle</span>
      </div>
    );
  }

  // Calculate sector deltas
  const s1Delta = (sectorData.s1 - sectorData.s1_benchmark).toFixed(2);
  const s2Delta = (sectorData.s2 - sectorData.s2_benchmark).toFixed(2);
  const s3Delta = (sectorData.s3 - sectorData.s3_benchmark).toFixed(2);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full pb-6 relative">
      
      {/* MODAL OVERLAY FOR PIT WINDOW */}
      {showPitWindow && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 rounded-3xl animate-in fade-in duration-200">
            <div className="bg-slate-900 border-4 border-blue-500 rounded-3xl p-8 w-full max-w-3xl shadow-2xl relative">
                <button 
                    onClick={() => setShowPitWindow(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold uppercase tracking-widest text-sm"
                >
                    [CLOSE X]
                </button>
                <div className="mb-6 border-b border-slate-700 pb-4">
                    <h2 className="text-2xl font-black font-mono-race text-white uppercase tracking-wide">Strategic Pit Window Analysis</h2>
                    <p className="text-slate-400 mt-1">Projected optimal stop laps based on tire degradation and rival traffic.</p>
                </div>
                
                <PitWindowChart 
                    currentLap={raceState.currentLap}
                    startLap={strategy.pit_window.start_lap}
                    endLap={strategy.pit_window.end_lap}
                    totalLaps={raceState.totalLaps}
                />

                <div className="mt-6 bg-slate-800 p-4 rounded-xl border border-slate-700 flex gap-4">
                    <div className="flex-1">
                        <span className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1">Window Open</span>
                        <span className="text-2xl font-mono text-green-400 font-bold">LAP {strategy.pit_window.start_lap}</span>
                    </div>
                    <div className="flex-1">
                        <span className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1">Window Close</span>
                        <span className="text-2xl font-mono text-red-400 font-bold">LAP {strategy.pit_window.end_lap}</span>
                    </div>
                    <div className="flex-1">
                        <span className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1">Strategy Delta</span>
                        <span className="text-2xl font-mono text-blue-400 font-bold">-{Math.abs(raceState.rivalPaceDelta).toFixed(2)}s</span>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* 1. Strategy Rationale & Prediction (Left Panel) */}
      <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Rationale & Pit Window Trigger */}
          <div className="bg-white rounded-3xl border-4 border-orange-500 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4 border-b-2 border-orange-100 pb-3">
                  <div className="w-4 h-4 bg-orange-600 rounded-sm rotate-45"></div>
                  <h2 className="text-xl font-black text-orange-700 uppercase tracking-wide">Strategy Rationale</h2>
              </div>
              
              <div className="space-y-6">
                 <div className="flex gap-4">
                     <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center border-2 border-blue-200">1</div>
                     <p className="text-lg text-gray-800 font-medium leading-relaxed">
                         {strategy.strategy_rationale}
                     </p>
                 </div>
                 
                 {/* Clickable Pit Window Chip */}
                 <div className="pl-12">
                     <button 
                        onClick={() => setShowPitWindow(true)}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl border-2 border-slate-600 flex items-center justify-between group transition-all"
                     >
                        <div className="flex flex-col items-start">
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Optimal Window</span>
                            <span className="text-xl font-mono font-bold text-green-400 group-hover:text-green-300">
                                LAP {strategy.pit_window.start_lap} - LAP {strategy.pit_window.end_lap}
                            </span>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center group-hover:bg-slate-600 border border-slate-500">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                        </div>
                     </button>
                 </div>

                 <div className="flex gap-4">
                     <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center border-2 border-blue-200">2</div>
                     <p className="text-lg text-gray-800 font-medium leading-relaxed">
                         PNPA analysis indicates a <span className="font-bold text-blue-700">+{Math.abs(raceState.rivalPaceDelta).toFixed(2)}s</span> pace delta advantage post-stop.
                     </p>
                 </div>
              </div>
          </div>
          
          {/* Pre-Event & Race Prediction (Forecast) */}
           <div className="bg-white rounded-3xl border-4 border-purple-500 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b-2 border-purple-100 pb-2 flex-wrap">
                    <span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse shrink-0"></span>
                    <h3 className="text-sm font-bold text-purple-800 uppercase tracking-wider">Pre-Event & Race Prediction (Forecast)</h3>
                </div>
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                     <div className="text-center p-3 bg-purple-50 rounded-xl overflow-hidden col-span-2 xl:col-span-1">
                        <span className="block text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1 truncate">Pred. Quali Pace</span>
                        <span className="text-2xl xl:text-3xl font-mono-race font-black text-purple-900 tracking-tighter break-all">{strategy.race_prediction?.predicted_qualifying_pace ?? '--'}</span>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-xl overflow-hidden">
                        <span className="block text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1 truncate">Pred. Finish</span>
                        <span className="text-3xl font-mono-race font-black text-purple-900">P{strategy.race_prediction?.predicted_finish_pos ?? '--'}</span>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-xl overflow-hidden">
                         <span className="block text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1 truncate">Tire Life Rem.</span>
                         <span className="text-3xl font-mono-race font-black text-purple-900">{strategy.race_prediction?.tire_life_remaining_laps ?? '--'} <span className="text-lg text-purple-400">L</span></span>
                    </div>
                     <div className="text-center p-3 bg-purple-50 rounded-xl overflow-hidden">
                         <span className="block text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1 truncate">Deg. Curve</span>
                         <span className="text-2xl font-bold text-purple-900 mt-1 block">{strategy.race_prediction?.degradation_curve ?? '--'}</span>
                    </div>
                </div>
           </div>

           {/* Post-Stint Debrief / Analysis Log */}
           <div className="bg-white rounded-3xl border-4 border-blue-500 p-6 shadow-sm flex-1">
                <div className="flex items-center gap-2 mb-4 border-b-2 border-blue-100 pb-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
                    <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider">Post-Stint Debrief Analysis</h3>
                </div>
                {/* Added overflow-y-auto, max-height, and break-words to handle long text */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 min-h-[120px] max-h-[200px] overflow-y-auto">
                    <span className="text-[10px] font-bold text-blue-400 uppercase mb-2 block tracking-widest sticky top-0 bg-blue-50">ENGINEER'S LOG</span>
                    <p className="font-mono text-blue-900 text-lg leading-relaxed break-words whitespace-pre-wrap">
                        {strategy.debrief_summary || "Waiting for stint completion data..."}
                    </p>
                </div>
           </div>
      </div>

      {/* 2. Right Stack (Coaching & Telemetry) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Driver Training / Sector Analysis */}
          <div className="bg-white rounded-3xl border-4 border-green-500 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b-2 border-green-100 pb-2">
                  <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
                      <h3 className="text-sm font-bold text-green-800 uppercase tracking-wider">Driver Training & Insights</h3>
                  </div>
              </div>
              
              {/* Sector Grid */}
              <div className="grid grid-cols-3 gap-3 mb-6 font-mono text-center">
                 <div className={`p-3 rounded-xl border-2 flex flex-col justify-center ${parseFloat(s1Delta) > 0.1 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                    <span className="block text-xs font-bold opacity-60 mb-1">SECTOR 1</span>
                    <span className="text-3xl font-black tracking-tight">{parseFloat(s1Delta) > 0 ? '+' : ''}{s1Delta}s</span>
                 </div>
                 <div className={`p-3 rounded-xl border-2 flex flex-col justify-center ${parseFloat(s2Delta) > 0.1 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                    <span className="block text-xs font-bold opacity-60 mb-1">SECTOR 2</span>
                    <span className="text-3xl font-black tracking-tight">{parseFloat(s2Delta) > 0 ? '+' : ''}{s2Delta}s</span>
                 </div>
                 <div className={`p-3 rounded-xl border-2 flex flex-col justify-center ${parseFloat(s3Delta) > 0.1 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                    <span className="block text-xs font-bold opacity-60 mb-1">SECTOR 3</span>
                    <span className="text-3xl font-black tracking-tight">{parseFloat(s3Delta) > 0 ? '+' : ''}{s3Delta}s</span>
                 </div>
              </div>

              {/* DDT Coaching Box */}
              <div className="bg-green-50 rounded-xl p-4 border border-green-200 shadow-inner">
                  <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                      <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">DDT COACHING INSTRUCTION</span>
                  </div>
                  <p className="text-lg font-bold text-green-900 font-mono leading-tight">
                      "{strategy.sector_analysis?.advice ?? strategy.driver_execution}"
                  </p>
              </div>
          </div>

          {/* SRO RAW TELEMETRY STREAM */}
          <div className="bg-slate-900 rounded-3xl border-4 border-slate-700 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
                 <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                 <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">SRO Telemetry Stream</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 font-mono">
                 <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                     <span className="block text-slate-500 text-[10px] uppercase mb-1">nmot (RPM)</span>
                     <span className="text-white font-bold text-2xl tracking-tighter">{telemetry.rpm.toFixed(0)}</span>
                 </div>
                 <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                     <span className="block text-slate-500 text-[10px] uppercase mb-1">aps (%)</span>
                     <span className="text-white font-bold text-2xl">{telemetry.throttle_pedal.toFixed(0)}</span>
                 </div>
                 <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                     <span className="block text-slate-500 text-[10px] uppercase mb-1">ath (%)</span>
                     <span className="text-white font-bold text-2xl">{telemetry.throttle_blade.toFixed(0)}</span>
                 </div>
                 <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                     <span className="block text-slate-500 text-[10px] uppercase mb-1">pbrake_f</span>
                     <span className="text-white font-bold text-2xl">{telemetry.brakePressureF.toFixed(1)}</span>
                 </div>
                 <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                     <span className="block text-slate-500 text-[10px] uppercase mb-1">pbrake_r</span>
                     <span className="text-white font-bold text-2xl">{telemetry.brakePressureR.toFixed(1)}</span>
                 </div>
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                     <span className="block text-slate-500 text-[10px] uppercase mb-1">accx_can</span>
                     <span className="text-white font-bold text-2xl">{telemetry.longG.toFixed(2)}</span>
                 </div>
              </div>
          </div>

          {/* Track Conditions & Status */}
          <div className="bg-white rounded-3xl border-4 border-green-500 p-6 shadow-sm flex-1">
               <div className="flex items-center gap-2 mb-6 border-b-2 border-green-100 pb-2">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <h3 className="text-sm font-bold text-green-800 uppercase tracking-wider">Race & Weather</h3>
              </div>

              <div className="flex flex-col gap-6">
                  {/* Weather Grid */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div>
                          <span className="text-gray-400 block uppercase tracking-wider mb-1">AIR TEMP</span>
                          <span className="font-bold text-gray-800 text-2xl">{weather.airTemp.toFixed(1)}°C</span>
                      </div>
                      <div>
                          <span className="text-gray-400 block uppercase tracking-wider mb-1">TRACK TEMP</span>
                          <span className="font-bold text-gray-800 text-2xl">{weather.trackTemp.toFixed(1)}°C</span>
                      </div>
                      <div>
                          <span className="text-gray-400 block uppercase tracking-wider mb-1">HUMIDITY</span>
                          <span className="font-bold text-gray-800 text-2xl">{weather.humidity}%</span>
                      </div>
                      <div>
                          <span className="text-gray-400 block uppercase tracking-wider mb-1">RAIN</span>
                          <span className="font-bold text-gray-800 text-2xl">{weather.rain === 0 ? "NO" : "YES"}</span>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <TelemetryGauge 
                        label="Tire Health" 
                        value={100 - raceState.tireWear} 
                        max={100} 
                        unit="%" 
                        color="stroke-green-500"
                    />
                     <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col items-center justify-center">
                         <span className="text-xs text-gray-400 font-bold uppercase mb-2">Fuel Load</span>
                         <span className="text-4xl font-mono-race font-bold text-gray-800">{raceState.fuelRemaining.toFixed(0)}<span className="text-xl">L</span></span>
                     </div>
                  </div>
              </div>
          </div>
      </div>

    </div>
  );
};

export default AnalysisConsole;
