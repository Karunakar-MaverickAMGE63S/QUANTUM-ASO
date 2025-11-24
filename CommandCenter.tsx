
import React from 'react';
import { RaceState, StrategyResponse, ChatMessage, CommandType } from '../types';
import TrackMap from './TrackMap';
import VoiceAssistant from './VoiceAssistant';

interface CommandCenterProps {
  raceState: RaceState;
  strategy: StrategyResponse | null;
  commsLogs: ChatMessage[];
  onNewLog: (msg: ChatMessage) => void;
  loading: boolean;
}

const CommandCenter: React.FC<CommandCenterProps> = ({ raceState, strategy, commsLogs, onNewLog, loading }) => {
  const isBox = strategy?.primary_command === CommandType.BOX_NOW || strategy?.primary_command === CommandType.MANDATORY_PIT;
  const praScore = strategy?.rejoin_analysis?.pra_score ?? 0;
  
  // Status Logic
  let statusColor = "border-gray-200 text-gray-400";
  let statusText = "STANDBY";
  
  if (loading) {
      statusColor = "border-blue-400 text-blue-600 animate-pulse";
      statusText = "COMPUTING";
  } else if (isBox) {
      statusColor = "border-orange-500 text-orange-600 bg-orange-50";
      statusText = "ALERT: BOX NOW";
  } else if (strategy?.primary_command === CommandType.HOLD_STINT) {
      statusColor = "border-green-500 text-green-700 bg-green-50";
      statusText = "OPTIMAL: HOLD";
  }

  // Data Source Badge
  const dataSource = strategy?.dataSource || 'SIMULATION';
  const isLive = dataSource === 'GEMINI';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full pb-2">
      
      {/* LEFT: 3D Visualizer (Takes most space) */}
      <div className="lg:col-span-8 flex flex-col gap-4">
          <TrackMap 
             state={raceState} 
             praScore={strategy?.rejoin_analysis?.pra_score} 
             command={strategy?.primary_command ?? null}
          />
          
          {/* Bottom: Command Terminal Draft */}
          <div className="h-64">
             <VoiceAssistant logs={commsLogs} raceState={raceState} onNewLog={onNewLog} />
          </div>
      </div>

      {/* RIGHT: Control Panel */}
      <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* 1. Command Status Panel (Green/Orange Status) */}
          <div className={`bg-white rounded-3xl border-4 ${statusColor} p-6 flex flex-col items-center justify-center shadow-sm min-h-[120px] relative overflow-hidden`}>
               {/* Data Link Indicator */}
               <div className={`absolute top-3 right-4 flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${isLive ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                  <span className={`text-[8px] font-bold tracking-widest uppercase ${isLive ? 'text-green-700' : 'text-yellow-700'}`}>
                      {isLive ? 'LINK: GEMINI CLOUD' : 'LINK: LOCAL SIM'}
                  </span>
               </div>

               <span className="text-xs font-bold tracking-widest uppercase opacity-70 mb-1">Current Strategic Status</span>
               <h2 className="text-3xl font-black font-mono-race tracking-wide text-center">
                   {statusText}
               </h2>
          </div>

          {/* 2. AI Decision Metrics (Blue Data) */}
          <div className="bg-white rounded-3xl border-4 border-blue-500 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b-2 border-blue-100 pb-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider">AI Decision Metrics</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <span className="block text-xs text-gray-400 font-bold uppercase mb-1">Rejoin Prob (PRA)</span>
                      <div className={`text-4xl font-mono-race font-bold ${praScore > 75 ? 'text-green-600' : 'text-orange-600'}`}>
                          {praScore}%
                      </div>
                  </div>
                  <div>
                      <span className="block text-xs text-gray-400 font-bold uppercase mb-1">Est. PNPA</span>
                      <div className="text-3xl font-mono-race font-bold text-blue-700 tracking-tighter">
                          {strategy?.rejoin_analysis?.rival_exit_gap ? strategy.rejoin_analysis.rival_exit_gap : '--'}
                      </div>
                  </div>
              </div>
          </div>

          {/* 3. Pit Execution Parameters (Blue Data) */}
          <div className="bg-white rounded-3xl border-4 border-blue-500 p-6 shadow-sm flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-4 border-b-2 border-blue-100 pb-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider">Pit Execution</h3>
              </div>
              
              <div className="space-y-6 flex-1">
                  <div>
                      <span className="block text-xs text-gray-400 font-bold uppercase mb-1">Tire Compound</span>
                      <div className="text-5xl font-mono-race font-bold text-gray-900">
                          {strategy?.pit_parameters?.tire_compound || "--"}
                      </div>
                  </div>
                  <div>
                      <span className="block text-xs text-gray-400 font-bold uppercase mb-1">Fuel Load</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-mono-race font-bold text-gray-900">
                            {strategy?.pit_parameters?.fuel_liters || "--"}
                        </span>
                        <span className="text-xl font-bold text-gray-400">L</span>
                      </div>
                  </div>
              </div>
          </div>

          {/* 4. Final Vetted Command (The Output) */}
          <div className="bg-blue-50 rounded-3xl border-4 border-blue-200 p-4 shadow-inner text-center">
              <span className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Final Vetted Command Output</span>
              <div className="font-mono text-lg font-bold text-blue-900">
                  {strategy ? (
                      `>> ${strategy.primary_command}: CONFIRMED.`
                  ) : (
                      ">> AWAITING GENERATION..."
                  )}
              </div>
          </div>

      </div>
    </div>
  );
};

export default CommandCenter;
