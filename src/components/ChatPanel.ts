// ─── CHAT PANEL ─────────────────────────────────────────────────────
// Renders messages, typing indicator, and handles message formatting

import type { ChatMessage } from '../config/framework';

export function renderMessage(container: HTMLElement, msg: ChatMessage, onAction: (text: string) => void): void {
  const div = document.createElement('div');
  div.className = `message ${msg.role}`;

  const senderLabel = msg.role === 'agent' ? 'Brandy — Brand Strategist' : 'You';
  let bubbleContent = `<div class="message-sender">${senderLabel}</div>`;
  bubbleContent += `<div>${formatMessage(msg.content)}</div>`;

  if (msg.quickActions?.length) {
    bubbleContent += `<div class="quick-actions">`;
    msg.quickActions.forEach(action => {
      bubbleContent += `<button class="quick-action-btn" data-action="${action}">${action}</button>`;
    });
    bubbleContent += `</div>`;
  }

  div.innerHTML = `<div class="message-bubble">${bubbleContent}</div>`;
  container.appendChild(div);

  div.querySelectorAll('.quick-action-btn').forEach(btn => {
    (btn as HTMLElement).addEventListener('click', () => {
      onAction((btn as HTMLElement).dataset.action || '');
    });
  });

  container.scrollTop = container.scrollHeight;
}

export function formatMessage(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
    .replace(/^- (.*)/gm, '• $1');
}

export function showTyping(container: HTMLElement): void {
  const div = document.createElement('div');
  div.className = 'message agent';
  div.id = 'typing-indicator';
  div.innerHTML = `<div class="message-bubble"><div class="message-sender">Brandy — Brand Strategist</div><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

export function removeTyping(): void {
  document.getElementById('typing-indicator')?.remove();
}
