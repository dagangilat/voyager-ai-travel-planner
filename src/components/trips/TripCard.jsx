import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ArrowRight, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusColors = {
  planning: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  completed: "bg-gray-100 text-gray-800 border-gray-200",
  cancelled: "bg-red-100 text-red-800 border-red-200"
};

export default function TripCard({ trip, destinations = [] }) {
  const tripDuration = differenceInDays(new Date(trip.return_date || trip.departure_date), new Date(trip.departure_date));
  const firstDestination = destinations[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Link to={createPageUrl(`TripDetails?id=${trip.id}`)}>
        <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-500 border-0 bg-white">
          <div className="h-48 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800')] bg-cover bg-center opacity-30 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="absolute top-4 right-4">
              <Badge className={`${statusColors[trip.status]} border backdrop-blur-sm font-medium px-3 py-1`}>
                {trip.status}
              </Badge>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
              <h3 className="text-2xl font-bold text-white mb-2">{trip.name}</h3>
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">{trip.origin}</span>
                {firstDestination && (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    <span className="font-medium">{firstDestination.location_name || firstDestination.location}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Departure</p>
                  <p className="text-sm font-semibold text-gray-900">{format(new Date(trip.departure_date), 'MMM d, yyyy')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Duration</p>
                  <p className="text-sm font-semibold text-gray-900">{tripDuration} days</p>
                </div>
              </div>
            </div>

            {destinations.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">{destinations.length} Destination{destinations.length > 1 ? 's' : ''}</p>
                <div className="flex flex-wrap gap-2">
                  {destinations.slice(0, 3).map((dest, idx) => (
                    <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                      {dest.location_name || dest.location}
                    </Badge>
                  ))}
                  {destinations.length > 3 && (
                    <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                      +{destinations.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}