const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');
const materiService = require('../services/materi.service');
const response = require('../utils/response');

const TEMP_DIR = process.env.MATERI_TEMP_DIR || '/var/www/data/elearning/temp';
const MATERI_DIR = process.env.MATERI_DIR || '/var/www/data/elearning/materi';
const WORKER_PATH = path.resolve(__dirname, '..', 'workers', 'video.worker.js');

/**
 * Batas maksimum proses FFmpeg yang boleh berjalan bersamaan.
 * Atur lewat env MAX_CONCURRENT_WORKERS (default: 2).
 * Ini mencegah server OOM saat banyak user upload sekaligus.
 */
const MAX_CONCURRENT_WORKERS = Number.parseInt(process.env.MAX_CONCURRENT_WORKERS, 10) || 2;
let activeWorkers = 0;

const ensureDir = async (dirPath) => {
  await fs.promises.mkdir(dirPath, { recursive: true });
};

/**
 * Spawn satu worker FFmpeg dan track jumlah worker aktif.
 * Ketika worker selesai (exit), counter dikurangi.
 */
const spawnVideoWorker = (materiId, inputPath, outputFileName) => {
  activeWorkers += 1;

  const child = fork(WORKER_PATH, [
    String(materiId),
    inputPath,
    outputFileName,
  ], {
    detached: true,
    stdio: 'ignore',
    env: process.env,
  });

  // Kurangi counter saat proses selesai (berhasil atau gagal)
  child.on('exit', () => {
    activeWorkers = Math.max(0, activeWorkers - 1);
  });

  child.unref();
  return child;
};


const mapAccountResponse = (materi) => ({
  id: materi.id ?? null,
  pertemuan: {
    id: materi.pertemuan_id ?? null,
    name: materi.pertemuan_name ?? null,
  },
  name: materi.name ?? null,
  type: materi.type ?? null,
  content: materi.content ?? null,
  status: materi.status ?? null,
  duration: materi.duration ?? null,
  is_mandatory: materi.is_mandatory ? Boolean(materi.is_mandatory) : false,
  created_by: {
    account_id: materi.created_by ?? null,
    account_name: materi.account_name ?? null,
    npk: materi.npk ?? null,
  },
  created_at: materi.created_at ?? null,
  updated_at: materi.updated_at ?? null,
});


const getAllMateri = async (req, res) => {
  try {
    const rows = await materiService.findAll();
    return response.ok(res, 'Materi retrieved successfully', rows.map(mapAccountResponse));
  } catch (error) {
    return response.serverError(res, error.message);
  }
};


const uploadVideo = async (req, res) => {
  try {
    const accountId = req.auth && req.auth.account_id ? Number(req.auth.account_id) : null;
    if (!accountId) {
      return response.unauthorized(res, 'Authentication required');
    }

    const pertemuanId = Number.parseInt(req.body.pertemuan_id, 10);
    if (Number.isNaN(pertemuanId)) {
      return response.badRequest(res, 'pertemuan_id is required and must be a number');
    }

    if (!req.file) {
      return response.badRequest(res, 'file is required');
    }

    // Tolak upload jika worker sudah penuh — cegah server overload
    if (activeWorkers >= MAX_CONCURRENT_WORKERS) {
      await fs.promises.unlink(req.file.path).catch(() => null);
      return response.tooManyRequests(
        res,
        `Server sedang memproses ${activeWorkers} video. Silakan coba beberapa menit lagi.`,
      );
    }

    await ensureDir(TEMP_DIR);
    await ensureDir(MATERI_DIR);

    const inputPath = path.resolve(req.file.path);
    const baseName = path.parse(req.file.filename).name;
    const outputFileName = `${baseName}.mp4`;
    const materi = await materiService.createMateri({
      pertemuan_id: pertemuanId,
      type: 'video',
      name: outputFileName,
      content: null,
      status: 'processing',
      duration: null,
      is_mandatory: true,
      created_by: accountId,
    });

    spawnVideoWorker(materi.id, inputPath, outputFileName);

    return response.ok(res, 'Video sedang diproses di background', {
      id: materi.id,
      status: materi.status,
      message: 'Gunakan GET /materi/status/:id untuk cek progress',
    });
  } catch (error) {
    if (req.file && req.file.path) {
      await fs.promises.unlink(req.file.path).catch(() => null);
    }

    return response.serverError(res, error.message);
  }
};

/**
 * Retry processing untuk materi yang stuck di status 'processing'.
 * Berguna setelah server restart — worker lama sudah mati tapi DB masih 'processing'.
 * Hanya bisa dipanggil jika file temp-nya masih ada.
 */
const retryVideoProcessing = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid materi id');
    }

    const materi = await materiService.findById(id);
    if (!materi) {
      return response.notFound(res, 'Materi not found');
    }

    if (materi.status !== 'processing' && materi.status !== 'failed') {
      return response.badRequest(res, `Materi status adalah '${materi.status}', tidak perlu di-retry`);
    }

    if (activeWorkers >= MAX_CONCURRENT_WORKERS) {
      return response.tooManyRequests(
        res,
        `Server sedang memproses ${activeWorkers} video. Silakan coba beberapa menit lagi.`,
      );
    }

    // Cari file temp yang tersisa berdasarkan nama output
    const baseName = path.parse(materi.name).name;
    const possibleTempFiles = await fs.promises.readdir(TEMP_DIR).catch(() => []);
    const tempFile = possibleTempFiles.find((f) => f.startsWith(baseName));

    if (!tempFile) {
      return response.badRequest(
        res,
        'File temp tidak ditemukan. Upload ulang video diperlukan.',
      );
    }

    const inputPath = path.join(TEMP_DIR, tempFile);
    await materiService.updateMateri(id, { status: 'processing' });
    spawnVideoWorker(id, inputPath, materi.name);

    return response.ok(res, 'Retry processing dimulai', {
      id,
      status: 'processing',
    });
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

/**
 * Info jumlah worker aktif saat ini (untuk monitoring/admin).
 */
const getWorkerStats = async (req, res) => {
  return response.ok(res, 'Worker stats', {
    active_workers: activeWorkers,
    max_concurrent_workers: MAX_CONCURRENT_WORKERS,
    available_slots: Math.max(0, MAX_CONCURRENT_WORKERS - activeWorkers),
  });
};

const getMateriStatus = async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid materi id');
    }

    const materi = await materiService.findById(id);
    if (!materi) {
      return response.notFound(res, 'Materi not found');
    }

    return response.ok(res, 'Materi status retrieved', {
      id: materi.id,
      status: materi.status,
      content: materi.content,
      duration: materi.duration,
      compress_progress: materi.compress_progress ?? 0,
    });
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const updateProgress = async (req, res) => {
  try {
    const authAccountId = req.auth && req.auth.account_id ? Number(req.auth.account_id) : null;
    const accountId = Number.parseInt(req.body.account_id, 10);

    if (authAccountId && Number.isNaN(accountId)) {
      return response.badRequest(res, 'account_id is required and must be a number');
    }

    if (authAccountId && accountId !== authAccountId) {
      return response.forbidden(res, 'account_id does not match authenticated user');
    }

    const resolvedAccountId = authAccountId || accountId;
    if (!resolvedAccountId) {
      return response.badRequest(res, 'account_id is required');
    }

    const materiId = Number.parseInt(req.body.materi_id, 10);
    if (Number.isNaN(materiId)) {
      return response.badRequest(res, 'materi_id is required and must be a number');
    }

    const currentTime = Number.parseFloat(req.body.current_time);
    const duration = Number.parseFloat(req.body.duration);

    if (Number.isNaN(currentTime) || Number.isNaN(duration) || duration <= 0) {
      return response.badRequest(res, 'current_time and duration must be valid numbers');
    }

    const progressPercent = Math.min(100, Math.max(0, Math.round((currentTime / duration) * 100)));
    const isCompleted = progressPercent >= 100;
    const lastPosition = Math.max(0, Math.floor(currentTime));

    const existing = await materiService.findProgress(resolvedAccountId, materiId);
    const completedAt = isCompleted
      ? (existing && existing.completed_at ? existing.completed_at : new Date())
      : null;

    if (existing) {
      await materiService.updateProgress(existing.id, {
        progress_percent: progressPercent,
        is_completed: isCompleted,
        last_position: lastPosition,
        completed_at: completedAt,
      });

      return response.ok(res, 'progress updated', {
        materi_id: materiId,
        account_id: resolvedAccountId,
        progress_percent: progressPercent,
        is_completed: isCompleted,
        last_position: lastPosition,
        completed_at: completedAt,
      });
    }

    const inserted = await materiService.insertProgress({
      account_id: resolvedAccountId,
      materi_id: materiId,
      progress_percent: progressPercent,
      is_completed: isCompleted,
      last_position: lastPosition,
      completed_at: completedAt,
    });

    return response.ok(res, 'progress created', {
      id: inserted.id,
      materi_id: materiId,
      account_id: resolvedAccountId,
      progress_percent: progressPercent,
      is_completed: isCompleted,
      last_position: lastPosition,
      completed_at: completedAt,
    });
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

module.exports = {
  getAllMateri,
  uploadVideo,
  getMateriStatus,
  updateProgress,
  retryVideoProcessing,
  getWorkerStats,
};
