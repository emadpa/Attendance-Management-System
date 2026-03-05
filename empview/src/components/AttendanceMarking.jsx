import { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MapPin, Eye, CheckCircle, XCircle, Loader } from "lucide-react";

const EXPRESS_API = "http://localhost:5000/api/employee";
const TOTAL_FRAMES = 20;
const FRAME_INTERVAL = 150; // ms — 20 frames in 3 seconds

// Gate definitions
const GATES = [
  { id: 1, label: "Geofence" },
  { id: 2, label: "Liveness" },
  { id: 3, label: "Identity" },
];

export default function AttendanceMarking() {
  const webcamRef = useRef(null);
  const navigate = useNavigate();

  const [phase, setPhase] = useState("init"); // init | ready | capturing | verifying | success | failed
  const [location, setLocation] = useState(null);
  const [geoError, setGeoError] = useState("");
  const [captureProgress, setCaptureProgress] = useState(0);
  const [gatePassed, setGatePassed] = useState(0);
  const [resultData, setResultData] = useState(null);
  const [failReason, setFailReason] = useState("");

  // Get geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setPhase("ready");
      },
      () => {
        setGeoError(
          "Location access denied. Please enable location and refresh.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // Capture 20 frames over 3 seconds
  const captureFrames = useCallback(async () => {
    const frames = [];
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const screenshot = webcamRef.current?.getScreenshot();
      if (screenshot) frames.push(screenshot);
      setCaptureProgress(Math.round(((i + 1) / TOTAL_FRAMES) * 100));
      if (i < TOTAL_FRAMES - 1) {
        await new Promise((r) => setTimeout(r, FRAME_INTERVAL));
      }
    }
    return frames;
  }, []);

  const handleVerify = useCallback(async () => {
    if (!location || !webcamRef.current) return;

    setPhase("capturing");
    setCaptureProgress(0);
    setGatePassed(0);
    setResultData(null);
    setFailReason("");

    // Capture frames
    const frames = await captureFrames();
    if (frames.length < 5) {
      setFailReason("Not enough frames captured. Ensure your face is visible.");
      setPhase("failed");
      return;
    }

    setPhase("verifying");

    try {
      // Build multipart form
      const formData = new FormData();
      formData.append("latitude", location.latitude);
      formData.append("longitude", location.longitude);

      // Convert base64 frames to blobs and append
      for (let i = 0; i < frames.length; i++) {
        const base64 = frames[i].split(",")[1];
        const binary = atob(base64);
        const array = new Uint8Array(binary.length);
        for (let j = 0; j < binary.length; j++) array[j] = binary.charCodeAt(j);
        const blob = new Blob([array], { type: "image/jpeg" });
        formData.append("frames", blob, `frame_${i}.jpg`);
      }

      const res = await fetch(`${EXPRESS_API}/mark-attendance`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();

      if (data.success) {
        setGatePassed(3);
        setResultData(data);
        setPhase("success");
        setTimeout(() => navigate("/Dashboard", { replace: true }), 3000);
      } else {
        setGatePassed(data.gatePassed || 0);
        setFailReason(data.message || "Verification failed.");
        setPhase("failed");
      }
    } catch (err) {
      console.error(err);
      setFailReason("Server unreachable. Please try again.");
      setPhase("failed");
    }
  }, [location, captureFrames, navigate]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4 py-10 font-mono">
      {/* Subtle dot grid bg */}
      <div
        className="fixed inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 w-full max-w-lg">
        {/* Header */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[10px] tracking-[0.3em] text-gray-500 uppercase mb-1">
            Biometric Attendance
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Mark Attendance
          </h1>
        </motion.div>

        {/* Gate progress bar */}
        <motion.div
          className="flex items-center gap-2 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {GATES.map((gate, i) => (
            <div
              key={gate.id}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div
                className={`h-1 w-full rounded-full transition-all duration-700 ${
                  gatePassed >= gate.id ? "bg-emerald-400" : "bg-gray-700"
                }`}
              />
              <span className="text-[9px] tracking-widest text-gray-500 uppercase">
                {gate.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Camera card */}
        <motion.div
          className="relative rounded-2xl overflow-hidden bg-gray-900 border border-gray-800 aspect-[4/3] mb-5"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            className="w-full h-full object-cover"
            videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
            style={{ transform: "scaleX(-1)" }}
          />

          {/* Face oval guide */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`w-48 h-56 rounded-full border-2 transition-colors duration-500 ${
                phase === "capturing"
                  ? "border-emerald-400/70 border-dashed"
                  : phase === "success"
                    ? "border-emerald-400"
                    : phase === "failed"
                      ? "border-red-400/70"
                      : "border-white/20 border-dashed"
              }`}
            />
          </div>

          {/* Scanning line animation during capture */}
          <AnimatePresence>
            {phase === "capturing" && (
              <motion.div
                className="absolute left-0 right-0 h-px bg-emerald-400/60 pointer-events-none"
                initial={{ top: "20%" }}
                animate={{ top: "80%" }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "linear",
                }}
              />
            )}
          </AnimatePresence>

          {/* Capture progress overlay */}
          <AnimatePresence>
            {phase === "capturing" && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 bg-black/60 px-4 py-3 flex items-center gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Eye className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                <div className="flex-1">
                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${captureProgress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 tabular-nums w-8 text-right">
                  {captureProgress}%
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Verifying overlay */}
          <AnimatePresence>
            {phase === "verifying" && (
              <motion.div
                className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Loader className="w-8 h-8 text-emerald-400 animate-spin" />
                <p className="text-xs tracking-widest text-gray-300 uppercase">
                  Verifying...
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success overlay */}
          <AnimatePresence>
            {phase === "success" && (
              <motion.div
                className="absolute inset-0 bg-emerald-950/80 flex flex-col items-center justify-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                >
                  <CheckCircle className="w-16 h-16 text-emerald-400" />
                </motion.div>
                <p className="text-sm font-semibold text-emerald-300 tracking-wide">
                  Attendance Marked
                </p>
                {resultData?.confidence && (
                  <p className="text-xs text-emerald-500">
                    Match confidence: {resultData.confidence}
                  </p>
                )}
                <p className="text-[10px] text-gray-400 mt-1">
                  Redirecting to dashboard...
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Failed overlay */}
          <AnimatePresence>
            {phase === "failed" && (
              <motion.div
                className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center gap-3 px-6 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <XCircle className="w-12 h-12 text-red-400" />
                <p className="text-sm font-semibold text-red-300">
                  Verification Failed
                </p>
                <p className="text-xs text-red-400/80 leading-relaxed">
                  {failReason}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Geo status */}
        <div className="flex items-center gap-2 mb-5 px-1">
          <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          {geoError ? (
            <p className="text-xs text-red-400">{geoError}</p>
          ) : location ? (
            <p className="text-[11px] text-gray-500 tabular-nums">
              {location.latitude.toFixed(5)}°N, {location.longitude.toFixed(5)}
              °E — acquired
            </p>
          ) : (
            <p className="text-[11px] text-gray-500 animate-pulse">
              Acquiring location...
            </p>
          )}
        </div>

        {/* Action buttons */}
        <AnimatePresence mode="wait">
          {(phase === "ready" || phase === "failed") && (
            <motion.div
              key="actions"
              className="flex gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <button
                onClick={() => navigate("/Dashboard")}
                className="flex-1 py-3.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:bg-gray-800 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleVerify}
                disabled={!location}
                className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
              >
                {phase === "failed" ? "Try Again" : "Verify & Mark"}
              </button>
            </motion.div>
          )}

          {(phase === "capturing" || phase === "verifying") && (
            <motion.div
              key="loading"
              className="text-center py-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-xs text-gray-500 tracking-widest uppercase">
                {phase === "capturing"
                  ? "Blink naturally while looking at the camera..."
                  : "Processing biometric data..."}
              </p>
            </motion.div>
          )}

          {phase === "init" && !geoError && (
            <motion.div
              key="init"
              className="text-center py-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-xs text-gray-500 animate-pulse tracking-widest uppercase">
                Acquiring GPS location...
              </p>
            </motion.div>
          )}

          {geoError && phase === "init" && (
            <motion.div
              key="geoerr"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-xs text-red-400 text-center">{geoError}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instruction line */}
        <p className="text-center text-[10px] text-gray-600 mt-5 tracking-wide">
          Position your face inside the oval · Blink naturally when prompted
        </p>
      </div>
    </div>
  );
}