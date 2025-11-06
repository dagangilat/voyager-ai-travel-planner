import React, { useState } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import TripCard from "../components/trips/TripCard";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['user'],
  queryFn: () => firebaseClient.auth.me(),
    staleTime: Infinity,
  });

  const { data: trips, isLoading: loadingTrips, error: tripsError } = useQuery({
    queryKey: ['trips', user?.email],
    queryFn: async () => {
      // Query trips directly - Base44 will automatically filter to user's trips
  const allTrips = await firebaseClient.entities.Trip.list('-departure_date');
      console.log('Fetched trips:', allTrips);
      return allTrips;
    },
    enabled: !!user,
    retry: 1
  });

  const { data: destinations } = useQuery({
    queryKey: ['destinations', user?.email],
  queryFn: () => firebaseClient.entities.Destination.list('order'),
    initialData: [],
    enabled: !!user,
  });

  const getDestinationsForTrip = (tripId) => {
    if (!destinations) return [];
    return destinations.filter(d => d.trip_id === tripId).sort((a,b) => a.order - b.order);
  };
  
  if (loadingUser || loadingTrips) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (tripsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error loading trips: {tripsError.message}
            </AlertDescription>
          </Alert>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['trips'] })}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">My Trips</h1>
            <p className="text-gray-500 mt-1">Your upcoming and past adventures</p>
          </div>
          <Button 
            onClick={() => navigate(createPageUrl("CreateTrip"))}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg px-6"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Trip
          </Button>
        </div>

        {trips && trips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <TripCard 
                key={trip.id} 
                trip={trip}
                destinations={getDestinationsForTrip(trip.id)} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-800">No trips planned yet!</h2>
            <p className="text-gray-500 mt-2 mb-6">Ready to plan your next adventure?</p>
            <Button
              size="lg"
              onClick={() => navigate(createPageUrl("CreateTrip"))}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg px-8"
            >
              Create Your First Trip
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}