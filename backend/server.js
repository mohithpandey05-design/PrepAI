require('dotenv').config();
const app = require('./app');
const { initializeDatabase } = require('./config/database');

const PORT = process.env.PORT || 5000;

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5500';
      console.log('\n  ======================================================');
      console.log('  🚀 PrepAI Server is ready and running!');
      console.log('  ======================================================');
      console.log(`  ➜ Frontend App:   \x1b[36mhttp://localhost:${PORT}/\x1b[0m`);
      console.log(`  ➜ Backend API:    \x1b[36mhttp://localhost:${PORT}/api\x1b[0m`);
      if (clientUrl && clientUrl !== `http://localhost:${PORT}`) {
        console.log(`  ➜ Live Server UI: \x1b[36m${clientUrl}\x1b[0m (if using VS Code Live Server)`);
      }
      console.log('  ======================================================\n');
    });
  })
  .catch((err) => {
    console.error('Failed to start server due to database error:', err);
    process.exit(1);
  });
