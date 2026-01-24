import { Component } from 'solid-js';
import { Router, Routes, Route } from '@solidjs/router';
import Home from './routes/index';
import ProjectList from './routes/projects/index';
import ProjectDetail from './routes/projects/[id]';
import NotFound from './routes/404';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" component={Home} />
        <Route path="/projects" component={ProjectList} />
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="*" component={NotFound} />
      </Routes>
    </Router>
  );
}

export default App;
