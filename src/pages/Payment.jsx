
import React, { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Loader2, ArrowLeft, CreditCard } from "lucide-react";
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

export default function Payment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const amount = parseInt(urlParams.get('amount')) || 10;
  const price = parseFloat(urlParams.get('price')) || 9.99;

  const [processingMethod, setProcessingMethod] = useState(null); // 'apple_pay', 'google_pay', or null
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [googlePayAvailable, setGooglePayAvailable] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
  queryFn: () => firebaseClient.auth.me(),
    staleTime: Infinity,
  });

  useEffect(() => {
    // Check Apple Pay availability
    if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
      setApplePayAvailable(true);
    }

    // Check Google Pay availability
    if (window.google && window.google.payments) {
      setGooglePayAvailable(true);
    }
  }, []);

  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData) => {
  const response = await firebaseClient.functions.invoke('processPayment', paymentData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseHistory'] });
      setShowSuccessDialog(true);
    },
    onError: (error) => {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    },
    onSettled: () => {
      setProcessingMethod(null);
    }
  });

  const handleApplePay = async () => {
    if (!applePayAvailable) return;

    setProcessingMethod('apple_pay');

    // For development/sandbox - always simulate Apple Pay
    // In production, you would integrate with a real payment processor
    await simulatePayment('apple_pay');
    
    /* 
    // Real Apple Pay integration would look like this (NOT IMPLEMENTED - FOR REFERENCE ONLY):
    try {
      const paymentRequest = {
        countryCode: 'US',
        currencyCode: 'USD',
        supportedNetworks: ['visa', 'masterCard', 'amex'],
        merchantCapabilities: ['supports3DS'],
        total: {
          label: `${amount} AI Credits`,
          amount: price.toString()
        }
      };

      const session = new ApplePaySession(3, paymentRequest);

      session.onvalidatemerchant = async (event) => {
        // Would need to validate with your payment processor server
        // and get a merchant session from Apple
        const merchantSession = await yourPaymentProcessor.validateMerchant(event.validationURL);
        session.completeMerchantValidation(merchantSession);
      };

      session.onpaymentauthorized = async (event) => {
        // Would send the payment token to your payment processor
        const result = await yourPaymentProcessor.processPayment(event.payment.token);
        
        if (result.success) {
          await processPaymentMutation.mutateAsync({
            amount,
            price,
            payment_method: 'apple_pay',
            transaction_id: result.transactionId,
            user_email: user.email
          });
          session.completePayment(ApplePaySession.STATUS_SUCCESS);
        } else {
          session.completePayment(ApplePaySession.STATUS_FAILURE);
        }
      };

      session.begin();
    } catch (error) {
      console.error('Apple Pay error:', error);
      setProcessingMethod(null);
    }
    */
  };

  const handleGooglePay = async () => {
    setProcessingMethod('google_pay');

    // For development/sandbox - always simulate Google Pay
    await simulatePayment('google_pay');

    /*
    // Real Google Pay integration would look like this (NOT IMPLEMENTED - FOR REFERENCE ONLY):
    if (!googlePayAvailable) {
      await simulatePayment('google_pay');
      return;
    }

    try {
      const paymentsClient = new google.payments.api.PaymentsClient({
        environment: 'TEST' // Use 'PRODUCTION' for live payments
      });

      const paymentDataRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [{
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['MASTERCARD', 'VISA']
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: 'YOUR_PAYMENT_GATEWAY', // e.g., 'stripe', 'square'
              gatewayMerchantId: 'YOUR_MERCHANT_ID'
            }
          }
        }],
        merchantInfo: {
          merchantName: 'Voyager Travel Planner',
          merchantId: 'YOUR_GOOGLE_PAY_MERCHANT_ID'
        },
        transactionInfo: {
          totalPriceStatus: 'FINAL',
          totalPrice: price.toString(),
          currencyCode: 'USD',
          countryCode: 'US'
        }
      };

      const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
      
      // Send payment token to your payment processor
      const result = await yourPaymentProcessor.processPayment(paymentData.paymentMethodData.tokenizationData.token);
      
      await processPaymentMutation.mutateAsync({
        amount,
        price,
        payment_method: 'google_pay',
        transaction_id: result.transactionId,
        user_email: user.email
      });
    } catch (error) {
      console.error('Google Pay error:', error);
      setProcessingMethod(null);
    }
    */
  };

  const simulatePayment = async (method) => {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const paymentData = {
      userId: user.id, // user.id is the Firebase uid
      amount,
      price,
      paymentMethod: method,
      transaction_id: `${method.toUpperCase()}_${Date.now()}`,
      user_email: user.email
    };
    
    console.log('🔍 Payment data being sent:', paymentData);
    
    await processPaymentMutation.mutateAsync(paymentData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('Profile'))}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Complete Your Purchase</h1>
          <p className="text-gray-600">Choose your payment method</p>
        </motion.div>

        {/* Order Summary */}
        <Card className="border-0 shadow-xl rounded-2xl mb-6">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-t-2xl">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4 pb-4 border-b">
              <div>
                <p className="text-lg font-semibold text-gray-900">{amount} AI Credits</p>
                <p className="text-sm text-gray-500">${(price / amount).toFixed(2)} per credit</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-purple-600">${price.toFixed(2)}</p>
              </div>
            </div>
            {amount >= 50 && (
              <Badge className="bg-green-100 text-green-700">Best Value - Save up to 15%</Badge>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="border-0 shadow-xl rounded-2xl mb-6">
          <CardHeader className="border-b p-6">
            <CardTitle className="text-xl font-bold">Payment Method</CardTitle>
            <CardDescription>Select how you'd like to pay</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Apple Pay */}
            <Button
              onClick={handleApplePay}
              disabled={!applePayAvailable || processingMethod !== null}
              className={`w-full h-16 text-lg font-semibold ${
                applePayAvailable 
                  ? 'bg-black hover:bg-gray-900 text-white' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {processingMethod === 'apple_pay' ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <span className="text-2xl mr-3"></span>
                  Pay with Apple Pay
                </>
              )}
            </Button>

            {/* Google Pay */}
            <Button
              onClick={handleGooglePay}
              disabled={processingMethod !== null}
              className="w-full h-16 text-lg font-semibold bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300"
            >
              {processingMethod === 'google_pay' ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                  </svg>
                  Pay with Google Pay
                </>
              )}
            </Button>

            {/* Development Notice */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>⚠️ Test/Sandbox Mode:</strong> These are simulated payments. No real charges will be made. 
                All transactions are for testing purposes only.
                {!applePayAvailable && " Apple Pay is only available on Safari on macOS or iOS devices."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center text-sm text-gray-500">
          <p>🔒 Your payment information is secure and encrypted</p>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-center">Payment Successful!</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              {amount} AI credits have been added to your account. Start generating amazing trips!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => navigate(createPageUrl('Profile'))}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              Go to Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
