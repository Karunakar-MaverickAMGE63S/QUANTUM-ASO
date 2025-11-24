import React from 'react';

interface PitWindowChartProps {
  currentLap: number;
  startLap: number;
  endLap: number;
  totalLaps: number;
}

const PitWindowChart: React.FC<PitWindowChartProps> = ({ currentLap, startLap, endLap, totalLaps }) => {
  // Normalize window for display (show +/- 10 laps around window)
  const displayStart = Math.max(0, startLap - 5);
  const displayEnd = Math.min(totalLaps, endLap + 5);
  const range = displayEnd - displayStart;

  const getPercent = (lap: number) => {
    return ((lap - displayStart) / range) * 100;
  };

  const windowStartPct = getPercent(startLap);
  const windowWidthPct = getPercent(endLap) - windowStartPct;
  const currentLapPct = getPercent(currentLap);

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-inner">
      <h3 className="text-xs text-slate-400 uppercase tracking-widest mb-4 font-bold">Optimal Pit Window Projection</h3>
      
      <div className="relative h-16 w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-600">
        {/* Track Base */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-600 -translate-y-1/2"></div>
        
        {/* The Window (Green Zone) - Made brighter and more opaque */}
        <div 
          className="absolute top-0 bottom-0 bg-green-500/40 border-x-2 border-green-500"
          style={{ left: `${windowStartPct}%`, width: `${windowWidthPct}%` }}
        >
          <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-green-600 text-[10px] font-bold text-white px-2 py-0.5 rounded-b-md whitespace-nowrap shadow-md">
            WINDOW L{startLap}-L{endLap}
          </div>
        </div>

        {/* Current Car Marker - Larger and brighter */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-cyan-400 rounded-full border-4 border-white shadow-[0_0_15px_rgba(34,211,238,1)] transition-all duration-1000 z-10"
          style={{ left: `${currentLapPct}%` }}
        >
            <div className="absolute top-8 left-1/2 -translate-x-1/2 text-cyan-400 font-black text-xs whitespace-nowrap bg-slate-900/80 px-2 rounded">
                YOU (L{currentLap})
            </div>
        </div>
      </div>
      
      <div className="flex justify-between mt-8 text-sm font-mono font-bold text-slate-500">
         <span>LAP {displayStart}</span>
         <span className="text-slate-600 uppercase tracking-widest text-[10px]">Strategy Horizon</span>
         <span>LAP {displayEnd}</span>
      </div>
    </div>
  );
};

export default PitWindowChart;