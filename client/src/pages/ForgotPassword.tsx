import { useState } from "react";
import { resetPassword } from "@/_core/auth";
import { toast } from "sonner";
import { Compass, Mail, Lock, ArrowRight, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useNavigate } from "wouter";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await resetPassword(email);
      toast.success(
        "Password reset instructions sent to your email address"
      );
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page min-h-screen flex items-center justify-center bg-background">
      <div className="forgot-card rounded-xl shadow-lg w-full max-w-md p-8">
        <div className="forgot-header mb-6">
          <Mail size={32} className="mb-3 block mx-auto text-primary" />
          <h2 className="text-2xl font-bold text-center">Forgot password?</h2>
          <p className="text-muted-text text-center mt-1">
            Enter your email address and we'll send you a reset link
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

          <button
            type="submit"
            disabled={loading}
            className={`button button-primary w-full ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <div className="forgot-actions mt-6 text-center">
          <p className="text-muted-text text-sm">
            <Link href="/login" className="text-primary font-medium underline">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}