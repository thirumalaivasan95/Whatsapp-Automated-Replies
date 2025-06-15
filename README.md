# WhatsApp Claude Auto-Responder Setup Guide

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v14 or higher)
- Claude API key from Anthropic
- WhatsApp account
- Windows PC with Chrome browser

### 2. Installation

Create a new folder and run:

```bash
npm init -y
npm install puppeteer node-fetch
```

### 3. Get Claude API Key

1. Go to [Anthropic Console](https://console.anthropic.com)
2. Create an account/login
3. Generate an API key
4. Copy the key (starts with `sk-ant-`)

### 4. Setup Instructions

1. **Save the bot code** as `whatsapp-bot.js`
2. **Replace API key** in the config section:
   ```javascript
   claudeApiKey: 'sk-ant-your-actual-key-here'
   ```
3. **Create package.json**:
   ```json
   {
     "name": "whatsapp-claude-bot",
     "version": "1.0.0",
     "description": "WhatsApp auto-responder with Claude AI",
     "main": "whatsapp-bot.js",
     "scripts": {
       "start": "node whatsapp-bot.js"
     },
     "dependencies": {
       "puppeteer": "^21.0.0",
       "node-fetch": "^2.6.7"
     }
   }
   ```

### 5. Running the Bot

```bash
node whatsapp-bot.js
```

**What happens:**
1. Chrome browser opens with WhatsApp Web
2. Scan QR code with your phone
3. Bot starts monitoring (auto-reply disabled initially)
4. After 15 seconds, auto-reply activates
5. Press `Ctrl+C` to stop

## ⚙️ Configuration Options

### Basic Settings
```javascript
const config = {
    claudeApiKey: 'your-key-here',
    autoReplyEnabled: false,    // Start in manual mode
    replyDelay: 3000,          // 3 second delay before replying
};
```

### Advanced Customization

**Change reply delay:**
```javascript
bot.setReplyDelay(5000); // 5 seconds
```

**Enable/disable on the fly:**
```javascript
bot.enableAutoReply();   // Turn on
bot.disableAutoReply();  // Turn off
```

## 🔧 How It Works

### Message Detection Flow
1. **Monitors** WhatsApp Web every 3 seconds
2. **Detects** unread message indicators
3. **Clicks** on unread chats
4. **Extracts** message content and sender info
5. **Checks** if message is new (not processed before)

### AI Response Generation
1. **Builds context** from recent conversation
2. **Sends to Claude** with contact name and message
3. **Gets intelligent response** (1-2 sentences max)
4. **Types and sends** reply automatically

### Context Management
- Keeps last 5 messages per contact
- Builds conversation history for better responses
- Handles multiple contacts simultaneously

## 🛡️ Safety Features

### Built-in Safeguards
- **Manual mode by default** - won't auto-reply until you enable it
- **Delay before replying** - looks more natural
- **Fallback responses** - if Claude API fails
- **Message deduplication** - won't reply to same message twice
- **Graceful shutdown** - Ctrl+C stops cleanly

### Privacy Considerations
- **Local processing** - runs on your PC
- **No message storage** - only keeps recent context in memory
- **Your API key** - direct connection to Claude, no middleman

## 🚨 Important Warnings

### Legal & Ethical
- ⚠️ **Get consent** from contacts about automated responses
- ⚠️ **Be transparent** that an AI is responding
- ⚠️ **Check local laws** about automated messaging
- ⚠️ **Use responsibly** - don't spam or harass

### Technical Limitations
- **WhatsApp detection** - they actively block bots
- **UI changes** - WhatsApp updates can break the bot
- **Rate limits** - Claude API has usage limits
- **Internet required** - needs connection for AI responses

## 🔍 Troubleshooting

### Common Issues

**1. QR Code won't scan**
- Make sure WhatsApp Web works normally in your browser
- Try refreshing and scanning again
- Check if WhatsApp is updated on your phone

**2. Bot not detecting messages**
- WhatsApp might have changed their HTML structure
- Check browser console for errors
- Try restarting the bot

**3. Claude API errors**
- Verify your API key is correct
- Check if you have credits/quota remaining
- Test API key with a simple curl request

**4. Messages not sending**
- WhatsApp might have detected automation
- Try increasing reply delay
- Check if message input box selector changed

### Debug Mode
Add this to see what's happening:
```javascript
// Add to initialization
console.log('Debug mode enabled');
```

## 📝 Example Conversations

**Scenario 1:**
- **Friend:** "How are you?"
- **Claude:** "I'm doing well, thanks for asking! How's your day going?"

**Scenario 2:**
- **Colleague:** "Can you send me the report?"
- **Claude:** "I'll get that to you shortly. Let me check and send it over."

**Scenario 3:**
- **Family:** "Are you coming for dinner?"
- **Claude:** "Thanks for the invite! Let me confirm and get back to you."

## 🔄 Updates & Maintenance

### Regular Maintenance
- **Monitor WhatsApp changes** - UI updates can break functionality
- **Update dependencies** - keep Puppeteer current
- **Check Claude pricing** - monitor API usage costs
- **Review conversations** - ensure responses are appropriate

### Extending Functionality
- Add **keyword-based rules** for specific responses
- Implement **contact-specific behaviors**
- Add **message scheduling** features
- Include **file/image handling**

## 🆘 Support

If you run into issues:
1. Check the troubleshooting section above
2. Verify all prerequisites are met
3. Test each component individually
4. Check GitHub issues for similar problems

Remember: This is for educational/personal use. Use responsibly and respect others' privacy!