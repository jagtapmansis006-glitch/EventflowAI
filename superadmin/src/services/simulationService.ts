import { apiClient } from '../api/client';
import { Simulation, ScenarioType } from '../types';

export const simulationService = {
  getEventSimulations: async (eventId: string): Promise<Simulation[]> => {
    const res = await apiClient<{ simulations: Simulation[] }>(`/api/v1/admin/events/${eventId}/simulations`);
    return res.simulations;
  },

  getSimulationById: async (id: string): Promise<Simulation> => {
    const res = await apiClient<{ simulation: Simulation }>(`/api/v1/admin/simulations/${id}`);
    return res.simulation;
  },

  createSimulation: async (eventId: string, data: {
    name: string;
    description: string;
    scenarioType: ScenarioType;
    inputParameters: Record<string, any>;
  }): Promise<Simulation> => {
    const res = await apiClient<{ simulation: Simulation }>(`/api/v1/admin/events/${eventId}/simulations`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.simulation;
  }
};
