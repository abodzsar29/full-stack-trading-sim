import express from 'express';
import { getStocks, getStock, getHistoricalData } from '../controllers/stockController';
import { 
  getPortfolio, 
  getHoldings, 
  getTransactions, 
  executeTrade, 
  getPortfolioHistory 
} from '../controllers/portfolioController';

const router = express.Router();

router.get('/stocks', getStocks);
router.get('/stocks/:symbol', getStock);
router.get('/stocks/:symbol/history', getHistoricalData);

router.get('/portfolio', getPortfolio);
router.get('/portfolio/holdings', getHoldings);
router.get('/portfolio/transactions', getTransactions);
router.get('/portfolio/history', getPortfolioHistory);
router.post('/portfolio/trade', executeTrade);

export default router;

