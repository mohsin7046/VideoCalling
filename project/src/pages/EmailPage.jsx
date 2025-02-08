import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPaperPlane, FaLink } from 'react-icons/fa';

const EmailPage = () => {
  const { roomId } = useParams();
  const [emails, setEmails] = useState('');
  const navigate = useNavigate();

  const sendEmails = async () => {
    const emailList = emails.split(',').map(email => email.trim()).filter(Boolean);
    if (emailList.length === 0) {
      alert('Please enter at least one valid email address.');
      return;
    }

    const meetingLink = `${window.location.origin}/room/${roomId}`;

    try {
      await fetch(`${import.meta.env.VITE_PORT}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailList, link: meetingLink }),
      });
      alert('Emails sent successfully!');
      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error('Error sending emails:', error);
      alert('Failed to send emails. Please try again.');
    }
  };

  const copyLink = () => {
    const meetingLink = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(meetingLink).then(() => {
      alert('Meeting link copied to clipboard!');
    });
  };

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gray-100">
      <h1 className="text-3xl font-semibold mb-6">Invite Participants for Room {roomId}</h1>
      <textarea
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
        placeholder="Enter comma-separated email addresses"
        className="w-2/3 p-3 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 mb-4"
        rows="5"
      />
      <div className="flex space-x-4">
        <button
          onClick={sendEmails}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
        >
          <FaPaperPlane /> <span>Send Invitations</span>
        </button>
        <button
          onClick={() => navigate(`/room/${roomId}`)}
          className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Skip
        </button>
        <button
          onClick={copyLink}
          className="p-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
        >
          <FaLink /> <span>Copy Meeting Link</span>
        </button>
      </div>
    </div>
  );
};

export default EmailPage;
