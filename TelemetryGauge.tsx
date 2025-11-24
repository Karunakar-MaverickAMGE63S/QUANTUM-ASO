import React from 'react';

interface TelemetryGaugeProps {
  label: string;
  value: number;
  max: number;
  unit: string;
  color?: string;
  criticalThreshold?: number; // Value at which it turns red (e.g., high wear or low fuel)
  isInverse?: boolean; // If true, higher value is worse (Wear)
}

const TelemetryGauge: React.FC<TelemetryGaugeProps> = ({ 
  label, 
  value, 
  max, 
  unit, 
  color = "stroke-blue-500",
  criticalThreshold,
  isInverse = false
}) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const strokeDashoffset = circumference - progress * circumference;

  let finalColor = color;
  if (criticalThreshold !== undefined) {
    const isCritical = isInverse ? value > criticalThreshold : value < criticalThreshold;
    if (isCritical) finalColor = "stroke-orange-600 animate-pulse";
  }

  return (
    <div className="flex flex-col items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="stroke-gray-200 fill-transparent"
            strokeWidth="10"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className={`${finalColor} fill-transparent transition-all duration-500 ease-out`}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-xl font-bold font-mono-race text-gray-900">{value.toFixed(0)}</span>
          <span className="text-[10px] font-bold text-gray-400">{unit}</span>
        </div>
      </div>
      <span className="mt-2 text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
  );
};

export default TelemetryGauge;