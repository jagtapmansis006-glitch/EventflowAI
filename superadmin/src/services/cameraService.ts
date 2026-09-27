import { apiClient } from '../api/client';
import { Camera } from '../types';

export const cameraService = {
  getEventCameras: async (eventId: string): Promise<Camera[]> => {
    const res = await apiClient<{ cameras: Camera[] }>(`/api/v1/admin/events/${eventId}/cameras`);
    return res.cameras;
  },

  createCamera: async (eventId: string, data: Partial<Camera>): Promise<Camera> => {
    const res = await apiClient<{ camera: Camera }>(`/api/v1/admin/events/${eventId}/cameras`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.camera;
  },

  updateCamera: async (eventId: string, cameraId: string, data: Partial<Camera>): Promise<Camera> => {
    const res = await apiClient<{ camera: Camera }>(`/api/v1/admin/events/${eventId}/cameras/${cameraId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.camera;
  }
};
