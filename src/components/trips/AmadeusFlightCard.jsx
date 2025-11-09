import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, Clock, Calendar, Save, Check } from "lucide-react";

export default function AmadeusFlightCard({ offer, onSave, isSaved, isDisabled }) {
  // Extract key information from Amadeus flight offer
  const itinerary = offer.itineraries?.[0]; // First itinerary (outbound)
  if (!itinerary) return null;

  const segments = itinerary.segments || [];
  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];
  
  if (!firstSegment || !lastSegment) return null;

  // Extract departure and arrival info
  const departure = {
    iataCode: firstSegment.departure.iataCode,
    time: new Date(firstSegment.departure.at).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }),
    date: new Date(firstSegment.departure.at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  };

  const arrival = {
    iataCode: lastSegment.arrival.iataCode,
    time: new Date(lastSegment.arrival.at).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }),
    date: new Date(lastSegment.arrival.at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  };

  // Calculate total duration
  const durationMatch = itinerary.duration?.match(/PT(\d+H)?(\d+M)?/);
  const hours = durationMatch?.[1] ? parseInt(durationMatch[1]) : 0;
  const minutes = durationMatch?.[2] ? parseInt(durationMatch[2]) : 0;
  const durationText = `${hours}h ${minutes}m`;

  // Get airline info from first segment
  const airline = firstSegment.carrierCode;
  const flightNumber = `${firstSegment.carrierCode}${firstSegment.number}`;

  // Get price
  const price = offer.price?.total || offer.price?.grandTotal;
  const currency = offer.price?.currency || 'EUR';

  // Number of stops
  const stops = segments.length - 1;
  const stopsText = stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        {/* Left: Flight route and times */}
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            {/* Departure */}
            <div className="text-center">
              <div className="text-2xl font-bold">{departure.time}</div>
              <div className="text-sm text-gray-600">{departure.iataCode}</div>
              <div className="text-xs text-gray-500">{departure.date}</div>
            </div>

            {/* Flight info */}
            <div className="flex-1 px-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="h-px bg-gray-300 flex-1"></div>
                <Plane className="w-4 h-4 text-gray-400 transform rotate-90" />
                <div className="h-px bg-gray-300 flex-1"></div>
              </div>
              <div className="text-center text-xs text-gray-600">{durationText}</div>
              <div className="text-center text-xs text-gray-500">{stopsText}</div>
            </div>

            {/* Arrival */}
            <div className="text-center">
              <div className="text-2xl font-bold">{arrival.time}</div>
              <div className="text-sm text-gray-600">{arrival.iataCode}</div>
              <div className="text-xs text-gray-500">{arrival.date}</div>
            </div>
          </div>

          {/* Airline and flight number */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Badge variant="outline">{airline}</Badge>
            <span>Flight {flightNumber}</span>
            {segments.length > 1 && (
              <span className="text-xs text-gray-500">
                via {segments.slice(0, -1).map(s => s.arrival.iataCode).join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Right: Price and action */}
        <div className="flex flex-col items-end gap-2 ml-6">
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {currency} {parseFloat(price).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">per person</div>
          </div>
          <Button
            onClick={isSaved ? undefined : onSave}
            disabled={isDisabled || isSaved}
            className={isSaved 
              ? "w-full bg-green-600 hover:bg-green-600 text-white" 
              : "w-full bg-green-600 hover:bg-green-700 text-white"}
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

      {/* Expandable details section */}
      <details className="mt-3 pt-3 border-t">
        <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-700">
          View flight details
        </summary>
        <div className="mt-3 space-y-2">
          {segments.map((segment, idx) => (
            <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold">{segment.departure.iataCode}</span>
                  {' → '}
                  <span className="font-semibold">{segment.arrival.iataCode}</span>
                </div>
                <div className="text-gray-600">
                  {segment.carrierCode} {segment.number}
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Departs: {new Date(segment.departure.at).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}
                {' • '}
                Arrives: {new Date(segment.arrival.at).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}
              </div>
            </div>
          ))}
        </div>
      </details>
    </Card>
  );
}
