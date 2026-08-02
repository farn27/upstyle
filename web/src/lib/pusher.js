// DEPRECATED: This file is replaced by socket.js
// Kept for backward compatibility during migration
export const getPusherClient = () => {
    console.warn('[DEPRECATED] getPusherClient is deprecated, use getSocketClient from socket.js instead');
    return null;
};