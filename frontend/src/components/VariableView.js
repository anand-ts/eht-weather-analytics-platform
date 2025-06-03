import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLazyQuery } from '@apollo/client';
import { GET_WEATHER_DATA } from '../queries';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { Chart } from 'chart.js';
import Zoom from 'chartjs-plugin-zoom/dist/chartjs-plugin-zoom.min.js';
import { Link } from 'react-router-dom';
// add Mantine + date-fns
import { DatePicker } from '@mantine/dates';
import { format } from 'date-fns';

// Import the logo image
import blackHoleLogo from '../assets/black_hole.jpg';

// Fix heroicons import with correct component names and add ExpandIcon
import { ArrowLeftIcon, SunIcon, MoonIcon, DownloadIcon, RefreshIcon, ArrowsExpandIcon, XIcon } from '@heroicons/react/solid';

// Add these imports at the top
import { linearInterpolation } from '../utils/dataProcessing';

// Register Zoom Plugin
Chart.register(Zoom);

function VariableView() {
  // Initialize state from localStorage or use defaults
  const [selectedCollection, setSelectedCollection] = useState(() => {
    return localStorage.getItem('variableView_selectedCollection') || 'apex_2006_2023';
  });
  const [selectedVariables, setSelectedVariables] = useState(() => {
    const saved = localStorage.getItem('variableView_selectedVariables');
    return saved ? JSON.parse(saved) : [];
  });
  const [showMovingAverage, setShowMovingAverage] = useState(() => {
    return localStorage.getItem('variableView_showMovingAverage') === 'true';
  });
  const [movingAverageWindow, setMovingAverageWindow] = useState(() => {
    const saved = localStorage.getItem('variableView_movingAverageWindow');
    return saved ? parseInt(saved, 10) : 5;
  });
  // add DateRangePicker state
  const [dateRange, setDateRange] = useState(() => {
    const saved = localStorage.getItem('variableView_dateRange');
    if (saved) {
      const [s, e] = JSON.parse(saved);
      return [s ? new Date(s) : null, e ? new Date(e) : null];
    }
    return [null, null];
  });
  const [showOnlyMovingAverage, setShowOnlyMovingAverage] = useState(() => {
    return localStorage.getItem('variableView_showOnlyMovingAverage') === 'true';
  });

  // New state variables for statisticsd 
  const [showStatistics, setShowStatistics] = useState(() => {
    return localStorage.getItem('variableView_showStatistics') === 'true';
  });
  const [showCorrelation, setShowCorrelation] = useState(() => {
    return localStorage.getItem('variableView_showCorrelation') === 'true';
  });

  // Add new state variables for interpolation
  const [interpolationMethod, setInterpolationMethod] = useState(() => {
    return localStorage.getItem('variableView_interpolationMethod') || 'none';
  });

  // Save cached data in state
  const [cachedData, setCachedData] = useState(() => {
    const saved = localStorage.getItem('variableView_cachedData');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse cached data', e);
      return null;
    }
  });

  // Refs for accessing chart instances and containers
  const mainChartRef = useRef(null);
  const maChartRef = useRef(null);
  const mainChartContainerRef = useRef(null);
  const maChartContainerRef = useRef(null);

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' ? true : false;
  });

  // Add state for expanded view (different from fullscreen)
  const [expandedChart, setExpandedChart] = useState(null); // null, 'main', or 'ma'

  // Update localStorage when state changes
  useEffect(() => {
    localStorage.setItem('variableView_selectedCollection', selectedCollection);
  }, [selectedCollection]);

  useEffect(() => {
    localStorage.setItem('variableView_selectedVariables', JSON.stringify(selectedVariables));
  }, [selectedVariables]);

  useEffect(() => {
    localStorage.setItem('variableView_showMovingAverage', showMovingAverage);
  }, [showMovingAverage]);

  useEffect(() => {
    localStorage.setItem('variableView_movingAverageWindow', movingAverageWindow);
  }, [movingAverageWindow]);

  useEffect(() => {
    localStorage.setItem('variableView_showOnlyMovingAverage', showOnlyMovingAverage);
  }, [showOnlyMovingAverage]);

  useEffect(() => {
    localStorage.setItem('variableView_showStatistics', showStatistics);
  }, [showStatistics]);

  useEffect(() => {
    localStorage.setItem('variableView_showCorrelation', showCorrelation);
  }, [showCorrelation]);

  useEffect(() => {
    localStorage.setItem('variableView_interpolationMethod', interpolationMethod);
  }, [interpolationMethod]);

  useEffect(() => {
    localStorage.setItem('variableView_dateRange', JSON.stringify(dateRange));
  }, [dateRange]);

  // Update the HTML element's class based on dark mode state
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Function to toggle expanded view (in-page maximized)
  const toggleExpandedView = (chartType) => {
    if (expandedChart === chartType) {
      setExpandedChart(null);
    } else {
      setExpandedChart(chartType);
    }
  };

  // Helper function to validate date format
  const isValidDateFormat = useCallback((dateString) => {
    // Regex to match "YYYY-MM-DD HH:mm:ss"
    const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    return regex.test(dateString);
  }, []);

  // Initialize useLazyQuery
  const [getWeatherData, { loading, error, data }] = useLazyQuery(GET_WEATHER_DATA, {
    fetchPolicy: 'network-only', // Always fetch from server
    onCompleted: (newData) => {
      if (newData && newData.getWeatherData) {
        // Cache the response data in localStorage
        try {
          localStorage.setItem('variableView_cachedData', JSON.stringify(newData));
          setCachedData(newData);
        } catch (e) {
          console.error('Failed to cache data in localStorage', e);
        }
      }
    }
  });

  // Use either fresh data or cached data
  const effectiveData = data || cachedData;

  // Re-fetch data when parameters change
  useEffect(() => {
    // Only run if all required parameters are valid
    const isStartDateValid = dateRange[0] && isValidDateFormat(format(dateRange[0], 'yyyy-MM-dd HH:mm:ss'));
    const isEndDateValid = dateRange[1] && isValidDateFormat(format(dateRange[1], 'yyyy-MM-dd HH:mm:ss'));

    if (isStartDateValid && isEndDateValid && cachedData === null) {
      getWeatherData({
        variables: {
          collection: selectedCollection,
          limit: 10000,
          startDate: format(dateRange[0], 'yyyy-MM-dd HH:mm:ss'),
          endDate: format(dateRange[1], 'yyyy-MM-dd HH:mm:ss'),
        }
      });
    }
  }, [dateRange, selectedCollection, getWeatherData, isValidDateFormat, cachedData]);

  const handleVariableChange = (event) => {
    const { value, checked } = event.target;
    if (checked) {
      setSelectedVariables((prev) => [...prev, value]);
    } else {
      setSelectedVariables((prev) => prev.filter((item) => item !== value));
    }
  };

  const handleMovingAverageToggle = () => {
    setShowMovingAverage(!showMovingAverage);
  };

  const handleMovingAverageWindowChange = (event) => {
    const value = event.target.value;
    // Validate that the input is a positive integer
    const intValue = parseInt(value, 10);
    if (!isNaN(intValue) && intValue > 0) {
      setMovingAverageWindow(intValue);
    } else if (value === '') {
      setMovingAverageWindow('');
    }
  };

  const calculateMovingAverage = (data, windowSize = 5) => {
    if (!data || data.length === 0) return {};

    const averages = {};

    selectedVariables.forEach((variable) => {
      averages[variable] = [];

      for (let i = 0; i < data.length; i++) {
        // Define the window slice
        const window = data.slice(i - windowSize + 1, i + 1);

        // Filter out 0 and undefined/null values
        const validValues = window
          .map((entry) => entry[variable])
          .filter((value) => value !== 0 && value !== undefined && value !== null);

        if (validValues.length === 0) {
          averages[variable].push(null); // Not enough valid data to calculate average
          continue;
        }

        // Calculate the average of valid values
        const sum = validValues.reduce((acc, curr) => acc + curr, 0);
        const avg = sum / validValues.length;

        averages[variable].push(avg);
      }
    });

    return averages;
  };

  const getColor = (index, opacity = 1) => {
    const colors = [
      'rgba(75,192,192',   // Teal
      'rgba(255,99,132',   // Red
      'rgba(54,162,235',   // Blue
      'rgba(255,206,86',    // Yellow
      'rgba(153,102,255',   // Purple
      'rgba(255,159,64',    // Orange
    ];

    const baseColor = colors[index % colors.length] + `, ${opacity})`;
    return baseColor;
  };

  const getChartData = () => {
    if (!effectiveData || !effectiveData.getWeatherData || selectedVariables.length === 0) return { labels: [], datasets: [] };

    const cleanedData = effectiveData.getWeatherData.filter((entry) => entry.wdatetime);

    if (cleanedData.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = cleanedData.map((entry) =>
      new Date(entry.wdatetime).toLocaleString()
    );

    const chartData = {
      labels,
      datasets: [],
    };

    selectedVariables.forEach((variable, index) => {
      // Extract raw values
      let values = cleanedData.map(
        (entry) => (entry[variable] !== undefined ? entry[variable] : null)
      );

      // Apply interpolation if selected
      let processedValues = values;
      if (interpolationMethod === 'linear') {
        processedValues = linearInterpolation(values);
      }

      // Get variable color
      const baseColor = getColor(index);

      // Create dataset
      const dataset = {
        label: variables.find((v) => v.value === variable).label,
        data: processedValues,
        fill: false,
        backgroundColor: baseColor,
        borderColor: baseColor,
        borderWidth: 1,
        pointRadius: 1,
        pointBackgroundColor: baseColor,
        pointBorderColor: baseColor,
        pointBorderWidth: 1,
        pointStyle: 'circle',
        pointHoverRadius: 8,
        tension: 0.1,
        spanGaps: interpolationMethod === 'none',
        yAxisID: selectedVariables.length > 1 ? `y-axis-${index}` : 'y',
      };

      chartData.datasets.push(dataset);

      // Moving Average Dataset
      if (showMovingAverage && movingAverageWindow) {
        const movingAverage = calculateMovingAverage(cleanedData, movingAverageWindow)[variable];
        chartData.datasets.push({
          label: `${variables.find((v) => v.value === variable).label} (${movingAverageWindow}-point MA)`,
          data: movingAverage,
          fill: false,
          backgroundColor: getColor(index, 0.5), // 50% opacity
          borderColor: getColor(index, 0.5),     // 50% opacity
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.1,
          spanGaps: true,
          yAxisID: selectedVariables.length > 1 ? `y-axis-${index}` : 'y',
        });
      }
    });

    return chartData;
  };

  const getMovingAverageChartData = () => {
    if (!effectiveData || !effectiveData.getWeatherData || selectedVariables.length === 0) return { labels: [], datasets: [] };

    const cleanedData = effectiveData.getWeatherData.filter((entry) => entry.wdatetime);

    if (cleanedData.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = cleanedData.map((entry) =>
      new Date(entry.wdatetime).toLocaleString()
    );

    const chartData = {
      labels,
      datasets: [],
    };

    // Moving Average Graph
    selectedVariables.forEach((variable, index) => {
      if (showMovingAverage && movingAverageWindow) {
        const movingAverage = calculateMovingAverage(cleanedData, movingAverageWindow)[variable];
        chartData.datasets.push({
          label: `${variables.find((v) => v.value === variable).label} (${movingAverageWindow}-point MA)`,
          data: movingAverage,
          fill: false,
          backgroundColor: getColor(index),
          borderColor: getColor(index),
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.1,
          spanGaps: true,
          yAxisID: selectedVariables.length > 1 ? `y-axis-${index}` : 'y',
        });
      }
    });

    return chartData;
  };

  const calculateMean = (data, variable) => {
    if (!data || data.length === 0) return 0;

    const validValues = data
      .map(entry => entry[variable])
      .filter(value => value !== undefined && value !== null && !isNaN(value));

    if (validValues.length === 0) return 0;

    const sum = validValues.reduce((acc, curr) => acc + curr, 0);
    return sum / validValues.length;
  };

  const calculateStdDev = (data, variable) => {
    if (!data || data.length === 0) return 0;

    const validValues = data
      .map(entry => entry[variable])
      .filter(value => value !== undefined && value !== null && !isNaN(value));

    if (validValues.length === 0) return 0;

    const mean = validValues.reduce((acc, curr) => acc + curr, 0) / validValues.length;
    const squaredDifferences = validValues.map(value => Math.pow(value - mean, 2));
    const variance = squaredDifferences.reduce((acc, curr) => acc + curr, 0) / validValues.length;
    return Math.sqrt(variance);
  };

  const calculateCorrelation = (data, var1, var2) => {
    if (!data || data.length === 0 || !var1 || !var2) return 0;

    const pairs = data.map(entry => [entry[var1], entry[var2]])
      .filter(pair => pair[0] !== undefined && pair[0] !== null && !isNaN(pair[0]) &&
        pair[1] !== undefined && pair[1] !== null && !isNaN(pair[1]));

    if (pairs.length < 2) return 0;

    const mean1 = pairs.reduce((sum, pair) => sum + pair[0], 0) / pairs.length;
    const mean2 = pairs.reduce((sum, pair) => sum + pair[1], 0) / pairs.length;

    let covariance = 0;
    let variance1 = 0;
    let variance2 = 0;

    for (const pair of pairs) {
      const diff1 = pair[0] - mean1;
      const diff2 = pair[1] - mean2;

      covariance += diff1 * diff2;
      variance1 += diff1 * diff1;
      variance2 += diff2 * diff2;
    }

    covariance /= pairs.length;
    variance1 /= pairs.length;
    variance2 /= pairs.length;

    if (variance1 === 0 || variance2 === 0) return 0;

    return covariance / (Math.sqrt(variance1) * Math.sqrt(variance2));
  };

  const StatisticsDisplay = ({ data, selectedVariables, variables }) => {
    if (!data || data.length === 0 || selectedVariables.length === 0) {
      return <p className="text-center text-gray-500 dark:text-gray-400">No data available for statistics.</p>;
    }

    const cleanedData = data.filter(entry => entry.wdatetime);

    return (
      <div className="mt-6 bg-white dark:bg-gray-800 p-4 rounded shadow transition-colors duration-300">
        <h3 className="text-lg font-semibold mb-2">Statistics</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Variable</th>
                <th className="px-4 py-2 text-right">Mean</th>
                <th className="px-4 py-2 text-right">Std Dev</th>
                <th className="px-4 py-2 text-right">Min</th>
                <th className="px-4 py-2 text-right">Max</th>
                <th className="px-4 py-2 text-right">Count</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {selectedVariables.map(variable => {
                const validValues = cleanedData
                  .map(entry => entry[variable])
                  .filter(value => value !== undefined && value !== null && !isNaN(value));

                const mean = calculateMean(cleanedData, variable);
                const stdDev = calculateStdDev(cleanedData, variable);
                const min = Math.min(...validValues);
                const max = Math.max(...validValues);
                const count = validValues.length;

                const variableLabel = variables.find(v => v.value === variable)?.label || variable;

                return (
                  <tr key={variable}>
                    <td className="px-4 py-2">{variableLabel}</td>
                    <td className="px-4 py-2 text-right">{mean.toFixed(4)}</td>
                    <td className="px-4 py-2 text-right">{stdDev.toFixed(4)}</td>
                    <td className="px-4 py-2 text-right">{min.toFixed(4)}</td>
                    <td className="px-4 py-2 text-right">{max.toFixed(4)}</td>
                    <td className="px-4 py-2 text-right">{count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const CorrelationMatrix = ({ data, selectedVariables, variables }) => {
    if (!data || data.length === 0 || selectedVariables.length < 2) {
      return <p className="text-center text-gray-500 dark:text-gray-400">Select at least two variables to display correlations.</p>;
    }

    const cleanedData = data.filter(entry => entry.wdatetime);

    return (
      <div className="mt-6 bg-white dark:bg-gray-800 p-4 rounded shadow transition-colors duration-300">
        <h3 className="text-lg font-semibold mb-2">Correlation Matrix</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2"></th>
                {selectedVariables.map(variable => {
                  const variableLabel = variables.find(v => v.value === variable)?.label || variable;
                  return (
                    <th key={variable} className="px-4 py-2 text-right">
                      {variableLabel}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {selectedVariables.map(var1 => {
                const var1Label = variables.find(v => v.value === var1)?.label || var1;

                return (
                  <tr key={var1}>
                    <td className="px-4 py-2 font-medium">{var1Label}</td>
                    {selectedVariables.map(var2 => {
                      const correlation = var1 === var2 ? 1 : calculateCorrelation(cleanedData, var1, var2);

                      let colorClass = '';
                      const absCorr = Math.abs(correlation);
                      if (absCorr > 0.7) {
                        colorClass = correlation > 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900';
                      } else if (absCorr > 0.4) {
                        colorClass = correlation > 0 ? 'bg-green-50 dark:bg-green-800' : 'bg-red-50 dark:bg-red-800';
                      }

                      return (
                        <td key={`${var1}-${var2}`} className={`px-4 py-2 text-right ${colorClass}`}>
                          {correlation.toFixed(3)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const variables = [
    { label: 'Temperature (K)', value: 'temperature_k' },
    { label: 'Dew Point (K)', value: 'dewpoint_k' },
    { label: 'Pressure (kPa)', value: 'pressure_kpa' },
    { label: 'Relative Humidity (%)', value: 'relhumidity_pct' },
    { label: 'Wind Direction (°)', value: 'winddir_deg' },
    { label: 'Wind Speed (m/s)', value: 'windspeed_mps' },
    { label: 'PWV (mm)', value: 'pwv_mm' },
    { label: 'Phaser MS (°)', value: 'phaserms_deg' },
    { label: 'Tau 183 GHz', value: 'tau183ghz' },
    { label: 'Tau 215 GHz', value: 'tau215ghz' },
    { label: 'Tau 225 GHz', value: 'tau225ghz' },
  ];

  const chartData = getChartData();
  const movingAverageChartData = getMovingAverageChartData();

  // Function to export chart as PNG
  const exportChartAsPNG = (chartRef, filename) => {
    if (chartRef && chartRef.current) {
      // Get the chart canvas element
      const canvas = chartRef.current.canvas;

      // Convert canvas to data URL
      const image = canvas.toDataURL('image/png', 1.0);

      // Create download link
      const link = document.createElement('a');
      link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = image;
      link.click();
    }
  };

  const resetZoom = (chartRef) => {
    if (chartRef && chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  // Function to toggle fullscreen for a chart container
  const toggleFullScreen = (containerRef) => {
    if (!containerRef || !containerRef.current) return;

    if (!document.fullscreenElement) {
      // Enter fullscreen
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.webkitRequestFullscreen) { /* Safari */
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current.msRequestFullscreen) { /* IE11 */
        containerRef.current.msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
      }
    }
  };

  // Add function to export selected variable data as CSV
  const exportDataAsCSV = () => {
    if (!effectiveData?.getWeatherData) return;
    const header = ['wdatetime', ...selectedVariables];
    const rows = [ header.join(',') ];
    effectiveData.getWeatherData.forEach(entry => {
      const row = [ entry.wdatetime, ...selectedVariables.map(v => entry[v]) ];
      rows.push(row.join(','));
    });
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `variable-data-${selectedVariables.join('-')}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Header */}
      <header className="bg-black text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="mr-4 hover:text-gray-300">
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <div className="flex items-center">
            <img src={blackHoleLogo} alt="Black Hole Logo" className="h-8 w-8 mr-2" />
            <h1 className="text-lg font-semibold">Black Hole Astrophysics Group - Georgia Tech</h1>
          </div>
        </div>
        {/* Dark Mode Toggle Button */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-300"
          aria-label="Toggle Dark Mode"
        >
          {isDarkMode ? (
            <SunIcon className="h-6 w-6 text-yellow-400" />
          ) : (
            <MoonIcon className="h-6 w-6 text-gray-200" />
          )}
        </button>
      </header>

      {/* Expanded View Chart Overlay */}
      {expandedChart && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-[98vw] h-[95vh] flex flex-col p-3 relative">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">
                {expandedChart === 'main' ? (
                  selectedVariables.length === 1
                    ? variables.find((v) => v.value === selectedVariables[0]).label
                    : 'Selected Variables Comparison'
                ) : 'Moving Average Lines'}
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => resetZoom(expandedChart === 'main' ? mainChartRef : maChartRef)}
                  className="flex items-center justify-center p-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-300 w-8 h-8"
                  title="Reset Zoom"
                  aria-label="Reset Zoom"
                >
                  <RefreshIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleExpandedView(null)}
                  className="flex items-center justify-center p-2 bg-red-500 text-white rounded-md hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-300 w-8 h-8"
                  title="Close Expanded View"
                  aria-label="Close Expanded View"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-grow">
              {expandedChart === 'main' ? (
                <Line
                  ref={mainChartRef}
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          color: isDarkMode ? '#f3f4f6' : '#1f2937',
                        },
                      },
                      title: {
                        display: true,
                        text:
                          selectedVariables.length === 1
                            ? variables.find((v) => v.value === selectedVariables[0]).label
                            : 'Selected Variables Comparison',
                        color: isDarkMode ? '#f3f4f6' : '#1f2937',
                      },
                      zoom: {
                        pan: {
                          enabled: true,
                          mode: 'x',
                          modifierKey: 'shift',
                        },
                        zoom: {
                          wheel: {
                            enabled: true,
                            speed: 0.02,
                            sensitivity: 0.02,
                          },
                          pinch: {
                            enabled: true,
                          },
                          drag: {
                            enabled: true,
                            backgroundColor: isDarkMode ? 'rgba(128,128,128,0.3)' : 'rgba(225,225,225,0.3)',
                            borderColor: isDarkMode ? 'rgba(128,128,128)' : 'rgba(225,225,225)',
                            borderWidth: 1,
                            threshold: 10,
                          },
                          mode: 'x',
                        },
                      },
                    },
                    scales: selectedVariables.length > 1
                      ? selectedVariables.reduce((acc, variable, index) => {
                        acc[`y-axis-${index}`] = {
                          type: 'linear',
                          position: index % 2 === 0 ? 'left' : 'right',
                          grid: {
                            drawOnChartArea: index === 0,
                            color: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          },
                          title: {
                            display: true,
                            text: variables.find((v) => v.value === variable).label,
                            color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          },
                          ticks: {
                            color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          },
                        };
                        return acc;
                      }, {})
                      : {
                        y: {
                          title: {
                            display: true,
                            text: variables.find((v) => v.value === selectedVariables[0]).label,
                            color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          },
                          ticks: {
                            color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          },
                          beginAtZero: false,
                          grid: {
                            color: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          },
                        },
                      },
                  }}
                />
              ) : (
                <Line
                  ref={maChartRef}
                  data={movingAverageChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          color: isDarkMode ? '#f3f4f6' : '#1f2937',
                        },
                      },
                      title: {
                        display: true,
                        text: 'Moving Average Lines',
                        color: isDarkMode ? '#f3f4f6' : '#1f2937',
                      },
                      zoom: {
                        pan: {
                          enabled: true,
                          mode: 'x',
                          modifierKey: 'shift',
                        },
                        zoom: {
                          wheel: {
                            enabled: true,
                            speed: 0.1,
                            sensitivity: 0.1,
                          },
                          pinch: {
                            enabled: true,
                          },
                          drag: {
                            enabled: true,
                            backgroundColor: isDarkMode ? 'rgba(128,128,128,0.3)' : 'rgba(225,225,225,0.3)',
                            borderColor: isDarkMode ? 'rgba(128,128,128)' : 'rgba(225,225,225)',
                            borderWidth: 1,
                            threshold: 10,
                          },
                          mode: 'x',
                        },
                      },
                    },
                    scales: selectedVariables.length > 1
                      ? selectedVariables.reduce((acc, variable, index) => {
                        acc[`y-axis-${index}`] = {
                          type: 'linear',
                          position: index % 2 === 0 ? 'left' : 'right',
                          grid: {
                            drawOnChartArea: index === 0,
                            color: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          },
                          title: {
                            display: true,
                            text: variables.find((v) => v.value === variable).label,
                            color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          },
                          ticks: {
                            color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          },
                        };
                        return acc;
                      }, {})
                      : {
                        y: {
                          title: {
                            display: true,
                            text: variables.find((v) => v.value === selectedVariables[0]).label,
                            color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          },
                          ticks: {
                            color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          },
                          beginAtZero: false,
                          grid: {
                            color: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          },
                        },
                      },
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex flex-col md:flex-row flex-1">
        {/* Sidebar */}
        <div className="md:w-1/4 lg:w-1/5 bg-gray-100 dark:bg-gray-800 p-4 overflow-auto border-r border-gray-300 dark:border-gray-700 transition-colors duration-300">
          {/* Collection Selector */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Select Collection</h2>
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-600 dark:focus:border-indigo-600 transition-colors duration-300"
              aria-label="Select Collection"
            >
              <option value="apex_2006_2023">Apex 2006-2023</option>
              <option value="glt_2017_2022">GLT 2017-2022</option>
            </select>
          </div>

          {/* Variables Selection */}
          <h2 className="text-xl font-semibold mb-4">Variables</h2>
          <div className="flex flex-col space-y-2">
            {variables.map((varItem) => (
              <label key={varItem.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  value={varItem.value}
                  checked={selectedVariables.includes(varItem.value)}
                  onChange={handleVariableChange}
                  className="form-checkbox h-5 w-5 text-blue-600 dark:text-blue-400"
                  aria-label={`Toggle ${varItem.label}`}
                />
                <span className="text-gray-700 dark:text-gray-300">{varItem.label}</span>
              </label>
            ))}
          </div>

          {/* Moving Average Controls - Always visible */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Moving Average</h3>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleMovingAverageToggle}
                className={`px-4 py-2 rounded text-left focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-300 ${showMovingAverage
                  ? 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'
                  : 'bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700'
                  }`}
                disabled={selectedVariables.length === 0}
              >
                {showMovingAverage ? 'Hide Moving Average' : 'Show Moving Average'}
              </button>

              {showMovingAverage && (
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Step Size:</label>
                  <input
                    type="number"
                    value={movingAverageWindow}
                    onChange={handleMovingAverageWindowChange}
                    className={`mt-1 block w-24 border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-600 dark:focus:border-indigo-600 transition-colors duration-300`}
                    min="1"
                    placeholder="Enter size"
                  />
                  {movingAverageWindow !== '' && (isNaN(movingAverageWindow) || movingAverageWindow < 1) && (
                    <p className="text-red-500 text-sm mt-1">Enter a positive integer.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Statistical Analysis Controls - Always visible */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Statistical Analysis</h3>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => setShowStatistics(!showStatistics)}
                className={`px-4 py-2 rounded transition-colors duration-300 ${
                  showStatistics
                    ? 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'
                    : 'bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700'
                }`}
                disabled={!effectiveData || !effectiveData.getWeatherData || selectedVariables.length === 0}
              >
                {showStatistics ? 'Hide Statistics' : 'Show Statistics'}
              </button>

              <button
                onClick={() => setShowCorrelation(!showCorrelation)}
                className={`px-4 py-2 rounded transition-colors duration-300 ${
                  showCorrelation
                    ? 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'
                    : 'bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700'
                }`}
                disabled={!effectiveData || !effectiveData.getWeatherData || selectedVariables.length < 2}
              >
                {showCorrelation ? 'Hide Correlation' : 'Show Correlation'}
              </button>
            </div>
          </div>

          {/* Add Data Interpolation Controls */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Data Interpolation</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="interpolation-none"
                  name="interpolation"
                  value="none"
                  checked={interpolationMethod === 'none'}
                  onChange={() => setInterpolationMethod('none')}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <label htmlFor="interpolation-none" className="text-gray-700 dark:text-gray-300">
                  Show gaps
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="interpolation-linear"
                  name="interpolation"
                  value="linear"
                  checked={interpolationMethod === 'linear'}
                  onChange={() => setInterpolationMethod('linear')}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <label htmlFor="interpolation-linear" className="text-gray-700 dark:text-gray-300">
                  Linear interpolation
                </label>
              </div>
            </div>
          </div>

          {/* Date range picker */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Select Date Range</h3>
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <DatePicker
                type="range"
                value={dateRange}
                onChange={setDateRange}
                clearable
                withTime
                valueFormat="YYYY-MM-DD HH:mm:ss"
                styles={{
                  input: {
                    backgroundColor: 'var(--mantine-color-white)',
                    border: '1px solid var(--mantine-color-gray-3)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                  },
                  dropdown: {
                    backgroundColor: 'var(--mantine-color-white)',
                    border: '1px solid var(--mantine-color-gray-3)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    width: 'auto',
                    minWidth: 'fit-content',
                  },
                  calendar: {
                    width: 'auto',
                    padding: '0.5rem',
                    height: '280px',
                    minHeight: '280px',
                    maxHeight: '280px',
                  },
                  day: {
                    color: isDarkMode ? '#e5e7eb' : undefined,
                    '&:hover:not([data-outside]):not([data-disabled]):not([data-selected])': {
                      backgroundColor: `${isDarkMode ? '#4b5563' : '#f3f4f6'} !important`,
                      color: `${isDarkMode ? '#f3f4f6' : '#374151'} !important`,
                    },
                    '&[data-outside]': {
                      color: isDarkMode ? '#6b7280' : '#4b5563',
                      '&:hover': {
                        backgroundColor: `${isDarkMode ? '#374151' : '#e5e7eb'} !important`,
                        color: `${isDarkMode ? '#9ca3af' : '#374151'} !important`,
                      },
                    },
                    '&[data-disabled]': {
                      color: isDarkMode ? '#4b5563' : '#6b7280',
                      '&:hover': {
                        backgroundColor: `${isDarkMode ? '#374151' : '#e5e7eb'} !important`,
                        color: `${isDarkMode ? '#6b7280' : '#4b5563'} !important`,
                      },
                    },
                  },
                  weekday: {
                    color: isDarkMode ? '#d1d5db' : undefined,
                  },
                  calendarHeader: {
                    color: isDarkMode ? '#f3f4f6' : undefined,
                  },
                  calendarHeaderControl: {
                    color: isDarkMode ? '#e5e7eb' : undefined,
                    '&:hover': {
                      backgroundColor: isDarkMode ? '#4b5563' : '#f3f4f6',
                      color: isDarkMode ? '#f3f4f6' : undefined,
                    },
                  },
                  calendarHeaderLevel: {
                    color: isDarkMode ? '#f3f4f6' : undefined,
                    '&:hover': {
                      backgroundColor: isDarkMode ? '#4b5563' : '#f3f4f6',
                      color: isDarkMode ? '#ffffff' : undefined,
                    },
                  }
                }}
              />
              <button
                onClick={() => {
                  if (dateRange[0] && dateRange[1]) {
                    getWeatherData({
                      variables: {
                        collection: selectedCollection,
                        limit: 10000,
                        startDate: format(dateRange[0], 'yyyy-MM-dd HH:mm:ss'),
                        endDate:   format(dateRange[1], 'yyyy-MM-dd HH:mm:ss'),
                      },
                    });
                    setShowOnlyMovingAverage(false); // Hide additional graph when new data is fetched
                  }
                }}
                disabled={!dateRange[0] || !dateRange[1]}
                className="mt-6 w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Loading...' : 'Apply Date Range'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="md:w-3/4 lg:w-4/5 p-6 overflow-auto">
          {selectedVariables.length > 0 ? (
            <>
              {/* Main Graph */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded shadow transition-colors duration-300">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">
                    {selectedVariables.length === 1
                      ? variables.find((v) => v.value === selectedVariables[0]).label
                      : 'Selected Variables Comparison'}
                  </h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => resetZoom(mainChartRef)}
                      className="flex items-center justify-center p-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-300 w-8 h-8"
                      disabled={!effectiveData || !effectiveData.getWeatherData || effectiveData.getWeatherData.length === 0}
                      title="Reset Zoom"
                      aria-label="Reset Zoom"
                    >
                      <RefreshIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleExpandedView('main')}
                      className="flex items-center justify-center p-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-300 w-8 h-8"
                      disabled={!effectiveData || !effectiveData.getWeatherData || effectiveData.getWeatherData.length === 0}
                      title="Expand View"
                      aria-label="Expand View"
                    >
                      <ArrowsExpandIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleFullScreen(mainChartContainerRef)}
                      className="flex items-center justify-center p-2 bg-green-500 text-white rounded-md hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-300 w-8 h-8"
                      disabled={!effectiveData || !effectiveData.getWeatherData || effectiveData.getWeatherData.length === 0}
                      title="Full Screen"
                      aria-label="Full Screen"
                    >
                      <ArrowsExpandIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => exportChartAsPNG(mainChartRef, 'weather-data-chart')}
                      className="flex items-center justify-center p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-300 w-8 h-8"
                      disabled={!effectiveData?.getWeatherData || effectiveData.getWeatherData.length === 0}
                      title="Export as PNG"
                      aria-label="Export as PNG"
                    >
                      <DownloadIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={exportDataAsCSV}
                      className="flex items-center justify-center p-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors duration-300 w-8 h-8"
                      disabled={!effectiveData?.getWeatherData || effectiveData.getWeatherData.length === 0}
                      title="Export CSV"
                      aria-label="Export CSV"
                    >
                      <DownloadIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="h-[500px]" ref={mainChartContainerRef}>
                  {loading && !showOnlyMovingAverage ? (
                    <div className="flex justify-center items-center h-full">
                      <p>Loading...</p>
                    </div>
                  ) : error && !showOnlyMovingAverage ? (
                    <p className="text-center text-red-500">Error: {error.message}</p>
                  ) : effectiveData && effectiveData.getWeatherData && effectiveData.getWeatherData.length > 0 ? (
                    <Line
                      ref={mainChartRef}
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: {
                              color: isDarkMode ? '#f3f4f6' : '#1f2937',
                            },
                          },
                          title: {
                            display: true,
                            text:
                              selectedVariables.length === 1
                                ? variables.find((v) => v.value === selectedVariables[0]).label
                                : 'Selected Variables Comparison',
                            color: isDarkMode ? '#f3f4f6' : '#1f2937',
                          },
                          zoom: {
                            pan: {
                              enabled: true,
                              mode: 'x',
                              modifierKey: 'shift',
                            },
                            zoom: {
                              wheel: {
                                enabled: true,
                                speed: 0.02,  // Reduced from default (0.1 is more gentle)
                                sensitivity: 0.02,  // Lower sensitivity for smoother zoom
                              },
                              pinch: {
                                enabled: true,
                              },
                              drag: {
                                enabled: true,
                                backgroundColor: isDarkMode ? 'rgba(128,128,128,0.3)' : 'rgba(225,225,225,0.3)',
                                borderColor: isDarkMode ? 'rgba(128,128,128)' : 'rgba(225,225,225)',
                                borderWidth: 1,
                                threshold: 10,
                              },
                              mode: 'x',
                            },
                          },
                        },
                        scales: selectedVariables.length > 1
                          ? selectedVariables.reduce((acc, variable, index) => {
                            acc[`y-axis-${index}`] = {
                              type: 'linear',
                              position: index % 2 === 0 ? 'left' : 'right',
                              grid: {
                                drawOnChartArea: index === 0,
                                color: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                              },
                              title: {
                                display: true,
                                text: variables.find((v) => v.value === variable).label,
                                color: isDarkMode ? '#f3f4f6' : '#1f2937',
                              },
                              ticks: {
                                color: isDarkMode ? '#f3f4f6' : '#1f2937',
                              },
                            };
                            return acc;
                          }, {})
                          : {
                            y: {
                              title: {
                                display: true,
                                text: variables.find((v) => v.value === selectedVariables[0]).label,
                                color: isDarkMode ? '#f3f4f6' : '#1f2937',
                              },
                              ticks: {
                                color: isDarkMode ? '#f3f4f6' : '#1f2937',
                              },
                              beginAtZero: false,
                              grid: {
                                color: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                              },
                            },
                          },
                      }}
                    />
                  ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400">No data available for the selected date range.</p>
                  )}
                </div>
              </div>

              {/* Toggle Moving Average Graph Button */}
              {selectedVariables.length > 0 && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => setShowOnlyMovingAverage(!showOnlyMovingAverage)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-300"
                    aria-label="Toggle Moving Average Graph"
                  >
                    {showOnlyMovingAverage ? '− Hide Moving Average Graph' : '+ Show Moving Average Graph'}
                  </button>
                </div>
              )}

              {/* Additional Moving Average Graph */}
              {showOnlyMovingAverage && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded shadow mt-6 transition-colors duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Moving Average Lines</h2>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => resetZoom(maChartRef)}
                        className="flex items-center justify-center p-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-300 w-8 h-8"
                        disabled={!effectiveData || !effectiveData.getWeatherData || effectiveData.getWeatherData.length === 0}
                        title="Reset Zoom"
                        aria-label="Reset Zoom"
                      >
                        <RefreshIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleExpandedView('ma')}
                        className="flex items-center justify-center p-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-300 w-8 h-8"
                        disabled={!effectiveData || !effectiveData.getWeatherData || effectiveData.getWeatherData.length === 0}
                        title="Expand View"
                        aria-label="Expand View"
                      >
                        <ArrowsExpandIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleFullScreen(maChartContainerRef)}
                        className="flex items-center justify-center p-2 bg-green-500 text-white rounded-md hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-300 w-8 h-8"
                        disabled={!effectiveData || !effectiveData.getWeatherData || effectiveData.getWeatherData.length === 0}
                        title="Full Screen"
                        aria-label="Full Screen"
                      >
                        <ArrowsExpandIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => exportChartAsPNG(maChartRef, 'moving-average-chart')}
                        className="flex items-center justify-center p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-300 w-8 h-8"
                        disabled={!effectiveData || !effectiveData.getWeatherData || effectiveData.getWeatherData.length === 0}
                        title="Export as PNG"
                        aria-label="Export as PNG"
                      >
                        <DownloadIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="h-[500px]" ref={maChartContainerRef}>
                    {loading ? (
                      <div className="flex justify-center items-center h-full">
                        <p>Loading...</p>
                      </div>
                    ) : error ? (
                      <p className="text-center text-red-500">Error: {error.message}</p>
                    ) : effectiveData && effectiveData.getWeatherData && effectiveData.getWeatherData.length > 0 ? (
                      <Line
                        ref={maChartRef}
                        data={movingAverageChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                              labels: {
                                color: isDarkMode ? '#f3f4f6' : '#1f2937',
                              },
                            },
                            title: {
                              display: true,
                              text: 'Moving Average Lines',
                              color: isDarkMode ? '#f3f4f6' : '#1f2937',
                            },
                            zoom: {
                              pan: {
                                enabled: true,
                                mode: 'x',
                                modifierKey: 'shift',
                              },
                              zoom: {
                                wheel: {
                                  enabled: true,
                                  speed: 0.1,  // Reduced from default 
                                  sensitivity: 0.1,  // Lower sensitivity
                                },
                                pinch: {
                                  enabled: true,
                                },
                                drag: {
                                  enabled: true,
                                  backgroundColor: isDarkMode ? 'rgba(128,128,128,0.3)' : 'rgba(225,225,225,0.3)',
                                  borderColor: isDarkMode ? 'rgba(128,128,128)' : 'rgba(225,225,225)',
                                  borderWidth: 1,
                                  threshold: 10,
                                },
                                mode: 'x',
                              },
                            },
                          },
                          scales: selectedVariables.length > 1
                            ? selectedVariables.reduce((acc, variable, index) => {
                              acc[`y-axis-${index}`] = {
                                type: 'linear',
                                position: index % 2 === 0 ? 'left' : 'right',
                                grid: {
                                  drawOnChartArea: index === 0,
                                  color: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                },
                                title: {
                                  display: true,
                                  text: variables.find((v) => v.value === variable).label,
                                  color: isDarkMode ? '#f3f4f6' : '#1f2937',
                                },
                                ticks: {
                                  color: isDarkMode ? '#f3f4f6' : '#1f2937',
                                },
                              };
                              return acc;
                            }, {})
                            : {
                              y: {
                                title: {
                                  display: true,
                                  text: variables.find((v) => v.value === selectedVariables[0]).label,
                                  color: isDarkMode ? '#f3f4f6' : '#1f2937',
                                },
                                ticks: {
                                  color: isDarkMode ? '#f3f4f6' : '#1f2937',
                                },
                                beginAtZero: false,
                                grid: {
                                  color: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                },
                              },
                            },
                        }}
                      />
                    ) : (
                      <p className="text-center text-gray-500 dark:text-gray-400">No data available for the selected date range.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Statistics Display */}
              {showStatistics && effectiveData && effectiveData.getWeatherData && (
                <StatisticsDisplay
                  data={effectiveData.getWeatherData}
                  selectedVariables={selectedVariables}
                  variables={variables}
                />
              )}

              {/* Correlation Matrix */}
              {showCorrelation && effectiveData && effectiveData.getWeatherData && (
                <CorrelationMatrix
                  data={effectiveData.getWeatherData}
                  selectedVariables={selectedVariables}
                  variables={variables}
                />
              )}
            </>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400">Select one or more variables to display the graph.</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-800 p-4 text-center text-gray-800 dark:text-gray-200 transition-colors duration-300">
        <p>© 2025 Black Hole Astrophysics Group - Georgia Tech</p>
      </footer>
    </div>
  );
}

export default VariableView;
