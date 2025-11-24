
export interface GRCupTelemetry {
  speed: number;        // Speed (km/h)
  gear: number;         // Gear (1-6)
  rpm: number;          // nmot
  throttle_pedal: number; // aps (0-100)
  throttle_blade: number; // ath (0-100)
  brakePressureF: number; // pbrake_f (bar)
  brakePressureR: number; // pbrake_r (bar)
  steeringAngle: number; // Steering_Angle (deg)
  latG: number;         // accy_can
  longG: number;        // accx_can
}

export interface WeatherData {
  airTemp: number; // Celsius
  trackTemp: number; // Celsius
  humidity: number; // %
  windSpeed: number; // kph
  rain: number; // 0 or 1
}

export interface SectorData {
  s1: number; // Current Sector 1 time
  s2: number;
  s3: number;
  s1_benchmark: number; // Ideal Sector 1 time
  s2_benchmark: number;
  s3_benchmark: number;
}

export interface RaceState {
  currentLap: number;
  totalLaps: number;
  tireWear: number; // 0-100%
  fuelRemaining: number; // Liters
  fuelCapacity: number;
  rivalGap: number; // Seconds (positive = we are ahead, negative = behind)
  rivalPaceDelta: number; // Seconds (positive = we are faster)
  lapProgress: number; // 0-100% of current lap
  isSafetyCar: boolean;
  telemetry: GRCupTelemetry; // New SRO Data
  weather: WeatherData;
  sectorData: SectorData; // New Driver Training Data
}

export enum CommandType {
  BOX_NOW = 'BOX_NOW',
  HOLD_STINT = 'HOLD_STINT',
  MANDATORY_PIT = 'MANDATORY_PIT'
}

export interface StrategyResponse {
  primary_command: CommandType;
  strategy_rationale: string;
  pit_parameters: {
    tire_compound: string;
    fuel_liters: number;
  };
  rejoin_analysis: {
    pra_score: number; // Probability of Rejoin Ahead 0-100
    rival_exit_gap: string;
  };
  pit_window: {
    start_lap: number;
    end_lap: number;
  };
  driver_execution: string;
  debrief_summary: string;
  
  // New Feature: Driver Training & Insights
  sector_analysis: {
    problem_sector: 'S1' | 'S2' | 'S3';
    time_loss: number;
    advice: string;
  };

  // New Feature: Pre-Event/Forward Prediction
  race_prediction: {
    predicted_finish_pos: number;
    tire_life_remaining_laps: number;
    degradation_curve: 'Low' | 'Medium' | 'High';
    predicted_qualifying_pace: string; // New field for Pre-Event
  };

  dataSource: 'GEMINI' | 'SIMULATION';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  audioUrl?: string;
  timestamp: number;
}
