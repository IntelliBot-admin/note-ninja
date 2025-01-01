import { initializeIcons } from '@fluentui/react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import TaskPane from './TaskPane';

/* Initialize FluentUI icons */
initializeIcons();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <TaskPane />
  </React.StrictMode>
);