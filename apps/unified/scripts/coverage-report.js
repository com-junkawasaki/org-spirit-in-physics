#!/usr/bin/env node
/**
 * Coverage Report Generator
 * Analyzes E2E test coverage for all pages
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pagesDir = join(__dirname, '../src/pages');
const e2eDir = join(__dirname, '../e2e');

// Map test files to pages
const testToPageMap = {
  'homepage': ['index.astro'],
  'demo-page': ['demo/index.astro'],
  'demo-test': ['demo/test.astro'],
  'paper-page': ['paper/index.astro'],
  'paper-nature-strategy': ['paper/nature-strategy.astro'],
  'paper-spirit-in-physics': ['paper/spirit-in-physics.astro'],
  'participant-flow': ['participant/index.astro', 'participant/steps/1.astro', 'participant/steps/2.astro', 'participant/steps/complete.astro'],
  'participant-admin': ['participant/admin/index.astro'],
  'participant-signin': ['participant/sign-in/[...sign_in].astro'],
  'participant-signup': ['participant/sign-up/[...sign_up].astro'],
  'researcher-page': ['researcher/index.astro'],
  'researcher-participants': ['researcher/participants/index.astro'],
  'navigation-flow': ['*'], // Covers multiple pages
  'accessibility': ['*'], // Covers all pages
  'responsive': ['*'], // Covers all pages
};

async function getAllPages() {
  const pages = [];
  
  async function scanDir(dir, basePath = '') {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        await scanDir(fullPath, relativePath);
      } else if (entry.name.endsWith('.astro') || entry.name.endsWith('.ts')) {
        pages.push(relativePath);
      }
    }
  }
  
  await scanDir(pagesDir);
  return pages;
}

async function getTestFiles() {
  const files = await readdir(e2eDir);
  return files.filter(f => f.endsWith('.spec.ts')).map(f => f.replace('.spec.ts', ''));
}

function findCoveredPages(pagePath, testFiles) {
  const covered = [];
  
  for (const [testName, coveredPages] of Object.entries(testToPageMap)) {
    if (testFiles.includes(testName)) {
      if (coveredPages.includes('*') || coveredPages.some(p => pagePath.includes(p))) {
        covered.push(testName);
      }
    }
  }
  
  return covered;
}

async function generateCoverageReport() {
  console.log('📊 E2E Test Coverage Report\n');
  console.log('=' .repeat(80));
  
  const allPages = await getAllPages();
  const testFiles = await getTestFiles();
  
  // Filter out API routes and focus on page routes
  const pageRoutes = allPages.filter(p => 
    !p.includes('/api/') && 
    (p.endsWith('.astro') || p.includes('index'))
  );
  
  console.log(`\n📄 Total Pages: ${pageRoutes.length}`);
  console.log(`🧪 Total Test Files: ${testFiles.length}\n`);
  
  const coverage = [];
  let coveredCount = 0;
  
  for (const page of pageRoutes) {
    const coveredBy = findCoveredPages(page, testFiles);
    const isCovered = coveredBy.length > 0;
    
    if (isCovered) {
      coveredCount++;
    }
    
    coverage.push({
      page,
      covered: isCovered,
      tests: coveredBy,
    });
  }
  
  const coveragePercentage = ((coveredCount / pageRoutes.length) * 100).toFixed(1);
  
  console.log('📋 Page Coverage:\n');
  console.log('─'.repeat(80));
  
  for (const item of coverage) {
    const status = item.covered ? '✅' : '❌';
    const tests = item.tests.length > 0 ? ` (${item.tests.join(', ')})` : '';
    console.log(`${status} ${item.page}${tests}`);
  }
  
  console.log('\n' + '─'.repeat(80));
  console.log(`\n📈 Coverage Summary:`);
  console.log(`   Covered: ${coveredCount}/${pageRoutes.length} pages (${coveragePercentage}%)`);
  console.log(`   Uncovered: ${pageRoutes.length - coveredCount} pages`);
  
  // Test file breakdown
  console.log(`\n🧪 Test Files Breakdown:\n`);
  for (const testFile of testFiles.sort()) {
    const coveredPages = testToPageMap[testFile] || [];
    const pageCount = coveredPages.includes('*') ? 'all pages' : coveredPages.length;
    console.log(`   ✓ ${testFile}.spec.ts - covers ${pageCount} page(s)`);
  }
  
  console.log('\n' + '='.repeat(80));
  
  return {
    totalPages: pageRoutes.length,
    coveredPages: coveredCount,
    coveragePercentage: parseFloat(coveragePercentage),
    coverage,
  };
}

generateCoverageReport().catch(console.error);

