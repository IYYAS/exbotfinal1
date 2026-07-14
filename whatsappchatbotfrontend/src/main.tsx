import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { DEFAULT_FONT } from './font';
import { setAccentColorVariables } from './utils/color';

const savedFont = localStorage.getItem('font-family');
if (savedFont) {
  document.documentElement.style.setProperty('--font-family', savedFont);
} else {
  document.documentElement.style.setProperty('--font-family', DEFAULT_FONT);
}

const savedAccent = localStorage.getItem('accent-color') || '#3b82f6';
setAccentColorVariables(savedAccent);

const savedTheme = localStorage.getItem('theme-mode');
const isDarkMode = savedTheme ? JSON.parse(savedTheme) : true;
if (!isDarkMode) {
  document.documentElement.classList.add('light-theme');
  document.body.classList.add('light-theme');
} else {
  document.documentElement.classList.remove('light-theme');
  document.body.classList.remove('light-theme');
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
