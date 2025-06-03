/**
 * Data Processing Utilities
 * Contains functions for interpolation
 */

/**
 * Performs linear interpolation between missing data points
 * @param {Array} data - Array of data values
 * @returns {Array} - Interpolated data
 */
export const linearInterpolation = (data) => {
  const result = [...data];
  
  // Find segments with null/undefined values and interpolate
  for (let i = 0; i < result.length; i++) {
    if (result[i] === null || result[i] === undefined) {
      // Find the next valid value
      let nextValidIndex = i + 1;
      while (nextValidIndex < result.length && 
            (result[nextValidIndex] === null || result[nextValidIndex] === undefined)) {
        nextValidIndex++;
      }
      
      // If we have values on both ends, interpolate
      if (i > 0 && nextValidIndex < result.length) {
        const startValue = result[i-1];
        const endValue = result[nextValidIndex];
        const totalSteps = nextValidIndex - (i-1);
        
        // Fill in intermediate values
        for (let j = i; j < nextValidIndex; j++) {
          const step = j - (i-1);
          result[j] = startValue + (endValue - startValue) * (step / totalSteps);
        }
      }
    }
  }
  
  return result;
};
