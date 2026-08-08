// ========== app.js ==========
(function() {
    'use strict';

    // ========== 模拟后端数据库 ==========
    const DB = {
        // 获取存储的数据
        get(key) {
            try {
                const data = localStorage.getItem('chat_' + key);
                return data ? JSON.parse(data) : null;
            } catch {
                return null;
            }
        },

        // 存储数据
        set(key, value) {
            localStorage.setItem('chat_' + key, JSON.stringify(value));
        },

        // 删除数据
        remove(key) {
            localStorage.removeItem('chat_' + key);
        }
    };

    // ========== 模拟后端 API ==========
    const API = {
        // 登录
        async login(username, password) {
            await simulateDelay(300);
            const users = DB.get('users') || {};
            
            if (!users[username]) {
                users[username] = {
                    username,
                    password,
                    createdAt: Date.now(),
                    avatar: getRandomAvatar()
                };
                DB.set('users', users);
            }
            
            const session = {
                username,
                token: generateToken(),
                loginAt: Date.now()
            };
            DB.set('session', session);
            
            return { success: true, data: session };
        },

        // 获取当前会话
        getSession() {
            return DB.get('session');
        },

        // 登出
        async logout() {
            await simulateDelay(200);
            DB.remove('session');
            return { success: true };
        },

        // 发送消息
        async sendMessage(content, username) {
            await simulateDelay(150);
            const messages = DB.get('messages') || [];
            const message = {
                id: generateId(),
                content: content.trim(),
                author: username,
                timestamp: Date.now(),
                avatar: getUserAvatar(username)
            };
            messages.push(message);
            // 只保留最近200条
            if (messages.length > 200) {
                messages.shift();
            }
            DB.set('messages', messages);
            return { success: true, data: message };
        },

        // 获取消息
        async getMessages() {
            await simulateDelay(100);
            return { success: true, data: DB.get('messages') || [] };
        },

        // 清空消息
        async clearMessages() {
            await simulateDelay(200);
            DB.set('messages', []);
            return { success: true };
        },

        // 获取在线用户（模拟）
        async getOnlineUsers() {
            await simulateDelay(100);
            const users = DB.get('users') || {};
            const session = DB.get('session');
            const onlineUsers = [];
            
            // 添加当前用户
            if (session) {
                onlineUsers.push({
                    username: session.username,
                    avatar: getUserAvatar(session.username),
                    isSelf: true
                });
            }
            
            // 模拟一些其他在线用户
            const botNames = ['小明', '小红', '阿杰', 'Lisa', 'Tom'];
            const shuffled = botNames.sort(() => 0.5 - Math.random());
            const count = Math.floor(Math.random() * 3) + 1;
            
            for (let i = 0; i < count; i++) {
                const name = shuffled[i];
                if (name !== session?.username) {
                    onlineUsers.push({
                        username: name,
                        avatar: getUserAvatar(name),
                        isSelf: false
                    });
                }
            }
            
            return { success: true, data: onlineUsers };
        }
    };

    // ========== 工具函数 ==========
    function simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function generateToken() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    }

    function getRandomAvatar() {
        const avatars = ['👤', '😀', '😎', '🤓', '🧑', '👩', '👨', '🧑‍💻', '👩‍💻', '👨‍💻', '🦊', '🐱', '🐶', '🐼', '🐨', '🦁', '🐯', '🦄'];
        return avatars[Math.floor(Math.random() * avatars.length)];
    }

    function getUserAvatar(username) {
        const users = DB.get('users') || {};
        return users[username]?.avatar || getRandomAvatar();
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        if (isToday) {
            return `${hours}:${minutes}`;
        }
        return `${date.getMonth() + 1}/${date.getDate()} ${hours}:${minutes}`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ========== DOM 元素 ==========
    const loginScreen = document.getElementById('login-screen');
    const chatScreen = document.getElementById('chat-screen');
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const currentUsername = document.getElementById('current-username');
    const currentAvatar = document.getElementById('current-avatar');
    const messagesArea = document.getElementById('messages-area');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const clearChatBtn = document.getElementById('clear-chat');
    const usersList = document.getElementById('users-list');
    const onlineCount = document.getElementById('online-count');
    const welcomeTime = document.getElementById('welcome-time');

    // ========== 状态 ==========
    let currentUser = null;
    let isLoading = false;

    // ========== 初始化 ==========
    function init() {
        // 设置欢迎时间
        welcomeTime.textContent = formatTime(Date.now());
        
        // 检查是否已登录
        const session = API.getSession();
        if (session) {
            currentUser = session.username;
            enterChatRoom();
        }

        // 绑定事件
        loginForm.addEventListener('submit', handleLogin);
        sendBtn.addEventListener('click', handleSend);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });
        logoutBtn.addEventListener('click', handleLogout);
        clearChatBtn.addEventListener('click', handleClearChat);
        
        // 自动聚焦
        usernameInput.focus();
    }

    // ========== 登录处理 ==========
    async function handleLogin(e) {
        e.preventDefault();
        if (isLoading) return;

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            showToast('请填写用户名和密码');
            return;
        }

        if (username.length > 20) {
            showToast('用户名不能超过20个字符');
            return;
        }

        isLoading = true;
        const btn = loginForm.querySelector('.btn-login');
        btn.textContent = '登录中...';
        btn.disabled = true;

        try {
            const result = await API.login(username, password);
            if (result.success) {
                currentUser = username;
                enterChatRoom();
            }
        } catch (err) {
            showToast('登录失败，请重试');
        } finally {
            isLoading = false;
            btn.textContent = '进入聊天室';
            btn.disabled = false;
        }
    }

    // ========== 进入聊天室 ==========
    async function enterChatRoom() {
        loginScreen.classList.remove('active');
        chatScreen.classList.add('active');
        
        currentUsername.textContent = currentUser;
        currentAvatar.textContent = getUserAvatar(currentUser);
        
        // 加载历史消息
        await loadMessages();
        
        // 加载在线用户
        await loadOnlineUsers();
        
        // 添加系统欢迎消息
        addSystemMessage(`${currentUser} 加入了聊天室`);
        
        // 聚焦输入框
        messageInput.focus();
        
        // 模拟其他用户发送消息
        simulateBotMessages();
    }

    // ========== 加载消息 ==========
    async function loadMessages() {
        const result = await API.getMessages();
        if (result.success) {
            messagesArea.innerHTML = '';
            
            // 添加欢迎消息
            const welcomeDiv = document.createElement('div');
            welcomeDiv.className = 'system-message';
            welcomeDiv.innerHTML = `
                <span class="sys-time">${formatTime(Date.now())}</span>
                <span class="sys-text">欢迎进入公共聊天室！开始聊天吧～</span>
            `;
            messagesArea.appendChild(welcomeDiv);
            
            // 添加历史消息
            result.data.forEach(msg => {
                appendMessage(msg);
            });
            
            scrollToBottom();
        }
    }

    // ========== 加载在线用户 ==========
    async function loadOnlineUsers() {
        const result = await API.getOnlineUsers();
        if (result.success) {
            renderUsersList(result.data);
        }
    }

    // ========== 渲染用户列表 ==========
    function renderUsersList(users) {
        usersList.innerHTML = '';
        onlineCount.textContent = users.length;
        
        users.forEach(user => {
            const li = document.createElement('li');
            li.className = 'user-item' + (user.isSelf ? ' active' : '');
            li.innerHTML = `
                <span class="user-avatar">${user.avatar}</span>
                <span class="user-name">${escapeHtml(user.username)}${user.isSelf ? ' (你)' : ''}</span>
                <span class="user-status online"></span>
            `;
            usersList.appendChild(li);
        });
    }

    // ========== 发送消息 ==========
    async function handleSend() {
        const content = messageInput.value.trim();
        if (!content || isLoading) return;

        isLoading = true;
        messageInput.value = '';
        messageInput.disabled = true;
        sendBtn.disabled = true;

        try {
            const result = await API.sendMessage(content, currentUser);
            if (result.success) {
                appendMessage(result.data, true);
                scrollToBottom();
            }
        } catch (err) {
            showToast('发送失败');
        } finally {
            isLoading = false;
            messageInput.disabled = false;
            sendBtn.disabled = false;
            messageInput.focus();
        }
    }

    // ========== 追加消息到界面 ==========
    function appendMessage(msg, isNew = false) {
        const isOwn = msg.author === currentUser;
        const messageEl = document.createElement('div');
        messageEl.className = 'message' + (isOwn ? ' own' : '');
        messageEl.innerHTML = `
            <div class="message-avatar">${msg.avatar || '👤'}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${escapeHtml(msg.author)}</span>
                    <span class="message-time">${formatTime(msg.timestamp)}</span>
                </div>
                <div class="message-bubble">${escapeHtml(msg.content)}</div>
            </div>
        `;
        messagesArea.appendChild(messageEl);
        
        if (isNew) {
            scrollToBottom();
        }
    }

    // ========== 添加系统消息 ==========
    function addSystemMessage(text) {
        const div = document.createElement('div');
        div.className = 'system-message';
        div.innerHTML = `
            <span class="sys-time">${formatTime(Date.now())}</span>
            <span class="sys-text">${escapeHtml(text)}</span>
        `;
        messagesArea.appendChild(div);
        scrollToBottom();
    }

    // ========== 滚动到底部 ==========
    function scrollToBottom() {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    // ========== 登出 ==========
    async function handleLogout() {
        if (isLoading) return;
        isLoading = true;
        
        try {
            await API.logout();
            currentUser = null;
            loginScreen.classList.add('active');
            chatScreen.classList.remove('active');
            usernameInput.value = '';
            passwordInput.value = '';
            usernameInput.focus();
        } catch (err) {
            showToast('退出失败');
        } finally {
            isLoading = false;
        }
    }

    // ========== 清空聊天记录 ==========
    async function handleClearChat() {
        if (!confirm('确定要清空所有聊天记录吗？')) return;
        
        try {
            await API.clearMessages();
            messagesArea.innerHTML = '';
            addSystemMessage('聊天记录已清空');
        } catch (err) {
            showToast('清空失败');
        }
    }

    // ========== 模拟机器人消息 ==========
    function simulateBotMessages() {
        const botResponses = [
            '大家好！👋',
            '今天天气不错呢 ☀️',
            '有人在线吗？',
            '这个聊天室真不错 😊',
            '刚刚在忙，现在回来了',
            '哈哈，确实',
            '有人推荐好看的电影吗？🎬',
            '晚上好呀！🌙',
            '测试一下消息功能',
            '666',
            '厉害了',
            '收到！'
        ];
        
        const botNames = ['小明', '小红', '阿杰', 'Lisa', 'Tom'];
        
        // 随机发送机器人消息
        setInterval(() => {
            if (Math.random() > 0.85) {
                const name = botNames[Math.floor(Math.random() * botNames.length)];
                const content = botResponses[Math.floor(Math.random() * botResponses.length)];
                
                API.sendMessage(content, name).then(result => {
                    if (result.success && chatScreen.classList.contains('active')) {
                        appendMessage(result.data, true);
                    }
                });
            }
        }, 8000);
        
        // 定期刷新在线用户列表
        setInterval(() => {
            if (chatScreen.classList.contains('active')) {
                loadOnlineUsers();
            }
        }, 15000);
    }

    // ========== Toast 提示 ==========
    function showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-card);
            color: var(--text-primary);
            padding: 12px 24px;
            border-radius: 12px;
            border: 1px solid var(--border);
            box-shadow: var(--shadow-lg);
            z-index: 9999;
            font-size: 14px;
            animation: slideDown 0.3s ease-out;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // ========== 启动 ==========
    init();

})();
