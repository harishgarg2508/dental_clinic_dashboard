"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(password);
      toast.success("Successfully logged in!");
      onOpenChange(false);
    } catch (error) {
      let message = "Invalid password";
      if (error instanceof Error) {
        message = error.message;
      }
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
<Dialog open={open} onOpenChange={onOpenChange}
    // Prevent closing on Escape key press
>
    <DialogContent
      className="bg-gradient-to-b from-blue-50 to-white 
      text-gray-800 
      rounded-2xl shadow-xl 
      border border-blue-100 
      max-w-md w-[95vw] p-6"
      // Prevent closing on outside click
      onEscapeKeyDown={(e:any) => e.preventDefault()}
      onInteractOutside={(e: any) => e.preventDefault()}
    >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-blue-700">
            Secure Login
          </DialogTitle>
          <p className="text-sm text-gray-500">
            Please enter your password to continue
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-gray-700 font-medium text-sm"
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border border-gray-300 focus:border-blue-400 
                         focus:ring focus:ring-blue-100 
                         rounded-lg px-3 py-2"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white 
                         px-6 py-2 rounded-lg shadow-sm 
                         transition-colors duration-200"
            >
              {isLoading ? "Loading..." : "Login"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
