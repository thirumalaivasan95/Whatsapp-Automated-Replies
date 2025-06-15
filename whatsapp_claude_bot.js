const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class WhatsAppClaudeBot {
    constructor(config) {
        this.claudeApiKey = config.claudeApiKey;
        this.autoReplyEnabled = config.autoReplyEnabled || false;
        this.replyDelay = config.replyDelay || 2000; // 2 seconds delay
        this.processedMessages = new Set();
        this.browser = null;
        this.page = null;
        this.lastMessageCount = 0;
        
        // Conversation context storage
        this.conversationHistory = new Map();
        this.maxHistoryLength = 5; // Keep last 5 messages per contact
    }

    async initialize() {
        console.log('🚀 Starting WhatsApp Claude Bot...');
        
        this.browser = await puppeteer.launch({
            headless: false, // Keep visible for QR code scanning
            defaultViewport: null,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });

        this.page = await this.browser.newPage();
        
        // Set user agent to avoid detection
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Navigate to WhatsApp Web
        await this.page.goto('https://web.whatsapp.com');
        
        console.log('📱 Please scan the QR code to login...');
        
        // Wait for login
        await this.waitForLogin();
        
        console.log('✅ Login successful! Starting message monitoring...');
        
        // Start monitoring
        this.startMessageMonitoring();
    }

    async waitForLogin() {
        try {
            // Wait for the main chat interface to load
            await this.page.waitForSelector('[data-testid="chat-list"]', { timeout: 60000 });
            console.log('✅ WhatsApp Web loaded successfully');
        } catch (error) {
            console.error('❌ Login timeout. Please try again.');
            throw error;
        }
    }

    async startMessageMonitoring() {
        console.log('👀 Monitoring for new messages...');
        
        setInterval(async () => {
            try {
                await this.checkForNewMessages();
            } catch (error) {
                console.error('Error checking messages:', error);
            }
        }, 3000); // Check every 3 seconds
    }

    async checkForNewMessages() {
        try {
            // Get all unread chats
            const unreadChats = await this.page.$$('[data-testid="cell-frame-container"] [data-testid="icon-unread"]');
            
            if (unreadChats.length > 0) {
                console.log(`📬 Found ${unreadChats.length} unread chat(s)`);
                
                for (let i = 0; i < unreadChats.length; i++) {
                    await this.processUnreadChat(i);
                    await this.delay(1000); // Wait between chats
                }
            }
        } catch (error) {
            console.error('Error in checkForNewMessages:', error);
        }
    }

    async processUnreadChat(chatIndex) {
        try {
            // Click on the first unread chat
            const unreadChats = await this.page.$$('[data-testid="cell-frame-container"] [data-testid="icon-unread"]');
            if (unreadChats[chatIndex]) {
                const chatContainer = await unreadChats[chatIndex].closest('[data-testid="cell-frame-container"]');
                await chatContainer.click();
                
                await this.delay(2000); // Wait for chat to load
                
                // Get chat info
                const chatInfo = await this.getChatInfo();
                if (!chatInfo) return;
                
                console.log(`💬 Processing chat with: ${chatInfo.contactName}`);
                
                // Get latest messages
                const messages = await this.getLatestMessages();
                
                if (messages.length > 0) {
                    const latestMessage = messages[messages.length - 1];
                    
                    // Check if this is a new message we haven't processed
                    const messageId = `${chatInfo.contactName}-${latestMessage.text}-${Date.now()}`;
                    
                    if (!this.processedMessages.has(messageId) && !latestMessage.isFromMe) {
                        this.processedMessages.add(messageId);
                        
                        console.log(`📝 New message from ${chatInfo.contactName}: "${latestMessage.text}"`);
                        
                        if (this.autoReplyEnabled) {
                            await this.generateAndSendReply(chatInfo.contactName, latestMessage.text, messages);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error processing unread chat:', error);
        }
    }

    async getChatInfo() {
        try {
            // Get contact name from header
            const contactNameElement = await this.page.$('[data-testid="conversation-header"] span[title]');
            const contactName = contactNameElement ? await contactNameElement.evaluate(el => el.textContent) : 'Unknown';
            
            return { contactName };
        } catch (error) {
            console.error('Error getting chat info:', error);
            return null;
        }
    }

    async getLatestMessages() {
        try {
            const messages = [];
            
            // Get all message elements
            const messageElements = await this.page.$$('[data-testid="msg-container"]');
            
            // Get last 3 messages for context
            const recentMessages = messageElements.slice(-3);
            
            for (const msgElement of recentMessages) {
                try {
                    // Check if message is from me or from contact
                    const isFromMe = await msgElement.$('.message-out') !== null;
                    
                    // Get message text
                    const textElement = await msgElement.$('span.selectable-text');
                    const text = textElement ? await textElement.evaluate(el => el.textContent) : '';
                    
                    if (text.trim()) {
                        messages.push({
                            text: text.trim(),
                            isFromMe,
                            timestamp: Date.now()
                        });
                    }
                } catch (msgError) {
                    // Skip problematic messages
                    continue;
                }
            }
            
            return messages;
        } catch (error) {
            console.error('Error getting messages:', error);
            return [];
        }
    }

    async generateAndSendReply(contactName, messageText, conversationHistory) {
        try {
            console.log(`🤖 Generating reply for: "${messageText}"`);
            
            // Build context from conversation history
            const context = this.buildConversationContext(contactName, conversationHistory);
            
            const response = await this.callClaudeAPI(messageText, context, contactName);
            
            if (response) {
                console.log(`💭 Claude suggests: "${response}"`);
                await this.sendMessage(response);
                
                // Update conversation history
                this.updateConversationHistory(contactName, messageText, response);
            }
        } catch (error) {
            console.error('Error generating reply:', error);
        }
    }

    buildConversationContext(contactName, messages) {
        let context = `You are responding to WhatsApp messages from ${contactName}. `;
        context += `Keep responses natural, friendly, and conversational. `;
        context += `Recent conversation:\n`;
        
        messages.forEach(msg => {
            const sender = msg.isFromMe ? 'You' : contactName;
            context += `${sender}: ${msg.text}\n`;
        });
        
        return context;
    }

    async callClaudeAPI(message, context, contactName) {
        try {
            const prompt = `${context}\n\nNow ${contactName} just sent: "${message}"\n\nRespond naturally and appropriately (keep it brief, 1-2 sentences max):`;
            
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.claudeApiKey}`,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: 150,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`Claude API error: ${response.status}`);
            }

            const data = await response.json();
            return data.content[0].text.trim();
            
        } catch (error) {
            console.error('Claude API error:', error);
            
            // Fallback responses
            const fallbacks = [
                "Thanks for your message! I'll get back to you soon.",
                "Got it! Let me think about that.",
                "Interesting! Tell me more.",
                "I see what you mean.",
                "That's a good point!"
            ];
            
            return fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }
    }

    async sendMessage(text) {
        try {
            await this.delay(this.replyDelay);
            
            // Find message input box
            const messageBox = await this.page.$('[data-testid="conversation-compose-box-input"]');
            
            if (messageBox) {
                // Clear existing text and type new message
                await messageBox.click();
                await messageBox.evaluate(el => el.textContent = '');
                await messageBox.type(text);
                
                await this.delay(500);
                
                // Send message
                const sendButton = await this.page.$('[data-testid="send"]');
                if (sendButton) {
                    await sendButton.click();
                    console.log(`✅ Sent reply: "${text}"`);
                } else {
                    // Alternative: Press Enter
                    await messageBox.press('Enter');
                    console.log(`✅ Sent reply: "${text}"`);
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    updateConversationHistory(contactName, incomingMessage, response) {
        if (!this.conversationHistory.has(contactName)) {
            this.conversationHistory.set(contactName, []);
        }
        
        const history = this.conversationHistory.get(contactName);
        
        // Add both messages to history
        history.push({ text: incomingMessage, isFromMe: false, timestamp: Date.now() });
        history.push({ text: response, isFromMe: true, timestamp: Date.now() });
        
        // Keep only recent messages
        if (history.length > this.maxHistoryLength * 2) {
            history.splice(0, history.length - this.maxHistoryLength * 2);
        }
        
        this.conversationHistory.set(contactName, history);
    }

    // Control methods
    enableAutoReply() {
        this.autoReplyEnabled = true;
        console.log('🟢 Auto-reply enabled');
    }

    disableAutoReply() {
        this.autoReplyEnabled = false;
        console.log('🔴 Auto-reply disabled');
    }

    setReplyDelay(milliseconds) {
        this.replyDelay = milliseconds;
        console.log(`⏱️ Reply delay set to ${milliseconds}ms`);
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('👋 Bot stopped');
        }
    }
}

// Usage example
async function main() {
    const config = {
        claudeApiKey: 'your-claude-api-key-here', // Replace with your actual API key
        autoReplyEnabled: false, // Start with manual mode
        replyDelay: 3000 // 3 second delay before replying
    };

    const bot = new WhatsAppClaudeBot(config);
    
    try {
        await bot.initialize();
        
        // Enable auto-reply after 10 seconds (gives you time to disable if needed)
        setTimeout(() => {
            console.log('🟢 Enabling auto-reply in 10 seconds... Type Ctrl+C to cancel');
            setTimeout(() => {
                bot.enableAutoReply();
            }, 10000);
        }, 5000);
        
    } catch (error) {
        console.error('Failed to start bot:', error);
        await bot.close();
    }
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down bot...');
        await bot.close();
        process.exit(0);
    });
}

// Uncomment to run
// main();

module.exports = WhatsAppClaudeBot;