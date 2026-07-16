import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import { API_BASE } from './apiConfig'
import './index.css'
import App from './App.jsx'

// Set the base URL for ALL axios requests globally.
// In dev (:5173) this points to :8080; in production it's same-origin.
axios.defaults.baseURL = API_BASE;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

