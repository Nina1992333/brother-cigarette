// api/products.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI!;
let cachedClient: MongoClient | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!cachedClient) {
      cachedClient = await new MongoClient(uri).connect();
    }
    const db = cachedClient.db('shop');
    const products = await db.collection('products').find().toArray();
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ error: '連線失敗', detail: err });
  }
}
