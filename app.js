const fs = require('fs');
const Redis = require('ioredis');
const { MongoClient } = require('mongodb');

// Redis configuration
const redis = new Redis();

// MongoDB configuration
const mongoClient = new MongoClient('mongodb+srv://Vansh:e8MchP38teOryjYm@testcluster.vnwjzfa.mongodb.net/', { useNewUrlParser: true, useUnifiedTopology: true });

// Load JSON file
const carData = JSON.parse(fs.readFileSync('car_data.json', 'utf8'));

// Fetch latitude and longitude one by one
function fetchDataFromJSON() {
  const dataPoint = carData.shift(); // Remove the first data point from the array
  if (!dataPoint) {
    clearInterval(interval); // Stop the interval when all data is processed
    console.log('Finished processing all data.');
    return;
  }

  const { latitude, longitude } = dataPoint;

  // Store latitude and longitude in Redis
  redis.set('latitude', latitude);
  redis.set('longitude', longitude);

  // Set timeout to write data to MongoDB after 1 minute
  setTimeout(async () => {
    const storedLatitude = await redis.get('latitude');
    const storedLongitude = await redis.get('longitude');

    // Write data to MongoDB
    await mongoClient.connect();
    const db = mongoClient.db('Vansh');
    const collection = db.collection('Ambulance');
    const data = { latitude: storedLatitude, longitude: storedLongitude };
    await collection.insertOne(data);

    console.log('Data written to MongoDB:', data);

    // Clear Redis after writing to MongoDB
    await redis.flushall();
  }, 100000);
}

// Run the process every 15 seconds
const interval = setInterval(fetchDataFromJSON, 10000);

// Close connections when finished
function cleanup() {
  clearInterval(interval);
  redis.disconnect();
  mongoClient.close();
}
// Uncomment the line below if you want to stop the process after a specific time, e.g., 5 minutes
// setTimeout(cleanup, 5 * 60 * 1000);
const express = require('express');
const app = express();

// API endpoint to fetch coordinates from Redis
app.get('/getCoordinates', async (req, res) => {
  console.log('Received a request to /getCoordinates');
  try {
    const latitude = await redis.get('latitude');
    const longitude = await redis.get('longitude');
    res.json({ latitude, longitude });
  } catch (error) {
    console.error('Error fetching coordinates:', error);
    res.status(500).json({ error: 'Failed to fetch coordinates' });
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});