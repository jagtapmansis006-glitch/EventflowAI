import crypto from 'crypto';
import { db, Simulation, ScenarioType } from './db';

export function runSimulation(params: {
  eventId: string;
  createdBy: string;
  name: string;
  description: string;
  scenarioType: ScenarioType;
  inputParameters: Record<string, any>;
}): Simulation {
  const { eventId, createdBy, name, description, scenarioType, inputParameters } = params;
  const now = new Date().toISOString();

  const simId = `sim_${crypto.randomUUID()}`;
  const simulation: Simulation = {
    id: simId,
    eventId,
    createdBy,
    name,
    description: description || `Simulating ${scenarioType}`,
    scenarioType,
    inputParameters,
    status: 'RUNNING',
    results: null,
    createdAt: now,
    completedAt: null
  };

  // Perform calculation
  const zones = db.get('crowdZones').filter(z => z.eventId === eventId);
  const gates = db.get('gates').filter(g => g.eventId === eventId);
  const totalCapacity = zones.reduce((s, z) => s + z.capacity, 0) || 10000;
  const currentTotalCrowd = gates.reduce((s, g) => s + g.currentCount, 0) || 4500;

  let results: Record<string, any> = {};

  switch (scenarioType) {
    case 'GATE_CLOSURE': {
      const closedGateId = inputParameters.gateId || (gates[0] ? gates[0].id : 'gate_1');
      const closedGate = gates.find(g => g.id === closedGateId) || gates[0];
      const divertedCount = closedGate ? Math.round(closedGate.capacity * 0.6) : 2000;
      const otherGates = gates.filter(g => g.id !== closedGateId);
      const addedLoadPerGate = otherGates.length > 0 ? Math.round(divertedCount / otherGates.length) : divertedCount;

      results = {
        closedGate: closedGate ? closedGate.name : 'Target Gate',
        divertedAttendees: divertedCount,
        addedQueueLoadPerGate: addedLoadPerGate,
        estimatedQueueWaitIncreaseMinutes: Math.round((divertedCount / 120) * 10) / 10,
        bottleneckProbability: 'HIGH',
        recommendation: `Deploy 6 marshals to redirect flow to ${otherGates.map(g => g.name).join(' & ')} before turnstile bottleneck reaches 90%.`
      };
      break;
    }

    case 'CROWD_SURGE': {
      const surgePercent = Number(inputParameters.surgePercent) || 30;
      const durationMinutes = Number(inputParameters.durationMinutes) || 15;
      const targetZoneId = inputParameters.zoneId || (zones[0] ? zones[0].id : 'zone_1');
      const targetZone = zones.find(z => z.id === targetZoneId) || zones[0];
      const zoneCapacity = targetZone ? targetZone.capacity : 5000;

      const surgeAddition = Math.round((currentTotalCrowd * (surgePercent / 100)) * (durationMinutes / 30));
      const projectedPeakZoneCrowd = Math.round(zoneCapacity * 0.7) + surgeAddition;
      const peakOccupancy = Math.min(100, Math.round((projectedPeakZoneCrowd / zoneCapacity) * 100));

      results = {
        surgeMagnitude: `+${surgePercent}% inflow over ${durationMinutes} min`,
        targetZone: targetZone ? targetZone.name : 'Ingress Zone',
        projectedPeakCount: projectedPeakZoneCrowd,
        projectedOccupancyPercent: peakOccupancy,
        isCapacityExceeded: projectedPeakZoneCrowd > zoneCapacity,
        bottleneckZone: targetZone ? targetZone.name : 'North Plaza',
        recommendation: peakOccupancy > 85
          ? 'Activate emergency flow diversion route and throttle primary turnstiles by 25%.'
          : 'Standard operational capacity sufficient; keep 2 extra queue lines on standby.'
      };
      break;
    }

    case 'ROUTE_CHANGE': {
      const reroutedTraffic = Number(inputParameters.estimatedPedestrians) || 1800;
      results = {
        reroutedPedestrians: reroutedTraffic,
        estimatedTravelTimeDelta: '+3.2 minutes',
        concoursePressureIncrease: '+18%',
        safetyClearance: 'COMPLIANT',
        recommendation: 'Post digital directional signage at junction 2B to prevent cross-flow collisions.'
      };
      break;
    }

    case 'GATE_OPENING': {
      const openedGateId = inputParameters.gateId || (gates[1] ? gates[1].id : 'gate_2');
      results = {
        openedGate: openedGateId,
        alleviatedQueuePercent: 28,
        timeToNormalDensityMinutes: 9.4,
        recommendation: 'Open all 4 turnstiles simultaneously to maximize dispersion.'
      };
      break;
    }

    default: {
      results = {
        evaluation: 'Rule-based scenario execution completed.',
        crowdImpactIndex: 'MODERATE',
        estimatedStabilizationTime: '12 minutes',
        recommendation: 'Monitor automated 30s telemetry feed for confirmation of flow stabilization.'
      };
      break;
    }
  }

  simulation.status = 'COMPLETED';
  simulation.results = results;
  simulation.completedAt = new Date().toISOString();

  const simulations = db.get('simulations');
  simulations.unshift(simulation);
  db.save();

  return simulation;
}
