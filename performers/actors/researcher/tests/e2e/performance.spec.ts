import { test, expect } from '@playwright/test';

/**
 * Merkle DAG: e2e.performance
 * E2E performance measurement tests for participant detail page
 * RDF: https://spirit-in-physics.gftd.ai/e2e/performance
 */

test.describe('Performance Measurement E2E', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
  const participantId = process.env.TEST_PARTICIPANT_ID || '144b325f-5966-4d59-a629-f2ca421388cc';

  test('should measure participant detail page load performance', async ({ page }) => {
    // Enable performance monitoring
    await page.goto(`${baseURL}/participants/${participantId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {
      // If networkidle times out, continue anyway
    });
    
    // Wait for performance API to be available
    await page.waitForFunction(() => {
      return typeof performance !== 'undefined' && 
             performance.getEntriesByType !== undefined &&
             performance.getEntriesByType('navigation').length > 0;
    }, { timeout: 10000 }).catch(() => {
      // If performance API is not available, continue anyway
    });

    // Get performance metrics from browser
    const performanceMetrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resourceTimings = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      // Find API requests
      const apiRequests = resourceTimings.filter(r => 
        r.name.includes('/api/participants/') || 
        r.name.includes('/graphql')
      );

      return {
        // Navigation timing
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        totalLoadTime: perfData.loadEventEnd - perfData.fetchStart,
        
        // API request timings
        apiRequests: apiRequests.map(r => ({
          url: r.name,
          duration: r.duration,
          transferSize: r.transferSize,
          encodedBodySize: r.encodedBodySize,
        })),
        
        // Memory usage (if available)
        memory: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        } : null,
      };
    });

    // Log performance metrics
    console.log('[E2E Performance] Navigation Metrics:', {
      domContentLoaded: `${performanceMetrics.domContentLoaded.toFixed(2)}ms`,
      loadComplete: `${performanceMetrics.loadComplete.toFixed(2)}ms`,
      totalLoadTime: `${performanceMetrics.totalLoadTime.toFixed(2)}ms`,
    });

    console.log('[E2E Performance] API Requests:', performanceMetrics.apiRequests.map(r => ({
      url: r.url.split('?')[0], // Remove query params for cleaner logs
      duration: `${r.duration.toFixed(2)}ms`,
      size: `${(r.transferSize / 1024).toFixed(2)}KB`,
    })));

    if (performanceMetrics.memory) {
      console.log('[E2E Performance] Memory Usage:', {
        usedJSHeap: `${(performanceMetrics.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        totalJSHeap: `${(performanceMetrics.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        heapLimit: `${(performanceMetrics.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
      });
    }

    // Extract performance data from Debug Area
    const debugArea = page.locator('.bg-gray-900'); // Debug Area selector
    const performanceSection = debugArea.locator('text=Performance Metrics');
    
    if (await performanceSection.isVisible().catch(() => false)) {
      const performanceText = await debugArea.textContent();
      
      // Extract performance metrics from Debug Area
      const apiRequestMatch = performanceText?.match(/API Request:\s*(\d+)ms/);
      const conversionMatch = performanceText?.match(/Data Conversion:\s*(\d+)ms/);
      const totalMatch = performanceText?.match(/Total Time:\s*(\d+)ms/);
      const responseSizeMatch = performanceText?.match(/Response Size:\s*(\d+)KB/);

      const debugMetrics = {
        apiRequestMs: apiRequestMatch ? parseInt(apiRequestMatch[1]) : null,
        dataConversionMs: conversionMatch ? parseInt(conversionMatch[1]) : null,
        totalMs: totalMatch ? parseInt(totalMatch[1]) : null,
        responseSizeKb: responseSizeMatch ? parseInt(responseSizeMatch[1]) : null,
      };

      console.log('[E2E Performance] Debug Area Metrics:', debugMetrics);

      // Assertions for performance thresholds
      if (debugMetrics.totalMs !== null) {
        expect(debugMetrics.totalMs).toBeLessThan(5000); // Should load within 5 seconds
      }
      
      if (debugMetrics.apiRequestMs !== null) {
        expect(debugMetrics.apiRequestMs).toBeLessThan(3000); // API should respond within 3 seconds
      }
    }

    // Verify page loaded successfully
    await expect(page.locator('h1, h2')).toContainText(/Participant|被験者/);
  });

  test('should measure timeline data fetch performance', async ({ page }) => {
    // Intercept API requests to measure timing
    const apiTimings: Array<{ url: string; startTime: number; endTime: number; duration: number }> = [];
    
    page.on('request', (request) => {
      if (request.url().includes('/api/participants/') && request.url().includes('/timeline')) {
        apiTimings.push({
          url: request.url(),
          startTime: Date.now(),
          endTime: 0,
          duration: 0,
        });
      }
    });

    page.on('response', (response) => {
      const request = response.request();
      if (request.url().includes('/api/participants/') && request.url().includes('/timeline')) {
        const timing = apiTimings.find(t => t.url === request.url());
        if (timing) {
          timing.endTime = Date.now();
          timing.duration = timing.endTime - timing.startTime;
        }
      }
    });

    await page.goto(`${baseURL}/participants/${participantId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {
      // If networkidle times out, continue anyway
    });

    // Wait for timeline to load
    await page.waitForSelector('.bg-gray-900', { timeout: 10000 }).catch(() => {});

    // Log API timing
    if (apiTimings.length > 0) {
      console.log('[E2E Performance] Timeline API Request:', {
        url: apiTimings[0].url.split('?')[0],
        duration: `${apiTimings[0].duration}ms`,
      });

      // Assert API response time
      expect(apiTimings[0].duration).toBeLessThan(5000); // Should respond within 5 seconds
    }

    // Verify timeline data is displayed
    const debugArea = page.locator('.bg-gray-900');
    const dataPointsText = await debugArea.textContent().catch(() => '');
    const dataPointsMatch = dataPointsText?.match(/Data Points[^\d]*(\d+)/);
    
    if (dataPointsMatch) {
      const dataPoints = parseInt(dataPointsMatch[1]);
      console.log('[E2E Performance] Timeline Data Points:', dataPoints);
      expect(dataPoints).toBeGreaterThan(0);
    }
  });

  test('should measure force graph data fetch performance', async ({ page }) => {
    // Intercept GraphQL requests for force graph data
    const graphqlTimings: Array<{ query: string; startTime: number; endTime: number; duration: number }> = [];
    
    page.on('request', (request) => {
      if (request.url().includes('/graphql')) {
        const postData = request.postData();
        if (postData && postData.includes('participantForceGraphData')) {
          graphqlTimings.push({
            query: 'participantForceGraphData',
            startTime: Date.now(),
            endTime: 0,
            duration: 0,
          });
        }
      }
    });

    page.on('response', (response) => {
      const request = response.request();
      if (request.url().includes('/graphql')) {
        const postData = request.postData();
        if (postData && postData.includes('participantForceGraphData')) {
          const timing = graphqlTimings.find(t => t.query === 'participantForceGraphData');
          if (timing) {
            timing.endTime = Date.now();
            timing.duration = timing.endTime - timing.startTime;
          }
        }
      }
    });

    await page.goto(`${baseURL}/participants/${participantId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {
      // If networkidle times out, continue anyway
    });

    // Wait a bit for force graph to load
    await page.waitForTimeout(2000);

    // Log GraphQL timing
    if (graphqlTimings.length > 0) {
      console.log('[E2E Performance] Force Graph GraphQL Request:', {
        query: graphqlTimings[0].query,
        duration: `${graphqlTimings[0].duration}ms`,
      });

      // Assert GraphQL response time
      expect(graphqlTimings[0].duration).toBeLessThan(3000); // Should respond within 3 seconds
    }
  });

  test('should measure full page render performance', async ({ page }) => {
    // Measure time to interactive
    const startTime = Date.now();
    
    await page.goto(`${baseURL}/participants/${participantId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {
      // If networkidle times out, continue anyway
    });
    
    // Wait for all content to be visible
    await page.waitForSelector('h1, h2', { timeout: 10000 });
    
    // Wait for timeline visualization to be ready
    await page.waitForSelector('.bg-gray-900', { timeout: 10000 }).catch(() => {});
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log('[E2E Performance] Full Page Render Time:', `${totalTime}ms`);

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        firstPaint: (performance.getEntriesByType('paint').find(e => e.name === 'first-paint') as PerformancePaintTiming)?.startTime || 0,
        firstContentfulPaint: (performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint') as PerformancePaintTiming)?.startTime || 0,
      };
    });

    console.log('[E2E Performance] Browser Performance Metrics:', {
      domContentLoaded: `${metrics.domContentLoaded.toFixed(2)}ms`,
      loadComplete: `${metrics.loadComplete.toFixed(2)}ms`,
      firstPaint: `${metrics.firstPaint.toFixed(2)}ms`,
      firstContentfulPaint: `${metrics.firstContentfulPaint.toFixed(2)}ms`,
      totalTime: `${totalTime}ms`,
    });

    // Assertions
    expect(totalTime).toBeLessThan(10000); // Should load within 10 seconds
    if (metrics.firstContentfulPaint > 0) {
      expect(metrics.firstContentfulPaint).toBeLessThan(3000); // FCP should be under 3 seconds
    }
  });

  test('should measure performance with console logs', async ({ page }) => {
    // Collect console logs for performance metrics
    const performanceLogs: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[Performance]') || text.includes('[GraphQL]') || text.includes('[Timeline')) {
        performanceLogs.push(text);
      }
    });

    await page.goto(`${baseURL}/participants/${participantId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {
      // If networkidle times out, continue anyway
    });
    
    // Wait for all logs to be collected
    await page.waitForTimeout(3000);

    // Filter and log performance-related console messages
    const perfMessages = performanceLogs.filter(log => 
      log.includes('[Performance]') || 
      log.includes('participant_timeline') || 
      log.includes('participant_force_graph_data')
    );

    console.log('[E2E Performance] Console Performance Logs:');
    perfMessages.forEach(log => console.log('  ', log));

    // Verify we captured performance logs
    expect(perfMessages.length).toBeGreaterThan(0);
  });
});

