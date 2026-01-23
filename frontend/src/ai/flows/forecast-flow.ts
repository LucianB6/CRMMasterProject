export type ForecastOutput = {
  prediction: string;
  confidence: 'High' | 'Medium' | 'Low';
  summary: string;
};
