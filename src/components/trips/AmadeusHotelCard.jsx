import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Hotel, Star, MapPin, Save, Check } from "lucide-react";

export default function AmadeusHotelCard({ offer, onSave, isSaved, isDisabled }) {
  // Extract hotel information
  const hotel = offer?.hotel || {};
  const hotelName = hotel.name || offer.name || 'Hotel';
  const hotelId = hotel.hotelId || offer.hotelId;
  const cityCode = hotel.cityCode || offer.cityCode;
  
  // Get offers and pricing
  const offers = offer.offers || [];
  const hasOffers = offers.length > 0;
  const firstOffer = offers[0] || {};
  
  // Extract price information
  const price = firstOffer.price;
  const currency = price?.currency || 'USD';
  const total = price?.total || price?.base || 'N/A';
  const priceDisplay = total !== 'N/A' ? `${currency} ${parseFloat(total).toFixed(2)}` : 'Price on request';
  
  // Room information
  const room = firstOffer.room || {};
  const roomType = room.typeEstimated?.category || room.type || 'Standard Room';
  const bedType = room.typeEstimated?.bedType || '';
  const beds = room.typeEstimated?.beds || 1;
  
  // Guest information
  const guests = firstOffer.guests?.adults || 2;
  
  // Check-in/out info from offer
  const checkInDate = firstOffer.checkInDate;
  const checkOutDate = firstOffer.checkOutDate;
  
  // Calculate nights
  let nights = 1;
  if (checkInDate && checkOutDate) {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  }

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        {/* Left: Hotel info */}
        <div className="flex-1">
          <div className="flex items-start gap-3 mb-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Hotel className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{hotelName}</h3>
              {cityCode && (
                <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                  <MapPin className="w-3 h-3" />
                  <span>{cityCode}</span>
                  {hotelId && <span className="text-gray-400">• {hotelId}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Room details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">{roomType}</Badge>
              {bedType && <span className="text-gray-600">{bedType}</span>}
              {beds > 1 && <span className="text-gray-500">• {beds} beds</span>}
            </div>
            
            <div className="text-sm text-gray-600">
              <span>{nights} {nights === 1 ? 'night' : 'nights'}</span>
              <span className="mx-2">•</span>
              <span>{guests} {guests === 1 ? 'guest' : 'guests'}</span>
            </div>

            {checkInDate && checkOutDate && (
              <div className="text-xs text-gray-500">
                {new Date(checkInDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
                {' → '}
                {new Date(checkOutDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Price and action */}
        <div className="flex flex-col items-end gap-2 ml-6">
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {priceDisplay}
            </div>
            {total !== 'N/A' && (
              <div className="text-xs text-gray-500">
                for {nights} {nights === 1 ? 'night' : 'nights'}
              </div>
            )}
          </div>
          <Button
            onClick={() => onSave(offer)}
            disabled={isDisabled || isSaved || !hasOffers}
            className={isSaved 
              ? "bg-green-500 hover:bg-green-600 text-white px-6 cursor-not-allowed" 
              : "bg-green-500 hover:bg-green-600 text-white px-6"}
            size="default"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Saved to Trip
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save to Trip
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Expandable details */}
      {offers.length > 1 && (
        <details className="mt-3 pt-3 border-t">
          <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-700">
            View other room options ({offers.length - 1} more)
          </summary>
          <div className="mt-3 space-y-2">
            {offers.slice(1).map((roomOffer, idx) => {
              const roomPrice = roomOffer.price;
              const roomInfo = roomOffer.room?.typeEstimated || {};
              return (
                <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold">{roomInfo.category || 'Room'}</span>
                      {roomInfo.bedType && (
                        <span className="text-gray-600 ml-2">• {roomInfo.bedType}</span>
                      )}
                    </div>
                    <div className="text-blue-600 font-semibold">
                      {roomPrice?.currency} {parseFloat(roomPrice?.total || roomPrice?.base || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </Card>
  );
}
