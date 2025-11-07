//! Large-scale optimization
//!
//! f16対応、リングバッファ、メモリ帯域最適化、プロファイリング

use anyhow::Result;
use wgpu::*;
use std::time::{Duration, Instant};
use std::sync::Arc;

/// Performance profiler
pub struct Profiler {
    step_times: Vec<Duration>,
    max_samples: usize,
}

impl Profiler {
    pub fn new(max_samples: usize) -> Self {
        Self {
            step_times: Vec::with_capacity(max_samples),
            max_samples,
        }
    }

    /// Record step time
    pub fn record_step(&mut self, duration: Duration) {
        if self.step_times.len() >= self.max_samples {
            self.step_times.remove(0);
        }
        self.step_times.push(duration);
    }

    /// Get average step time in milliseconds
    pub fn avg_step_time_ms(&self) -> f32 {
        if self.step_times.is_empty() {
            return 0.0;
        }
        let total: Duration = self.step_times.iter().sum();
        total.as_secs_f32() * 1000.0 / self.step_times.len() as f32
    }

    /// Get min/max step times
    pub fn step_time_range_ms(&self) -> (f32, f32) {
        if self.step_times.is_empty() {
            return (0.0, 0.0);
        }
        let min = self.step_times.iter().min().unwrap().as_secs_f32() * 1000.0;
        let max = self.step_times.iter().max().unwrap().as_secs_f32() * 1000.0;
        (min, max)
    }
}

/// Ring buffer for streaming input
pub struct RingBuffer<T> {
    buffer: Vec<T>,
    write_index: usize,
    size: usize,
}

impl<T: Clone + Default> RingBuffer<T> {
    pub fn new(size: usize) -> Self {
        Self {
            buffer: vec![T::default(); size],
            write_index: 0,
            size,
        }
    }

    /// Push new value (overwrites oldest)
    pub fn push(&mut self, value: T) {
        self.buffer[self.write_index] = value;
        self.write_index = (self.write_index + 1) % self.size;
    }

    /// Get value at relative index (0 = most recent, size-1 = oldest)
    pub fn get(&self, index: usize) -> Option<&T> {
        if index >= self.size {
            return None;
        }
        let idx = (self.write_index + self.size - 1 - index) % self.size;
        Some(&self.buffer[idx])
    }

    /// Get all values (most recent first)
    pub fn get_all(&self) -> Vec<&T> {
        (0..self.size).map(|i| self.get(i).unwrap()).collect()
    }
}

/// GPU timing utilities
pub struct GpuTimer {
    // Note: Device and Queue are not Clone, so we store references
    // In practice, these should be obtained from GpuDevice
    _device: std::marker::PhantomData<*const Device>,
    _queue: std::marker::PhantomData<*const Queue>,
}

impl GpuTimer {
    pub fn new(_device: &Device, _queue: &Queue) -> Result<Self> {
        // Note: QuerySet support may vary by backend
        // For now, use CPU timing as fallback
        // Device and Queue are not Clone, so we use PhantomData
        Ok(Self {
            _device: std::marker::PhantomData,
            _queue: std::marker::PhantomData,
        })
    }

    /// Time a compute pass (CPU-based)
    /// Note: This method requires device and queue references, which should be passed separately
    pub fn time_compute_pass<F>(&self, device: &Device, queue: &Queue, f: F) -> Duration
    where
        F: FnOnce(&mut CommandEncoder),
    {
        let start = Instant::now();
        let mut encoder = device.create_command_encoder(&CommandEncoderDescriptor {
            label: Some("Timed Compute Pass"),
        });
        f(&mut encoder);
        queue.submit(std::iter::once(encoder.finish()));
        start.elapsed()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ring_buffer() {
        let mut rb = RingBuffer::new(3);
        rb.push(1);
        rb.push(2);
        rb.push(3);
        assert_eq!(rb.get(0), Some(&3));
        assert_eq!(rb.get(1), Some(&2));
        assert_eq!(rb.get(2), Some(&1));
    }

    #[test]
    fn test_profiler() {
        let mut profiler = Profiler::new(10);
        profiler.record_step(Duration::from_millis(1));
        profiler.record_step(Duration::from_millis(2));
        assert!(profiler.avg_step_time_ms() > 0.0);
    }
}

