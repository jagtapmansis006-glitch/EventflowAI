import crypto from 'crypto';
import { db, MLPrediction, RiskLevel, PredictionType } from './db';

export function runPredictionForZone(eventId: string, zoneId: string): MLPrediction[] {
  const telemetryList = db.get('crowdTelemetry')
    .filter(t => t.eventId === eventId && t.zoneId === zoneId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const zone = db.get('crowdZones').find(z => z.id === zoneId);
  const capacity = zone ? zone.capacity : 10000;
  const warningThresh = zone ? zone.warningThreshold : capacity * 0.75;
  const criticalThresh = zone ? zone.criticalThreshold : capacity * 0.9;

  // Use recent 5-10 windows (~2.5-5 minutes)
  const recent = telemetryList.slice(-10);
  if (recent.length === 0) {
    return [];
  }

  const latest = recent[recent.length - 1];
  const avgNetFlow = recent.reduce((sum, t) => sum + t.netFlow, 0) / recent.length;
  const avgInflow = recent.reduce((sum, t) => sum + t.inflow, 0) / recent.length;
  const avgOutflow = recent.reduce((sum, t) => sum + t.outflow, 0) / recent.length;

  const predictions: MLPrediction[] = [];
  const horizons = [
    { minutes: 5, type: 'CROWD_COUNT' as PredictionType },
    { minutes: 10, type: 'OCCUPANCY' as PredictionType },
    { minutes: 15, type: 'RISK' as PredictionType }
  ];

  const now = new Date();

  for (const h of horizons) {
    // 30-sec windows in horizon
    const steps = (h.minutes * 60) / 30;
    // Projected count based on trend
    const projectedCount = Math.max(0, Math.round(latest.peopleCount + avgNetFlow * steps));
    const projectedOccupancy = Math.min(100, Math.max(0, Math.round((projectedCount / capacity) * 100)));
    const projectedInflow = Math.max(0, Math.round(avgInflow * (1 + (Math.random() * 0.1 - 0.05))));
    const projectedOutflow = Math.max(0, Math.round(avgOutflow * (1 + (Math.random() * 0.08 - 0.04))));

    let risk: RiskLevel = 'LOW';
    if (projectedCount >= criticalThresh || projectedOccupancy >= 90) {
      risk = 'CRITICAL';
    } else if (projectedCount >= warningThresh || projectedOccupancy >= 75) {
      risk = 'HIGH';
    } else if (projectedOccupancy >= 50) {
      risk = 'MEDIUM';
    }

    // Confidence is higher with more historical sample points
    const confidence = Math.min(0.95, 0.70 + recent.length * 0.025);

    const pred: MLPrediction = {
      id: `pred_${crypto.randomUUID()}`,
      eventId,
      zoneId,
      predictionType: h.type,
      predictionTime: now.toISOString(),
      forecastFor: new Date(now.getTime() + h.minutes * 60000).toISOString(),
      predictedPeopleCount: projectedCount,
      predictedOccupancyPercent: projectedOccupancy,
      predictedInflow: projectedInflow,
      predictedOutflow: projectedOutflow,
      riskLevel: risk,
      confidence: Math.round(confidence * 100) / 100,
      modelName: 'TimeStep-FlowEstimator-v1',
      modelVersion: '1.2.0',
      inputWindow: `${recent.length * 30}S_HISTORICAL_TELEMETRY`,
      createdAt: now.toISOString()
    };

    predictions.push(pred);
  }

  // Save into database
  const mlPreds = db.get('mlPredictions');
  mlPreds.push(...predictions);
  db.save();

  return predictions;
}
