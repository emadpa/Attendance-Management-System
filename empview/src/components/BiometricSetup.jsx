import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";

const API = "http://localhost:5000/api/employee";

export default function BiometricSetup() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState("intro"); // intro | camera | captured | saving | done | error
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [countdown, setCountdown] = useState(null);

  // Replace your startCamera function with this:
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setPhase("camera");
    } catch {
      setErrorMsg(
        "Camera access denied. Please allow camera permissions and try again.",
      );
      setPhase("error");
    }
  }, []);

  // This runs AFTER the video element appears in the DOM
  useEffect(() => {
    if (phase === "camera" && streamRef.current) {
      const interval = setInterval(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(console.error);
          clearInterval(interval);
        }
      }, 100); // poll until videoRef is available
      return () => clearInterval(interval);
    }
  }, [phase]); // runs after phase changes to "camera" and video element appears in DOM

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCountdown = () => {
    let count = 3;
    setCountdown(count);
    const interval = setInterval(() => {
      count -= 1;
      if (count === 0) {
        clearInterval(interval);
        setCountdown(null);
        capturePhoto();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    setCapturedImage(canvas.toDataURL("image/jpeg", 0.92));
    canvas.toBlob((blob) => setCapturedBlob(blob), "image/jpeg", 0.92);
    stopCamera();
    setPhase("captured");
  };

  const retake = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    setPhase("intro");
  };

  const save = async () => {
    if (!capturedBlob) return;
    setPhase("saving");
    try {
      const formData = new FormData();
      formData.append("image", capturedBlob, "biometric.jpg");
      formData.append("userId", user?.user?.id); // { user: { id }, requiresBiometric }

      await fetch(`${API}/registerBiometric`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      // requiresBiometric is top-level in the user state object
      setUser((prev) => ({ ...prev, requiresBiometric: false }));

      setPhase("done");
      setTimeout(() => navigate("/Dashboard", { replace: true }), 1800);
    } catch {
      setErrorMsg("Registration failed. Please try again.");
      setPhase("error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 font-sans">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600" />

          <div className="p-8">
            {/* Header - always visible */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <FaceIcon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-medium">
                    One-time Setup
                  </p>
                  <h1 className="text-white font-semibold text-lg leading-tight">
                    Biometric Registration
                  </h1>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Your organization requires face recognition for attendance. This
                is a one-time setup.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {phase === "intro" && (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="space-y-3 mb-8">
                    {[
                      { num: "01", text: "Ensure you're in a well-lit area" },
                      { num: "02", text: "Look directly at the camera" },
                      {
                        num: "03",
                        text: "Remove glasses or masks if possible",
                      },
                    ].map((s) => (
                      <div
                        key={s.num}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50"
                      >
                        <span className="text-[10px] font-bold text-blue-400 w-6 shrink-0">
                          {s.num}
                        </span>
                        <span className="text-sm text-gray-300">{s.text}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={startCamera}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    Open Camera
                  </button>
                </motion.div>
              )}

              {phase === "camera" && (
                <motion.div
                  key="camera"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="relative rounded-xl overflow-hidden bg-gray-800 aspect-[4/3]">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ transform: "scaleX(-1)" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-44 h-52 rounded-full border-2 border-blue-400/60 border-dashed" />
                    </div>
                    <AnimatePresence>
                      {countdown !== null && (
                        <motion.div
                          key={countdown}
                          initial={{ scale: 1.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          className="absolute inset-0 flex items-center justify-center bg-black/40"
                        >
                          <span className="text-7xl font-bold text-white">
                            {countdown}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 px-2 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-white text-[10px] font-medium tracking-wide">
                        LIVE
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        stopCamera();
                        setPhase("intro");
                      }}
                      className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={startCountdown}
                      disabled={countdown !== null}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                      {countdown !== null
                        ? `Capturing in ${countdown}…`
                        : "Capture"}
                    </button>
                  </div>
                </motion.div>
              )}

              {phase === "captured" && (
                <motion.div
                  key="captured"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-gray-800">
                    <img
                      src={capturedImage}
                      alt="Captured"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 border-2 border-green-400/40 rounded-xl pointer-events-none" />
                    <div className="absolute top-3 left-3 bg-green-500/90 px-2 py-1 rounded-full">
                      <span className="text-white text-[10px] font-semibold tracking-wide">
                        CAPTURED
                      </span>
                    </div>
                  </div>
                  <p className="text-center text-sm text-gray-400">
                    Looks good? Save to complete setup, or retake if needed.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={retake}
                      className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-xl transition-colors"
                    >
                      Retake
                    </button>
                    <button
                      onClick={save}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                      Save & Continue
                    </button>
                  </div>
                </motion.div>
              )}

              {phase === "saving" && (
                <motion.div
                  key="saving"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 flex flex-col items-center gap-4"
                >
                  <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">
                    Registering your face…
                  </p>
                </motion.div>
              )}

              {phase === "done" && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 flex flex-col items-center gap-3"
                >
                  <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                    <svg
                      className="w-7 h-7 text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-white font-medium">
                    Registration Complete
                  </p>
                  <p className="text-gray-500 text-sm">
                    Redirecting to dashboard…
                  </p>
                </motion.div>
              )}

              {phase === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                    <p className="text-red-400 text-sm">{errorMsg}</p>
                  </div>
                  <button
                    onClick={() => {
                      setErrorMsg("");
                      setPhase("intro");
                    }}
                    className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-xl transition-colors"
                  >
                    Try Again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          Your biometric data is encrypted and stored securely.
        </p>
      </motion.div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function FaceIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
      />
    </svg>
  );
}
