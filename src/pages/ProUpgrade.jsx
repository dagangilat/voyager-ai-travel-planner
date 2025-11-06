
import React, { useState } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Plane, Hotel, Star, Zap, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProUpgrade() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'

  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
  queryFn: () => firebaseClient.auth.me(),
    staleTime: Infinity,
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      // For testing, just upgrade directly
      // In production, integrate with Stripe here
  await firebaseClient.auth.updateMe({
        pro_subscription: {
          status: 'pro',
          subscribed_at: new Date().toISOString()
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] }); // Invalidate for badge refresh
      setShowSuccessDialog(true);
    }
  });

  const downgradeMutation = useMutation({
    mutationFn: async () => {
  await firebaseClient.auth.updateMe({
        pro_subscription: {
          status: 'free',
          subscribed_at: null
        },
        credits: { // Add initial credits upon downgrade
          pro_searches_remaining: 10,
          ai_generations_remaining: 1
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] }); // Invalidate for badge refresh
      setShowDowngradeDialog(false);
      navigate(createPageUrl('Dashboard'));
    }
  });

  const proStatus = user?.pro_subscription?.status;
  const isPro = proStatus === 'pro';
  const isTrial = proStatus === 'trial';
  const hasDiscount = user?.discount_offered || (user?.credits?.pro_searches_remaining === 0 && user?.credits?.ai_generations_remaining === 0);

  const proFeatures = [
    { icon: Sparkles, title: "Real-time Amadeus Flight Data", desc: "Access live flight prices and availability from 400+ airlines" },
    { icon: Hotel, title: "Amadeus Hotel Search", desc: "Search 150,000+ hotels with real-time pricing and availability" },
    { icon: Star, title: "Amadeus Activities", desc: "Discover and book tours and experiences worldwide" },
    { icon: Zap, title: "AI Trip Generation", desc: "Generate complete trip itineraries with transportation, lodging, and experiences" },
    { icon: Crown, title: "Priority Support", desc: "Get help faster with dedicated pro support" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const monthlyPrice = hasDiscount ? 4.5 : 9;
  const yearlyPricePerMonth = hasDiscount ? 3.5 : 7;
  const yearlyPriceTotal = yearlyPricePerMonth * 12;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block"
          >
            <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 text-sm mb-4">
              <Crown className="w-4 h-4 mr-2" />
              Voyager Pro
            </Badge>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
          >
            Unlock Premium Travel Planning
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-600"
          >
            Get access to real-time data from Amadeus and AI-powered features
          </motion.p>
          {hasDiscount && !isPro && !isTrial && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 inline-block"
            >
              <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 text-lg font-bold">
                🎉 Limited Time: 50% OFF!
              </Badge>
            </motion.div>
          )}
        </div>

        {/* Billing Toggle */}
        {!isPro && !isTrial && (
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-xl p-1 shadow-lg inline-flex">
              <Button
                variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
                onClick={() => setBillingCycle('monthly')}
                className="rounded-lg"
              >
                Monthly
              </Button>
              <Button
                variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
                onClick={() => setBillingCycle('yearly')}
                className="rounded-lg"
              >
                Yearly
                <Badge className="ml-2 bg-green-100 text-green-700 text-xs">Save 22%</Badge>
              </Button>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-2 border-gray-200 rounded-2xl">
              <CardHeader className="bg-gray-50 p-6 rounded-t-2xl">
                <CardTitle className="text-2xl font-bold text-gray-900">Free</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">$0</span>
                  <span className="text-gray-500">/month</span>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">10 Pro searches included</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">1 AI trip generation included</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">AI-powered search results</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Manual trip planning</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Basic itinerary management</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Trip sharing</span>
                  </li>
                </ul>
                {!isPro && !isTrial && (
                  <Button
                    variant="outline"
                    className="w-full mt-6"
                    disabled
                  >
                    Current Plan
                  </Button>
                )}
                {(isPro || isTrial) && (
                  <Button
                    onClick={() => setShowDowngradeDialog(true)}
                    variant="outline"
                    className="w-full mt-6"
                  >
                    Downgrade to Free
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-2 border-blue-600 rounded-2xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-br from-blue-600 to-purple-600 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                POPULAR
              </div>
              <CardHeader className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-t-2xl">
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Crown className="w-6 h-6 text-blue-600" />
                  Pro
                </CardTitle>
                <div className="mt-4">
                  {hasDiscount && (
                    <div className="mb-2">
                      <span className="text-2xl text-gray-400 line-through">${billingCycle === 'monthly' ? '9' : '84'}</span>
                    </div>
                  )}
                  <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    ${billingCycle === 'monthly' ? monthlyPrice : yearlyPriceTotal}
                  </span>
                  <span className="text-gray-500">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                  {billingCycle === 'yearly' && (
                    <p className="text-sm text-gray-600 mt-2">${yearlyPricePerMonth}/month billed annually</p>
                  )}
                </div>
                {isTrial && (
                  <Badge className="mt-2 bg-green-100 text-green-700">
                    You're on a free trial!
                  </Badge>
                )}
                {hasDiscount && !isPro && !isTrial && (
                  <Badge className="mt-2 bg-red-100 text-red-700">
                    50% OFF - Limited Time!
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm font-semibold text-gray-900 mb-4">Everything in Free, plus:</p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Unlimited Everything</p>
                      <p className="text-sm text-gray-600">No limits on searches or AI generations</p>
                    </div>
                  </li>
                  {proFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <feature.icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{feature.title}</p>
                        <p className="text-sm text-gray-600">{feature.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => {
                    if (!isPro && !isTrial) {
                      upgradeMutation.mutate();
                    }
                  }}
                  disabled={isPro || isTrial || upgradeMutation.isPending}
                  className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                >
                  {(isPro || isTrial) ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Current Plan
                    </>
                  ) : upgradeMutation.isPending ? (
                    'Processing...'
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {hasDiscount ? 'Get 50% OFF Now' : 'Upgrade to Pro'}
                    </>
                  )}
                </Button>
                {isTrial && (
                  <p className="text-xs text-center text-gray-500 mt-2">
                    Try all Pro features for free during trial
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* FAQ or Additional Info */}
        <Card className="border-0 shadow-xl rounded-2xl">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 p-6">
            <CardTitle className="text-2xl font-bold">Why Upgrade to Pro?</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plane className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Real-Time Data</h3>
                <p className="text-sm text-gray-600">
                  Access live prices and availability from Amadeus, the world's leading travel technology provider
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Save Time</h3>
                <p className="text-sm text-gray-600">
                  AI generates complete trip itineraries in seconds, including transportation, lodging, and experiences
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Premium Support</h3>
                <p className="text-sm text-gray-600">
                  Get priority email support and help with your travel planning questions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <Crown className="w-8 h-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-center">Welcome to Voyager Pro!</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              You now have access to unlimited real-time Amadeus data and all premium AI features.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                navigate(createPageUrl('Dashboard'));
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Start Planning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Downgrade Confirmation Dialog */}
      <Dialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Downgrade to Free Plan?</DialogTitle>
            <DialogDescription className="text-base pt-2">
              Are you sure you want to downgrade? You'll get 10 Pro searches and 1 AI generation, but lose unlimited access to Amadeus real-time data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDowngradeDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => downgradeMutation.mutate()}
              disabled={downgradeMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {downgradeMutation.isPending ? 'Downgrading...' : 'Downgrade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
