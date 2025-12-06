import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/svelte';

// Cleanup after each test
afterEach(() => {
	cleanup();
});

// Mock Web APIs
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

// Mock MediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
	writable: true,
	value: {
		getUserMedia: vi.fn().mockResolvedValue({
			getTracks: () => [
				{ kind: 'video', stop: vi.fn() },
				{ kind: 'audio', stop: vi.fn() }
			]
		})
	}
});

// Mock WebGPU
Object.defineProperty(navigator, 'gpu', {
	writable: true,
	value: {
		requestAdapter: vi.fn().mockResolvedValue({
			requestDevice: vi.fn().mockResolvedValue({
				createBuffer: vi.fn(),
				createComputePipeline: vi.fn(),
				createBindGroup: vi.fn(),
				createCommandEncoder: vi.fn(),
				createShaderModule: vi.fn(),
				queue: {
					submit: vi.fn()
				}
			})
		})
	}
});

// Mock fetch
global.fetch = vi.fn();

// Mock AudioContext
global.AudioContext = vi.fn().mockImplementation(() => ({
	createMediaStreamSource: vi.fn().mockReturnValue({
		connect: vi.fn()
	}),
	createAnalyser: vi.fn().mockReturnValue({
		fftSize: 256,
		frequencyBinCount: 128,
		getByteFrequencyData: vi.fn()
	}),
	close: vi.fn(),
	state: 'running'
}));
