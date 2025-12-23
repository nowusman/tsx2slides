import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Expose React and ReactDOM to the window object so the 
// offline evaluator (Babel/eval) can access them.
(window as any).React = React;
(window as any).ReactDOM = ReactDOM;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
