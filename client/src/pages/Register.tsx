import { useState } from "react";
import { signUp } from "@/_core/auth";
import { toast } from "sonner";
import { Compass, Lock, Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signUp(email, password, { name });
      if (!result.ok) {
        toast.error(result.error.message || "Registration failed");
        return;
      }
      toast.success("Account created! Please check your email for verification.");
      setLocation("/verify-email");
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page min-h-screen flex items-center justify-center bg-background">
      <div className="register-card rounded-xl shadow-lg w-full max-w-md p-8">
        <div className="register-header mb-6">
          <Compass size={32} className="mb-3 block mx-auto text-primary" />
          <h2 className="text-2xl font-bold text-center">Create account</h2>
          <p className="text-muted-text text-center mt-1">
            Sign up to explore careers and opportunities
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

          <div className="form-group">
            <Mail size={16} className="icon-muted mb-2" />
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              disabled={loading}
              className="input-full"
              aria-label="Full name"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`button button-primary w-full ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div className="register-actions mt-6 text-center">
          <p className="text-muted-text text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
