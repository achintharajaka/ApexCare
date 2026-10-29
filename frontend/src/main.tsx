import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './index.css';

// Configure remote API base URL when deployed to GitHub Pages with Vercel backend
const remoteApiUrl = import.meta.env.VITE_API_URL;
if (remoteApiUrl) {
  // Trim trailing slash if present
  axios.defaults.baseURL = remoteApiUrl.replace(/\/+$/, '');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
