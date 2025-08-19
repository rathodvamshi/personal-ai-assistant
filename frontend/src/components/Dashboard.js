import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import chatService from '../services/chatService';
import authService from '../services/auth';
import '../styles/Dashboard.css';

// --- Reusable Components ---
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
                <h3>
                    {task ? "Edit Task" : (
                        <span className="modal-title-with-icon">
                            Create New Task
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="calendar-icon">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                        </span>
                    )}
                </h3>
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

const LoadingSpinner = () => (
    <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading Your Dashboard...</p>
    </div>
);

const ErrorDisplay = ({ message, onRetry }) => (
    <div className="loading-container">
        <p className="error-message">Sorry, something went wrong.</p>
        <p className="error-detail">{message}</p>
        <button onClick={onRetry} className="retry-btn">Try Again</button>
    </div>
);

// --- Main Dashboard Component ---
const Dashboard = () => {
    const initialMessage = useMemo(
        () => ({ sender: 'assistant', text: 'Hello! How can I assist you today?' }),
        []
    );

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPageLoading, setIsPageLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUserEmail, setCurrentUserEmail] = useState('');
    const [pendingTasks, setPendingTasks] = useState([]);
    const [completedTasks, setCompletedTasks] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState(null);

    const chatWindowRef = useRef(null);

    const loadInitialData = useCallback(async () => {
        setIsPageLoading(true);
        setError(null);
        try {
            const [historyResponse, pendingResponse, completedResponse] = await Promise.all([
                chatService.getHistory(),
                chatService.getTasks(),
                chatService.getTaskHistory()
            ]);
            setMessages(historyResponse.data && historyResponse.data.length > 0 ? historyResponse.data : [initialMessage]);
            setPendingTasks(pendingResponse.data);
            setCompletedTasks(completedResponse.data);
        } catch (err) {
            console.error("Failed to load initial data:", err);
            setError("Could not connect to the server. Please check your connection and try again.");
        } finally {
            setIsPageLoading(false);
        }
    }, [initialMessage]);

    useEffect(() => {
        const user = authService.getCurrentUser();
        if (user && user.access_token) {
            try {
                const tokenData = JSON.parse(atob(user.access_token.split('.')[1]));
                setCurrentUserEmail(tokenData.sub);
            } catch (e) { console.error("Failed to decode token:", e); }
        }
        loadInitialData();
    }, [loadInitialData]);

    useEffect(() => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchAllTasks = async () => {
        try {
            const [pendingResponse, completedResponse] = await Promise.all([
                chatService.getTasks(),
                chatService.getTaskHistory()
            ]);
            setPendingTasks(pendingResponse.data);
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
                await chatService.updateTask(taskToEdit.id, { content: taskData.content, due_date: taskData.due_date });
            } else {
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

    if (isPageLoading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return <ErrorDisplay message={error} onRetry={loadInitialData} />;
    }

    return (
        <>
            {isModalOpen && <TaskModal task={taskToEdit} onSave={handleSaveTask} onClose={handleCloseModal} />}

            <div className="dashboard-container">
                <main className="dashboard-main">
                    <div className="chat-window" ref={chatWindowRef}>
                        {messages.map((msg, index) => ( 
                            <div key={index} className={`chat-message ${msg.sender}`}>
                                <p>{msg.text}</p>
                            </div> 
                        ))}
                        {isLoading && ( 
                            <div className="chat-message assistant">
                                <p><i>Typing...</i></p>
                            </div> 
                        )}
                    </div>
                    <div className="chat-input-area">
                        <input 
                            type="text" 
                            className="chat-input" 
                            placeholder="Type your message here..." 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)} 
                            disabled={isLoading} 
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e)}
                        />
                        <button 
                            type="button" 
                            className="send-button" 
                            disabled={isLoading}
                            onClick={handleSendMessage}
                        >
                            {isLoading ? 'Sending...' : 'Send'}
                        </button>
                    </div>
                </main>

                {/* Right Sidebar */}
                <aside className="right-sidebar">
                    <div className="sidebar-icons">
                        <div className="sidebar-icon" title="User Profile">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </div>
                        <div className="sidebar-icon" title="Tasks">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14,2 14,8 20,8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10,9 9,10 7,8"></polyline>
                            </svg>
                            <span className="task-count">{pendingTasks.length}</span>
                        </div>
                        <div className="sidebar-icon clear-icon" title="Clear Chat" onClick={handleClearChat}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        </div>
                    </div>

                    <div className="sidebar-content">
                        <div className="sidebar-section">
                            <h3 className="sidebar-title">User Profile</h3>
                            <p className="user-email">{currentUserEmail || 'Loading...'}</p>
                        </div>
                        
                        <div className="sidebar-section">
                            <div className="sidebar-title">
                                <h3>Upcoming Tasks ({pendingTasks.length})</h3>
                                <button onClick={() => handleOpenModal()} className="add-task-btn-icon" title="Add new task">+</button>
                            </div>
                            <div className="task-list-container">
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
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                    </button>
                                                    <button onClick={() => handleMarkAsDone(task.id)} className="delete-btn" title="Mark as done">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                    </button>
                                                </div>
                                            </li>
                                        ))
                                    ) : (
                                        <li className="no-tasks">No pending tasks.</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                        
                        <div className="sidebar-section">
                            <h3 className="sidebar-title">Completed Tasks</h3>
                            <div className="task-list-container">
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
                        </div>
                    </div>
                </aside>
            </div>
        </>
    );
};

export default Dashboard;
