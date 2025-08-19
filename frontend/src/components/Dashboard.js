// frontend/src/components/Dashboard.js

import React, { useState, useEffect, useRef } from 'react';
import chatService from '../services/chatService';
import authService from '../services/auth';
import '../styles/Dashboard.css';

// --- Task Modal Component ---
const TaskModal = ({ task, onSave, onClose }) => {
    const [content, setContent] = useState(task ? task.content : "");
    const [dueDate, setDueDate] = useState(task ? task.due_date : "");

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...task, content, due_date: dueDate });
    };

    return (
        <div className="task-modal-overlay" onClick={onClose}>
            <div className="task-modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>{task ? "Edit Task" : "Create New Task"}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Task</label>
                        <input
                            type="text"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="What needs to be done?"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Due Date</label>
                        <input
                            type="text"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            placeholder="e.g., Tomorrow at 5pm"
                            required
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="cancel-btn">Cancel</button>
                        <button type="submit" className="save-btn">Save Task</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const Dashboard = () => {
  const initialMessage = { sender: 'assistant', text: 'Hello! How can I assist you today?' };
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [pendingTasks, setPendingTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);

  const chatWindowRef = useRef(null);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user && user.access_token) {
        try {
            const tokenData = JSON.parse(atob(user.access_token.split('.')[1]));
            setCurrentUserEmail(tokenData.sub);
        } catch (e) { console.error("Failed to decode token:", e); }
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const loadInitialData = async () => {
      try {
          const historyResponse = await chatService.getHistory();
          setMessages(historyResponse.data && historyResponse.data.length > 0 ? historyResponse.data : [initialMessage]);
          await fetchAllTasks();
      } catch (error) {
          console.error("Failed to load initial data:", error);
          setMessages([initialMessage]);
      }
  };

  const fetchAllTasks = async () => {
      try {
          const pendingResponse = await chatService.getTasks();
          setPendingTasks(pendingResponse.data);
          const completedResponse = await chatService.getTaskHistory();
          setCompletedTasks(completedResponse.data);
      } catch (error) {
          console.error("Failed to fetch tasks:", error);
      }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    try {
      const response = await chatService.sendMessage(currentInput);
      const assistantMessage = { sender: 'assistant', text: response.data.response };
      setMessages(prev => [...prev, assistantMessage]);
      await fetchAllTasks();
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = { sender: 'assistant', text: 'Sorry, I encountered an error. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOpenModal = (task = null) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTaskToEdit(null);
  };

  const handleSaveTask = async (taskData) => {
    try {
        if (taskToEdit) {
            // Editing an existing task
            await chatService.updateTask(taskToEdit.id, {
                content: taskData.content,
                due_date: taskData.due_date,
            });
        } else {
            // Creating a new task
            await chatService.createTask(taskData.content, taskData.due_date);
        }
        await fetchAllTasks();
        handleCloseModal();
    } catch (error) {
        console.error("Failed to save task:", error);
    }
  };

  const handleMarkAsDone = async (taskId) => {
    try {
        await chatService.markTaskAsDone(taskId);
        await fetchAllTasks();
    } catch (error) {
        console.error("Failed to mark task as done:", error);
    }
  };
  
  const handleClearChat = async () => {
    if (window.confirm("Are you sure you want to delete your entire chat history?")) {
        try {
            await chatService.clearHistory();
            setMessages([initialMessage]);
        } catch (error) {
            console.error("Failed to clear chat history:", error);
        }
    }
  };

  return (
    <>
      {isModalOpen && <TaskModal task={taskToEdit} onSave={handleSaveTask} onClose={handleCloseModal} />}
      <div className="dashboard-container">
        <main className="dashboard-main">
          <div className="dashboard-header">
              <h2>Conversation</h2>
              <button onClick={handleClearChat} className="clear-chat-btn">Clear History</button>
          </div>
          <div className="chat-window" ref={chatWindowRef}>
            {messages.map((msg, index) => ( <div key={index} className={`chat-message ${msg.sender}`}><p>{msg.text}</p></div> ))}
            {isLoading && ( <div className="chat-message assistant"><p><i>Typing...</i></p></div> )}
          </div>
          <form className="chat-input-area" onSubmit={handleSendMessage}>
            <input type="text" className="chat-input" placeholder="Type your message here..." value={input} onChange={(e) => setInput(e.target.value)} disabled={isLoading} />
            <button type="submit" className="send-button" disabled={isLoading}>Send</button>
          </form>
        </main>
        <aside className="dashboard-sidebar">
          <div className="sidebar-section">
              <h3 className="sidebar-title">User Profile</h3>
              <p className="user-email">{currentUserEmail || 'Loading...'}</p>
          </div>
          <div className="sidebar-section">
            <div className="sidebar-title">
              <h3>Upcoming Tasks ({pendingTasks.length})</h3>
              <button onClick={() => handleOpenModal()} className="add-task-btn-icon" title="Add new task">+</button>
            </div>
            <ul className="task-list">
              {pendingTasks.length > 0 ? (
                  pendingTasks.map(task => (
                      <li key={task.id} className="task-item">
                          <div className="task-details">
                              <span className="task-content">{task.content}</span>
                              <span className="task-due-date">{task.due_date}</span>
                          </div>
                          <div className="task-actions">
                              <button onClick={() => handleOpenModal(task)} className="edit-btn" title="Edit task">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                              </button>
                              <button onClick={() => handleMarkAsDone(task.id)} className="delete-btn" title="Mark as done">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              </button>
                          </div>
                      </li>
                  ))
              ) : (
                  <li className="no-tasks">No pending tasks.</li>
              )}
            </ul>
          </div>
          <div className="sidebar-section">
              <h3 className="sidebar-title">Completed Tasks</h3>
              <ul className="task-list completed-tasks">
                  {completedTasks.length > 0 ? (
                      completedTasks.map(task => (
                          <li key={task.id} className="task-item completed">
                              <span className="task-content">{task.content}</span>
                          </li>
                      ))
                  ) : (
                      <li className="no-tasks">No completed tasks yet.</li>
                  )}
              </ul>
          </div>
        </aside>
      </div>
    </>
  );
};

export default Dashboard;
