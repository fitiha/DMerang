"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Lock, User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (isLogin) {
        const result = await signIn.email({
          email: formData.email,
          password: formData.password,
        });
        if (result.error) {
          setError(result.error.message || "Login failed");
          return;
        }
      } else {
        const result = await signUp.email({
          email: formData.email,
          password: formData.password,
          name: formData.name,
        });
        if (result.error) {
          setError(result.error.message || "Sign up failed");
          return;
        }
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "microsoft") => {
    try {
      setIsLoading(true);
      setError("");
      await signIn.social({
        provider,
        callbackURL: `${window.location.origin}/dashboard`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "OAuth sign in failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-muted">
        <div className="absolute inset-0">
          <img
            src="/login-bg.png"
            alt="DMerang Automation"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md border-none shadow-none bg-transparent">
          <CardHeader className="space-y-3 px-0">
            <div className="lg:hidden text-center mb-4">
              <h1 className="text-4xl font-bold text-primary mb-2">DMerang</h1>
            </div>
            <CardTitle className="text-4xl font-extralight text-primary tracking-tight">
              {isLogin ? "Welcome back" : "Create an account"}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {isLogin
                ? "Enter your email below to sign in or"
                : "Enter your details below to create your account or"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="text-primary hover:underline font-medium underline-offset-4"
              >
                {isLogin ? "Create an account" : "Sign in"}
              </button>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 px-0">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-medium">
                {error}
              </div>
            )}

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-foreground/80">
                    Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Nate Fish"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="h-12 bg-background border-input/50 focus:border-primary focus:ring-primary/20 transition-all rounded-lg"
                    required={!isLogin}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground/80">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nate@dmerang.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="h-12 bg-background border-input/50 focus:border-primary focus:ring-primary/20 transition-all rounded-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground/80">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="h-12 bg-background border-input/50 focus:border-primary focus:ring-primary/20 transition-all rounded-lg"
                  required
                  minLength={8}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-lg transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </>
                ) : isLogin ? (
                  "Sign in with email"
                ) : (
                  "Create account"
                )}
              </Button>
            </form>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-background px-4 text-muted-foreground font-medium">
                  Or continue with
                </span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuthSignIn("google")}
                disabled={isLoading}
                className="w-full h-12 font-medium border-input/50 hover:bg-muted/50 hover:border-input transition-all rounded-lg"
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuthSignIn("microsoft")}
                disabled={isLoading}
                className="w-full h-12 font-medium border-input/50 hover:bg-muted/50 hover:border-input transition-all rounded-lg"
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#f25022" d="M1 1h10v10H1z" />
                  <path fill="#00a4ef" d="M13 1h10v10H13z" />
                  <path fill="#7fba00" d="M1 13h10v10H1z" />
                  <path fill="#ffb900" d="M13 13h10v10H13z" />
                </svg>
                Microsoft
              </Button>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 px-0">
            <div className="text-sm text-center text-muted-foreground">
              By clicking continue, you agree to our{" "}
              <a href="#" className="underline hover:text-foreground underline-offset-4">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="underline hover:text-foreground underline-offset-4">
                Privacy Policy
              </a>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
