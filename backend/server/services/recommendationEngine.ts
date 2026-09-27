import crypto from 'crypto';
import {
  db,
  Recommendation,
  RecommendationType,
  RecommendationPriority,
  RiskLevel
} from '../db';
import { realtimeManager } from '../realtime';

export interface NugenDensityInput {
  peopleCount: number;
  occupancyPercent: number;
  inflow: number;
  outflow: number;
  avgSpeedMps?: number;
}

export type NugenDensityLevel = 'LOW' | 'BUSY' | 'CRITICAL';

/**
 * Nugen AI Alignment Engine: Queries Nugen density model or falls back to percentage rules
 */
export async function inferNugenDensity(input: NugenDensityInput): Promise<{
  densityLevel: NugenDensityLevel;
  confidence: number;
  source: 'eventflow-nugen-density' | 'standard_rule_fallback';
}> {
  const nugenEndpoint = process.env.NUGEN_API_URL || 'http://localhost:8000/models/eventflow-nugen-density';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(nugenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data: any = await res.json();
      const level = String(data?.densityLevel || data?.riskLevel || '').toUpperCase();
      if (['LOW', 'BUSY', 'CRITICAL'].includes(level)) {
        return {
          densityLevel: level as NugenDensityLevel,
          confidence: Number(data.confidence) || 0.96,
          source: 'eventflow-nugen-density'
        };
      }
    }
  } catch (_err) {
    // Graceful offline fallback
  }

  // Standard percentage rules fallback
  const occ = Number(input.occupancyPercent) || 0;
  const speed = input.avgSpeedMps !== undefined ? Number(input.avgSpeedMps) : 1.1;
  let densityLevel: NugenDensityLevel = 'LOW';

  if (occ >= 85 || (speed < 0.35 && occ >= 65)) {
    densityLevel = 'CRITICAL';
  } else if (occ >= 65) {
    densityLevel = 'BUSY';
  } else {
    densityLevel = 'LOW';
  }

  return {
    densityLevel,
    confidence: 0.94,
    source: 'standard_rule_fallback'
  };
}

/**
 * Nugen Weather Digital Twin Simulation
 */
export async function inferNugenWeather(input: {
  rainfall_mm: number;
  temp_c: number;
  storm_duration_min: number;
  zone_type: string;
}): Promise<{
  occupancy_shift_percent: number;
  dwell_time_shift_percent: number;
  inflow_shift_percent: number;
  outflow_shift_percent: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  source: 'eventflow-nugen-weather' | 'digital_twin_physics_fallback';
}> {
  const nugenEndpoint = process.env.NUGEN_WEATHER_API_URL || 'http://localhost:8000/models/eventflow-nugen-weather';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(nugenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data: any = await res.json();
      if (data?.occupancy_shift_percent !== undefined) {
        return {
          occupancy_shift_percent: Number(data.occupancy_shift_percent),
          dwell_time_shift_percent: Number(data.dwell_time_shift_percent || 0),
          inflow_shift_percent: Number(data.inflow_shift_percent || 0),
          outflow_shift_percent: Number(data.outflow_shift_percent || 0),
          risk_level: data.risk_level || 'MEDIUM',
          confidence: Number(data.confidence) || 0.95,
          source: 'eventflow-nugen-weather'
        };
      }
    }
  } catch (_e) {
    // Graceful offline fallback
  }

  // Calibrated Digital Twin physics model
  const rain = Math.max(0, Number(input.rainfall_mm) || 0);
  const temp = Number(input.temp_c) || 24;
  const duration = Math.max(0, Number(input.storm_duration_min) || 0);
  const zoneType = String(input.zone_type || 'OUTDOOR_PLAZA').toUpperCase();

  let occShift = 0;
  let dwellShift = 0;
  let inflowShift = 0;
  let outflowShift = 0;

  if (zoneType === 'OUTDOOR_PLAZA' || zoneType === 'OPEN_FIELD') {
    // People abandon open areas during rain
    occShift = -Math.min(75, Math.round(rain * 1.2 + duration * 0.2));
    dwellShift = -Math.min(60, Math.round(rain * 0.8 + duration * 0.15));
    outflowShift = +Math.min(80, Math.round(rain * 1.4));
    inflowShift = -Math.min(70, Math.round(rain * 1.1));
  } else if (zoneType === 'COVERED_CONCOURSE' || zoneType === 'SHELTER') {
    // High surge of people taking shelter
    occShift = +Math.min(85, Math.round(rain * 1.1 + (temp < 20 ? 8 : 0) + duration * 0.25));
    dwellShift = +Math.min(90, Math.round(duration * 0.6 + rain * 0.5));
    inflowShift = +Math.min(75, Math.round(rain * 1.3));
    outflowShift = -Math.min(50, Math.round(rain * 0.7));
  } else {
    // INDOOR_ARENA or general
    occShift = +Math.min(45, Math.round(rain * 0.4 + duration * 0.1));
    dwellShift = +Math.min(50, Math.round(duration * 0.3 + rain * 0.2));
    inflowShift = -Math.min(30, Math.round(rain * 0.3));
    outflowShift = -Math.min(35, Math.round(rain * 0.4));
  }

  const absShift = Math.abs(occShift);
  const risk_level = absShift > 60 || (rain > 35 && duration > 45)
    ? 'CRITICAL'
    : absShift > 40 || rain > 20
    ? 'HIGH'
    : absShift > 20 || rain > 5
    ? 'MEDIUM'
    : 'LOW';

  return {
    occupancy_shift_percent: occShift,
    dwell_time_shift_percent: dwellShift,
    inflow_shift_percent: inflowShift,
    outflow_shift_percent: outflowShift,
    risk_level,
    confidence: 0.94,
    source: 'digital_twin_physics_fallback'
  };
}

export function generateRecommendationsForZone(
  eventId: string,
  zoneId: string
): Recommendation[] {
  const zone = db
    .get('crowdZones')
    .find(z => z.id === zoneId && z.eventId === eventId);

  if (!zone) {
    return [];
  }

  const predictions = db
    .get('mlPredictions')
    .filter(p => p.eventId === eventId && p.zoneId === zoneId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const latestPrediction = predictions[0];
  if (!latestPrediction) {
    return [];
  }

  const riskLevel: RiskLevel = latestPrediction.riskLevel;
  const existingActive = db
    .get('recommendations')
    .filter(
      r => r.eventId === eventId && r.zoneId === zoneId && r.status === 'ACTIVE'
    );

  const created: Recommendation[] = [];

  const hasActiveType = (type: RecommendationType): boolean => {
    return existingActive.some(r => r.type === type);
  };

  const now = new Date().toISOString();

  function createRecommendation(
    type: RecommendationType,
    priority: RecommendationPriority,
    title: string,
    description: string,
    reason: string,
    suggestedAction: string
  ): void {
    if (hasActiveType(type)) {
      return;
    }

    const recommendation: Recommendation = {
      id: `rec_${crypto.randomUUID().slice(0, 8)}`,
      eventId,
      zoneId,
      recommendationType: type,
      priority,
      title,
      description,
      basedOnPredictionId: latestPrediction.id,
      suggestedGateId: null,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      type,
      reason,
      suggestedAction,
      riskLevel,
      confidence: latestPrediction.confidence
    };

    db.get('recommendations').unshift(recommendation);
    created.push(recommendation);

    realtimeManager.broadcast(
      'recommendation_created' as any,
      {
        recommendationId: recommendation.id,
        title: recommendation.title,
        type: recommendation.type,
        priority: recommendation.priority,
        zoneId
      },
      eventId
    );
  }

  function findAlternateGate() {
    const gates = db
      .get('gates')
      .filter(gate => gate.eventId === eventId && gate.status === 'OPEN');

    if (gates.length === 0) {
      return null;
    }

    return gates.reduce((best, gate) => {
      const spare = gate.capacity - gate.currentCount;
      const bestSpare = best.capacity - best.currentCount;
      return spare > bestSpare ? gate : best;
    }, gates[0]);
  }

  if (riskLevel === 'CRITICAL') {
    const alternateGate = findAlternateGate();

    createRecommendation(
      'REDIRECT_ATTENDEES',
      'CRITICAL',
      `Redirect attendees from ${zone.name}`,
      `The zone is forecasted at ${latestPrediction.predictedOccupancyPercent}% occupancy.`,
      'The prediction engine detected CRITICAL crowd risk.',
      alternateGate
        ? `Redirect incoming attendees toward ${alternateGate.name}.`
        : 'Redirect incoming attendees toward an alternate route.'
    );

    createRecommendation(
      'DEPLOY_STAFF',
      'CRITICAL',
      `Deploy staff to ${zone.name}`,
      `Predicted crowd count is ${latestPrediction.predictedPeopleCount}.`,
      'The predicted crowd level exceeds the safe operating range.',
      `Deploy additional crowd-management staff to ${zone.name}.`
    );

    createRecommendation(
      'NOTIFY_ADMIN',
      'CRITICAL',
      `Immediate attention required at ${zone.name}`,
      'The prediction engine has identified CRITICAL crowd risk.',
      'Critical crowd pressure requires administrator attention.',
      'Notify the Event Admin and Super Admin immediately.'
    );
  } else if (riskLevel === 'HIGH') {
    const alternateGate = findAlternateGate();

    if (alternateGate) {
      createRecommendation(
        'OPEN_GATE',
        'HIGH',
        `Consider opening ${alternateGate.name}`,
        `${zone.name} is trending toward high crowd pressure.`,
        'The zone has HIGH predicted risk and the alternate gate has spare capacity.',
        `Consider opening ${alternateGate.name} to distribute incoming attendees.`
      );
    }

    createRecommendation(
      'MONITOR_ZONE',
      'HIGH',
      `Increase monitoring of ${zone.name}`,
      `The zone has HIGH predicted crowd risk.`,
      'The prediction engine detected increasing crowd pressure.',
      `Monitor ${zone.name} closely during the next prediction window.`
    );
  } else if (riskLevel === 'MEDIUM') {
    createRecommendation(
      'MONITOR_ZONE',
      'MEDIUM',
      `Monitor ${zone.name}`,
      `The zone is showing a MEDIUM crowd-risk trend.`,
      'Crowd pressure is increasing but has not reached a high-risk level.',
      'Continue monitoring the zone.'
    );

    createRecommendation(
      'PREPARE_ALTERNATE_ROUTE',
      'MEDIUM',
      `Prepare alternate route for ${zone.name}`,
      'The prediction indicates increasing crowd pressure.',
      'Preparing an alternate route can reduce future congestion.',
      'Prepare an alternate route for attendees if pressure continues increasing.'
    );
  }

  if (created.length > 0) {
    db.save();
  }

  return created;
}
