import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { initDatabase } from './config/database';
import { StockService } from './services/stockService';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes);

// Initialize services
const stockService = new StockService();

// Update stock prices every 6 minutes
cron.schedule('*/6 * * * *', () => {
  console.log('Updating stock prices...');
  stockService.updateStockPrices();
});

// Initialize database and start server
const startServer = async () => {
  await initDatabase();
  
  // Initial stock price update
  await stockService.updateStockPrices();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch(console.error);
