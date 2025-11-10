import { ScrollArea } from "@/components/ui/scroll-area";

export default function TermsOfService() {
  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4 text-sm">
        <div>
          <h3 className="font-bold text-base mb-2">Voyager AI Travel Planner - Terms of Service</h3>
          <p className="text-xs text-gray-500">Last Updated: November 2025</p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">1. Acceptance of Terms</h4>
          <p className="text-gray-700">
            By accessing and using Voyager AI Travel Planner ("the Service"), you accept and agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use the Service.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">2. Service Provided "AS IS"</h4>
          <p className="text-gray-700">
            The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied, 
            including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">3. No Liability</h4>
          <p className="text-gray-700">
            We shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages, including but not limited to:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-700">
            <li>Errors or inaccuracies in travel information, recommendations, or itineraries</li>
            <li>Loss of profits, revenue, data, or use</li>
            <li>Travel disruptions, cancellations, or delays</li>
            <li>Issues with third-party services (airlines, hotels, activities)</li>
            <li>Any damages resulting from your use or inability to use the Service</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">4. AI-Generated Content</h4>
          <p className="text-gray-700">
            Our Service uses artificial intelligence to generate travel recommendations. AI-generated content may contain errors, 
            inaccuracies, or outdated information. You are solely responsible for verifying all information before making any travel arrangements 
            or bookings.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">5. Third-Party Services</h4>
          <p className="text-gray-700">
            The Service may provide links or integration with third-party services (airlines, hotels, activity providers). 
            We are not responsible for the availability, accuracy, content, or policies of these third-party services. 
            Your dealings with third parties are solely between you and such third parties.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">6. User Responsibility</h4>
          <p className="text-gray-700">
            You acknowledge and agree that:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-700">
            <li>You are responsible for all travel arrangements and bookings you make</li>
            <li>You must verify all travel information independently</li>
            <li>You must comply with all applicable laws and regulations</li>
            <li>You are responsible for obtaining necessary travel documents (passports, visas, etc.)</li>
            <li>You must have appropriate travel insurance</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">7. No Claims</h4>
          <p className="text-gray-700">
            By using the Service, you agree not to make any claims against us for any losses, damages, or issues arising from 
            your use of the Service or any travel arrangements made using the Service.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">8. Data and Privacy</h4>
          <p className="text-gray-700">
            We collect and process your data in accordance with our Privacy Policy. By using the Service, you consent to such 
            processing and warrant that all data provided by you is accurate.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">9. Email Notifications</h4>
          <p className="text-gray-700">
            By using the Service, you consent to receive email notifications regarding your trips and account. 
            You can manage your email preferences in your account settings.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">10. Modifications</h4>
          <p className="text-gray-700">
            We reserve the right to modify these Terms of Service at any time. Continued use of the Service after changes 
            constitutes acceptance of the modified terms.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">11. Termination</h4>
          <p className="text-gray-700">
            We reserve the right to terminate or suspend your access to the Service at any time, without prior notice, 
            for any reason, including breach of these Terms.
          </p>
        </div>

        <div className="border-t pt-4">
          <p className="text-gray-600 text-xs">
            By clicking "I Accept" or by using the Service, you acknowledge that you have read, understood, and agree to be bound 
            by these Terms of Service. If you do not agree, you must not use the Service.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
