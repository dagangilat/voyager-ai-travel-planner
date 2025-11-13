const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Import destination data from separate files
const destinationsUSA = require('./data/destinations-usa');
const destinationsCanada = require('./data/destinations-canada');
const destinationsEurope = require('./data/destinations-europe');
const destinationsAsia = require('./data/destinations-asia');
const destinationsAfrica = require('./data/destinations-africa');
const destinationsOceania = require('./data/destinations-oceania');
const destinationsSouthAmerica = require('./data/destinations-south-america');
const destinationsCaribbean = require('./data/destinations-caribbean');

// Merge all destinations - 500+ destinations total
const DESTINATIONS = [
  ...destinationsUSA,        // 100 entries
  ...destinationsCanada,     // 15 entries
  ...destinationsEurope,     // 100 entries
  ...destinationsAsia,       // 100 entries
  ...destinationsAfrica,     // 50 entries
  ...destinationsOceania,    // 30 entries
  ...destinationsSouthAmerica, // 60 entries
  ...destinationsCaribbean,  // 50 entries
];

// Old inline data replaced with modular files
/*
  { city: 'New York', country: 'USA', code: 'JFK', type: 'airport', popularity: 100 },
  { city: 'New York', country: 'USA', code: 'LGA', type: 'airport', popularity: 95 },
  { city: 'New York', country: 'USA', code: 'EWR', type: 'airport', popularity: 90 },
  { city: 'Los Angeles', country: 'USA', code: 'LAX', type: 'airport', popularity: 100 },
  { city: 'San Francisco', country: 'USA', code: 'SFO', type: 'airport', popularity: 98 },
  { city: 'Chicago', country: 'USA', code: 'ORD', type: 'airport', popularity: 95 },
  { city: 'Chicago', country: 'USA', code: 'MDW', type: 'airport', popularity: 85 },
  { city: 'Miami', country: 'USA', code: 'MIA', type: 'airport', popularity: 95 },
  { city: 'Las Vegas', country: 'USA', code: 'LAS', type: 'airport', popularity: 98 },
  { city: 'Seattle', country: 'USA', code: 'SEA', type: 'airport', popularity: 92 },
  { city: 'Boston', country: 'USA', code: 'BOS', type: 'airport', popularity: 90 },
  { city: 'Washington', country: 'USA', code: 'IAD', type: 'airport', popularity: 92 },
  { city: 'Washington', country: 'USA', code: 'DCA', type: 'airport', popularity: 88 },
  { city: 'Atlanta', country: 'USA', code: 'ATL', type: 'airport', popularity: 95 },
  { city: 'Dallas', country: 'USA', code: 'DFW', type: 'airport', popularity: 93 },
  { city: 'Dallas', country: 'USA', code: 'DAL', type: 'airport', popularity: 82 },
  { city: 'Denver', country: 'USA', code: 'DEN', type: 'airport', popularity: 88 },
  { city: 'Phoenix', country: 'USA', code: 'PHX', type: 'airport', popularity: 85 },
  { city: 'San Diego', country: 'USA', code: 'SAN', type: 'airport', popularity: 87 },
  { city: 'Houston', country: 'USA', code: 'IAH', type: 'airport', popularity: 86 },
  { city: 'Houston', country: 'USA', code: 'HOU', type: 'airport', popularity: 78 },
  { city: 'Orlando', country: 'USA', code: 'MCO', type: 'airport', popularity: 95 },
  { city: 'Tampa', country: 'USA', code: 'TPA', type: 'airport', popularity: 82 },
  { city: 'Fort Lauderdale', country: 'USA', code: 'FLL', type: 'airport', popularity: 85 },
  { city: 'Minneapolis', country: 'USA', code: 'MSP', type: 'airport', popularity: 80 },
  { city: 'Detroit', country: 'USA', code: 'DTW', type: 'airport', popularity: 78 },
  { city: 'Philadelphia', country: 'USA', code: 'PHL', type: 'airport', popularity: 82 },
  { city: 'Portland', country: 'USA', code: 'PDX', type: 'airport', popularity: 85 },
  { city: 'Salt Lake City', country: 'USA', code: 'SLC', type: 'airport', popularity: 80 },
  { city: 'Nashville', country: 'USA', code: 'BNA', type: 'airport', popularity: 85 },
  { city: 'Austin', country: 'USA', code: 'AUS', type: 'airport', popularity: 88 },
  { city: 'Charlotte', country: 'USA', code: 'CLT', type: 'airport', popularity: 80 },
  { city: 'Raleigh', country: 'USA', code: 'RDU', type: 'airport', popularity: 75 },
  { city: 'St Louis', country: 'USA', code: 'STL', type: 'airport', popularity: 72 },
  { city: 'Baltimore', country: 'USA', code: 'BWI', type: 'airport', popularity: 78 },
  { city: 'San Jose', country: 'USA', code: 'SJC', type: 'airport', popularity: 80 },
  { city: 'Oakland', country: 'USA', code: 'OAK', type: 'airport', popularity: 75 },
  { city: 'Sacramento', country: 'USA', code: 'SMF', type: 'airport', popularity: 72 },
  { city: 'Kansas City', country: 'USA', code: 'MCI', type: 'airport', popularity: 70 },
  { city: 'Cleveland', country: 'USA', code: 'CLE', type: 'airport', popularity: 70 },
  { city: 'Indianapolis', country: 'USA', code: 'IND', type: 'airport', popularity: 72 },
  { city: 'Columbus', country: 'USA', code: 'CMH', type: 'airport', popularity: 70 },
  { city: 'San Antonio', country: 'USA', code: 'SAT', type: 'airport', popularity: 75 },
  { city: 'Pittsburgh', country: 'USA', code: 'PIT', type: 'airport', popularity: 72 },
  { city: 'Cincinnati', country: 'USA', code: 'CVG', type: 'airport', popularity: 70 },
  { city: 'Milwaukee', country: 'USA', code: 'MKE', type: 'airport', popularity: 68 },
  { city: 'New Orleans', country: 'USA', code: 'MSY', type: 'airport', popularity: 88 },
  { city: 'Honolulu', country: 'USA', code: 'HNL', type: 'airport', popularity: 95 },
  { city: 'Anchorage', country: 'USA', code: 'ANC', type: 'airport', popularity: 75 },
  { city: 'Albuquerque', country: 'USA', code: 'ABQ', type: 'airport', popularity: 70 },
  
  // Canada
  { city: 'Toronto', country: 'Canada', code: 'YYZ', type: 'airport', popularity: 95 },
  { city: 'Vancouver', country: 'Canada', code: 'YVR', type: 'airport', popularity: 92 },
  { city: 'Montreal', country: 'Canada', code: 'YUL', type: 'airport', popularity: 88 },
  { city: 'Calgary', country: 'Canada', code: 'YYC', type: 'airport', popularity: 82 },
  
  // UK
  { city: 'London', country: 'United Kingdom', code: 'LHR', type: 'airport', popularity: 100 },
  { city: 'London', country: 'United Kingdom', code: 'LGW', type: 'airport', popularity: 92 },
  { city: 'London', country: 'United Kingdom', code: 'STN', type: 'airport', popularity: 88 },
  { city: 'Manchester', country: 'United Kingdom', code: 'MAN', type: 'airport', popularity: 85 },
  { city: 'Edinburgh', country: 'United Kingdom', code: 'EDI', type: 'airport', popularity: 87 },
  
  // Europe - France
  { city: 'Paris', country: 'France', code: 'CDG', type: 'airport', popularity: 100 },
  { city: 'Paris', country: 'France', code: 'ORY', type: 'airport', popularity: 88 },
  { city: 'Nice', country: 'France', code: 'NCE', type: 'airport', popularity: 85 },
  { city: 'Lyon', country: 'France', code: 'LYS', type: 'airport', popularity: 78 },
  { city: 'Marseille', country: 'France', code: 'MRS', type: 'airport', popularity: 75 },
  
  // Europe - Germany
  { city: 'Berlin', country: 'Germany', code: 'BER', type: 'airport', popularity: 95 },
  { city: 'Munich', country: 'Germany', code: 'MUC', type: 'airport', popularity: 92 },
  { city: 'Frankfurt', country: 'Germany', code: 'FRA', type: 'airport', popularity: 95 },
  { city: 'Hamburg', country: 'Germany', code: 'HAM', type: 'airport', popularity: 80 },
  
  // Europe - Spain
  { city: 'Barcelona', country: 'Spain', code: 'BCN', type: 'airport', popularity: 98 },
  { city: 'Madrid', country: 'Spain', code: 'MAD', type: 'airport', popularity: 95 },
  { city: 'Malaga', country: 'Spain', code: 'AGP', type: 'airport', popularity: 82 },
  { city: 'Valencia', country: 'Spain', code: 'VLC', type: 'airport', popularity: 78 },
  { city: 'Seville', country: 'Spain', code: 'SVQ', type: 'airport', popularity: 80 },
  
  // Europe - Italy
  { city: 'Rome', country: 'Italy', code: 'FCO', type: 'airport', popularity: 98 },
  { city: 'Milan', country: 'Italy', code: 'MXP', type: 'airport', popularity: 92 },
  { city: 'Venice', country: 'Italy', code: 'VCE', type: 'airport', popularity: 95 },
  { city: 'Florence', country: 'Italy', code: 'FLR', type: 'airport', popularity: 88 },
  { city: 'Naples', country: 'Italy', code: 'NAP', type: 'airport', popularity: 80 },
  
  // Europe - Netherlands
  { city: 'Amsterdam', country: 'Netherlands', code: 'AMS', type: 'airport', popularity: 98 },
  
  // Europe - Belgium
  { city: 'Brussels', country: 'Belgium', code: 'BRU', type: 'airport', popularity: 88 },
  
  // Europe - Switzerland
  { city: 'Zurich', country: 'Switzerland', code: 'ZRH', type: 'airport', popularity: 90 },
  { city: 'Geneva', country: 'Switzerland', code: 'GVA', type: 'airport', popularity: 88 },
  
  // Europe - Austria
  { city: 'Vienna', country: 'Austria', code: 'VIE', type: 'airport', popularity: 88 },
  
  // Europe - Greece
  { city: 'Athens', country: 'Greece', code: 'ATH', type: 'airport', popularity: 90 },
  { city: 'Santorini', country: 'Greece', code: 'JTR', type: 'airport', popularity: 92 },
  { city: 'Mykonos', country: 'Greece', code: 'JMK', type: 'airport', popularity: 88 },
  
  // Europe - Portugal
  { city: 'Lisbon', country: 'Portugal', code: 'LIS', type: 'airport', popularity: 92 },
  { city: 'Porto', country: 'Portugal', code: 'OPO', type: 'airport', popularity: 85 },
  
  // Europe - Czech Republic
  { city: 'Prague', country: 'Czech Republic', code: 'PRG', type: 'airport', popularity: 90 },
  
  // Europe - Poland
  { city: 'Warsaw', country: 'Poland', code: 'WAW', type: 'airport', popularity: 82 },
  { city: 'Krakow', country: 'Poland', code: 'KRK', type: 'airport', popularity: 85 },
  
  // Europe - Ireland
  { city: 'Dublin', country: 'Ireland', code: 'DUB', type: 'airport', popularity: 88 },
  
  // Europe - Denmark
  { city: 'Copenhagen', country: 'Denmark', code: 'CPH', type: 'airport', popularity: 88 },
  
  // Europe - Norway
  { city: 'Oslo', country: 'Norway', code: 'OSL', type: 'airport', popularity: 82 },
  
  // Europe - Sweden
  { city: 'Stockholm', country: 'Sweden', code: 'ARN', type: 'airport', popularity: 85 },
  
  // Europe - Finland
  { city: 'Helsinki', country: 'Finland', code: 'HEL', type: 'airport', popularity: 80 },
  
  // Middle East - Israel
  { city: 'Tel Aviv', country: 'Israel', code: 'TLV', type: 'airport', popularity: 92 },
  
  // Middle East - UAE
  { city: 'Dubai', country: 'United Arab Emirates', code: 'DXB', type: 'airport', popularity: 98 },
  { city: 'Abu Dhabi', country: 'United Arab Emirates', code: 'AUH', type: 'airport', popularity: 88 },
  
  // Middle East - Qatar
  { city: 'Doha', country: 'Qatar', code: 'DOH', type: 'airport', popularity: 88 },
  
  // Middle East - Turkey
  { city: 'Istanbul', country: 'Turkey', code: 'IST', type: 'airport', popularity: 95 },
  { city: 'Antalya', country: 'Turkey', code: 'AYT', type: 'airport', popularity: 85 },
  
  // Asia - Japan
  { city: 'Tokyo', country: 'Japan', code: 'NRT', type: 'airport', popularity: 98 },
  { city: 'Tokyo', country: 'Japan', code: 'HND', type: 'airport', popularity: 95 },
  { city: 'Osaka', country: 'Japan', code: 'KIX', type: 'airport', popularity: 90 },
  { city: 'Kyoto', country: 'Japan', type: 'city', popularity: 92 },
  
  // Asia - China
  { city: 'Beijing', country: 'China', code: 'PEK', type: 'airport', popularity: 95 },
  { city: 'Shanghai', country: 'China', code: 'PVG', type: 'airport', popularity: 95 },
  { city: 'Hong Kong', country: 'China', code: 'HKG', type: 'airport', popularity: 98 },
  { city: 'Guangzhou', country: 'China', code: 'CAN', type: 'airport', popularity: 85 },
  
  // Asia - Singapore
  { city: 'Singapore', country: 'Singapore', code: 'SIN', type: 'airport', popularity: 98 },
  
  // Asia - Thailand
  { city: 'Bangkok', country: 'Thailand', code: 'BKK', type: 'airport', popularity: 95 },
  { city: 'Phuket', country: 'Thailand', code: 'HKT', type: 'airport', popularity: 92 },
  
  // Asia - South Korea
  { city: 'Seoul', country: 'South Korea', code: 'ICN', type: 'airport', popularity: 92 },
  
  // Asia - India
  { city: 'Delhi', country: 'India', code: 'DEL', type: 'airport', popularity: 90 },
  { city: 'Mumbai', country: 'India', code: 'BOM', type: 'airport', popularity: 90 },
  { city: 'Bangalore', country: 'India', code: 'BLR', type: 'airport', popularity: 82 },
  
  // Asia - Indonesia
  { city: 'Bali', country: 'Indonesia', code: 'DPS', type: 'airport', popularity: 95 },
  { city: 'Jakarta', country: 'Indonesia', code: 'CGK', type: 'airport', popularity: 85 },
  
  // Asia - Vietnam
  { city: 'Ho Chi Minh City', country: 'Vietnam', code: 'SGN', type: 'airport', popularity: 85 },
  { city: 'Hanoi', country: 'Vietnam', code: 'HAN', type: 'airport', popularity: 82 },
  
  // Asia - Malaysia
  { city: 'Kuala Lumpur', country: 'Malaysia', code: 'KUL', type: 'airport', popularity: 88 },
  
  // Asia - Philippines
  { city: 'Manila', country: 'Philippines', code: 'MNL', type: 'airport', popularity: 82 },
  
  // Oceania - Australia
  { city: 'Sydney', country: 'Australia', code: 'SYD', type: 'airport', popularity: 95 },
  { city: 'Melbourne', country: 'Australia', code: 'MEL', type: 'airport', popularity: 90 },
  { city: 'Brisbane', country: 'Australia', code: 'BNE', type: 'airport', popularity: 82 },
  { city: 'Perth', country: 'Australia', code: 'PER', type: 'airport', popularity: 75 },
  
  // Oceania - New Zealand
  { city: 'Auckland', country: 'New Zealand', code: 'AKL', type: 'airport', popularity: 88 },
  { city: 'Queenstown', country: 'New Zealand', code: 'ZQN', type: 'airport', popularity: 85 },
  
  // South America - Brazil
  { city: 'Rio de Janeiro', country: 'Brazil', code: 'GIG', type: 'airport', popularity: 92 },
  { city: 'Sao Paulo', country: 'Brazil', code: 'GRU', type: 'airport', popularity: 88 },
  
  // South America - Argentina
  { city: 'Buenos Aires', country: 'Argentina', code: 'EZE', type: 'airport', popularity: 90 },
  
  // South America - Peru
  { city: 'Lima', country: 'Peru', code: 'LIM', type: 'airport', popularity: 82 },
  
  // South America - Colombia
  { city: 'Bogota', country: 'Colombia', code: 'BOG', type: 'airport', popularity: 78 },
  
  // South America - Chile
  { city: 'Santiago', country: 'Chile', code: 'SCL', type: 'airport', popularity: 80 },
  
  // Caribbean
  { city: 'Cancun', country: 'Mexico', code: 'CUN', type: 'airport', popularity: 95 },
  { city: 'Mexico City', country: 'Mexico', code: 'MEX', type: 'airport', popularity: 88 },
  { city: 'Montego Bay', country: 'Jamaica', code: 'MBJ', type: 'airport', popularity: 85 },
  
  // Africa
  { city: 'Cairo', country: 'Egypt', code: 'CAI', type: 'airport', popularity: 88 },
  { city: 'Cape Town', country: 'South Africa', code: 'CPT', type: 'airport', popularity: 90 },
  { city: 'Johannesburg', country: 'South Africa', code: 'JNB', type: 'airport', popularity: 85 },
  { city: 'Marrakech', country: 'Morocco', code: 'RAK', type: 'airport', popularity: 88 },
  
  // Add more European cities
  { city: 'Reykjavik', country: 'Iceland', code: 'KEF', type: 'airport', popularity: 90 },
  { city: 'Budapest', country: 'Hungary', code: 'BUD', type: 'airport', popularity: 88 },
];
*/

// Function to generate search terms
function generateSearchTerms(city, country, code) {
  const terms = new Set();
  
  // Add lowercase versions
  terms.add(city.toLowerCase());
  terms.add(country.toLowerCase());
  if (code) terms.add(code.toLowerCase());
  
  // Add partial matches for multi-word cities
  const cityWords = city.toLowerCase().split(' ');
  cityWords.forEach(word => {
    if (word.length > 2) terms.add(word);
  });
  
  // Add country code abbreviations
  const countryAbbr = {
    'United States': 'usa',
    'United Kingdom': 'uk',
    'United Arab Emirates': 'uae',
  };
  if (countryAbbr[country]) {
    terms.add(countryAbbr[country]);
  }
  
  return Array.from(terms);
}

// Seed function
exports.seedGlobalDestinations = functions.region('europe-west1').https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const batch = db.batch();
    let count = 0;
    
    for (const dest of DESTINATIONS) {
      const name = dest.code 
        ? `${dest.city}, ${dest.country} [${dest.code}]`
        : `${dest.city}, ${dest.country}`;
      
      const searchTerms = generateSearchTerms(dest.city, dest.country, dest.code);
      
      const docRef = db.collection('GlobalDestinations').doc();
      batch.set(docRef, {
        id: docRef.id,
        name,
        city: dest.city,
        country: dest.country,
        code: dest.code || null,
        type: dest.type,
        search_terms: searchTerms,
        popularity: dest.popularity,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      count++;
      
      // Firestore batches have a limit of 500 operations
      if (count % 500 === 0) {
        await batch.commit();
        functions.logger.info(`Committed batch of 500, total: ${count}`);
      }
    }
    
    // Commit remaining
    await batch.commit();
    
    functions.logger.info(`Successfully seeded ${count} global destinations`);
    res.status(200).json({ 
      success: true, 
      message: `Seeded ${count} destinations`,
      count 
    });
    
  } catch (error) {
    functions.logger.error('Error seeding destinations', error);
    res.status(500).json({ error: error.message });
  }
});
