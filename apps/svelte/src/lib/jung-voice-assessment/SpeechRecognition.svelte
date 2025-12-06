<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { kawasakiStore } from './store';

	const {
		onResult = undefined,
		language = 'ja-JP',
		continuous = true,
		interimResults = true
	}: {
		onResult?: ((transcript: string, isFinal: boolean) => void) | undefined;
		language?: string;
		continuous?: boolean;
		interimResults?: boolean;
	} = $props();

	let recognition: any = null;
	let isListening = false;
	
	// Expose methods for parent component
	// In Svelte 5 runes mode, we use regular functions
	// These will be accessible via bind:this in the parent component
	function start() {
		if (recognition && !isListening) {
			try {
				recognition.start();
				isListening = true;
			} catch (error) {
				console.error('Failed to start speech recognition:', error);
			}
		}
	}

	function stop() {
		if (recognition && isListening) {
			recognition.stop();
			isListening = false;
		}
	}

	// In Svelte 5 runes mode, expose methods via a regular variable
	// Parent components can access these via bind:this
	// Note: In Svelte 5, we can't use export function, so we expose via a variable
	let api = $state({
		start,
		stop
	});
	
	// Update api when functions change (though they shouldn't in this case)
	$effect(() => {
		api = { start, stop };
	});

	onMount(() => {
		const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
		
		if (!SpeechRecognition) {
			console.warn('Speech Recognition API is not supported');
			return;
		}

		recognition = new SpeechRecognition();
		recognition.lang = language;
		recognition.continuous = continuous;
		recognition.interimResults = interimResults;

		recognition.onresult = (event: any) => {
			let transcript = '';
			let isFinal = false;

			for (let i = event.resultIndex; i < event.results.length; i++) {
				const result = event.results[i];
				transcript += result[0].transcript;
				if (result.isFinal) {
					isFinal = true;
				}
			}

			if (onResult) {
				onResult(transcript, isFinal);
			}
		};

		recognition.onerror = (event: any) => {
			console.error('Speech recognition error:', event.error);
			kawasakiStore.setError(`音声認識エラー: ${event.error}`);
		};

		recognition.onend = () => {
			isListening = false;
		};

		return () => {
			if (recognition) {
				recognition.stop();
			}
		};
	});

	onDestroy(() => {
		if (recognition) {
			recognition.stop();
		}
	});
</script>
