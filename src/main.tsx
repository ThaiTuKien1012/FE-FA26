import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { SessionBoundary } from './features/auth/components/SessionBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(<SessionBoundary><App /></SessionBoundary>);
