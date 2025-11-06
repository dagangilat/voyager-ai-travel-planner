import React, { useState } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane, Hotel, Star, Plus, Trash2, Save } from "lucide-react";

export default function AdminSettings() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
  queryFn: () => firebaseClient.auth.me(),
  });

  const [vendors, setVendors] = useState(
    user?.travel_vendors || {
      transportation: [],
      lodging: [],
      experiences: []
    }
  );

  const updateVendorsMutation = useMutation({
  mutationFn: (vendorData) => firebaseClient.auth.updateMe({ travel_vendors: vendorData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      alert('Vendor preferences saved!');
    },
  });

  const addVendor = (category) => {
    const newVendor = category === 'transportation' 
      ? { name: '', type: 'flight', base_url: '' }
      : category === 'lodging'
      ? { name: '', type: 'hotel', base_url: '' }
      : { name: '', base_url: '' };

    setVendors({
      ...vendors,
      [category]: [...(vendors[category] || []), newVendor]
    });
  };

  const removeVendor = (category, index) => {
    setVendors({
      ...vendors,
      [category]: vendors[category].filter((_, i) => i !== index)
    });
  };

  const updateVendor = (category, index, field, value) => {
    const updated = [...vendors[category]];
    updated[index][field] = value;
    setVendors({
      ...vendors,
      [category]: updated
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">Travel Vendor Settings</h1>

        <Tabs defaultValue="transportation" className="space-y-6">
          <TabsList className="bg-white/90 backdrop-blur-lg shadow-xl rounded-xl p-1">
            <TabsTrigger value="transportation" className="rounded-lg px-6">
              <Plane className="w-4 h-4 mr-2" />
              Transportation
            </TabsTrigger>
            <TabsTrigger value="lodging" className="rounded-lg px-6">
              <Hotel className="w-4 h-4 mr-2" />
              Lodging
            </TabsTrigger>
            <TabsTrigger value="experiences" className="rounded-lg px-6">
              <Star className="w-4 h-4 mr-2" />
              Experiences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transportation">
            <Card className="border-0 shadow-xl rounded-2xl">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                <CardTitle>Transportation Vendors</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {(vendors.transportation || []).map((vendor, index) => (
                  <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Vendor Name (e.g., Skyscanner)"
                        value={vendor.name}
                        onChange={(e) => updateVendor('transportation', index, 'name', e.target.value)}
                      />
                      <Select value={vendor.type} onValueChange={(value) => updateVendor('transportation', index, 'type', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flight">Flight</SelectItem>
                          <SelectItem value="train">Train</SelectItem>
                          <SelectItem value="bus">Bus</SelectItem>
                          <SelectItem value="ferry">Ferry</SelectItem>
                          <SelectItem value="car">Car Rental</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Base URL (e.g., https://www.skyscanner.com)"
                        value={vendor.base_url}
                        onChange={(e) => updateVendor('transportation', index, 'base_url', e.target.value)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVendor('transportation', index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button onClick={() => addVendor('transportation')} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Vendor
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lodging">
            <Card className="border-0 shadow-xl rounded-2xl">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
                <CardTitle>Lodging Vendors</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {(vendors.lodging || []).map((vendor, index) => (
                  <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Vendor Name (e.g., Booking.com)"
                        value={vendor.name}
                        onChange={(e) => updateVendor('lodging', index, 'name', e.target.value)}
                      />
                      <Select value={vendor.type} onValueChange={(value) => updateVendor('lodging', index, 'type', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hotel">Hotel</SelectItem>
                          <SelectItem value="airbnb">Airbnb</SelectItem>
                          <SelectItem value="hostel">Hostel</SelectItem>
                          <SelectItem value="resort">Resort</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Base URL (e.g., https://www.booking.com)"
                        value={vendor.base_url}
                        onChange={(e) => updateVendor('lodging', index, 'base_url', e.target.value)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVendor('lodging', index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button onClick={() => addVendor('lodging')} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Vendor
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="experiences">
            <Card className="border-0 shadow-xl rounded-2xl">
              <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
                <CardTitle>Experience Vendors</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {(vendors.experiences || []).map((vendor, index) => (
                  <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Vendor Name (e.g., GetYourGuide)"
                        value={vendor.name}
                        onChange={(e) => updateVendor('experiences', index, 'name', e.target.value)}
                      />
                      <Input
                        placeholder="Base URL (e.g., https://www.getyourguide.com)"
                        value={vendor.base_url}
                        onChange={(e) => updateVendor('experiences', index, 'base_url', e.target.value)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVendor('experiences', index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button onClick={() => addVendor('experiences')} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Vendor
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => updateVendorsMutation.mutate(vendors)}
            disabled={updateVendorsMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <Save className="w-4 h-4 mr-2" />
            Save All Settings
          </Button>
        </div>
      </div>
    </div>
  );
}