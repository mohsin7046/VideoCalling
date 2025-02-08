import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhone, FaLink, FaPaperPlane } from 'react-icons/fa';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_PORT);

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [email, setEmail] = useState('');
  const localVideoRef = useRef();
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const peerConnections = useRef(new Map());
  const localStreamRef = useRef(null);

  const createPeerConnection = (userId, stream) => {
    const peerConnection = new RTCPeerConnection(configuration);
    peerConnections.current.set(userId, peerConnection);

    stream.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream);
    });

    peerConnection.ontrack = (event) => {
      setRemoteStreams(prev => new Map(prev).set(userId, event.streams[0]));
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: userId,
          from: socket.id,
        });
      }
    };

    return peerConnection;
  };

  useEffect(() => {
    const startCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        socket.emit('join-room', { roomId, userId: socket.id });

        socket.on('existing-users', async (existingUsers) => {
          for (const userId of existingUsers) {
            const peerConnection = createPeerConnection(userId, stream);
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit('offer', { offer, to: userId, from: socket.id });
          }
        });

        socket.on('user-joined', ({ socketId }) => {
          createPeerConnection(socketId, stream);
        });

        socket.on('offer', async ({ offer, from }) => {
          let peerConnection = peerConnections.current.get(from);

          if (!peerConnection) {
            peerConnection = createPeerConnection(from, localStreamRef.current);
          }

          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.emit('answer', { answer, to: from, from: socket.id });
        });

        socket.on('answer', async ({ answer, from }) => {
          const peerConnection = peerConnections.current.get(from);
          if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          }
        });

        socket.on('ice-candidate', async ({ candidate, from }) => {
          const peerConnection = peerConnections.current.get(from);
          if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          }
        });

        socket.on('user-left', ({ userId }) => {
          const peerConnection = peerConnections.current.get(userId);
          if (peerConnection) {
            peerConnection.close();
            peerConnections.current.delete(userId);
          }
          setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.delete(userId);
            return newStreams;
          });
        });
      } catch (err) {
        console.error('Error accessing media devices:', err);
      }
    };

    startCall();

    return () => {
      socket.emit('leave-room', { roomId, userId: socket.id });
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      peerConnections.current.forEach(connection => connection.close());
    };
  }, [roomId]);

  const copyLink = () => {
    const meetingLink = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(meetingLink).then(() => {
      alert('Meeting link copied to clipboard!');
    });
  };

  const sendEmail = async () => {
    if (!email) {
      alert('Please enter an email address.');
      return;
    }

    const meetingLink = `${window.location.origin}/room/${roomId}`;
    try {
      await fetch(`${import.meta.env.VITE_PORT}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, link: meetingLink }),
      });
      alert('Meeting link sent successfully!');
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send meeting link.');
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  const endCall = () => {
    socket.emit('leave-room', { roomId, userId: socket.id });
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    peerConnections.current.forEach(connection => connection.close());
    navigate('/');
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-4 text-white bg-gray-800 px-2 py-1 rounded-md">
            You
          </div>
        </div>
        {Array.from(remoteStreams).map(([userId, stream]) => (
          <div key={userId} className="relative bg-black rounded-lg overflow-hidden">
            <video
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              ref={el => {
                if (el) el.srcObject = stream;
              }}
            />
            <div className="absolute bottom-4 left-4 text-white bg-gray-800 px-2 py-1 rounded-md">
              Participant
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-center space-x-4">
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-600'} hover:bg-opacity-80`}
          >
            {isMuted ? <FaMicrophoneSlash className="text-white" /> : <FaMicrophone className="text-white" />}
          </button>
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-600'} hover:bg-opacity-80`}
          >
            {isVideoOff ? <FaVideoSlash className="text-white" /> : <FaVideo className="text-white" />}
          </button>
          <button
            onClick={endCall}
            className="p-4 rounded-full bg-red-500 hover:bg-red-600"
          >
            <FaPhone className="text-white transform rotate-225" />
          </button>
        
        </div>
      </div>
    </div>
  );
};

export default Room;
