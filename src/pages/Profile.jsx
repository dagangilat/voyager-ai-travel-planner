import React, { useState } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, Plane, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import LocationSearchInput from "../components/common/LocationSearchInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Common country codes for phone numbers
const COUNTRY_CODES = [
  { code: "+1", country: "US/CA" },
  { code: "+44", country: "UK" },
  { code: "+972", country: "IL" },
  { code: "+33", country: "FR" },
  { code: "+49", country: "DE" },
  { code: "+39", country: "IT" },
  { code: "+34", country: "ES" },
  { code: "+61", country: "AU" },
  { code: "+81", country: "JP" },
  { code: "+86", country: "CN" },
  { code: "+91", country: "IN" },
];

export default function Profile() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: () => firebaseClient.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    country_code: '+1',
    mobile_phone: '',
    home_airport: '',
    home_airport_display: ''
  });

  React.useEffect(() => {
    if (user) {
      // Parse country code from mobile_phone if it exists
      let countryCode = '+1';
      let phoneNumber = user.mobile_phone || '';
      
      if (phoneNumber) {
        const matchedCode = COUNTRY_CODES.find(c => phoneNumber.startsWith(c.code));
        if (matchedCode) {
          countryCode = matchedCode.code;
          phoneNumber = phoneNumber.substring(countryCode.length).trim();
        }
      }

      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        country_code: countryCode,
        mobile_phone: phoneNumber,
        home_airport: user.home_airport || '',
        home_airport_display: user.home_airport_display || ''
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      // Combine country code with phone number
      const fullPhone = data.country_code + data.mobile_phone;
      await firebaseClient.auth.updateMe({
        full_name: data.full_name,
        mobile_phone: fullPhone,
        home_airport: data.home_airport,
        home_airport_display: data.home_airport_display
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setIsEditing(false);
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isFormValid = formData.full_name && formData.mobile_phone && formData.home_airport;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account settings and travel preferences</p>
        </motion.div>

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
                      // Reset form data
                      if (user) {
                        let countryCode = '+1';
                        let phoneNumber = user.mobile_phone || '';
                        
                        if (phoneNumber) {
                          const matchedCode = COUNTRY_CODES.find(c => phoneNumber.startsWith(c.code));
                          if (matchedCode) {
                            countryCode = matchedCode.code;
                            phoneNumber = phoneNumber.substring(countryCode.length).trim();
                          }
                        }

                        setFormData({
                          full_name: user.full_name || '',
                          email: user.email || '',
                          country_code: countryCode,
                          mobile_phone: phoneNumber,
                          home_airport: user.home_airport || '',
                          home_airport_display: user.home_airport_display || ''
                        });
                      }
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending || !isFormValid}
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
              <Label htmlFor="full_name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                disabled={!isEditing}
                placeholder="Enter your full name"
                className="border-gray-200 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile_phone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Mobile Phone <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Select
                  value={formData.country_code}
                  onValueChange={(value) => setFormData({ ...formData, country_code: value })}
                  disabled={!isEditing}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map((item) => (
                      <SelectItem key={item.code} value={item.code}>
                        {item.code} {item.country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="mobile_phone"
                  value={formData.mobile_phone}
                  onChange={(e) => setFormData({ ...formData, mobile_phone: e.target.value })}
                  disabled={!isEditing}
                  placeholder="234 567 8900"
                  className="flex-1 border-gray-200 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Plane className="w-4 h-4" />
                Home Airport <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                This will be used as the default departure airport when creating trips
              </p>
              {isEditing ? (
                <LocationSearchInput
                  id="home_airport"
                  value={formData.home_airport_display || formData.home_airport}
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

            {isEditing && !isFormValid && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">Required fields:</span> Please fill in all required fields marked with *
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
