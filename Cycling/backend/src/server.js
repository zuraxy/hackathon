import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pedalmap';
const PORT = process.env.PORT || 8080;

// Connect to MongoDB
mongoose.set('strictQuery', true);
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Hazard Schema
const hazardSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true, index: true },
    lon: { type: Number, required: true, index: true },
    type: { type: String, required: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now, index: true },
    userId: { type: String },
  },
  { versionKey: false }
);

hazardSchema.index({ lat: 1, lon: 1 });

const Hazard = mongoose.model('Hazard', hazardSchema);

// Validation
const HazardInput = z.object({
  lat: z.number().refine((n) => Math.abs(n) <= 90, 'invalid latitude'),
  lon: z.number().refine((n) => Math.abs(n) <= 180, 'invalid longitude'),
  type: z.string().min(1),
  description: z.string().max(500).optional(),
  userId: z.string().optional(),
});

// Routes
app.get('/health', (_req, res) => res.json({ ok: true }));

// Create hazard
app.post('/hazards', async (req, res) => {
  try {
    const parsed = HazardInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() });
    }
    const doc = await Hazard.create(parsed.data);
    res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

// List hazards nearby (simple box or radius)
app.get('/hazards', async (req, res) => {
  try {
    const { lat, lon, radius = '3000' } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'lat_lon_required' });

    const clat = Number(lat);
    const clon = Number(lon);
    const r = Number(radius); // meters

    // Approximate degree deltas for small distances
    const dLat = r / 111_320; // deg per meter
    const dLon = r / (111_320 * Math.cos((clat * Math.PI) / 180));

    const results = await Hazard.find({
      lat: { $gte: clat - dLat, $lte: clat + dLat },
      lon: { $gte: clon - dLon, $lte: clon + dLon },
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    res.json(results);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
});

app.listen(PORT, () => console.log(`Pedal Map API listening on :${PORT}`));
