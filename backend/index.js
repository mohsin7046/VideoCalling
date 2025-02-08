import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

app.use(cors());
app.use(express.json());

const rooms = new Map();

const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.USER, 
    pass: process.env.PASS 
  }
});

app.post('/send-email', async (req, res) => {
  const { to, link } = req.body;

  if (!to || !link) {
    return res.status(400).json({ error: 'Email and link are required' });
  }

  try {
    await transporter.sendMail({
      from: process.env.USER, 
      to,
      subject: 'Meeting Invitation',
      text: `You have been invited to a meeting. Join using this link: ${link}`
    });

    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, userId }) => {
    console.log(`User ${userId} joining room ${roomId}`);
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(userId);
 
    socket.to(roomId).emit('user-joined', { userId, socketId: socket.id });
    
    const existingUsers = Array.from(rooms.get(roomId)).filter(id => id !== userId);
    console.log('Existing users in room:', existingUsers);
    socket.emit('existing-users', existingUsers);
  });

  socket.on('offer', ({ offer, to, from }) => {
    console.log(`Forwarding offer from ${from} to ${to}`);
    socket.to(to).emit('offer', { offer, from });
  });

  socket.on('answer', ({ answer, to, from }) => {
    console.log(`Forwarding answer from ${from} to ${to}`);
    socket.to(to).emit('answer', { answer, from });
  });

  socket.on('ice-candidate', ({ candidate, to, from }) => {
    console.log(`Forwarding ICE candidate from ${from} to ${to}`);
    socket.to(to).emit('ice-candidate', { candidate, from });
  });

  socket.on('leave-room', ({ roomId, userId }) => {
    handleUserLeaving(socket, roomId, userId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Find and leave all rooms this socket was in
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        handleUserLeaving(socket, roomId, socket.id);
      }
    });
  });
});

function handleUserLeaving(socket, roomId, userId) {
  console.log(`User ${userId} leaving room ${roomId}`);
  if (rooms.has(roomId)) {
    rooms.get(roomId).delete(userId);
    if (rooms.get(roomId).size === 0) {
      rooms.delete(roomId);
    }
  }
  socket.to(roomId).emit('user-left', { userId });
  socket.leave(roomId);
}

