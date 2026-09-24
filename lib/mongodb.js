import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME || 'makspay';

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export async function getDb() {
  const c = await clientPromise;
  return c.db(dbName);
}

export async function getSettings() {
  const db = await getDb();
  let s = await db.collection('settings').findOne({ _id: 'global' });
  if (!s) {
    s = {
      _id: 'global',
      depositFee: 0.5,
      withdrawalFee: 1.0,
      apiWithdrawalFee: 0.8,
      networks: { TRC20: true, ERC20: true, BEP20: true },
      projectPool: 0,
    };
    await db.collection('settings').insertOne(s);
  }
  return s;
}

export async function updateSettings(patch) {
  const db = await getDb();
  await db.collection('settings').updateOne(
    { _id: 'global' },
    { $set: patch },
    { upsert: true }
  );
  return getSettings();
}

export async function addToPool(amount) {
  const db = await getDb();
  await db.collection('settings').updateOne(
    { _id: 'global' },
    { $inc: { projectPool: amount } }
  );
}
