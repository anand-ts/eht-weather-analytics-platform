// server.js
const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const mongoose = require('mongoose');
const cors = require('cors'); // Add CORS support

// Determine MongoDB connection URL based on environment
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/data_stream';
console.log(`Attempting to connect to MongoDB at: ${MONGO_URI}`);

// Connect to MongoDB with retry mechanism - remove deprecated options
const connectWithRetry = () => {
  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log('Connected to MongoDB');
    })
    .catch(err => {
      console.error('MongoDB connection error:', err);
      console.log('Retrying connection in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

// Define Mongoose Schema (shared by all collections)
const weatherSchema = new mongoose.Schema({
  wdatetime: String, // Kept as String
  temperature_k: Number,
  dewpoint_k: Number,
  pressure_kpa: Number,
  relhumidity_pct: Number,
  winddir_deg: Number,
  windspeed_mps: Number,
  pwv_mm: Number,
  phaserms_deg: Number,
  tau183ghz: Number,
  tau215ghz: Number,
  tau225ghz: Number,
}, { collection: 'apex_2006_2023' });

// Define Models for Each Collection (only creating models for the ones we have data for)
const WeatherApex = mongoose.model('WeatherApex', weatherSchema, 'apex_2006_2023');
const WeatherGlt = mongoose.model('WeatherGlt', weatherSchema, 'glt_2017_2022');

// Add placeholder models for other telescopes (these would be replaced with real data when available)
const weatherModelMap = {
  'apex_2006_2023': WeatherApex,
  'glt_2017_2022': WeatherGlt,
  // When real data becomes available, replace these lines:
  'jcmt_data': WeatherApex, // Using Apex as placeholder
  'sma_data': WeatherApex,  // Using Apex as placeholder
  'smt_data': WeatherApex,  // Using Apex as placeholder
  'lmt_data': WeatherApex,  // Using Apex as placeholder
  'alma_data': WeatherApex,  // Using Apex as placeholder
};

// After defining models, create indexes for better performance
const createIndexes = async () => {
  try {
    // Create simple indexes
    await WeatherApex.collection.createIndex({ wdatetime: 1 });
    console.log('Created index on WeatherApex.wdatetime');
    
    await WeatherGlt.collection.createIndex({ wdatetime: 1 });
    console.log('Created index on WeatherGlt.wdatetime');
  } catch (err) {
    console.error('Error creating indexes:', err);
  }
};

// Create indexes after connection is established
mongoose.connection.once('connected', () => {
  createIndexes();
});

// Generate a request ID to track concurrent requests in logs
const generateRequestId = () => {
  return Math.random().toString(36).substring(2, 10);
};

// Helper function to chunk date ranges for better query performance
const getDateChunks = (startDate, endDate, numChunks = 5) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalTime = end - start;
  const chunkSize = Math.ceil(totalTime / numChunks);
  
  const chunks = [];
  for (let i = 0; i < numChunks; i++) {
    const chunkStart = new Date(start.getTime() + (chunkSize * i));
    const chunkEnd = i === numChunks - 1 
      ? end 
      : new Date(start.getTime() + (chunkSize * (i + 1)));
    
    chunks.push({
      start: chunkStart.toISOString().replace('T', ' ').substring(0, 19),
      end: chunkEnd.toISOString().replace('T', ' ').substring(0, 19)
    });
  }
  return chunks;
};

// Replace the formatDateWithTimezone function with a simpler version that preserves the original format
const formatDateString = (dateStr) => {
  if (!dateStr) return '';
  
  // Return the original format as stored in MongoDB
  // This ensures consistency between what's queried and what's displayed
  return dateStr;
};

// GraphQL Type Definitions
const typeDefs = gql`
  enum CollectionName {
    apex_2006_2023
    glt_2017_2022
    jcmt_data
    sma_data
    smt_data
    lmt_data
    alma_data
  }

  type Weather {
    wdatetime: String
    temperature_k: Float
    dewpoint_k: Float
    pressure_kpa: Float
    relhumidity_pct: Float
    winddir_deg: Float
    windspeed_mps: Float
    pwv_mm: Float
    phaserms_deg: Float
    tau183ghz: Float
    tau215ghz: Float
    tau225ghz: Float
  }

  type Query {
    getWeatherData(collection: CollectionName!, limit: Int, startDate: String, endDate: String): [Weather]
    getWeatherByDate(collection: CollectionName!, wdatetime: String!): Weather
  }
`;

// GraphQL Resolvers
const resolvers = {
  Query: {
    getWeatherData: async (_, { collection, limit, startDate, endDate }) => {
      const requestId = generateRequestId();
      try {
        console.log(`[${requestId}] Request - collection: ${collection}, startDate: ${startDate}, endDate: ${endDate}, limit: ${limit || 1000}`);

        // Check MongoDB connection status
        if (mongoose.connection.readyState !== 1) {
          console.log(`[${requestId}] MongoDB connection not ready. State: ${mongoose.connection.readyState}`);
          throw new Error('Database connection not ready');
        }

        const WeatherModel = weatherModelMap[collection];
        if (!WeatherModel) {
          throw new Error('Invalid collection name');
        }

        // Verify collection has data
        console.log(`[${requestId}] Checking collection data...`);
        const dataExists = await WeatherModel.findOne({}).maxTimeMS(3000);
        
        if (!dataExists) {
          console.log(`[${requestId}] No data in collection`);
          return [];
        }
        
        let data = [];
        const requestedLimit = limit || 1000;
        
        // Use a chunked approach for large date ranges to avoid timeouts
        if (startDate && endDate) {
          console.log(`[${requestId}] Executing chunked date range query...`);
          
          try {
            // Calculate the time span to determine sampling strategy
            const startTime = new Date(startDate);
            const endTime = new Date(endDate);
            const timeSpanDays = (endTime - startTime) / (1000 * 60 * 60 * 24);
            
            console.log(`[${requestId}] Time span: ${timeSpanDays.toFixed(1)} days`);
            
            // For smaller queries or short time spans, try direct approach first
            if (requestedLimit <= 100 || timeSpanDays <= 7) {
              data = await WeatherModel.find({ 
                wdatetime: { $gte: startDate, $lte: endDate } 
              })
                .lean()
                .sort({ wdatetime: 1 })
                .limit(requestedLimit)
                .maxTimeMS(8000);
                
              console.log(`[${requestId}] Found ${data.length} records with direct query`);
            }
            
            // For larger time spans, use stratified sampling to ensure even distribution
            if (data.length < requestedLimit && timeSpanDays > 7) {
              // Get chunked date ranges
              const chunks = getDateChunks(startDate, endDate, Math.min(20, Math.ceil(timeSpanDays / 30))); // More chunks for longer periods
              console.log(`[${requestId}] Using ${chunks.length} date chunks for stratified sampling`);
              
              // Calculate samples per chunk to ensure even distribution
              const samplesPerChunk = Math.ceil(requestedLimit / chunks.length);
              console.log(`[${requestId}] Target samples per chunk: ${samplesPerChunk}`);
              
              data = [];
              // Process each chunk and collect samples evenly
              for (const chunk of chunks) {
                try {
                  const chunkData = await WeatherModel.find({
                    wdatetime: { $gte: chunk.start, $lte: chunk.end }
                  })
                    .lean()
                    .sort({ wdatetime: 1 })
                    .limit(samplesPerChunk)
                    .maxTimeMS(4000); // Shorter timeout per chunk
                  
                  console.log(`[${requestId}] Found ${chunkData.length} records in chunk ${chunk.start} to ${chunk.end}`);
                  data.push(...chunkData);
                } catch (chunkErr) {
                  console.warn(`[${requestId}] Chunk query failed for ${chunk.start} to ${chunk.end}:`, chunkErr.message);
                  // Continue with other chunks even if one fails
                }
              }
              
              // If we have more data than requested, sample evenly across the timeline
              if (data.length > requestedLimit) {
                const step = Math.floor(data.length / requestedLimit);
                const sampledData = [];
                for (let i = 0; i < data.length && sampledData.length < requestedLimit; i += step) {
                  sampledData.push(data[i]);
                }
                data = sampledData;
                console.log(`[${requestId}] Sampled down to ${data.length} evenly distributed records`);
              }
              
              console.log(`[${requestId}] Found total of ${data.length} records with stratified sampling`);
            }
          } catch (err) {
            console.error(`[${requestId}] Chunked query error:`, err.message);
            // Continue to other approaches if chunked fails
          }
        } else if (startDate) {
          console.log(`[${requestId}] Executing start date query...`);
          data = await WeatherModel.find({ wdatetime: { $gte: startDate } })
            .lean()
            .sort({ wdatetime: 1 })
            .limit(requestedLimit)
            .maxTimeMS(8000);
          
          console.log(`[${requestId}] Found ${data.length} records with start date query`);
        } else if (endDate) {
          console.log(`[${requestId}] Executing end date query...`);
          data = await WeatherModel.find({ wdatetime: { $lte: endDate } })
            .lean()
            .sort({ wdatetime: 1 })
            .limit(requestedLimit)
            .maxTimeMS(8000);
          
          console.log(`[${requestId}] Found ${data.length} records with end date query`);
        } else {
          console.log(`[${requestId}] Executing query with no date filters...`);
          data = await WeatherModel.find()
            .lean()
            .sort({ wdatetime: -1 }) // Get newest data first
            .limit(requestedLimit)
            .maxTimeMS(5000);
          
          console.log(`[${requestId}] Found ${data.length} records with no date filter`);
        }
        
        // Keep fallback mechanisms
        if (data.length === 0) {
          console.log(`[${requestId}] No data from filtered queries, getting sample data...`);
          try {
            const sampleSize = Math.min(requestedLimit, 100);
            
            // Try a direct random sample approach - note the correct syntax for maxTimeMS
            const sampleData = await WeatherModel.aggregate([
              { $sample: { size: sampleSize } },
              { $sort: { wdatetime: 1 } }
            ]).option({ maxTimeMS: 5000 });  // This is the correct way to set maxTimeMS on aggregation
            
            console.log(`[${requestId}] Found ${sampleData.length} sample records via aggregation`);
            
            if (sampleData.length > 0) {
              data = sampleData;
            } else {
              // Last resort - use the reliable find method
              try {
                const firstRecords = await WeatherModel.find()
                  .lean()
                  .limit(sampleSize)
                  .maxTimeMS(3000);
                
                console.log(`[${requestId}] Found ${firstRecords.length} records as last resort`);
                data = firstRecords;
              } catch (lastResortErr) {
                console.error(`[${requestId}] Last resort error:`, lastResortErr.message);
                
                // Final fallback - get a single record
                const oneRecord = await WeatherModel.findOne({});
                if (oneRecord) {
                  data = [oneRecord];
                  console.log(`[${requestId}] Retrieved single record as final fallback`);
                }
              }
            }
          } catch (err) {
            console.error(`[${requestId}] Sample data error:`, err.message);
          }
        }
        
        console.log(`[${requestId}] Successfully returning ${data.length} records`);
        
        // Process data to handle potential type issues
        return data.map(entry => {
          const entryObj = entry.toObject ? entry.toObject() : entry;
          const processedObj = { ...entryObj };
          
          // Keep the original date string format
          processedObj.wdatetime = formatDateString(entryObj.wdatetime);
          
          const numericFields = ['temperature_k', 'dewpoint_k', 'pressure_kpa', 'relhumidity_pct', 
                                'winddir_deg', 'windspeed_mps', 'pwv_mm', 'phaserms_deg', 
                                'tau183ghz', 'tau215ghz', 'tau225ghz'];
          
          numericFields.forEach(field => {
            // Check for empty strings, undefined values, or missing properties
            if (!entryObj.hasOwnProperty(field) || 
                processedObj[field] === '' || 
                processedObj[field] === undefined) {
              processedObj[field] = null;
            }
          });
          
          return processedObj;
        });
      } catch (err) {
        console.error(`[${requestId}] Resolver error:`, err.message);
        return [];
      }
    },
    
    getWeatherByDate: async (_, { collection, wdatetime }) => {
      const requestId = generateRequestId();
      try {
        console.log(`[${requestId}] Weather by date request - collection: ${collection}, date: ${wdatetime}`);
        
        const WeatherModel = weatherModelMap[collection];
        if (!WeatherModel) {
          throw new Error('Invalid collection name');
        }

        const data = await WeatherModel.findOne({ wdatetime }).lean();
        if (data) {
          const processedObj = { ...data };
          
          // Keep the original date string format
          processedObj.wdatetime = formatDateString(data.wdatetime);
          
          const numericFields = ['temperature_k', 'dewpoint_k', 'pressure_kpa', 'relhumidity_pct', 
                                'winddir_deg', 'windspeed_mps', 'pwv_mm', 'phaserms_deg', 
                                'tau183ghz', 'tau215ghz', 'tau225ghz'];
          
          numericFields.forEach(field => {
            if (processedObj[field] === '' || processedObj[field] === undefined) {
              processedObj[field] = null;
            }
          });
          
          return processedObj;
        }
        return null;
      } catch (err) {
        console.error(`[${requestId}] Error in getWeatherByDate:`, err);
        return null;
      }
    },
  },
};

// Initialize Apollo Server
const server = new ApolloServer({ typeDefs, resolvers });

// Apply Middleware to Express App
const app = express();

// Enable CORS for all routes
app.use(cors());

server.start().then(res => {
  server.applyMiddleware({ app });

  // Start the Server
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server ready at http://localhost:${PORT}${server.graphqlPath}`);
  });
});
