import { io } from 'socket.io-client';
import { BASE_URL } from './client';

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(BASE_URL, { transports: ['websocket'] });
  }
  return socket;
}
