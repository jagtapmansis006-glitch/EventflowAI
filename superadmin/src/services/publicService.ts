import { apiClient } from '../api/client';
import { PublicEventDetails } from '../types';

export const publicService = {
  getPublicEvent: async (slug: string): Promise<PublicEventDetails> => {
    return apiClient.get<PublicEventDetails>(`/api/v1/public/events/${slug}`);
  }
};
