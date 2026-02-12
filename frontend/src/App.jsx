import React, { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";
import { verifyAttendance } from "./api";
import {
  Camera,
  MapPin,
  UserCheck,
  AlertTriangle,
  ShieldCheck,
  Eye,
  Scan,
  RefreshCw,
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
        }
      );
    } else {
      setMessage("Geolocation is not supported by this browser.");
      setStatus("rejected");
    }
  }, []);

  const captureBlinkSequence = useCallback(async () => {
    if (!webcamRef.current) return null;

    const frames = [];
    const totalFrames = 10;
    const interval = 300;

    setCapturingFrames(true);
    setBlinkPrompt("Look at the camera and blink naturally...");

    for (let i = 0; i < totalFrames; i++) {
      setCaptureProgress(((i + 1) / totalFrames) * 100);
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) frames.push(imageSrc);
      if (i < totalFrames - 1) {
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }

    setCapturingFrames(false);
    setCaptureProgress(0);
    setBlinkPrompt("");

    return frames;
  }, []);

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
      setMessage("Capturing frames for blink detection...");
      const blinkFrames = await captureBlinkSequence();

      if (!blinkFrames || blinkFrames.length === 0) {
        setStatus("rejected");
        setMessage("Failed to capture frames");
        setVerifying(false);
        return;
      }

      setStatus("checking");
      setMessage("Verifying attendance...");

      const payload = {
        user_id: "test_user_002",
        latitude: location.latitude,
        longitude: location.longitude,
        frame: blinkFrames[blinkFrames.length - 1],
        blink_challenge_frames: blinkFrames,
        challenge_duration: 3.0,
        timestamp: new Date().toISOString(),
      };

      const result = await verifyAttendance(payload);
      setDetails(result);
      setGatePassed(result.gate_passed);

      if (result.verified) {
        setStatus("success");
        setMessage(`Welcome ${payload.user_id}`);
      } else {
        setStatus("rejected");
        switch (result.gate_passed) {
          case 0: setMessage(`❌ Location Check Failed: ${result.rejection_reason}`); break;
          case 1: setMessage(`❌ Anti-Spoofing Failed: ${result.rejection_reason}`); break;
          case 2: setMessage(`❌ Liveness Check Failed: ${result.rejection_reason}`); break;
          case 3: setMessage(`❌ Face Recognition Failed: ${result.rejection_reason}`); break;
          default: setMessage(`❌ Verification Failed: ${result.rejection_reason}`);
        }
      }
    } catch (error) {
      console.error("Verification error:", error);
      setStatus("error");
      setMessage("❌ System Error: " + (error.message || "Server may be offline"));
      setDetails(null);
    } finally {
      setVerifying(false);
    }
  }, [location, captureBlinkSequence]);

  const streamingVerification = useCallback(async () => {
    if (!webcamRef.current || !location) return;

    setVerifying(true);
    setStatus("checking");
    setMessage("Starting liveness challenge...");

    const maxAttempts = 30;
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
          verified = true;
          setStatus("success");
          setMessage("✓ Verification Successful!");
          setDetails(result);
          clearInterval(interval);
          setVerifying(false);
        } else if (result.gate_passed === 2 && result.rejection_reason?.includes("in progress")) {
          setMessage(result.rejection_reason);
          setDetails(result);
        } else {
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

      if (attempt >= maxAttempts && !verified) {
        setStatus("rejected");
        setMessage("Verification timeout - please try again");
        clearInterval(interval);
        setVerifying(false);
      }
    }, 300);
  }, [location]);

  // Framer Motion Variants
  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const scannerVariants = {
    idle: { scale: 1, borderColor: "rgba(229, 231, 235, 1)" },
    checking: { scale: 1, borderColor: "var(--color-primary)" },
    success: {
      scale: 1.05,
      borderColor: "var(--color-success)",
      transition: { type: "spring", stiffness: 300, damping: 10 }
    },
    rejected: {
      x: [-5, 5, -5, 5, 0],
      borderColor: "var(--color-danger)",
      transition: { duration: 0.4 }
    }
  };

  return (
    <motion.div
      className="app-container"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <header className="header">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <ShieldCheck size={40} className="text-primary" />
          <span className="brand">SecureGate</span>
        </motion.h1>
        <p className="subtitle">4-Gate Security Verification System</p>
      </header>

      <main className="main-content">
        <div className="camera-wrapper">
          <motion.div
            className={`camera-container ${status === "checking" ? "searching" : status}`}
            variants={scannerVariants}
            animate={status}
          >
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

            {/* Scanning Overlay Pulse */}
            <AnimatePresence>
              {(status === "checking" || status === "capturing") && (
                <motion.div
                  className="absolute inset-0 z-10 pointer-events-none"
                  style={{
                    border: "2px solid var(--color-primary)",
                    borderRadius: "50%"
                  }}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              )}
            </AnimatePresence>

            {/* Blinking/Progress Overlay */}
            {capturingFrames && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="text-center text-white">
                  <Eye size={48} className="mx-auto mb-4 animate-pulse" />
                  <p className="font-mono text-sm tracking-widest uppercase mb-2">
                    SCANNING_SEQUENCE: {Math.round(captureProgress)}%
                  </p>
                  <div className="w-48 h-1 bg-white/20 mx-auto overflow-hidden">
                    <motion.div
                      className="h-full bg-white"
                      initial={{ width: 0 }}
                      animate={{ width: `${captureProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        <motion.div
          className="status-panel"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="status-card">
            <AnimatePresence mode="wait">
              <motion.div
                key={status}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center gap-4"
              >
                {status === "idle" && <Camera size={48} className="opacity-20" />}
                {status === "capturing" && <Scan size={48} className="text-primary animate-pulse" />}
                {status === "checking" && <RefreshCw size={48} className="text-primary animate-spin" />}
                {status === "success" && <UserCheck size={48} className="text-success" />}
                {status === "rejected" && <AlertTriangle size={48} className="text-danger" />}

                <h2 className="text-center">{message}</h2>
              </motion.div>
            </AnimatePresence>

            {details && (
              <motion.div
                className="details mt-6"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
              >
                <div className="detail-row">
                  <span className="label">Gate Progress</span>
                  <span className="value mono">{details.gate_passed}/4</span>
                </div>
                {details.confidence !== undefined && (
                  <div className="detail-row">
                    <span className="label">Confidence Score</span>
                    <span className="value mono">{(details.confidence * 100).toFixed(1)}%</span>
                  </div>
                )}
                {details.processing_time && (
                  <div className="detail-row">
                    <span className="label">System Latency</span>
                    <span className="value mono">{(details.processing_time * 1000).toFixed(0)}ms</span>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          <div className="controls">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={captureAndVerify}
              disabled={verifying || !location}
              className="verify-btn primary"
            >
              {verifying ? "Verifying..." : "Full Verification"}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={streamingVerification}
              disabled={verifying || !location}
              className="verify-btn secondary"
            >
              Stream Check
            </motion.button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 opacity-40 font-mono text-xs">
            <MapPin size={12} />
            <span>
              {location
                ? `${location.latitude.toFixed(4)}°N, ${location.longitude.toFixed(4)}°E`
                : "PENDING_GEO_LOC"}
            </span>
          </div>
        </motion.div>
      </main>

      <div className="gates-indicator">
        {[
          { id: 1, name: "Location", icon: "📍" },
          { id: 2, name: "Anti-Spoof", icon: "🔍" },
          { id: 3, name: "Liveness", icon: "👁️" },
          { id: 4, name: "Identity", icon: "✓" },
        ].map((gate) => (
          <motion.div
            key={gate.id}
            className={`gate ${gatePassed >= gate.id ? "passed" : ""}`}
            initial={false}
            animate={{
              backgroundColor: gatePassed >= gate.id ? "var(--color-success)" : "transparent",
              transition: { duration: 0.5 }
            }}
          >
            <div className="gate-number">STEP_0{gate.id}</div>
            <div className="gate-name">{gate.name}</div>
          </motion.div>
        ))}
      </div>

      <motion.footer
        className="instructions"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <h3>Protocol:</h3>
        <ol>
          <li>Acquire high-precision geolocation.</li>
          <li>Position biometric features within frame.</li>
          <li>Execute blink sequence on prompt.</li>
          <li>Await system verification result.</li>
        </ol>
      </motion.footer>
    </motion.div>
  );
};

export default App;
