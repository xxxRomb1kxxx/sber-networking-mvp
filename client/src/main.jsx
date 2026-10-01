import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { takeover } from '@backend';
import App from './App.jsx';
import { SessionProvider } from './store.jsx';
import './styles.css';

// Базовый путь не пустой при публикации в подпапке, например на GitHub Pages.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

if (!takeover) createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </BrowserRouter>
  </React.StrictMode>
);
