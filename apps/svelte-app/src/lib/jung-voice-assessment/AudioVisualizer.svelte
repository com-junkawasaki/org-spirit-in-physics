<script lang="ts">
  let { stream } = $props<{ stream: MediaStream | null }>();
  let canvas: HTMLCanvasElement | undefined = $state();

  $effect(() => {
    if (!stream || !canvas) return;

    if (stream.getAudioTracks().length === 0) {
      console.warn("AudioVisualizer: No audio tracks in stream");
      return;
    }

    let animationFrameId: number;
    let audioContext: AudioContext;

    const startVisualization = async () => {
      try {
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        if (!AudioContextClass) return;

        audioContext = new AudioContextClass();
        
        // Wait for audio context to be ready
        if (audioContext.state === 'suspended') {
          // In some browsers, we might need a user gesture, 
          // but for visualizer we can just wait or try to resume.
          // However, for device check, the stream is already acquired.
          await audioContext.resume();
        }

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        
        analyser.fftSize = 256;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const canvasCtx = canvas?.getContext('2d');

        const draw = () => {
          if (!canvasCtx || !canvas) return;
          
          animationFrameId = requestAnimationFrame(draw);
          analyser.getByteFrequencyData(dataArray);

          canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
          
          const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
          const normalizedAverage = average / 128.0; 
          
          const barWidth = canvas.width * Math.min(normalizedAverage, 1.0);

          canvasCtx.fillStyle = '#22c55e'; // Green 500
          canvasCtx.fillRect(0, 0, barWidth, canvas.height);
        };

        draw();
      } catch (e) {
        console.error("AudioVisualizer: Failed to start visualization", e);
      }
    };

    startVisualization();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(console.error);
      }
    };
  });
</script>

<canvas bind:this={canvas} width="200" height="10" class="visualizer"></canvas>

<style>
  .visualizer {
    border-radius: 5px;
    background: #f3f4f6;
    display: block;
  }
</style>
