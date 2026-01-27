import { Component } from 'solid-js';
import { Router, Route } from '@solidjs/router';
import { AppProvider } from './contexts/AppContext';
import { ChatProvider } from './contexts/ChatContext';
import { createChatApi } from './services/api/chat-api';
import { WebSocketClient } from './services/sync/websocket';
import Home from './routes/index';
import SessionsList from './routes/sessions/index';
import ProjectList from './routes/projects/index';
import ProjectDetail from './routes/projects/[id]';
import ChatRoute from './routes/chat/[id]';
import NotFound from './routes/404';

// 创建 Chat API 实例
const chatApi = createChatApi();

// 创建 WebSocket 客户端实例(可选)
// 在开发模式下,使用开发令牌简化测试
const wsClient = new WebSocketClient({
  url: `${process.env.WS_URL || 'ws://localhost:3002'}?token=valid.jwt.token`,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
});

function App() {
  return (
    <AppProvider>
      <ChatProvider api={chatApi} wsClient={wsClient}>
        <Router>
          <Route path="/" component={Home} />
          <Route path="/sessions" component={SessionsList} />
          <Route path="/projects" component={ProjectList} />
          <Route path="/projects/:id" component={ProjectDetail} />
          <Route path="/chat/:id" component={ChatRoute} />
          <Route path="*" component={NotFound} />
        </Router>
      </ChatProvider>
    </AppProvider>
  );
}

export default App;
