import { useState, useSearchParams } from "react";
import { updatePassword } from "@/_core/auth";
import { toast } from "sonner";
import { useNavigate } from "wouter";
import { Compass, Lock, Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const handleSubmit = async () => {
    setLoading(true);

    try {
      await updatePassword(newPassword);
      toast.success("Password updated successfully! You can now sign in.");
      navigate("/login");
    } catch (error) {
      toast.error("Failed to update password. The link may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page min-h-screen flex items-center justify-center bg-background">
      <div className="reset-card rounded-xl shadow-lg w-full max-w-md p-8">
        <div className="reset-header mb-6">
          <Lock size={32} className="mb-3 block mx-auto text-primary" />
          <h2 className="text-2xl font-bold text-center">Reset password</h2>
          <p className="text-muted-text text-center mt-1">
            Enter a new password to restore access to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="hidden"
            name="token"
            value={token}
            defaultValue={token}
          />

          <div className="form-group">
            <Lock size={16} className="icon-muted mb-2" />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              disabled={loading}
              className="input-full"
              aria-label="New password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`button button-primary w-full ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Resetting..." : "Update password"}
          </button>
        </form>

        <div className="reset-actions mt-6 text-center">
          <p className="text-muted-text text-sm">
            <Link href="/login" className="text-primary font-medium underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}