import { EventEmitter } from 'events';
class TypedEventEmitter extends EventEmitter {}
export const events = new TypedEventEmitter();