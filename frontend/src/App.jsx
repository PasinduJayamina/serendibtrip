import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center gap-8 mb-8">
          <a
            href="https://vite.dev"
            target="_blank"
            className="hover:opacity-80 transition-opacity"
          >
            <img src={viteLogo} className="h-24 w-24" alt="Vite logo" />
          </a>
          <a
            href="https://react.dev"
            target="_blank"
            className="hover:opacity-80 transition-opacity"
          >
            <img
              src={reactLogo}
              className="h-24 w-24 animate-spin-slow"
              alt="React logo"
            />
          </a>
        </div>
        <h1 className="text-5xl font-bold text-gray-800 mb-8">SerendibTrip</h1>
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <button
            onClick={() => setCount((count) => count + 1)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors mb-4"
          >
            count is {count}
          </button>
          <p className="text-gray-600">
            Edit{' '}
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              src/App.jsx
            </code>{' '}
            and save to test HMR
          </p>
        </div>
        <p className="text-gray-500 mt-6">
          Click on the Vite and React logos to learn more
        </p>
      </div>
    </div>
  );
}

export default App;
