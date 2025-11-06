
import React, { useState } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, MapPin, Plane, Hotel, Loader2, Search, Edit, Trash2, Plus, Star, Sparkles, ExternalLink, Train, Bus, Ship, Car, Building2, Home, Bed, Castle, UtensilsCrossed, Compass, Waves, Mountain, Palette, Theater, Laugh, Bath, Users, Mail, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import DestinationForm from "../components/trips/DestinationForm";
import TransportationForm from "../components/trips/TransportationForm";
import LodgingForm from "../components/trips/LodgingForm";
import ExperienceForm from "../components/trips/ExperienceForm";
import ShareTripDialog from "../components/trips/ShareTripDialog";

export default function TripDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const tripId = urlParams.get('id');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteTripDialog, setShowDeleteTripDialog] = useState(false);
  const [showDeleteDestDialog, setShowDeleteDestDialog] = useState(false);
  const [destinationToDelete, setDestinationToDelete] = useState(null);
  const [showDestinationForm, setShowDestinationForm] = useState(false);
  const [editingDestination, setEditingDestination] = useState(null);

  // Add transportation form state
  const [showTransportationForm, setShowTransportationForm] = useState(false);
  const [editingTransportation, setEditingTransportation] = useState(null);
  const [showDeleteTransportDialog, setShowDeleteTransportDialog] = useState(false);
  const [transportationToDelete, setTransportationToDelete] = useState(null);

  // Add lodging form state
  const [showLodgingForm, setShowLodgingForm] = useState(false);
  const [editingLodging, setEditingLodging] = useState(null);
  const [showDeleteLodgingDialog, setShowDeleteLodgingDialog] = useState(false);
  const [lodgingToDelete, setLodgingToDelete] = useState(null);

  const [showExperienceForm, setShowExperienceForm] = useState(false);
  const [editingExperience, setEditingExperience] = useState(null);
  const [showDeleteExperienceDialog, setShowDeleteExperienceDialog] = useState(false);
  const [experienceToDelete, setExperienceToDelete] = useState(null);
  // Removed findingLinkFor state as AI link finding mutation is removed

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [loadingBookingUrls, setLoadingBookingUrls] = useState(new Set()); // New state for tracking loading booking URLs

  // New states for general purpose dialogs
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogTitle, setConfirmDialogTitle] = useState('');
  const [confirmDialogDescription, setConfirmDialogDescription] = useState('');
  const [confirmDialogAction, setConfirmDialogAction] = useState(() => () => {});
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [warningDialogTitle, setWarningDialogTitle] = useState('');
  const [warningDialogDescription, setWarningDialogDescription] = useState('');
  const [generationSuccess, setGenerationSuccess] = useState(false);

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['user'],
  queryFn: () => firebaseClient.auth.me(),
    staleTime: Infinity,
  });

  const { data: trip, isLoading: loadingTrip } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
  const trips = await firebaseClient.entities.Trip.filter({ id: tripId });
      return trips[0];
    },
    enabled: !!tripId && !!user
  });

  // Always allow edit if user can see the trip
  const canEdit = true; // Simplified - if you can see it, you can edit it

  const { data: destinations = [] } = useQuery({
    queryKey: ['destinations', tripId],
  queryFn: () => firebaseClient.entities.Destination.filter({ trip_id: tripId }, 'order'),
    enabled: !!trip
  });

  const { data: transportation = [] } = useQuery({
    queryKey: ['transportation', tripId],
    queryFn: async () => {
  const data = await firebaseClient.entities.Transportation.filter({ trip_id: tripId });
      // Sort by departure_datetime - earliest first
      return data.sort((a, b) => new Date(a.departure_datetime) - new Date(b.departure_datetime));
    },
    enabled: !!trip
  });

  const { data: lodging = [] } = useQuery({
    queryKey: ['lodging', tripId],
    queryFn: async () => {
  const data = await firebaseClient.entities.Lodging.filter({ trip_id: tripId });
      // Sort by check_in_date - earliest first
      return data.sort((a, b) => new Date(a.check_in_date) - new Date(b.check_in_date));
    },
    enabled: !!trip
  });

  const { data: experiences = [] } = useQuery({
    queryKey: ['experiences', tripId],
    queryFn: async () => {
  const data = await firebaseClient.entities.Experience.filter({ trip_id: tripId });
      // Sort by date - earliest first
      return data.sort((a, b) => new Date(a.date) - new Date(b.date));
    },
    enabled: !!trip
  });

  const updateTripMutation = useMutation({
  mutationFn: ({ id, data }) => firebaseClient.entities.Trip.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      setShowShareDialog(false);
    },
    onError: (error) => {
      setErrorMessage(`Failed to update trip: ${error.message}`);
      setShowErrorDialog(true);
    }
  });

  // Removed findBookingLinkMutation and associated logic

  const deleteTripMutation = useMutation({
    mutationFn: async () => {
      const deletePromises = [
  ...destinations.map(d => firebaseClient.entities.Destination.delete(d.id)),
  ...transportation.map(t => firebaseClient.entities.Transportation.delete(t.id)),
  ...lodging.map(l => firebaseClient.entities.Lodging.delete(l.id)),
  ...experiences.map(e => firebaseClient.entities.Experience.delete(e.id))
      ];

      await Promise.all(deletePromises);
  await firebaseClient.entities.Trip.delete(tripId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      navigate(createPageUrl("Dashboard"));
    },
  });

  const deleteDestinationMutation = useMutation({
    mutationFn: async (destId) => {
  await firebaseClient.entities.Destination.delete(destId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations', tripId] });
      setShowDeleteDestDialog(false);
      setDestinationToDelete(null);
    },
  });

  const addDestinationMutation = useMutation({
    mutationFn: async (destinationData) => {
      const maxOrder = destinations.length > 0
        ? Math.max(...destinations.map(d => d.order || 0))
        : 0;

  return await firebaseClient.entities.Destination.create({
        ...destinationData,
        trip_id: tripId,
        order: maxOrder + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations', tripId] });
      setShowDestinationForm(false);
      setEditingDestination(null);
    },
  });

  const updateDestinationMutation = useMutation({
    mutationFn: async ({ id, data }) => {
  return await firebaseClient.entities.Destination.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations', tripId] });
      setShowDestinationForm(false);
      setEditingDestination(null);
    },
  });

  const deleteTransportationMutation = useMutation({
    mutationFn: async (transportId) => {
  await firebaseClient.entities.Transportation.delete(transportId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
      setShowDeleteTransportDialog(false);
      setTransportationToDelete(null);
    },
  });

  const addTransportationMutation = useMutation({
    mutationFn: async (transportData) => {
  return await firebaseClient.entities.Transportation.create({
        ...transportData,
        trip_id: tripId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
      setShowTransportationForm(false);
      setEditingTransportation(null);
    },
  });

  const updateTransportationMutation = useMutation({
    mutationFn: async ({ id, data }) => {
  return await firebaseClient.entities.Transportation.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
      setShowTransportationForm(false);
      setEditingTransportation(null);
    },
  });

  // Lodging mutations
  const deleteLodgingMutation = useMutation({
    mutationFn: async (lodgingId) => {
  await firebaseClient.entities.Lodging.delete(lodgingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lodging', tripId] });
      setShowDeleteLodgingDialog(false);
      setLodgingToDelete(null);
    },
  });

  const addLodgingMutation = useMutation({
    mutationFn: async (lodgingData) => {
      // Check for duplicates - compare both location and location_display
      const isDuplicate = lodging.some(l => {
        // Skip comparing with itself if we are editing an existing item (though for add, editingLodging should be null)
        if (l.id === editingLodging?.id) return false;

        // Check if it's the same property name
        const sameName = l.name.toLowerCase().trim() === lodgingData.name.toLowerCase().trim();

        // Check if it's the same location (compare both location and location_display)
        const sameLocation = (
          l.location === lodgingData.location ||
          l.location_display === lodgingData.location_display ||
          (l.location_display && lodgingData.location_display &&
           l.location_display.toLowerCase().includes(lodgingData.location.toLowerCase()))
        );

        // Check if dates overlap or are the same
        const sameDates = (
          l.check_in_date === lodgingData.check_in_date &&
          l.check_out_date === lodgingData.check_out_date
        );

        return sameName && sameLocation && sameDates;
      });

      if (isDuplicate) {
        throw new Error('This lodging is already saved to your trip.');
      }

  return await firebaseClient.entities.Lodging.create({
        ...lodgingData,
        trip_id: tripId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lodging', tripId] });
      setShowLodgingForm(false);
      setEditingLodging(null);
    },
    onError: (error) => {
      setErrorMessage(error.message || 'Failed to save lodging');
      setShowErrorDialog(true);
    }
  });

  const updateLodgingMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // Check for duplicates - compare both location and location_display
      const isDuplicate = lodging.some(l => {
        // Exclude the current item being updated from the duplicate check
        if (l.id === id) return false;

        // Check if it's the same property name
        const sameName = l.name.toLowerCase().trim() === data.name.toLowerCase().trim();

        // Check if it's the same location (compare both location and location_display)
        const sameLocation = (
          l.location === data.location ||
          l.location_display === data.location_display ||
          (l.location_display && data.location_display &&
           l.location_display.toLowerCase().includes(data.location.toLowerCase()))
        );

        // Check if dates overlap or are the same
        const sameDates = (
          l.check_in_date === data.check_in_date &&
          l.check_out_date === data.check_out_date
        );

        return sameName && sameLocation && sameDates;
      });

      if (isDuplicate) {
        throw new Error('This lodging is already saved to your trip.');
      }

  return await firebaseClient.entities.Lodging.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lodging', tripId] });
      setShowLodgingForm(false);
      setEditingLodging(null);
    },
    onError: (error) => {
      setErrorMessage(error.message || 'Failed to update lodging');
      setShowErrorDialog(true);
    }
  });

  const deleteExperienceMutation = useMutation({
    mutationFn: async (expId) => {
  await firebaseClient.entities.Experience.delete(expId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences', tripId] });
      setShowDeleteExperienceDialog(false);
      setExperienceToDelete(null);
    },
  });

  const addExperienceMutation = useMutation({
    mutationFn: async (expData) => {
      const isDuplicate = experiences.some(e => {
        if (e.id === editingExperience?.id) return false;
        return e.name.toLowerCase().trim() === expData.name.toLowerCase().trim() &&
               e.date === expData.date &&
               e.location === expData.location;
      });

      if (isDuplicate) {
        throw new Error('This experience is already saved to your trip.');
      }

  return await firebaseClient.entities.Experience.create({
        ...expData,
        trip_id: tripId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences', tripId] });
      setShowExperienceForm(false);
      setEditingExperience(null);
    },
    onError: (error) => {
      setErrorMessage(error.message || 'Failed to save experience');
      setShowErrorDialog(true);
    }
  });

  const updateExperienceMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const isDuplicate = experiences.some(e => {
        if (e.id === id) return false;
        return e.name.toLowerCase().trim() === data.name.toLowerCase().trim() &&
               e.date === data.date &&
               e.location === data.location;
      });

      if (isDuplicate) {
        throw new Error('This experience is already saved to your trip.');
      }

  return await firebaseClient.entities.Experience.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences', tripId] });
      setShowExperienceForm(false);
      setEditingExperience(null);
    },
    onError: (error) => {
      setErrorMessage(error.message || 'Failed to update experience');
      setShowErrorDialog(true);
    }
  });

  const generateAITripMutation = useMutation({
    mutationFn: async () => {
      if (!trip.budget_level || !trip.tempo) {
        throw new Error('Please set budget level and trip tempo in trip settings first.');
      }

      const destinationsText = destinations.map((d, i) =>
        `${i + 1}. ${formatLocationWithCode(d.location_name, d.location)} (${d.arrival_date}, ${d.nights} nights)`
      ).join('\n');

      const budgetDescription = {
        basic: 'Budget-friendly options, hostels, budget airlines, free activities',
        fine: 'Mid-range comfortable options, 3-4 star hotels, quality transportation, mix of paid and free activities',
        luxury: 'Premium luxury options, 5-star hotels, business class flights, exclusive experiences'
      }[trip.budget_level];

      const tempoDescription = {
        relaxed: 'relaxed pace with plenty of downtime, 1-2 activities per day',
        active: 'balanced pace with moderate activities, 3-4 activities per day',
        extreme: 'packed schedule maximizing experiences, 5+ activities per day'
      }[trip.tempo];

      const prompt = `Create a complete travel itinerary for this trip with MULTIPLE OPTIONS for each category:

Trip: ${trip.name}
Origin: ${trip.origin}
Dates: ${trip.departure_date} to ${trip.return_date}
Budget Level: ${trip.budget_level} (${budgetDescription})
Tempo: ${trip.tempo} (${tempoDescription})

Destinations:
${destinationsText}

IMPORTANT: Generate 2-3 OPTIONS for each category below:

For TRANSPORTATION between each destination, provide 2-3 options:
- type (flight/train/bus/ferry)
- from_location (code)
- from_location_display (full name)
- to_location (code)
- to_location_display (full name)
- departure_datetime (ISO format)
- arrival_datetime (ISO format)
- provider (airline/company name)
- price (estimated in USD)
- status (e.g., 'saved')

For LODGING at each destination, provide 2-3 options:
- name (hotel/property name)
- type (hotel/airbnb/hostel/resort)
- location (code)
- location_display (full name)
- check_in_date (YYYY-MM-DD)
- check_out_date (YYYY-MM-DD)
- price_per_night (in USD)
- rating (1-10)
- status (e.g., 'saved')

For EXPERIENCES at each destination, provide 2-3 options based on the destination purposes:
- name (activity name)
- category (city_tour/day_trip/food_wine/workshop/outdoor/cultural/adventure/entertainment/wellness)
- provider (company name)
- location (code)
- location_display (full name)
- date (YYYY-MM-DD, spread across the stay)
- duration (e.g., "3 hours", "Full day")
- price (in USD)
- rating (1-10)
- status (e.g., 'saved')

Make realistic suggestions based on actual available services. Consider travel times and logistics. Provide variety in options (different price points, different providers, different experiences).`;

  const result = await firebaseClient.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            transportation: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  from_location: { type: "string" },
                  from_location_display: { type: "string" },
                  to_location: { type: "string" },
                  to_location_display: { type: "string" },
                  departure_datetime: { type: "string" },
                  arrival_datetime: { type: "string" },
                  provider: { type: "string" },
                  price: { type: "number" },
                  // booking_url: { type: "string", format: "uri" } // Removed booking_url
                },
                required: ["type", "from_location", "to_location", "departure_datetime"]
              }
            },
            lodging: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  type: { type: "string" },
                  location: { type: "string" },
                  location_display: { type: "string" },
                  check_in_date: { type: "string" },
                  check_out_date: { type: "string" },
                  price_per_night: { type: "number" },
                  rating: { type: "number" },
                  // booking_url: { type: "string", format: "uri" } // Removed booking_url
                },
                required: ["name", "location", "check_in_date", "check_out_date"]
              }
            },
            experiences: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  category: { type: "string" },
                  provider: { type: "string" },
                  location: { type: "string" },
                  location_display: { type: "string" },
                  date: { type: "string" },
                  duration: { type: "string" },
                  price: { type: "number" },
                  rating: { type: "number" },
                  // booking_url: { type: "string", format: "uri" } // Removed booking_url
                },
                required: ["name", "category", "location", "date"]
              }
            }
          }
        }
      });

      // Create all items
      const transportationPromises = (result.transportation || []).map(t =>
  firebaseClient.entities.Transportation.create({
          ...t,
          trip_id: tripId,
          status: t.status || 'saved'
        })
      );

      const lodgingPromises = (result.lodging || []).map(l => {
        let nights = 1; // Default to 1 night if dates are same or missing
        if (l.check_in_date && l.check_out_date) {
            const checkIn = new Date(l.check_in_date);
            const checkOut = new Date(l.check_out_date);
            const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
            nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (nights === 0 && checkIn.getTime() !== checkOut.getTime()) nights = 1; // Ensure at least 1 night if different days
            if (nights === 0 && checkIn.getTime() === checkOut.getTime()) nights = 0; // If same day, 0 nights
        }

  return firebaseClient.entities.Lodging.create({
          ...l,
          trip_id: tripId,
          total_price: l.price_per_night && nights > 0 ? l.price_per_night * nights : undefined,
          status: l.status || 'saved'
        });
      });

      const experiencesPromises = (result.experiences || []).map(e =>
  firebaseClient.entities.Experience.create({
          ...e,
          trip_id: tripId,
          status: e.status || 'saved'
        })
      );

      await Promise.all([
        ...transportationPromises,
        ...lodgingPromises,
        ...experiencesPromises
      ]);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
      queryClient.invalidateQueries({ queryKey: ['lodging', tripId] });
      queryClient.invalidateQueries({ queryKey: ['experiences', tripId] });
    },
    onError: (error) => {
      console.error("AI Generation Error:", error);
      setErrorMessage(error.message || 'Failed to generate AI trip. Please try again.');
      setShowErrorDialog(true);
    }
  });

  const handleDeleteTrip = async () => {
    setIsDeleting(true);
    await deleteTripMutation.mutateAsync();
    setIsDeleting(false);
  };

  const handleDeleteDestination = async () => {
    if (destinationToDelete) {
      await deleteDestinationMutation.mutateAsync(destinationToDelete.id);
    }
  };

  const handleSaveDestination = async (destinationData) => {
    if (editingDestination) {
      await updateDestinationMutation.mutateAsync({
        id: editingDestination.id,
        data: destinationData
      });
    } else {
      await addDestinationMutation.mutateAsync(destinationData);
    }
  };

  const handleEditDestination = (dest, index) => {
    setEditingDestination({ ...dest, index });
    setShowDestinationForm(true);
  };

  const handleAddNewDestination = () => {
    setEditingDestination(null);
    setShowDestinationForm(true);
  };

  const getPreviousDestination = () => {
    if (editingDestination && editingDestination.index > 0) {
      return destinations[editingDestination.index - 1];
    } else if (!editingDestination && destinations.length > 0) {
      return destinations[destinations.length - 1];
    }
    return null;
  };

  const handleDeleteTransportation = async () => {
    if (transportationToDelete) {
      await deleteTransportationMutation.mutateAsync(transportationToDelete.id);
    }
  };

  const handleSaveTransportation = async (transportData) => {
    if (editingTransportation) {
      await updateTransportationMutation.mutateAsync({
        id: editingTransportation.id,
        data: transportData
      });
    } else {
      await addTransportationMutation.mutateAsync(transportData);
    }
  };

  const handleEditTransportation = (transport) => {
    setEditingTransportation(transport);
    setShowTransportationForm(true);
  };

  const handleAddNewTransportation = () => {
    setEditingTransportation(null);
    setShowTransportationForm(true);
  };

  // Lodging handlers
  const handleDeleteLodging = async () => {
    if (lodgingToDelete) {
      await deleteLodgingMutation.mutateAsync(lodgingToDelete.id);
    }
  };

  const handleSaveLodging = async (lodgingData) => {
    if (editingLodging) {
      await updateLodgingMutation.mutateAsync({
        id: editingLodging.id,
        data: lodgingData
      });
    } else {
      await addLodgingMutation.mutateAsync(lodgingData);
    }
  };

  const handleEditLodging = (lodgingItem) => {
    setEditingLodging(lodgingItem);
    setShowLodgingForm(true);
  };

  const handleAddNewLodging = () => {
    setEditingLodging(null);
    setShowLodgingForm(true);
  };

  const handleDeleteExperience = async () => {
    if (experienceToDelete) {
      await deleteExperienceMutation.mutateAsync(experienceToDelete.id);
    }
  };

  const handleSaveExperience = async (expData) => {
    if (editingExperience) {
      await updateExperienceMutation.mutateAsync({
        id: editingExperience.id,
        data: expData
      });
    } else {
      await addExperienceMutation.mutateAsync(expData);
    }
  };

  const handleEditExperience = (exp) => {
    setEditingExperience(exp);
    setShowExperienceForm(true);
  };

  const handleAddNewExperience = () => {
    setEditingExperience(null);
    setShowExperienceForm(true);
  };

  const handleGenerateAITrip = async () => {
    if (!trip.budget_level || !trip.tempo) {
      setConfirmDialogTitle('Budget & Tempo Required');
      setConfirmDialogDescription('Budget level and trip tempo are required for AI generation. Would you like to set them now?');
      setConfirmDialogAction(() => () => navigate(createPageUrl(`EditTrip?id=${tripId}`)));
      setShowConfirmDialog(true);
      return;
    }

    if (destinations.length === 0) {
      setErrorMessage('Please add at least one destination before generating an AI trip.');
      setShowErrorDialog(true);
      return;
    }

    // Check AI credits (no Pro status check)
    const aiCredits = user?.credits?.ai_generations_remaining || 0;
    
    if (aiCredits === 0) {
      setWarningDialogTitle('No AI Generations Left');
      setWarningDialogDescription("You've used your free AI trip generation for this month. Your limit will reset next month.");
      setShowWarningDialog(true);
      return;
    }

    const hasExistingData = transportation.length > 0 || lodging.length > 0 || experiences.length > 0;
    if (hasExistingData) {
      setConfirmDialogTitle('Add AI-Generated Items?');
      setConfirmDialogDescription('This will add AI-generated transportation, lodging, and experiences to your trip. You can edit or delete them afterwards. Continue?');
      setConfirmDialogAction(() => async () => {
        setShowConfirmDialog(false);
        setIsGeneratingAI(true);
        try {
          await generateAITripMutation.mutateAsync();
          
          // Decrement AI credit
          await firebaseClient.auth.updateMe({
            credits: {
              ...(user.credits || {}),
              ai_generations_remaining: aiCredits - 1
            }
          });
          
          queryClient.invalidateQueries({ queryKey: ['user'] });
          setGenerationSuccess(true);
        } catch (error) {
          // Error handling is already in mutation's onError
        } finally {
          setIsGeneratingAI(false);
        }
      });
      setShowConfirmDialog(true);
      return;
    }

    // If no existing data and all checks pass, proceed directly
    setIsGeneratingAI(true);
    try {
      await generateAITripMutation.mutateAsync();
      
      // Decrement AI credit
  await firebaseClient.auth.updateMe({
        credits: {
          ...(user.credits || {}),
          ai_generations_remaining: aiCredits - 1
        }
      });
      
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setGenerationSuccess(true);
    } catch (error) {
      // Error handling is already in mutation's onError
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Simplified helper - just return the display name as-is if it exists and has the right format
  const formatLocationWithCode = (displayName, code) => {
    // If displayName already has the format "City, Country [CODE]", return as is
    if (displayName && /\[([A-Z]{3})\]/.test(displayName)) {
      return displayName;
    }
    
    // If we only have displayName without code, return it
    if (displayName && !code) {
      return displayName;
    }
    
    // If we only have code, return it
    if (!displayName && code) {
      return code;
    }
    
    // If we have both but displayName doesn't include code, add it
    if (displayName && code) {
      return `${displayName} [${code}]`;
    }
    
    return 'Unknown Location';
  };
  
  // Helper to extract IATA code from location string
  const extractIataCode = (location) => {
    if (!location) return '';
    
    // If it's already a 3-letter code, return it
    if (/^[A-Z]{3}$/i.test(location)) {
      return location.toUpperCase();
    }
    
    // Try to extract code from brackets like "Tel Aviv, Israel [TLV]"
    const codeMatch = location.match(/\[([A-Z]{3})\]/i);
    if (codeMatch) {
      return codeMatch[1].toUpperCase();
    }
    
    // Return original if no code found
    return location;
  };

  // Helper to ensure proper location display format
  const getLocationDisplay = (displayName, code) => {
    // If displayName already has the proper format "City, Country [CODE]", return it
    if (displayName && /\[([A-Z]{3})\]/.test(displayName)) {
      return displayName;
    }
    
    // If we only have a 3-letter code, return it as-is (can't reconstruct full name)
    if (code && /^[A-Z]{3}$/i.test(code) && (!displayName || displayName === code)) {
      return code;
    }
    
    // If displayName exists but no code in brackets, check if it should have one
    if (displayName && code && displayName !== code && !/\[([A-Z]{3})\]/.test(displayName)) {
      // Don't add the code if displayName already ends with the country name
      return `${displayName} [${code}]`;
    }
    
    // Fallback
    return displayName || code || 'Unknown';
  };

  const getFallbackUrl = (item, category) => {
    if (category === 'transportation') {
      if (item.type === 'flight') {
        // Skyscanner URL format: /transport/flights/FROM/TO/YYMMDD/
        const departureDate = new Date(item.departure_datetime);
        const year = departureDate.getFullYear().toString().substring(2); // YY
        const month = (departureDate.getMonth() + 1).toString().padStart(2, '0'); // MM
        const day = departureDate.getDate().toString().padStart(2, '0'); // DD
        const dateStr = `${year}${month}${day}`; // YYMMDD format
        
        // Extract IATA codes from both location fields
        const fromCode = extractIataCode(item.from_location_display || item.from_location);
        const toCode = extractIataCode(item.to_location_display || item.to_location);
        
        return `https://www.skyscanner.com/transport/flights/${fromCode.toLowerCase()}/${toCode.toLowerCase()}/${dateStr}/?adultsv2=1&cabinclass=economy&rtn=0&preferdirects=false`;
      } else if (item.type === 'train') {
        // Trainline search
        const from = encodeURIComponent(item.from_location_display || item.from_location);
        const to = encodeURIComponent(item.to_location_display || item.to_location);
        return `https://www.thetrainline.com/book/results?origin=${from}&destination=${to}`;
      } else if (item.type === 'bus') {
        // FlixBus search
        const from = encodeURIComponent(item.from_location_display || item.from_location);
        const to = encodeURIComponent(item.to_location_display || item.to_location);
        const date = item.departure_datetime ? new Date(item.departure_datetime).toISOString().split('T')[0] : '';
        return `https://www.flixbus.com/bus-routes/${from}-${to}`;
      } else if (item.type === 'ferry') {
        // Direct Ferries search
        const from = encodeURIComponent(item.from_location_display || item.from_location);
        const to = encodeURIComponent(item.to_location_display || item.to_location);
        return `https://www.directferries.com/ferry_routes.aspx?from=${from}&to=${to}`;
      } else if (item.type === 'car') {
        const location = encodeURIComponent(item.from_location_display || item.from_location);
        return `https://www.rentalcars.com/en/city/fi/${location}`;
      } else {
        const searchQuery = `${item.type} from ${item.from_location_display || item.from_location} to ${item.to_location_display || item.to_location}`;
        return `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      }
    } else if (category === 'lodging') {
      const propertyName = item.name;
      const location = item.location_display || item.location;
      const checkIn = item.check_in_date; // YYYY-MM-DD
      const checkOut = item.check_out_date; // YYYY-MM-DD
      
      // Check if it's Airbnb
      if (item.type === 'airbnb' || (item.name && item.name.toLowerCase().includes('airbnb'))) {
        const searchLocation = encodeURIComponent(location);
        return `https://www.airbnb.com/s/${searchLocation}/homes?checkin=${checkIn}&checkout=${checkOut}`;
      } else {
        // Use Expedia search
        const hotelName = encodeURIComponent(propertyName);
        const destination = encodeURIComponent(location);
        return `https://www.expedia.com/Hotel-Search?destination=${destination}&latLong=&regionId=&selected=&selectedDestination=${destination}&hotelName=${hotelName}&startDate=${checkIn}&endDate=${checkOut}&rooms=1&adults=2`;
      }
    } else if (category === 'experiences') {
      const activityName = item.name;
      const location = item.location_display || item.location;
      
      // Check if provider is Airbnb
      if (item.provider && item.provider.toLowerCase().includes('airbnb')) {
        const searchLocation = encodeURIComponent(location);
        return `https://www.airbnb.com/s/${searchLocation}/experiences`;
      } else {
        // GetYourGuide search
        const searchQuery = encodeURIComponent(`${activityName} ${location}`);
        return `https://www.getyourguide.com/s/?q=${searchQuery}`;
      }
    }
    return null;
  };

  const getSmartBookingLink = async (item, category, type) => {
    const itemId = item.id;
    if (loadingBookingUrls.has(itemId)) return null;

    setLoadingBookingUrls(prev => new Set([...prev, itemId]));

    try {
      let search_params = {};
      
      if (category === 'transportation') {
        search_params = {
          name: item.provider,
          from: item.from_location_display || item.from_location,
          to: item.to_location_display || item.to_location,
          date: item.departure_datetime ? item.departure_datetime.split('T')[0] : undefined
        };
      } else if (category === 'lodging') {
        search_params = {
          name: item.name,
          location: item.location_display || item.location,
          check_in: item.check_in_date,
          check_out: item.check_out_date
        };
      } else if (category === 'experiences') {
        search_params = {
          name: item.name,
          location: item.location_display || item.location,
          date: item.date
        };
      }

  const response = await firebaseClient.functions.invoke('findBookingUrl', {
        category,
        type, // This 'type' refers to the specific item type (flight, hotel, city_tour)
        search_params
      });

      if (response.data && response.data.url) {
        return response.data.url;
      }
      
      // Fallback to simple search
      return getFallbackUrl(item, category);
    } catch (error) {
      console.error("Error finding smart booking URL:", error);
      return getFallbackUrl(item, category);
    } finally {
      setLoadingBookingUrls(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleFindAndBook = async (item, category, type) => {
    const url = await getSmartBookingLink(item, category, type);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const getDestinationIcon = () => MapPin;

  const getTransportationIcon = (type) => {
    const icons = {
      flight: Plane,
      train: Train,
      bus: Bus,
      ferry: Ship,
      car: Car
    };
    return icons[type] || Plane;
  };

  const getLodgingIcon = (type) => {
    const icons = {
      hotel: Building2,
      airbnb: Home,
      hostel: Bed,
      resort: Waves,
      apartment: Building2,
      villa: Castle
    };
    return icons[type] || Hotel;
  };

  const getExperienceIcon = (category) => {
    const icons = {
      city_tour: Compass,
      day_trip: MapPin, // Reusing MapPin for day trips
      food_wine: UtensilsCrossed,
      workshop: Palette,
      outdoor: Mountain,
      cultural: Theater,
      adventure: Mountain, // Using Mountain for adventure
      entertainment: Laugh,
      wellness: Bath
    };
    // Default to Star if category not found or is null/undefined
    return icons[category] || Star;
  };

  // Add function to get all itinerary items sorted by date
  const getDailyItinerary = () => {
    const items = [];
    const corruptItems = [];

    // Add transportation
    transportation.forEach(t => {
      const datetime = new Date(t.departure_datetime);
      // Check if date is valid and in reasonable range (after year 2000)
      if (isNaN(datetime.getTime()) || datetime.getFullYear() < 2000) {
        console.error('Corrupt transportation date:', t.departure_datetime, 'for', t.from_location_display || t.from_location, '→', t.to_location_display || t.to_location);
        corruptItems.push({ type: 'transportation', data: t, issue: 'Invalid date' });
      } else {
        items.push({
          type: 'transportation',
          datetime: datetime,
          data: t,
          icon: getTransportationIcon(t.type),
          color: 'blue'
        });
      }
    });

    // Add lodging (check-in)
    lodging.forEach(l => {
      const datetime = new Date(l.check_in_date + 'T15:00:00'); // Assume 3pm check-in
      if (isNaN(datetime.getTime()) || datetime.getFullYear() < 2000) {
        console.error('Corrupt lodging date:', l.check_in_date, 'for', l.name);
        corruptItems.push({ type: 'lodging', data: l, issue: 'Invalid date' });
      } else {
        items.push({
          type: 'lodging_checkin',
          datetime: datetime,
          data: l,
          icon: getLodgingIcon(l.type),
          color: 'purple'
        });
      }
    });

    // Add experiences
    experiences.forEach(e => {
      const datetime = new Date(e.date + 'T09:00:00'); // Default to 9am if no time
      if (isNaN(datetime.getTime()) || datetime.getFullYear() < 2000) {
        console.error('Corrupt experience date:', e.date, 'for', e.name);
        corruptItems.push({ type: 'experience', data: e, issue: 'Invalid date' });
      } else {
        items.push({
          type: 'experience',
          datetime: datetime,
          data: e,
          icon: getExperienceIcon(e.category),
          color: 'green'
        });
      }
    });

    // Alert user if there are corrupt items
    if (corruptItems.length > 0) {
      setWarningDialogTitle('Invalid Dates Detected');
      setWarningDialogDescription(`Warning: ${corruptItems.length} item(s) have invalid dates and won't appear in your itinerary. Please delete and recreate them. Check the Transportation/Lodging/Experiences tabs.`);
      setShowWarningDialog(true);
    }

    // Sort by datetime - earliest first (ascending order)
    return items.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
  };

  const dailyItinerary = getDailyItinerary();

  // Group by date
  const groupedItinerary = dailyItinerary.reduce((acc, item) => {
    const dateKey = format(item.datetime, 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {});

  // Sort date keys chronologically (earliest first)
  const sortedDateKeys = Object.keys(groupedItinerary).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  if (loadingUser || loadingTrip) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Trip not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="relative h-80 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30"></div>

        <div className="relative px-4 md:px-8 py-8 max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl("Dashboard"))}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Trips
            </Button>

            <div className="flex gap-2">
              {canEdit && (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setShowShareDialog(true)}
                    className="text-white hover:bg-white/20 border border-white/30"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleGenerateAITrip}
                    disabled={isGeneratingAI || destinations.length === 0}
                    className="text-white hover:bg-white/20 border border-white/30"
                  >
                    {isGeneratingAI ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Trip
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => navigate(createPageUrl(`EditTrip?id=${tripId}`))}
                    className="text-white hover:bg-white/20"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowDeleteTripDialog(true)}
                    className="text-white hover:bg-red-500/20 hover:text-red-100"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{trip.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-white/90">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span className="font-medium">{format(new Date(trip.departure_date), 'MMM d, yyyy')}</span>
              </div>
              {trip.return_date && (
                <>
                  <span>•</span>
                  <span className="font-medium">{format(new Date(trip.return_date), 'MMM d, yyyy')}</span>
                </>
              )}
              <span>•</span>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span className="font-medium">{trip.origin}</span>
              </div>
              {trip.budget_level && (
                <>
                  <span>•</span>
                  <Badge className="bg-white/20 text-white border-white/30">
                    {trip.budget_level === 'basic' ? '💰 Basic' : trip.budget_level === 'fine' ? '✨ Fine' : '👑 Luxury'}
                  </Badge>
                </>
              )}
              {trip.tempo && (
                <>
                  <span>•</span>
                  <Badge className="bg-white/20 text-white border-white/30">
                    {trip.tempo === 'relaxed' ? '🌴 Relaxed' : trip.tempo === 'active' ? '🚶 Active' : '⚡ Extreme'}
                  </Badge>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="px-4 md:px-8 -mt-20 pb-12">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="itinerary" className="space-y-6">
            <TabsList className="bg-white/90 backdrop-blur-lg shadow-xl rounded-xl p-1">
              <TabsTrigger value="itinerary" className="rounded-lg px-6">Daily Plan</TabsTrigger>
              <TabsTrigger value="overview" className="rounded-lg px-6">Destinations</TabsTrigger>
              <TabsTrigger value="transportation" className="rounded-lg px-6">Transportation</TabsTrigger>
              <TabsTrigger value="lodging" className="rounded-lg px-6">Lodging</TabsTrigger>
              <TabsTrigger value="experiences" className="rounded-lg px-6">Experiences</TabsTrigger>
            </TabsList>

            <TabsContent value="itinerary" className="space-y-6">
              <Card className="border-0 shadow-xl rounded-2xl">
                <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                  <CardTitle className="text-2xl font-bold">Daily Itinerary</CardTitle>
                  <p className="text-blue-100 text-sm mt-1">Your complete day-by-day trip timeline</p>
                </CardHeader>
                <CardContent className="p-6">
                  {sortedDateKeys.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-blue-600" />
                      </div>
                      <p className="text-gray-500">No activities planned yet. Add transportation, lodging, or experiences to see your itinerary!</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {sortedDateKeys.map((dateKey) => {
                        const items = groupedItinerary[dateKey];
                        return (
                          <div key={dateKey}>
                            <div className="flex items-center gap-3 mb-4 sticky top-0 bg-gradient-to-r from-slate-50 via-blue-50 to-slate-100 py-2 z-10">
                              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-md border border-gray-200">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                <h3 className="font-bold text-lg text-gray-900">
                                  {format(new Date(dateKey), 'EEEE, MMMM d, yyyy')}
                                </h3>
                              </div>
                              <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
                            </div>

                            <div className="space-y-3 ml-4">
                              {items.map((item, idx) => {
                                const Icon = item.icon;
                                const colorClasses = {
                                  blue: 'bg-blue-100 text-blue-600 border-blue-200',
                                  purple: 'bg-purple-100 text-purple-600 border-purple-200',
                                  green: 'bg-green-100 text-green-600 border-green-200'
                                };

                                return (
                                  <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="flex gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
                                  >
                                    <div className="flex flex-col items-center gap-2">
                                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[item.color]}`}>
                                        <Icon className="w-6 h-6" />
                                      </div>
                                      <span className="text-xs font-semibold text-gray-600">
                                        {format(item.datetime, 'HH:mm')}
                                      </span>
                                    </div>

                                    <div className="flex-1">
                                      {item.type === 'transportation' && (
                                        <>
                                          <div className="flex justify-between items-start mb-2">
                                            <div>
                                              <Badge className="mb-2 bg-blue-100 text-blue-700 border-blue-200">
                                                {item.data.type}
                                              </Badge>
                                              <h4 className="font-bold text-lg">
                                                {getLocationDisplay(item.data.from_location_display, item.data.from_location)} → {getLocationDisplay(item.data.to_location_display, item.data.to_location)}
                                              </h4>
                                            </div>
                                            {item.data.price && (
                                              <p className="text-lg font-semibold text-blue-600">${item.data.price}</p>
                                            )}
                                          </div>
                                          {item.data.provider && (
                                            <p className="text-sm text-gray-600">{item.data.provider}</p>
                                          )}
                                          {item.data.arrival_datetime && (
                                            <p className="text-sm text-gray-600">
                                              Arrives: {format(new Date(item.data.arrival_datetime), 'h:mm a')}
                                            </p>
                                          )}
                                          {item.data.status !== 'booked' && (
                                            <div className="mt-3">
                                              <Button
                                                onClick={() => handleFindAndBook(item.data, 'transportation', item.data.type)}
                                                size="sm"
                                                disabled={loadingBookingUrls.has(item.data.id)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                              >
                                                {loadingBookingUrls.has(item.data.id) ? (
                                                  <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Finding...
                                                  </>
                                                ) : (
                                                  <>
                                                    <ExternalLink className="w-4 h-4 mr-2" />
                                                    Find & Book
                                                  </>
                                                )}
                                              </Button>
                                            </div>
                                          )}
                                        </>
                                      )}

                                      {item.type === 'lodging_checkin' && (
                                        <>
                                          <div className="flex justify-between items-start mb-2">
                                            <div>
                                              <Badge className="mb-2 bg-purple-100 text-purple-700 border-purple-200">
                                                Check-in • {item.data.type}
                                              </Badge>
                                              <h4 className="font-bold text-lg">{item.data.name}</h4>
                                            </div>
                                            {item.data.total_price && (
                                              <p className="text-lg font-semibold text-purple-600">${item.data.total_price.toFixed(2)}</p>
                                            )}
                                          </div>
                                          {item.data.location_display && (
                                            <p className="text-sm text-gray-600">{item.data.location_display}</p>
                                          )}
                                          <p className="text-sm text-gray-600">
                                            Through {format(new Date(item.data.check_out_date), 'MMM d')}
                                          </p>
                                          {item.data.status !== 'booked' && (
                                            <div className="mt-3">
                                              <Button
                                                onClick={() => handleFindAndBook(item.data, 'lodging', item.data.type)}
                                                size="sm"
                                                disabled={loadingBookingUrls.has(item.data.id)}
                                                className="bg-purple-600 hover:bg-purple-700 text-white"
                                              >
                                                {loadingBookingUrls.has(item.data.id) ? (
                                                  <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Finding...
                                                  </>
                                                ) : (
                                                  <>
                                                    <ExternalLink className="w-4 h-4 mr-2" />
                                                    Find & Book
                                                  </>
                                                )}
                                              </Button>
                                            </div>
                                          )}
                                        </>
                                      )}

                                      {item.type === 'experience' && (
                                        <>
                                          <div className="flex justify-between items-start mb-2">
                                            <div>
                                              <Badge className="mb-2 bg-green-100 text-green-700 border-green-200">
                                                {item.data.category?.replace('_', ' ')}
                                              </Badge>
                                              <h4 className="font-bold text-lg">{item.data.name}</h4>
                                            </div>
                                            {item.data.price && (
                                              <p className="text-lg font-semibold text-green-600">${item.data.price.toFixed(2)}</p>
                                            )}
                                          </div>
                                          {item.data.duration && (
                                            <p className="text-sm text-gray-600">Duration: {item.data.duration}</p>
                                          )}
                                          {item.data.provider && (
                                            <p className="text-sm text-gray-600">Provider: {item.data.provider}</p>
                                          )}
                                          {item.data.location_display && (
                                            <p className="text-sm text-gray-600">{item.data.location_display}</p>
                                          )}
                                          {item.data.status !== 'booked' && (
                                            <div className="mt-3">
                                              <Button
                                                onClick={() => handleFindAndBook(item.data, 'experiences', item.data.category)}
                                                size="sm"
                                                disabled={loadingBookingUrls.has(item.data.id)}
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                              >
                                                {loadingBookingUrls.has(item.data.id) ? (
                                                  <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Finding...
                                                  </>
                                                ) : (
                                                  <>
                                                    <ExternalLink className="w-4 h-4 mr-2" />
                                                    Find & Book
                                                  </>
                                                )}
                                              </Button>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="overview" className="space-y-6">
              <Card className="border-0 shadow-xl rounded-2xl">
                <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50 p-6">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-2xl font-bold">Itinerary</CardTitle>
                    {canEdit && (
                      <Button
                        onClick={handleAddNewDestination}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Destination
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <AnimatePresence>
                    {showDestinationForm && canEdit && (
                      <div className="mb-6">
                        <DestinationForm
                          destination={editingDestination}
                          onSave={handleSaveDestination}
                          onCancel={() => {
                            setShowDestinationForm(false);
                            setEditingDestination(null);
                          }}
                          previousDestination={getPreviousDestination()}
                          tripDepartureDate={trip.departure_date}
                        />
                      </div>
                    )}
                  </AnimatePresence>

                  {destinations.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MapPin className="w-8 h-8 text-blue-600" />
                      </div>
                      <p className="text-gray-500 mb-4">No destinations added yet</p>
                      {canEdit && (
                        <Button
                          onClick={handleAddNewDestination}
                          variant="outline"
                          className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Destination
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {destinations.map((dest, index) => {
                        const DestIcon = getDestinationIcon();

                        return (
                          <motion.div
                            key={dest.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex gap-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200"
                          >
                            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                                {index + 1}
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <DestIcon className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-xl text-gray-900 mb-1">
                                {dest.location_name || dest.location}
                              </h3>
                              <p className="text-sm text-gray-600 mb-3">
                                {format(new Date(dest.arrival_date), 'EEEE, MMMM d, yyyy')} • {dest.nights} night{dest.nights > 1 ? 's' : ''}
                              </p>
                              {dest.purposes && dest.purposes.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {dest.purposes.map((purpose, idx) => (
                                    <Badge key={idx} variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                                      {purpose}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {dest.notes && (
                                <p className="text-sm text-gray-600 italic">{dest.notes}</p>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              {canEdit && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditDestination(dest, index)}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setDestinationToDelete(dest);
                                      setShowDeleteDestDialog(true);
                                    }}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transportation" className="space-y-6">
              <Card className="border-0 shadow-xl rounded-2xl">
                <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50 p-6">
                  <div className="flex justify-between items-center flex-wrap gap-3">
                    <CardTitle className="text-2xl font-bold">Transportation</CardTitle>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Button
                          onClick={handleAddNewTransportation}
                          variant="outline"
                          className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Manually
                        </Button>
                        <Button
                          onClick={() => navigate(createPageUrl(`SearchTransportation?trip_id=${tripId}`))}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                        >
                          <Search className="w-4 h-4 mr-2" />
                          Search
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <AnimatePresence>
                    {showTransportationForm && canEdit && (
                      <div className="mb-6">
                        <TransportationForm
                          transportation={editingTransportation}
                          onSave={handleSaveTransportation}
                          onCancel={() => {
                            setShowTransportationForm(false);
                            setEditingTransportation(null);
                          }}
                        />
                      </div>
                    )}
                  </AnimatePresence>

                  {transportation.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Plane className="w-8 h-8 text-blue-600" />
                      </div>
                      <p className="text-gray-500 mb-4">No transportation booked yet</p>
                      {canEdit && (
                        <div className="flex justify-center gap-3">
                          <Button
                            onClick={handleAddNewTransportation}
                            variant="outline"
                            className="border-blue-200 text-blue-700 hover:bg-blue-50"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Manually
                          </Button>
                          <Button
                            onClick={() => navigate(createPageUrl(`SearchTransportation?trip_id=${tripId}`))}
                            variant="outline"
                            className="border-blue-200 text-blue-700 hover:bg-blue-50"
                          >
                            <Search className="w-4 h-4 mr-2" />
                            Search Flights & More
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {transportation.map((transport) => {
                        const TransportIcon = getTransportationIcon(transport.type);
                        
                        // Get proper display names
                        const fromDisplay = getLocationDisplay(transport.from_location_display, transport.from_location);
                        const toDisplay = getLocationDisplay(transport.to_location_display, transport.to_location);

                        return (
                          <motion.div
                            key={transport.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex gap-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200"
                          >
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <TransportIcon className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <Badge className="mb-2 bg-blue-100 text-blue-700 border-blue-200">
                                    {transport.type}
                                  </Badge>
                                  <h3 className="font-bold text-lg">
                                    {fromDisplay} → {toDisplay}
                                  </h3>
                                </div>
                                <Badge className={transport.status === 'booked' ? 'bg-green-100 text-green-700' : transport.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}>
                                  {transport.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                {format(new Date(transport.departure_datetime), 'MMM d, yyyy h:mm a')}
                                {transport.arrival_datetime && ` → ${format(new Date(transport.arrival_datetime), 'h:mm a')}`}
                              </p>
                              {transport.provider && (
                                <p className="text-sm text-gray-600">Provider: {transport.provider}</p>
                              )}
                              {transport.booking_reference && (
                                <p className="text-sm text-gray-600">Ref: {transport.booking_reference}</p>
                              )}
                              {transport.details && (
                                <p className="text-sm text-gray-600 italic mt-1">{transport.details}</p>
                              )}
                              <div className="flex items-center gap-3 mt-3">
                                {transport.price && (
                                  <p className="text-sm font-semibold text-gray-900">${transport.price.toFixed(2)}</p>
                                )}
                              </div>
                              {transport.status !== 'booked' && (
                                <div className="mt-3">
                                  <Button
                                    onClick={() => handleFindAndBook(transport, 'transportation', transport.type)}
                                    disabled={loadingBookingUrls.has(transport.id)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    {loadingBookingUrls.has(transport.id) ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Finding...
                                      </>
                                    ) : (
                                      <>
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Find & Book
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              {canEdit && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditTransportation(transport)}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setTransportationToDelete(transport);
                                      setShowDeleteTransportDialog(true);
                                    }}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lodging" className="space-y-6">
              <Card className="border-0 shadow-xl rounded-2xl">
                <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-purple-50 p-6">
                  <div className="flex justify-between items-center flex-wrap gap-3">
                    <CardTitle className="text-2xl font-bold">Lodging</CardTitle>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Button
                          onClick={handleAddNewLodging}
                          variant="outline"
                          className="border-purple-200 text-purple-700 hover:bg-purple-50"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Manually
                        </Button>
                        <Button
                          onClick={() => navigate(createPageUrl(`SearchLodging?trip_id=${tripId}`))}
                          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                        >
                          <Search className="w-4 h-4 mr-2" />
                          Search
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <AnimatePresence>
                    {showLodgingForm && canEdit && (
                      <div className="mb-6">
                        <LodgingForm
                          lodging={editingLodging}
                          onSave={handleSaveLodging}
                          onCancel={() => {
                            setShowLodgingForm(false);
                            setEditingLodging(null);
                          }}
                        />
                      </div>
                    )}
                  </AnimatePresence>

                  {lodging.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Hotel className="w-8 h-8 text-purple-600" />
                      </div>
                      <p className="text-gray-500 mb-4">No accommodations booked yet</p>
                      {canEdit && (
                        <div className="flex justify-center gap-3">
                          <Button
                            onClick={handleAddNewLodging}
                            variant="outline"
                            className="border-purple-200 text-purple-700 hover:bg-purple-50"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Manually
                          </Button>
                          <Button
                            onClick={() => navigate(createPageUrl(`SearchLodging?trip_id=${tripId}`))}
                            variant="outline"
                            className="border-purple-200 text-purple-700 hover:bg-purple-50"
                          >
                            <Search className="w-4 h-4 mr-2" />
                            Search Hotels & Airbnbs
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {lodging.map((stay) => {
                        const LodgingIcon = getLodgingIcon(stay.type);

                        return (
                          <motion.div
                            key={stay.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex gap-4 p-4 bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl border border-gray-200"
                          >
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <LodgingIcon className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <Badge className="mb-2 bg-purple-100 text-purple-700 border-purple-200">
                                    {stay.type}
                                  </Badge>
                                  <h3 className="font-bold text-lg">{stay.name}</h3>
                                </div>
                                <Badge className={stay.status === 'booked' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                                  {stay.status}
                                </Badge>
                              </div>
                              {stay.location_display && (
                                <p className="text-sm text-gray-600 mb-2">
                                  {stay.location_display}
                                </p>
                              )}
                              <p className="text-sm text-gray-600">
                                {format(new Date(stay.check_in_date), 'MMM d')} - {format(new Date(stay.check_out_date), 'MMM d, yyyy')}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                {stay.total_price && (
                                  <p className="text-sm font-semibold text-gray-900">${stay.total_price.toFixed(2)}</p>
                                )}
                              </div>
                              {stay.status !== 'booked' && (
                                <div className="mt-3">
                                  <Button
                                    onClick={() => handleFindAndBook(stay, 'lodging', stay.type)}
                                    disabled={loadingBookingUrls.has(stay.id)}
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                  >
                                    {loadingBookingUrls.has(stay.id) ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Finding...
                                      </>
                                    ) : (
                                      <>
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Find & Book
                                      </>
                                                                        )}
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              {canEdit && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditLodging(stay)}
                                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setLodgingToDelete(stay);
                                      setShowDeleteLodgingDialog(true);
                                    }}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="experiences" className="space-y-6">
              <Card className="border-0 shadow-xl rounded-2xl">
                <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-green-50 p-6">
                  <div className="flex justify-between items-center flex-wrap gap-3">
                    <CardTitle className="text-2xl font-bold">Experiences & Activities</CardTitle>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Button
                          onClick={handleAddNewExperience}
                          variant="outline"
                          className="border-green-200 text-green-700 hover:bg-green-50"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Manually
                        </Button>
                        <Button
                          onClick={() => navigate(createPageUrl(`SearchExperiences?trip_id=${tripId}`))}
                          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-600 hover:to-green-700"
                        >
                          <Search className="w-4 h-4 mr-2" />
                          Search
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <AnimatePresence>
                    {showExperienceForm && canEdit && (
                      <div className="mb-6">
                        <ExperienceForm
                          experience={editingExperience}
                          onSave={handleSaveExperience}
                          onCancel={() => {
                            setShowExperienceForm(false);
                            setEditingExperience(null);
                          }}
                        />
                      </div>
                    )}
                  </AnimatePresence>

                  {experiences.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Star className="w-8 h-8 text-green-600" />
                      </div>
                      <p className="text-gray-500 mb-4">No experiences added yet</p>
                      {canEdit && (
                        <div className="flex justify-center gap-3">
                          <Button
                            onClick={handleAddNewExperience}
                            variant="outline"
                            className="border-green-200 text-green-700 hover:bg-green-50"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Manually
                          </Button>
                          <Button
                            onClick={() => navigate(createPageUrl(`SearchExperiences?trip_id=${tripId}`))}
                            variant="outline"
                            className="border-green-200 text-green-700 hover:bg-green-50"
                          >
                            <Search className="w-4 h-4 mr-2" />
                            Discover Experiences
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {experiences.map((exp) => {
                        const ExpIcon = getExperienceIcon(exp.category);

                        return (
                          <motion.div
                            key={exp.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex gap-4 p-4 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl border border-gray-200"
                          >
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <ExpIcon className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <Badge className="mb-2 bg-green-100 text-green-700 border-green-200">
                                    {exp.category?.replace('_', ' ')}
                                  </Badge>
                                  <h3 className="font-bold text-lg">{exp.name}</h3>
                                </div>
                                <Badge className={exp.status === 'booked' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                                  {exp.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                {format(new Date(exp.date), 'MMM d, yyyy')}
                                {exp.duration && ` • ${exp.duration}`}
                              </p>
                              {exp.provider && (
                                <p className="text-sm text-gray-600">Provider: {exp.provider}</p>
                              )}
                              {exp.location_display && (
                                <p className="text-sm text-gray-600">{exp.location_display}</p>
                              )}
                              {exp.details && (
                                <p className="text-sm text-gray-600 italic mt-1">{exp.details}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2">
                                {exp.price && (
                                  <p className="text-sm font-semibold text-gray-900">${exp.price.toFixed(2)}</p>
                                )}
                              </div>
                              {exp.status !== 'booked' && (
                                <div className="mt-3">
                                  <Button
                                    onClick={() => handleFindAndBook(exp, 'experiences', exp.category)}
                                    disabled={loadingBookingUrls.has(exp.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    {loadingBookingUrls.has(exp.id) ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Finding...
                                      </>
                                    ) : (
                                      <>
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Find & Book
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              {canEdit && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditExperience(exp)}
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setExperienceToDelete(exp);
                                      setShowDeleteExperienceDialog(true);
                                    }}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {showShareDialog && (
        <ShareTripDialog
          trip={trip}
          isOpen={showShareDialog}
          onOpenChange={setShowShareDialog}
          onUpdateTrip={(updatedSharedWith) => {
            updateTripMutation.mutate({ id: trip.id, data: { shared_with: updatedSharedWith } });
          }}
        />
      )}

      {/* Delete Trip Dialog */}
      <AlertDialog open={showDeleteTripDialog} onOpenChange={setShowDeleteTripDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your trip <strong>"{trip.name}"</strong> and remove all associated destinations, transportation, lodging, and experiences.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTrip}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Trip'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Destination Dialog */}
      <AlertDialog open={showDeleteDestDialog} onOpenChange={setShowDeleteDestDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Destination?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{destinationToDelete?.location_name || destinationToDelete?.location}</strong> from your trip? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDestinationToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDestination}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Destination
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Transportation Dialog */}
      <AlertDialog open={showDeleteTransportDialog} onOpenChange={setShowDeleteTransportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transportation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this <strong>{transportationToDelete?.type}</strong> from <strong>{formatLocationWithCode(transportationToDelete?.from_location_display, transportationToDelete?.from_location)}</strong> to <strong>{formatLocationWithCode(transportationToDelete?.to_location_display, transportationToDelete?.to_location)}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTransportationToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTransportation}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Transportation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Lodging Dialog */}
      <AlertDialog open={showDeleteLodgingDialog} onOpenChange={setShowDeleteLodgingDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lodging?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{lodgingToDelete?.name}</strong> from your trip? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLodgingToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLodging}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Lodging
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Experience Dialog */}
      <AlertDialog open={showDeleteExperienceDialog} onOpenChange={setShowDeleteExperienceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Experience?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{experienceToDelete?.name}</strong> from your trip? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExperienceToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExperience}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Experience
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* General Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-red-600">Error</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowErrorDialog(false)}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* General Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialogDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDialogAction}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* General Warning Dialog */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-yellow-600">{warningDialogTitle}</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              {warningDialogDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowWarningDialog(false)}
              className="w-full bg-yellow-600 hover:bg-yellow-700"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generation Success Dialog */}
      <Dialog open={generationSuccess} onOpenChange={setGenerationSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-center">Trip Generated!</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              Your AI-powered itinerary is ready. Check the Transportation, Lodging, and Experiences tabs to review and edit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setGenerationSuccess(false)}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              Got it!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
