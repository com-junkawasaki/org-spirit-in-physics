#!/usr/bin/env node

/**
 * パッケージのpublicフォルダをアプリのpublicフォルダにコピーするスクリプト
 * ビルド時に実行される
 */

const fs = require('fs');
const path = require('path');

const packagePublicDir = path.join(__dirname, '../public');
// 引数でターゲットディレクトリを指定、デフォルトはperformers/systems/ParticipantApplication/src/public
const targetPublicDir = process.argv[2] || path.join(__dirname, '../../../../../performers/systems/ParticipantApplication/src/public');

if (!fs.existsSync(packagePublicDir)) {
  console.log('Package public directory does not exist, skipping copy.');
  process.exit(0);
}

if (!fs.existsSync(targetPublicDir)) {
  fs.mkdirSync(targetPublicDir, { recursive: true });
}

function copyRecursive(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursive(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  copyRecursive(packagePublicDir, targetPublicDir);
  console.log(`✓ Copied public files from ${packagePublicDir} to ${targetPublicDir}`);
} catch (error) {
  console.error('Error copying public files:', error);
  process.exit(1);
}

