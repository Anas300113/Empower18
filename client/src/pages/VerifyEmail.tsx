import { useState } from "react";
import { verifyEmail } from "@/_core/auth";
import { toast } from "sonner";
import { Compass, Mail, Check, Lock, ArrowRight, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "wouter";
import { Link } from "wouter";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      await verifyEmail(token, "signup");
      toast.success("Email verified! You can now sign in.");
      navigate("/login");
    } catch (error) {
      toast.error("The verification link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verify-email-page min-h-screen flex items-center justify-center bg-background">
      <div className="verify-email-card rounded-xl shadow-lg w-full max-w-md p-8">
        <div className="verify-email-header mb-6">
          <Mail size={32} className="mb-3 block mx-auto text-primary" />
          <h2 className="text-2xl font-bold text-center">Verify email</h2>
          <p className="text-muted-text text-center mt-1">
            We've sent a verification email to your address. Click the link below
            to verify your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="hidden"
            name="token"
            value={token}
            defaultValue={token}
          />

          <button
            type="submit"
            disabled={loading}
            className={`button button-primary w-full ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Verifying..." : "Verify email"}
          </button>
        </form>

        <div className="verify-actions mt-6 text-center">
          <p className="text-muted-text text-sm">
            <Link href="/login" className="text-primary font-medium underline">
              Sign in with unverified email
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}