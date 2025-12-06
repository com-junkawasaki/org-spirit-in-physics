<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	export let stream: MediaStream | null = null;

	let canvas: HTMLCanvasElement;
	let animationFrameId: number | null = null;
	let audioContext: AudioContext | null = null;

	onMount(() => {
		if (!stream || !canvas) return;

		if (stream.getAudioTracks().length === 0) {
			console.warn('AudioVisualizer: The provided stream has no audio tracks.');
			return;
		}

		audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
		const source = audioContext.createMediaStreamSource(stream);
		const analyser = audioContext.createAnalyser();

		analyser.fftSize = 256;
		source.connect(analyser);

		const bufferLength = analyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const draw = () => {
			animationFrameId = requestAnimationFrame(draw);
			analyser.getByteFrequencyData(dataArray);

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
			const normalizedAverage = average / 128.0;
			const barWidth = canvas.width * normalizedAverage;

			ctx.fillStyle = '#22c55e';
			ctx.fillRect(0, 0, barWidth, canvas.height);
		};

		draw();

		return () => {
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
			}
			if (audioContext && audioContext.state !== 'closed') {
				audioContext.close();
			}
		};
	});

	onDestroy(() => {
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
		}
		if (audioContext && audioContext.state !== 'closed') {
			audioContext.close();
		}
	});
</script>

<canvas bind:this={canvas} width="200" height="10" style="border-radius: 5px;" />
