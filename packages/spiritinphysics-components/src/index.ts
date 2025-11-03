// Components
export { default as ConsentForm } from './components/consent/ConsentForm';
export { default as ResearchPlanContent } from './components/consent/ResearchPlanContent';
export { default as JungVoiceTest } from './components/jung-voice-assessment/JungVoiceTest';
export { default as AudioVisualizer } from './components/jung-voice-assessment/AudioVisualizer';

// UI Components
export { Button, buttonVariants } from './components/ui/button';
export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent } from './components/ui/card';
export { Checkbox } from './components/ui/checkbox';
export { Input } from './components/ui/input';
export { Label } from './components/ui/label';
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './components/ui/select';

// Hooks
export { createTrpcClient } from './hooks/use-trpc-client';

// Schemas
export {
  DemographicDataSchema,
  ParticipantSchema,
  CreateParticipantSchema,
  ConsentSchema,
  type DemographicData,
  type Participant,
  type Consent,
} from './schemas/participant';

// Store & Types
export {
  useKawasakiStore,
  type Word,
  type WordResponse,
  type TestResult,
  type JungVoiceTestProps,
  type MediaStatus,
  type KawasakiStoreState,
  type KawasakiStoreActions,
  type KawasakiStore,
} from './components/jung-voice-assessment/store';

// Constants
export { JUNG_STIMULUS_WORDS, JUNG_TEST_WELCOME_MESSAGE } from './components/jung-voice-assessment/constants';

// Types
export type { TrpcClientConfig } from './types/trpc';

// Utils
export { cn } from './utils/cn';
export { setAudioBasePath, getAudioBasePath, getAudioPath } from './utils/audio-paths';

