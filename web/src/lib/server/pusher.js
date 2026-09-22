import { triggerEvent as socketTriggerEvent } from './socketTrigger.js';

// Expose a dummy pusherServer object that wraps socketTriggerEvent 
// so that existing `pusherServer.trigger` calls don't crash
export const pusherServer = {
    trigger: async (channel, event, data) => {
        return socketTriggerEvent(channel, event, data);
    }
};

export const triggerEvent = socketTriggerEvent;