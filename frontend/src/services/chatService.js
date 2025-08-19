// frontend/src/services/chatService.js

import apiClient from './api';

const chatService = {
  /**
   * Sends a message to the backend chat endpoint using the authenticated client.
   * @param {string} message - The user's message.
   * @returns {Promise} - The Axios promise for the API call.
   */
  sendMessage(message) {
    return apiClient.post('/chat/', { message });
  },
};

export default chatService;
