<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { kawasakiStore } from './store';

	export let onResult: ((transcript: string, isFinal: boolean) => void) | undefined = undefined;
	export let language: string = 'ja-JP';
	export let continuous: boolean = true;
	export let interimResults: boolean = true;

	let recognition: any = null;
	let isListening = false;
	
	// Expose methods for parent component
	export function start() {
		if (recognition && !isListening) {
			try {
				recognition.start();
				isListening = true;
			} catch (error) {
				console.error('Failed to start speech recognition:', error);
			}
		}
	}

	export function stop() {
		if (recognition && isListening) {
			recognition.stop();
			isListening = false;
		}
	}

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
