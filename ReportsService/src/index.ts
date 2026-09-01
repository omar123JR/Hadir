import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import statsRoutes from './routes/statsRoutes';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/stats', statsRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'ReportsService' });
});

app.listen(PORT, () => {
    console.log(`Reports Service running on port ${PORT}`);
});
