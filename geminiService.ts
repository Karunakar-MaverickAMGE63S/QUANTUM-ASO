import { GoogleGenAI, Type, Modality } from "@google/genai";
import { RaceState, StrategyResponse, CommandType } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are the Quantum ASO (Adaptive Stint Optimization) Agent for the Toyota GR Cup. You perform three key roles:

1. Chief Strategist (Real-Time Analytics): Analyze telemetry to output high-confidence strategy commands (BOX_NOW, HOLD_STINT). React immediately to Safety Cars.
2. Driver Coach (Training & Insights): Analyze Sector 1, 2, and 3 times against benchmarks. Identify specific corner complexes where time is lost.
3. Data Scientist (Prediction): Forecast future race outcomes, tire degradation curves, and predicted finishing positions based on current trends.

Your output must be a strict JSON object minimizing conversational filler.
`;

// Fallback/Mock Generator for Dynamic Behavior when API is unavailable or fails
const mockStructuredResponse = (state: RaceState): StrategyResponse => {
    // Introduce randomness based on fluctuating input
    const randomFactor = (Math.random() * 0.8);
    // Calculate PNPA (Predicted Net Pace Advantage) dynamically
    const pnpa = (state.rivalPaceDelta + randomFactor).toFixed(2);
    const isPositive = parseFloat(pnpa) > 0;
    
    // Determine Command
    let cmd = CommandType.HOLD_STINT;
    let rationale = "";
    
    if (state.tireWear > 75) {
        cmd = CommandType.MANDATORY_PIT;
        rationale = `CRITICAL WEAR (${state.tireWear.toFixed(1)}%). Structural integrity at risk. Mandatory stop required immediately to avoid delamination.`;
    } else if (state.isSafetyCar) {
        cmd = CommandType.BOX_NOW;
        rationale = `SAFETY CAR DEPLOYED. Cheap pit stop opportunity. Minimize time loss while field is neutralized.`;
    } else if (isPositive && state.rivalGap < 1.5 && state.tireWear > 40) {
        cmd = CommandType.BOX_NOW;
        rationale = `UNDERCUT OPPORTUNITY. PNPA is +${pnpa}s. Rival pace fading. Box now to clear traffic and capitalize on fresh tire delta.`;
    } else {
        cmd = CommandType.HOLD_STINT;
        rationale = `EXTEND STINT. PNPA is ${isPositive ? '+' : ''}${pnpa}s. Current pace optimal. Overcut strategy favored to shorten final stint.`;
    }

    const pra = Math.min(100, Math.max(0, Math.floor(75 + (state.rivalGap * 5) + (state.rivalPaceDelta * 10))));
    
    // Mock Sector Analysis
    const s1Diff = state.sectorData.s1 - state.sectorData.s1_benchmark;
    const s2Diff = state.sectorData.s2 - state.sectorData.s2_benchmark;
    const s3Diff = state.sectorData.s3 - state.sectorData.s3_benchmark;
    let probSector: 'S1'|'S2'|'S3' = 'S1';
    let maxDiff = s1Diff;
    if (s2Diff > maxDiff) { probSector = 'S2'; maxDiff = s2Diff; }
    if (s3Diff > maxDiff) { probSector = 'S3'; maxDiff = s3Diff; }

    return {
        primary_command: cmd,
        strategy_rationale: rationale,
        pit_parameters: {
            tire_compound: Math.random() > 0.6 ? "Soft" : "Medium",
            fuel_liters: 40 + Math.floor(Math.random() * 10)
        },
        rejoin_analysis: {
            pra_score: pra,
            rival_exit_gap: `${(state.rivalGap - 22 + (Math.random() * 2)).toFixed(1)}s` // Crude pit loss calc
        },
        pit_window: {
            start_lap: state.currentLap + 1,
            end_lap: state.currentLap + 5
        },
        driver_execution: `Sector ${Math.floor(Math.random() * 3) + 1} Attack. Target Apex Speed +${(Math.random() * 8).toFixed(0)}kph.`,
        debrief_summary: "Telemetry indicates varying grip levels. Tire thermal degradation strictly within predicted limits.",
        
        sector_analysis: {
            problem_sector: probSector,
            time_loss: parseFloat(maxDiff.toFixed(2)),
            advice: `Losing ${maxDiff.toFixed(2)}s in ${probSector}. Focus on exit rotation.`
        },
        race_prediction: {
            predicted_finish_pos: Math.floor(Math.random() * 5) + 1,
            tire_life_remaining_laps: Math.floor((100 - state.tireWear) / 2.5),
            degradation_curve: state.weather.trackTemp > 45 ? 'High' : 'Medium',
            predicted_qualifying_pace: `1:${(34 + Math.random()).toFixed(3)}`
        },
        
        dataSource: 'SIMULATION'
    };
};

export const fetchStrategyRecommendation = async (state: RaceState): Promise<StrategyResponse> => {
  try {
    const userPrompt = `
      Current Race State: 
      Lap ${state.currentLap}/${state.totalLaps}. 
      Tire Wear: ${state.tireWear.toFixed(1)}%. 
      Fuel Remaining: ${state.fuelRemaining.toFixed(1)}L. 
      Rival Gap: ${state.rivalGap > 0 ? '+' : ''}${state.rivalGap.toFixed(2)}s. 
      Rival Pace Delta: ${state.rivalPaceDelta > 0 ? '+' : ''}${state.rivalPaceDelta.toFixed(2)}s.
      Safety Car: ${state.isSafetyCar ? "DEPLOYED" : "NO"}.

      Raw SRO Telemetry:
      nmot: ${state.telemetry.rpm}
      pbrake_f: ${state.telemetry.brakePressureF}
      pbrake_r: ${state.telemetry.brakePressureR}
      ath: ${state.telemetry.throttle_blade}
      aps: ${state.telemetry.throttle_pedal}
      
      Sector Times (Current vs Benchmark):
      S1: ${state.sectorData.s1.toFixed(3)} (Ideal: ${state.sectorData.s1_benchmark.toFixed(3)})
      S2: ${state.sectorData.s2.toFixed(3)} (Ideal: ${state.sectorData.s2_benchmark.toFixed(3)})
      S3: ${state.sectorData.s3.toFixed(3)} (Ideal: ${state.sectorData.s3_benchmark.toFixed(3)})

      Track Conditions:
      Track Temp: ${state.weather.trackTemp.toFixed(1)}C
      Air Temp: ${state.weather.airTemp.toFixed(1)}C
      
      Determine strategy, sector analysis for driver coaching, and race predictions.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primary_command: {
              type: Type.STRING,
              enum: [CommandType.BOX_NOW, CommandType.HOLD_STINT, CommandType.MANDATORY_PIT]
            },
            strategy_rationale: { type: Type.STRING },
            pit_parameters: {
              type: Type.OBJECT,
              properties: {
                tire_compound: { type: Type.STRING },
                fuel_liters: { type: Type.NUMBER }
              }
            },
            rejoin_analysis: {
              type: Type.OBJECT,
              properties: {
                pra_score: { type: Type.NUMBER, description: "0 to 100 probability" },
                rival_exit_gap: { type: Type.STRING }
              }
            },
            pit_window: {
                type: Type.OBJECT,
                properties: {
                    start_lap: { type: Type.NUMBER },
                    end_lap: { type: Type.NUMBER }
                }
            },
            driver_execution: { type: Type.STRING, description: "Specific corner advice" },
            debrief_summary: { type: Type.STRING, description: "Analysis of current stint performance" },
            
            // New Features
            sector_analysis: {
                type: Type.OBJECT,
                properties: {
                    problem_sector: { type: Type.STRING, enum: ['S1', 'S2', 'S3'] },
                    time_loss: { type: Type.NUMBER },
                    advice: { type: Type.STRING }
                }
            },
            race_prediction: {
                type: Type.OBJECT,
                properties: {
                    predicted_finish_pos: { type: Type.NUMBER },
                    tire_life_remaining_laps: { type: Type.NUMBER },
                    degradation_curve: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
                    predicted_qualifying_pace: { type: Type.STRING }
                }
            }
          },
          required: ["primary_command", "strategy_rationale", "pit_parameters", "rejoin_analysis", "driver_execution", "pit_window", "debrief_summary", "sector_analysis", "race_prediction"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as StrategyResponse;
      data.dataSource = 'GEMINI';
      return data;
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Strategy Fetch Error / Mock Fallback Triggered", error);
    return mockStructuredResponse(state);
  }
};

export const generateVoiceGuidance = async (text: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/wav;base64,${base64Audio}`;
    }
    return null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

export const processVoiceQuery = async (query: string, currentState: RaceState): Promise<string> => {
    try {
        const context = `
        Context: Lap ${currentState.currentLap}, Tire ${currentState.tireWear}%, Gap ${currentState.rivalGap}s.
        User asks: "${query}"
        Answer briefly as a race engineer.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: context
        });
        return response.text || "Copy that.";
    } catch (e) {
        return "Say again?";
    }
}