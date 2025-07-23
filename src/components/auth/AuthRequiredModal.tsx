import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({
  isOpen,
  onClose,
  title = "Authentication Required",
  message = "You need to Sign in to Continue",
}) => {
  const navigate = useNavigate();

  const handleSignIn = () => {
    onClose();
    navigate("/", { state: { showAuth: true, authType: "login" } });
  };

  const handleCancel = () => {
    onClose();
    navigate(-1); // Go back to previous page
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-base text-gray-600">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-center gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button onClick={handleSignIn} className="w-full sm:w-auto">
            Sign In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AuthRequiredModal;
