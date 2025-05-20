// api/products.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI as string; // Atlas 連線字串放在環境變數
const client = new MongoClient(uri);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await client.connect();
    const db = client.db('shop'); // 你的資料庫名稱
    const products = await db.collection('products').find().toArray();
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ error: '連線失敗', detail: err });
  } finally {
    await client.close();
  }
}