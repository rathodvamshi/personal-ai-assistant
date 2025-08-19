// frontend/src/components/Dashboard.js

import React, { useState, useEffect, useRef } from 'react';
import chatService from '../services/chatService'; // Use the new dedicated service
import authService from '../services/auth';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const initialMessage = { sender: 'assistant', text: 'Hello! How can I assist you today?' };
  const [messages, setMessages] = useState([initialMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  const chatWindowRef = useRef(null);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user && user.access_token) {
        try {
            const tokenData = JSON.parse(atob(user.access_token.split('.')[1]));
            setCurrentUserEmail(tokenData.sub);
        } catch (e) {
            console.error("Failed to decode token:", e);
        }
    }
  }, []);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // The call now uses the authenticated chatService
      const response = await chatService.sendMessage(input);
      
      if (response && response.data && typeof response.data.response !== 'undefined') {
        const assistantMessage = { sender: 'assistant', text: response.data.response };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error("Invalid response structure from server.");
      }

    } catch (error) {
      console.error("Error sending message:", error);
      
      const errorMessage = { sender: 'assistant', text: 'Sorry, I encountered an error. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([initialMessage]);
  };

  return (
    <div className="dashboard-container">
      <main className="dashboard-main">
        <div className="dashboard-header">
            <h2>Conversation</h2>
            <button onClick={handleClearChat} className="clear-chat-btn">
                Clear Chat
            </button>
        </div>
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
        <form className="chat-input-area" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="chat-input"
            placeholder="Type your message here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className="send-button" disabled={isLoading}>
            Send
          </button>
        </form>
      </main>
      <aside className="dashboard-sidebar">
        <div className="sidebar-section">
            <h3 className="sidebar-title">User Profile</h3>
            <p className="user-email">{currentUserEmail || 'Loading...'}</p>
        </div>
        <div className="sidebar-section">
          <h3 className="sidebar-title">Upcoming Tasks</h3>
          <ul className="task-list">
            <li>Call mom at 8 PM</li>
            <li>Finish project report</li>
          </ul>
        </div>
      </aside>
    </div>
  );
};

export default Dashboard;
