import { NextResponse } from 'next/server';
import { getDb, getSettings, updateSettings, addToPool } from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

authenticator.options = { window: 1 };

// Hardcoded demo users (MVP)
const DEMO_USERS = {
  admin: { id: 'admin-1', username: 'admin', password: 'admin123', role: 'superadmin', name: 'MaksPay Admin' },
  user: { id: 'user-1', username: 'user', password: 'user123', role: 'user', name: 'Demo User' },
};

async function ensureUser(username) {
  const db = await getDb();
  const seed = DEMO_USERS[username];
  if (!seed) return null;
  let u = await db.collection('users').findOne({ id: seed.id });
  if (!u) {
    u = { ...seed, balance: username === 'user' ? 100 : 0, twoFA: { enabled: false, secret: null } };
    await db.collection('users').insertOne(u);
  }
  return u;
}

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

async function getUserById(id) {
  const db = await getDb();
  return db.collection('users').findOne({ id });
}

async function getUserFromRequest(req) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return null;
  return getUserById(userId);
}

function stripMongo(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest;
}

export async function GET(req, { params }) {
  const path = ((await params).path || []).join('/');
  try {
    if (path === '' || path === '/') return json({ message: 'MaksPay API' });

    if (path === 'settings') {
      const s = await getSettings();
      return json(stripMongo(s));
    }

    if (path === 'networks') {
      const s = await getSettings();
      return json({ networks: s.networks });
    }

    if (path === 'me') {
      const u = await getUserFromRequest(req);
      if (!u) return json({ error: 'unauthorized' }, 401);
      const { password, ...safe } = u;
      return json(stripMongo({ ...safe, twoFA: { enabled: !!u.twoFA?.enabled } }));
    }

    if (path === 'wallet/transactions') {
      const u = await getUserFromRequest(req);
      if (!u) return json({ error: 'unauthorized' }, 401);
      const db = await getDb();
      const txs = await db.collection('transactions')
        .find({ userId: u.id })
        .sort({ createdAt: -1 })
        .toArray();
      return json({ transactions: txs.map(stripMongo) });
    }

    return json({ error: 'not found', path }, 404);
  } catch (e) {
    console.error('GET error', e);
    return json({ error: e.message }, 500);
  }
}

export async function POST(req, { params }) {
  const path = ((await params).path || []).join('/');
  try {
    const body = await req.json().catch(() => ({}));

    if (path === 'auth/login') {
      const { username, password, otp } = body;
      const seed = DEMO_USERS[username];
      if (!seed || seed.password !== password) {
        return json({ error: 'Невірний логін або пароль' }, 401);
      }
      const u = await ensureUser(username);
      if (u.twoFA?.enabled) {
        if (!otp) return json({ requires2FA: true });
        const ok = authenticator.check(String(otp), u.twoFA.secret);
        if (!ok) return json({ error: 'Невірний код 2FA', requires2FA: true }, 401);
      }
      const { password: _p, ...safe } = u;
      return json({ user: stripMongo({ ...safe, twoFA: { enabled: !!u.twoFA?.enabled } }) });
    }

    // Admin: update fees
    if (path === 'admin/fees') {
      const u = await getUserFromRequest(req);
      if (!u || u.role !== 'superadmin') return json({ error: 'forbidden' }, 403);
      // If admin has 2FA, require otp
      if (u.twoFA?.enabled) {
        if (!body.otp || !authenticator.check(String(body.otp), u.twoFA.secret)) {
          return json({ error: 'Потрібен код 2FA', requires2FA: true }, 401);
        }
      }
      const patch = {};
      if (typeof body.depositFee === 'number') patch.depositFee = body.depositFee;
      if (typeof body.withdrawalFee === 'number') patch.withdrawalFee = body.withdrawalFee;
      if (typeof body.apiWithdrawalFee === 'number') patch.apiWithdrawalFee = body.apiWithdrawalFee;
      const s = await updateSettings(patch);
      return json(stripMongo(s));
    }

    // Admin: toggle network
    if (path === 'admin/networks') {
      const u = await getUserFromRequest(req);
      if (!u || u.role !== 'superadmin') return json({ error: 'forbidden' }, 403);
      const { network, enabled } = body;
      if (!['TRC20', 'ERC20', 'BEP20'].includes(network)) return json({ error: 'invalid network' }, 400);
      const cur = await getSettings();
      const networks = { ...cur.networks, [network]: !!enabled };
      const s = await updateSettings({ networks });
      return json(stripMongo(s));
    }

    // Wallet: deposit
    if (path === 'wallet/deposit') {
      const u = await getUserFromRequest(req);
      if (!u) return json({ error: 'unauthorized' }, 401);
      const amount = Number(body.amount);
      const network = body.network;
      if (!amount || amount <= 0) return json({ error: 'Невірна сума' }, 400);
      const s = await getSettings();
      if (!s.networks[network]) return json({ error: `Мережа ${network} вимкнена` }, 400);
      const fee = Number(s.depositFee) || 0;
      if (amount <= fee) return json({ error: 'Сума менша ніж комісія' }, 400);
      const net = +(amount - fee).toFixed(6);
      const db = await getDb();
      const tx = {
        id: uuidv4(),
        userId: u.id,
        type: 'deposit',
        network,
        grossAmount: amount,
        fee,
        netAmount: net,
        status: 'completed',
        createdAt: new Date().toISOString(),
        source: body.source || 'cabinet',
      };
      await db.collection('transactions').insertOne(tx);
      await db.collection('users').updateOne({ id: u.id }, { $inc: { balance: net } });
      await addToPool(fee);
      return json({ transaction: stripMongo(tx) });
    }

    // Wallet: withdrawal
    if (path === 'wallet/withdraw') {
      const u = await getUserFromRequest(req);
      if (!u) return json({ error: 'unauthorized' }, 401);
      const amount = Number(body.amount);
      const network = body.network;
      const address = body.address;
      const via = body.via === 'api' ? 'api' : 'cabinet';
      if (!amount || amount <= 0) return json({ error: 'Невірна сума' }, 400);
      if (!address) return json({ error: 'Вкажіть адресу' }, 400);
      const s = await getSettings();
      if (!s.networks[network]) return json({ error: `Мережа ${network} вимкнена` }, 400);
      const fee = via === 'api' ? Number(s.apiWithdrawalFee) : Number(s.withdrawalFee);
      const total = +(amount + fee).toFixed(6);
      if ((u.balance || 0) < total) return json({ error: 'Недостатньо коштів (з урахуванням комісії)' }, 400);
      // 2FA required for withdrawal
      if (u.twoFA?.enabled) {
        if (!body.otp || !authenticator.check(String(body.otp), u.twoFA.secret)) {
          return json({ error: 'Потрібен код 2FA', requires2FA: true }, 401);
        }
      }
      const db = await getDb();
      const tx = {
        id: uuidv4(),
        userId: u.id,
        type: 'withdrawal',
        network,
        address,
        grossAmount: amount,
        fee,
        totalDeducted: total,
        status: 'completed',
        via,
        createdAt: new Date().toISOString(),
      };
      await db.collection('transactions').insertOne(tx);
      await db.collection('users').updateOne({ id: u.id }, { $inc: { balance: -total } });
      await addToPool(fee);
      return json({ transaction: stripMongo(tx) });
    }

    // 2FA setup: generate secret and QR
    if (path === '2fa/setup') {
      const u = await getUserFromRequest(req);
      if (!u) return json({ error: 'unauthorized' }, 401);
      const secret = authenticator.generateSecret();
      const otpauth = authenticator.keyuri(u.username, 'MaksPay', secret);
      const qrDataUrl = await QRCode.toDataURL(otpauth);
      // Store pending secret
      const db = await getDb();
      await db.collection('users').updateOne(
        { id: u.id },
        { $set: { 'twoFA.pendingSecret': secret } }
      );
      return json({ secret, otpauth, qrDataUrl });
    }

    // 2FA verify + enable
    if (path === '2fa/enable') {
      const u = await getUserFromRequest(req);
      if (!u) return json({ error: 'unauthorized' }, 401);
      const pending = u.twoFA?.pendingSecret;
      if (!pending) return json({ error: 'Спочатку виконайте setup' }, 400);
      const ok = authenticator.check(String(body.otp), pending);
      if (!ok) return json({ error: 'Невірний код' }, 400);
      const db = await getDb();
      await db.collection('users').updateOne(
        { id: u.id },
        { $set: { 'twoFA.enabled': true, 'twoFA.secret': pending, 'twoFA.pendingSecret': null } }
      );
      return json({ ok: true });
    }

    // 2FA disable
    if (path === '2fa/disable') {
      const u = await getUserFromRequest(req);
      if (!u) return json({ error: 'unauthorized' }, 401);
      if (!u.twoFA?.enabled) return json({ ok: true });
      const ok = authenticator.check(String(body.otp || ''), u.twoFA.secret);
      if (!ok) return json({ error: 'Невірний код' }, 400);
      const db = await getDb();
      await db.collection('users').updateOne(
        { id: u.id },
        { $set: { 'twoFA.enabled': false, 'twoFA.secret': null, 'twoFA.pendingSecret': null } }
      );
      return json({ ok: true });
    }

    return json({ error: 'not found', path }, 404);
  } catch (e) {
    console.error('POST error', e);
    return json({ error: e.message }, 500);
  }
}
