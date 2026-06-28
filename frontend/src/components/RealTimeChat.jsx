import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Send, File as FileIcon, Paperclip } from 'lucide-react';
import { useSelector } from 'react-redux';

const RealTimeChat = ({ selectedLawyerId, sessionId }) => {
  const { user, token } = useSelector(state => state.auth);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [stompClient, setStompClient] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Initialize STOMP client
    const socket = new SockJS('http://localhost:8080/ws');
    const client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log(str),
      onConnect: () => {
        // Subscribe to user's private queue
        client.subscribe(`/user/${user.id}/queue/messages`, (msg) => {
          const newMsg = JSON.parse(msg.body);
          if (newMsg.session.id === sessionId) {
            setMessages(prev => [...prev, newMsg]);
          }
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      },
    });

    client.activate();
    setStompClient(client);

    return () => {
      if (client) client.deactivate();
    };
  }, [user.id, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !stompClient) return;

    const chatMessageDto = {
      senderId: user.id,
      receiverId: selectedLawyerId,
      sessionId: sessionId,
      message: inputValue,
      messageType: "TEXT"
    };

    stompClient.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(chatMessageDto),
    });

    setInputValue('');
  };

  return (
    <div className="flex flex-col h-[500px] w-full bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-xl font-medium">
        Secure Lawyer Chat
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
        {messages.map((msg, idx) => {
          const isMe = msg.sender.id === user.id;
          return (
            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-3 rounded-xl ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none'}`}>
                {msg.messageType === 'TEXT' ? (
                  <p className="text-sm">{msg.message}</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <FileIcon size={16} />
                    <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="underline text-sm">{msg.fileName}</a>
                  </div>
                )}
                <span className="text-[10px] opacity-70 mt-1 block text-right">
                  {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <button type="button" className="p-2 text-gray-500 hover:text-indigo-600 transition-colors">
          <Paperclip size={20} />
        </button>
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your message securely..." 
          className="flex-1 bg-gray-100 dark:bg-gray-900 border-none rounded-full px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
        />
        <button type="submit" disabled={!inputValue.trim()} className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default RealTimeChat;
