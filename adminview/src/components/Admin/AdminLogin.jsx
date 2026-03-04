import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom"; // ✅ Added useSearchParams
import { useAuth } from "../shared/AuthContext";
import { Input } from "../shared/Input";

export function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  // ✅ NEW: Hook to read URL parameters
  const [searchParams] = useSearchParams();

  // ✅ NEW: Automatically check the URL for an error message when the page loads
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      setError(urlError); // Show the error in the red box

      // Clean up the URL so the error message doesn't stay in the address bar
      window.history.replaceState(null, "", "/login");
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const result = await login(email, password);

    if (result.success) {
      navigate("/admin");
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-8 bg-white p-8 shadow-lg rounded-sm border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-serif text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <Link
              to="/register"
              className="font-medium text-black hover:underline"
            >
              register a new organization
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Email address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com"
            />
            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-sm text-white bg-black hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black uppercase tracking-wider transition-all"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
