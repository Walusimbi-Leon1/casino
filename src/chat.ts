/**
 * In-memory chat state. The actual Firebase persistence is handled by firebase.ts.
 * This module just provides the UI-side helpers.
 */
import type { ChatMessage } from './types';

export type ChatCallback = (messages: ChatMessage[]) => void;

let messages: ChatMessage[] = [];
let callbacks: ChatCallback[] = [];

export function getMessages(): ChatMessage[] {
  return messages;
}

export function setMessages(
  msgs: ChatMessage[],
  append: boolean = false
): void {
  messages = append ? [...messages, ...msgs] : msgs;
  // Keep only the last 50
  if (messages.length > 50) {
    messages = messages.slice(messages.length - 50);
  }
  callbacks.forEach((cb) => cb([...messages]));
}

export function onMessages(cb: ChatCallback): () => void {
  callbacks.push(cb);
  return () => {
    callbacks = callbacks.filter((c) => c !== cb);
  };
}
