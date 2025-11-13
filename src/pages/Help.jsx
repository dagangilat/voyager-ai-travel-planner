import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  HelpCircle, 
  PlusCircle, 
  Sparkles, 
  Share2, 
  Mail, 
  Calendar,
  MapPin,
  DollarSign,
  Zap,
  Eye,
  Edit,
  Trash2,
  Search,
  Check,
  ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Help() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "Creating a New Trip",
      icon: PlusCircle,
      color: "blue",
      screenshot: "/help-screenshots/create-trip.png", // Add your screenshot here
      actionButton: {
        label: "Create New Trip",
        onClick: () => navigate(createPageUrl("CreateTrip")),
        icon: PlusCircle
      },
      steps: [
        { icon: Calendar, text: "Click 'Plan New Trip' from the sidebar" },
        { icon: Edit, text: "Enter trip name, starting location, and departure date" },
        { icon: DollarSign, text: "Select your budget level (Economy, Premium, or Luxury)" },
        { icon: Zap, text: "Choose trip tempo (Chill, Adventure, Culture, Sports, or Mix)" },
        { icon: MapPin, text: "Add destinations with arrival dates and duration" },
        { icon: Check, text: "For each destination, optionally select visit focus (explore, nightlife, food, etc.)" },
        { icon: PlusCircle, text: "Click 'Create Trip' to save, or 'Create with AI' for automatic recommendations" },
      ]
    },
    {
      title: "Creating with AI",
      icon: Sparkles,
      color: "purple",
      screenshot: "/help-screenshots/create-with-ai.png", // Add your screenshot here
      actionButton: {
        label: "Try Create with AI",
        onClick: () => navigate(createPageUrl("CreateTrip")),
        icon: Sparkles
      },
      steps: [
        { icon: PlusCircle, text: "Follow the steps to create a new trip (name, dates, destinations)" },
        { icon: Sparkles, text: "Click 'Create with AI' button at the bottom" },
        { icon: Edit, text: "Select how many options you want for transportation, lodging, and experiences (1-3)" },
        { icon: Check, text: "Click 'Generate with AI' to start" },
        { icon: Eye, text: "Watch the progress bar as AI generates recommendations" },
        { icon: MapPin, text: "AI considers your budget level, tempo, and destination focuses" },
        { icon: Check, text: "Review all generated options and customize as needed" },
      ],
      note: "AI generation uses 1 credit per month. You get 1 free generation monthly."
    },
    {
      title: "Managing Your Trip",
      icon: Edit,
      color: "green",
      screenshot: "/help-screenshots/trip-details.png", // Add your screenshot here
      actionButton: {
        label: "View My Trips",
        onClick: () => navigate(createPageUrl("Dashboard")),
        icon: Eye
      },
      steps: [
        { icon: Eye, text: "Click on any trip from 'My Trips' to view details" },
        { icon: Edit, text: "Use the 'Edit Trip' button to modify dates, destinations, or preferences" },
        { icon: Sparkles, text: "Click 'AI Trip' to generate recommendations for existing trip" },
        { icon: Search, text: "Search for flights, hotels, and activities using search buttons" },
        { icon: Check, text: "Save items from search results to your trip" },
        { icon: Trash2, text: "Delete unwanted items or the entire trip" },
      ]
    },
    {
      title: "Sharing Your Trip",
      icon: Share2,
      color: "orange",
      screenshot: "/help-screenshots/share-trip.png", // Add your screenshot here
      steps: [
        { icon: Eye, text: "Open the trip you want to share" },
        { icon: Share2, text: "Click the 'Share' button at the top of the trip details" },
        { icon: Edit, text: "Enter the email address of the person you want to share with" },
        { icon: Check, text: "Choose their permission level (Viewer or Editor)" },
        { icon: Mail, text: "They'll receive an invitation to view/edit your trip" },
        { icon: Eye, text: "Viewers can see all trip details but cannot make changes" },
        { icon: Edit, text: "Editors can modify destinations, add items, and update plans" },
      ]
    },
    {
      title: "Email Notifications",
      icon: Mail,
      color: "red",
      screenshot: "/help-screenshots/email-example.png", // Add your screenshot here
      actionButton: {
        label: "Manage Email Settings",
        onClick: () => navigate(createPageUrl("Profile")),
        icon: Mail
      },
      steps: [
        { icon: Mail, text: "Receive beautiful emails when you create, update, or delete trips" },
        { icon: Calendar, text: "Emails include full itinerary with all destinations" },
        { icon: MapPin, text: "View departure dates, destinations, and duration for each stop" },
        { icon: DollarSign, text: "See your budget level and trip tempo" },
        { icon: Eye, text: "Click the link in email to view full trip details online" },
        { icon: Edit, text: "Manage email preferences in your Profile settings" },
        { icon: Check, text: "Toggle notifications on/off for created, updated, or deleted trips" },
      ]
    },
    {
      title: "Search & Book",
      icon: Search,
      color: "teal",
      screenshot: "/help-screenshots/search-results.png", // Add your screenshot here
      steps: [
        { icon: Search, text: "Use 'Search Flights', 'Search Hotels', or 'Search Activities' buttons" },
        { icon: MapPin, text: "Search results are based on your trip destinations and dates" },
        { icon: Eye, text: "Browse through options with real prices and availability" },
        { icon: Check, text: "Click 'Save to Trip' to add options you like" },
        { icon: Edit, text: "Items are saved as 'saved' status - book them when ready" },
        { icon: Share2, text: "Use 'Book Now' to visit provider's website and complete booking" },
      ]
    },
    {
      title: "Budget & Tempo",
      icon: DollarSign,
      color: "yellow",
      screenshot: "/help-screenshots/budget-tempo.png", // Add your screenshot here
      steps: [
        { icon: DollarSign, text: "Budget Level affects AI recommendations:" },
        { text: "  • Economy - Budget-friendly options, hostels, free activities" },
        { text: "  • Premium - Mid-range comfort, 3-4 star hotels, quality options" },
        { text: "  • Luxury - High-end exclusive, 5-star hotels, premium experiences" },
        { icon: Zap, text: "Trip Tempo controls activity intensity:" },
        { text: "  • Chill - Relaxed pace, 1-2 activities per day" },
        { text: "  • Adventure - Outdoor thrills, 3-4 activities per day" },
        { text: "  • Culture - Museums, history, local experiences" },
        { text: "  • Sports - Active recreation focus" },
        { text: "  • Mix - Balanced variety of activities" },
      ]
    },
    {
      title: "Visit Focus Tags",
      icon: MapPin,
      color: "indigo",
      screenshot: "/help-screenshots/visit-focus.png", // Add your screenshot here
      steps: [
        { icon: MapPin, text: "Add focus tags to each destination for better AI recommendations" },
        { icon: Check, text: "Available tags: Explore, Nightlife, Shopping, Beach, Food, Culture, Adventure, Rest" },
        { icon: Sparkles, text: "AI uses these to suggest relevant experiences and activities" },
        { icon: Edit, text: "You can select multiple focuses for each destination" },
        { icon: Eye, text: "Example: Paris with 'Culture' and 'Food' will suggest museums and restaurants" },
      ]
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: "bg-blue-100 text-blue-700 border-blue-200",
      purple: "bg-blue-100 text-blue-700 border-blue-200",  // Changed to blue
      green: "bg-blue-100 text-blue-700 border-blue-200",   // Changed to blue
      orange: "bg-sky-100 text-sky-700 border-sky-200",     // Light blue variant
      red: "bg-blue-100 text-blue-700 border-blue-200",     // Changed to blue
      teal: "bg-cyan-100 text-cyan-700 border-cyan-200",    // Blue-ish cyan
      yellow: "bg-sky-100 text-sky-700 border-sky-200",     // Light blue variant
      indigo: "bg-indigo-100 text-indigo-700 border-indigo-200", // Keep indigo (blue family)
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <HelpCircle className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Help Center</h1>
          </div>
          <p className="text-gray-600">
            Learn how to use Voyager AI Travel Planner to plan amazing trips
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section, idx) => (
            <Card key={idx} className="border-0 shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className={`border-b p-6 ${getColorClasses(section.color)}`}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    <section.icon className="w-7 h-7" />
                    {section.title}
                  </CardTitle>
                  {section.actionButton && (
                    <Button
                      onClick={section.actionButton.onClick}
                      className="bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
                      size="sm"
                    >
                      <section.actionButton.icon className="w-4 h-4 mr-2" />
                      {section.actionButton.label}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {section.steps.map((step, stepIdx) => (
                    <div key={stepIdx} className="flex items-start gap-3">
                      {step.icon && (
                        <div className={`mt-0.5 p-2 rounded-lg ${getColorClasses(section.color)}`}>
                          <step.icon className="w-5 h-5" />
                        </div>
                      )}
                      <p className={`text-gray-700 flex-1 ${step.icon ? 'pt-2' : 'pl-14'}`}>
                        {step.text}
                      </p>
                    </div>
                  ))}
                  
                  {section.screenshot && (
                    <div className="mt-6 rounded-lg overflow-hidden border border-gray-200 shadow-md">
                      <img 
                        src={section.screenshot} 
                        alt={`${section.title} interface`}
                        className="w-full h-auto"
                        onError={(e) => {
                          // Hide image if not found
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {section.note && (
                    <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                      <p className="text-sm text-blue-800 font-medium">
                        💡 {section.note}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
