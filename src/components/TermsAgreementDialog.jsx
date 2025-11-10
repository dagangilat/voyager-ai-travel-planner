import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import TermsOfService from "./TermsOfService";
import { AlertCircle } from "lucide-react";

export default function TermsAgreementDialog({ open, onAccept }) {
  const [hasRead, setHasRead] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    if (!hasRead) return;
    setIsAccepting(true);
    await onAccept();
    setIsAccepting(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-blue-600" />
            Terms of Service
          </DialogTitle>
          <DialogDescription>
            Please read and accept our Terms of Service to continue using Voyager AI Travel Planner
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <TermsOfService />
        </div>

        <div className="flex items-start space-x-3 rounded-lg border border-gray-200 p-4 bg-gray-50">
          <Checkbox
            id="terms-checkbox"
            checked={hasRead}
            onCheckedChange={setHasRead}
            className="mt-1"
          />
          <label
            htmlFor="terms-checkbox"
            className="text-sm leading-relaxed cursor-pointer"
          >
            I have read and agree to the Terms of Service. I understand that this service is provided "AS IS" 
            without any warranties or liability.
          </label>
        </div>

        <DialogFooter>
          <Button
            onClick={handleAccept}
            disabled={!hasRead || isAccepting}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700"
          >
            {isAccepting ? "Accepting..." : "I Accept"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
