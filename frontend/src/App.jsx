import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { verifyAttendance } from './api';
import { Camera, MapPin, UserCheck, AlertTriangle, ShieldCheck } from 'lucide-react';
import './App.css';

const App = () => {
  const webcamRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState("idle"); // idle, checking, success, rejected
  const [message, setMessage] = useState("Ready to verify");
  const [details, setDetails] = useState(null);
  const [gatePassed, setGatePassed] = useState(0);

  useEffect(() => {
    // Get location on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          setMessage("Location access denied. Cannot verify.");
          setStatus("rejected");
        }
      );
    } else {
      setMessage("Geolocation is not supported by this browser.");
      setStatus("rejected");
    }
  }, []);

  const captureAndVerify = useCallback(async () => {
    if (!webcamRef.current || !location) return;

    setVerifying(true);
    setStatus("checking");
    setMessage("Verifying...");

    const imageSrc = webcamRef.current.getScreenshot();

    if (!imageSrc) {
      setVerifying(false);
      return;
    }

    const payload = {
      user_id: "test_user_001", // Hardcoded for demo
      latitude: location.latitude,
      longitude: location.longitude,
      frame: imageSrc,
      timestamp: new Date().toISOString()
    };

    try {
      const result = await verifyAttendance(payload);
      setDetails(result);
      setGatePassed(result.gate_passed);

      if (result.verified) {
        setStatus("success");
        setMessage("Verification Successful!");
      } else {
        setStatus("rejected");
        // Custom messages based on gate failure
        if (result.gate_passed === 0) setMessage(`Location Denied: ${result.rejection_reason}`);
        else if (result.gate_passed === 1) setMessage(`Spoof Detected: ${result.rejection_reason}`);
        else if (result.gate_passed === 2) setMessage(`Liveness Check Failed: ${result.rejection_reason}`);
        else if (result.gate_passed === 3) setMessage(`Identity Mismatch: ${result.rejection_reason}`);
        else setMessage(`Verification Failed: ${result.rejection_reason}`);

        // Loop logic: If Liveness failed, maybe retry automatically? 
        // For now, we stop and let user click again.
      }
    } catch (error) {
      setStatus("error");
      setMessage("System Error or Server Offline");
    } finally {
      setVerifying(false);
    }
  }, [location]);

  return (
    <div className="app-container">
      <header className="header">
        <h1><ShieldCheck size={28} /> SecureGate Attendance</h1>
      </header>

      <main className="main-content">
        <div className="camera-container">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="webcam-view"
            videoConstraints={{ width: 640, height: 480, facingMode: "user" }}
          />
          {status === 'checking' && <div className="overlay scanning"></div>}
        </div>

        <div className="status-panel">
          <div className={`status-card ${status}`}>
            {status === 'idle' && <Camera size={48} />}
            {status === 'checking' && <div className="spinner"></div>}
            {status === 'success' && <UserCheck size={48} />}
            {status === 'rejected' && <AlertTriangle size={48} />}

            <h2>{message}</h2>
            {details && (
              <div className="details">
                <p>Gate Reached: {details.gate_passed}/4</p>
                <p>Confidence: {(details.confidence * 100).toFixed(1)}%</p>
                <p>Time: {(details.processing_time * 1000).toFixed(0)}ms</p>
              </div>
            )}
          </div>

          <div className="controls">
            <button
              onClick={captureAndVerify}
              disabled={verifying || !location}
              className="verify-btn"
            >
              {verifying ? 'Verifying...' : 'Verify Attendance'}
            </button>

            <div className="location-status">
              <MapPin size={16} />
              <span>
                {location
                  ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                  : "Locating..."}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Visual Gate Indicators */}
      <div className="gates-indicator">
        <div className={`gate step ${gatePassed >= 1 ? 'passed' : ''}`}>1. Location</div>
        <div className={`gate step ${gatePassed >= 2 ? 'passed' : ''}`}>2. Texture</div>
        <div className={`gate step ${gatePassed >= 3 ? 'passed' : ''}`}>3. Liveness</div>
        <div className={`gate step ${gatePassed >= 4 ? 'passed' : ''}`}>4. Identity</div>
      </div>
    </div>
  );
};

export default App;
