
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Plane, Sparkles, Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import LocationSearchInput from "../components/common/LocationSearchInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Profile() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [selectedTopUp, setSelectedTopUp] = useState(null);
  // Removed showSuccessDialog state as it's no longer needed

  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
  });

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    mobile_phone: '',
    home_airport: '',
    home_airport_display: ''
  });

  React.useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        mobile_phone: user.mobile_phone || '',
        home_airport: user.home_airport || '',
        home_airport_display: user.home_airport_display || ''
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setIsEditing(false);
    },
  });

  // Removed topUpCreditsMutation as the payment flow is now external

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleTopUp = () => {
    if (selectedTopUp) {
      const option = topUpOptions.find(opt => opt.amount === selectedTopUp);
      if (option) {
        navigate(createPageUrl(`Payment?amount=${option.amount}&price=${option.price}`));
      }
    }
  };

  const topUpOptions = [
    { amount: 10, price: 9.99 },
    { amount: 20, price: 18.99 },
    { amount: 30, price: 26.99 },
    { amount: 50, price: 42.99 },
    { amount: 100, price: 79.99 },
  ];

  const aiCredits = user?.credits?.ai_generations_remaining || 0;
  const proSearchCredits = user?.credits?.pro_searches_remaining || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </motion.div>

        {/* AI Credits Status */}
        <Card className="border-0 shadow-xl rounded-2xl mb-6 bg-gradient-to-br from-purple-50 to-blue-50">
          <CardHeader className="border-b p-6">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  AI Credits
                </CardTitle>
                <CardDescription className="mt-1">Your available AI generations</CardDescription>
              </div>
              <Button
                onClick={() => setShowTopUpDialog(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Top Up Credits
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-600">AI Trip Generations</span>
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">{aiCredits}</div>
                <p className="text-sm text-gray-500">
                  {aiCredits === 0 && "Out of credits - top up to continue"}
                  {aiCredits > 0 && aiCredits <= 3 && "Running low - consider topping up"}
                  {aiCredits > 3 && "You have plenty of credits"}
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-600">Pro Searches</span>
                  <Plane className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">{proSearchCredits}</div>
                <p className="text-sm text-gray-500">
                  {proSearchCredits === 0 && "Out of searches - upgrade to Pro for unlimited"}
                  {proSearchCredits > 0 && `${proSearchCredits} Pro searches remaining`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card className="border-0 shadow-xl rounded-2xl">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50 p-6">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold">Profile Information</CardTitle>
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="border-blue-200 text-blue-700"
                >
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        full_name: user.full_name || '',
                        email: user.email || '',
                        mobile_phone: user.mobile_phone || '',
                        home_airport: user.home_airport || '',
                        home_airport_display: user.home_airport_display || ''
                      });
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                    className="bg-gradient-to-r from-blue-600 to-blue-700"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                disabled={!isEditing}
                className="border-gray-200 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                value={formData.email}
                disabled
                className="border-gray-200 bg-gray-50"
              />
              <p className="text-xs text-gray-500">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile_phone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Mobile Phone <span className="text-gray-400 text-xs">(Optional)</span>
              </Label>
              <Input
                id="mobile_phone"
                value={formData.mobile_phone}
                onChange={(e) => setFormData({ ...formData, mobile_phone: e.target.value })}
                disabled={!isEditing}
                placeholder="+1 234 567 8900"
                className="border-gray-200 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Plane className="w-4 h-4" />
                Home Airport <span className="text-gray-400 text-xs">(Optional)</span>
              </Label>
              {isEditing ? (
                <LocationSearchInput
                  id="home_airport"
                  value={formData.home_airport}
                  onChange={(code, displayName) => {
                    setFormData({
                      ...formData,
                      home_airport: code,
                      home_airport_display: displayName
                    });
                  }}
                  placeholder="Select your home airport"
                  includeAirportCodes={true}
                />
              ) : (
                <Input
                  value={formData.home_airport_display || formData.home_airport || 'Not set'}
                  disabled
                  className="border-gray-200 bg-gray-50"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Up Dialog */}
      <Dialog open={showTopUpDialog} onOpenChange={setShowTopUpDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              Top Up AI Credits
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Select the number of AI generations you'd like to purchase. Credits never expire!
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {topUpOptions.map((option) => (
              <button
                key={option.amount}
                onClick={() => setSelectedTopUp(option.amount)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedTopUp === option.amount
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedTopUp === option.amount ? 'bg-purple-600' : 'bg-gray-100'
                    }`}>
                      {selectedTopUp === option.amount ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <Sparkles className={`w-5 h-5 ${selectedTopUp === option.amount ? 'text-white' : 'text-gray-400'}`} />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-lg">{option.amount} AI Generations</p>
                      <p className="text-sm text-gray-500">
                        ${(option.price / option.amount).toFixed(2)} per generation
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl text-gray-900">${option.price}</p>
                    {option.amount >= 50 && (
                      <Badge className="bg-green-100 text-green-700">Best Value</Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={handleTopUp}
              disabled={!selectedTopUp}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Continue to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
