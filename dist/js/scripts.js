// Function to fetch generated hashtags from the serverless function
const fetchHashtags = async () => {
    const url = "/.netlify/functions/hashtags"; // Adjust the URL to your function's name
    const response = await fetch(url);
    
    if (response.ok) {
      const json = await response.json();
      return json.hashtags; // Assuming the serverless function returns a 'hashtags' key
    } else {
      throw new Error('Failed to fetch hashtags');
    }
  }
  
  // Function to display the hashtags
  const displayHashtags = (hashtags) => {
    const hashtagsContainer = document.getElementById("hashtags-container");
    hashtagsContainer.textContent = hashtags;
  }
  
  // Function to handle the button click
  const handleButtonClick = async () => {
    try {
      const hashtags = await fetchHashtags();
      displayHashtags(hashtags);
    } catch (error) {
      console.error('Error:', error);
      displayHashtags('An error occurred while generating hashtags.');
    }
  }
  
  // Event listener for the button
  document.getElementById("generate-button").addEventListener("click", handleButtonClick);
  