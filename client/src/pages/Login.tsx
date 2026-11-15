import { useState } from "react";
import { signIn } from "@/_core/auth";
import { toast } from "sonner";
import { Compass, Lock, Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const nextPath = new URLSearchParams(window.location.search).get("next") || "/dashboard";
  const authLoading = loading;

  if (authLoading) {
    return <div>Loading auth...</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn(email, password);
      if (!result.ok) {
        toast.error(result.error.message || "Login failed");
        return;
      }
      toast.success("Welcome back!");
      setLocation(nextPath.startsWith("/") ? nextPath : "/dashboard");
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page min-h-screen flex items-center justify-center bg-background">
      <div className="login-card rounded-xl shadow-lg w-full max-w-md p-8">
        <div className="login-header mb-6">
          <Compass size={32} className="mb-3 block mx-auto text-primary" />
          <h2 className="text-2xl font-bold text-center">Welcome back</h2>
          <p className="text-muted-text text-center mt-1">
            Sign in to your Empower18 account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <Mail size={16} className="icon-muted mb-2" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
              className="input-full"
              aria-label="Email"
            />
          </div>

          <div className="form-group">
            <Lock size={16} className="icon-muted mb-2" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loading}
              className="input-full"
              aria-label="Password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`button button-primary w-full ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="login-actions mt-6 text-center">
          <p className="text-muted-text text-sm">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary font-medium underline">
              Register
            </Link>
          </p>
          <p className="text-muted-text text-sm mt-2">
            <Link href="/forgot-password" className="text-primary font-medium underline">
              Forgot password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
