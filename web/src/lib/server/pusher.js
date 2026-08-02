// DEPRECATED: This file is replaced by socketTrigger.js
// Kept for backward compatibility during migration
import { triggerEvent as socketTriggerEvent } from './socketTrigger.js';

// Legacy export for backward compatibility
export const triggerEvent = socketTriggerEvent;

// Pusher server is deprecated - returning null
export const pusherServer = null;