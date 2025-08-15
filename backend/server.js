const app = require('./app');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // For testing purposes
