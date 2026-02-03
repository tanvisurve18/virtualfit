import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function TryOnStandalone() {
  const { state } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!state) {
      navigate('/dashboard');
    }
  }, [state, navigate]);

  if (!state) return null;

  return (
    <iframe
      src="/tryon-standalone.html"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
      }}
      title="Virtual Try-On"
    />
  );
}