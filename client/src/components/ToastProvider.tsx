import React from 'react';
import { Toaster } from 'react-hot-toast';

export const ToastProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0A1A1B',
            color: '#DAF1DE',
            borderRadius: '12px',
            border: '1px solid rgba(168, 212, 220, 0.2)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(78, 201, 212, 0.15)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            padding: '12px 16px',
          },
          success: {
            duration: 3500,
            style: {
              background: '#0A1A1B',
              color: '#DAF1DE',
              border: '1px solid rgba(78, 201, 212, 0.5)',
              boxShadow: '0 0 15px rgba(78, 201, 212, 0.2)',
            },
            iconTheme: {
              primary: '#4EC9D4',
              secondary: '#0A1A1B',
            },
          },
          error: {
            duration: 4500,
            style: {
              background: '#140A0A',
              color: '#FCA5A5',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.2)',
            },
            iconTheme: {
              primary: '#EF4444',
              secondary: '#140A0A',
            },
          },
        }}
      />
    </>
  );
};

export default ToastProvider;
