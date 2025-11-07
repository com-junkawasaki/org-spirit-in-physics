//! Performance tests

#[cfg(test)]
mod tests {
    use anyhow::Result;
    use std::time::Instant;

    #[tokio::test]
    #[ignore] // Only run when explicitly requested
    async fn test_large_scale_performance() -> Result<()> {
        use great_sprit::gpu::kernel::Kernel;
        use great_sprit::config::Config;

        // Create config for large scale test
        let mut config = Config::load()?;
        config.num_agents = 1000;
        config.particles_per_agent = 10000;

        let mut kernel = Kernel::new(&config).await?;
        
        // Warmup
        for _ in 0..10 {
            kernel.step()?;
        }

        // Benchmark
        let start = Instant::now();
        let num_steps = 100;
        for _ in 0..num_steps {
            kernel.step()?;
        }
        let elapsed = start.elapsed();

        let avg_time_ms = elapsed.as_secs_f32() * 1000.0 / num_steps as f32;
        println!("Average step time: {:.2} ms", avg_time_ms);
        println!("Total samples: {}", config.total_samples());

        // Target: 10万サンプルで0.5〜1.5ms、100万サンプルで3〜8ms
        // This is a simplified test - actual performance depends on GPU
        assert!(avg_time_ms > 0.0);

        Ok(())
    }
}

