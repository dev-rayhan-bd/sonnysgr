import { Server } from 'http';
import app from './app';
import mongoose from 'mongoose';
import config from './app/config';
import seedAdmin from './app/DB';
import 'dotenv/config';
import { initializeSocket } from './app/utils/socket';
import dns from 'node:dns';
import runCronJobEverydatAtNight from './helper/cron';

// Fix DNS resolution issues for remote MongoDB clusters
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore in environments where setServers is restricted
}

let server: Server;

async function main() {
  try {
    if (!config.database_url) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    await mongoose.connect(config.database_url as string);
    console.log('✅ Connected to MongoDB successfully');

    // Run initial seeder (Super Admin)
    await seedAdmin();

    server = app.listen(config.port, () => {
      console.log(`🚀 Sneaker Hub server is listening on port ${config.port}`);
    });

    initializeSocket(server);

    // Initialize autonomous background cron schedulers (Phase 11)
    runCronJobEverydatAtNight();
  } catch (err) {
    console.error('❌ Database connection or server start failed:', err);
  }
}

main();

process.on('unhandledRejection', (err) => {
  console.log(`😈 unhandledRejection is detected , shutting down ...`, err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.log(`😈 uncaughtException is detected , shutting down ...`, err);
  process.exit(1);
});
