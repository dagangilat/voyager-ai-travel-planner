#!/usr/bin/env node
/**
 * Test script for Amadeus API endpoints
 * Run with: node test-amadeus-apis.js
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ID = 'voyager-ai-travel-planner';
const REGION = 'us-central1';
const BASE_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;

async function testFlightsSearch() {
  console.log('\n🛫 Testing Amadeus Flights Search...');
  
  const params = new URLSearchParams({
    originLocationCode: 'JFK',
    destinationLocationCode: 'LAX',
    departureDate: '2025-12-15',
    adults: '1'
  });
  
  const url = `${BASE_URL}/searchAmadeusFlights?${params}`;
  console.log('URL:', url);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Flights API Response:', {
        status: response.status,
        dataType: typeof data,
        hasData: !!data.data,
        resultCount: data.data?.length || 0
      });
      if (data.data?.[0]) {
        console.log('   Sample Result:', {
          id: data.data[0].id,
          price: data.data[0].price,
          source: data.data[0].source
        });
      }
    } else {
      console.log('❌ Flights API Error:', {
        status: response.status,
        error: data.error,
        details: data.details
      });
    }
  } catch (error) {
    console.log('❌ Request Failed:', error.message);
  }
}

async function testHotelsSearch() {
  console.log('\n🏨 Testing Amadeus Hotels Search...');
  
  const params = new URLSearchParams({
    cityCode: 'LON',
    checkInDate: '2025-12-15',
    checkOutDate: '2025-12-20',
    adults: '2'
  });
  
  const url = `${BASE_URL}/searchAmadeusHotels?${params}`;
  console.log('URL:', url);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Hotels API Response:', {
        status: response.status,
        dataType: typeof data,
        hasData: !!data.data,
        resultCount: data.data?.length || 0
      });
      if (data.data?.[0]) {
        console.log('   Sample Result:', {
          hotelId: data.data[0].hotel?.hotelId,
          name: data.data[0].hotel?.name,
          cityCode: data.data[0].hotel?.cityCode,
          hasOffers: !!data.data[0].offers
        });
      }
    } else {
      console.log('❌ Hotels API Error:', {
        status: response.status,
        error: data.error,
        details: data.details
      });
    }
  } catch (error) {
    console.log('❌ Request Failed:', error.message);
  }
}

async function testActivitiesSearch() {
  console.log('\n🎭 Testing Amadeus Activities Search...');
  
  // Paris coordinates
  const params = new URLSearchParams({
    latitude: '48.8566',
    longitude: '2.3522',
    radius: '20'
  });
  
  const url = `${BASE_URL}/searchAmadeusActivities?${params}`;
  console.log('URL:', url);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Activities API Response:', {
        status: response.status,
        dataType: typeof data,
        hasData: !!data.data,
        resultCount: data.data?.length || 0
      });
      if (data.data?.[0]) {
        console.log('   Sample Result:', {
          name: data.data[0].name,
          type: data.data[0].type
        });
      }
    } else {
      console.log('❌ Activities API Error:', {
        status: response.status,
        error: data.error,
        details: data.details
      });
    }
  } catch (error) {
    console.log('❌ Request Failed:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Testing Amadeus API Endpoints');
  console.log('================================\n');
  console.log('Base URL:', BASE_URL);
  
  await testFlightsSearch();
  await testHotelsSearch();
  await testActivitiesSearch();
  
  console.log('\n✨ Tests Complete!\n');
}

runTests().catch(console.error);
