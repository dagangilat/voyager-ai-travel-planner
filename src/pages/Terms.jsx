import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TermsOfService from "@/components/TermsOfService";
import { FileText } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Terms of Service</h1>
          </div>
          <p className="text-gray-600">
            Please read these terms carefully. By using Voyager AI Travel Planner, you agree to these terms.
          </p>
        </div>

        <Card className="border-0 shadow-xl rounded-2xl">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50 p-6">
            <CardTitle className="text-2xl font-bold">User Agreement</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <TermsOfService />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
