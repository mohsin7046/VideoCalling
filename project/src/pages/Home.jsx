import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';


const Home = () => {
  const [emails, setEmails] = useState('');
  const navigate = useNavigate();

  const createMeeting = () => {
    const roomId = Math.random().toString(36).substr(2, 9);
    navigate(`/email-page/${roomId}`);
  };

 

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gray-100">
      <h1 className="text-4xl font-bold mb-8">Welcome to Video Conference Platform</h1>
      <div className="flex flex-col space-y-4">
    
        <button
          onClick={createMeeting}
          className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Create New Meeting
        </button>
      </div>
    </div>
  );
};

export default Home;
