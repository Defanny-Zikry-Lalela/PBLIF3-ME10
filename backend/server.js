const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT) || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const EDUCATION_LEVELS = ['SD', 'SMP', 'SMA', 'SMK', 'SLB'];

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET wajib diisi dengan nilai acak minimal 32 karakter.');
}

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '10kb' }));

app.get('/', (req, res) => {
  res.json({ message: 'API NutriTrack MBG berjalan.' });
});

async function activateSchoolOnFirstLogin(account) {
  if (account.isActive) return;

  const activatedAt = new Date();
  await prisma.$transaction([
    prisma.schoolUser.update({ where: { id: account.id }, data: { isActive: true } }),
    prisma.schoolInvitation.updateMany({
      where: { schoolUserId: account.id, acceptedAt: null },
      data: { acceptedAt: activatedAt },
    }),
    prisma.emailOutbox.updateMany({
      where: { invitation: { schoolUserId: account.id }, status: 'PENDING' },
      data: { status: 'FAILED', lastError: 'Sekolah sudah masuk. Kredensial lama tidak perlu dikirim ulang.' },
    }),
  ]);
}

function createSchoolSession(account) {
  return {
    token: jwt.sign({ sub: account.id, role: 'SCHOOL' }, JWT_SECRET, { expiresIn: '8h' }),
    actor: 'SCHOOL',
    school: {
      id: account.school.id,
      name: account.school.name,
      educationLevel: account.school.educationLevel,
      email: account.email,
    },
  };
}

async function authenticateSchool(username, password) {
  const account = await prisma.schoolUser.findUnique({
    where: { email: username.trim().toLowerCase() },
    include: { school: { select: { id: true, name: true, educationLevel: true, isActive: true } } },
  });

  if (!account?.school.isActive || !account.passwordHash || !(await bcrypt.compare(password, account.passwordHash))) {
    return null;
  }

  await activateSchoolOnFirstLogin(account);
  return createSchoolSession(account);
}

function createDriverSession(account) {
  return {
    token: jwt.sign({ sub: account.id, role: 'DRIVER' }, JWT_SECRET, { expiresIn: '8h' }),
    actor: 'DRIVER',
    driver: {
      id: account.driver.id,
      name: account.driver.name,
      email: account.email,
    },
  };
}

async function authenticateDriver(username, password) {
  const account = await prisma.driverUser.findUnique({
    where: { email: username.trim().toLowerCase() },
    include: { driver: true },
  });
  if (!account?.isActive || !account.driver.isActive || !account.passwordHash
    || !(await bcrypt.compare(password, account.passwordHash))) return null;
  return createDriverSession(account);
}

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      return res.status(400).json({ message: 'Email atau username dan kata sandi wajib diisi.' });
    }

    const account = await prisma.adminUser.findFirst({
      where: {
        OR: [{ email: username.trim().toLowerCase() }, { username: username.trim() }],
      },
    });

    if (account) {
      if (!account.isActive || !(await bcrypt.compare(password, account.passwordHash))) {
        return res.status(401).json({ message: 'Email/username atau kata sandi tidak sesuai.' });
      }

      const token = jwt.sign(
        { sub: account.id, role: account.role },
        JWT_SECRET,
        { expiresIn: '8h' },
      );
      return res.json({
        token,
        actor: 'ADMIN',
        admin: { id: account.id, name: account.name, email: account.email, role: account.role },
      });
    }

    const schoolSession = await authenticateSchool(username, password);
    if (schoolSession) return res.json(schoolSession);

    const driverSession = await authenticateDriver(username, password);
    if (!driverSession) return res.status(401).json({ message: 'Email/username atau kata sandi tidak sesuai.' });
    res.json(driverSession);
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/school/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      return res.status(400).json({ message: 'Email sekolah dan kata sandi wajib diisi.' });
    }

    const schoolSession = await authenticateSchool(username, password);
    if (!schoolSession) {
      return res.status(401).json({ message: 'Email atau kata sandi sekolah tidak sesuai.' });
    }

    res.json(schoolSession);
  } catch (error) {
    next(error);
  }
});

async function requireAdmin(req, res, next) {
  const authorization = req.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Sesi tidak ditemukan. Silakan masuk kembali.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (typeof payload === 'string' || payload.role !== 'ADMIN' || typeof payload.sub !== 'string') {
      return res.status(401).json({ message: 'Sesi admin tidak valid. Silakan masuk kembali.' });
    }

    const admin = await prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (!admin || !admin.isActive || admin.role !== 'ADMIN') {
      return res.status(401).json({ message: 'Akun admin tidak aktif atau tidak ditemukan.' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Sesi kedaluwarsa. Silakan masuk kembali.' });
    }
    next(error);
  }
}

async function requireSchool(req, res, next) {
  const authorization = req.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Sesi sekolah tidak ditemukan. Silakan masuk kembali.' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (typeof payload === 'string' || payload.role !== 'SCHOOL' || typeof payload.sub !== 'string') {
      return res.status(401).json({ message: 'Sesi sekolah tidak valid. Silakan masuk kembali.' });
    }
    const account = await prisma.schoolUser.findUnique({
      where: { id: payload.sub },
      include: { school: true },
    });
    if (!account?.isActive || !account.school.isActive) {
      return res.status(401).json({ message: 'Akun sekolah tidak aktif. Hubungi administrator SPPG.' });
    }
    req.schoolAccount = account;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Sesi sekolah kedaluwarsa. Silakan masuk kembali.' });
    }
    next(error);
  }
}

async function requireDriver(req, res, next) {
  const authorization = req.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Sesi kurir tidak ditemukan. Silakan masuk kembali.' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (typeof payload === 'string' || payload.role !== 'DRIVER' || typeof payload.sub !== 'string') {
      return res.status(401).json({ message: 'Sesi kurir tidak valid. Silakan masuk kembali.' });
    }
    const account = await prisma.driverUser.findUnique({
      where: { id: payload.sub },
      include: { driver: true },
    });
    if (!account?.isActive || !account.driver.isActive) {
      return res.status(401).json({ message: 'Akun kurir tidak aktif. Hubungi administrator SPPG.' });
    }
    req.driverAccount = account;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Sesi kurir kedaluwarsa. Silakan masuk kembali.' });
    }
    next(error);
  }
}

app.get('/api/auth/me', requireAdmin, (req, res) => {
  res.json({
    admin: {
      id: req.admin.id,
      name: req.admin.name,
      email: req.admin.email,
      role: req.admin.role,
    },
  });
});

app.get('/api/auth/driver/me', requireDriver, (req, res) => {
  res.json({
    driver: {
      id: req.driverAccount.driver.id,
      name: req.driverAccount.driver.name,
      email: req.driverAccount.email,
    },
  });
});

app.get('/api/auth/school/me', requireSchool, (req, res) => {
  res.json({
    school: {
      id: req.schoolAccount.school.id,
      name: req.schoolAccount.school.name,
      educationLevel: req.schoolAccount.school.educationLevel,
      email: req.schoolAccount.email,
    },
  });
});

app.patch('/api/school/password', requireSchool, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || !currentPassword
      || typeof newPassword !== 'string' || newPassword.length < 12 || newPassword.length > 128) {
      return res.status(400).json({ message: 'Masukkan kata sandi saat ini dan kata sandi baru minimal 12 karakter.' });
    }
    if (!(await bcrypt.compare(currentPassword, req.schoolAccount.passwordHash))) {
      return res.status(400).json({ message: 'Kata sandi saat ini tidak sesuai.' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'Kata sandi baru harus berbeda dari kata sandi saat ini.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.schoolUser.update({
      where: { id: req.schoolAccount.id },
      data: { passwordHash },
    });
    res.json({ message: 'Kata sandi akun sekolah berhasil diubah.' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/school/dashboard', requireSchool, async (req, res, next) => {
  try {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const [delivery, menu] = await Promise.all([
      prisma.delivery.findFirst({
        where: { schoolId: req.schoolAccount.schoolId, date: { gte: dayStart, lt: dayEnd } },
        include: { driver: { select: { name: true } } },
      }),
      prisma.menuRecipient.findFirst({
        where: {
          schoolId: req.schoolAccount.schoolId,
          menu: { date: { gte: dayStart, lt: dayEnd } },
        },
        include: {
          menu: {
            include: {
              ingredients: { include: { ingredient: { select: { name: true } } } },
            },
          },
        },
      }),
    ]);

    res.json({
      school: {
        id: req.schoolAccount.school.id,
        name: req.schoolAccount.school.name,
        educationLevel: req.schoolAccount.school.educationLevel,
        address: req.schoolAccount.school.address,
      },
      delivery: delivery ? {
        id: delivery.id,
        date: delivery.date,
        portions: delivery.portions,
        departureTime: delivery.departureTime,
        status: delivery.status,
        statusNote: delivery.statusNote,
        receivedAt: delivery.receivedAt,
        driver: delivery.driver?.name || null,
      } : null,
      menu: menu ? {
        name: menu.menu.name,
        ingredients: menu.menu.ingredients.map((item) => item.ingredient.name),
      } : null,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/school/returns', requireSchool, async (req, res, next) => {
  try {
    const [deliveries, claims] = await Promise.all([
      prisma.delivery.findMany({
        where: { schoolId: req.schoolAccount.schoolId, status: 'COMPLETED' },
        include: { claim: { select: { id: true } } },
        orderBy: { date: 'desc' },
        take: 30,
      }),
      prisma.claim.findMany({
        where: { schoolId: req.schoolAccount.schoolId },
        include: { delivery: { select: { date: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    res.json({
      eligibleDeliveries: deliveries.filter((delivery) => !delivery.claim).map((delivery) => ({
        id: delivery.id,
        date: delivery.date,
        portions: delivery.portions,
      })),
      returns: claims,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/school/returns', requireSchool, async (req, res, next) => {
  try {
    const { deliveryId, type, portions, note, evidenceUrl } = req.body || {};
    const returnedPortions = Number(portions);
    const allowedTypes = ['Kualitas makanan', 'Kemasan rusak', 'Jumlah tidak sesuai', 'Keterlambatan', 'Lainnya'];
    let normalizedEvidenceUrl = null;
    if (evidenceUrl != null && evidenceUrl !== '') {
      try {
        const parsedUrl = new URL(evidenceUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('URL protocol tidak valid');
        normalizedEvidenceUrl = parsedUrl.toString();
      } catch {
        return res.status(400).json({ message: 'Tautan bukti harus berupa alamat web HTTP atau HTTPS yang valid.' });
      }
    }
    if (typeof deliveryId !== 'string' || !deliveryId
      || !allowedTypes.includes(type)
      || !Number.isSafeInteger(returnedPortions) || returnedPortions < 1
      || typeof note !== 'string' || note.trim().length < 10 || note.trim().length > 1000
      || (evidenceUrl != null && (typeof evidenceUrl !== 'string' || evidenceUrl.length > 1000))) {
      return res.status(400).json({ message: 'Pengiriman, kategori, jumlah porsi, dan keterangan retur wajib diisi dengan benar.' });
    }
    const delivery = await prisma.delivery.findFirst({
      where: { id: deliveryId, schoolId: req.schoolAccount.schoolId, status: 'COMPLETED' },
      select: { id: true, portions: true },
    });
    if (!delivery) return res.status(404).json({ message: 'Pengiriman selesai tidak ditemukan untuk sekolah ini.' });
    if (returnedPortions > delivery.portions) {
      return res.status(400).json({ message: 'Jumlah retur tidak boleh melebihi jumlah porsi pada pengiriman.' });
    }
    const existingClaim = await prisma.claim.findUnique({ where: { deliveryId } });
    if (existingClaim) return res.status(409).json({ message: 'Retur untuk pengiriman ini sudah pernah diajukan.' });

    const claim = await prisma.claim.create({
      data: {
        deliveryId,
        schoolId: req.schoolAccount.schoolId,
        type,
        portions: returnedPortions,
        note: note.trim(),
        evidenceUrl: normalizedEvidenceUrl,
      },
    });
    res.status(201).json({ claim, message: 'Pengajuan retur berhasil dikirim ke admin SPPG.' });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Retur untuk pengiriman ini sudah pernah diajukan.' });
    }
    next(error);
  }
});

function encryptEmailPayload(payload) {
  const key = crypto.createHash('sha256').update(JWT_SECRET).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

function decryptEmailPayload(value) {
  const [encodedIv, encodedTag, encodedPayload] = value.split('.');
  const key = crypto.createHash('sha256').update(JWT_SECRET).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(encodedIv, 'base64url'));
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
  return JSON.parse(Buffer.concat([
    decipher.update(Buffer.from(encodedPayload, 'base64url')),
    decipher.final(),
  ]).toString('utf8'));
}

function emailIsConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.EMAIL_FROM);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

let dispatchingEmail = false;
let emailTransport;

async function dispatchPendingEmails() {
  if (!emailIsConfigured() || dispatchingEmail) return;
  dispatchingEmail = true;
  try {
    emailTransport ||= nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD.replace(/\s+/g, '') },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    const jobs = await prisma.emailOutbox.findMany({
      where: { status: 'PENDING', attempts: { lt: 5 }, nextAttemptAt: { lte: new Date() } },
      orderBy: { createdAt: 'asc' },
      take: 10,
      include: { invitation: true, driverInvitation: true },
    });

    for (const job of jobs) {
      try {
        const invitation = job.invitation || job.driverInvitation;
        if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
          await prisma.emailOutbox.update({
            where: { id: job.id },
            data: { status: 'FAILED', lastError: 'Undangan kedaluwarsa. Buat undangan baru dari halaman pengelolaan akun.' },
          });
          continue;
        }
        await emailTransport.sendMail({
          from: process.env.EMAIL_FROM,
          to: job.recipient,
          subject: job.subject,
          ...decryptEmailPayload(job.encryptedPayload),
        });
        await prisma.emailOutbox.update({
          where: { id: job.id },
          data: { status: 'SENT', sentAt: new Date(), lastError: null },
        });
      } catch (error) {
        const attempts = job.attempts + 1;
        await prisma.emailOutbox.update({
          where: { id: job.id },
          data: {
            attempts,
            status: attempts >= 5 ? 'FAILED' : 'PENDING',
            nextAttemptAt: new Date(Date.now() + Math.min(2 ** attempts * 60_000, 60 * 60_000)),
            lastError: 'Pengiriman email gagal. Sistem akan mencoba kembali.',
          },
        });
        console.error(`Email undangan gagal dikirim (job ${job.id}, percobaan ${attempts}): ${error.code || 'SMTP_ERROR'}`);
      }
    }
  } catch (error) {
    console.error('Pemroses antrean email undangan gagal:', error);
  } finally {
    dispatchingEmail = false;
  }
}

function makeSchoolInviteMessage(schoolName, email, token) {
  const activationUrl = new URL('/activate', process.env.APP_URL || 'http://localhost:5173');
  activationUrl.searchParams.set('token', token);
  const safeSchool = escapeHtml(schoolName);
  const safeEmail = escapeHtml(email);
  const safeActivationUrl = escapeHtml(activationUrl.toString());
  return {
    text: `Halo admin ${schoolName}, akun sekolah NutriTrack MBG telah disiapkan.\n\nNama sekolah: ${schoolName}\nEmail login: ${email}\n\nBuat kata sandi melalui tautan aktivasi berikut (berlaku 24 jam): ${activationUrl.toString()}\n\nAkun sekolah akan aktif setelah berhasil login pertama kali.`,
    html: `<main style="max-width:560px;margin:32px auto;padding:28px;font-family:Arial,sans-serif;color:#29372e;border:1px solid #e6ece7;border-radius:12px"><p style="color:#39734a;font-weight:700">NUTRITRACK MBG</p><h1 style="font-size:22px">Aktivasi akun sekolah</h1><p>Halo admin <strong>${safeSchool}</strong>, akun sekolah Anda sudah disiapkan oleh administrator SPPG.</p><p><strong>Email login:</strong> ${safeEmail}</p><p style="margin:28px 0"><a href="${safeActivationUrl}" style="padding:12px 18px;border-radius:8px;color:#fff;background:#245a3e;text-decoration:none;font-weight:700">Buat kata sandi</a></p><p>Tautan berlaku selama 24 jam. Akun sekolah akan aktif setelah berhasil login pertama kali.</p></main>`,
  };
}

async function enqueueSchoolInvite(transaction, school, account) {
  const token = crypto.randomBytes(32).toString('base64url');
  const credentialMessage = makeSchoolInviteMessage(school.name, account.email, token);
  const invitation = await transaction.schoolInvitation.create({
    data: {
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      schoolId: school.id,
      schoolUserId: account.id,
    },
  });
  return transaction.emailOutbox.create({
    data: {
      recipient: account.email,
      subject: 'Aktivasi akun sekolah NutriTrack MBG',
      encryptedPayload: encryptEmailPayload(credentialMessage),
      invitationId: invitation.id,
    },
  });
}

function makeDriverInviteMessage(name, email, token) {
  const activationUrl = new URL('/courier/activate', process.env.APP_URL || 'http://localhost:5173');
  activationUrl.searchParams.set('token', token);
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeActivationUrl = escapeHtml(activationUrl.toString());
  return {
    text: `Halo ${name}, akun kurir NutriTrack MBG telah disiapkan.\n\nEmail login: ${email}\n\nBuat kata sandi melalui tautan aktivasi berikut (berlaku 24 jam): ${activationUrl.toString()}`,
    html: `<main style="max-width:560px;margin:32px auto;padding:28px;font-family:Arial,sans-serif;color:#29372e;border:1px solid #e6ece7;border-radius:12px"><p style="color:#39734a;font-weight:700">NUTRITRACK MBG</p><h1 style="font-size:22px">Aktivasi akun kurir</h1><p>Halo <strong>${safeName}</strong>, akun kurir Anda sudah disiapkan.</p><p><strong>Email login:</strong> ${safeEmail}</p><p style="margin:28px 0"><a href="${safeActivationUrl}" style="padding:12px 18px;border-radius:8px;color:#fff;background:#245a3e;text-decoration:none;font-weight:700">Buat kata sandi</a></p><p>Tautan berlaku selama 24 jam. Setelah aktivasi, Anda dapat masuk ke dashboard kurir.</p></main>`,
  };
}

async function enqueueDriverInvite(transaction, driver, account) {
  const token = crypto.randomBytes(32).toString('base64url');
  const invitation = await transaction.driverInvitation.create({
    data: {
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      driverId: driver.id,
      driverUserId: account.id,
    },
  });
  return transaction.emailOutbox.create({
    data: {
      recipient: account.email,
      subject: 'Aktivasi akun kurir NutriTrack MBG',
      encryptedPayload: encryptEmailPayload(makeDriverInviteMessage(driver.name, account.email, token)),
      driverInvitationId: invitation.id,
    },
  });
}

app.post('/api/auth/driver/activate', async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    if (typeof token !== 'string' || !token
      || typeof password !== 'string' || password.length < 12 || password.length > 128) {
      return res.status(400).json({ message: 'Tautan aktivasi dan kata sandi minimal 12 karakter wajib diisi.' });
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invitation = await prisma.driverInvitation.findFirst({
      where: { tokenHash, acceptedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!invitation) {
      return res.status(400).json({ message: 'Tautan aktivasi sudah tidak berlaku atau sudah pernah digunakan.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const activated = await prisma.$transaction(async (transaction) => {
      const result = await transaction.driverInvitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: new Date() } },
        data: { acceptedAt: new Date() },
      });
      if (result.count !== 1) return false;
      await transaction.driverUser.update({
        where: { id: invitation.driverUserId },
        data: { passwordHash, isActive: true },
      });
      await transaction.emailOutbox.updateMany({
        where: { driverInvitation: { driverUserId: invitation.driverUserId }, status: 'PENDING' },
        data: { status: 'FAILED', lastError: 'Undangan sebelumnya sudah digunakan.' },
      });
      return true;
    });
    if (!activated) {
      return res.status(400).json({ message: 'Tautan aktivasi sudah tidak berlaku atau sudah pernah digunakan.' });
    }
    res.json({ message: 'Akun kurir aktif. Silakan masuk menggunakan email dan kata sandi yang baru dibuat.' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/school/activate', async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    if (typeof token !== 'string' || typeof password !== 'string' || password.length < 12) {
      return res.status(400).json({ message: 'Tautan aktivasi dan kata sandi minimal 12 karakter wajib diisi.' });
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invitation = await prisma.schoolInvitation.findFirst({
      where: { tokenHash, acceptedAt: null, expiresAt: { gt: new Date() } },
      include: { schoolUser: { include: { school: { select: { name: true } } } } },
    });
    if (!invitation) {
      return res.status(400).json({ message: 'Tautan aktivasi sudah tidak berlaku atau sudah pernah digunakan.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const activated = await prisma.$transaction(async (transaction) => {
      const result = await transaction.schoolInvitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: new Date() } },
        data: { acceptedAt: new Date() },
      });
      if (result.count !== 1) return false;
      await transaction.schoolUser.update({
        where: { id: invitation.schoolUserId },
        data: { passwordHash, isActive: false },
      });
      return true;
    });

    if (!activated) {
      return res.status(400).json({ message: 'Tautan aktivasi sudah tidak berlaku atau sudah pernah digunakan.' });
    }
    res.json({ message: `Password untuk akun ${invitation.schoolUser.school.name} berhasil dibuat. Login pertama akan mengaktifkan akun.` });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/schools', requireAdmin, async (req, res, next) => {
  try {
    const schools = await prisma.school.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: {
        account: { select: { email: true, isActive: true } },
        _count: { select: { menuRecipients: true } },
      },
    });
    const emailStatuses = await prisma.emailOutbox.findMany({
      where: { recipient: { in: schools.map((school) => school.email).filter(Boolean) } },
      select: { recipient: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const latestStatus = new Map();
    for (const item of emailStatuses) {
      if (!latestStatus.has(item.recipient)) latestStatus.set(item.recipient, item.status);
    }
    res.json({
      emailConfigured: emailIsConfigured(),
      schools: schools.map((school) => ({
        id: school.id,
        name: school.name,
        email: school.email,
        address: school.address,
        educationLevel: school.educationLevel,
        targetPupils: school.targetPupils,
        isActive: school.isActive,
        menuCount: school._count.menuRecipients,
        accountStatus: !school.account ? 'NOT_CREATED' : school.account.isActive ? 'ACTIVE' : 'PENDING',
        invitationEmailStatus: school.email ? latestStatus.get(school.email) || null : null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/email/test', requireAdmin, async (req, res, next) => {
  try {
    if (!emailIsConfigured()) {
      return res.status(503).json({
        configured: false,
        message: 'Isi SMTP_USER, SMTP_PASSWORD, dan EMAIL_FROM pada backend/.env, lalu mulai ulang backend.',
      });
    }
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD.replace(/\s+/g, '') },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    await transport.verify();
    emailTransport = transport;
    await dispatchPendingEmails();
    res.json({ configured: true, verified: true, message: 'Koneksi SMTP berhasil diverifikasi. Semua undangan akun yang menunggu sedang diproses.' });
  } catch (error) {
    console.error('Verifikasi SMTP gagal:', error.code || 'SMTP_ERROR');
    res.status(502).json({
      configured: emailIsConfigured(),
      verified: false,
      message: 'Koneksi SMTP gagal diverifikasi. Periksa App Password Gmail dan pengaturan SMTP pada backend/.env.',
    });
  }
});

app.patch('/api/admin/schools/:schoolId', requireAdmin, async (req, res, next) => {
  try {
    const schoolId = req.params.schoolId;
    const currentSchool = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { account: true },
    });
    if (!currentSchool) return res.status(404).json({ message: 'Sekolah tidak ditemukan.' });

    const { name, email, educationLevel, targetPupils, address } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const pupilTarget = Number(targetPupils);
    if (!trimmedName || trimmedName.length > 160
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
      || !EDUCATION_LEVELS.includes(educationLevel)
      || !Number.isSafeInteger(pupilTarget) || pupilTarget < 1 || pupilTarget > 100_000
      || (address != null && (typeof address !== 'string' || address.length > 500))) {
      return res.status(400).json({ message: 'Nama, email sekolah, jenjang, alamat, atau target porsi tidak valid.' });
    }

    const duplicate = await prisma.school.findFirst({
      where: { id: { not: schoolId }, OR: [{ name: { equals: trimmedName } }, { email: normalizedEmail }] },
      select: { id: true },
    });
    const emailAccount = await prisma.schoolUser.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
    const driverAccount = await prisma.driverUser.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
    if (duplicate || driverAccount || (emailAccount && emailAccount.id !== currentSchool.account?.id)) {
      return res.status(409).json({ message: 'Nama sekolah atau email tersebut sudah digunakan sekolah lain.' });
    }

    const emailChanged = currentSchool.email !== normalizedEmail;
    const resetCredentials = !currentSchool.account || emailChanged
      || (!currentSchool.account?.isActive && currentSchool.name !== trimmedName);
    const result = await prisma.$transaction(async (transaction) => {
      await transaction.school.update({
        where: { id: schoolId },
        data: {
          name: trimmedName,
          email: normalizedEmail,
          educationLevel,
          targetPupils: pupilTarget,
          address: typeof address === 'string' && address.trim() ? address.trim() : null,
        },
      });

      if (currentSchool.account && resetCredentials) {
        await transaction.schoolUser.update({
          where: { id: currentSchool.account.id },
          data: { email: normalizedEmail, isActive: false, passwordHash: null },
        });
        await transaction.schoolInvitation.updateMany({
          where: { schoolUserId: currentSchool.account.id, acceptedAt: null },
          data: { expiresAt: new Date() },
        });
        await transaction.emailOutbox.updateMany({
          where: { invitation: { schoolUserId: currentSchool.account.id }, status: 'PENDING' },
          data: { status: 'FAILED', lastError: 'Alamat email sekolah diperbarui. Undangan lama diganti.' },
        });
        await enqueueSchoolInvite(transaction, { id: schoolId, name: trimmedName }, { ...currentSchool.account, email: normalizedEmail });
      } else if (!currentSchool.account) {
        const account = await transaction.schoolUser.create({
          data: { email: normalizedEmail, schoolId, isActive: false, passwordHash: null },
        });
        await enqueueSchoolInvite(transaction, { id: schoolId, name: trimmedName }, account);
      }

      return transaction.school.findUnique({
        where: { id: schoolId },
        include: { account: { select: { isActive: true } } },
      });
    });

    await dispatchPendingEmails();
    res.json({
      school: {
        id: result.id,
        name: result.name,
        email: result.email,
        address: result.address,
        educationLevel: result.educationLevel,
        targetPupils: result.targetPupils,
        isActive: result.isActive,
        accountStatus: !result.account ? 'NOT_CREATED' : result.account.isActive ? 'ACTIVE' : 'PENDING',
      },
      emailConfigured: emailIsConfigured(),
      message: resetCredentials && currentSchool.account
        ? 'Data sekolah diperbarui. Tautan aktivasi baru dikirim ke email; status akun aktif kembali setelah login.'
        : !currentSchool.account
          ? 'Data sekolah dan akun undangan berhasil disiapkan.'
          : 'Data sekolah berhasil diperbarui.',
    });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'Nama sekolah atau email tersebut sudah digunakan.' });
    next(error);
  }
});

app.delete('/api/admin/schools/:schoolId', requireAdmin, async (req, res, next) => {
  try {
    const school = await prisma.school.findUnique({ where: { id: req.params.schoolId }, select: { id: true, name: true } });
    if (!school) return res.status(404).json({ message: 'Sekolah tidak ditemukan.' });

    await prisma.$transaction(async (transaction) => {
      await transaction.emailOutbox.deleteMany({ where: { invitation: { schoolId: school.id } } });
      await transaction.delivery.deleteMany({ where: { schoolId: school.id } });
      await transaction.claim.deleteMany({ where: { schoolId: school.id } });
      await transaction.menuRecipient.deleteMany({ where: { schoolId: school.id } });
      await transaction.school.delete({ where: { id: school.id } });
    });
    res.json({ message: `Sekolah ${school.name}, akun, data pengiriman, klaim, dan jadwal penerimanya berhasil dihapus.` });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/schools', requireAdmin, async (req, res, next) => {
  try {
    const { name, email, educationLevel, targetPupils, address } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const pupilTarget = Number(targetPupils);

    if (!trimmedName || trimmedName.length > 160
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
      || !EDUCATION_LEVELS.includes(educationLevel)
      || !Number.isSafeInteger(pupilTarget) || pupilTarget < 1 || pupilTarget > 100_000
      || (address != null && (typeof address !== 'string' || address.length > 500))) {
      return res.status(400).json({ message: 'Nama, email sekolah, jenjang, alamat, atau target porsi tidak valid.' });
    }

    const duplicate = await prisma.school.findFirst({
      where: { OR: [{ name: { equals: trimmedName } }, { email: normalizedEmail }] },
      select: { id: true },
    });
    const existingAccount = await prisma.schoolUser.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
    const existingDriverAccount = await prisma.driverUser.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
    if (duplicate || existingAccount || existingDriverAccount) {
      return res.status(409).json({ message: 'Nama sekolah atau email tersebut sudah terdaftar.' });
    }

    const result = await prisma.$transaction(async (transaction) => {
      const school = await transaction.school.create({
        data: {
          name: trimmedName,
          email: normalizedEmail,
          address: typeof address === 'string' && address.trim() ? address.trim() : null,
          educationLevel,
          targetPupils: pupilTarget,
        },
      });
      const account = await transaction.schoolUser.create({
        data: {
          email: normalizedEmail,
          schoolId: school.id,
          passwordHash: null,
        },
      });
      const invitation = await enqueueSchoolInvite(transaction, school, account);
      return { school, invitation };
    });

    await dispatchPendingEmails();
    const invitation = await prisma.emailOutbox.findUnique({ where: { id: result.invitation.id }, select: { status: true } });
    res.status(201).json({
      school: {
        id: result.school.id,
        name: result.school.name,
        email: result.school.email,
        educationLevel: result.school.educationLevel,
        targetPupils: result.school.targetPupils,
        accountStatus: 'PENDING',
        invitationEmailStatus: invitation.status,
      },
      emailConfigured: emailIsConfigured(),
      message: invitation.status === 'SENT'
        ? 'Tautan aktivasi akun sekolah sudah dikirim melalui email.'
        : 'Akun sekolah sudah disiapkan. Tautan aktivasi tersimpan aman di antrean sampai SMTP siap.',
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Nama sekolah atau email tersebut sudah terdaftar.' });
    }
    next(error);
  }
});

app.post('/api/admin/schools/:schoolId/invite', requireAdmin, async (req, res, next) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.params.schoolId },
      include: { account: true },
    });
    if (!school?.account || !school.email) {
      return res.status(404).json({ message: 'Akun sekolah tidak ditemukan.' });
    }
    if (school.account.isActive) {
      return res.status(409).json({ message: 'Akun sekolah ini sudah aktif.' });
    }

    const outbox = await prisma.$transaction(async (transaction) => {
      await transaction.schoolUser.update({
        where: { id: school.account.id },
        data: { passwordHash: null, isActive: false },
      });
      await transaction.schoolInvitation.updateMany({
        where: { schoolUserId: school.account.id, acceptedAt: null },
        data: { expiresAt: new Date() },
      });
      await transaction.emailOutbox.updateMany({
        where: { invitation: { schoolUserId: school.account.id }, status: 'PENDING' },
        data: { status: 'FAILED', lastError: 'Undangan lama diganti dengan undangan baru.' },
      });
      return enqueueSchoolInvite(transaction, school, school.account);
    });

    await dispatchPendingEmails();
    const invitation = await prisma.emailOutbox.findUnique({ where: { id: outbox.id }, select: { status: true } });
    res.json({
      emailConfigured: emailIsConfigured(),
      invitationEmailStatus: invitation.status,
      message: invitation.status === 'SENT'
        ? 'Tautan aktivasi akun sekolah sudah dikirim ulang.'
        : 'Tautan aktivasi belum terkirim; email aman dalam antrean sampai SMTP siap.',
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/drivers', requireAdmin, async (req, res, next) => {
  try {
    const drivers = await prisma.driver.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: { account: { select: { id: true, email: true, isActive: true } } },
    });
    const emailStatuses = await prisma.emailOutbox.findMany({
      where: { recipient: { in: drivers.map((driver) => driver.account?.email).filter(Boolean) } },
      select: { recipient: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const latestStatus = new Map();
    for (const item of emailStatuses) {
      if (!latestStatus.has(item.recipient)) latestStatus.set(item.recipient, item.status);
    }
    res.json({
      emailConfigured: emailIsConfigured(),
      drivers: drivers.map((driver) => ({
        id: driver.id,
        name: driver.name,
        isActive: driver.isActive,
        email: driver.account?.email || null,
        accountStatus: !driver.account ? 'NONE' : driver.account.isActive ? 'ACTIVE' : 'PENDING',
        invitationEmailStatus: driver.account ? latestStatus.get(driver.account.email) || 'PENDING' : null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/drivers', requireAdmin, async (req, res, next) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!name || name.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Nama kurir dan alamat email yang valid wajib diisi.' });
    }
    const existingAccount = await prisma.driverUser.findUnique({ where: { email }, select: { id: true } });
    const existingSchoolAccount = await prisma.schoolUser.findUnique({ where: { email }, select: { id: true } });
    const existingSchool = await prisma.school.findFirst({ where: { email }, select: { id: true } });
    const existingAdmin = await prisma.adminUser.findFirst({
      where: { email },
      select: { id: true },
    });
    if (existingAccount || existingSchoolAccount || existingSchool || existingAdmin) {
      return res.status(409).json({ message: 'Email tersebut sudah digunakan oleh akun lain.' });
    }

    const result = await prisma.$transaction(async (transaction) => {
      const driver = await transaction.driver.create({ data: { name } });
      const account = await transaction.driverUser.create({ data: { email, driverId: driver.id } });
      const invitation = await enqueueDriverInvite(transaction, driver, account);
      return { driver, invitation };
    });
    await dispatchPendingEmails();
    const invitation = await prisma.emailOutbox.findUnique({
      where: { id: result.invitation.id },
      select: { status: true },
    });
    res.status(201).json({
      driver: {
        id: result.driver.id,
        name: result.driver.name,
        email,
        accountStatus: 'PENDING',
        invitationEmailStatus: invitation.status,
      },
      message: invitation.status === 'SENT'
        ? 'Undangan aktivasi akun kurir telah dikirim melalui email.'
        : 'Akun kurir sudah disiapkan. Undangan aktivasi tersimpan di antrean email sampai SMTP siap.',
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Email tersebut sudah digunakan oleh akun lain.' });
    }
    next(error);
  }
});

app.post('/api/admin/drivers/:driverId/invite', requireAdmin, async (req, res, next) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.driverId },
      include: { account: true },
    });
    if (!driver?.account) return res.status(404).json({ message: 'Akun kurir tidak ditemukan.' });
    if (driver.account.isActive) return res.status(409).json({ message: 'Akun kurir ini sudah aktif.' });

    const outbox = await prisma.$transaction(async (transaction) => {
      await transaction.driverInvitation.updateMany({
        where: { driverUserId: driver.account.id, acceptedAt: null },
        data: { expiresAt: new Date() },
      });
      await transaction.emailOutbox.updateMany({
        where: { driverInvitation: { driverUserId: driver.account.id }, status: 'PENDING' },
        data: { status: 'FAILED', lastError: 'Undangan lama diganti dengan undangan baru.' },
      });
      return enqueueDriverInvite(transaction, driver, driver.account);
    });
    await dispatchPendingEmails();
    const invitation = await prisma.emailOutbox.findUnique({
      where: { id: outbox.id },
      select: { status: true },
    });
    res.json({
      message: invitation.status === 'SENT'
        ? 'Undangan aktivasi akun kurir telah dikirim ulang.'
        : 'Undangan belum terkirim; email tersimpan di antrean sampai SMTP siap.',
    });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/deliveries/:deliveryId/driver', requireAdmin, async (req, res, next) => {
  try {
    const driverId = typeof req.body?.driverId === 'string' && req.body.driverId ? req.body.driverId : null;
    if (driverId) {
      const driver = await prisma.driver.findFirst({
        where: { id: driverId, isActive: true, account: { is: { isActive: true } } },
        select: { id: true },
      });
      if (!driver) return res.status(404).json({ message: 'Kurir aktif tidak ditemukan.' });
    }
    const result = await prisma.delivery.updateMany({
      where: { id: req.params.deliveryId },
      data: { driverId },
    });
    if (result.count !== 1) return res.status(404).json({ message: 'Pengiriman tidak ditemukan.' });
    res.json({ message: driverId ? 'Kurir berhasil ditugaskan.' : 'Penugasan kurir berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/returns', requireAdmin, async (req, res, next) => {
  try {
    const returns = await prisma.claim.findMany({
      include: {
        school: { select: { id: true, name: true } },
        delivery: { select: { id: true, date: true, portions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ returns });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/returns/:returnId', requireAdmin, async (req, res, next) => {
  try {
    const { status, adminNote } = req.body || {};
    if (!['APPROVED', 'REJECTED'].includes(status)
      || (adminNote != null && (typeof adminNote !== 'string' || adminNote.trim().length > 1000))
      || (status === 'REJECTED' && (typeof adminNote !== 'string' || adminNote.trim().length < 5))) {
      return res.status(400).json({ message: 'Status atau catatan tindak lanjut tidak valid. Penolakan harus disertai alasan minimal 5 karakter.' });
    }
    const result = await prisma.claim.updateMany({
      where: { id: req.params.returnId, status: 'PENDING' },
      data: {
        status,
        adminNote: typeof adminNote === 'string' && adminNote.trim() ? adminNote.trim() : null,
        reviewedAt: new Date(),
      },
    });
    if (result.count !== 1) {
      const claim = await prisma.claim.findUnique({ where: { id: req.params.returnId }, select: { id: true } });
      return res.status(claim ? 409 : 404).json({
        message: claim ? 'Pengajuan retur ini sudah ditinjau.' : 'Pengajuan retur tidak ditemukan.',
      });
    }
    res.json({ message: status === 'APPROVED' ? 'Pengajuan retur disetujui.' : 'Pengajuan retur ditolak.' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/courier/dashboard', requireDriver, async (req, res, next) => {
  try {
    const deliveries = await prisma.delivery.findMany({
      where: { driverId: req.driverAccount.driverId },
      include: { school: { select: { name: true, address: true } } },
      orderBy: [{ date: 'desc' }, { departureTime: 'asc' }],
    });
    res.json({
      driver: {
        id: req.driverAccount.driver.id,
        name: req.driverAccount.driver.name,
      },
      deliveries: deliveries.map((delivery) => ({
        id: delivery.id,
        date: delivery.date,
        portions: delivery.portions,
        status: delivery.status,
        statusNote: delivery.statusNote,
        departureTime: delivery.departureTime,
        receivedAt: delivery.receivedAt,
        school: delivery.school.name,
        address: delivery.school.address,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/courier/deliveries/:deliveryId', requireDriver, async (req, res, next) => {
  try {
    const { status, note } = req.body || {};
    if (!['IN_TRANSIT', 'COMPLETED', 'ALERT'].includes(status)
      || (note != null && (typeof note !== 'string' || note.trim().length > 500))
      || (status === 'ALERT' && (!note || note.trim().length < 5))) {
      return res.status(400).json({ message: 'Status atau catatan pembaruan pengiriman tidak valid.' });
    }
    const delivery = await prisma.delivery.findFirst({
      where: { id: req.params.deliveryId, driverId: req.driverAccount.driverId },
      select: { id: true, status: true },
    });
    if (!delivery) return res.status(404).json({ message: 'Pengiriman yang ditugaskan kepada Anda tidak ditemukan.' });
    const allowedTransition = (delivery.status === 'PREPARING' && status === 'IN_TRANSIT')
      || (delivery.status === 'IN_TRANSIT' && ['COMPLETED', 'ALERT'].includes(status))
      || (delivery.status === 'ALERT' && ['IN_TRANSIT', 'COMPLETED'].includes(status));
    if (!allowedTransition) {
      return res.status(409).json({ message: 'Perubahan status ini tidak sesuai dengan tahapan pengiriman saat ini.' });
    }
    const now = new Date();
    const data = {
      status,
      statusNote: typeof note === 'string' && note.trim()
        ? note.trim()
        : status === 'COMPLETED' ? 'Pengiriman diterima sekolah' : 'Kurir dalam perjalanan',
      ...(status === 'IN_TRANSIT' && {
        departureTime: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }),
      }),
      ...(status === 'COMPLETED' && {
        receivedAt: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }),
      }),
    };
    const result = await prisma.delivery.updateMany({
      where: { id: delivery.id, driverId: req.driverAccount.driverId, status: delivery.status },
      data,
    });
    if (result.count !== 1) {
      return res.status(409).json({ message: 'Status pengiriman berubah. Muat ulang daftar sebelum mencoba lagi.' });
    }
    res.json({ message: 'Pembaruan status pengiriman berhasil disimpan.' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/nutrition/ingredients', requireAdmin, async (req, res, next) => {
  try {
    const ingredients = await prisma.nutritionIngredient.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    res.json({ ingredients });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/nutrition/ingredients', requireAdmin, async (req, res, next) => {
  try {
    const { name, category, unit, calories, protein, carbohydrates, fat } = req.body || {};
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedCategory = typeof category === 'string' ? category.trim() : '';
    const normalizedUnit = typeof unit === 'string' ? unit.trim() : '';
    const nutrients = { calories, protein, carbohydrates, fat };

    if (!trimmedName || trimmedName.length > 120 || !trimmedCategory || trimmedCategory.length > 60
      || normalizedUnit !== 'g'
      || Object.values(nutrients).some((value) => !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 10_000)) {
      return res.status(400).json({ message: 'Lengkapi nama, kategori, dan nilai gizi non-negatif per 100 gram.' });
    }

    const ingredient = await prisma.nutritionIngredient.create({
      data: {
        name: trimmedName,
        category: trimmedCategory,
        unit: normalizedUnit,
        calories: Number(calories),
        protein: Number(protein),
        carbohydrates: Number(carbohydrates),
        fat: Number(fat),
      },
    });
    res.status(201).json({
      ingredient,
      message: 'Bahan makanan tersimpan di katalog. Masukkan nilai gizi sesuai label produk atau data resmi bahan yang digunakan.',
    });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'Nama bahan makanan tersebut sudah ada di katalog.' });
    next(error);
  }
});

app.get('/api/admin/nutrition/menus', requireAdmin, async (req, res, next) => {
  try {
    const menus = await prisma.mealMenu.findMany({
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 30,
      include: {
        ingredients: { include: { ingredient: true } },
        recipients: { include: { school: { select: { id: true, name: true } } } },
      },
    });
    res.json({ menus });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/nutrition/menus', requireAdmin, async (req, res, next) => {
  try {
    const { name, date, educationLevel, productionNote, schoolIds, ingredients } = req.body || {};
    const menuName = typeof name === 'string' ? name.trim() : '';
    const scheduleDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? new Date(`${date}T00:00:00`)
      : null;
    const uniqueSchoolIds = Array.isArray(schoolIds) ? [...new Set(schoolIds)] : [];
    const requestedIngredients = Array.isArray(ingredients) ? ingredients : [];
    if (!menuName || menuName.length > 160 || !scheduleDate || Number.isNaN(scheduleDate.getTime())
      || !EDUCATION_LEVELS.includes(educationLevel) || !uniqueSchoolIds.length
      || !requestedIngredients.length || requestedIngredients.length > 40
      || (productionNote != null && (typeof productionNote !== 'string' || productionNote.length > 2000))) {
      return res.status(400).json({ message: 'Lengkapi nama menu, tanggal, jenjang, sekolah penerima, dan bahan makanan.' });
    }

    const normalizedIngredients = new Map();
    for (const entry of requestedIngredients) {
      const ingredientId = typeof entry?.ingredientId === 'string' ? entry.ingredientId : '';
      const amountGrams = Number(entry?.amountGrams);
      if (!ingredientId || !Number.isFinite(amountGrams) || amountGrams <= 0 || amountGrams > 10_000) {
        return res.status(400).json({ message: 'Jumlah bahan per porsi harus lebih dari 0 dan tidak melebihi 10.000 gram.' });
      }
      if (normalizedIngredients.has(ingredientId)) {
        return res.status(400).json({ message: 'Satu bahan makanan hanya dapat ditambahkan satu kali ke menu.' });
      }
      normalizedIngredients.set(ingredientId, amountGrams);
    }

    const [schools, nutritionIngredients] = await Promise.all([
      prisma.school.findMany({ where: { id: { in: uniqueSchoolIds }, isActive: true } }),
      prisma.nutritionIngredient.findMany({ where: { id: { in: [...normalizedIngredients.keys()] } } }),
    ]);
    if (schools.length !== uniqueSchoolIds.length || schools.some((school) => school.educationLevel !== educationLevel)) {
      return res.status(400).json({ message: 'Pilih sekolah aktif yang seluruhnya sesuai dengan jenjang menu.' });
    }
    if (nutritionIngredients.length !== normalizedIngredients.size) {
      return res.status(400).json({ message: 'Bahan makanan pada menu tidak ditemukan.' });
    }

    const dayStart = new Date(scheduleDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const conflictingRecipient = await prisma.menuRecipient.findFirst({
      where: { schoolId: { in: uniqueSchoolIds }, menu: { date: { gte: dayStart, lt: dayEnd } } },
      include: { school: { select: { name: true } } },
    });
    if (conflictingRecipient) {
      return res.status(409).json({ message: `${conflictingRecipient.school.name} sudah memiliki menu MBG terjadwal pada tanggal tersebut.` });
    }

    const ingredientById = new Map(nutritionIngredients.map((ingredient) => [ingredient.id, ingredient]));
    const menu = await prisma.$transaction(async (transaction) => {
      const createdMenu = await transaction.mealMenu.create({
        data: {
          name: menuName,
          educationLevel,
          date: dayStart,
          productionNote: productionNote?.trim() || null,
        },
      });
      await transaction.menuIngredient.createMany({
        data: [...normalizedIngredients].map(([ingredientId, amountGrams]) => ({
          menuId: createdMenu.id,
          ingredientId,
          amountGrams,
        })),
      });
      await transaction.menuRecipient.createMany({
        data: schools.map((school) => ({
          menuId: createdMenu.id,
          schoolId: school.id,
          portions: school.targetPupils,
        })),
      });
      for (const school of schools) {
        await transaction.delivery.upsert({
          where: { date_schoolId: { date: dayStart, schoolId: school.id } },
          update: {
            portions: school.targetPupils,
            status: 'PREPARING',
            statusNote: `Menu MBG dijadwalkan: ${menuName}`,
          },
          create: {
            date: dayStart,
            portions: school.targetPupils,
            status: 'PREPARING',
            statusNote: `Menu MBG dijadwalkan: ${menuName}`,
            schoolId: school.id,
          },
        });
      }

      return transaction.mealMenu.findUnique({
        where: { id: createdMenu.id },
        include: {
          ingredients: { include: { ingredient: true } },
          recipients: { include: { school: { select: { id: true, name: true } } } },
        },
      });
    });

    const totalPortions = menu.recipients.reduce((sum, recipient) => sum + recipient.portions, 0);
    res.status(201).json({
      menu: {
        id: menu.id,
        name: menu.name,
        date: menu.date,
        educationLevel: menu.educationLevel,
        productionNote: menu.productionNote,
        totalPortions,
        recipientCount: menu.recipients.length,
        nutrition: nutritionIngredients.reduce((result, ingredient) => {
          const amount = normalizedIngredients.get(ingredient.id) / 100;
          result.calories += ingredient.calories * amount;
          result.protein += ingredient.protein * amount;
          result.carbohydrates += ingredient.carbohydrates * amount;
          result.fat += ingredient.fat * amount;
          return result;
        }, { calories: 0, protein: 0, carbohydrates: 0, fat: 0 }),
      },
      message: `Menu tersimpan dan distribusi untuk ${menu.recipients.length} sekolah ditambahkan ke dashboard.`,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Sekolah tersebut sudah memiliki jadwal distribusi pada tanggal ini.' });
    }
    next(error);
  }
});

app.get('/api/admin/dashboard', requireAdmin, async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 7);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status : 'all';

    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
      return res.status(400).json({ message: 'Nomor halaman atau batas data tidak valid.' });
    }

    const allowedStatuses = ['all', 'PREPARING', 'IN_TRANSIT', 'COMPLETED', 'ALERT'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Filter status tidak valid.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const deliveryWhere = {
      date: { gte: today, lt: tomorrow },
      ...(status !== 'all' && { status }),
      ...(search && {
        OR: [
          { school: { name: { contains: search } } },
          { driver: { name: { contains: search } } },
        ],
      }),
    };

    const [portionTotals, activeDrivers, schools, completedSchools, totalDeliveries, deliveries, pendingClaimCount, pendingClaims, alerts, pendingClaimPortions] =
      await Promise.all([
        prisma.delivery.aggregate({
          where: { date: { gte: today, lt: tomorrow } },
          _sum: { portions: true },
        }),
        prisma.driver.count({ where: { isActive: true, account: { is: { isActive: true } } } }),
        prisma.school.count({ where: { isActive: true } }),
        prisma.delivery.count({
          where: { date: { gte: today, lt: tomorrow }, status: 'COMPLETED' },
        }),
        prisma.delivery.count({ where: deliveryWhere }),
        prisma.delivery.findMany({
          where: deliveryWhere,
          include: {
            school: { select: { name: true } },
            driver: { select: { name: true } },
          },
          orderBy: [{ departureTime: 'asc' }, { school: { name: 'asc' } }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.claim.count({ where: { status: 'PENDING' } }),
        prisma.claim.findMany({
          where: { status: 'PENDING' },
          include: { school: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 3,
        }),
        prisma.systemAlert.findMany({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
        }),
        prisma.claim.aggregate({
          where: { status: 'PENDING' },
          _sum: { portions: true },
        }),
      ]);

    res.json({
      metrics: {
        totalPortions: portionTotals._sum.portions || 0,
        activeDrivers,
        schoolsServed: schools,
        completedSchools,
        ongoingSchools: Math.max(schools - completedSchools, 0),
        pendingClaims: pendingClaimCount,
        pendingClaimPortions: pendingClaimPortions._sum.portions || 0,
      },
      deliveries: deliveries.map((delivery) => ({
        id: delivery.id,
        driverId: delivery.driverId,
        school: delivery.school.name,
        driver: delivery.driver?.name || 'Belum ditugaskan',
        portions: delivery.portions,
        departureTime: delivery.departureTime,
        status: delivery.status,
        statusNote: delivery.statusNote,
        receivedAt: delivery.receivedAt,
      })),
      pagination: {
        page,
        limit,
        total: totalDeliveries,
        totalPages: Math.ceil(totalDeliveries / limit),
      },
      claims: pendingClaims.map((claim) => ({
        id: claim.id,
        school: claim.school.name,
        type: claim.type,
        portions: claim.portions,
        createdAt: claim.createdAt,
        note: claim.note,
      })),
      alerts: alerts.map((alert) => ({
        id: alert.id,
        title: alert.title,
        school: alert.schoolName,
        message: alert.message,
        createdAt: alert.createdAt,
      })),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error('API error:', error);
  if (res.headersSent) return next(error);
  res.status(500).json({ message: 'Terjadi kesalahan pada server. Silakan coba kembali.' });
});

const server = app.listen(PORT, () => {
  console.log(`Server NutriTrack MBG berjalan di http://localhost:${PORT}`);
  if (emailIsConfigured()) {
    dispatchPendingEmails();
    const emailWorker = setInterval(dispatchPendingEmails, 30_000);
    emailWorker.unref();
  } else {
    console.log('SMTP belum dikonfigurasi; email undangan sekolah dan kurir akan menunggu di antrean aman.');
  }
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
