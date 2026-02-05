<script lang="ts">
  import type { Force3DFilters } from '@spirit/visualization';

  interface Props {
    filters: Force3DFilters;
    onFiltersChange: (filters: Force3DFilters) => void;
    availableWords: Array<{ word: string; score: number; selected: boolean }>;
  }

  let { filters, onFiltersChange, availableWords }: Props = $props();

  function toggleEmotion(emotion: keyof Pick<Force3DFilters, 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'calm' | 'focus' | 'excitement' | 'confusion'>) {
    onFiltersChange({
      ...filters,
      [emotion]: !filters[emotion]
    });
  }

  function toggleModality(modality: keyof Pick<Force3DFilters, 'prosody' | 'burst' | 'face' | 'language'>) {
    onFiltersChange({
      ...filters,
      [modality]: !filters[modality]
    });
  }

  function toggleWord(word: string) {
    const selected = filters.selectedWords.includes(word);
    onFiltersChange({
      ...filters,
      selectedWords: selected 
        ? filters.selectedWords.filter(w => w !== word)
        : [...filters.selectedWords, word]
    });
  }

  const emotionList: Array<{ key: keyof Pick<Force3DFilters, 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'calm' | 'focus' | 'excitement' | 'confusion'>; label: string }> = [
    { key: 'joy', label: '喜び' },
    { key: 'sadness', label: '悲しみ' },
    { key: 'anger', label: '怒り' },
    { key: 'fear', label: '恐れ' },
    { key: 'surprise', label: '驚き' },
    { key: 'disgust', label: '嫌悪' },
    { key: 'calm', label: '平穏' },
    { key: 'focus', label: '集中' },
    { key: 'excitement', label: '興奮' },
    { key: 'confusion', label: '混乱' },
  ];

  const modalityList: Array<{ key: keyof Pick<Force3DFilters, 'prosody' | 'burst' | 'face' | 'language'>; label: string }> = [
    { key: 'prosody', label: 'prosody' },
    { key: 'burst', label: 'burst' },
    { key: 'face', label: 'face' },
    { key: 'language', label: 'language' },
  ];
</script>

<div class="force3d-filters-panel space-y-6">
  <!-- 単語選択 -->
  <div class="filter-section">
    <div class="section-header mb-4">
      <h4 class="text-xs font-black uppercase tracking-widest text-gray-400">単語選択（上位{filters.topWords}）</h4>
    </div>
    <div class="words-list max-h-64 overflow-y-auto custom-scrollbar space-y-2">
      {#each availableWords.slice(0, filters.topWords) as { word, score, selected }}
        <label class="word-item flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
          <input 
            type="checkbox" 
            checked={filters.selectedWords.includes(word)}
            onchange={() => toggleWord(word)}
            class="checkbox"
          />
          <div class="flex-1 flex items-center justify-between">
            <span class="text-sm font-bold text-gray-900 dark:text-white">{word}</span>
            <span class="text-xs text-gray-400 font-mono">{score.toFixed(2)}</span>
          </div>
        </label>
      {/each}
    </div>
  </div>

  <!-- 感情フィルター -->
  <div class="filter-section">
    <div class="section-header mb-4">
      <h4 class="text-xs font-black uppercase tracking-widest text-gray-400">感情フィルター</h4>
    </div>
    <div class="grid grid-cols-2 gap-2">
      {#each emotionList as { key, label }}
        <label class="emotion-item flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
          <input 
            type="checkbox" 
            checked={filters[key]}
            onchange={() => toggleEmotion(key)}
            class="checkbox"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        </label>
      {/each}
    </div>
  </div>

  <!-- モダリティ（感情抽出元） -->
  <div class="filter-section">
    <div class="section-header mb-4">
      <h4 class="text-xs font-black uppercase tracking-widest text-gray-400">モダリティ（感情抽出元）</h4>
    </div>
    <div class="grid grid-cols-2 gap-2">
      {#each modalityList as { key, label }}
        <label class="modality-item flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
          <input 
            type="checkbox" 
            checked={filters[key]}
            onchange={() => toggleModality(key)}
            class="checkbox"
          />
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        </label>
      {/each}
    </div>
  </div>
</div>

<style>
  .checkbox {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 2px solid #d1d5db;
    cursor: pointer;
    transition: all 0.2s;
  }

  .checkbox:checked {
    background-color: #3b82f6;
    border-color: #3b82f6;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.2);
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.4);
  }
</style>

