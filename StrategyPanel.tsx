import React from 'react';
import { StrategyResponse, CommandType } from '../types';

interface StrategyPanelProps {
  strategy: StrategyResponse | null;
  loading: boolean;
}

const StrategyPanel: React.FC<StrategyPanelProps> = ({ strategy, loading }) => {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-800/30 rounded-xl border border-slate-700 animate-pulse">
        <span className="text-cyan-400 font-mono-race">ANALYZING TELEMETRY...</span>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-800/30 rounded-xl border border-slate-700">
        <span className="text-slate-500 font-mono-race">AWAITING DATA</span>
      </div>
    );
  }

  const isBox = strategy.primary_command === CommandType.BOX_NOW || strategy.primary_command === CommandType.MANDATORY_PIT;
  const borderColor = isBox ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-green-500';
  const headerColor = isBox ? 'bg-red-500 text-white' : 'bg-green-600 text-white';

  return (
    <div className={`h-full flex flex-col rounded-xl border-2 ${borderColor} overflow-hidden bg-slate-900 transition-all duration-300`}>
      {/* Primary Command Header */}
      <div className={`${headerColor} p-6 flex flex-col items-center justify-center text-center relative overflow-hidden`}>
        {isBox && <div className="absolute inset-0 bg-white opacity-20 animate-ping"></div>}
        <h2 className="text-4xl md:text-5xl font-black font-mono-race uppercase tracking-widest z-10">
            {strategy.primary_command.replace('_', ' ')}
        </h2>
      </div>

      <div className="p-6 flex-1 flex flex-col gap-6">
        {/* Rationale */}
        <div>
            <span className="text-xs text-slate-400 uppercase tracking-widest">Rationale</span>
            <p className="text-slate-200 text-lg leading-snug font-medium mt-1">
                {strategy.strategy_rationale}
            </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
            {/* Parameters */}
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400 uppercase tracking-widest block mb-2">Strategy Call</span>
                <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-white">{strategy.pit_parameters.tire_compound}</span>
                    <span className="text-sm text-slate-400 mb-1">Compound</span>
                </div>
                 <div className="flex items-end gap-2 mt-2">
                    <span className="text-3xl font-bold text-white">{strategy.pit_parameters.fuel_liters}</span>
                    <span className="text-sm text-slate-400 mb-1">Liters</span>
                </div>
            </div>

            {/* Rejoin Analysis */}
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                 <span className="text-xs text-slate-400 uppercase tracking-widest block mb-2">Rejoin Triage</span>
                 <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-300">PRA Score</span>
                        <span className={`font-mono font-bold ${strategy.rejoin_analysis.pra_score > 70 ? 'text-green-400' : 'text-red-400'}`}>
                            {strategy.rejoin_analysis.pra_score}%
                        </span>
                    </div>
                     <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mt-1">
                         <div 
                            className={`h-full ${strategy.rejoin_analysis.pra_score > 70 ? 'bg-green-500' : 'bg-red-500'}`} 
                            style={{width: `${strategy.rejoin_analysis.pra_score}%`}}
                        />
                     </div>
                     <div className="flex justify-between items-center mt-3">
                        <span className="text-slate-300">Exp. Gap</span>
                        <span className="font-mono font-bold text-white">{strategy.rejoin_analysis.rival_exit_gap}</span>
                    </div>
                 </div>
            </div>
        </div>

        {/* Driver Execution / Ghost Line */}
        <div className="mt-auto bg-cyan-900/20 border border-cyan-500/30 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                <span className="text-xs text-cyan-400 uppercase tracking-widest">Digital Driver Twin</span>
            </div>
            <p className="text-cyan-100 font-mono text-sm">
                "{strategy.driver_execution}"
            </p>
        </div>
      </div>
    </div>
  );
};

export default StrategyPanel;