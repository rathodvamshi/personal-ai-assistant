// frontend/src/services/chatService.js

import apiClient from './api';

const chatService = {
  sendMessage(message) {
    return apiClient.post('/chat/', { message });
  },

  getHistory() {
    return apiClient.get('/chat/history');
  },

  getTasks() {
    return apiClient.get('/chat/tasks');
  },

  /**
   * Fetches the user's completed tasks from the backend.
   */
  getTaskHistory() {
    return apiClient.get('/chat/tasks/history');
  },

  /**
   * Sends a request to manually create a new task.
   * @param {string} content - The content of the task.
   * @param {string} dueDate - The due date of the task.
   */
  createTask(content, dueDate) {
    return apiClient.post('/chat/tasks', { content, due_date: dueDate });
  },

  /**
   * Sends an update request for a specific task with multiple fields.
   * @param {string} taskId - The ID of the task to update.
   * @param {object} taskData - An object with the new task data (e.g., { content, due_date }).
   */
  updateTask(taskId, taskData) {
    return apiClient.put(`/chat/tasks/${taskId}`, taskData);
  },

  /**
   * Sends a request to mark a task as done.
   * @param {string} taskId - The ID of the task to complete.
   */
  markTaskAsDone(taskId) {
    return apiClient.put(`/chat/tasks/${taskId}/done`);
  },

  /**
   * Sends a request to clear the user's chat history.
   */
  clearHistory() {
    return apiClient.delete('/chat/history/clear');
  },
};

export default chatService;
