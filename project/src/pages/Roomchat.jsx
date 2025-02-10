import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import './RoomChat.css';

const socket = io(process.env.REACT_APP_BACKEND_URL); // Update with your backend URL

const RoomChat = () => {
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Join room event
    socket.emit('join-chat-room', { roomId, userName });

    socket.on('receive-message', ({ message, userName }) => {
      setMessages((prevMessages) => [...prevMessages, { message, userName }]);
    });

    return () => {
      socket.emit('leave-chat-room', { roomId });
    };
  }, [roomId, userName]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;
    socket.emit('send-message', { message: newMessage, roomId, userName });
    setMessages((prev) => [...prev, { message: newMessage, userName: 'You' }]);
    setNewMessage('');
  };

  return (
    <div className="chat-container">
      <h3>Room Chat ({roomId})</h3>
      <div className="chat-box">
        {messages.map((msg, index) => (
          <div key={index} className="chat-message">
            <strong>{msg.userName}: </strong>{msg.message}
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="chat-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default RoomChat;
