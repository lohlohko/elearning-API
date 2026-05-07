require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const materiService = require('../services/materi.service');

const FFMPEG_PATH  = process.env.FFMPEG_PATH  || 'ffmpeg';
const FFPROBE_PATH = process.env.FFPROBE_PATH || 'ffprobe';
const TEMP_DIR     = process.env.MATERI_TEMP_DIR || '/var/www/data/elearning/temp';
const MATERI_DIR   = process.env.MATERI_DIR      || '/var/www/data/elearning/materi';

const LOG_FILE = path.join(MATERI_DIR, 'worker-debug.log');
const log = (...args) => {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch (_) { /* ignore */ }
};

const ensureDir = async (dirPath) => {
  await fs.promises.mkdir(dirPath, { recursive: true });
};

const runProcess = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  child.on('error', reject);
  child.on('close', (code) => {
    if (code === 0) { resolve({ stdout, stderr }); return; }
    reject(new Error(stderr || `Process failed with code ${code}`));
  });
});

const getVideoDuration = async (filePath) => {
  const { stdout } = await runProcess(FFPROBE_PATH, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=nk=1:nw=1',
    filePath,
  ]);
  const duration = Number.parseFloat(stdout.trim());
  if (Number.isNaN(duration)) throw new Error('Failed to read duration');
  return Math.round(duration);
};

/**
 * Kompresi video + tracking progress ke DB via stderr parsing.
 *
 * KUNCI: lastProgressPromise menyimpan Promise DB terakhir.
 * Main akan await Promise ini sebelum process.exit() agar DB update
 * tidak terpotong di tengah jalan saat proses keluar.
 */
const compressVideo = (materiId, inputPath, outputPath, totalDuration) => {
  let lastProgressPromise = Promise.resolve(); 
  let lastUpdateTime = 0;
  let stderrBuf = '';
  let progressCount = 0;

  const promise = new Promise((resolve, reject) => {
    log(`[FFmpeg] spawn: ${outputPath} duration=${totalDuration}s`);

    const child = spawn(FFMPEG_PATH, [
      '-y',
      '-i', inputPath,
      '-c:v', 'libx264',
      '-crf', '30',
      '-preset', 'fast',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:a', 'aac',
      '-b:a', '96k',
      '-movflags', '+faststart',
      outputPath,
    ], {
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true,
    });

    child.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString();

      const matches = stderrBuf.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/g);
      if (!matches) return;

      const parts = matches[matches.length - 1].match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (!parts) return;

      const currentSeconds =
        parseInt(parts[1], 10) * 3600 +
        parseInt(parts[2], 10) * 60  +
        parseInt(parts[3], 10)       +
        parseInt(parts[4], 10) / 100;

      const percent = Math.min(99, Math.round((currentSeconds / totalDuration) * 100));

      const now = Date.now();
      if (now - lastUpdateTime >= 2000) {
        lastUpdateTime = now;
        progressCount += 1;
        log(`[FFmpeg] progress=${percent}% time=${currentSeconds}s (update #${progressCount})`);

        // SIMPAN promise → main() akan await ini sebelum exit
        lastProgressPromise = materiService.updateCompressProgress(materiId, percent)
          .then(() => log(`[DB] updateCompressProgress OK percent=${percent}`))
          .catch((err) => log(`[DB] updateCompressProgress FAILED: ${err.message}`));
      }

      stderrBuf = '';
    });

    child.on('error', (err) => {
      log(`[FFmpeg] spawn error: ${err.message}`);
      reject(err);
    });

    child.on('close', (code) => {
      log(`[FFmpeg] exit code=${code} totalUpdates=${progressCount}`);
      if (code === 0) { resolve(); return; }
      reject(new Error(`FFmpeg failed with code ${code}`));
    });
  });

  // Return keduanya: promise utama + getter lastProgressPromise
  return { promise, getLastProgressPromise: () => lastProgressPromise };
};

const main = async () => {
  const [materiIdArg, inputPathArg, outputFileName] = process.argv.slice(2);
  const materiId = Number.parseInt(materiIdArg, 10);

  log(`========== WORKER START materiId=${materiId} ==========`);
  log(`FFMPEG=${FFMPEG_PATH} DB=${process.env.DB_HOST}/${process.env.DB_NAME}`);

  if (Number.isNaN(materiId) || !inputPathArg || !outputFileName) {
    log('ERROR: invalid args');
    process.exit(1);
  }

  const inputPath  = path.resolve(inputPathArg);
  const outputPath = path.join(MATERI_DIR, outputFileName);

  try {
    await ensureDir(TEMP_DIR);
    await ensureDir(MATERI_DIR);

    // Pre-warm koneksi DB sebelum FFmpeg jalan.
    // Tanpa ini, Promise DB pertama di dalam callback stderr bisa
    // terpotong process.exit() karena TCP handshake ke MySQL butuh waktu.
    log(`[step 0] pre-warm DB connection`);
    await materiService.updateCompressProgress(materiId, 0);
    log(`[step 0] DB pre-warm OK`);

    log(`[step 1] getVideoDuration`);
    const duration = await getVideoDuration(inputPath);
    log(`[step 1] duration=${duration}s`);

    log(`[step 2] compressVideo start`);
    const { promise: compressPromise, getLastProgressPromise } = compressVideo(
      materiId, inputPath, outputPath, duration
    );
    await compressPromise;

    // Tunggu DB update progress terakhir selesai sebelum lanjut
    // Ini yang sebelumnya hilang → process.exit() memotong Promise pending
    log(`[step 2] awaiting last progress DB update...`);
    await getLastProgressPromise();
    log(`[step 2] compressVideo done`);

    log(`[step 3] updateMateri status=ready`);
    await materiService.updateMateri(materiId, {
      status: 'ready',
      content: `/materi/${outputFileName}`,
      duration,
    });

    await materiService.updateCompressProgress(materiId, 100)
      .then(() => log(`[step 3] compress_progress=100 OK`))
      .catch((err) => log(`[step 3] compress_progress=100 FAILED: ${err.message}`));

    await fs.promises.unlink(inputPath).catch(() => null);
    log(`========== WORKER SUCCESS ==========`);
    process.exit(0);
  } catch (error) {
    log(`[ERROR] ${error.message}`);
    await materiService.updateMateri(materiId, {
      status: 'failed',
      content: null,
      duration: null,
    }).catch((e) => log(`[ERROR] updateMateri failed: ${e.message}`));
    await fs.promises.unlink(inputPath).catch(() => null);
    await fs.promises.unlink(outputPath).catch(() => null);
    log(`========== WORKER FAILED ==========`);
    process.exit(1);
  }
};

main();
