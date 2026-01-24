import { Component } from 'solid-js';
import { Router, Route } from '@solidjs/router';
import { AppProvider } from './contexts/AppContext';
import { ChatProvider } from './contexts/ChatContext';
import { createChatApi } from './services/api/chat-api';
import Home from './routes/index';
import ProjectList from './routes/projects/index';
import ProjectDetail from './routes/projects/[id]';
import ChatRoute from './routes/chat/[id]';
import NotFound from './routes/404';

// 创建 Chat API 实例
const chatApi = createChatApi();

function App() {
  return (
    <AppProvider>
      <ChatProvider api={chatApi}>
        <Router>
          <Route path="/" component={Home} />
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
