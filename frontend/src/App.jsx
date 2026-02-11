import React, { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { verifyAttendance } from "./api";
import {
  Camera,
  MapPin,
  UserCheck,
  AlertTriangle,
  ShieldCheck,
  Eye,
} from "lucide-react";
import "./App.css";

const App = () => {
  const webcamRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [capturingFrames, setCapturingFrames] = useState(false);
  const [status, setStatus] = useState("idle"); // idle, capturing, checking, success, rejected
  const [message, setMessage] = useState("Ready to verify");
  const [details, setDetails] = useState(null);
  const [gatePassed, setGatePassed] = useState(0);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [blinkPrompt, setBlinkPrompt] = useState("");

  useEffect(() => {
    // Get location on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setMessage("Location acquired. Ready to verify.");
        },
        (error) => {
          console.error("Error getting location:", error);
          setMessage("Location access denied. Cannot verify.");
          setStatus("rejected");
        },
      );
    } else {
      setMessage("Geolocation is not supported by this browser.");
      setStatus("rejected");
    }
  }, []);

  /**
   * Capture multiple frames over 3 seconds for blink detection
   */
  const captureBlinkSequence = useCallback(async () => {
    if (!webcamRef.current) return null;

    const frames = [];
    const totalFrames = 10; // Capture 10 frames over 3 seconds
    const interval = 300; // 300ms between frames (10 frames * 300ms = 3 seconds)

    setCapturingFrames(true);
    setBlinkPrompt("Look at the camera and blink naturally...");

    for (let i = 0; i < totalFrames; i++) {
      // Update progress
      setCaptureProgress(((i + 1) / totalFrames) * 100);

      // Capture frame
      const imageSrc = webcamRef.current.getScreenshot();

      if (imageSrc) {
        frames.push(imageSrc);
      }

      // Wait before next capture (except on last frame)
      if (i < totalFrames - 1) {
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }

    setCapturingFrames(false);
    setCaptureProgress(0);
    setBlinkPrompt("");

    return frames;
  }, []);

  /**
   * Main verification function with blink challenge
   */
  const captureAndVerify = useCallback(async () => {
    if (!webcamRef.current || !location) {
      setMessage("Camera or location not ready");
      return;
    }

    setVerifying(true);
    setStatus("capturing");
    setMessage("Starting blink challenge...");
    setGatePassed(0);

    try {
      // Step 1: Capture sequence of frames for blink detection
      setMessage("Capturing frames for blink detection...");
      const blinkFrames = await captureBlinkSequence();

      if (!blinkFrames || blinkFrames.length === 0) {
        setStatus("rejected");
        setMessage("Failed to capture frames");
        setVerifying(false);
        return;
      }

      // Step 2: Send to backend for verification
      setStatus("checking");
      setMessage("Verifying attendance...");
      console.log(blinkFrames);

      const payload = {
        user_id: "test_user_001", // In production, get from authentication
        latitude: location.latitude,
        longitude: location.longitude,
        frame: blinkFrames[blinkFrames.length - 1], // Latest frame for face recognition
        blink_challenge_frames: blinkFrames, // All frames for blink detection
        challenge_duration: 3.0,
        timestamp: new Date().toISOString(),
      };

      const result = await verifyAttendance(payload);
      setDetails(result);
      setGatePassed(result.gate_passed);

      if (result.verified) {
        setStatus("success");
        setMessage("✓ Verification Successful! Attendance Marked.");
      } else {
        setStatus("rejected");

        // Custom messages based on gate failure
        switch (result.gate_passed) {
          case 0:
            setMessage(`❌ Location Check Failed: ${result.rejection_reason}`);
            break;
          case 1:
            setMessage(`❌ Anti-Spoofing Failed: ${result.rejection_reason}`);
            break;
          case 2:
            setMessage(`❌ Liveness Check Failed: ${result.rejection_reason}`);
            break;
          case 3:
            setMessage(
              `❌ Face Recognition Failed: ${result.rejection_reason}`,
            );
            break;
          default:
            setMessage(`❌ Verification Failed: ${result.rejection_reason}`);
        }
      }
    } catch (error) {
      console.error("Verification error:", error);
      setStatus("error");
      setMessage(
        "❌ System Error: " + (error.message || "Server may be offline"),
      );
      setDetails(null);
    } finally {
      setVerifying(false);
    }
  }, [location, captureBlinkSequence]);

  /**
   * Alternative: Single-frame streaming mode (for real-time feedback)
   */
  const streamingVerification = useCallback(async () => {
    if (!webcamRef.current || !location) return;

    setVerifying(true);
    setStatus("checking");
    setMessage("Starting liveness challenge...");

    const maxAttempts = 30; // 30 frames max (~3 seconds at 10fps)
    let attempt = 0;
    let verified = false;

    const interval = setInterval(async () => {
      attempt++;

      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;

      const payload = {
        user_id: "test_user_001",
        latitude: location.latitude,
        longitude: location.longitude,
        frame: imageSrc,
        challenge_in_progress: true,
        timestamp: new Date().toISOString(),
      };

      try {
        const result = await verifyAttendance(payload);
        setGatePassed(result.gate_passed);

        if (result.verified) {
          // Success!
          verified = true;
          setStatus("success");
          setMessage("✓ Verification Successful!");
          setDetails(result);
          clearInterval(interval);
          setVerifying(false);
        } else if (
          result.gate_passed === 2 &&
          result.rejection_reason?.includes("in progress")
        ) {
          // Still waiting for blink
          setMessage(result.rejection_reason);
          setDetails(result);
        } else {
          // Failed verification
          setStatus("rejected");
          setMessage(result.rejection_reason);
          setDetails(result);
          clearInterval(interval);
          setVerifying(false);
        }
      } catch (error) {
        console.error("Streaming verification error:", error);
        setStatus("error");
        setMessage("Connection error");
        clearInterval(interval);
        setVerifying(false);
      }

      // Timeout after max attempts
      if (attempt >= maxAttempts && !verified) {
        setStatus("rejected");
        setMessage("Verification timeout - please try again");
        clearInterval(interval);
        setVerifying(false);
      }
    }, 300); // Send frame every 300ms
  }, [location]);

  return (
    <div className="app-container">
      <header className="header">
        <h1>
          <ShieldCheck size={28} /> SecureGate Attendance
        </h1>
        <p className="subtitle">4-Gate Security Verification System</p>
      </header>

      <main className="main-content">
        <div className="camera-container">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="webcam-view"
            videoConstraints={{
              width: 640,
              height: 480,
              facingMode: "user",
            }}
          />

          {/* Overlays */}
          {status === "checking" && <div className="overlay scanning"></div>}
          {capturingFrames && (
            <div className="overlay capturing">
              <div className="blink-prompt">
                <Eye size={48} className="blink-icon" />
                <p>{blinkPrompt}</p>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${captureProgress}%` }}
                  ></div>
                </div>
                <p className="progress-text">{Math.round(captureProgress)}%</p>
              </div>
            </div>
          )}
        </div>

        <div className="status-panel">
          <div className={`status-card ${status}`}>
            {status === "idle" && <Camera size={48} />}
            {status === "capturing" && <Eye size={48} className="pulse" />}
            {status === "checking" && <div className="spinner"></div>}
            {status === "success" && <UserCheck size={48} />}
            {status === "rejected" && <AlertTriangle size={48} />}

            <h2>{message}</h2>

            {details && (
              <div className="details">
                <div className="detail-row">
                  <span className="label">Gate Progress:</span>
                  <span className="value">{details.gate_passed}/4</span>
                </div>
                {details.confidence !== undefined && (
                  <div className="detail-row">
                    <span className="label">Confidence:</span>
                    <span className="value">
                      {(details.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">Processing Time:</span>
                  <span className="value">
                    {(details.processing_time * 1000).toFixed(0)}ms
                  </span>
                </div>

                {/* Debug info if available */}
                {details.debug_info && (
                  <details className="debug-info">
                    <summary>Debug Information</summary>
                    <pre>{JSON.stringify(details.debug_info, null, 2)}</pre>
                  </details>
                )}
              </div>
            )}
          </div>

          <div className="controls">
            <button
              onClick={captureAndVerify}
              disabled={verifying || !location}
              className="verify-btn primary"
            >
              {verifying ? (
                <>
                  <div className="btn-spinner"></div>
                  Verifying...
                </>
              ) : (
                <>
                  <UserCheck size={20} />
                  Verify Attendance (Batch Mode)
                </>
              )}
            </button>

            {/* Alternative streaming mode button */}
            <button
              onClick={streamingVerification}
              disabled={verifying || !location}
              className="verify-btn secondary"
            >
              {verifying ? "Processing..." : "Verify (Streaming Mode)"}
            </button>

            <div className="location-status">
              <MapPin size={16} />
              <span>
                {location
                  ? `${location.latitude.toFixed(4)}°N, ${location.longitude.toFixed(4)}°E`
                  : "Acquiring location..."}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Visual Gate Indicators */}
      <div className="gates-indicator">
        <div
          className={`gate ${gatePassed >= 1 ? "passed" : gatePassed === 0 ? "failed" : ""}`}
        >
          <div className="gate-number">1</div>
          <div className="gate-name">Location</div>
          <div className="gate-icon">📍</div>
        </div>
        <div
          className={`gate ${gatePassed >= 2 ? "passed" : gatePassed === 1 ? "failed" : ""}`}
        >
          <div className="gate-number">2</div>
          <div className="gate-name">Texture</div>
          <div className="gate-icon">🔍</div>
        </div>
        <div
          className={`gate ${gatePassed >= 3 ? "passed" : gatePassed === 2 ? "failed" : ""}`}
        >
          <div className="gate-number">3</div>
          <div className="gate-name">Liveness</div>
          <div className="gate-icon">👁️</div>
        </div>
        <div
          className={`gate ${gatePassed >= 4 ? "passed" : gatePassed === 3 ? "failed" : ""}`}
        >
          <div className="gate-number">4</div>
          <div className="gate-name">Identity</div>
          <div className="gate-icon">✓</div>
        </div>
      </div>

      {/* Instructions */}
      <div className="instructions">
        <h3>How to Use:</h3>
        <ol>
          <li>Ensure you are at the correct location (within 4km radius)</li>
          <li>Position your face clearly in the camera frame</li>
          <li>Click "Verify Attendance" and wait for the blink prompt</li>
          <li>Blink naturally when prompted (within 3 seconds)</li>
          <li>Wait for verification to complete</li>
        </ol>
      </div>
    </div>
  );
};

export default App;
