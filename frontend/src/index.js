import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter, useLocation } from 'react-router-dom';
import App from './App';
import theme from './theme';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// Support both CRA (#root) and port 5000 standalone (#app) root element IDs.
const rootElement = document.getElementById('root') || document.getElementById('app');

if (!rootElement) {
  throw new Error('Cannot find root element. Expected #root or #app in index.html');
}

// Remove any aria-hidden that MUI or tooling may add to root element.
rootElement.removeAttribute('aria-hidden');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
