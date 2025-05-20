// api/fetchProducts.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI!;
let cachedClient: MongoClient;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!cachedClient) {
      cachedClient = await new MongoClient(uri).connect();
    }

    const db = cachedClient.db('shop');
    const products = await db.collection('products').find().toArray();

    res.status(200).json(products);
  } catch (error) {
    console.error('Mongo error:', error);
    res.status(500).json({ message: 'Failed to fetch products', error });
  }
}
