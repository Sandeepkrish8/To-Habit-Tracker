// src/main.jsx
// App entry point — wraps the app with Redux Provider and React Router.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import store from './app/store';
import App from './App.jsx';
import './index.css';

// As a Chrome extension the app is served from a file (index.html), so routes
// live in the URL hash (#/forest) and every new tab opens on the new tab view.
const isExtension = import.meta.env.MODE === 'extension';
if (isExtension && !window.location.hash) window.location.hash = '#/newtab';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      {isExtension
        ? <HashRouter><App /></HashRouter>
        : <BrowserRouter><App /></BrowserRouter>}
    </Provider>
  </StrictMode>,
);
