<script lang="ts">
	import { onMount } from 'svelte';
	import { kawasakiStore } from './store';
	import { get } from 'svelte/store';
	import AudioVisualizer from './AudioVisualizer.svelte';
	import SpeechRecognition from './SpeechRecognition.svelte';
	import { JUNG_TEST_WELCOME_MESSAGE } from './constants';
	import { useStimulusWords } from './hooks/useStimulusWords';
	import { useSaveSession } from './hooks/useSaveSession';
	import type { JungVoiceTestProps } from './types';

	const {
		numberOfWords = 10,
		onTestComplete = undefined,
		onComplete = undefined,
		graphQLCallbacks = undefined
	}: {
		numberOfWords?: number;
		onTestComplete?: ((results: any) => void) | undefined;
		onComplete?: (() => void) | undefined;
		graphQLCallbacks?: JungVoiceTestProps['graphQLCallbacks'];
	} = $props();

	let videoPreview: HTMLVideoElement;
	let speechRecognition: { start: () => void; stop: () => void } | null = null;
	let localStream: MediaStream | null = null;
	let reactionStartTime: number | null = null;
	let currentTranscript: string = '';
	
	// Use Svelte store subscription with runes
	// Initialize with default state, then subscribe to store updates
	const defaultState = {
		testStatus: 'idle' as const,
		deviceStatus: 'idle' as const,
		stream: null,
		error: null,
		stimulusWords: [],
		currentSession: 1 as const,
		currentWordIndex: -1,
		wordResponses: [],
		mediaStatus: 'idle' as const,
		events: [],
		sessionVideoUrl: null,
		participantId: null
	};
	
	let store = $state(defaultState);
	
	$effect(() => {
		// Try to get initial value safely
		try {
			const initialValue = get(kawasakiStore);
			if (initialValue) {
				store = initialValue;
			}
		} catch (e) {
			console.warn('Failed to get initial store value:', e);
		}
		
		// Subscribe to store updates
		const unsubscribe = kawasakiStore.subscribe((value) => {
			if (value) {
			store = value;
			}
		});
		return unsubscribe;
	});
	
	let testStatus = $derived(store?.testStatus ?? 'idle');
	let currentWordIndex = $derived(store?.currentWordIndex ?? -1);
	let stimulusWords = $derived(store?.stimulusWords ?? []);
	let currentWord = $derived(stimulusWords[currentWordIndex] || null);
	let currentSession = $derived(store?.currentSession ?? 1);
	let deviceStatus = $derived(store?.deviceStatus ?? 'idle');
	let error = $derived(store?.error ?? null);

	onMount(async () => {
		kawasakiStore.initializeParticipant();
		await loadStimulusWords();
	});

	async function loadStimulusWords() {
		const { words } = await useStimulusWords();
		if (words.length > 0) {
			kawasakiStore.setStimulusWords(words);
		}
	}

	async function startPreflight() {
		kawasakiStore.startPreflight();
		kawasakiStore.setDeviceStatus('pending');

		try {
			const mediaStream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true
			});
			localStream = mediaStream;
			if (videoPreview) {
				videoPreview.srcObject = mediaStream;
				await videoPreview.play();
			}
			kawasakiStore.setStream(mediaStream);
			kawasakiStore.setDeviceStatus('success');
		} catch (err) {
			console.error('Error accessing media devices:', err);
			const errorMsg = 'デバイスへのアクセスに失敗しました';
			kawasakiStore.setError(errorMsg);
			kawasakiStore.setDeviceStatus('error');
		}
	}

	function startSession() {
		kawasakiStore.startSession(numberOfWords);
		// Start showing the first word
		if (stimulusWords.length > 0) {
			showNextWord();
		}
	}

	function showNextWord() {
		if (currentWordIndex >= 0 && currentWordIndex < stimulusWords.length) {
			reactionStartTime = Date.now();
			currentTranscript = '';
			// Start speech recognition
			if (speechRecognition?.start) {
				speechRecognition.start();
			}
		}
	}

	async function handleSpeechResult(transcript: string, isFinal: boolean) {
		currentTranscript = transcript;
		
		if (isFinal && reactionStartTime) {
			const reactionTimeMs = Date.now() - reactionStartTime;
			recordResponse(transcript.trim(), reactionTimeMs);
			
			// Stop speech recognition
			if (speechRecognition?.stop) {
				speechRecognition.stop();
			}
			
			// Move to next word or complete session
			if (currentWordIndex + 1 < stimulusWords.length) {
				kawasakiStore.advanceToNextWord();
				setTimeout(() => {
					showNextWord();
				}, 1000); // 1 second pause between words
			} else {
				kawasakiStore.completeSession();
				
				// Save session data
				try {
					await useSaveSession({
						onSaveSession: graphQLCallbacks?.onSaveSession
					});
				} catch (err) {
					console.error('Failed to save session:', err);
				}
				
				if (onTestComplete) {
					const results = {
						participantId: store.participantId,
						session: currentSession,
						responses: store.wordResponses
					};
					onTestComplete(results);
				}
			}
		}
	}

	function recordResponse(responseWord: string, reactionTimeMs: number) {
		kawasakiStore.recordWordResponse({
			responseWord,
			reactionTimeMs
		});
	}
</script>

<div class="jung-voice-test">
	{#if testStatus === 'idle' || testStatus === 'preflight'}
		<div class="preflight-screen p-4">
			<h2 class="text-2xl font-bold mb-4">デバイスチェック</h2>
			<div class="bg-white dark:bg-gray-800 p-4 rounded mb-4">
				<h3 class="text-lg font-semibold mb-2">ようこそ</h3>
				<p class="whitespace-pre-wrap mb-4">{JUNG_TEST_WELCOME_MESSAGE}</p>
				<audio src="/audio/jung-voice-assessment/welcome_message.mp3" autoplay />
			</div>

			<div class="relative w-full max-w-md mx-auto aspect-video bg-gray-900 rounded-md overflow-hidden mb-4 flex items-center justify-center">
				<video bind:this={videoPreview} autoplay playsinline muted class="w-full h-full object-cover"></video>
				{#if deviceStatus !== 'success'}
					<div class="absolute inset-0 flex items-center justify-center text-white">
						<p>カメラプレビュー</p>
					</div>
				{/if}
			</div>

			{#if deviceStatus === 'success'}
				<button
					onclick={startSession}
					class="w-full bg-primary text-primary-foreground rounded-md px-4 py-2 font-semibold"
				>
					テストを開始
				</button>
			{:else}
				<button
					onclick={startPreflight}
					class="w-full bg-primary text-primary-foreground rounded-md px-4 py-2 font-semibold"
					disabled={deviceStatus === 'pending'}
				>
					{deviceStatus === 'pending' ? 'デバイスを確認中...' : 'デバイスを確認'}
				</button>
			{/if}

			{#if error}
				<div class="mt-4 p-4 bg-red-100 dark:bg-red-900 rounded text-red-800 dark:text-red-200">
					{error}
				</div>
			{/if}
		</div>
	{:else if testStatus === 'session-1-running' || testStatus === 'session-2-running'}
		<div class="test-session p-4">
			<SpeechRecognition
				bind:api={speechRecognition}
				onResult={handleSpeechResult}
				language="ja-JP"
				continuous={true}
				interimResults={true}
			/>
			<div class="mb-4">
				<AudioVisualizer stream={localStream || store.stream} />
			</div>
			{#if currentWord}
				<div class="text-center">
					<h2 class="text-4xl font-bold mb-8">{currentWord.word}</h2>
					<p class="text-gray-600 dark:text-gray-400 mb-4">
						セッション {currentSession} / 単語 {currentWordIndex + 1} / {stimulusWords.length}
					</p>
					{#if currentTranscript}
						<div class="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded">
							<p class="text-lg">{currentTranscript}</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{:else if testStatus === 'completed'}
		<div class="completion-screen p-4 text-center">
			<h2 class="text-2xl font-bold mb-4">テスト完了</h2>
			<p class="mb-4">ありがとうございました。テストが完了しました。</p>
			{#if onComplete}
				<button onclick={onComplete} class="bg-primary text-primary-foreground rounded-md px-4 py-2">
					次へ
				</button>
			{/if}
		</div>
	{/if}
</div>
