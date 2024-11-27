// utils.js

export const processData = (data) => {
    // Create a new object to count items per date
    const dateCounts = {};
  
    data.forEach((item) => {
      // Format the date to "YYYY-MM-DD"
      const date = item.created_at.split("T")[0];
  
      // Increment the count for this date
      if (dateCounts[date]) {
        dateCounts[date]++;
      } else {
        dateCounts[date] = 1;
      }
    });
  
    // Convert the dateCounts object into an array of objects
    const processedData = Object.keys(dateCounts).map((date) => ({
      date,
      count: dateCounts[date],
    }));
  
    return processedData;
  };
  