import { apiClient } from '../api/client';
import { MLPrediction } from '../types';

export const predictionService = {
  getEventPredictions: async (eventId: string): Promise<MLPrediction[]> => {
    const res = await apiClient<{ predictions: MLPrediction[] }>(`/api/v1/admin/events/${eventId}/predictions`);
    return res.predictions;
  },

  getZonePredictions: async (eventId: string, zoneId: string): Promise<MLPrediction[]> => {
    const res = await apiClient<{ predictions: MLPrediction[] }>(`/api/v1/admin/events/${eventId}/zones/${zoneId}/predictions`);
    return res.predictions;
  },

  triggerPrediction: async (eventId: string, zoneId: string): Promise<MLPrediction[]> => {
    const res = await apiClient<{ predictions: MLPrediction[] }>(`/api/v1/admin/events/${eventId}/zones/${zoneId}/run-prediction`, {
      method: 'POST'
    });
    return res.predictions;
  }
};
