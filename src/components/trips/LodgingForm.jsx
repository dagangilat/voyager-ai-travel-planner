
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Hotel, Save } from "lucide-react";
import { motion } from "framer-motion";
import LocationSearchInput from "../common/LocationSearchInput";

export default function LodgingForm({ lodging, onSave, onCancel, minDate, maxDate }) {
  const [formData, setFormData] = React.useState({
    name: lodging?.name || '',
    type: lodging?.type || 'hotel',
    location: lodging?.location || '',
    location_display: lodging?.location_display || '',
    check_in_date: lodging?.check_in_date || '',
    check_out_date: lodging?.check_out_date || '',
    price_per_night: lodging?.price_per_night || '',
    booking_reference: lodging?.booking_reference || '',
    booking_url: lodging?.booking_url || '',
    status: lodging?.status || 'saved',
    rating: lodging?.rating || '',
    details: lodging?.details || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedData = { ...formData };
    
    if (cleanedData.price_per_night && !isNaN(parseFloat(cleanedData.price_per_night))) {
      cleanedData.price_per_night = parseFloat(cleanedData.price_per_night);
      const nights = Math.ceil((new Date(cleanedData.check_out_date) - new Date(cleanedData.check_in_date)) / (1000 * 60 * 60 * 24));
      cleanedData.total_price = cleanedData.price_per_night * nights;
    } else {
      delete cleanedData.price_per_night;
      delete cleanedData.total_price;
    }

    if (cleanedData.rating && !isNaN(parseFloat(cleanedData.rating))) {
      cleanedData.rating = parseFloat(cleanedData.rating);
    } else {
      delete cleanedData.rating;
    }
    
    onSave(cleanedData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-lg p-6 mb-6"
    >
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        {lodging ? 'Edit Lodging' : 'Add Lodging'}
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4"> {/* This div applies space-y-4 to the form content */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Property Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Hotel name"
              className="border-gray-200"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Accommodation Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotel">🏨 Hotel</SelectItem>
                  <SelectItem value="airbnb">🏠 Airbnb</SelectItem>
                  <SelectItem value="hostel">🛏️ Hostel</SelectItem>
                  <SelectItem value="resort">🏖️ Resort</SelectItem>
                  <SelectItem value="apartment">🏢 Apartment</SelectItem>
                  <SelectItem value="villa">🏰 Villa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <LocationSearchInput
              id="location"
              label="Location"
              value={formData.location}
              onChange={(code, displayName) => {
                setFormData({
                  ...formData,
                  location: code,
                  location_display: displayName // Store full "City, Country [CODE]" format
                });
              }}
              placeholder="City or area"
              includeAirportCodes={false}
            />

            <div className="space-y-2">
              <Label htmlFor="check_in_date" className="text-sm font-semibold text-gray-700">Check-in Date</Label>
              <Input
                id="check_in_date"
                type="date"
                value={formData.check_in_date}
                onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                min={minDate}
                max={maxDate}
                className="border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="check_out_date" className="text-sm font-semibold text-gray-700">Check-out Date</Label>
              <Input
                id="check_out_date"
                type="date"
                value={formData.check_out_date}
                onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                min={formData.check_in_date || minDate}
                max={maxDate}
                className="border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_per_night" className="text-sm font-semibold text-gray-700">Price per Night (Optional)</Label>
              <Input
                id="price_per_night"
                type="number"
                step="0.01"
                value={formData.price_per_night}
                onChange={(e) => setFormData({ ...formData, price_per_night: e.target.value })}
                placeholder="0.00"
                className="border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rating" className="text-sm font-semibold text-gray-700">Rating (Optional)</Label>
              <Input
                id="rating"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                placeholder="0-10"
                className="border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking_reference" className="text-sm font-semibold text-gray-700">Booking Reference (Optional)</Label>
              <Input
                id="booking_reference"
                value={formData.booking_reference}
                onChange={(e) => setFormData({ ...formData, booking_reference: e.target.value })}
                placeholder="e.g., ABC123"
                className="border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saved">Saved</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking_url" className="text-sm font-semibold text-gray-700">Booking URL (Optional)</Label>
            <Input
              id="booking_url"
              value={formData.booking_url}
              onChange={(e) => setFormData({ ...formData, booking_url: e.target.value })}
              placeholder="https://www.booking.com/hotel/..."
              className="border-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="details" className="text-sm font-semibold text-gray-700">Details (Optional)</Label>
            <Textarea
              id="details"
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              placeholder="Room type, amenities, special requests, etc."
              className="border-gray-200 h-20 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!formData.name || !formData.check_in_date || !formData.check_out_date}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 shadow-lg"
          >
            {lodging ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Lodging
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
