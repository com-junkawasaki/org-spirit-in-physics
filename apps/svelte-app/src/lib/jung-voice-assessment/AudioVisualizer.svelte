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
    let audioContext: AudioContext | null = null;
    let isClosed = false;

    const startVisualization = async () => {
      try {
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        if (!AudioContextClass) return;

        audioContext = new AudioContextClass();
        
        if (isClosed) {
          audioContext.close();
          return;
        }
        
        // Wait for audio context to be ready
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        if (isClosed) {
          audioContext.close();
          return;
        }

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        
        analyser.fftSize = 256;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const canvasCtx = canvas?.getContext('2d');

        const draw = () => {
          if (isClosed || !canvasCtx || !canvas) return;
          
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
      isClosed = true;
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
