type User @table {
  username: String! @unique
  email: String! @unique
  profilePictureUrl: String
  preferences: String
}

type Trip @table {
  user: User!
  name: String!
  startDate: Date!
  endDate: Date!
  destination: String!
  description: String
  imageUrl: String
  visibility: String! # Could be enum: PUBLIC, PRIVATE, SHARED
  createdAt: Timestamp!
  updatedAt: Timestamp!
}

type Itinerary @table {
  trip: Trip!
  dayNumber: Int!
  title: String
  notes: String
}

type Activity @table {
  itinerary: Itinerary!
  name: String!
  type: String! # Could be enum: FLIGHT, ACCOMMODATION, ATTRACTION, DINING, TRANSPORT, etc.
  location: String
  startTime: Timestamp
  endTime: Timestamp
  description: String
  bookingInfo: String
  cost: Float
}

type Collaboration @table(key: ["user", "trip"]) {
  user: User!
  trip: Trip!
  role: String! # Could be enum: OWNER, EDITOR, VIEWER
  createdAt: Timestamp!
}
