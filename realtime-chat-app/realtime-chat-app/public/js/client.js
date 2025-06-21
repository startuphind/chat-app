// client.js
class ChatApp {
    constructor() {
        this.socket = null;
        this.username = '';
        this.isTyping = false;
        this.typingTimer = null;
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        // Modal elements
        this.usernameModal = document.getElementById('username-modal');
        this.usernameForm = document.getElementById('username-form');
        this.usernameInput = document.getElementById('username-input');

        // Chat elements
        this.chatContainer = document.getElementById('chat-container');
        this.messagesContainer = document.getElementById('messages-container');
        this.messageForm = document.getElementById('message-form');
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.leaveBtn = document.getElementById('leave-chat');

        // UI elements
        this.usersList = document.getElementById('users-list');
        this.onlineCount = document.getElementById('online-count');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.typingText = document.getElementById('typing-text');
    }

    setupEventListeners() {
        // Username form submission
        this.usernameForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.joinChat();
        });

        // Message form submission
        this.messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Typing detection
        this.messageInput.addEventListener('input', () => {
            this.handleTyping();
        });

        this.messageInput.addEventListener('keyup', () => {
            this.handleStopTyping();
        });

        // Leave chat
        this.leaveBtn.addEventListener('click', () => {
            this.leaveChat();
        });

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            if (this.socket) {
                this.socket.disconnect();
            }
        });
    }

    joinChat() {
        const username = this.usernameInput.value.trim();
        
        if (username.length < 2) {
            this.showError('Username must be at least 2 characters long');
            return;
        }

        if (username.length > 20) {
            this.showError('Username must be less than 20 characters');
            return;
        }

        this.username = username;
        this.initializeSocket();
        this.hideModal();
        this.showChat();
    }

    initializeSocket() {
        this.socket = io();

        // Connection established
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.socket.emit('user-joined', this.username);
        });

        // User events
        this.socket.on('user-connected', (data) => {
            this.addSystemMessage(`${data.username} joined the chat`);
        });

        this.socket.on('user-disconnected', (data) => {
            this.addSystemMessage(`${data.username} left the chat`);
            this.removeUserFromList(data.userId);
        });

        this.socket.on('users-list', (users) => {
            this.updateUsersList(users);
        });

        // Message events
        this.socket.on('message-received', (data) => {
            this.addMessage(data);
        });

        // Typing events
        this.socket.on('user-typing', (data) => {
            this.showTypingIndicator(data.username);
        });

        this.socket.on('user-stopped-typing', (data) => {
            this.hideTypingIndicator();
        });

        // Connection events
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.addSystemMessage('Connection lost. Trying to reconnect...');
        });

        this.socket.on('reconnect', () => {
            console.log('Reconnected to server');
            this.addSystemMessage('Reconnected to server');
            this.socket.emit('user-joined', this.username);
        });
    }

    sendMessage() {
        const message = this.messageInput.value.trim();
        
        if (!message) return;

        if (message.length > 500) {
            this.showError('Message is too long (max 500 characters)');
            return;
        }

        this.socket.emit('chat-message', { message });
        this.messageInput.value = '';
        this.messageInput.focus();
    }

    addMessage(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${data.userId === this.socket?.id ? 'own-message' : ''}`;

        const timestamp = new Date(data.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-author">${this.escapeHtml(data.username)}</span>
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-content">
                ${this.escapeHtml(data.message)}
            </div>
        `;

        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addSystemMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.textContent = message;

        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    handleTyping() {
        if (!this.isTyping) {
            this.isTyping = true;
            this.socket.emit('typing-start');
        }

        clearTimeout(this.typingTimer);
        this.typingTimer = setTimeout(() => {
            this.handleStopTyping();
        }, 2000);
    }

    handleStopTyping() {
        if (this.isTyping) {
            this.isTyping = false;
            this.socket.emit('typing-stop');
        }
        clearTimeout(this.typingTimer);
    }

    showTypingIndicator(username) {
        this.typingText.textContent = `${username} is typing`;
        this.typingIndicator.classList.remove('hidden');
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.typingIndicator.classList.add('hidden');
    }

    updateUsersList(users) {
        this.usersList.innerHTML = '';
        
        users.forEach(user => {
            const userItem = document.createElement('li');
            userItem.className = 'user-item';
            userItem.innerHTML = `
                <i class="fas fa-circle"></i>
                ${this.escapeHtml(user.username)}
                ${user.id === this.socket?.id ? ' (You)' : ''}
            `;
            this.usersList.appendChild(userItem);
        });

        this.onlineCount.textContent = `${users.length} user${users.length !== 1 ? 's' : ''} online`;
    }

    removeUserFromList(userId) {
        // This will be updated when we receive the new users list
        // No need to manually remove as the server sends updated list
    }

    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }

    hideModal() {
        this.usernameModal.classList.add('hidden');
    }

    showChat() {
        this.chatContainer.classList.remove('hidden');
        this.messageInput.focus();
    }

    leaveChat() {
        if (this.socket) {
            this.socket.disconnect();
        }
        
        this.chatContainer.classList.add('hidden');
        this.usernameModal.classList.remove('hidden');
        this.usernameInput.value = '';
        this.messagesContainer.innerHTML = '';
        this.usersList.innerHTML = '';
        this.username = '';
    }

    showError(message) {
        // Simple error display - you can enhance this
        alert(message);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the chat app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});