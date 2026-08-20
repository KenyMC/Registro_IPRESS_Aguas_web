import { useState, useEffect } from 'react';
import { Database, CheckCircle } from 'lucide-react';
import { fetchRecordsFromServer } from '../services/api';
import { mergeRecords } from '../services/storage';

export const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // Step 1: Initialize
      setStep(1);
      
      // Step 2: Download records
      setTimeout(async () => {
        setStep(2);
        try {
          const serverRecords = await fetchRecordsFromServer();
          if (serverRecords && serverRecords.length > 0) {
            mergeRecords(serverRecords);
            window.dispatchEvent(new Event('recordsUpdated'));
          }
        } catch (error) {
          console.error("Failed to sync on startup", error);
        }
        
        // Step 3: Finish
        setTimeout(() => {
          setStep(3);
          setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onFinish(), 500);
          }, 800);
        }, 1000);
      }, 800);
    };

    loadData();
  }, [onFinish]);

  if (!isVisible && step === 3) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#f8fafc',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'opacity 0.5s ease',
      opacity: isVisible ? 1 : 0
    }}>
      <div className="glass-panel animate-fade-in" style={{
        padding: '3rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center'
      }}>
        
        <div style={{ position: 'relative', marginBottom: '2rem' }}>
          {step === 3 ? (
            <CheckCircle size={64} style={{ color: 'var(--success)' }} className="animate-fade-in" />
          ) : (
            <Database size={64} style={{ color: 'var(--primary)' }} className="animate-pulse" />
          )}
        </div>
        
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
          Preparando tu espacio
        </h2>

        <div style={{ width: '100%', backgroundColor: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '1rem' }}>
          <div style={{ 
            height: '100%', 
            backgroundColor: 'var(--primary)', 
            width: step === 0 ? '0%' : step === 1 ? '33%' : step === 2 ? '66%' : '100%',
            transition: 'width 0.8s ease'
          }}></div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', height: '20px' }}>
          {step === 1 && "1/2 Preparando almacenamiento local..."}
          {step === 2 && "2/2 Descargando registros de la nube..."}
          {step === 3 && "¡Todo listo!"}
        </p>
      </div>
    </div>
  );
};
