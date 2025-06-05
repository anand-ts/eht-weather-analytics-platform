// src/apolloClient.js
import { ApolloClient, InMemoryCache } from '@apollo/client';

// Use environment variable for backend URL with fallback
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

const client = new ApolloClient({
  uri: `${BACKEND_URL}/graphql`,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'ignore',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});

export default client;
