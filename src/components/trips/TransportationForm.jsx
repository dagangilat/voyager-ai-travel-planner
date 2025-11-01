
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Plane, Save } from "lucide-react";
import { motion } from "framer-motion";
import LocationSearchInput from "../common/LocationSearchInput";
import { format } from "date-fns";

export default function TransportationForm({ transportation, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    type: transportation?.type || 'flight',
    from_location: transportation?.from_location || '',
    from_location_display: transportation?.from_location_display || '',
    to_location: transportation?.to_location || '',
    to_location_display: transportation?.to_location_display || '',
    departure_datetime: transportation?.departure_datetime || '',
    arrival_datetime: transportation?.arrival_datetime || '',
    provider: transportation?.provider || '',
    booking_reference: transportation?.booking_reference || '',
    price: transportation?.price || '',
    status: transportation?.status || 'saved',
    details: transportation?.details || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedData = { ...formData };
    
    if (cleanedData.price && !isNaN(parseFloat(cleanedData.price))) {
      cleanedData.price = parseFloat(cleanedData.price);
    } else {
      delete cleanedData.price;
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
        {transportation ? 'Edit Transportation' : 'Add Transportation'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-700">Transportation Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flight">✈️ Flight</SelectItem>
              <SelectItem value="train">🚂 Train</SelectItem>
              <SelectItem value="bus">🚌 Bus</SelectItem>
              <SelectItem value="ferry">⛴️ Ferry</SelectItem>
              <SelectItem value="car">🚗 Car Rental</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <LocationSearchInput
            id="from_location"
            label="From"
            value={formData.from_location}
            onChange={(code, displayName) => {
              setFormData({
                ...formData,
                from_location: code,
                from_location_display: displayName
              });
            }}
            placeholder="Departure location"
            includeAirportCodes={true}
          />

          <LocationSearchInput
            id="to_location"
            label="To"
            value={formData.to_location}
            onChange={(code, displayName) => {
              setFormData({
                ...formData,
                to_location: code,
                to_location_display: displayName
              });
            }}
            placeholder="Arrival location"
            includeAirportCodes={true}
          />

          <div className="space-y-2">
            <Label htmlFor="departure_datetime" className="text-sm font-semibold text-gray-700">Departure Date & Time</Label>
            <Input
              id="departure_datetime"
              type="datetime-local"
              value={formData.departure_datetime ? format(new Date(formData.departure_datetime), "yyyy-MM-dd'T'HH:mm") : ''}
              onChange={(e) => setFormData({ ...formData, departure_datetime: e.target.value })}
              className="border-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="arrival_datetime" className="text-sm font-semibold text-gray-700">Arrival Date & Time</Label>
            <Input
              id="arrival_datetime"
              type="datetime-local"
              value={formData.arrival_datetime ? format(new Date(formData.arrival_datetime), "yyyy-MM-dd'T'HH:mm") : ''}
              onChange={(e) => setFormData({ ...formData, arrival_datetime: e.target.value })}
              className="border-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider" className="text-sm font-semibold text-gray-700">Provider (Optional)</Label>
            <Input
              id="provider"
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              placeholder="e.g., United Airlines, Amtrak"
              className="border-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price" className="text-sm font-semibold text-gray-700">Price (Optional)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
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
          <Label htmlFor="details" className="text-sm font-semibold text-gray-700">Details (Optional)</Label>
          <Textarea
            id="details"
            value={formData.details}
            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
            placeholder="Flight number, seat, gate, etc."
            className="border-gray-200 h-20 resize-none"
          />
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
            disabled={!formData.from_location || !formData.to_location || !formData.departure_datetime}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 shadow-lg"
          >
            {transportation ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Transportation
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
