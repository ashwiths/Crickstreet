import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';

const app = express();

// Apply middleware
app.use(cors());
app.use(express.json());

// Bind routes
app.use('/auth', authRoutes);

// Base health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'Crickstreet Auth Service' });
});

export default app;
