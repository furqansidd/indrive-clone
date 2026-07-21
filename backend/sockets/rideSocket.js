module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Client joins rooms so it only receives relevant events
    socket.on('join:ride', (rideId) => socket.join(`ride:${rideId}`));
    socket.on('join:rider', (riderId) => socket.join(`rider:${riderId}`));
    socket.on('join:driver', (driverId) => socket.join(`driver:${driverId}`));

    // Driver streams live location while on a ride
    socket.on('driver:track', ({ rideId, coordinates }) => {
      socket.to(`ride:${rideId}`).emit('driver:track', { coordinates, at: Date.now() });
    });

    // In-app chat between rider and driver for a ride
    socket.on('ride:message', async ({ rideId, from, text }) => {
      try {
        const Message = require('../models/Message');
        const msg = await Message.create({ ride: rideId, from, text });
        io.to(`ride:${rideId}`).emit('ride:message', {
          _id: msg._id,
          ride: msg.ride,
          from: msg.from,
          text: msg.text,
          createdAt: msg.createdAt,
        });
      } catch (err) {
        console.error('Error saving socket message:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });
};
