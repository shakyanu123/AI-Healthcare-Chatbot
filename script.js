// Global variables
let messageCount = 0;

// Add a new message to the chat
function addMessage(text, isUser) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ' + (isUser ? 'user' : 'bot');
    
    const time = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <div class="message-avatar ${isUser ? 'user-avatar' : 'bot-avatar'}">
            ${isUser ? '👤' : '🤖'}
        </div>
        <div class="message-content">
            ${text}
            <div style="font-size: 11px; color: #999; margin-top: 5px; text-align: right;">
                ${time}
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    messageCount++;
}

// Show typing indicator
function showTypingIndicator() {
    const typingMessage = document.querySelector('.typing-message');
    const typingIndicator = document.getElementById('typingIndicator');
    
    if (typingMessage && typingIndicator) {
        typingMessage.style.display = 'flex';
        typingIndicator.classList.add('active');
        
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Hide typing indicator
function hideTypingIndicator() {
    const typingMessage = document.querySelector('.typing-message');
    const typingIndicator = document.getElementById('typingIndicator');
    
    if (typingMessage && typingIndicator) {
        typingMessage.style.display = 'none';
        typingIndicator.classList.remove('active');
    }
}

// Hide welcome message and suggestions
function hideWelcome() {
    const welcome = document.getElementById('welcomeMessage');
    const suggestions = document.getElementById('suggestions');
    
    if (welcome) {
        welcome.style.display = 'none';
    }
    if (suggestions) {
        suggestions.style.display = 'none';
    }
}

// Send a message
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (message === '') {
        return;
    }
    
    // Hide welcome screen on first message
    hideWelcome();
    
    // Add user message
    addMessage(message, true);
    input.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    // Send message to Flask backend
    fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        hideTypingIndicator();
        if (data.success) {
            addMessage(data.response, false);
        } else {
            addMessage('Sorry, I encountered an error. Please try again.', false);
        }
    })
    .catch(function(error) {
        hideTypingIndicator();
        console.error('Error:', error);
        addMessage('Sorry, I could not connect to the server. Please make sure the Flask backend is running.', false);
    });
}

// Send a suggested question
function sendSuggestion(text) {
    hideWelcome();
    document.getElementById('messageInput').value = text;
    sendMessage();
}

// Handle Enter key press
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Clear chat
function clearChat() {
    const confirmed = confirm('Are you sure you want to clear the chat history?');
    
    if (confirmed) {
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = `
            <div class="message bot typing-message" style="display: none;">
                <div class="message-avatar bot-avatar">🤖</div>
                <div class="typing-indicator" id="typingIndicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        messageCount = 0;
        addMessage('Chat cleared! How can I help you today?', false);
    }
}

// Input field animations
document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('messageInput');
    const sendButton = document.querySelector('.send-button');
    
    if (input && sendButton) {
        input.addEventListener('input', function() {
            if (this.value.length > 0) {
                sendButton.style.transform = 'scale(1.1)';
            } else {
                sendButton.style.transform = 'scale(1)';
            }
        });
    }
});
