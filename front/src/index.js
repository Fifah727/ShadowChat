import React from 'react';
import ReactDOM from 'react-dom/client'; // React 18
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { SocketProvider } from './context/SocketContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <SocketProvider>
    <App />
  </SocketProvider>
);

// Pas besoin de mettre à nouveau document.getElementById('root') ici !
reportWebVitals();
