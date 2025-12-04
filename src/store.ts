import { create } from 'zustand';
import type {
    MachineState,
    Column,
    PhaseStatusMap,
} from './types.ts';
import {
    FEEDBACK_DELAY,
    TUTORIAL_CHALLENGE,
    UNIT_CHALLENGES,
    TEN_TO_TWENTY_CHALLENGES,
    TENS_CHALLENGES,
    HUNDRED_TO_TWO_HUNDRED_CHALLENGES,
    TWO_HUNDRED_TO_THREE_HUNDRED_CHALLENGES,
    HUNDREDS_CHALLENGES,
    THOUSAND_TO_TWO_THOUSAND_CHALLENGES,
    TWO_THOUSAND_TO_THREE_THOUSAND_CHALLENGES,
    THOUSANDS_SIMPLE_COMBINATION_CHALLENGES,
    THOUSANDS_CHALLENGES,
    ALL_PHASES,
    DIDACTICIEL_STEP2_CHALLENGES,
    DIDACTICIEL_REQUIRED_CLICKS,
    getRandomDidacticielNumber,
} from './types.ts';
import {
    generateFeedback,
    getSuccessMessage,
    detectFrustration,
    getFrustrationInterventionMessage,
    decomposeNumber,
    getNextGuidedStep,
    getGuidedCompletionMessage,
    getSolutionAnimationStep,
    getGuidedClickFeedback
} from './feedbackSystem.ts';
import {
    PHASE_INSTRUCTIONS,
    CHALLENGE_INSTRUCTIONS,
    SEQUENCE_FEEDBACK,
    ERROR_MESSAGES,
    HELP_CHOICE_MESSAGES,
    GUIDED_MESSAGES,
} from './instructions.ts';
import { sendChallengeListToUnity, setValue, sendCorrectValue, sendWrongValue, sendNextGoal, LockUnitRoll, LockTenRoll, LockThousandRoll, LockHundredRoll } from './unityBridge.ts';
import { textToSpeechService } from './voice/services/speech/text-to-speech.ts';

export const initialColumns: Column[] = [
    { name: 'Unités', value: 0, unlocked: true, color: 'bg-green-500' },
    { name: 'Dizaines', value: 0, unlocked: true, color: 'bg-blue-500' },
    { name: 'Centaines', value: 0, unlocked: true, color: 'bg-yellow-500' },
    { name: 'Milliers', value: 0, unlocked: true, color: 'bg-red-500' },
];

// Initialize phase status map with all phases as 'not-started'
function createInitialPhaseStatusMap(): PhaseStatusMap {
    const map: Partial<PhaseStatusMap> = {};
    ALL_PHASES.forEach(phase => {
        map[phase] = 'not-started';
    });
    return map as PhaseStatusMap;
}

// Helper function to send challenge targets to Unity based on phase
function sendChallengeToUnity(phase: string, currentDidacticielTarget?: number) {
    let targets: number[] = [];

    // Determine targets based on phase
    if (phase === 'tutorial-challenge') {
        targets = TUTORIAL_CHALLENGE.targets;
    } else if (phase === 'didacticiel-step2-columns') {
        // Send all 3 targets for step 2
        targets = DIDACTICIEL_STEP2_CHALLENGES.targets;
    } else if (phase === 'didacticiel-step3-free-practice') {
        // For step 3, use the passed target parameter
        if (currentDidacticielTarget && currentDidacticielTarget > 0) {
            targets = [currentDidacticielTarget];
        }
    } else if (phase.startsWith('challenge-unit-')) {
        const index = parseInt(phase.split('-')[2]) - 1;
        if (index >= 0 && index < UNIT_CHALLENGES.length) {
            targets = UNIT_CHALLENGES[index].targets;
        }
    } else if (phase === 'challenge-ten-to-twenty') {
        targets = TEN_TO_TWENTY_CHALLENGES[0].targets;
    } else if (phase.startsWith('challenge-tens-')) {
        const index = parseInt(phase.split('-')[2]) - 1;
        if (index >= 0 && index < TENS_CHALLENGES.length) {
            targets = TENS_CHALLENGES[index].targets;
        }
    } else if (phase === 'challenge-hundred-to-two-hundred') {
        targets = HUNDRED_TO_TWO_HUNDRED_CHALLENGES[0].targets;
    } else if (phase === 'challenge-two-hundred-to-three-hundred') {
        targets = TWO_HUNDRED_TO_THREE_HUNDRED_CHALLENGES[0].targets;
    } else if (phase.startsWith('challenge-hundreds-')) {
        const index = parseInt(phase.split('-')[2]) - 1;
        if (index >= 0 && index < HUNDREDS_CHALLENGES.length) {
            targets = HUNDREDS_CHALLENGES[index].targets;
        }
    } else if (phase === 'challenge-thousand-to-two-thousand') {
        targets = THOUSAND_TO_TWO_THOUSAND_CHALLENGES[0].targets;
    } else if (phase === 'challenge-two-thousand-to-three-thousand') {
        targets = TWO_THOUSAND_TO_THREE_THOUSAND_CHALLENGES[0].targets;
    } else if (phase === 'challenge-thousands-simple-combination') {
        targets = THOUSANDS_SIMPLE_COMBINATION_CHALLENGES[0].targets;
    } else if (phase.startsWith('challenge-thousands-')) {
        const index = parseInt(phase.split('-')[2]) - 1;
        if (index >= 0 && index < THOUSANDS_CHALLENGES.length) {
            targets = THOUSANDS_CHALLENGES[index].targets;
        }
    }

    // Send to Unity if targets found
    if (targets.length > 0) {
        sendChallengeListToUnity(targets);
    }
}

// Helper function to send remaining targets to Unity based on phase and current index
// Currently unused but may be needed in the future
/* 
function sendRemainingTargetsToUnity(phase: string, currentIndex: number) {
    let targets: number[] = [];
    
    // Determine targets based on phase
    if (phase.startsWith('challenge-unit-')) {
        const index = parseInt(phase.split('-')[2]) - 1;
        if (index >= 0 && index < UNIT_CHALLENGES.length) {
            targets = UNIT_CHALLENGES[index].targets.slice(currentIndex);
        }
    } else if (phase === 'challenge-ten-to-twenty') {
        targets = TEN_TO_TWENTY_CHALLENGES[0].targets.slice(currentIndex);
    } else if (phase.startsWith('challenge-tens-')) {
        const index = parseInt(phase.split('-')[2]) - 1;
        if (index >= 0 && index < TENS_CHALLENGES.length) {
            targets = TENS_CHALLENGES[index].targets.slice(currentIndex);
        }
    } else if (phase === 'challenge-hundred-to-two-hundred') {
        targets = HUNDRED_TO_TWO_HUNDRED_CHALLENGES[0].targets.slice(currentIndex);
    } else if (phase === 'challenge-two-hundred-to-three-hundred') {
        targets = TWO_HUNDRED_TO_THREE_HUNDRED_CHALLENGES[0].targets.slice(currentIndex);
    } else if (phase.startsWith('challenge-hundreds-')) {
        const index = parseInt(phase.split('-')[2]) - 1;
        if (index >= 0 && index < HUNDREDS_CHALLENGES.length) {
            targets = HUNDREDS_CHALLENGES[index].targets.slice(currentIndex);
        }
    } else if (phase === 'challenge-thousand-to-two-thousand') {
        targets = THOUSAND_TO_TWO_THOUSAND_CHALLENGES[0].targets.slice(currentIndex);
    } else if (phase === 'challenge-two-thousand-to-three-thousand') {
        targets = TWO_THOUSAND_TO_THREE_THOUSAND_CHALLENGES[0].targets.slice(currentIndex);
    } else if (phase === 'challenge-thousands-simple-combination') {
        targets = THOUSANDS_SIMPLE_COMBINATION_CHALLENGES[0].targets.slice(currentIndex);
    } else if (phase.startsWith('challenge-thousands-')) {
        const index = parseInt(phase.split('-')[2]) - 1;
        if (index >= 0 && index < THOUSANDS_CHALLENGES.length) {
            targets = THOUSANDS_CHALLENGES[index].targets.slice(currentIndex);
        }
    }
    
    // Send to Unity if targets found
    if (targets.length > 0) {
        sendChallengeListToUnity(targets);
    }
}
*/
export const useStore = create<MachineState>((set, get) => ({

    columns: initialColumns,
    phase: 'loading',
    addClicks: 0,
    feedback: "",
    instruction: "",
    pendingAutoCount: false,
    isTransitioningToChallenge: false,
    isCountingAutomatically: false,
    nextPhaseAfterAuto: null,
    timer: null,
    completedChallenges: {
        tens: false,
        hundreds: false,
        thousands: false,
    },
    feedbackSequence: [],
    feedbackSequenceStep: 0,
    feedbackSequenceCallback: null,
    tutorialChallengeTargetIndex: 0,
    tutorialChallengeSuccessCount: 0,
    unitTargetIndex: 0,
    unitSuccessCount: 0,
    tenToTwentyTargetIndex: 0,
    tenToTwentySuccessCount: 0,
    practiceTenRepetitions: 0,
    tensTargetIndex: 0,
    tensSuccessCount: 0,
    practiceHundredCount: 0,
    hundredToTwoHundredTargetIndex: 0,
    hundredToTwoHundredSuccessCount: 0,
    twoHundredToThreeHundredTargetIndex: 0,
    twoHundredToThreeHundredSuccessCount: 0,
    hundredsTargetIndex: 0,
    hundredsSuccessCount: 0,
    thousandsTargetIndex: 0,
    thousandsSuccessCount: 0,
    practiceThousandCount: 0,
    thousandToTwoThousandTargetIndex: 0,
    thousandToTwoThousandSuccessCount: 0,
    twoThousandToThreeThousandTargetIndex: 0,
    twoThousandToThreeThousandSuccessCount: 0,
    thousandsSimpleCombinationTargetIndex: 0,
    thousandsSimpleCombinationSuccessCount: 0,
    userInput: "",
    showInputField: false,

    // Error management and feedback system
    attemptCount: 0,
    consecutiveFailures: 0,
    frustrationLevel: 'low',
    showHelpOptions: false,
    guidedMode: false,
    guidedStep: 0,
    totalChallengesCompleted: 0,
    helpChoice: null,
    showSolutionAnimation: false,
    solutionAnimationStep: 0,
    currentTarget: 0,
    lastFeedbackMessage: '',

    // Personalization and intro state
    userName: "",
    introClickCount: 0,
    introDigitsAttempt: 0,
    introMaxAttempt: 0,
    showResponseButtons: false,
    selectedResponse: null,

    // Simplified tutorial (didacticiel) state
    didacticielStep1UpClicks: 0,
    didacticielStep1DownClicks: 0,
    didacticielStep2TargetIndex: 0,
    didacticielStep2SuccessCount: 0,
    didacticielStep3Target: 0,
    didacticielStep3SuccessCount: 0,
    showDidacticielQuitButton: false,
    isInSimplifiedTutorial: false,

    // Callbacks pour effets visuels/sonores (à connecter côté UI)
    onIntroWelcomeTransition: null,

    // Button visibility
    showUnlockButton: false,
    showStartLearningButton: false,
    showValidateLearningButton: false,
    showValidateTensButton: false,
    showValidateHundredsButton: false,
    showValidateThousandsButton: false,

    // Unity loading state
    unityLoaded: false,
    unityLoadingProgression: 0,

    // Phase status tracking
    phaseStatusMap: createInitialPhaseStatusMap(),
    autoTransitionEnabled: true,

    // Actions
    setColumns: (updater) => {
        const newColumns = typeof updater === 'function' ? updater(get().columns) : updater;
        set({ columns: newColumns });
        get().updateButtonVisibility();
    },
    setPhase: (phase) => {
        const currentPhase = get().phase;
        console.log(`[setPhase] Transitioning from "${currentPhase}" to "${phase}"`);

        // Mark previous phase as completed if transitioning to a new phase
        if (currentPhase !== phase && currentPhase !== 'loading') {
            get().markPhaseComplete(currentPhase);
        }

        // Mark new phase as in-progress
        const { phaseStatusMap } = get();
        if (phaseStatusMap[phase] === 'not-started') {
            set({
                phaseStatusMap: {
                    ...phaseStatusMap,
                    [phase]: 'in-progress'
                }
            });
        }

        // Nettoyage du timer existant
        const { timer } = get();
        if (timer) {
            clearTimeout(timer);
            set({ timer: null });
        }

        // Afficher le champ de saisie uniquement pour la phase 'intro-count-digits'
        set({ showInputField: phase === 'intro-count-digits' });
        set({ phase });

        // Send challenge list to Unity when entering a challenge phase or didacticiel phases
        if (phase.startsWith('challenge-') || phase === 'didacticiel-step2-columns' || phase === 'didacticiel-step3-free-practice') {
            // For step 3, pass the current target from state
            const { didacticielStep3Target } = get();
            sendChallengeToUnity(phase, phase === 'didacticiel-step3-free-practice' ? didacticielStep3Target : undefined);
        }

        // Handle loading phase - wait for TTS and Unity to be ready
        if (phase === 'loading') {
            set({ feedback: "", instruction: "" });
            console.log('[setPhase] loading: checking TTS and Unity readiness');

            let checkCount = 0;
            const MAX_CHECKS = 100; // Max 20 seconds (100 * 200ms)

            // Function to check if both TTS and Unity are loaded
            const checkReadiness = () => {
                const voices = textToSpeechService.getVoices();
                const { unityLoaded, unityLoadingProgression } = get();
                checkCount++;
                console.log('[setPhase] Check #' + checkCount + 
                    ', Voices:', voices.length + 
                    ', Unity loaded:', unityLoaded + 
                    ', Unity progression:', Math.round(unityLoadingProgression * 100) + '%');

                // Check if both TTS voices and Unity are ready
                const ttsReady = voices.length > 0;
                const unityReady = unityLoaded && unityLoadingProgression >= 1.0;

                if (ttsReady && unityReady) {
                    // Both are ready, transition to didacticiel-step1-buttons
                    console.log('[setPhase] TTS and Unity ready, transitioning to didacticiel-step1-buttons');
                    get().startSimplifiedTutorial();
                } else if (checkCount >= MAX_CHECKS) {
                    // Timeout after max checks - proceed anyway
                    console.log('[setPhase] Loading timeout, proceeding to didacticiel anyway (TTS ready:', ttsReady + ', Unity ready:', unityReady + ')');
                    get().startSimplifiedTutorial();
                } else {
                    // Not ready yet, check again
                    const waitingFor = [];
                    if (!ttsReady) waitingFor.push('TTS');
                    if (!unityReady) waitingFor.push('Unity');
                    console.log('[setPhase] Waiting for:', waitingFor.join(' and ') + ', checking again in 200ms');
                    const newTimer = setTimeout(checkReadiness, 200);
                    set({ timer: newTimer as unknown as number });
                }
            };

            // Start checking after a small delay
            const newTimer = setTimeout(checkReadiness, 100);
            set({ timer: newTimer as unknown as number });
            return;
        }


        // Handle auto-transitions for intro phases
        if (phase === 'intro-welcome-personalized') {
            set({ showInputField: true, feedback: "", instruction: "" });
        } else if (phase === 'intro-discover-machine') {
            set({ showResponseButtons: true, selectedResponse: null });
            // Suppression du timeout automatique : les boutons restent affichés tant que l'utilisateur n'a pas choisi
        }

        get().updateButtonVisibility();
        get().updateInstruction();
    },
    setAddClicks: (clicks) => set({ addClicks: clicks }),
    setFeedback: (feedback) => set({ feedback }),
    setInstruction: (instruction) => set({ instruction }),
    setPendingAutoCount: (pending) => set({ pendingAutoCount: pending }),
    setIsTransitioningToChallenge: (isTransitioning) => set({ isTransitioningToChallenge: isTransitioning }),
    setIsCountingAutomatically: (isCounting) => set({ isCountingAutomatically: isCounting }),
    setNextPhaseAfterAuto: (phase) => set({ nextPhaseAfterAuto: phase }),
    setCompletedChallenges: (updater) => set((state) => ({ completedChallenges: typeof updater === 'function' ? updater(state.completedChallenges) : updater })),
    setUnitTargetIndex: (index) => {
        set({ unitTargetIndex: index });

        get().updateInstruction();
    },
    setUnitSuccessCount: (count) => {
        set({ unitSuccessCount: count });
        get().updateInstruction();
    },
    setTensTargetIndex: (index) => {
        set({ tensTargetIndex: index });
        get().updateInstruction();
    },
    setTensSuccessCount: (count) => {
        set({ tensSuccessCount: count });
        get().updateInstruction();
    },
    setHundredsTargetIndex: (index) => {
        set({ hundredsTargetIndex: index });
        get().updateInstruction();
    },
    setHundredsSuccessCount: (count) => {
        set({ hundredsSuccessCount: count });
        get().updateInstruction();
    },
    setThousandsTargetIndex: (index) => {
        set({ thousandsTargetIndex: index });
        get().updateInstruction();
    },
    setThousandsSuccessCount: (count) => {
        set({ thousandsSuccessCount: count });
        get().updateInstruction();
    },
    setTenToTwentyTargetIndex: (index) => {
        set({ tenToTwentyTargetIndex: index });
        get().updateInstruction();
    },
    setTenToTwentySuccessCount: (count) => {
        set({ tenToTwentySuccessCount: count });
        get().updateInstruction();
    },
    setPracticeTenRepetitions: (count) => {
        set({ practiceTenRepetitions: count });
    },
    setPracticeHundredCount: (count) => {
        set({ practiceHundredCount: count });
    },
    setHundredToTwoHundredTargetIndex: (index) => {
        set({ hundredToTwoHundredTargetIndex: index });
        get().updateInstruction();
    },
    setHundredToTwoHundredSuccessCount: (count) => {
        set({ hundredToTwoHundredSuccessCount: count });
        get().updateInstruction();
    },
    setTwoHundredToThreeHundredTargetIndex: (index) => {
        set({ twoHundredToThreeHundredTargetIndex: index });
        get().updateInstruction();
    },
    setTwoHundredToThreeHundredSuccessCount: (count) => {
        set({ twoHundredToThreeHundredSuccessCount: count });
        get().updateInstruction();
    },
    setPracticeThousandCount: (count) => {
        set({ practiceThousandCount: count });
    },
    setThousandToTwoThousandTargetIndex: (index) => {
        set({ thousandToTwoThousandTargetIndex: index });
        get().updateInstruction();
    },
    setThousandToTwoThousandSuccessCount: (count) => {
        set({ thousandToTwoThousandSuccessCount: count });
        get().updateInstruction();
    },
    setTwoThousandToThreeThousandTargetIndex: (index) => {
        set({ twoThousandToThreeThousandTargetIndex: index });
        get().updateInstruction();
    },
    setTwoThousandToThreeThousandSuccessCount: (count) => {
        set({ twoThousandToThreeThousandSuccessCount: count });
        get().updateInstruction();
    },
    setThousandsSimpleCombinationTargetIndex: (index) => {
        set({ thousandsSimpleCombinationTargetIndex: index });
        get().updateInstruction();
    },
    setThousandsSimpleCombinationSuccessCount: (count) => {
        set({ thousandsSimpleCombinationSuccessCount: count });
        get().updateInstruction();
    },
    resetTutorialChallenge: () => {
        set({ tutorialChallengeTargetIndex: 0, tutorialChallengeSuccessCount: 0 });
        get().resetAttempts();
        const { phase } = get();
        setValue(0);
        if (phase === 'tutorial-challenge') {
            sendChallengeToUnity(phase);
        }
        get().updateInstruction();
    },
    resetUnitChallenge: () => {
        set({ unitTargetIndex: 0, unitSuccessCount: 0 });
        get().resetAttempts();
        const { phase } = get();
        setValue(0);
        if (phase.startsWith('challenge-unit-')) {
            sendChallengeToUnity(phase);
        }
        get().updateInstruction();
    },
    resetTenToTwentyChallenge: () => {
        set({ tenToTwentyTargetIndex: 0, tenToTwentySuccessCount: 0 });
        get().resetAttempts();
        const { phase } = get();
        if (phase === 'challenge-ten-to-twenty') {
            sendChallengeToUnity(phase);
        }
        get().updateInstruction();
    },
    resetHundredToTwoHundredChallenge: () => {
        set({ hundredToTwoHundredTargetIndex: 0, hundredToTwoHundredSuccessCount: 0 });
        get().resetAttempts();
        const { phase } = get();
        if (phase === 'challenge-hundred-to-two-hundred') {
            sendChallengeToUnity(phase);
        }
        get().updateInstruction();
    },
    resetTwoHundredToThreeHundredChallenge: () => {
        set({ twoHundredToThreeHundredTargetIndex: 0, twoHundredToThreeHundredSuccessCount: 0 });
        get().resetAttempts();
        const { phase } = get();
        if (phase === 'challenge-two-hundred-to-three-hundred') {
            sendChallengeToUnity(phase);
        }
        get().updateInstruction();
    },
    resetTensChallenge: () => {
        set({ tensTargetIndex: 0, tensSuccessCount: 0 });
        get().resetAttempts();
        const { phase } = get();
        if (phase.startsWith('challenge-tens-')) {
            sendChallengeToUnity(phase);
        }
        get().updateInstruction();
    },
    resetHundredsChallenge: () => {
        set({ hundredsTargetIndex: 0, hundredsSuccessCount: 0 });
        get().resetAttempts();
        const { phase } = get();
        if (phase.startsWith('challenge-hundreds-')) {
            sendChallengeToUnity(phase);
        }
        get().updateInstruction();
    },
    resetThousandsChallenge: () => {
        set({ thousandsTargetIndex: 0, thousandsSuccessCount: 0 });
        get().resetAttempts();
        const { phase } = get();
        if (phase.startsWith('challenge-thousands-')) {
            sendChallengeToUnity(phase);
        }
        get().updateInstruction();
    },
    resetThousandToTwoThousandChallenge: () => {
        set({ thousandToTwoThousandTargetIndex: 0, thousandToTwoThousandSuccessCount: 0 });
        get().resetAttempts();
        const { phase } = get();
        if (phase === 'challenge-thousand-to-two-thousand') {
            sendChallengeToUnity(phase);
        }
        get().updateInstruction();
    },
    resetTwoThousandToThreeThousandChallenge: () => {
        set({ twoThousandToThreeThousandTargetIndex: 0, twoThousandToThreeThousandSuccessCount: 0 });
        get().resetAttempts();
        const { phase } = get();
        if (phase === 'challenge-two-thousand-to-three-thousand') {
            sendChallengeToUnity(phase);
        }
        get().updateInstruction();
    },
    resetThousandsSimpleCombinationChallenge: () => {
        set({ thousandsSimpleCombinationTargetIndex: 0, thousandsSimpleCombinationSuccessCount: 0 });
        get().resetAttempts();
        const { phase } = get();
        if (phase === 'challenge-thousands-simple-combination') {
            sendChallengeToUnity(phase);
        }
        get().updateInstruction();
    },
    setUserInput: (input) => set({ userInput: input }),
    setShowInputField: (show) => set({ showInputField: show }),
    setTimer: (timer) => set({ timer }),
    setUnityLoaded: (loaded) => set({ unityLoaded: loaded }),
    setUnityLoadingProgression: (progression) => set({ unityLoadingProgression: progression }),

    // New error management actions
    setAttemptCount: (count) => set({ attemptCount: count }),
    setConsecutiveFailures: (count) => {
        set({ consecutiveFailures: count });
        // Auto-update frustration level
        const frustrationLevel = count >= 3 ? 'high' : count >= 2 ? 'medium' : 'low';
        set({ frustrationLevel });
    },
    setFrustrationLevel: (level) => set({ frustrationLevel: level }),
    setShowHelpOptions: (show) => set({ showHelpOptions: show }),
    setGuidedMode: (guided) => set({ guidedMode: guided }),
    setGuidedStep: (step) => set({ guidedStep: step }),
    setTotalChallengesCompleted: (count) => set({ totalChallengesCompleted: count }),
    setHelpChoice: (choice) => set({ helpChoice: choice }),
    setShowSolutionAnimation: (show) => set({ showSolutionAnimation: show }),
    setSolutionAnimationStep: (step) => set({ solutionAnimationStep: step }),
    setCurrentTarget: (target) => set({ currentTarget: target }),
    setLastFeedbackMessage: (message) => set({ lastFeedbackMessage: message }),
    resetAttempts: () => set({
        attemptCount: 0,
        showHelpOptions: false,
        guidedMode: false,
        guidedStep: 0,
        helpChoice: null,
        showSolutionAnimation: false,
        solutionAnimationStep: 0
    }),

    // New intro state setters
    setUserName: (name) => set({ userName: name }),
    setIntroClickCount: (count) => set({ introClickCount: count }),
    setIntroDigitsAttempt: (attempt) => set({ introDigitsAttempt: attempt }),
    setIntroMaxAttempt: (attempt) => set({ introMaxAttempt: attempt }),
    setShowResponseButtons: (show) => set({ showResponseButtons: show }),
    setSelectedResponse: (response) => set({ selectedResponse: response }),

    setTutorialChallengeTargetIndex: (index) => {
        set({ tutorialChallengeTargetIndex: index });
        get().updateInstruction();
    },
    setTutorialChallengeSuccessCount: (count) => {
        set({ tutorialChallengeSuccessCount: count });
        get().updateInstruction();
    },

    // New intro phase handlers
    handleIntroNameSubmit: () => {
        const { userInput, sequenceFeedback } = get();
        const name = userInput.trim() || "l'enfant";
        set({ userName: name, showInputField: false, userInput: "" });

        sequenceFeedback(
            `Enchanté ${name} ! Moi c'est Professeur Numérix ! `,
            "(Bruits de marteau sur du métal et de perceuse) Paf, Crac… Bim… Tchac ! Quel vacarme !",
            () => {
                // After both messages are spoken, show the next message
                set({ feedback: "Voilà, j'ai terminé ma nouvelle machine !" });

                textToSpeechService.setCallbacks({
                    onEnd: () => {
                        set({ phase: 'intro-discover-machine' });
                        get().updateInstruction();
                    }
                });

                textToSpeechService.speak("Voilà, j'ai terminé ma nouvelle machine !");
            }
        );
    },

    handleIntroMachineResponse: () => {
        const { selectedResponse, sequenceFeedback } = get();

        set({ showResponseButtons: false });

        const continueToNextPhase = () => {
            set({ feedback: "Prêt(e) à découvrir ses secrets ?" });
            get().speakAndThen("Prêt(e) à découvrir ses secrets ?", () => {
                const newCols = [...get().columns];
                newCols[0].unlocked = true;
                set({ columns: newCols, phase: 'intro-first-interaction' });
                get().updateInstruction();
            })
        };

        if (selectedResponse === 'belle') {
            sequenceFeedback("Merci ! J'ai passé beaucoup de temps dessus !", "Tu vas voir, elle est aussi MAGIQUE que belle !", continueToNextPhase);
        } else if (selectedResponse === 'bof') {
            sequenceFeedback("Haha ! Je comprends, elle n'a pas l'air très impressionnante comme ça !", "Mais attends de voir ce qu'elle peut faire !", continueToNextPhase);
        } else if (selectedResponse === 'comprends-rien') {
            sequenceFeedback("C'est NORMAL ! Même moi j'avais du mal au début !", "C'est justement pour ça qu'on va l'explorer ENSEMBLE !", continueToNextPhase);
        } else if (selectedResponse === 'cest-quoi') {
            sequenceFeedback("Excellente question ! C'est une MACHINE À COMPTER !", "Elle va nous apprendre comment fonctionnent les nombres !", continueToNextPhase);
        }
    },

    handleIntroFirstClick: () => {
        const { introClickCount, columns, sequenceFeedback } = get();
        const newCols = [...columns];

        if (introClickCount === 0) {
            newCols[0].value = 1;
            set({ columns: newCols, introClickCount: 1 });
            sequenceFeedback("SUPER ! Tu as vu ? Une lumière s'est allumée !", "Et le chiffre est passé de 0 à 1 ! Continue ! Clique encore sur VERT !");
        } else if (introClickCount < 9) {
            newCols[0].value = introClickCount + 1;
            set({ columns: newCols, introClickCount: introClickCount + 1 });

            const messages = [
                "", // 0
                "", // 1 - already handled above
                "2 ! Continue !",
                "3 ! Tu vois comme c'est facile ?",
                "4 ! Les lumières s'allument une par une !",
                "5 ! La moitié !",
                "6 ! Continue jusqu'au bout !",
                "7 !",
                "8 ! Presque plein !",
                "9 !"
            ];

            if (messages[introClickCount + 1]) {
                get().speakAndThen(messages[introClickCount + 1]);
            }

            if (introClickCount + 1 === 9) {
                // Use voice callback instead of setTimeout
                get().speakAndThen(messages[introClickCount + 1], () => {
                    sequenceFeedback(
                        "Et voilà, on a REMPLI la machine ! ",
                        "Tu as vu comme les lumières s'allument en même temps que les chiffres changent ?",
                        () => {
                            get().speakAndThen("Maintenant essaie le bouton ROUGE avec la flèche vers le BAS bouton ROUGE !");
                        }
                    );
                });
            }
        }
    },

    handleIntroDigitsSubmit: () => {
        const { userInput, introDigitsAttempt, sequenceFeedback } = get();
        const answer = parseInt(userInput.trim());
        const newAttempt = introDigitsAttempt + 1;

        set({ introDigitsAttempt: newAttempt, userInput: "" });

        if (answer === 10) {
            // Correct answer!
            sequenceFeedback(
                "BRAVO !  C'est EXACT ! Il y a 10 chiffres différents !",
                "Tu n'as pas oublié le ZÉRO ! 👏",
                () => {
                    get().speakAndThen(
                        "0, 1, 2, 3, 4, 5, 6, 7, 8, 9 = 10 chiffres ! Le zéro est un peu spécial, mais il est TRÈS important !",
                        () => {
                            get().speakAndThen(
                                "Donc en tout, nous avons bien 10 chiffres différents !",
                                () => {
                                    set({ showInputField: false, introDigitsAttempt: 0, phase: 'challenge-unit-intro' });
                                    get().updateInstruction();
                                }
                            );
                        }
                    );
                }
            );
        } else if (answer === 9) {
            if (newAttempt === 1) {
                sequenceFeedback(
                    "Hmm... pas tout à fait !  Je comprends pourquoi tu penses ça !",
                    "Tu as compté : 1, 2, 3, 4, 5, 6, 7, 8, 9... ça fait 9 !",
                    () => {
                        get().speakAndThen("Mais... tu n'oublies pas quelque chose ? 😉 Réfléchis bien et réessaie !");
                    }
                );
            } else if (newAttempt === 2) {
                sequenceFeedback(
                    "Presque ! Mais regarde le PREMIER chiffre ! ",
                    "Celui tout au début, avant le 1... C'est le... ? "
                );
            } else {
                // Attempt 3: guided counting
                set({ showInputField: false });
                sequenceFeedback(
                    "Ce n'est pas grave ! On va compter ENSEMBLE ! ",
                    "Regarde l'écran et compte avec moi à voix haute !",
                    () => {
                        get().runIntroDigitsGuided();
                    }
                );
            }
        } else {
            if (newAttempt === 1) {
                sequenceFeedback(
                    "Hmm... ce n'est pas ça ! ",
                    "Tu veux que je te donne un indice ?"
                );
                set({ showHelpOptions: true });
            } else if (newAttempt === 2) {
                set({ showInputField: false });
                sequenceFeedback(
                    "D'accord, regarde bien !",
                    "Voici TOUS les chiffres que la machine peut afficher :",
                    () => {
                        get().showIntroDigitsVisual();
                    }
                );
            } else {
                // Attempt 3: guided counting
                set({ showInputField: false });
                sequenceFeedback(
                    "Ce n'est pas grave ! On va compter ENSEMBLE ! ",
                    "Regarde l'écran et compte avec moi à voix haute !",
                    () => {
                        get().runIntroDigitsGuided();
                    }
                );
            }
        }
    },

    showIntroDigitsVisual: () => {
        const { setFeedback, setShowInputField } = get();
        const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        let index = 0;

        const showNextDigit = () => {
            if (index < digits.length) {
                setFeedback(`${digits.slice(0, index + 1).join(', ')}...`);
                index++;
                setTimeout(showNextDigit, 600);
            } else {
                setTimeout(() => {
                    setFeedback("Maintenant, combien en vois-tu ? Compte-les bien ! 👆");
                    setShowInputField(true);
                }, 1000);
            }
        };

        showNextDigit();
    },

    runIntroDigitsGuided: () => {
        const { columns } = get();
        const steps = [
            { value: 0, text: "ZÉRO ! C'est le premier ! Lève 1 doigt !" },
            { value: 1, text: "UN ! Maintenant 2 doigts !" },
            { value: 2, text: "DEUX ! 3 doigts !" },
            { value: 3, text: "TROIS ! 4 doigts !" },
            { value: 4, text: "QUATRE ! 5 doigts !" },
            { value: 5, text: "CINQ ! 6 doigts !" },
            { value: 6, text: "SIX ! 7 doigts !" },
            { value: 7, text: "SEPT ! 8 doigts !" },
            { value: 8, text: "HUIT ! 9 doigts !" },
            { value: 9, text: "NEUF ! 10 doigts !" }
        ];

        let index = 0;
        const newCols = [...columns];

        const showNextStep = () => {
            if (index < steps.length) {
                newCols[0].value = steps[index].value;
                set({ columns: [...newCols] });
                setValue(steps[index].value);
                get().speakAndThen(steps[index].text, () => {
                    index++;
                    showNextStep();
                });
            } else {
                get().speakAndThen("Et voilà ! Compte tes doigts : 10 doigts = 10 chiffres ! Tu as compris maintenant ? ", () => {
                    get().speakAndThen("Donc en tout, nous avons bien 10 chiffres différents ! 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 !", () => {
                        get().speakAndThen("Le ZÉRO est un peu particulier... on l'oublie parfois, mais il est AUSSI important que les autres !", () => {
                            set({ phase: 'intro-challenge-introduction', introDigitsAttempt: 0 });
                            get().updateInstruction();
                        });
                    });
                });
            }
        };

        showNextStep();
    },

    handleIntroSecondColumnChoice: (choice: string) => {
        const { sequenceFeedback } = get();
        const afterFirstFeedback = () => {
            get().speakAndThen("Regarde bien, je vais modifier la machine !", () => {
                // Transition to the delock-dizaines phase
                set({ phase: 'delock-dizaines' });
                get().updateInstruction();
            });
        };
        if (choice === 'ajouter-rouleau' || choice === 'plus-grande') {
            sequenceFeedback(
                "EXACTEMENT ! Quelle bonne idée ! ",
                "On va ajouter un DEUXIÈME ROULEAU ! Comme ça on aura plus de place pour compter !",
                afterFirstFeedback
            );
        } else {
            sequenceFeedback(
                "Pas de souci ! Je vais te montrer MON idée ! ",
                "On va ajouter un DEUXIÈME ROULEAU !",
                afterFirstFeedback
            );
        }
    },

    handleIntroThirdColumnChoice: (choice: string) => {
        const { sequenceFeedback } = get();
        const afterFirstFeedback = () => {
            get().speakAndThen("Regarde bien, je vais encore modifier la machine !", () => {
                // Transition to the delock-hundreds phase
                set({ phase: 'delock-hundreds' });
                get().updateInstruction();
            });
        };
        if (choice === 'ajouter-rouleau' || choice === 'plus-grande') {
            sequenceFeedback(
                "SUPER ! Excellente idée ! ",
                "On va ajouter un TROISIÈME ROULEAU ! Pour compter encore plus haut !",
                afterFirstFeedback
            );
        } else {
            sequenceFeedback(
                "Pas de problème ! Je vais te montrer ce qu'on va faire ! ",
                "On va ajouter un TROISIÈME ROULEAU !",
                afterFirstFeedback
            );
        }
    },

    handleIntroFourthColumnChoice: (choice: string) => {
        const { sequenceFeedback } = get();
        const afterFirstFeedback = () => {
            get().speakAndThen("Regarde bien, c'est le DERNIER rouleau !", () => {
                // Transition to the delock-thousands phase
                set({ phase: 'delock-thousands' });
                get().updateInstruction();
            });
        };
        if (choice === 'ajouter-rouleau' || choice === 'plus-grande') {
            sequenceFeedback(
                "GÉNIAL ! Tu as tout compris ! ",
                "On va ajouter le QUATRIÈME et DERNIER ROULEAU ! C'est le plus puissant !",
                afterFirstFeedback
            );
        } else {
            sequenceFeedback(
                "Aucun souci ! Regarde ce qu'on va faire ! ",
                "On va ajouter le QUATRIÈME et DERNIER ROULEAU !",
                afterFirstFeedback
            );
        }
    },

    handleIntroMaxSubmit: () => {
        const { userInput, introMaxAttempt, sequenceFeedback } = get();
        const answer = parseInt(userInput.trim());
        const newAttempt = introMaxAttempt + 1;

        set({ introMaxAttempt: newAttempt, userInput: "" });

        if (answer === 99) {
            // Correct answer!
            sequenceFeedback(
                "BRAVO !  C'est EXACT ! On peut compter jusqu'à 99 !",
                "Tu as bien réfléchi ! Chaque rouleau peut afficher 9, donc : 9 et 9 = 99 !",
                () => {
                    // Unlock units when entering tutorial
                    const newCols = [...get().columns];
                    newCols[0].unlocked = true;
                    set({ columns: newCols, showInputField: false, phase: 'tutorial', introMaxAttempt: 0 });
                    get().updateInstruction();
                }
            );
        } else if (answer === 100) {
            if (newAttempt === 1) {
                sequenceFeedback(
                    "Hmm... pas tout à fait ! ",
                    "100 c'est un très bon nombre, mais... malheureusement la machine ne peut pas y arriver pour l'instant !",
                    () => {
                        get().speakAndThen("Regarde bien les rouleaux... Quel est le PLUS GRAND chiffre sur chaque rouleau ? 🔍 Réessaie !");
                    }
                );
            } else if (newAttempt === 2) {
                sequenceFeedback(
                    "Tu veux que je t'aide à trouver ? ",
                    "On va le découvrir ENSEMBLE ! ",
                    () => {
                        get().runIntroMaxGuided();
                    }
                );
            } else {
                get().runIntroMaxGuided();
            }
        } else if (answer < 99) {
            if (newAttempt === 1) {
                sequenceFeedback(
                    "Tu peux aller PLUS HAUT que ça ! 📈",
                    "Regarde : chaque rouleau peut aller jusqu'à 9 ! Remplis les DEUX rouleaux au maximum !"
                );
            } else {
                sequenceFeedback(
                    "Tu veux que je t'aide à trouver ? ",
                    "On va le découvrir ENSEMBLE ! ",
                    () => {
                        get().runIntroMaxGuided();
                    }
                );
            }
        } else {
            if (newAttempt === 1) {
                sequenceFeedback(
                    "Woaw, c'est beaucoup ! ",
                    "Mais malheureusement la machine ne peut pas compter aussi haut !",
                    () => {
                        get().speakAndThen("Regarde bien : combien de rouleaux il y a ?  Seulement 2 ! Et chaque rouleau va jusqu'à 9 ! Réessaie !");
                    }
                );
            } else {
                get().runIntroMaxGuided();
            }
        }
    },

    runIntroMaxGuided: () => {
        const { setFeedback, setShowInputField, columns } = get();

        setShowInputField(false);
        setFeedback("Clique sur sERT pour remplir le PREMIER rouleau au maximum !");

        const newCols = [...columns];
        newCols[0].value = 0;
        newCols[1].value = 0;
        set({ columns: newCols, introMaxAttempt: -1 }); // -1 indicates guided mode
    },

    completeIntroMaxGuided: () => {
        const { sequenceFeedback } = get();
        sequenceFeedback(
            "STOP ! Regarde l'écran ! Quel nombre tu vois ? ",
            "C'est 99 ! QUATRE-VINGT-DIX-NEUF ! C'est le MAXIMUM que peut afficher la machine !",
            () => {
                get().speakAndThen("Maintenant tu sais la réponse ! ", () => {
                    sequenceFeedback(
                        "Donc, avec DEUX rouleaux, on peut compter jusqu'à 99 !",
                        "C'est BEAUCOUP plus que 9 ! On est passé de 9... à 99 ! Ça fait 90 nombres de plus ! 🚀",
                        () => {
                            get().speakAndThen("Mais... si je veux compter jusqu'à 100 ou plus... il faudra encore modifier la machine !  Tu es prêt(e) pour la suite de l'aventure ? ", () => {
                                // Unlock units when entering tutorial
                                const newCols = [...get().columns];
                                newCols[0].unlocked = true;
                                set({ columns: newCols, phase: 'tutorial', introMaxAttempt: 0 });
                                get().updateInstruction();
                            });
                        }
                    );
                });
            }
        );
    },

    handleUserInputSubmit: () => {
        const { phase, userInput, sequenceFeedback, handleIntroDigitsSubmit } = get();
        const answer = parseInt(userInput.trim());

        if (phase === 'intro-count-digits') {
            handleIntroDigitsSubmit();
            return;
        }
        if (phase === 'intro-question-digits') {
            if (answer === 9) {
                sequenceFeedback(
                    "Paf, Crac… Bim… Tchac ! Quel vacarme ! Voilà, j'ai terminé ma nouvelle machine !,Ah je vois pourquoi tu pourrais penser ça, 1, 2, 3, 4, 5, 6, 7, 8, 9, ça fait 9 chiffres...",
                    "Mais rappelle-toi, au début la machine affichait aussi 0 ! Il est un peu particulier et parfois on l'oublie, mais ce 0 est aussi important que les autres chiffres !",
                    () => {
                        get().speakAndThen("Donc en tout, nous avons bien 10 chiffres différents : 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 !", () => {
                            set({ showInputField: false, userInput: "", phase: 'intro-add-roll' });
                            get().updateInstruction();
                        });
                    }
                );
            } else if (answer === 10) {
                sequenceFeedback(
                    "Tu n'as pas oublié le 0 ! Bravo !",
                    "0, 1, 2, 3, 4, 5, 6, 7, 8, 9, le compte est bon, nous en avons bien 10 ! Il est un peu particulier et parfois on l'oublie, mais ce 0 est aussi important que les autres chiffres !",
                    () => {
                        set({ showInputField: false, userInput: "", phase: 'intro-add-roll' });
                        get().updateInstruction();
                    }
                );
            } else {
                sequenceFeedback(
                    "J'imagine que tu n'y as pas vraiment fait attention, comptons ensemble...",
                    "0, 1, 2, 3, 4, 5, 6, 7, 8, 9, le compte est bon, nous en avons 10 ! Au début la machine affichait aussi 0 et ce 0 est aussi important que les autres chiffres.",
                    () => {
                        set({ showInputField: false, userInput: "", phase: 'intro-add-roll' });
                        get().updateInstruction();
                    }
                );
            }
        } else if (phase === 'intro-question-max') {
            if (answer === 100) {
                sequenceFeedback(
                    "Malheureusement pas...",
                    "J'ai bien l'impression qu'il va encore falloir modifier la machine si je veux y arriver !",
                    () => {
                        get().speakAndThen("Regarde combien chaque rouleau peut afficher de points : 9 et 9, ce qui veut dire qu'on peut compter jusqu'à 99 !", () => {
                            // Unlock units when entering tutorial
                            const newCols = [...get().columns];
                            newCols[0].unlocked = true;
                            set({ columns: newCols, showInputField: false, userInput: "", phase: 'tutorial' });
                            get().updateInstruction();
                        });
                    }
                );
            } else if (answer === 99) {
                sequenceFeedback(
                    "Exactement ! Trop facile comme question !",
                    "Avec deux rouleaux, on peut afficher jusqu'à 99 !",
                    () => {
                        // Unlock units when entering tutorial
                        const newCols = [...get().columns];
                        newCols[0].unlocked = true;
                        set({ columns: newCols, showInputField: false, userInput: "", phase: 'tutorial' });
                        get().updateInstruction();
                    }
                );
            } else {
                sequenceFeedback(
                    "Pas tout à fait...",
                    "Regarde combien chaque rouleau peut afficher de points : 9 et 9, ce qui veut dire qu'on peut compter jusqu'à 99 !",
                    () => {
                        // Unlock units when entering tutorial
                        const newCols = [...get().columns];
                        newCols[0].unlocked = true;
                        set({ columns: newCols, showInputField: false, userInput: "", phase: 'tutorial' });
                        get().updateInstruction();
                    }
                );
            }
        }
    },

    updateButtonVisibility: () => {
        const { phase, columns, didacticielStep1UpClicks, didacticielStep1DownClicks } = get();
        const allColumnsUnlocked = columns.every(col => col.unlocked);

        // Check if step 1 of didacticiel is complete
        const isStep1Complete = didacticielStep1UpClicks >= DIDACTICIEL_REQUIRED_CLICKS && didacticielStep1DownClicks >= DIDACTICIEL_REQUIRED_CLICKS;

        set({
            showUnlockButton: phase === 'normal' && !allColumnsUnlocked,
            showStartLearningButton: phase === 'done' || phase === 'celebration-before-thousands' || phase === 'celebration-thousands-complete' || phase === 'intro-learn-tens' || phase === 'intro-learn-hundreds' || phase === 'intro-learn-thousands',
            showValidateLearningButton: phase === 'tutorial-challenge' || phase.startsWith('challenge-unit-') || phase === 'challenge-ten-to-twenty' || 
                (phase === 'didacticiel-step1-buttons' && isStep1Complete) || 
                phase === 'didacticiel-step2-columns' || 
                phase === 'didacticiel-step3-free-practice',
            showValidateTensButton: phase.startsWith('challenge-tens-'),
            showValidateHundredsButton: phase.startsWith('challenge-hundreds-') || phase === 'challenge-hundred-to-two-hundred' || phase === 'challenge-two-hundred-to-three-hundred',
            showValidateThousandsButton: phase.startsWith('challenge-thousands-') || phase === 'challenge-thousand-to-two-thousand' || phase === 'challenge-two-thousand-to-three-thousand' || phase === 'challenge-thousands-simple-combination',
            showDidacticielQuitButton: phase === 'didacticiel-step3-free-practice',
        });
    },

    runAutoCount: () => {
        const { phase, isCountingAutomatically, columns, timer } = get();

        if (timer) {
            clearTimeout(timer);
            set({ timer: null });
        }

        if (!isCountingAutomatically) {
            return;
        }

        // --- LOGIQUE POUR 'learn-units' ---
        if (phase === 'learn-units') {
            const unitsValue = columns[0].value;

            if (unitsValue < 9) {
                get().setColumns(prevCols => {
                    const newCols = [...prevCols];
                    newCols[0].value++;
                    return newCols;
                });

                const nextValue = unitsValue + 1;
                setValue(nextValue);
                let infoMessage = "";
                if (nextValue === 1) infoMessage = "UN doigt";
                else if (nextValue === 2) infoMessage = "DEUX doigts";
                else if (nextValue === 3) infoMessage = "TROIS doigts !";
                else if (nextValue === 4) infoMessage = "QUATRE doigts !";
                else if (nextValue === 5) infoMessage = "CINQ ! Tous les doigts d'une main !";
                else if (nextValue === 6) infoMessage = "SIX doigts !";
                else if (nextValue === 7) infoMessage = "SEPT doigts !";
                else if (nextValue === 8) infoMessage = "HUIT doigts !";
                else if (nextValue === 9) infoMessage = "NEUF doigts !";
                get().setFeedback(infoMessage);
                get().speakAndThen(infoMessage, () => {
                    get().runAutoCount(); // Continue counting
                });
            } else { // unitsValue is 9
                get().speakAndThen("STOP ! Le compteur est à 9.Retour à zéro ! Maintenant, c'est à toi de jouer !", () => {

                    // Reset columns and keep units unlocked
                    const newCols = initialColumns.map(col => ({ ...col }));
                    newCols[0].unlocked = true;
                    get().setColumns(newCols);
                    get().setIsCountingAutomatically(false);
                    get().setNextPhaseAfterAuto(null);
                    get().resetUnitChallenge();
                    //  get().setPhase('explore-units');
                });
            }
        }

        // --- LOGIQUE POUR 'learn-ten-to-twenty' ---
        else if (phase === 'learn-ten-to-twenty') {
            // This phase is NOT auto-counting, it's user-driven
            // The logic is handled in handleAdd
            return;
        }

        // --- LOGIQUE POUR 'learn-twenty-to-thirty' ---
        else if (phase === 'learn-twenty-to-thirty') {
            // This phase is NOT auto-counting, it's user-driven
            // The logic is handled in handleAdd
            return;
        }

        // --- LOGIQUE POUR 'learn-tens' ---
        else if (phase === 'learn-tens') {
            const tensValue = columns[1].value;
            if (columns[0].value !== 0) { // Ensure units are 0
                get().setColumns(cols => {
                    const newCols = [...cols];
                    newCols[0].value = 0;
                    return newCols;
                });
            }

            // Start from 3 (30) instead of 0
            if (tensValue < 3) {
                get().setColumns(cols => {
                    const newCols = [...cols];
                    newCols[1].value = 3;
                    newCols[0].value = 0;
                    return newCols;
                });
                const infoMessage = "30 (TRENTE) ! Compte avec moi les paquets : UN, DEUX, TROIS !";
                get().setFeedback(infoMessage);
                get().speakAndThen(infoMessage, () => {
                    get().runAutoCount();
                });
            } else if (tensValue < 9) {
                get().setColumns(prevCols => {
                    const newCols = [...prevCols];
                    newCols[1].value++;
                    return newCols;
                });

                const nextValue = tensValue + 1;
                const displayNumber = nextValue * 10;
                setValue(displayNumber);
                let infoMessage = "";
                if (nextValue === 4) infoMessage = `${displayNumber} (QUARANTE) !  Compte les paquets : UN, DEUX, TROIS, QUATRE !`;
                else if (nextValue === 5) infoMessage = `${displayNumber} (CINQUANTE) !  5 paquets de 10 !`;
                else if (nextValue === 6) infoMessage = `${displayNumber} (SOIXANTE) !  6 paquets de 10 !`;
                else if (nextValue === 7) infoMessage = `${displayNumber} (SOIXANTE-DIX) !  7 paquets de 10 !`;
                else if (nextValue === 8) infoMessage = `${displayNumber} (QUATRE-VINGTS) !  8 paquets de 10 !`;
                else if (nextValue === 9) infoMessage = `${displayNumber} (QUATRE-VINGT-DIX) !  Presque 100 !`;
                else infoMessage = `${displayNumber} !`;
                get().setFeedback(infoMessage);
                get().speakAndThen(infoMessage, () => {
                    get().runAutoCount(); // Continue counting
                });
            } else { // tensValue is 9
                get().speakAndThen("STOP ! 🛑 Le compteur est à 90. Tu as vu tous les nombres avec les dizaines ! Bravo !", () => {
                    get().setColumns(initialColumns.map(c => ({ ...c, unlocked: c.name === 'Unités' || c.name === 'Dizaines' })));
                    get().setIsCountingAutomatically(false);
                    get().resetTensChallenge();
                    get().markPhaseComplete('learn-tens');
                    get().speakAndThen("Retour à zéro ! 🔄 Maintenant c'est à toi de jouer !", () => {
                        get().goToNextPhase();
                    });
                });
            }
        }

        // --- LOGIQUE POUR 'learn-tens-combination' ---
        else if (phase === 'learn-tens-combination') {
            const examples = [
                { tens: 1, units: 2, name: "DOUZE" },
                { tens: 2, units: 5, name: "VINGT-CINQ" },
                { tens: 3, units: 4, name: "TRENTE-QUATRE" },
            ];
            const currentExampleIndex = examples.findIndex(ex => ex.tens === columns[1].value && ex.units === columns[0].value);

            // If we're at [0, 0], set the first example
            if (currentExampleIndex === -1) {
                const firstExample = examples[0];
                get().setColumns(() => {
                    const newCols = [...initialColumns];
                    newCols[1].value = firstExample.tens;
                    newCols[0].value = firstExample.units;
                    newCols[1].unlocked = true;
                    return newCols;
                });
                const total = firstExample.tens * 10 + firstExample.units;
                const infoMessage = `${total} (${firstExample.name}) ! ${firstExample.tens} dizaine(s) + ${firstExample.units} unité(s) = ${total} !`;
                get().setFeedback(infoMessage);
                get().speakAndThen(infoMessage, () => {
                    get().runAutoCount();
                });
            } else if (currentExampleIndex < examples.length - 1) {
                const nextExample = examples[currentExampleIndex + 1];
                get().setColumns(() => {
                    const newCols = [...initialColumns];
                    newCols[1].value = nextExample.tens;
                    newCols[0].value = nextExample.units;
                    newCols[1].unlocked = true;
                    return newCols;
                });
                const total = nextExample.tens * 10 + nextExample.units;
                const infoMessage = `${total} (${nextExample.name}) ! ${nextExample.tens} dizaine(s) + ${nextExample.units} unité(s) = ${total} !`;
                get().setFeedback(infoMessage);
                get().speakAndThen(infoMessage, () => {
                    get().runAutoCount();
                });
            } else {
                get().speakAndThen("Bravo !  Tu as vu comment combiner dizaines et unités ! Maintenant c'est à toi !", () => {
                    get().setColumns(initialColumns.map(c => ({ ...c, unlocked: c.name === 'Unités' || c.name === 'Dizaines' })));
                    get().setIsCountingAutomatically(false);
                    get().resetTensChallenge();
                    get().speakAndThen("Retour à zéro ! 🔄 À toi de jouer maintenant !", () => {
                        //     get().setPhase('challenge-tens-1');
                    });
                });
            }
        }
        // --- LOGIQUE POUR 'learn-hundreds' ---
        else if (phase === 'learn-hundreds') {
            const hundredsValue = columns[2].value;
            if (columns[0].value !== 0 || columns[1].value !== 0) { // Ensure units and tens are 0
                get().setColumns(cols => {
                    const newCols = [...cols];
                    newCols[0].value = 0;
                    newCols[1].value = 0;
                    return newCols;
                });
            }

            // Start from 3 (300) instead of 0
            if (hundredsValue < 3) {
                get().setColumns(cols => {
                    const newCols = [...cols];
                    newCols[2].value = 3;
                    newCols[0].value = 0;
                    newCols[1].value = 0;
                    return newCols;
                });
                const infoMessage = "300 (TROIS-CENTS) ! Compte avec moi les GRANDS paquets : UN, DEUX, TROIS !";
                get().setFeedback(infoMessage);
                get().speakAndThen(infoMessage, () => {
                    get().runAutoCount();
                });
            } else if (hundredsValue < 9) {
                get().setColumns(prevCols => {
                    const newCols = [...prevCols];
                    newCols[2].value++;
                    return newCols;
                });

                const nextValue = hundredsValue + 1;
                const displayNumber = nextValue * 100;
                setValue(displayNumber);
                let infoMessage = `${displayNumber} !`;
                if (nextValue === 4) infoMessage = `${displayNumber} (QUATRE-CENTS) !  Compte les GRANDS paquets : UN, DEUX, TROIS, QUATRE !`;
                else if (nextValue === 5) infoMessage = `${displayNumber} (CINQ-CENTS) !  5 grands paquets de 100 !`;
                else if (nextValue === 6) infoMessage = `${displayNumber} (SIX-CENTS) !  6 grands paquets de 100 !`;
                else if (nextValue === 7) infoMessage = `${displayNumber} (SEPT-CENTS) !  7 grands paquets de 100 !`;
                else if (nextValue === 8) infoMessage = `${displayNumber} (HUIT-CENTS) !  8 grands paquets de 100 !`;
                else if (nextValue === 9) infoMessage = `${displayNumber} (NEUF-CENTS) !  Presque 1000 !`;
                get().setFeedback(infoMessage);
                get().speakAndThen(infoMessage, () => {
                    get().runAutoCount(); // Continue counting
                });
            } else { // hundredsValue is 9
                get().speakAndThen("STOP ! 🛑 Le compteur est à 900. Tu as vu tous les nombres avec les centaines ! Bravo !", () => {
                    get().setColumns(initialColumns.map(c => ({ ...c, unlocked: c.name === 'Unités' || c.name === 'Dizaines' || c.name === 'Centaines' })));
                    get().setIsCountingAutomatically(false);
                    get().resetHundredsChallenge();
                    get().markPhaseComplete('learn-hundreds');
                    get().speakAndThen("Retour à zéro ! 🔄 Maintenant c'est à toi de jouer !", () => {
                        get().goToNextPhase();
                    });
                });
            }
        }
        // --- LOGIQUE POUR 'learn-hundreds-simple-combination' ---
        else if (phase === 'learn-hundreds-simple-combination') {
            const examples = [
                { hundreds: 1, tens: 0, units: 0, name: "CENT" },
                { hundreds: 1, tens: 1, units: 0, name: "CENT-DIX" },
                { hundreds: 2, tens: 0, units: 0, name: "DEUX-CENTS" },
                { hundreds: 2, tens: 5, units: 0, name: "DEUX-CENT-CINQUANTE" },
                { hundreds: 3, tens: 0, units: 0, name: "TROIS-CENTS" },
                { hundreds: 1, tens: 0, units: 5, name: "CENT-CINQ" },
            ];
            const currentExampleIndex = examples.findIndex(ex => ex.hundreds === columns[2].value && ex.tens === columns[1].value && ex.units === columns[0].value);

            // If we're at [0, 0, 0], set the first example
            if (currentExampleIndex === -1) {
                const firstExample = examples[0];
                get().setColumns(() => {
                    const newCols = [...initialColumns];
                    newCols[2].value = firstExample.hundreds;
                    newCols[1].value = firstExample.tens;
                    newCols[0].value = firstExample.units;
                    newCols[1].unlocked = true;
                    newCols[2].unlocked = true;
                    return newCols;
                });
                const total = firstExample.hundreds * 100 + firstExample.tens * 10 + firstExample.units;
                const infoMessage = `${total} (${firstExample.name}) ! 1 grand paquet de 100 !`;
                get().setFeedback(infoMessage);
                get().speakAndThen(infoMessage, () => {
                    get().runAutoCount();
                });
            } else if (currentExampleIndex < examples.length - 1) {
                const nextExample = examples[currentExampleIndex + 1];
                get().setColumns(() => {
                    const newCols = [...initialColumns];
                    newCols[2].value = nextExample.hundreds;
                    newCols[1].value = nextExample.tens;
                    newCols[0].value = nextExample.units;
                    newCols[1].unlocked = true;
                    newCols[2].unlocked = true;
                    return newCols;
                });
                const total = nextExample.hundreds * 100 + nextExample.tens * 10 + nextExample.units;
                let detailMsg = "";
                if (nextExample.tens > 0 && nextExample.units === 0) {
                    detailMsg = ` ! ${nextExample.hundreds} grand paquet + ${nextExample.tens} paquet${nextExample.tens > 1 ? 's' : ''} de 10 !`;
                } else if (nextExample.units > 0 && nextExample.tens === 0) {
                    detailMsg = ` ! ${nextExample.hundreds} grand paquet + ${nextExample.units} bille${nextExample.units > 1 ? 's' : ''} !`;
                } else if (nextExample.tens === 0 && nextExample.units === 0) {
                    detailMsg = ` ! ${nextExample.hundreds} grand${nextExample.hundreds > 1 ? 's' : ''} paquet${nextExample.hundreds > 1 ? 's' : ''} de 100 !`;
                }
                const infoMessage = `${total} (${nextExample.name})${detailMsg}`;
                get().setFeedback(infoMessage);
                get().speakAndThen(infoMessage, () => {
                    get().runAutoCount();
                });
            } else {
                get().speakAndThen("Bravo !  Tu as vu des exemples simples avec les centaines ! Maintenant on va voir des combinaisons complètes !", () => {
                    get().setColumns(initialColumns.map(c => ({ ...c, unlocked: ['Unités', 'Dizaines', 'Centaines'].includes(c.name) })));
                    get().setIsCountingAutomatically(false);
                    get().speakAndThen("Observe maintenant des combinaisons avec centaines, dizaines ET unités !", () => {
                        //get().setPhase('learn-hundreds-combination');
                        //get().setPendingAutoCount(true);
                    });
                });
            }
        }
        // --- LOGIQUE POUR 'learn-hundreds-combination' ---
        else if (phase === 'learn-hundreds-combination') {
            const examples = [
                { hundreds: 1, tens: 2, units: 3, name: "CENT-VINGT-TROIS" },
                { hundreds: 2, tens: 3, units: 4, name: "DEUX-CENT-TRENTE-QUATRE" },
            ];
            const currentExampleIndex = examples.findIndex(ex => ex.hundreds === columns[2].value && ex.tens === columns[1].value && ex.units === columns[0].value);

            // If we're at [0, 0, 0], set the first example
            if (currentExampleIndex === -1) {
                const firstExample = examples[0];
                get().setColumns(() => {
                    const newCols = [...initialColumns];
                    newCols[2].value = firstExample.hundreds;
                    newCols[1].value = firstExample.tens;
                    newCols[0].value = firstExample.units;
                    newCols[1].unlocked = true;
                    newCols[2].unlocked = true;
                    return newCols;
                });
                const total = firstExample.hundreds * 100 + firstExample.tens * 10 + firstExample.units;
                const infoMessage = `${total} (${firstExample.name}) ! 1 grand paquet + 2 paquets + 3 billes !`;
                get().setFeedback(infoMessage);
                get().speakAndThen(infoMessage, () => {
                    get().runAutoCount();
                });
            } else if (currentExampleIndex < examples.length - 1) {
                const nextExample = examples[currentExampleIndex + 1];
                get().setColumns(() => {
                    const newCols = [...initialColumns];
                    newCols[2].value = nextExample.hundreds;
                    newCols[1].value = nextExample.tens;
                    newCols[0].value = nextExample.units;
                    newCols[1].unlocked = true;
                    newCols[2].unlocked = true;
                    return newCols;
                });
                const total = nextExample.hundreds * 100 + nextExample.tens * 10 + nextExample.units;
                const infoMessage = `${total} (${nextExample.name}) ! ${nextExample.hundreds} grand${nextExample.hundreds > 1 ? 's' : ''} paquet${nextExample.hundreds > 1 ? 's' : ''} + ${nextExample.tens} paquets + ${nextExample.units} billes !`;
                get().setFeedback(infoMessage);
                get().speakAndThen(infoMessage, () => {
                    get().runAutoCount();
                });
            } else {
                get().speakAndThen("Bravo !  Tu as vu comment combiner les centaines ! C'est à toi !", () => {
                    get().setColumns(initialColumns.map(c => ({ ...c, unlocked: ['Unités', 'Dizaines', 'Centaines'].includes(c.name) })));
                    get().setIsCountingAutomatically(false);
                    get().resetHundredsChallenge();
                    get().speakAndThen("Retour à zéro ! 🔄 À toi de jouer maintenant !", () => {
                        // get().setPhase('challenge-hundreds-1');
                    });
                });
            }
        }
        // --- LOGIQUE POUR 'learn-thousands' ---
        else if (phase === 'learn-thousands') {
            const thousandsValue = columns[3].value;
            if (columns[0].value !== 0 || columns[1].value !== 0 || columns[2].value !== 0) {
                get().setColumns(cols => {
                    const newCols = [...cols];
                    newCols[0].value = 0; newCols[1].value = 0; newCols[2].value = 0;
                    return newCols;
                });
            }

            // Start from 3 (3000) instead of 0
            if (thousandsValue < 3) {
                get().setColumns(cols => {
                    const newCols = [...cols];
                    newCols[3].value = 3;
                    return newCols;
                });
                const infoMessage = "3000 ! Trois ÉNORMES paquets !";
                get().setFeedback(infoMessage);
                get().speakAndThen(infoMessage, () => {
                    get().runAutoCount();
                });
            } else if (thousandsValue < 9) {
                get().setColumns(prevCols => {
                    const newCols = [...prevCols];
                    newCols[3].value++;
                    return newCols;
                });
                const nextValue = thousandsValue + 1;
                const displayNumber = nextValue * 1000;
                setValue(displayNumber);
                const numberWords = ["", "", "", "TROIS", "QUATRE", "CINQ", "SIX", "SEPT", "HUIT", "NEUF"];
                const infoMessage = `${displayNumber} ! ${numberWords[nextValue]} ÉNORMES paquets ! Imagine ${displayNumber} billes !`;
                get().setFeedback(infoMessage);
                get().speakAndThen(infoMessage, () => {
                    get().runAutoCount();
                });
            } else {
                get().speakAndThen("STOP ! 🛑 Le compteur est à 9000. C'est GIGANTESQUE !", () => {
                    get().setColumns(initialColumns.map(c => ({ ...c, unlocked: true })));
                    get().setIsCountingAutomatically(false);
                    get().resetThousandsChallenge();
                    get().markPhaseComplete('learn-thousands');
                    get().speakAndThen("Retour à zéro ! 🔄 Maintenant c'est à toi de jouer !", () => {
                        get().goToNextPhase();
                    });
                });
            }
        }
        // --- LOGIQUE POUR 'learn-thousands-very-simple-combination' ---
        else if (phase === 'learn-thousands-very-simple-combination') {
            const examples = [
                { thousands: 1, hundreds: 0, tens: 0, units: 0, name: "MILLE" },
                { thousands: 1, hundreds: 1, tens: 0, units: 0, name: "MILLE-CENT" },
                { thousands: 1, hundreds: 2, tens: 0, units: 0, name: "MILLE-DEUX-CENTS" },
                { thousands: 2, hundreds: 0, tens: 0, units: 0, name: "DEUX-MILLE" },
                { thousands: 2, hundreds: 5, tens: 0, units: 0, name: "DEUX-MILLE-CINQ-CENTS" },
                { thousands: 3, hundreds: 0, tens: 0, units: 0, name: "TROIS-MILLE" },
            ];
            const currentExampleIndex = examples.findIndex(ex =>
                ex.thousands === columns[3].value &&
                ex.hundreds === columns[2].value &&
                ex.tens === columns[1].value &&
                ex.units === columns[0].value
            );

            // Si on est à [0, 0, 0, 0], set le premier exemple
            if (currentExampleIndex === -1) {
                const firstExample = examples[0];
                get().setColumns(() => {
                    const newCols = [...initialColumns];
                    newCols[3].value = firstExample.thousands;
                    newCols[2].value = firstExample.hundreds;
                    newCols[1].value = firstExample.tens;
                    newCols[0].value = firstExample.units;
                    newCols.forEach(c => c.unlocked = true);
                    return newCols;
                });
                const total = firstExample.thousands * 1000 + firstExample.hundreds * 100 + firstExample.tens * 10 + firstExample.units;
                get().speakAndThen(`${total} (${firstExample.name}) ! C'est des nombres RONDS !`, () => {
                    get().runAutoCount();
                });
            } else if (currentExampleIndex < examples.length - 1) {
                const nextExample = examples[currentExampleIndex + 1];
                get().setColumns(() => {
                    const newCols = [...initialColumns];
                    newCols[3].value = nextExample.thousands;
                    newCols[2].value = nextExample.hundreds;
                    newCols[1].value = nextExample.tens;
                    newCols[0].value = nextExample.units;
                    newCols.forEach(c => c.unlocked = true);
                    return newCols;
                });
                const total = nextExample.thousands * 1000 + nextExample.hundreds * 100 + nextExample.tens * 10 + nextExample.units;
                get().speakAndThen(`${total} (${nextExample.name}) ! Facile avec des nombres RONDS !`, () => {
                    get().runAutoCount();
                });
            } else {
                get().speakAndThen("Bravo !  Tu maîtrises les combinaisons SIMPLES !", () => {
                    get().setColumns(initialColumns.map(c => ({ ...c, unlocked: true })));
                    get().setIsCountingAutomatically(false);
                    get().resetThousandsSimpleCombinationChallenge();
                    get().speakAndThen("Retour à zéro ! 🔄 À toi de jouer avec des nombres RONDS !", () => {
                        //get().setPhase('challenge-thousands-simple-combination');
                    });
                });
            }
        }
        // --- LOGIQUE POUR 'learn-thousands-full-combination' ---
        else if (phase === 'learn-thousands-full-combination') {
            const examples = [
                { thousands: 1, hundreds: 2, tens: 3, units: 4, name: "MILLE-DEUX-CENT-TRENTE-QUATRE" },
                { thousands: 2, hundreds: 3, tens: 4, units: 5, name: "DEUX-MILLE-TROIS-CENT-QUARANTE-CINQ" },
            ];
            const currentExampleIndex = examples.findIndex(ex =>
                ex.thousands === columns[3].value &&
                ex.hundreds === columns[2].value &&
                ex.tens === columns[1].value &&
                ex.units === columns[0].value
            );

            // Si on est à [0, 0, 0, 0], set le premier exemple
            if (currentExampleIndex === -1) {
                const firstExample = examples[0];
                get().setColumns(() => {
                    const newCols = [...initialColumns];
                    newCols[3].value = firstExample.thousands;
                    newCols[2].value = firstExample.hundreds;
                    newCols[1].value = firstExample.tens;
                    newCols[0].value = firstExample.units;
                    newCols.forEach(c => c.unlocked = true);
                    return newCols;
                });
                const total = firstExample.thousands * 1000 + firstExample.hundreds * 100 + firstExample.tens * 10 + firstExample.units;
                get().speakAndThen(`${total} (${firstExample.name}) ! C'est ${firstExample.thousands} énorme + ${firstExample.hundreds} grands + ${firstExample.tens} paquets + ${firstExample.units} billes !`, () => {
                    get().runAutoCount();
                });
            } else if (currentExampleIndex < examples.length - 1) {
                const nextExample = examples[currentExampleIndex + 1];
                get().setColumns(() => {
                    const newCols = [...initialColumns];
                    newCols[3].value = nextExample.thousands;
                    newCols[2].value = nextExample.hundreds;
                    newCols[1].value = nextExample.tens;
                    newCols[0].value = nextExample.units;
                    newCols.forEach(c => c.unlocked = true);
                    return newCols;
                });
                const total = nextExample.thousands * 1000 + nextExample.hundreds * 100 + nextExample.tens * 10 + nextExample.units;
                get().speakAndThen(`${total} (${nextExample.name}) ! Décomposition : ${nextExample.thousands} énorme + ${nextExample.hundreds} grands + ${nextExample.tens} paquets + ${nextExample.units} billes !`, () => {
                    get().runAutoCount();
                });
            } else {
                get().speakAndThen("Bravo !  Tu comprends les nombres COMPLETS ! C'est long à dire mais tu vois la logique !", () => {
                    get().setColumns(initialColumns.map(c => ({ ...c, unlocked: true })));
                    get().setIsCountingAutomatically(false);
                    get().resetThousandsChallenge();
                    get().speakAndThen("Retour à zéro ! 🔄 Maintenant les VRAIS défis !", () => {
                        //get().setPhase('challenge-thousands-1');
                    });
                });
            }
        }
        // --- LOGIQUE POUR 'learn-thousands-combination' (LEGACY - kept for compatibility) ---
        else if (phase === 'learn-thousands-combination') {
            const examples = [
                { thousands: 1, hundreds: 2, tens: 3, units: 4, name: "MILLE-DEUX-CENT-TRENTE-QUATRE" },
                { thousands: 2, hundreds: 3, tens: 4, units: 5, name: "DEUX-MILLE-TROIS-CENT-QUARANTE-CINQ" },
            ];
            const currentExampleIndex = examples.findIndex(ex => ex.thousands === columns[3].value && ex.hundreds === columns[2].value && ex.tens === columns[1].value && ex.units === columns[0].value);

            // Si on est à [0, 0, 0, 0], set le premier exemple
            if (currentExampleIndex === -1) {
                const firstExample = examples[0];
                get().setColumns(() => {
                    const newCols = [...initialColumns];
                    newCols[3].value = firstExample.thousands;
                    newCols[2].value = firstExample.hundreds;
                    newCols[1].value = firstExample.tens;
                    newCols[0].value = firstExample.units;
                    newCols.forEach(c => c.unlocked = true);
                    return newCols;
                });
                const total = firstExample.thousands * 1000 + firstExample.hundreds * 100 + firstExample.tens * 10 + firstExample.units;
                get().speakAndThen(`${total} (${firstExample.name}) !`, () => {
                    get().runAutoCount();
                });
            } else if (currentExampleIndex < examples.length - 1) {
                const nextExample = examples[currentExampleIndex + 1];
                get().setColumns(() => {
                    const newCols = [...initialColumns];
                    newCols[3].value = nextExample.thousands;
                    newCols[2].value = nextExample.hundreds;
                    newCols[1].value = nextExample.tens;
                    newCols[0].value = nextExample.units;
                    newCols.forEach(c => c.unlocked = true);
                    return newCols;
                });
                const total = nextExample.thousands * 1000 + nextExample.hundreds * 100 + nextExample.tens * 10 + nextExample.units;
                get().speakAndThen(`${total} (${nextExample.name}) !`, () => {
                    get().runAutoCount();
                });
            } else {
                get().speakAndThen("Bravo !  Tu es un expert des grands nombres !", () => {
                    get().setColumns(initialColumns.map(c => ({ ...c, unlocked: true })));
                    get().setIsCountingAutomatically(false);
                    get().resetThousandsChallenge();
                    get().speakAndThen("Retour à zéro ! 🔄 À toi de jouer maintenant !", () => {
                        //get().setPhase('challenge-thousands-1');
                    });
                });
            }
        }
    },


    setFeedbackSequence: (sequence: string[], callback?: () => void) => {
        // Start a new feedback sequence
        console.log('[DEBUG] setFeedbackSequence appelée', sequence, callback);
        set({
            feedbackSequence: sequence,
            feedbackSequenceStep: 0,
            feedbackSequenceCallback: callback || null
        });
        // Trigger the first message
        get().advanceFeedbackSequence();
    },

    advanceFeedbackSequence: () => {
        const { feedbackSequence, feedbackSequenceStep, feedbackSequenceCallback } = get();

        if (feedbackSequenceStep < feedbackSequence.length) {
            const currentMessage = feedbackSequence[feedbackSequenceStep];
            get().setFeedback(currentMessage);
            console.log('[DEBUG] advanceFeedbackSequence: message', currentMessage, 'step', feedbackSequenceStep, '/', feedbackSequence.length);
            textToSpeechService.setCallbacks({
                onEnd: () => {
                    const newStep = feedbackSequenceStep + 1;
                    set({ feedbackSequenceStep: newStep });
                    if (newStep < feedbackSequence.length) {
                        // More messages to speak
                        get().advanceFeedbackSequence();
                    } else {
                        // Sequence complete, execute callback
                        if (feedbackSequenceCallback) {
                            console.log('[DEBUG] [advanceFeedbackSequence] Appel de la callback finale de feedbackSequence');
                        }
                        feedbackSequenceCallback?.();
                        // Clear the sequence
                        set({
                            feedbackSequence: [],
                            feedbackSequenceStep: 0,
                            feedbackSequenceCallback: null
                        });
                    }
                }
            });
            textToSpeechService.speak(currentMessage);
        }
    },

    // Helper wrapper to maintain compatibility with old sequenceFeedback interface
    // This will be removed after all calls are updated
    sequenceFeedback: (first: string, second?: string, onComplete?: () => void) => {
        const messages = second ? [first, second] : [first];
        get().setFeedbackSequence(messages, onComplete);
    },

    // Helper function to speak a message and execute callback when done
    speakAndThen: (message: string, onComplete?: () => void) => {
        get().setFeedback(message);
        textToSpeechService.setCallbacks({
            onEnd: () => {
                onComplete?.();
            }
        });
        textToSpeechService.speak(message);
    },

    handleAdd: (idx: number) => {
        const { isCountingAutomatically, isTransitioningToChallenge, pendingAutoCount, phase, columns, addClicks, sequenceFeedback, guidedMode, currentTarget } = get();
        const totalNumber = columns.reduce((acc: number, col: Column, idx: number) => acc + col.value * Math.pow(10, idx), 0);

        if (isCountingAutomatically || isTransitioningToChallenge || pendingAutoCount) return;

        // Handle simplified tutorial step 1 - button discovery
        if (phase === 'didacticiel-step1-buttons') {
            if (idx === 0) {
                get().handleDidacticielStep1ButtonClick('up');
            }
            return;
        }

        const isUnitsColumn = (i: number) => i === 0;

        // Handle guided mode - check if this is the correct column to click
        if (guidedMode) {
            const currentValues = [columns[0].value, columns[1].value, columns[2].value, columns[3].value];
            const nextStep = getNextGuidedStep(currentTarget, currentValues);

            if (nextStep && nextStep.columnIndex === idx && nextStep.action === 'increase') {
                // Correct click! Increment the column
                const newCols = [...columns];
                newCols[idx].value++;
                set({ columns: newCols });

                // Check if this column is now complete
                const updatedValues = [newCols[0].value, newCols[1].value, newCols[2].value, newCols[3].value];
                const decomp = decomposeNumber(currentTarget);
                const targetArray = [decomp.units, decomp.tens, decomp.hundreds, decomp.thousands];

                if (updatedValues[idx] === targetArray[idx]) {
                    // Column complete! Move to next step
                    setTimeout(() => {
                        get().advanceGuidedStep();
                    }, 500);
                } else {
                    // Show progress feedback
                    const remaining = targetArray[idx] - updatedValues[idx];
                    get().setFeedback(getGuidedClickFeedback(remaining));
                }
                return;
            } else if (nextStep) {
                // Wrong column or action
                get().setFeedback(`Non, pas là ! \nClique sur VERT dans la colonne ${nextStep.columnName} !`);
                return;
            }
        }

        // Handle new intro phases
        if (phase === 'intro-first-interaction') {
            if (idx === 0) {
                get().handleIntroFirstClick();
            }
            return;
        } else if (phase === 'intro-discover-carry') {
            if (idx === 0) {
                const newCols = [...columns];
                newCols[0].value++;

                // Handle carry
                if (newCols[0].value > 9) {
                    newCols[0].value = 0;
                    newCols[1].value++;
                    set({ columns: newCols });

                    setTimeout(() => {
                        sequenceFeedback(
                            "WAOUH ! Tu as vu ça ??? 🤩 C'était MAGIQUE non ?",
                            "Les 10 lumières ont VOYAGÉ ! Elles se sont regroupées pour devenir UNE seule lumière sur le deuxième rouleau !"
                        );
                        setTimeout(() => {
                            set({ feedback: "C'est comme si... chaque lumière du nouveau rouleau avait 10 petites lumières à l'intérieur ! 🎒 10 petites = 1 grosse ! C'est le SECRET des nombres ! 🔑" });
                            setTimeout(() => {
                                set({ feedback: "Maintenant, refais l'inverse ! Clique sur bouton ROUGE pour voir ce qu'il se passe !" });
                            }, FEEDBACK_DELAY);
                        }, FEEDBACK_DELAY * 2);
                    }, 500);
                } else {
                    set({ columns: newCols });
                }
            }
            return;
        } else if (phase === 'intro-count-digits') {
            // During guided counting, allow clicking through the digits
            if (get().introDigitsAttempt === 0 && idx === 0) {
                const newCols = [...columns];
                if (newCols[0].value < 9) {
                    newCols[0].value++;
                    set({ columns: newCols });
                }
            }
            return;
        } else if (phase === 'intro-max-value-question') {
            // In guided mode for max value
            if (get().introMaxAttempt === -1 && idx === 0) {
                const newCols = [...columns];
                newCols[idx].value++;

                // Handle carry
                for (let i = idx; i < newCols.length; i++) {
                    if (newCols[i].value > 9) {
                        newCols[i].value = 0;
                        if (i + 1 < newCols.length) {
                            newCols[i + 1].value++;
                        }
                    }
                }

                set({ columns: newCols });

                // Check if we reached 99
                if (newCols[0].value === 9 && newCols[1].value === 9) {
                    setTimeout(() => {
                        get().completeIntroMaxGuided();

                    }, 500);
                    //il faut que ca passe a intro idi
                } else if (newCols[0].value === 9 && newCols[1].value < 9) {
                    set({ feedback: "Parfait ! Le premier rouleau est à 9 ! Maintenant clique sur VERT du DEUXIÈME rouleau !" });
                }
            }
            return;
        }

        // Note: intro-welcome and intro-discover transitions are now handled automatically
        // in updateInstruction() after the instruction is spoken. User clicks during these
        // phases should not trigger transitions.

        const currentPhaseForCheck = get().phase;
        const isAllowedColumn = () => {
            if (currentPhaseForCheck === 'intro-discover' || currentPhaseForCheck === 'intro-add-roll') return isUnitsColumn(idx);
            if (currentPhaseForCheck === 'normal') return true;
            if (isUnitsColumn(idx)) return true;
            if (currentPhaseForCheck === 'practice-ten' || currentPhaseForCheck === 'learn-ten-to-twenty' || currentPhaseForCheck === 'challenge-ten-to-twenty' || currentPhaseForCheck === 'learn-twenty-to-thirty') return isUnitsColumn(idx);
            if (idx === 1 && currentPhaseForCheck.startsWith('challenge-tens-')) return true;
            if (currentPhaseForCheck === 'practice-hundred' || currentPhaseForCheck === 'learn-hundred-to-hundred-ten' || currentPhaseForCheck === 'learn-hundred-ten-to-two-hundred' || currentPhaseForCheck === 'challenge-hundred-to-two-hundred') return isUnitsColumn(idx);
            if (currentPhaseForCheck === 'learn-two-hundred-to-three-hundred' || currentPhaseForCheck === 'challenge-two-hundred-to-three-hundred') return isUnitsColumn(idx);
            if ((idx === 1 || idx === 2) && currentPhaseForCheck.startsWith('challenge-hundreds-')) return true;
            if (currentPhaseForCheck === 'practice-thousand' || currentPhaseForCheck === 'learn-thousand-to-thousand-ten' || currentPhaseForCheck === 'learn-thousand-to-thousand-hundred' || currentPhaseForCheck === 'learn-thousand-hundred-to-two-thousand' || currentPhaseForCheck === 'challenge-thousand-to-two-thousand') return isUnitsColumn(idx);
            if (currentPhaseForCheck === 'learn-two-thousand-to-three-thousand' || currentPhaseForCheck === 'challenge-two-thousand-to-three-thousand') return isUnitsColumn(idx);
            if ((idx === 1 || idx === 2 || idx === 3) && (currentPhaseForCheck.startsWith('challenge-thousands-') || currentPhaseForCheck === 'challenge-thousands-simple-combination')) return true;
            if (currentPhaseForCheck === 'learn-carry') return isUnitsColumn(idx);
            return false;
        };

        if (!isAllowedColumn()) {
            get().setFeedback("Concentrons-nous sur les colonnes actives pour l'instant !");
            return;
        }

        if (totalNumber >= 9999) return;

        const newCols = JSON.parse(JSON.stringify(columns));
        newCols[idx].value++;
        let hasCarry = false;

        for (let i = idx; i < newCols.length; i++) {
            if (newCols[i].value > 9) {
                newCols[i].value = 0;
                if (i + 1 < newCols.length) {
                    newCols[i + 1].value++;
                    hasCarry = true;
                }
            }
        }

        set({ columns: newCols });

        const { resetUnitChallenge } = get();
        const currentPhase = get().phase;

        if (currentPhase === 'intro-discover' && isUnitsColumn(idx)) {
            const { sequenceFeedback, speakAndThen } = get();
            const unitsValue = newCols[0].value;
            if (unitsValue === 9) {
                sequenceFeedback(
                    "Et voilà, on a rempli la machine !",
                    "Tu as vu comme les lumières s'allument en même temps que les chiffres changent ?",
                    () => {
                        speakAndThen("Bravo ! Tu peux passer à la suite.", () => {
                            set({ showInputField: true, phase: 'tutorial' });
                            get().updateInstruction();
                        });
                    }
                );
            } else if (unitsValue > 0) {
                get().setFeedback(`${unitsValue}... Continue à cliquer sur VERT !`);
            }
        } else if (currentPhase === 'intro-add-roll') {
            const { sequenceFeedback, speakAndThen } = get();
            const unitsValue = newCols[0].value;
            if (unitsValue === 9) {
                sequenceFeedback(
                    "Je sais, nous allons devoir la modifier pour qu'elle ait une place de plus. Rajoutons un rouleau !",
                    "Je vais l'allumer pour que tu puisses la tester.",
                    () => {
                        // Unlock the tens column
                        const updatedCols = [...newCols];
                        updatedCols[1].unlocked = true;
                        updatedCols[0].value = 0;
                        set({ columns: updatedCols });
                        sequenceFeedback(
                            "Et voilà le travail ! Tu as vu comment les lumières ont voyagé ?",
                            "Elles se regroupent pour n'allumer qu'une autre lumière du rouleau suivant. C'est un peu comme si chaque lumière du nouveau rouleau avait dix petites lumières à l'intérieur.",
                            () => {
                                speakAndThen("Essaie maintenant d'afficher le plus grand nombre possible !", () => {
                                    set({ showInputField: true, phase: 'intro-question-max' });
                                    get().updateInstruction();
                                });
                            }
                        );
                    }
                );
            } else if (unitsValue > 0) {
                get().setFeedback(`${unitsValue}... Continue à cliquer sur VERT jusqu'à 9 !`);
            }
        }
        if (currentPhase === 'tutorial') {
            const unitsValue = newCols[0].value;
            if (unitsValue === 1) sequenceFeedback("Bravo !  Tu as cliqué sur le bouton VERT !  Tu as vu comme les lumière s’allument en même temps que les chiffres changent!");
            else if (unitsValue === 2) sequenceFeedback("Super !  Maintenant il y a DEUX ronds bleus !", "Deux belles billes ! Continue à cliquer sur VERT !");
            else if (unitsValue === 3) sequenceFeedback("Magnifique !  Essaie le bouton ROUGE (bouton ROUGE) maintenant !", "Le bouton ROUGE fait l'inverse du VERT ! Essaie-le !");
            else if (unitsValue > 3) {
                newCols[0].value = 3;
                set({ columns: newCols });
                get().setFeedback("Maintenant, clique sur le bouton ROUGE (bouton ROUGE) !");
                return;
            }
        } else if (phase === 'explore-units') {
            const unitsValue = newCols[0].value;
            if (unitsValue === 1) sequenceFeedback("UN");
            else if (unitsValue === 2) sequenceFeedback("DEUX,Clique sur le bouton vert !");
            else if (unitsValue === 3) {
                sequenceFeedback("TROIS !", `Clique sur VERT pour continuer !`, () => {
                    set({ phase: 'click-add', feedback: "Bravo ! Continuons jusqu'à 9 ! Clique sur VERT !" });
                    get().updateButtonVisibility();
                });
            } else if (unitsValue > 3) {
                newCols[0].value = 3;
                set({ columns: newCols });
                get().setFeedback("Attends le signal pour continuer !");
                return;
            }
        } else if (phase === 'click-add') {
            const nextValue = newCols[idx].value;
            if (nextValue > 9) {
                newCols[idx].value = 9;
                set({ columns: newCols });
                get().speakAndThen("Parfait !  Tu as atteint 9 ! Maintenant clique sur bouton ROUGE pour descendre à zéro !", () => {
                    set({ phase: 'click-remove' });
                    get().updateButtonVisibility();
                    get().setFeedback("Super ! Clique sur bouton ROUGE pour enlever les billes jusqu'à zéro !");
                });
                return;
            }
            if (nextValue === 9) {
                set({ isTransitioningToChallenge: true, addClicks: addClicks + 1 });
                sequenceFeedback("Magnifique !  Tu as atteint 9 !", "Tu es prêt pour l'évaluation !", () => {
                    // Keep units unlocked for challenges
                    const resetCols = initialColumns.map(col => ({ ...col }));
                    resetCols[0].unlocked = true;
                    resetUnitChallenge();
                    set({
                        columns: resetCols,
                        addClicks: 0,
                        isTransitioningToChallenge: false
                    });
                    //get().setPhase('challenge-unit-1');
                    get().setFeedback(` Affiche le nombre ${UNIT_CHALLENGES[0].targets[0]} avec les boutons, puis clique sur VALIDER !`);
                });
                return;
            }
            set({ addClicks: addClicks + 1 });
            if (nextValue >= 4 && nextValue <= 8) get().setFeedback(`${nextValue} ! Continue avec VERT !`);
            else get().setFeedback(`Maintenant ${nextValue} ! Clique sur VERT !`);
            setTimeout(() => get().setFeedback(`${nextValue} billes. Continue avec VERT !`), FEEDBACK_DELAY);
        } else if (phase.startsWith('challenge-unit-')) {
            const challengeIndex = parseInt(phase.split('-')[2]) - 1;
            const challenge = UNIT_CHALLENGES[challengeIndex];
            const targetNumber = challenge.targets[get().unitTargetIndex];
            if (newCols[0].value > targetNumber) {
                get().setFeedback(`Oups ! Tu as dépassé ${targetNumber}. Utilise bouton ROUGE pour revenir à ${targetNumber} !`);
                return;
            }
        } else if (phase === 'learn-carry') {
            // Provide feedback during counting to 9
            const currentValue = newCols[0].value;
            if (hasCarry) {
                // The magic moment when 9+1 becomes 10!
                sequenceFeedback("INCROYABLE ! 🎆 C'est de la MAGIE ! Les 10 petites lumières se sont TRANSFORMÉES en UNE grosse lumière !", "Tu as vu ? C'est comme si elles avaient VOYAGÉ dans la colonne de gauche ! 10 petites = 1 grosse !", () => {
                    // Go directly to learn-ten-to-twenty without repetitive practice
                    const startCols = initialColumns.map((col, i) => ({ ...col, unlocked: i <= 1 }));
                    startCols[1].value = 1;
                    startCols[0].value = 0;
                    set({
                        columns: startCols,
                        phase: 'learn-ten-to-twenty'
                    });
                    get().updateButtonVisibility();
                    get().updateInstruction();
                });
            } else if (currentValue === 9) {
                // Child is at 9, one more click will trigger the magic!
                get().speakAndThen("Parfait ! Tu es à 9 !  Encore UN clic sur VERT et... la MAGIE va opérer ! ");
            } else if (currentValue >= 1 && currentValue <= 8) {
                // Counting to 9
                const remaining = 9 - currentValue;
                get().speakAndThen(`${currentValue} ! Continue ! Encore ${remaining} clic${remaining > 1 ? 's' : ''} pour arriver à 9 ! `);
            } else if (currentValue === 0) {
                // Just started
                get().speakAndThen("Vas-y ! Clique sur VERT pour commencer à compter jusqu'à 9 ! 🚀");
            }
        } else if (phase === 'practice-ten') {
            // This phase is now skipped - transition directly to learn-ten-to-twenty
            // If we somehow end up here, move to the next phase
            const startCols = initialColumns.map((col, i) => ({ ...col, unlocked: i <= 1 }));
            startCols[1].value = 1;
            startCols[0].value = 0;
            set({
                columns: startCols,
                phase: 'learn-ten-to-twenty'
            });
            get().updateButtonVisibility();
            get().updateInstruction();
        } else if (phase === 'learn-ten-to-twenty') {
            const unitsValue = newCols[0].value;
            const tensValue = newCols[1].value;

            if (!isUnitsColumn(idx)) {
                get().speakAndThen("Non ! Clique sur les UNITÉS (VERT sur la colonne de droite) !");
                const revertCols = [...columns];
                set({ columns: revertCols });
                return;
            }

            if (unitsValue === 0 && tensValue === 2) {
                // Reached 20!
                sequenceFeedback(" VINGT ! 2 grosses lumières de 10 !", " BRAVO ! Tu as compris la COMBINAISON ! 10 + 1 = 11, 10 + 2 = 12... jusqu'à 10 + 10 = 20 ! C'est comme assembler des LEGO ! 🧱");
                setTimeout(() => {
                    const resetCols = initialColumns.map((col, i) => ({ ...col, unlocked: i === 0 || i === 1 }));
                    set({
                        columns: resetCols
                    });
                    get().resetTenToTwentyChallenge();
                    //get().setPhase('challenge-ten-to-twenty');
                    get().speakAndThen(` Mini-défi ! Montre-moi DOUZE (12) avec les boutons !`);
                }, FEEDBACK_DELAY * 2);
            } else if (unitsValue === 1 && tensValue === 1) {
                get().speakAndThen("ONZE ! C'est 10 + 1. Tu vois la COMBINAISON ? Continue ! VERT");
            } else if (unitsValue === 2 && tensValue === 1) {
                get().speakAndThen("DOUZE ! 10 + 2. Tu assembles les lumières ! Encore ! VERT");
            } else if (unitsValue === 3 && tensValue === 1) {
                get().speakAndThen("TREIZE ! 10 + 3. Continue ! VERT");
            } else if (unitsValue === 4 && tensValue === 1) {
                get().speakAndThen("QUATORZE ! 10 + 4. Encore ! VERT");
            } else if (unitsValue === 5 && tensValue === 1) {
                get().speakAndThen("QUINZE ! 10 + 5. Continue ! VERT");
            } else if (unitsValue === 6 && tensValue === 1) {
                get().speakAndThen("SEIZE ! 10 + 6. Encore ! VERT");
            } else if (unitsValue === 7 && tensValue === 1) {
                get().speakAndThen("DIX-SEPT ! 10 + 7. Tu entends le DIX dans le nom ? VERT");
            } else if (unitsValue === 8 && tensValue === 1) {
                get().speakAndThen("DIX-HUIT ! 10 + 8. Continue ! VERT");
            } else if (unitsValue === 9 && tensValue === 1) {
                sequenceFeedback("DIX-NEUF ! 10 + 9 ! STOP ✋ Tout est presque plein !", "Que va-t-il se passer ? Clique sur VERT !");
            }
        } else if (phase.startsWith('challenge-ten-to-twenty')) {
            const challenge = TEN_TO_TWENTY_CHALLENGES[0];
            const targetNumber = challenge.targets[get().tenToTwentyTargetIndex];
            if (newCols.reduce((acc: number, col: Column, idx: number) => acc + col.value * Math.pow(10, idx), 0) > targetNumber) {
                get().setFeedback(`Oups ! Tu as dépassé ${targetNumber}. Utilise bouton ROUGE pour revenir à ${targetNumber} !`);
                return;
            }
        } else if (phase === 'learn-twenty-to-thirty') {
            const unitsValue = newCols[0].value;
            const tensValue = newCols[1].value;

            if (!isUnitsColumn(idx)) {
                get().speakAndThen("Non ! Continue avec les UNITÉS ! VERT sur la colonne de droite !");
                const revertCols = [...columns];
                set({ columns: revertCols });
                return;
            }

            if (unitsValue === 0 && tensValue === 3) {
                // Reached 30!
                sequenceFeedback(" TRENTE ! TROIS paquets de 10 !", "Bravo !  Tu as compris que c'est le même principe que 9→10 et 19→20 !");
                setTimeout(() => {
                    const resetCols = initialColumns.map((col, i) => ({ ...col, unlocked: i === 0 || i === 1 }));
                    // Now move to intro-learn-tens to explain the concept before auto-counting
                    set({
                        columns: resetCols,
                        phase: 'intro-learn-tens',
                        showStartLearningButton: true
                    });
                    get().updateButtonVisibility();
                    get().updateInstruction();
                }, FEEDBACK_DELAY * 2);
            } else if (unitsValue === 1 && tensValue === 2) {
                get().speakAndThen("VINGT-ET-UN ! 20 + 1 ! Continue ! VERT");
            } else if (unitsValue === 2 && tensValue === 2) {
                get().speakAndThen("VINGT-DEUX ! Continue à remplir ! VERT");
            } else if (unitsValue === 3 && tensValue === 2) {
                get().speakAndThen("VINGT-TROIS ! C'est bien ! VERT");
            } else if (unitsValue === 4 && tensValue === 2) {
                get().speakAndThen("VINGT-QUATRE ! Continue ! VERT");
            } else if (unitsValue === 5 && tensValue === 2) {
                get().speakAndThen("VINGT-CINQ ! À mi-chemin vers 30 ! VERT");
            } else if (unitsValue === 6 && tensValue === 2) {
                get().speakAndThen("VINGT-SIX ! Encore quelques-uns ! VERT");
            } else if (unitsValue === 7 && tensValue === 2) {
                get().speakAndThen("VINGT-SEPT ! Presque à 29 ! VERT");
            } else if (unitsValue === 8 && tensValue === 2) {
                get().speakAndThen("VINGT-HUIT ! Encore un peu ! VERT");
            } else if (unitsValue === 9 && tensValue === 2) {
                sequenceFeedback("29 ! VINGT-NEUF ! Que va-t-il se passer ?", "Clique sur VERT pour découvrir !");
            }
        } else if (phase === 'practice-hundred') {
            const hundredsValue = newCols[2].value;
            const tensValue = newCols[1].value;
            const unitsValue = newCols[0].value;
            const { practiceHundredCount } = get();

            if (isUnitsColumn(idx) && hasCarry && hundredsValue === 1 && tensValue === 0 && unitsValue === 0) {
                const newRepetitions = practiceHundredCount + 1;
                set({ practiceHundredCount: newRepetitions });

                if (newRepetitions >= 3) {
                    sequenceFeedback("Parfait !  Tu as bien compris le concept de GRAND paquet de 100 !", "Maintenant on va compter AVEC ce grand paquet !");
                    setTimeout(() => {
                        const startCols = initialColumns.map((col, i) => ({ ...col, unlocked: i <= 2 }));
                        startCols[2].value = 1;
                        startCols[1].value = 0;
                        startCols[0].value = 0;
                        set({
                            columns: startCols,
                            phase: 'learn-hundred-to-hundred-ten'
                        });
                        get().updateButtonVisibility();
                        get().setFeedback("CENT ! Tu as 1 grand paquet ! Ajoute 1 bille ! VERT sur UNITÉS");
                    }, FEEDBACK_DELAY * 2);
                } else {
                    get().setFeedback("Encore !  Clique sur bouton ROUGE pour revenir à 99, puis refais la magie avec VERT !");
                }
            }
        } else if (phase === 'learn-hundred-to-hundred-ten') {
            const unitsValue = newCols[0].value;
            const tensValue = newCols[1].value;
            const hundredsValue = newCols[2].value;
            const number = hundredsValue * 100 + tensValue * 10 + unitsValue;

            if (!isUnitsColumn(idx)) {
                get().setFeedback("Non ! Clique sur les UNITÉS (VERT sur la colonne de droite) !");
                const revertCols = [...columns];
                set({ columns: revertCols });
                return;
            }

            // Now we go up to 120 instead of just 110
            if (unitsValue === 0 && tensValue === 2 && hundredsValue === 1) {
                // Reached 120!
                sequenceFeedback(" CENT-VINGT ! 1 GRAND paquet + 2 paquets de 10 !", " BRAVO ! Tu comprends maintenant la COMBINAISON : 100 + 10 + 10 = 120 ! C'est comme assembler des paquets ! ");
                setTimeout(() => {
                    const resetCols = initialColumns.map((col, i) => ({ ...col, unlocked: i <= 2 }));
                    set({
                        columns: resetCols,
                        phase: 'learn-hundred-ten-to-two-hundred'
                    });
                    get().updateButtonVisibility();
                    get().setFeedback("Maintenant tu peux pratiquer un peu si tu veux, monte vers 200 ! VERT");
                }, FEEDBACK_DELAY * 2);
            } else if (unitsValue === 1 && tensValue === 0 && hundredsValue === 1) {
                get().setFeedback("CENT-UN ! 100 + 1. C'est la COMBINAISON ! Continue ! VERT");
            } else if (unitsValue === 2 && tensValue === 0 && hundredsValue === 1) {
                get().setFeedback("CENT-DEUX ! 100 + 2. Continue ! VERT");
            } else if (unitsValue >= 3 && unitsValue <= 8 && tensValue === 0 && hundredsValue === 1) {
                get().setFeedback(`${number} ! C'est 100 + ${unitsValue}. Continue ! VERT`);
            } else if (unitsValue === 9 && tensValue === 0 && hundredsValue === 1) {
                sequenceFeedback("CENT-NEUF ! 100 + 9. Presque 10 billes !", "Clique sur VERT pour voir la transformation magique !");
            } else if (unitsValue === 0 && tensValue === 1 && hundredsValue === 1) {
                get().setFeedback("CENT-DIX ! 100 + 10. Les 10 billes sont devenues 1 paquet ! Continue ! VERT");
            } else if (tensValue === 1 && hundredsValue === 1 && unitsValue > 0) {
                get().setFeedback(`${number} ! C'est 100 + 10 + ${unitsValue}. Continue vers 120 ! VERT`);
            } else if (tensValue === 1 && hundredsValue === 1 && unitsValue === 9) {
                sequenceFeedback("CENT-DIX-NEUF ! 100 + 10 + 9 !", "Encore 1 clic et tu auras compris la combinaison ! VERT");
            }
        } else if (phase === 'learn-hundred-ten-to-two-hundred') {
            const unitsValue = newCols[0].value;
            const tensValue = newCols[1].value;
            const hundredsValue = newCols[2].value;
            const number = hundredsValue * 100 + tensValue * 10 + unitsValue;

            if (!isUnitsColumn(idx)) {
                get().setFeedback("Continue avec les UNITÉS pour l'instant ! VERT sur la colonne de droite !");
                const revertCols = [...columns];
                set({ columns: revertCols });
                return;
            }

            if (hundredsValue === 2 && tensValue === 0 && unitsValue === 0) {
                // Reached 200!
                sequenceFeedback(" DEUX-CENTS ! 2 grands paquets de 100 !", " Bravo ! Tu comprends maintenant que 100-200 = comme 0-100 mais décalé !");
                setTimeout(() => {
                    const resetCols = initialColumns.map((col, i) => ({ ...col, unlocked: i <= 2 }));
                    set({
                        columns: resetCols
                    });
                    get().resetHundredToTwoHundredChallenge();
                    //get().setPhase('challenge-hundred-to-two-hundred');
                    get().setFeedback(` Mini-défi ! Montre-moi ${HUNDRED_TO_TWO_HUNDRED_CHALLENGES[0].targets[0]} (CENT-DIX) !`);
                }, FEEDBACK_DELAY * 2);
            } else if (tensValue === 2 && unitsValue === 0) {
                get().setFeedback(`${number} ! CENT-VINGT ! 1 grand paquet + 2 paquets ! Continue vers 130 ! VERT`);
            } else if (tensValue === 3 && unitsValue === 0) {
                get().setFeedback(`${number} ! CENT-TRENTE ! → 140 ! VERT`);
            } else if (tensValue === 4 && unitsValue === 0) {
                get().setFeedback(`${number} ! CENT-QUARANTE ! → 150 ! VERT`);
            } else if (tensValue === 5 && unitsValue === 0) {
                get().setFeedback(`${number} ! CENT-CINQUANTE ! C'est la moitié de 100+100 ! → 160 ! VERT`);
            } else if (tensValue === 6 && unitsValue === 0) {
                get().setFeedback(`${number} ! CENT-SOIXANTE ! → 170 ! VERT`);
            } else if (tensValue === 7 && unitsValue === 0) {
                get().setFeedback(`${number} ! CENT-SOIXANTE-DIX ! → 180 ! VERT`);
            } else if (tensValue === 8 && unitsValue === 0) {
                get().setFeedback(`${number} ! CENT-QUATRE-VINGT ! → 190 ! VERT`);
            } else if (tensValue === 9 && unitsValue === 0) {
                get().setFeedback(`${number} ! CENT-QUATRE-VINGT-DIX ! Presque 200 ! Remplis jusqu'à 199 ! VERT`);
            } else if (tensValue === 9 && unitsValue === 9) {
                sequenceFeedback(`${number} ! CENT-QUATRE-VINGT-DIX-NEUF ! TOUT est plein !`, "Que va-t-il se passer ? VERT");
            } else {
                get().setFeedback(`${number} ! Continue ! VERT`);
            }
        } else if (phase.startsWith('challenge-hundred-to-two-hundred')) {
            const challenge = HUNDRED_TO_TWO_HUNDRED_CHALLENGES[0];
            const targetNumber = challenge.targets[get().hundredToTwoHundredTargetIndex];
            if (newCols.reduce((acc: number, col: Column, idx: number) => acc + col.value * Math.pow(10, idx), 0) > targetNumber) {
                get().setFeedback(`Oups ! Tu as dépassé ${targetNumber}. Utilise bouton ROUGE pour revenir à ${targetNumber} !`);
                return;
            }
        } else if (phase === 'learn-two-hundred-to-three-hundred') {
            const unitsValue = newCols[0].value;
            const tensValue = newCols[1].value;
            const hundredsValue = newCols[2].value;
            const number = hundredsValue * 100 + tensValue * 10 + unitsValue;

            if (!isUnitsColumn(idx)) {
                get().setFeedback("Continue avec les UNITÉS ! VERT sur la colonne de droite !");
                const revertCols = [...columns];
                set({ columns: revertCols });
                return;
            }

            if (hundredsValue === 3 && tensValue === 0 && unitsValue === 0) {
                // Reached 300!
                sequenceFeedback(" TROIS-CENTS ! TROIS grands paquets !", "Bravo !  Tu as compris le principe 99→100, 199→200, maintenant 299→300 !");
                setTimeout(() => {
                    const resetCols = initialColumns.map((col, i) => ({ ...col, unlocked: i <= 2 }));
                    set({
                        columns: resetCols
                    });
                    get().resetTwoHundredToThreeHundredChallenge();
                    // get().setPhase('challenge-two-hundred-to-three-hundred');
                    get().setFeedback(` Mini-défi ! Montre-moi ${TWO_HUNDRED_TO_THREE_HUNDRED_CHALLENGES[0].targets[0]} (DEUX-CENT-DIX) !`);
                }, FEEDBACK_DELAY * 2);
            } else if (number === 299) {
                sequenceFeedback("DEUX-CENT-QUATRE-VINGT-DIX-NEUF ! Regarde, TOUT est plein !", "Que va-t-il se passer ? VERT");
            } else if (number >= 200 && number < 299) {
                if (number % 10 === 0) {
                    get().setFeedback(`${number} ! Continue par dizaines ! VERT`);
                } else {
                    get().setFeedback(`${number} ! Continue à remplir ! VERT`);
                }
            }
        } else if (phase.startsWith('challenge-two-hundred-to-three-hundred')) {
            const challenge = TWO_HUNDRED_TO_THREE_HUNDRED_CHALLENGES[0];
            const targetNumber = challenge.targets[get().twoHundredToThreeHundredTargetIndex];
            if (newCols.reduce((acc: number, col: Column, idx: number) => acc + col.value * Math.pow(10, idx), 0) > targetNumber) {
                get().setFeedback(`Oups ! Tu as dépassé ${targetNumber}. Utilise bouton ROUGE pour revenir à ${targetNumber} !`);
                return;
            }
        } else if (phase === 'practice-thousand') {
            const thousandsValue = newCols[3].value;
            const hundredsValue = newCols[2].value;
            const tensValue = newCols[1].value;
            const unitsValue = newCols[0].value;
            const { practiceThousandCount } = get();

            if (isUnitsColumn(idx) && hasCarry && thousandsValue === 1 && hundredsValue === 0 && tensValue === 0 && unitsValue === 0) {
                const newRepetitions = practiceThousandCount + 1;
                set({ practiceThousandCount: newRepetitions });

                if (newRepetitions >= 5) {
                    sequenceFeedback("Parfait !  Tu as bien compris le concept d'ÉNORME paquet de 1000 !", "C'est MILLE ! Maintenant on va compter AVEC ce millier !");
                    setTimeout(() => {
                        const startCols = initialColumns.map((col) => ({ ...col, unlocked: true }));
                        startCols[3].value = 1;
                        startCols[2].value = 0;
                        startCols[1].value = 0;
                        startCols[0].value = 0;
                        set({
                            columns: startCols,
                            phase: 'learn-thousand-to-thousand-ten'
                        });
                        get().updateButtonVisibility();
                        get().setFeedback("MILLE ! Tu as 1 ÉNORME paquet ! Ajoute 1 bille ! VERT sur UNITÉS");
                    }, FEEDBACK_DELAY * 2);
                } else {
                    get().setFeedback(`Encore ! (${newRepetitions}/5)  Clique sur bouton ROUGE pour revenir à 999, puis refais la magie avec VERT !`);
                }
            }
        } else if (phase === 'learn-thousand-to-thousand-ten') {
            const unitsValue = newCols[0].value;
            const tensValue = newCols[1].value;
            const hundredsValue = newCols[2].value;
            const thousandsValue = newCols[3].value;
            const number = thousandsValue * 1000 + hundredsValue * 100 + tensValue * 10 + unitsValue;

            if (!isUnitsColumn(idx)) {
                get().setFeedback("Non ! Clique sur les UNITÉS (VERT sur la colonne de droite) !");
                const revertCols = [...columns];
                set({ columns: revertCols });
                return;
            }

            // Now we go up to 1020 instead of just 1010
            if (number === 1020) {
                sequenceFeedback(" MILLE-VINGT ! 1 ÉNORME paquet + 2 paquets de 10 !", " BRAVO ! Tu comprends la COMBINAISON avec les milliers ! 1000 + 10 + 10 = 1020 ! C'est comme les centaines, mais ENCORE plus grand ! ");
                setTimeout(() => {
                    const startCols = initialColumns.map((col) => ({ ...col, unlocked: true }));
                    startCols[3].value = 1;
                    startCols[1].value = 2;
                    startCols[0].value = 0;
                    set({
                        columns: startCols,
                        phase: 'learn-thousand-to-thousand-hundred'
                    });
                    get().updateButtonVisibility();
                    get().setFeedback("MILLE-VINGT ! Maintenant tu peux pratiquer si tu veux, monte à 1100 ! VERT");
                }, FEEDBACK_DELAY * 2);
            } else if (number === 1001) {
                get().setFeedback("MILLE-UN ! C'est 1000 + 1. Tu vois la COMBINAISON ? Continue ! VERT");
            } else if (number === 1002) {
                get().setFeedback("MILLE-DEUX ! 1000 + 2. Continue ! VERT");
            } else if (number >= 1003 && number <= 1008) {
                const units = number - 1000;
                get().setFeedback(`${number} ! C'est 1000 + ${units}. Continue ! VERT`);
            } else if (number === 1009) {
                sequenceFeedback("MILLE-NEUF ! 1000 + 9. Presque 10 billes !", "Clique sur VERT pour voir la transformation !");
            } else if (number === 1010) {
                get().setFeedback("MILLE-DIX ! 1000 + 10. Les 10 billes sont devenues 1 paquet ! Continue ! VERT");
            } else if (number > 1010 && number < 1020) {
                const afterThousandAndTen = number - 1010;
                get().setFeedback(`${number} ! C'est 1000 + 10 + ${afterThousandAndTen}. Continue vers 1020 ! VERT`);
            } else if (number === 1019) {
                sequenceFeedback("MILLE-DIX-NEUF ! 1000 + 10 + 9 !", "Encore 1 clic et tu auras compris la combinaison ! VERT");
            }
        } else if (phase === 'learn-thousand-to-thousand-hundred') {
            const unitsValue = newCols[0].value;
            const tensValue = newCols[1].value;
            const hundredsValue = newCols[2].value;
            const thousandsValue = newCols[3].value;
            const number = thousandsValue * 1000 + hundredsValue * 100 + tensValue * 10 + unitsValue;

            if (!isUnitsColumn(idx)) {
                get().setFeedback("Continue avec les UNITÉS pour l'instant ! VERT sur la colonne de droite !");
                const revertCols = [...columns];
                set({ columns: revertCols });
                return;
            }

            if (number === 1100) {
                sequenceFeedback(" MILLE-CENT ! 1 énorme paquet + 1 grand paquet !", " Bravo ! Tu maîtrises 1000-1100 !");
                setTimeout(() => {
                    const startCols = initialColumns.map((col) => ({ ...col, unlocked: true }));
                    startCols[3].value = 1;
                    startCols[2].value = 1;
                    startCols[0].value = 0;
                    set({
                        columns: startCols,
                        phase: 'learn-thousand-hundred-to-two-thousand'
                    });
                    get().updateButtonVisibility();
                    get().setFeedback("MILLE-CENT ! Maintenant monte jusqu'à 2000 ! VERT sur UNITÉS");
                }, FEEDBACK_DELAY * 2);
            } else if (number % 10 === 0 && number >= 1010 && number < 1100) {
                const tens = Math.floor((number % 100) / 10);
                const tensWords = ["", "DIX", "VINGT", "TRENTE", "QUARANTE", "CINQUANTE", "SOIXANTE", "SOIXANTE-DIX", "QUATRE-VINGT", "QUATRE-VINGT-DIX"];
                get().setFeedback(`MILLE-${tensWords[tens]} ! 1 énorme + ${tens} paquets ! Continue ! VERT`);
            } else if (number >= 1010 && number < 1100) {
                get().setFeedback(`${number} ! Continue à remplir ! VERT`);
            }
        } else if (phase === 'learn-thousand-hundred-to-two-thousand') {
            const unitsValue = newCols[0].value;
            const tensValue = newCols[1].value;
            const hundredsValue = newCols[2].value;
            const thousandsValue = newCols[3].value;
            const number = thousandsValue * 1000 + hundredsValue * 100 + tensValue * 10 + unitsValue;

            if (!isUnitsColumn(idx)) {
                get().setFeedback("Continue avec les UNITÉS pour l'instant ! VERT");
                const revertCols = [...columns];
                set({ columns: revertCols });
                return;
            }

            if (number === 2000) {
                sequenceFeedback(" DEUX-MILLE ! 2 ÉNORMES paquets !", "🎆 Incroyable ! Tu comprends maintenant que 1000-2000 = comme 0-1000 mais décalé !");
                setTimeout(() => {
                    const resetCols = initialColumns.map((col) => ({ ...col, unlocked: true }));
                    set({
                        columns: resetCols
                    });
                    get().resetThousandToTwoThousandChallenge();
                    //get().setPhase('challenge-thousand-to-two-thousand');
                    get().setFeedback(` Mini-défis 1000-2000 ! Montre-moi ${THOUSAND_TO_TWO_THOUSAND_CHALLENGES[0].targets[0]} (MILLE-UN) !`);
                }, FEEDBACK_DELAY * 2);
            } else if (number === 1999) {
                sequenceFeedback("MILLE-NEUF-CENT-QUATRE-VINGT-DIX-NEUF ! TOUT est plein !", "VERT pour la magie !");
            } else if (number >= 1100 && number < 2000) {
                if (number % 100 === 0) {
                    const hundreds = Math.floor((number % 1000) / 100);
                    const hundredsWords = ["", "CENT", "DEUX-CENTS", "TROIS-CENTS", "QUATRE-CENTS", "CINQ-CENTS", "SIX-CENTS", "SEPT-CENTS", "HUIT-CENTS", "NEUF-CENTS"];
                    get().setFeedback(`MILLE-${hundredsWords[hundreds]} ! Continue ! VERT`);
                } else {
                    get().setFeedback(`${number} ! Continue à remplir ! VERT`);
                }
            }
        } else if (phase.startsWith('challenge-thousand-to-two-thousand')) {
            const challenge = THOUSAND_TO_TWO_THOUSAND_CHALLENGES[0];
            const targetNumber = challenge.targets[get().thousandToTwoThousandTargetIndex];
            if (newCols.reduce((acc: number, col: Column, idx: number) => acc + col.value * Math.pow(10, idx), 0) > targetNumber) {
                get().setFeedback(`Oups ! Tu as dépassé ${targetNumber}. Utilise bouton ROUGE pour revenir à ${targetNumber} !`);
                return;
            }
        } else if (phase === 'learn-two-thousand-to-three-thousand') {
            const unitsValue = newCols[0].value;
            const tensValue = newCols[1].value;
            const hundredsValue = newCols[2].value;
            const thousandsValue = newCols[3].value;
            const number = thousandsValue * 1000 + hundredsValue * 100 + tensValue * 10 + unitsValue;

            if (!isUnitsColumn(idx)) {
                get().setFeedback("Continue avec les UNITÉS ! VERT");
                const revertCols = [...columns];
                set({ columns: revertCols });
                return;
            }

            if (number === 3000) {
                sequenceFeedback(" TROIS-MILLE ! TROIS ÉNORMES paquets !", "Bravo !  Tu as compris le principe 999→1000, 1999→2000, maintenant 2999→3000 !");
                setTimeout(() => {
                    const resetCols = initialColumns.map((col) => ({ ...col, unlocked: true }));
                    set({
                        columns: resetCols
                    });
                    get().resetTwoThousandToThreeThousandChallenge();
                    //get().setPhase('challenge-two-thousand-to-three-thousand');
                    get().setFeedback(` Mini-défi ! Montre-moi ${TWO_THOUSAND_TO_THREE_THOUSAND_CHALLENGES[0].targets[0]} (DEUX-MILLE) !`);
                }, FEEDBACK_DELAY * 2);
            } else if (number === 2999) {
                sequenceFeedback("DEUX-MILLE-NEUF-CENT-QUATRE-VINGT-DIX-NEUF ! Regarde, TOUT est plein !", "Que va-t-il se passer ? VERT");
            } else if (number >= 2000 && number < 3000) {
                if (number === 2500) {
                    get().setFeedback(`DEUX-MILLE-CINQ-CENTS ! À mi-chemin ! Continue ! VERT`);
                } else if (number === 2900) {
                    get().setFeedback(`DEUX-MILLE-NEUF-CENTS ! Remplis tout jusqu'à 2999 ! VERT`);
                } else if (number % 100 === 0) {
                    get().setFeedback(`${number} ! Continue ! VERT`);
                } else {
                    get().setFeedback(`${number} ! Continue à remplir ! VERT`);
                }
            }
        } else if (phase.startsWith('challenge-two-thousand-to-three-thousand')) {
            const challenge = TWO_THOUSAND_TO_THREE_THOUSAND_CHALLENGES[0];
            const targetNumber = challenge.targets[get().twoThousandToThreeThousandTargetIndex];
            if (newCols.reduce((acc: number, col: Column, idx: number) => acc + col.value * Math.pow(10, idx), 0) > targetNumber) {
                get().setFeedback(`Oups ! Tu as dépassé ${targetNumber}. Utilise bouton ROUGE pour revenir à ${targetNumber} !`);
                return;
            }
        } else if (phase.startsWith('challenge-thousands-simple-combination')) {
            const challenge = THOUSANDS_SIMPLE_COMBINATION_CHALLENGES[0];
            const targetNumber = challenge.targets[get().thousandsSimpleCombinationTargetIndex];
            if (newCols.reduce((acc: number, col: Column, idx: number) => acc + col.value * Math.pow(10, idx), 0) > targetNumber) {
                get().setFeedback(`Oups ! Tu as dépassé ${targetNumber}. Utilise bouton ROUGE pour revenir à ${targetNumber} !`);
                return;
            }
        } else if (phase === 'normal' && hasCarry) {
            get().setFeedback("Échange magique ! 10 billes → 1 bille dans la colonne de gauche ! ");
        } else if (phase === 'normal' || phase === 'done' || phase === 'learn-units') {
            get().setFeedback(`🎈 ${newCols[idx].value} bille${newCols[idx].value > 1 ? 's' : ''} dans ${newCols[idx].name}. Clique sur VERT ou bouton ROUGE !`);
        }
    },

    handleSubtract: (idx: number) => {
        const { isCountingAutomatically, pendingAutoCount, phase, columns, guidedMode, currentTarget } = get();
        const totalNumber = columns.reduce((acc: number, col: Column, idx: number) => acc + col.value * Math.pow(10, idx), 0);
        const { sequenceFeedback } = get();

        if (isCountingAutomatically || pendingAutoCount) return;

        // Handle simplified tutorial step 1 - button discovery
        if (phase === 'didacticiel-step1-buttons') {
            if (idx === 0) {
                get().handleDidacticielStep1ButtonClick('down');
            }
            return;
        }

        const isUnitsColumn = (i: number) => i === 0;

        // Handle guided mode - check if this is the correct column to click
        if (guidedMode) {
            const currentValues = [columns[0].value, columns[1].value, columns[2].value, columns[3].value];
            const nextStep = getNextGuidedStep(currentTarget, currentValues);

            if (nextStep && nextStep.columnIndex === idx && nextStep.action === 'decrease') {
                // Correct click! Decrement the column
                const newCols = [...columns];
                newCols[idx].value--;
                set({ columns: newCols });

                // Check if this column is now complete
                const updatedValues = [newCols[0].value, newCols[1].value, newCols[2].value, newCols[3].value];
                const decomp = decomposeNumber(currentTarget);
                const targetArray = [decomp.units, decomp.tens, decomp.hundreds, decomp.thousands];

                if (updatedValues[idx] === targetArray[idx]) {
                    // Column complete! Move to next step
                    setTimeout(() => {
                        get().advanceGuidedStep();
                    }, 500);
                } else {
                    // Show progress feedback
                    const remaining = targetArray[idx] - updatedValues[idx];
                    get().setFeedback(getGuidedClickFeedback(Math.abs(remaining)));
                }
                return;
            } else if (nextStep) {
                // Wrong column or action
                if (nextStep.action === 'increase') {
                    get().setFeedback(`Non, il faut AUGMENTER cette colonne ! \nClique sur VERT dans la colonne ${nextStep.columnName} !`);
                } else {
                    get().setFeedback(`Non, pas là ! \nClique sur bouton ROUGE dans la colonne ${nextStep.columnName} !`);
                }
                return;
            }
        }

        // Handle new intro phases
        if (phase === 'intro-discover-carry') {
            if (idx === 0 && columns[0].value === 0 && columns[1].value > 0) {
                // Borrow from tens
                const newCols = [...columns];
                newCols[1].value--;
                newCols[0].value = 9;
                set({ columns: newCols });

                setTimeout(() => {
                    sequenceFeedback(
                        "Tu as vu ? La GROSSE lumière est redevenue 10 PETITES !",
                        "C'est INCROYABLE ! 🎪 Refais l'aller-retour plusieurs fois pour bien comprendre !"
                    );
                    setTimeout(() => {
                        set({ feedback: "Alors, tu as compris le truc ?  Continue à explorer !" });
                        setTimeout(() => {
                            set({ showInputField: true, phase: 'intro-count-digits' });
                            get().updateInstruction();
                        }, FEEDBACK_DELAY * 2);
                    }, FEEDBACK_DELAY);
                }, 500);
                return;
            } else if (idx === 0 && columns[0].value > 0) {
                const newCols = [...columns];
                newCols[0].value--;
                set({ columns: newCols });
                return;
            }
            return;
        } else if (phase === 'intro-first-interaction') {
            // Allow decrementing during first interaction
            if (idx === 0 && columns[0].value > 0) {
                const newCols = [...columns];
                newCols[0].value--;
                set({ columns: newCols });

                if (get().introClickCount === 9 && columns[0].value > 0) {
                    get().speakAndThen("Le bouton ROUGE enlève les lumières ! VERT ajoute, bouton ROUGE enlève ! C'est simple ! ", () => {
                        set({ showInputField: true, phase: 'intro-count-digits' });
                        get().updateInstruction();
                    })
                }
            }
            return;
        }

        const isAllowedColumn = () => {
            if (phase === 'normal') return true;
            if (isUnitsColumn(idx)) return true;
            if (phase === 'practice-ten' || phase === 'learn-ten-to-twenty' || phase === 'challenge-ten-to-twenty' || phase === 'learn-twenty-to-thirty') return isUnitsColumn(idx);
            if (phase === 'practice-hundred' || phase === 'learn-hundred-to-hundred-ten' || phase === 'learn-hundred-ten-to-two-hundred' || phase === 'challenge-hundred-to-two-hundred') return isUnitsColumn(idx);
            if (phase === 'learn-two-hundred-to-three-hundred' || phase === 'challenge-two-hundred-to-three-hundred') return isUnitsColumn(idx);
            if (idx === 1 && phase.startsWith('challenge-tens-')) return true;
            if ((idx === 1 || idx === 2) && phase.startsWith('challenge-hundreds-')) return true;
            if ((idx === 1 || idx === 2 || idx === 3) && (phase.startsWith('challenge-thousands-') || phase === 'challenge-thousands-simple-combination')) return true;
            return false;
        };

        if (!isAllowedColumn()) {
            get().setFeedback("Concentrons-nous sur les colonnes actives pour l'instant !");
            return;
        }

        if (totalNumber <= 0) {
            sequenceFeedback("C'est ZÉRO (0) !  Il n'y a plus rien. On ne peut pas descendre plus bas !", "ZÉRO = aucune bille, aucune quantité !");
            return;
        }

        const newCols = JSON.parse(JSON.stringify(columns));
        const tempTotalBefore = totalNumber;
        let hasBorrow = false;

        if (newCols[idx].value > 0) {
            newCols[idx].value--;
        } else {
            let sourceIdx = idx + 1;
            while (sourceIdx < newCols.length && newCols[sourceIdx].value === 0) {
                sourceIdx++;
            }
            if (sourceIdx < newCols.length) {
                newCols[sourceIdx].value--;
                hasBorrow = true;
                for (let i = sourceIdx - 1; i >= idx; i--) {
                    newCols[i].value = 9;
                }
            }
        }

        if (tempTotalBefore > 0) {
            set({ columns: newCols });
            if (phase === 'practice-ten' && newCols[0].value === 9 && newCols[1].value === 0) {
                // This phase is now skipped, but keep feedback just in case
                get().speakAndThen("Bien ! Tu es revenu à 9. Maintenant, refais la magie ! Clique sur VERT pour voir la transformation !");
            } else if (phase === 'practice-hundred' && newCols[0].value === 9 && newCols[1].value === 9 && newCols[2].value === 0) {
                get().setFeedback("Bien ! Tu es revenu à 99. Maintenant, refais la magie ! Clique sur VERT pour voir 100 !");
            } else if (phase === 'practice-thousand' && newCols[0].value === 9 && newCols[1].value === 9 && newCols[2].value === 9 && newCols[3].value === 0) {
                get().setFeedback("Bien ! Tu es revenu à 999. Maintenant, refais la magie ! Clique sur VERT pour voir 1000 !");
            } else if (phase === 'learn-ten-to-twenty') {
                get().speakAndThen("On ne descend pas ! Continue à monter avec VERT sur UNITÉS !");
            } else if (phase === 'learn-twenty-to-thirty') {
                get().speakAndThen("On ne descend pas ! Continue à monter avec VERT sur UNITÉS !");
            } else if (phase === 'learn-hundred-to-hundred-ten') {
                get().speakAndThen("On ne descend pas ! Continue à monter avec VERT sur UNITÉS !");
            } else if (phase === 'learn-hundred-ten-to-two-hundred') {
                get().speakAndThen("On ne descend pas ! Continue à monter avec VERT sur UNITÉS !");
            } else if (phase === 'learn-two-hundred-to-three-hundred') {
                get().speakAndThen("On ne descend pas ! Continue à monter avec VERT sur UNITÉS !");
            } else if (phase === 'learn-thousand-to-thousand-ten') {
                get().speakAndThen("On ne descend pas ! Continue à monter avec VERT sur UNITÉS !");
            } else if (phase === 'learn-thousand-to-thousand-hundred') {
                get().speakAndThen("On ne descend pas ! Continue à monter avec VERT sur UNITÉS !");
            } else if (phase === 'learn-thousand-hundred-to-two-thousand') {
                get().speakAndThen("On ne descend pas ! Continue à monter avec VERT sur UNITÉS !");
            } else if (phase === 'learn-two-thousand-to-three-thousand') {
                get().setFeedback("On ne descend pas ! Continue à monter avec VERT sur UNITÉS !");
            } else if (!['click-remove', 'tutorial', 'explore-units'].includes(phase) && !phase.startsWith('challenge-unit-') && phase !== 'challenge-ten-to-twenty') {
                get().setFeedback(`🎈 ${newCols[idx].value} bille${newCols[idx].value > 1 ? 's' : ''} dans ${newCols[idx].name}. Clique sur VERT ou bouton ROUGE !`);
            }
        }

        if (phase === 'tutorial') {
            const unitsValue = newCols[0].value;
            if (unitsValue === 2) sequenceFeedback("Génial ! 🎈 Le bouton ROUGE enlève une bille ! Il en reste deux !", "VERT ajoute, ROUGE enlève. Facile ! Clique encore sur bouton ROUGE !");
            else if (unitsValue === 1) sequenceFeedback("Bravo ! Clique encore sur ROUGE pour tout enlever !", "Plus qu'une bille ! Un dernier clic !");
            else {
                console.log('[DEBUG] (TUTORIAL) unitsValue:', unitsValue, 'tempTotalBefore:', tempTotalBefore, 'phase:', phase);
                if (unitsValue === 0 && tempTotalBefore === 1) {
                    const newCols = initialColumns.map(col => ({ ...col }));
                    newCols[0].unlocked = true;

                    // get().setPhase('tutorial-challenge');
                    set({
                        columns: newCols,
                        tutorialChallengeTargetIndex: 0,
                        tutorialChallengeSuccessCount: 0
                    });
                    get().resetTutorialChallenge();
                    get().updateInstruction();
                    //sequenceFeedback("Maintenant, un petit défi pour apprendre comment ça marche ! ", "Tu vas voir ce qui se passe quand tu gagnes et quand tu perds !");

                } else if (unitsValue > 0) {
                    sequenceFeedback(`Bien joué ! Continue à cliquer sur ROUGE !`, "Le bouton ROUGE retire une bille à chaque fois !");
                }
            }
        } else if (phase === 'explore-units' && newCols[0].value < columns[0].value) {
            get().setFeedback("On n'enlève pas encore ! Clique sur VERT pour ajouter !");
        } else if (phase === 'click-remove' && isUnitsColumn(idx)) {
            const unitsValue = newCols[0].value;
            if (unitsValue === 5) sequenceFeedback(`${unitsValue} (CINQ) ! ✋ Une main entière !`, `Bien joué ! Continue avec bouton ROUGE !`);
            else if (unitsValue === 3) sequenceFeedback(`${unitsValue} (TROIS) ! 🎈`, `Continue vers zéro avec bouton ROUGE !`);
            else if (unitsValue === 2) sequenceFeedback(`${unitsValue} (DEUX) ! ✌️`, `Presque à zéro ! Continue avec bouton ROUGE !`);
            else if (unitsValue === 1) sequenceFeedback(`${unitsValue} (UN) ! 👆`, `Presque à ZÉRO ! Un dernier clic !`);
            else if (unitsValue === 0 && tempTotalBefore === 1) {
                sequenceFeedback("ZÉRO (0) !  Plus rien ! On est revenu au début !", "Fantastique ! Tu maîtrises les nombres de 0 à 9 !");
                setTimeout(() => {
                    // Keep units unlocked for challenges
                    const newCols = initialColumns.map(col => ({ ...col }));
                    newCols[0].unlocked = true;
                    set({
                        columns: newCols
                    });
                    //  get().setPhase('challenge-unit-intro');
                }, FEEDBACK_DELAY);
            } else if (unitsValue > 0) {
                sequenceFeedback(`${unitsValue} ! Baisse un doigt !`, `${unitsValue} doigts levés. Continue avec bouton ROUGE !`);
            }
        } else if (phase === 'normal' && hasBorrow) {
            get().setFeedback("🔄 Emprunt magique ! Continue avec bouton ROUGE si nécessaire !");
        }
    },
    handleSetValue: (value: string | number) => {
        const { columns } = get();
        const strValue = value.toString().padStart(4, '0');
        const newCols = [...columns];
        for (let i = 0; i < 4; i++) {
            const digit = parseInt(strValue[3 - i], 10);
            newCols[i].value = isNaN(digit) ? 0 : Math.max(0, Math.min(9, digit));
        }
        set({ columns: newCols });
    },

    handleValidateTutorialChallenge: () => {
        console.log('[DEBUG] handleValidateTutorialChallenge appelée');
        const { phase, columns, tutorialChallengeTargetIndex, speakAndThen, resetAttempts, setCurrentTarget } = get();

        if (phase !== 'tutorial-challenge') return;

        const totalNumber = columns.reduce((acc: number, col: Column, idx: number) => {
            return acc + (col.value * Math.pow(10, idx));
        }, 0);

        const targetNumber = TUTORIAL_CHALLENGE.targets[tutorialChallengeTargetIndex];

        // Set current target for help system
        setCurrentTarget(targetNumber);

        if (totalNumber === targetNumber) {
            // SUCCESS! Show what happens when you win
            sendCorrectValue();

            speakAndThen(" BRAVO ! TU AS RÉUSSI ! ", () => {
                speakAndThen("Quand tu GAGNES, tu vois des félicitations ! ", () => {
                    speakAndThen("C'est comme ça que ça marche dans les défis ! Tu affiches le bon nombre, tu cliques sur VALIDER, et si c'est correct, tu passes au suivant ! ", () => {
                        resetAttempts();

                        // Transition to learn-units
                        const newCols = initialColumns.map((col, i) => ({ ...col, unlocked: i === 0 || i === 1 }));
                        set({
                            columns: newCols,
                            nextPhaseAfterAuto: 'click-add',
                            pendingAutoCount: true,
                            isCountingAutomatically: false
                        });
                        // get().setPhase('learn-units');
                        get().updateInstruction();
                    });
                });
            });
        } else {
            // FAILURE - Show what happens when you lose (but be encouraging)
            sendWrongValue();

            speakAndThen("Ce n'est pas le bon nombre ! ", () => {
                speakAndThen(`Quand tu te TROMPES, on te dit que ce n'est pas correct. 💭 Le nombre demandé était ${targetNumber}, mais tu as affiché ${totalNumber}.`, () => {
                    speakAndThen("Mais pas de panique ! Tu peux RÉESSAYER autant de fois que tu veux ! 🔄", () => {
                        speakAndThen(`Essaie encore ! Affiche ${targetNumber} et clique sur VALIDER ! `, () => {
                            // Reset columns to let them try again
                            const resetCols = initialColumns.map(col => ({ ...col }));
                            resetCols[0].unlocked = true;
                            set({ columns: resetCols });
                        });
                    });
                });
            });
        }
    },

    handleValidateLearning: () => {
        const { phase, columns, unitTargetIndex, unitSuccessCount, resetUnitChallenge, attemptCount, consecutiveFailures, resetAttempts, setAttemptCount, setConsecutiveFailures, setShowHelpOptions, totalChallengesCompleted, setTotalChallengesCompleted, setCurrentTarget } = get();
        const challengePhases = ['challenge-unit-1', 'challenge-unit-2', 'challenge-unit-3'] as const;
        const challengeIndex = challengePhases.indexOf(phase as typeof challengePhases[number]);
        if (challengeIndex === -1) return;

        const challenge = UNIT_CHALLENGES[challengeIndex];

        console.log('Validating learning challenge:', phase);
        const targetNumber = challenge.targets[unitTargetIndex];
        const currentNumber = columns[0].value;

        // Set current target for help system
        setCurrentTarget(targetNumber);

        if (currentNumber === targetNumber) {
            // SUCCESS!
            // Send correct value message to Unity
            sendCorrectValue();

            const successMsg = getSuccessMessage(attemptCount + 1, false);
            const { speakAndThen } = get();
            speakAndThen(successMsg, () => {
                // Reset attempts and update stats
                resetAttempts();
                setConsecutiveFailures(0);
                setTotalChallengesCompleted(totalChallengesCompleted + 1);

                const newSuccessCount = unitSuccessCount + 1;
                set({ unitSuccessCount: newSuccessCount });

                if (unitTargetIndex + 1 >= challenge.targets.length) {
                    if (challengeIndex === UNIT_CHALLENGES.length - 1) {
                        // All unit challenges completed - commented out transition
                        
                        // Reset units column to 0 so child can start from the beginning
                        const resetCols = get().columns.map((col, i) =>
                            i === 0 ? { ...col, value: 0 } : col
                        );
                        set({
                            columns: resetCols,
                            phase: 'learn-carry'
                        });
                        get().updateButtonVisibility();
                       // sequenceFeedback("Prêt pour la magie ?  Tu vas voir l'échange 10 pour 1 !", "D'abord, compte jusqu'à 9 en cliquant sur VERT. Ensuite, la magie va opérer ! ");
                        
                    } else {
                        // Moving to next challenge phase - do NOT call sendNextGoal() 
                        // because setPhase will send a new challenge list to Unity

                        // Keep units unlocked for challenges
                        const resetCols = initialColumns.map(col => ({ ...col }));
                        resetCols[0].unlocked = true;
                        resetUnitChallenge();
                        const nextPhase = challengePhases[challengeIndex + 1];
                        set({
                            columns: resetCols
                        });
                        get().setPhase(nextPhase);
                        get().setFeedback(`Affiche le nombre ${UNIT_CHALLENGES[challengeIndex + 1].targets[0]} puis clique sur VALIDER !`);
                    }
                } else {
                    // Send next goal message to Unity
                    sendNextGoal();

                    // Keep units unlocked for challenges
                    const resetCols = initialColumns.map(col => ({ ...col }));
                    resetCols[0].unlocked = true;
                    set({
                        columns: resetCols,
                        unitTargetIndex: unitTargetIndex + 1
                    });
                    get().updateInstruction();
                    get().setFeedback(` Affiche le nombre ${challenge.targets[unitTargetIndex + 1]} puis clique sur VALIDER !`);
                }
            });
        } else {
            // FAILURE - Generate progressive feedback
            // Send wrong value message to Unity
            sendWrongValue();

            const newAttemptCount = attemptCount + 1;
            setAttemptCount(newAttemptCount);

            const feedbackMsg = generateFeedback({
                attemptCount: newAttemptCount,
                consecutiveFailures,
                frustrationLevel: detectFrustration(consecutiveFailures),
                currentTarget: targetNumber,
                lastUserAnswer: currentNumber
            });

            get().setFeedback(feedbackMsg.message);

            // Show help options on 4th attempt
            if (feedbackMsg.showHelp) {
                setShowHelpOptions(true);
            }

            // If too many attempts, increase consecutive failures
            if (newAttemptCount >= 4) {
                const newConsecutiveFailures = consecutiveFailures + 1;
                setConsecutiveFailures(newConsecutiveFailures);

                // Check for high frustration
                if (newConsecutiveFailures >= 3) {
                    setTimeout(() => {
                        get().setFeedback(getFrustrationInterventionMessage());
                    }, FEEDBACK_DELAY * 2);
                }
            }
        }
    },

    handleValidateTenToTwenty: () => {
        const { phase, columns, tenToTwentyTargetIndex, tenToTwentySuccessCount, sequenceFeedback, attemptCount, consecutiveFailures, resetAttempts, setAttemptCount, setConsecutiveFailures, setShowHelpOptions, totalChallengesCompleted, setTotalChallengesCompleted, setCurrentTarget } = get();
        const totalNumber = columns.reduce((acc: number, col: Column, idx: number) => acc + col.value * Math.pow(10, idx), 0);

        if (phase !== 'challenge-ten-to-twenty') return;

        const challenge = TEN_TO_TWENTY_CHALLENGES[0];
        const targetNumber = challenge.targets[tenToTwentyTargetIndex];

        // Set current target for help system
        setCurrentTarget(targetNumber);

        if (totalNumber === targetNumber) {
            // SUCCESS!
            // Send correct value message to Unity
            sendCorrectValue();

            const successMsg = getSuccessMessage(attemptCount + 1, false);
            get().speakAndThen(successMsg, () => {
                // Reset attempts and update stats
                resetAttempts();
                setConsecutiveFailures(0);
                setTotalChallengesCompleted(totalChallengesCompleted + 1);

                const newSuccessCount = tenToTwentySuccessCount + 1;
                set({ tenToTwentySuccessCount: newSuccessCount });

                if (tenToTwentyTargetIndex + 1 >= challenge.targets.length) {
                    // All challenges completed!
                    // Start learn-twenty-to-thirty at 20 (2 tens, 0 units)
                    const startCols = initialColumns.map((col, i) => ({ ...col, unlocked: i <= 1 }));
                    startCols[1].value = 2;
                    startCols[0].value = 0;
                    set({
                        columns: startCols,
                        phase: 'learn-twenty-to-thirty'
                    });
                    get().updateButtonVisibility();
                    sequenceFeedback("Maintenant, remplis la colonne des unités jusqu'à 9 !", "Clique sur VERT pour ajouter des billes !");
                } else {
                    // Send next goal message to Unity
                    sendNextGoal();

                    const nextTarget = challenge.targets[tenToTwentyTargetIndex + 1];
                    const resetCols = initialColumns.map((col, i) => ({ ...col, unlocked: i === 0 || i === 1 }));
                    set({ tenToTwentyTargetIndex: tenToTwentyTargetIndex + 1, columns: resetCols });
                    get().updateInstruction();
                    sequenceFeedback(`✅ Correct ! `, `Maintenant affiche ${nextTarget} !`);
                }
            });
        } else {
            // FAILURE - Generate progressive feedback
            // Send wrong value message to Unity
            sendWrongValue();

            const newAttemptCount = attemptCount + 1;
            setAttemptCount(newAttemptCount);

            const feedbackMsg = generateFeedback({
                attemptCount: newAttemptCount,
                consecutiveFailures,
                frustrationLevel: detectFrustration(consecutiveFailures),
                currentTarget: targetNumber,
                lastUserAnswer: totalNumber
            });

            get().setFeedback(feedbackMsg.message);

            // Show help options on 4th attempt
            if (feedbackMsg.showHelp) {
                setShowHelpOptions(true);
            }

            // If too many attempts, increase consecutive failures
            if (newAttemptCount >= 4) {
                const newConsecutiveFailures = consecutiveFailures + 1;
                setConsecutiveFailures(newConsecutiveFailures);

                // Check for high frustration
                if (newConsecutiveFailures >= 3) {
                    setTimeout(() => {
                        get().setFeedback(getFrustrationInterventionMessage());
                    }, FEEDBACK_DELAY * 2);
                }
            }
        }
    },

    handleValidateTens: () => {
        const { phase, columns, tensTargetIndex, tensSuccessCount, sequenceFeedback, resetTensChallenge, attemptCount, consecutiveFailures, resetAttempts, setAttemptCount, setConsecutiveFailures, setShowHelpOptions, totalChallengesCompleted, setTotalChallengesCompleted, setCurrentTarget } = get();

        const totalNumber = columns.reduce((acc: number, col: Column, idx: number) => {
            return acc + (col.value * Math.pow(10, idx));
        }, 0);

        const challengePhases = ['challenge-tens-1', 'challenge-tens-2', 'challenge-tens-3'] as const;
        const challengeIndex = challengePhases.indexOf(phase as typeof challengePhases[number]);
        if (challengeIndex === -1) return;

        const challenge = TENS_CHALLENGES[challengeIndex];
        const targetNumber = challenge.targets[tensTargetIndex];


        console.log('Colonnes:', columns.map((c, i) => `[${i}] value:${c.value} unlocked:${c.unlocked}`));
        console.log('Target:', targetNumber, 'Calculé:', totalNumber);

        // Set current target for help system
        setCurrentTarget(targetNumber);

        if (totalNumber === targetNumber) {
            // SUCCESS!
            sendCorrectValue();

            const successMsg = getSuccessMessage(attemptCount + 1, false);
            const { speakAndThen } = get();
            speakAndThen(successMsg, () => {
                // Reset attempts and update stats
                resetAttempts();
                setConsecutiveFailures(0);
                setTotalChallengesCompleted(totalChallengesCompleted + 1);

                const newSuccessCount = tensSuccessCount + 1;
                set({ tensSuccessCount: newSuccessCount });

                if (tensTargetIndex + 1 >= challenge.targets.length) {
                    if (challengeIndex === TENS_CHALLENGES.length - 1) {
                        set((state: MachineState) => ({ completedChallenges: { ...state.completedChallenges, tens: true } }));
                        const newCols = [...get().columns];
                        if (!newCols[2].unlocked) {
                            newCols[2].unlocked = false; // Keep it locked for now
                            set({ columns: newCols });
                        }
                        // Transition to intro-three-column first (like intro-second-column for tens)
                        const resetCols = initialColumns.map((col, i) => ({ ...col, unlocked: i === 0 || i === 1 }));
                        resetCols[1].value = 9;
                        resetCols[0].value = 9;
                        set({
                            columns: resetCols,
                            phase: 'intro-three-column',
                            showResponseButtons: true,
                            selectedResponse: null
                        });
                        get().updateButtonVisibility();
                        sequenceFeedback("APPRENTISSAGE DES DIZAINES TERMINÉ ! Bravo ! ", "Tu maîtrises les dizaines ! MAIS... regarde : la machine est bloquée à 99 !");
                    } else {
                        // Moving to next challenge phase - do NOT call sendNextGoal()
                        // because setPhase will send a new challenge list to Unity
                        const nextChallenge = TENS_CHALLENGES[challengeIndex + 1];
                        resetTensChallenge();
                        const resetCols = initialColumns.map((col, i) => ({ ...col, unlocked: i === 0 || i === 1 }));
                        set({
                            columns: resetCols
                        });
                        get().setPhase(nextChallenge.phase);
                        get().setFeedback(`Affiche le nombre ${nextChallenge.targets[0]} !`);
                    }
                } else {
                    sendNextGoal();
                    const nextTarget = challenge.targets[tensTargetIndex + 1];
                    const resetCols = initialColumns.map((col, i) => ({ ...col, unlocked: i === 0 || i === 1 }));
                    set({ tensTargetIndex: tensTargetIndex + 1, columns: resetCols });
                    get().updateInstruction();
                    sequenceFeedback(`✅ Correct ! ${newSuccessCount}/${challenge.targets.length} réussis !`, `Maintenant affiche ${nextTarget} !`);
                }
            });
        } else {
            // FAILURE
            sendWrongValue();

            const newAttemptCount = attemptCount + 1;
            setAttemptCount(newAttemptCount);

            const feedbackMsg = generateFeedback({
                attemptCount: newAttemptCount,
                consecutiveFailures,
                frustrationLevel: detectFrustration(consecutiveFailures),
                currentTarget: targetNumber,
                lastUserAnswer: totalNumber
            });

            get().setFeedback(feedbackMsg.message);

            if (feedbackMsg.showHelp) {
                setShowHelpOptions(true);
            }

            if (newAttemptCount >= 4) {
                const newConsecutiveFailures = consecutiveFailures + 1;
                setConsecutiveFailures(newConsecutiveFailures);

                if (newConsecutiveFailures >= 3) {
                    setTimeout(() => {
                        get().setFeedback(getFrustrationInterventionMessage());
                    }, FEEDBACK_DELAY * 2);
                }
            }
        }
    },

    handleValidateHundredToTwoHundred: () => {
        const { phase, columns, hundredToTwoHundredTargetIndex, hundredToTwoHundredSuccessCount, sequenceFeedback, speakAndThen, attemptCount, consecutiveFailures, resetAttempts, setAttemptCount, setConsecutiveFailures, setShowHelpOptions, totalChallengesCompleted, setTotalChallengesCompleted, setCurrentTarget } = get();
        const totalNumber = columns.reduce((acc: number, col: Column, idx: number) => acc + col.value * Math.pow(10, idx), 0);

        if (phase !== 'challenge-hundred-to-two-hundred') return;

        const challenge = HUNDRED_TO_TWO_HUNDRED_CHALLENGES[0];
        const targetNumber = challenge.targets[hundredToTwoHundredTargetIndex];

        // Set current target for help system
        setCurrentTarget(targetNumber);

        if (totalNumber === targetNumber) {
            // Succès
            sendCorrectValue();
            const successMsg = getSuccessMessage(attemptCount + 1, false);
            speakAndThen(successMsg, () => {
                resetAttempts();
                setConsecutiveFailures(0);
                setTotalChallengesCompleted(totalChallengesCompleted + 1);
                const newSuccessCount = hundredToTwoHundredSuccessCount + 1;
                set({ hundredToTwoHundredSuccessCount: newSuccessCount });

                if (hundredToTwoHundredTargetIndex + 1 >= challenge.targets.length) {
                    // Tous les challenges terminés !
                    sequenceFeedback(
                        "Maintenant, remplis tout jusqu'à 299 !",
                        "Clique sur VERT pour ajouter des billes !",
                        () => {
                            const startCols = initialColumns.map((col, i) => ({ ...col, unlocked: i <= 2 }));
                            startCols[2].value = 2;
                            startCols[1].value = 0;
                            startCols[0].value = 0;
                            set({
                                columns: startCols,
                                phase: 'learn-two-hundred-to-three-hundred'
                            });
                            get().updateButtonVisibility();
                        }
                    );
                } else {
                    // Prochain objectif
                    sendNextGoal();
                    const nextTarget = challenge.targets[hundredToTwoHundredTargetIndex + 1];
                    const resetCols = initialColumns.map((col, i) => ({ ...col, unlocked: i <= 2 }));
                    set({ hundredToTwoHundredTargetIndex: hundredToTwoHundredTargetIndex + 1, columns: resetCols });
                    get().updateInstruction();
                    sequenceFeedback(
                        `✅ Correct ! ${newSuccessCount}/${challenge.targets.length} réussis !`,
                        `Maintenant affiche ${nextTarget} !`
                    );
                }
            });
        } else {
            // Échec
            sendWrongValue();
            const newAttemptCount = attemptCount + 1;
            setAttemptCount(newAttemptCount);

            const feedbackMsg = generateFeedback({
                attemptCount: newAttemptCount,
                consecutiveFailures,
                frustrationLevel: detectFrustration(consecutiveFailures),
                currentTarget: targetNumber,
                lastUserAnswer: totalNumber
            });

            get().speakAndThen(feedbackMsg.message, () => {
                // Affiche les options d'aide si besoin
                if (feedbackMsg.showHelp) {
                    setShowHelpOptions(true);
                }
                // Si trop d'échecs, augmente la frustration et propose une intervention
                if (newAttemptCount >= 4) {
                    const newConsecutiveFailures = consecutiveFailures + 1;
                    setConsecutiveFailures(newConsecutiveFailures);
                    if (newConsecutiveFailures >= 3) {
                        get().speakAndThen(getFrustrationInterventionMessage());
                    }
                }
            });
        }
    },

    handleValidateTwoHundredToThreeHundred: () => {
        const { phase, columns, twoHundredToThreeHundredTargetIndex, twoHundredToThreeHundredSuccessCount, sequenceFeedback, attemptCount, consecutiveFailures, resetAttempts, setAttemptCount, setConsecutiveFailures, setShowHelpOptions, totalChallengesCompleted, setTotalChallengesCompleted, setCurrentTarget } = get();
        const totalNumber = columns.reduce((acc: number, col: Column, idx: number) => acc + col.value * Math.pow(10, idx), 0);

        if (phase !== 'challenge-two-hundred-to-three-hundred') return;

        const challenge = TWO_HUNDRED_TO_THREE_HUNDRED_CHALLENGES[0];
        const targetNumber = challenge.targets[twoHundredToThreeHundredTargetIndex];

        // Set current target for help system
        setCurrentTarget(targetNumber);

        if (totalNumber === targetNumber) {
            // Succès
            sendCorrectValue();
            const successMsg = getSuccessMessage(attemptCount + 1, false);
            get().speakAndThen(successMsg, () => {
                resetAttempts();
                setConsecutiveFailures(0);
                setTotalChallengesCompleted(totalChallengesCompleted + 1);
                const newSuccessCount = twoHundredToThreeHundredSuccessCount + 1;
                set({ twoHundredToThreeHundredSuccessCount: newSuccessCount });

                if (twoHundredToThreeHundredTargetIndex + 1 >= challenge.targets.length) {
                    // Tous les challenges terminés !
                    sequenceFeedback(
                        "Bravo ! Tu as maîtrisé les centaines !",
                        "Maintenant je vais t'expliquer quelque chose d'important !",
                        () => {
                            const resetCols = initialColumns.map((col, i) => ({ ...col, unlocked: i <= 2 }));
                            set({
                                columns: resetCols,
                                phase: 'intro-learn-hundreds',
                                showStartLearningButton: true
                            });
                            get().updateButtonVisibility();
                            get().updateInstruction();
                        }
                    );
                } else {
                    // Prochain objectif
                    sendNextGoal();
                    const nextTarget = challenge.targets[twoHundredToThreeHundredTargetIndex + 1];
                    const resetCols = initialColumns.map((col, i) => ({ ...col, unlocked: i <= 2 }));
                    set({ twoHundredToThreeHundredTargetIndex: twoHundredToThreeHundredTargetIndex + 1, columns: resetCols });
                    get().updateInstruction();
                    sequenceFeedback(
                        `✅ Correct ! ${newSuccessCount}/${challenge.targets.length} réussis !`,
                        `Maintenant affiche ${nextTarget} !`
                    );
                }
            });
        } else {
            // Échec
            sendWrongValue();
            const newAttemptCount = attemptCount + 1;
            setAttemptCount(newAttemptCount);

            const feedbackMsg = generateFeedback({
                attemptCount: newAttemptCount,
                consecutiveFailures,
                frustrationLevel: detectFrustration(consecutiveFailures),
                currentTarget: targetNumber,
                lastUserAnswer: totalNumber
            });

            get().speakAndThen(feedbackMsg.message, () => {
                // Affiche les options d'aide si besoin
                if (feedbackMsg.showHelp) {
                    setShowHelpOptions(true);
                }
                // Si trop d'échecs, augmente la frustration et propose une intervention
                if (newAttemptCount >= 4) {
                    const newConsecutiveFailures = consecutiveFailures + 1;
                    setConsecutiveFailures(newConsecutiveFailures);
                    if (newConsecutiveFailures >= 3) {
                        get().speakAndThen(getFrustrationInterventionMessage());
                    }
                }
            });
        }
    },

    handleValidateHundreds: () => {
        const { phase, columns, hundredsTargetIndex, hundredsSuccessCount, sequenceFeedback, speakAndThen, resetHundredsChallenge, attemptCount, consecutiveFailures, resetAttempts, setAttemptCount, setConsecutiveFailures, setShowHelpOptions, totalChallengesCompleted, setTotalChallengesCompleted, setCurrentTarget } = get();
        const totalNumber = columns.reduce((acc: number, col: Column, idx: number) => acc + col.value * Math.pow(10, idx), 0);
        const challengePhases = ['challenge-hundreds-1', 'challenge-hundreds-2', 'challenge-hundreds-3'] as const;
        const challengeIndex = challengePhases.indexOf(phase as typeof challengePhases[number]);
        if (challengeIndex === -1) return;

        const challenge = HUNDREDS_CHALLENGES[challengeIndex];
        const targetNumber = challenge.targets[hundredsTargetIndex];

        // Set current target for help system
        setCurrentTarget(targetNumber);

        if (totalNumber === targetNumber) {
            // Succès
            sendCorrectValue();
            const successMsg = getSuccessMessage(attemptCount + 1, false);
            speakAndThen(successMsg, () => {
                resetAttempts();
                setConsecutiveFailures(0);
                setTotalChallengesCompleted(totalChallengesCompleted + 1);
                const newSuccessCount = hundredsSuccessCount + 1;
                set({ hundredsSuccessCount: newSuccessCount });

                if (hundredsTargetIndex + 1 >= challenge.targets.length) {
                    if (challengeIndex === HUNDREDS_CHALLENGES.length - 1) {
                        set((state: MachineState) => ({ completedChallenges: { ...state.completedChallenges, hundreds: true } }));
                        sequenceFeedback(
                            "APPRENTISSAGE DES CENTAINES TERMINÉ ! Bravo ! ",
                            " BRAVO CHAMPION ! Tu maîtrises les centaines ! MAIS... regarde : la machine est bloquée à 999 !",
                            () => {
                                const newCols = [...get().columns];
                                // Keep thousands column locked for now
                                if (!newCols[3].unlocked) {
                                    newCols[3].unlocked = false;
                                    set({ columns: newCols });
                                }
                                // Set up for intro-four-column: start at 999
                                const resetCols = initialColumns.map((col, i) => ({ ...col, unlocked: i === 0 || i === 1 || i === 2 }));
                                resetCols[2].value = 9;
                                resetCols[1].value = 9;
                                resetCols[0].value = 9;
                                set({
                                    columns: resetCols,
                                    phase: 'intro-four-column',
                                    showResponseButtons: true,
                                    selectedResponse: null,
                                    pendingAutoCount: false,
                                    isCountingAutomatically: false
                                });
                                get().updateButtonVisibility();
                            }
                        );
                    } else {
                        const nextChallenge = HUNDREDS_CHALLENGES[challengeIndex + 1];
                        sequenceFeedback(
                            ` DÉFI ${challengeIndex + 2} : Affiche le nombre ${nextChallenge.targets[0]} !`,
                            undefined,
                            () => {
                                resetHundredsChallenge();
                                const resetCols = initialColumns.map((col, i) => ({ ...col, unlocked: i === 0 || i === 1 || i === 2 }));
                                set({ columns: resetCols });
                                get().setPhase(nextChallenge.phase);
                            }
                        );
                    }
                } else {
                    // Prochain objectif
                    sendNextGoal();
                    const nextTarget = challenge.targets[hundredsTargetIndex + 1];
                    const resetCols = initialColumns.map((col, i) => ({ ...col, unlocked: i === 0 || i === 1 || i === 2 }));
                    set({ hundredsTargetIndex: hundredsTargetIndex + 1, columns: resetCols });
                    get().updateInstruction();
                    sequenceFeedback(
                        `✅ Correct ! ${newSuccessCount}/${challenge.targets.length} réussis !`,
                        `Maintenant affiche ${nextTarget} !`
                    );
                }
            });
        } else {
            // Échec
            sendWrongValue();
            const newAttemptCount = attemptCount + 1;
            setAttemptCount(newAttemptCount);

            const feedbackMsg = generateFeedback({
                attemptCount: newAttemptCount,
                consecutiveFailures,
                frustrationLevel: detectFrustration(consecutiveFailures),
                currentTarget: targetNumber,
                lastUserAnswer: totalNumber
            });

            speakAndThen(feedbackMsg.message, () => {
                if (feedbackMsg.showHelp) {
                    setShowHelpOptions(true);
                }
                if (newAttemptCount >= 4) {
                    const newConsecutiveFailures = consecutiveFailures + 1;
                    setConsecutiveFailures(newConsecutiveFailures);
                    if (newConsecutiveFailures >= 3) {
                        speakAndThen(getFrustrationInterventionMessage());
                    }
                }
            });
        }
    },

    handleValidateThousandToTwoThousand: () => {
        const { phase, columns, thousandToTwoThousandTargetIndex, thousandToTwoThousandSuccessCount, sequenceFeedback, attemptCount, consecutiveFailures, resetAttempts, setAttemptCount, setConsecutiveFailures, setShowHelpOptions, totalChallengesCompleted, setTotalChallengesCompleted, setCurrentTarget } = get();
        const totalNumber = columns.reduce((acc: number, col: Column, idx: number) => acc + col.value * Math.pow(10, idx), 0);

        if (phase !== 'challenge-thousand-to-two-thousand') return;

        const challenge = THOUSAND_TO_TWO_THOUSAND_CHALLENGES[0];
        const targetNumber = challenge.targets[thousandToTwoThousandTargetIndex];

        // Set current target for help system
        setCurrentTarget(targetNumber);

        if (totalNumber === targetNumber) {
            // Succès
            sendCorrectValue();
            const successMsg = getSuccessMessage(attemptCount + 1, false);
            get().speakAndThen(successMsg, () => {
                resetAttempts();
                setConsecutiveFailures(0);
                setTotalChallengesCompleted(totalChallengesCompleted + 1);
                const newSuccessCount = thousandToTwoThousandSuccessCount + 1;
                set({ thousandToTwoThousandSuccessCount: newSuccessCount });

                if (thousandToTwoThousandTargetIndex + 1 >= challenge.targets.length) {
                    sequenceFeedback(
                        " Tous les mini-défis 1000-2000 réussis ! Tu maîtrises la zone 1000-2000 !",
                        "Bravo ! Maintenant on va découvrir 2000-3000 !",
                        () => {
                            const resetCols = initialColumns.map((col) => ({ ...col, unlocked: true }));
                            resetCols[3].value = 2;
                            resetCols[2].value = 0;
                            resetCols[1].value = 0;
                            resetCols[0].value = 0;
                            set({
                                columns: resetCols,
                                phase: 'learn-two-thousand-to-three-thousand',
                                pendingAutoCount: false,
                                isCountingAutomatically: false
                            });
                            get().updateButtonVisibility();
                            sequenceFeedback("DEUX-MILLE ! Monte directement à 2500 ! VERT");
                        }
                    );
                } else {
                    // Prochain objectif
                    sendNextGoal();
                    const nextTarget = challenge.targets[thousandToTwoThousandTargetIndex + 1];
                    const resetCols = initialColumns.map((col) => ({ ...col, unlocked: true }));
                    set({ thousandToTwoThousandTargetIndex: thousandToTwoThousandTargetIndex + 1, columns: resetCols });
                    get().updateInstruction();
                    sequenceFeedback(
                        `✅ Correct ! ${newSuccessCount}/${challenge.targets.length} réussis !`,
                        `Maintenant affiche ${nextTarget} !`
                    );
                }
            });
        } else {
            // Échec
            sendWrongValue();
            const newAttemptCount = attemptCount + 1;
            setAttemptCount(newAttemptCount);

            const feedbackMsg = generateFeedback({
                attemptCount: newAttemptCount,
                consecutiveFailures,
                frustrationLevel: detectFrustration(consecutiveFailures),
                currentTarget: targetNumber,
                lastUserAnswer: totalNumber
            });

            get().speakAndThen(feedbackMsg.message, () => {
                if (feedbackMsg.showHelp) {
                    setShowHelpOptions(true);
                }
                if (newAttemptCount >= 4) {
                    const newConsecutiveFailures = consecutiveFailures + 1;
                    setConsecutiveFailures(newConsecutiveFailures);
                    if (newConsecutiveFailures >= 3) {
                        get().speakAndThen(getFrustrationInterventionMessage());
                    }
                }
            });
        }
    },

    handleValidateTwoThousandToThreeThousand: () => {
        const { phase, columns, twoThousandToThreeThousandTargetIndex, twoThousandToThreeThousandSuccessCount, sequenceFeedback, attemptCount, consecutiveFailures, resetAttempts, setAttemptCount, setConsecutiveFailures, setShowHelpOptions, totalChallengesCompleted, setTotalChallengesCompleted, setCurrentTarget } = get();
        const totalNumber = columns.reduce((acc: number, col: Column, idx: number) => acc + col.value * Math.pow(10, idx), 0);

        if (phase !== 'challenge-two-thousand-to-three-thousand') return;

        const challenge = TWO_THOUSAND_TO_THREE_THOUSAND_CHALLENGES[0];
        const targetNumber = challenge.targets[twoThousandToThreeThousandTargetIndex];

        // Set current target for help system
        setCurrentTarget(targetNumber);

        if (totalNumber === targetNumber) {
            // Succès
            sendCorrectValue();
            const successMsg = getSuccessMessage(attemptCount + 1, false);
            get().speakAndThen(successMsg, () => {
                resetAttempts();
                setConsecutiveFailures(0);
                setTotalChallengesCompleted(totalChallengesCompleted + 1);
                const newSuccessCount = twoThousandToThreeThousandSuccessCount + 1;
                set({ twoThousandToThreeThousandSuccessCount: newSuccessCount });

                if (twoThousandToThreeThousandTargetIndex + 1 >= challenge.targets.length) {
                    sequenceFeedback(
                        " Tous les mini-défis 2000-3000 réussis ! Tu maîtrises la zone 2000-3000 !",
                        "Bravo ! Maintenant je vais t'expliquer quelque chose d'important !",
                        () => {
                            const resetCols = initialColumns.map((col) => ({ ...col, unlocked: true }));
                            set({
                                columns: resetCols,
                                phase: 'intro-learn-thousands',
                                showStartLearningButton: true
                            });
                            get().updateButtonVisibility();
                            get().updateInstruction();
                        }
                    );
                } else {
                    // Prochain objectif
                    sendNextGoal();
                    const nextTarget = challenge.targets[twoThousandToThreeThousandTargetIndex + 1];
                    const resetCols = initialColumns.map((col) => ({ ...col, unlocked: true }));
                    set({ twoThousandToThreeThousandTargetIndex: twoThousandToThreeThousandTargetIndex + 1, columns: resetCols });
                    get().updateInstruction();
                    sequenceFeedback(
                        `✅ Correct ! ${newSuccessCount}/${challenge.targets.length} réussis !`,
                        `Maintenant affiche ${nextTarget} !`
                    );
                }
            });
        } else {
            // Échec
            sendWrongValue();
            const newAttemptCount = attemptCount + 1;
            setAttemptCount(newAttemptCount);

            const feedbackMsg = generateFeedback({
                attemptCount: newAttemptCount,
                consecutiveFailures,
                frustrationLevel: detectFrustration(consecutiveFailures),
                currentTarget: targetNumber,
                lastUserAnswer: totalNumber
            });

            get().speakAndThen(feedbackMsg.message, () => {
                if (feedbackMsg.showHelp) {
                    setShowHelpOptions(true);
                }
                if (newAttemptCount >= 4) {
                    const newConsecutiveFailures = consecutiveFailures + 1;
                    setConsecutiveFailures(newConsecutiveFailures);
                    if (newConsecutiveFailures >= 3) {
                        get().speakAndThen(getFrustrationInterventionMessage());
                    }
                }
            });
        }
    },

    handleValidateThousandsSimpleCombination: () => {
        const { phase, columns, thousandsSimpleCombinationTargetIndex, thousandsSimpleCombinationSuccessCount, sequenceFeedback, attemptCount, consecutiveFailures, resetAttempts, setAttemptCount, setConsecutiveFailures, setShowHelpOptions, totalChallengesCompleted, setTotalChallengesCompleted, setCurrentTarget } = get();
        const totalNumber = columns.reduce((acc: number, col: Column, idx: number) => acc + col.value * Math.pow(10, idx), 0);

        if (phase !== 'challenge-thousands-simple-combination') return;

        const challenge = THOUSANDS_SIMPLE_COMBINATION_CHALLENGES[0];
        const targetNumber = challenge.targets[thousandsSimpleCombinationTargetIndex];

        // Set current target for help system
        setCurrentTarget(targetNumber);

        if (totalNumber === targetNumber) {
            // SUCCESS!
            // Send correct value message to Unity
            sendCorrectValue();

            const successMsg = getSuccessMessage(attemptCount + 1, false);
            get().setFeedback(successMsg);

            // Reset attempts and update stats
            resetAttempts();
            setConsecutiveFailures(0);
            setTotalChallengesCompleted(totalChallengesCompleted + 1);

            const newSuccessCount = thousandsSimpleCombinationSuccessCount + 1;
            set({ thousandsSimpleCombinationSuccessCount: newSuccessCount });

            if (thousandsSimpleCombinationTargetIndex + 1 >= challenge.targets.length) {
                // All challenges completed!
                get().speakAndThen(" Tous les défis de combinaisons SIMPLES réussis ! Bravo !", () => {
                    const resetCols = initialColumns.map((col) => ({ ...col, unlocked: true }));
                    set({
                        columns: resetCols
                    });
                    get().markPhaseComplete('challenge-thousands-simple-combination');
                    get().updateButtonVisibility();
                    sequenceFeedback("Bravo ! Maintenant passons aux défis !", "C'est à toi de jouer !", () => {
                        get().goToNextPhase();
                    });
                });
            } else {
                // Send next goal message to Unity
                sendNextGoal();

                const nextTarget = challenge.targets[thousandsSimpleCombinationTargetIndex + 1];
                const resetCols = initialColumns.map((col) => ({ ...col, unlocked: true }));
                set({ thousandsSimpleCombinationTargetIndex: thousandsSimpleCombinationTargetIndex + 1, columns: resetCols });
                get().updateInstruction();
                sequenceFeedback(`✅ Correct ! ${newSuccessCount}/${challenge.targets.length} réussis !`, `Maintenant affiche ${nextTarget} !`);
            }
        } else {
            // FAILURE - Generate progressive feedback
            // Send wrong value message to Unity
            sendWrongValue();

            const newAttemptCount = attemptCount + 1;
            setAttemptCount(newAttemptCount);

            const feedbackMsg = generateFeedback({
                attemptCount: newAttemptCount,
                consecutiveFailures,
                frustrationLevel: detectFrustration(consecutiveFailures),
                currentTarget: targetNumber,
                lastUserAnswer: totalNumber
            });

            get().setFeedback(feedbackMsg.message);

            // Show help options on 4th attempt
            if (feedbackMsg.showHelp) {
                setShowHelpOptions(true);
            }

            // If too many attempts, increase consecutive failures
            if (newAttemptCount >= 4) {
                const newConsecutiveFailures = consecutiveFailures + 1;
                setConsecutiveFailures(newConsecutiveFailures);

                // Check for high frustration
                if (newConsecutiveFailures >= 3) {
                    setTimeout(() => {
                        get().setFeedback(getFrustrationInterventionMessage());
                    }, FEEDBACK_DELAY * 2);
                }
            }
        }
    },

    handleValidateThousands: () => {
        const { phase, columns, thousandsTargetIndex, thousandsSuccessCount, sequenceFeedback, resetThousandsChallenge, attemptCount, consecutiveFailures, resetAttempts, setAttemptCount, setConsecutiveFailures, setShowHelpOptions, totalChallengesCompleted, setTotalChallengesCompleted, setCurrentTarget } = get();
        const totalNumber = columns.reduce((acc: number, col: Column, idx: number) => acc + col.value * Math.pow(10, idx), 0);
        const challengePhases = ['challenge-thousands-1', 'challenge-thousands-2', 'challenge-thousands-3'] as const;
        const challengeIndex = challengePhases.indexOf(phase as typeof challengePhases[number]);
        if (challengeIndex === -1) return;

        const challenge = THOUSANDS_CHALLENGES[challengeIndex];
        const targetNumber = challenge.targets[thousandsTargetIndex];

        // Set current target for help system
        setCurrentTarget(targetNumber);

        if (totalNumber === targetNumber) {
            // SUCCESS!
            // Send correct value message to Unity
            sendCorrectValue();

            const successMsg = getSuccessMessage(attemptCount + 1, false);
            get().setFeedback(successMsg);

            // Reset attempts and update stats
            resetAttempts();
            setConsecutiveFailures(0);
            setTotalChallengesCompleted(totalChallengesCompleted + 1);

            const newSuccessCount = thousandsSuccessCount + 1;
            set({ thousandsSuccessCount: newSuccessCount });

            if (thousandsTargetIndex + 1 >= challenge.targets.length) {
                if (challengeIndex === THOUSANDS_CHALLENGES.length - 1) {
                    set((state: MachineState) => ({ completedChallenges: { ...state.completedChallenges, thousands: true } }));
                    setTimeout(() => {
                        set({ phase: 'celebration-thousands-complete' });
                        get().updateButtonVisibility();
                        sequenceFeedback(" INCROYABLE ! TU ES UN CHAMPION DES NOMBRES !", "Tu sais maintenant compter jusqu'à 9999 ! C'est ÉNORME !");
                    }, FEEDBACK_DELAY * 2);
                } else {
                    const nextChallenge = THOUSANDS_CHALLENGES[challengeIndex + 1];
                    setTimeout(() => {
                        resetThousandsChallenge();
                        const resetCols = get().columns.map((col: Column) => ({ ...col, unlocked: true }));
                        set({
                            columns: resetCols
                        });
                        get().setPhase(nextChallenge.phase);
                        get().setFeedback(` DÉFI ${challengeIndex + 2} : Affiche le nombre ${nextChallenge.targets[0]} !`);
                    }, FEEDBACK_DELAY * 2);
                }
            } else {
                // Send next goal message to Unity
                sendNextGoal();

                const nextTarget = challenge.targets[thousandsTargetIndex + 1];
                const resetCols = get().columns.map((col: Column) => ({ ...col, unlocked: true }));
                set({ thousandsTargetIndex: thousandsTargetIndex + 1, columns: resetCols });
                get().updateInstruction();
                sequenceFeedback(`✅ Correct ! ${newSuccessCount}/${challenge.targets.length} réussis !`, `Maintenant affiche ${nextTarget} !`);
            }
        } else {
            // FAILURE - Generate progressive feedback
            // Send wrong value message to Unity
            sendWrongValue();

            const newAttemptCount = attemptCount + 1;
            setAttemptCount(newAttemptCount);

            const feedbackMsg = generateFeedback({
                attemptCount: newAttemptCount,
                consecutiveFailures,
                frustrationLevel: detectFrustration(consecutiveFailures),
                currentTarget: targetNumber,
                lastUserAnswer: totalNumber
            });

            get().setFeedback(feedbackMsg.message);

            // Show help options on 4th attempt
            if (feedbackMsg.showHelp) {
                setShowHelpOptions(true);
            }

            // If too many attempts, increase consecutive failures
            if (newAttemptCount >= 4) {
                const newConsecutiveFailures = consecutiveFailures + 1;
                setConsecutiveFailures(newConsecutiveFailures);

                // Check for high frustration
                if (newConsecutiveFailures >= 3) {
                    setTimeout(() => {
                        get().setFeedback(getFrustrationInterventionMessage());
                    }, FEEDBACK_DELAY * 2);
                }
            }
        }
    },

    updateInstruction: () => {
        const { phase, unitTargetIndex, unitSuccessCount, tensTargetIndex, tensSuccessCount, hundredsTargetIndex, hundredsSuccessCount, thousandsTargetIndex, thousandsSuccessCount } = get();

        let newInstruction = "";

        switch (phase) {
            // ... (cases from your existing updateInstruction)
            case 'loading':
                newInstruction = PHASE_INSTRUCTIONS['loading'];
                break;
            case 'intro-welcome-personalized':
                newInstruction = PHASE_INSTRUCTIONS['intro-welcome-personalized'];
                break;
            case 'intro-discover-machine':
                newInstruction = typeof PHASE_INSTRUCTIONS['intro-discover-machine'] === 'function'
                    ? PHASE_INSTRUCTIONS['intro-discover-machine'](get().userName)
                    : PHASE_INSTRUCTIONS['intro-discover-machine'];
                break;
            case 'intro-first-interaction':
                if (get().introClickCount === 0) {
                    newInstruction = PHASE_INSTRUCTIONS['intro-first-interaction'].initial;
                } else if (get().introClickCount < 9) {
                    newInstruction = PHASE_INSTRUCTIONS['intro-first-interaction'].continuing;
                } else {
                    newInstruction = PHASE_INSTRUCTIONS['intro-first-interaction'].full;
                }
                break;
            case 'intro-count-digits':
                newInstruction = PHASE_INSTRUCTIONS['intro-count-digits'];
                break;
            case 'intro-challenge-introduction':
                newInstruction = PHASE_INSTRUCTIONS['intro-challenge-introduction'];
                break;
            case 'challenge-unit-intro':
                newInstruction = PHASE_INSTRUCTIONS['challenge-unit-intro'];
                break;
            case 'intro-second-column':
                newInstruction = PHASE_INSTRUCTIONS['intro-second-column'];
                break;
            case 'delock-dizaines':
                newInstruction = PHASE_INSTRUCTIONS['delock-dizaines'];
                break;
            case 'intro-three-column':
                newInstruction = PHASE_INSTRUCTIONS['intro-three-column'];
                break;
            case 'delock-hundreds':
                newInstruction = PHASE_INSTRUCTIONS['delock-hundreds'];
                break;
            case 'intro-four-column':
                newInstruction = PHASE_INSTRUCTIONS['intro-four-column'];
                break;
            case 'delock-thousands':
                newInstruction = PHASE_INSTRUCTIONS['delock-thousands'];
                break;
            case 'intro-discover-carry':
                if (get().columns[0].value < 9) {
                    newInstruction = PHASE_INSTRUCTIONS['intro-discover-carry'].fillToNine;
                } else if (get().columns[0].value === 9 && get().columns[1].value === 0) {
                    newInstruction = PHASE_INSTRUCTIONS['intro-discover-carry'].atNine;
                } else {
                    newInstruction = PHASE_INSTRUCTIONS['intro-discover-carry'].afterCarry;
                }
                break;
            case 'intro-max-value-question':
                if (get().introMaxAttempt === -1) {
                    // Guided mode
                    if (get().columns[0].value < 9) {
                        newInstruction = PHASE_INSTRUCTIONS['intro-max-value-question'].guided.firstRoll;
                    } else if (get().columns[1].value < 9) {
                        newInstruction = PHASE_INSTRUCTIONS['intro-max-value-question'].guided.secondRoll;
                    } else {
                        newInstruction = PHASE_INSTRUCTIONS['intro-max-value-question'].guided.maximum;
                    }
                } else {
                    newInstruction = PHASE_INSTRUCTIONS['intro-max-value-question'].question;
                }
                break;
            case 'intro-welcome':
                newInstruction = PHASE_INSTRUCTIONS['intro-welcome'];
                break;
            case 'intro-discover':
                newInstruction = PHASE_INSTRUCTIONS['intro-discover'];
                break;
            case 'intro-question-digits':
                newInstruction = PHASE_INSTRUCTIONS['intro-question-digits'];
                break;
            case 'intro-add-roll':
                newInstruction = PHASE_INSTRUCTIONS['intro-add-roll'];
                break;
            case 'intro-question-max':
                newInstruction = PHASE_INSTRUCTIONS['intro-question-max'];
                break;
            case 'tutorial':
                newInstruction = PHASE_INSTRUCTIONS['tutorial'];
                break;
            case 'tutorial-challenge': {
                const targetNumber = TUTORIAL_CHALLENGE.targets[get().tutorialChallengeTargetIndex];
                newInstruction = CHALLENGE_INSTRUCTIONS.tutorialChallenge(targetNumber);
                break;
            }
            case 'explore-units':
                newInstruction = PHASE_INSTRUCTIONS['explore-units'];
                break;
            case 'click-add':
                newInstruction = PHASE_INSTRUCTIONS['click-add'];
                break;
            case 'click-remove':
                newInstruction = PHASE_INSTRUCTIONS['click-remove'];
                break;
            case 'done':
                newInstruction = PHASE_INSTRUCTIONS['done'];
                break;
            case 'learn-units':
                newInstruction = PHASE_INSTRUCTIONS['learn-units'];
                break;
            case 'challenge-unit-1':
            case 'challenge-unit-2':
            case 'challenge-unit-3': {
                const challengeIndex = ['challenge-unit-1', 'challenge-unit-2', 'challenge-unit-3'].indexOf(phase);
                const challenge = UNIT_CHALLENGES[challengeIndex];
                const targetNumber = challenge.targets[unitTargetIndex];
                newInstruction = CHALLENGE_INSTRUCTIONS.units(challengeIndex, targetNumber, unitSuccessCount, challenge.targets.length);
                break;
            }
            case 'learn-carry':
                newInstruction = PHASE_INSTRUCTIONS['learn-carry'];
                break;
            case 'practice-ten':
                newInstruction = PHASE_INSTRUCTIONS['practice-ten'];
                break;
            case 'learn-ten-to-twenty':
                newInstruction = PHASE_INSTRUCTIONS['learn-ten-to-twenty'];
                break;
            case 'challenge-ten-to-twenty': {
                const challenge = TEN_TO_TWENTY_CHALLENGES[0];
                const targetNumber = challenge.targets[get().tenToTwentyTargetIndex];
                newInstruction = CHALLENGE_INSTRUCTIONS.tenToTwenty(targetNumber, get().tenToTwentySuccessCount, challenge.targets.length);
                break;
            }
            case 'learn-twenty-to-thirty':
                newInstruction = PHASE_INSTRUCTIONS['learn-twenty-to-thirty'];
                break;
            case 'intro-learn-tens':
                newInstruction = PHASE_INSTRUCTIONS['intro-learn-tens'];
                break;
            case 'learn-tens':
                newInstruction = PHASE_INSTRUCTIONS['learn-tens'];
                break;
            case 'learn-tens-combination':
                newInstruction = PHASE_INSTRUCTIONS['learn-tens-combination'];
                break;
            case 'challenge-tens-1':
            case 'challenge-tens-2':
            case 'challenge-tens-3': {
                const challengeIndex = ['challenge-tens-1', 'challenge-tens-2', 'challenge-tens-3'].indexOf(phase);
                const challenge = TENS_CHALLENGES[challengeIndex];
                const targetNumber = challenge.targets[tensTargetIndex];
                newInstruction = CHALLENGE_INSTRUCTIONS.tens(challengeIndex, targetNumber, tensSuccessCount, challenge.targets.length);
                break;
            }
            case 'practice-hundred':
                newInstruction = PHASE_INSTRUCTIONS['practice-hundred'];
                break;
            case 'learn-hundred-to-hundred-ten':
                newInstruction = PHASE_INSTRUCTIONS['learn-hundred-to-hundred-ten'];
                break;
            case 'learn-hundred-ten-to-two-hundred':
                newInstruction = PHASE_INSTRUCTIONS['learn-hundred-ten-to-two-hundred'];
                break;
            case 'challenge-hundred-to-two-hundred': {
                const challenge = HUNDRED_TO_TWO_HUNDRED_CHALLENGES[0];
                const targetNumber = challenge.targets[get().hundredToTwoHundredTargetIndex];
                newInstruction = CHALLENGE_INSTRUCTIONS.hundredToTwoHundred(targetNumber, get().hundredToTwoHundredSuccessCount, challenge.targets.length);
                break;
            }
            case 'learn-two-hundred-to-three-hundred':
                newInstruction = PHASE_INSTRUCTIONS['learn-two-hundred-to-three-hundred'];
                break;
            case 'challenge-two-hundred-to-three-hundred': {
                const challenge = TWO_HUNDRED_TO_THREE_HUNDRED_CHALLENGES[0];
                const targetNumber = challenge.targets[get().twoHundredToThreeHundredTargetIndex];
                newInstruction = CHALLENGE_INSTRUCTIONS.twoHundredToThreeHundred(targetNumber, get().twoHundredToThreeHundredSuccessCount, challenge.targets.length);
                break;
            }
            case 'intro-learn-hundreds':
                newInstruction = PHASE_INSTRUCTIONS['intro-learn-hundreds'];
                break;
            case 'learn-hundreds':
                newInstruction = PHASE_INSTRUCTIONS['learn-hundreds'];
                break;
            case 'learn-hundreds-simple-combination':
                newInstruction = PHASE_INSTRUCTIONS['learn-hundreds-simple-combination'];
                break;
            case 'learn-hundreds-combination':
                newInstruction = PHASE_INSTRUCTIONS['learn-hundreds-combination'];
                break;
            case 'challenge-hundreds-1':
            case 'challenge-hundreds-2':
            case 'challenge-hundreds-3': {
                const challengeIndex = ['challenge-hundreds-1', 'challenge-hundreds-2', 'challenge-hundreds-3'].indexOf(phase);
                const challenge = HUNDREDS_CHALLENGES[challengeIndex];
                const targetNumber = challenge.targets[hundredsTargetIndex];
                newInstruction = CHALLENGE_INSTRUCTIONS.hundreds(challengeIndex, targetNumber, hundredsSuccessCount, challenge.targets.length);
                break;
            }
            case 'celebration-before-thousands':
                newInstruction = PHASE_INSTRUCTIONS['celebration-before-thousands'];
                break;
            case 'practice-thousand':
                newInstruction = PHASE_INSTRUCTIONS['practice-thousand'];
                break;
            case 'learn-thousand-to-thousand-ten':
                newInstruction = PHASE_INSTRUCTIONS['learn-thousand-to-thousand-ten'];
                break;
            case 'learn-thousand-to-thousand-hundred':
                newInstruction = PHASE_INSTRUCTIONS['learn-thousand-to-thousand-hundred'];
                break;
            case 'learn-thousand-hundred-to-two-thousand':
                newInstruction = PHASE_INSTRUCTIONS['learn-thousand-hundred-to-two-thousand'];
                break;
            case 'challenge-thousand-to-two-thousand': {
                const challenge = THOUSAND_TO_TWO_THOUSAND_CHALLENGES[0];
                const targetNumber = challenge.targets[get().thousandToTwoThousandTargetIndex];
                newInstruction = CHALLENGE_INSTRUCTIONS.thousandToTwoThousand(targetNumber, get().thousandToTwoThousandSuccessCount, challenge.targets.length);
                break;
            }
            case 'learn-two-thousand-to-three-thousand':
                newInstruction = PHASE_INSTRUCTIONS['learn-two-thousand-to-three-thousand'];
                break;
            case 'challenge-two-thousand-to-three-thousand': {
                const challenge = TWO_THOUSAND_TO_THREE_THOUSAND_CHALLENGES[0];
                const targetNumber = challenge.targets[get().twoThousandToThreeThousandTargetIndex];
                newInstruction = CHALLENGE_INSTRUCTIONS.twoThousandToThreeThousand(targetNumber, get().twoThousandToThreeThousandSuccessCount, challenge.targets.length);
                break;
            }
            case 'intro-learn-thousands':
                newInstruction = PHASE_INSTRUCTIONS['intro-learn-thousands'];
                break;
            case 'learn-thousands':
                newInstruction = PHASE_INSTRUCTIONS['learn-thousands'];
                break;
            case 'learn-thousands-very-simple-combination':
                newInstruction = PHASE_INSTRUCTIONS['learn-thousands-very-simple-combination'];
                break;
            case 'challenge-thousands-simple-combination': {
                const challenge = THOUSANDS_SIMPLE_COMBINATION_CHALLENGES[0];
                const targetNumber = challenge.targets[get().thousandsSimpleCombinationTargetIndex];
                newInstruction = CHALLENGE_INSTRUCTIONS.thousandsSimpleCombination(targetNumber, get().thousandsSimpleCombinationSuccessCount, challenge.targets.length);
                break;
            }
            case 'learn-thousands-full-combination':
                newInstruction = PHASE_INSTRUCTIONS['learn-thousands-full-combination'];
                break;
            case 'learn-thousands-combination':
                newInstruction = PHASE_INSTRUCTIONS['learn-thousands-combination'];
                break;
            case 'challenge-thousands-1':
            case 'challenge-thousands-2':
            case 'challenge-thousands-3': {
                const challengeIndex = ['challenge-thousands-1', 'challenge-thousands-2', 'challenge-thousands-3'].indexOf(phase);
                const challenge = THOUSANDS_CHALLENGES[challengeIndex];
                const targetNumber = challenge.targets[thousandsTargetIndex];
                newInstruction = CHALLENGE_INSTRUCTIONS.thousands(challengeIndex, targetNumber, thousandsSuccessCount, challenge.targets.length);
                break;
            }
            case 'celebration-thousands-complete':
                newInstruction = PHASE_INSTRUCTIONS['celebration-thousands-complete'];
                break;
            case 'normal':
                newInstruction = PHASE_INSTRUCTIONS['normal'];
                break;
            
            // Simplified tutorial (didacticiel) phases
            case 'didacticiel-step1-buttons': {
                const { didacticielStep1UpClicks, didacticielStep1DownClicks } = get();
                const step1Instructions = PHASE_INSTRUCTIONS['didacticiel-step1-buttons'];
                if (didacticielStep1UpClicks >= DIDACTICIEL_REQUIRED_CLICKS && didacticielStep1DownClicks >= DIDACTICIEL_REQUIRED_CLICKS) {
                    newInstruction = step1Instructions.complete;
                } else if (didacticielStep1UpClicks > 0 || didacticielStep1DownClicks > 0) {
                    newInstruction = step1Instructions.progress(didacticielStep1UpClicks, didacticielStep1DownClicks);
                } else {
                    newInstruction = step1Instructions.initial;
                }
                break;
            }
            case 'didacticiel-step2-columns': {
                const { didacticielStep2TargetIndex, didacticielStep2SuccessCount } = get();
                const step2Instructions = PHASE_INSTRUCTIONS['didacticiel-step2-columns'];
                const challenge = DIDACTICIEL_STEP2_CHALLENGES;
                
                if (didacticielStep2SuccessCount >= challenge.targets.length) {
                    newInstruction = step2Instructions.final;
                } else {
                    const targetNumber = challenge.targets[didacticielStep2TargetIndex];
                    newInstruction = step2Instructions.challenge(targetNumber, didacticielStep2TargetIndex);
                }
                break;
            }
            case 'didacticiel-step3-free-practice': {
                const { didacticielStep3Target, didacticielStep3SuccessCount } = get();
                const step3Instructions = PHASE_INSTRUCTIONS['didacticiel-step3-free-practice'];
                newInstruction = step3Instructions.challenge(didacticielStep3Target, didacticielStep3SuccessCount);
                break;
            }
            
            default:
                newInstruction = PHASE_INSTRUCTIONS['default'];
        }

        // Set the instruction text
        set({ instruction: newInstruction });

        // Speak the instruction, but handle automatic transitions in phase-specific logic
        // Only phases with automatic transitions after speaking should be handled here
        if (phase === 'intro-welcome') {
            get().speakAndThen(newInstruction, () => {
                get().markPhaseComplete('intro-welcome');
                console.log('[updateInstruction] intro-welcome complete, transitioning to next phase');
                get().goToNextPhase();
            });
        } else if (phase === 'intro-discover') {
            get().speakAndThen(newInstruction, () => {
                get().markPhaseComplete('intro-discover');
                console.log('[updateInstruction] intro-discover complete, transitioning to next phase');
                get().goToNextPhase();
            });
        } else if (phase === 'intro-challenge-introduction') {
            get().speakAndThen(newInstruction, () => {
                get().markPhaseComplete('intro-challenge-introduction');
                console.log('[updateInstruction] intro-challenge-introduction complete, transitioning to next phase');
                get().goToNextPhase();
            });
        } else if (phase === 'challenge-unit-intro') {
            get().speakAndThen(newInstruction, () => {
                get().markPhaseComplete('challenge-unit-intro');
                get().resetUnitChallenge();
                console.log('[updateInstruction] challenge-unit-intro complete, transitioning to next phase');
                get().goToNextPhase();
            });
        } else if (phase === 'delock-dizaines') {
            get().speakAndThen(newInstruction, () => {
                const newCols = [...initialColumns];
                newCols[0].unlocked = true;
                newCols[1].unlocked = true;
                set({ columns: newCols });
                get().markPhaseComplete('delock-dizaines');
                console.log('[updateInstruction] delock-dizaines complete, transitioning to next phase');
                get().goToNextPhase();
            });
        } else if (phase === 'delock-hundreds') {
            get().speakAndThen(newInstruction, () => {
                const newCols = [...initialColumns];
                newCols[0].unlocked = true;
                newCols[1].unlocked = true;
                newCols[2].unlocked = true;
                set({ columns: newCols });
                get().markPhaseComplete('delock-hundreds');
                console.log('[updateInstruction] delock-hundreds complete, transitioning to next phase');
                get().goToNextPhase();
            });
        } else if (phase === 'delock-thousands') {
            get().speakAndThen(newInstruction, () => {
                const newCols = [...initialColumns];
                newCols[0].unlocked = true;
                newCols[1].unlocked = true;
                newCols[2].unlocked = true;
                newCols[3].unlocked = true;
                set({ columns: newCols });
                get().markPhaseComplete('delock-thousands');
                console.log('[updateInstruction] delock-thousands complete, transitioning to next phase');
                get().goToNextPhase();
            });
        } else if (phase === 'intro-three-column') {
            get().speakAndThen(newInstruction, () => {
                get().markPhaseComplete('intro-three-column');
                console.log('[updateInstruction] intro-three-column complete, transitioning to next phase');
                get().goToNextPhase();
            });
        } else if (phase === 'intro-four-column') {
            get().speakAndThen(newInstruction, () => {
                get().markPhaseComplete('intro-four-column');
                console.log('[updateInstruction] intro-four-column complete, transitioning to next phase');
                get().goToNextPhase();
            });
        } else if (phase === 'intro-second-column') {
            get().speakAndThen(newInstruction, () => {
                get().markPhaseComplete('intro-second-column');
                console.log('[updateInstruction] intro-second-column complete, transitioning to next phase');
                get().goToNextPhase();
            });
        } else {
            // For all other phases, just speak without automatic transition
            get().speakAndThen(newInstruction);
        }

    },

    startLearningPhase: () => {
        const { phase, sequenceFeedback } = get();
        if (phase === 'done') {
            const newCols = initialColumns.map((col, i) => ({ ...col, unlocked: i === 0 || i === 1 }));
            set({
                columns: newCols,
                nextPhaseAfterAuto: 'explore-units',
                phase: 'learn-units',
                pendingAutoCount: true,
                isCountingAutomatically: true
            });
            get().updateButtonVisibility();
            sequenceFeedback(SEQUENCE_FEEDBACK.learnUnits.part1, SEQUENCE_FEEDBACK.learnUnits.part2);
        } else if (phase === 'intro-learn-tens') {
            // Start learn-tens after intro explanation
            const resetCols = initialColumns.map((col, i) => ({ ...col, unlocked: i === 0 || i === 1 }));
            set({
                columns: resetCols,
                phase: 'learn-tens',
                pendingAutoCount: true,
                isCountingAutomatically: false
            });
            get().updateButtonVisibility();
            sequenceFeedback("Maintenant, regarde la machine compter les dizaines rondes !", "30, 40, 50, 60... Observe bien !");
        } else if (phase === 'intro-learn-hundreds') {
            // Start learn-hundreds after intro explanation
            const resetCols = initialColumns.map((col, i) => ({ ...col, unlocked: i <= 2 }));
            set({
                columns: resetCols,
                phase: 'learn-hundreds',
                pendingAutoCount: true,
                isCountingAutomatically: false
            });
            get().updateButtonVisibility();
            sequenceFeedback("Regarde bien ! La machine va compter par centaines !", "300, 400, 500... Observe bien !");
        } else if (phase === 'intro-learn-thousands') {
            // Start learn-thousands after intro explanation
            const resetCols = initialColumns.map((col) => ({ ...col, unlocked: true }));
            set({
                columns: resetCols,
                phase: 'learn-thousands',
                pendingAutoCount: true,
                isCountingAutomatically: false
            });
            get().updateButtonVisibility();
            sequenceFeedback("Regarde bien ! La machine va compter par milliers !", "3000, 4000, 5000... Imagine combien de billes ça fait !");
        } else if (phase === 'celebration-before-thousands') {
            // Start thousands learning
            const resetCols = initialColumns.map((col) => ({ ...col, unlocked: true }));
            resetCols[3].value = 0;
            resetCols[2].value = 9;
            resetCols[1].value = 9;
            resetCols[0].value = 9;
            set({
                columns: resetCols,
                phase: 'practice-thousand',
                pendingAutoCount: false,
                isCountingAutomatically: false
            });
            get().updateButtonVisibility();
            sequenceFeedback(SEQUENCE_FEEDBACK.practiceThousand.part1, SEQUENCE_FEEDBACK.practiceThousand.part2);
        } else if (phase === 'celebration-thousands-complete') {
            // Go to normal mode
            const resetCols = initialColumns.map((col) => ({ ...col, unlocked: true }));
            set({
                columns: resetCols,
                phase: 'normal',
                pendingAutoCount: false,
                isCountingAutomatically: false
            });
            get().updateButtonVisibility();
            sequenceFeedback(SEQUENCE_FEEDBACK.normalMode.part1, SEQUENCE_FEEDBACK.normalMode.part2);
        }
    },

    unlockNextColumn: () => {
        const { columns, completedChallenges } = get();
        const nextIdx = columns.findIndex((col: Column, i: number) => !col.unlocked && i > 0);
        if (nextIdx !== -1) {
            const newCols = [...columns];
            if (nextIdx === 1 && !completedChallenges.tens) {
                get().setFeedback(ERROR_MESSAGES.mustCompleteTens);
                return;
            } else if (nextIdx === 2) {
                if (!completedChallenges.tens) {
                    get().setFeedback(ERROR_MESSAGES.mustMasterTens);
                    return;
                }
                newCols[nextIdx].unlocked = true;
                set({ columns: newCols });
                setTimeout(() => {
                    const resetCols = initialColumns.map((col, i) => ({ ...col, unlocked: i === 0 || i === 1 || i === 2 }));
                    set({
                        columns: resetCols,
                        phase: 'intro-learn-hundreds',
                        showStartLearningButton: true
                    });
                    get().updateButtonVisibility();
                    get().updateInstruction();
                }, FEEDBACK_DELAY);
            } else if (nextIdx === 3) {
                if (!completedChallenges.hundreds) {
                    get().setFeedback(ERROR_MESSAGES.mustMasterHundreds);
                    return;
                }
                newCols[nextIdx].unlocked = true;
                set({ columns: newCols });
                setTimeout(() => {
                    const resetCols = columns.map((col: Column) => ({ ...col, unlocked: true }));
                    set({
                        columns: resetCols,
                        phase: 'intro-learn-thousands',
                        showStartLearningButton: true
                    });
                    get().updateButtonVisibility();
                    get().updateInstruction();
                }, FEEDBACK_DELAY);
            } else {
                newCols[nextIdx].unlocked = true;
                set({ columns: newCols });
                get().setFeedback(`🔓 Colonne ${newCols[nextIdx].name} débloquée ! Clique sur VERT et bouton ROUGE pour t'amuser !`);
            }
        }
    },

    // Handle help choice in assisted mode (attempt 4+)
    handleHelpChoice: (choice: 'tryAgain' | 'guided' | 'showSolution') => {
        const { setHelpChoice, setShowHelpOptions, setGuidedMode, setShowSolutionAnimation, currentTarget, columns } = get();

        setHelpChoice(choice);
        setShowHelpOptions(false);

        if (choice === 'tryAgain') {
            // Option 1: Try again with all hints visible
            const decomp = decomposeNumber(currentTarget);
            get().setFeedback(HELP_CHOICE_MESSAGES.tryAgain(currentTarget, decomp));
        } else if (choice === 'guided') {
            // Option 2: Guided step-by-step construction
            setGuidedMode(true);
            set({ guidedStep: 0 });

            // Reset all columns to 0
            const resetCols = columns.map(col => ({ ...col, value: 0 }));
            set({ columns: resetCols });

            get().setFeedback(GUIDED_MESSAGES.start);

            // Start guided mode after a delay
            setTimeout(() => {
                get().advanceGuidedStep();
            }, FEEDBACK_DELAY);
        } else if (choice === 'showSolution') {
            // Option 3: Show solution animation
            setShowSolutionAnimation(true);
            set({ solutionAnimationStep: 0 });

            // Reset columns
            const resetCols = columns.map(col => ({ ...col, value: 0 }));
            set({ columns: resetCols });

            get().setFeedback(HELP_CHOICE_MESSAGES.showSolution(currentTarget));

            // Start animation
            setTimeout(() => {
                get().advanceSolutionAnimation();
            }, FEEDBACK_DELAY);
        }
    },

    // Advance to next step in guided mode
    advanceGuidedStep: () => {
        const { currentTarget, columns, guidedStep, setGuidedStep, setGuidedMode, resetAttempts, setFeedback } = get();

        const currentValues = [columns[0].value, columns[1].value, columns[2].value, columns[3].value];
        const nextStep = getNextGuidedStep(currentTarget, currentValues);

        if (!nextStep) {
            // Completed! Show success message
            setGuidedMode(false);
            resetAttempts();
            const completionMsg = getGuidedCompletionMessage(currentTarget);
            setFeedback(completionMsg);

            // Move to next challenge after delay
            setTimeout(() => {
                // This will be handled by the existing validation success flow
                get().setConsecutiveFailures(0);
                get().setTotalChallengesCompleted(get().totalChallengesCompleted + 1);
            }, FEEDBACK_DELAY * 3);

            return;
        }

        // Show the next step instruction
        setFeedback(nextStep.message);
        setGuidedStep(guidedStep + 1);
    },

    // Advance solution animation
    advanceSolutionAnimation: () => {
        const { currentTarget, columns, solutionAnimationStep, setSolutionAnimationStep, setColumns, setShowSolutionAnimation, setFeedback } = get();

        const decomp = decomposeNumber(currentTarget);
        const targetArray = [decomp.units, decomp.tens, decomp.hundreds, decomp.thousands];

        // Animate from highest to lowest column
        const animationOrder = [3, 2, 1, 0]; // thousands, hundreds, tens, units
        const currentStep = solutionAnimationStep;

        if (currentStep === 0) {
            setFeedback("On commence à ZÉRO !");
            setSolutionAnimationStep(1);
            setTimeout(() => get().advanceSolutionAnimation(), 1000);
            return;
        }

        const stepIndex = currentStep - 1;
        if (stepIndex < 4) {
            const columnIndex = animationOrder[stepIndex];
            const targetValue = targetArray[columnIndex];

            // Update the column
            const newCols = [...columns];
            newCols[columnIndex] = { ...newCols[columnIndex], value: targetValue };
            setColumns(newCols);

            // Calculate running total
            const runningTotal = newCols.reduce((acc, col, idx) => acc + col.value * Math.pow(10, idx), 0);

            // Show step message
            const stepMsg = getSolutionAnimationStep(columnIndex, targetValue, runningTotal);
            setFeedback(stepMsg);

            setSolutionAnimationStep(currentStep + 1);
            setTimeout(() => get().advanceSolutionAnimation(), 2000);
        } else {
            // Animation complete
            setShowSolutionAnimation(false);
            setFeedback(`Voilà ! C'est comme ça qu'on fait ${currentTarget} ! 
Tu as vu les étapes ? 

Maintenant tu sais comment faire ! 
Tu veux :

[1] 🔄 Refaire ce nombre moi-même !
[2] ➡️ Passer au suivant !`);
        }
    },

    init: () => {
        const { phase } = get();
        console.log('[init] Starting initialization with phase:', phase);

        // If we're in loading phase, trigger the phase logic
        if (phase === 'loading') {
            // Force a call to setPhase to trigger the loading logic
            get().setPhase('loading');
        } else {
            get().updateInstruction();
        }
    },

    // Phase navigation functions
    getCurrentPhaseIndex: () => {
        const { phase } = get();
        return ALL_PHASES.indexOf(phase);
    },

    goToNextPhase: () => {
        const currentIndex = get().getCurrentPhaseIndex();
        if (currentIndex === -1) {
            console.warn('[goToNextPhase] Current phase not found in ALL_PHASES');
            return;
        }

        if (currentIndex >= ALL_PHASES.length - 1) {
            console.log('[goToNextPhase] Already at the last phase');
            set({ feedback: "Vous êtes déjà à la dernière phase !" });
            return;
        }

        const nextPhase = ALL_PHASES[currentIndex + 1];
        console.log(`[goToNextPhase] Moving from "${get().phase}" to "${nextPhase}"`);

        // Reset relevant state when moving to next phase
        const newCols = initialColumns.map(col => ({ ...col }));

        // Determine which columns should be unlocked based on the next phase
        if (nextPhase.includes('unit') || nextPhase.includes('tutorial') || nextPhase.includes('explore')) {
            newCols[0].unlocked = true;
        } else if (nextPhase.includes('ten') || nextPhase.includes('carry')) {
            newCols[0].unlocked = true;
            newCols[1].unlocked = true;
        } else if (nextPhase.includes('hundred')) {
            newCols[0].unlocked = true;
            newCols[1].unlocked = true;
            newCols[2].unlocked = true;
        } else if (nextPhase.includes('thousand')) {
            newCols[0].unlocked = true;
            newCols[1].unlocked = true;
            newCols[2].unlocked = true;
            newCols[3].unlocked = true;
        }



        set({
            columns: newCols,
            feedback: `Passage à la phase suivante : ${nextPhase}`,
            attemptCount: 0,
            consecutiveFailures: 0,
            showHelpOptions: false,
            guidedMode: false,
            showSolutionAnimation: false,
        });

        get().setPhase(nextPhase);
    },

    goToPreviousPhase: () => {
        const currentIndex = get().getCurrentPhaseIndex();
        if (currentIndex === -1) {
            console.warn('[goToPreviousPhase] Current phase not found in ALL_PHASES');
            return;
        }

        if (currentIndex <= 0) {
            console.log('[goToPreviousPhase] Already at the first phase');
            set({ feedback: "Vous êtes déjà à la première phase !" });
            return;
        }

        const previousPhase = ALL_PHASES[currentIndex - 1];
        console.log(`[goToPreviousPhase] Moving from "${get().phase}" to "${previousPhase}"`);

        // Reset relevant state when moving to previous phase
        const newCols = initialColumns.map(col => ({ ...col }));

        // Determine which columns should be unlocked based on the previous phase
        if (previousPhase.includes('unit') || previousPhase.includes('tutorial') || previousPhase.includes('explore')) {
            newCols[0].unlocked = true;
        } else if (previousPhase.includes('ten') || previousPhase.includes('carry')) {
            newCols[0].unlocked = true;
            newCols[1].unlocked = true;
        } else if (previousPhase.includes('hundred')) {
            newCols[0].unlocked = true;
            newCols[1].unlocked = true;
            newCols[2].unlocked = true;
        } else if (previousPhase.includes('thousand')) {
            newCols[0].unlocked = true;
            newCols[1].unlocked = true;
            newCols[2].unlocked = true;
            newCols[3].unlocked = true;
        }

        set({
            columns: newCols,
            feedback: `Retour à la phase précédente : ${previousPhase}`,
            attemptCount: 0,
            consecutiveFailures: 0,
            showHelpOptions: false,
            guidedMode: false,
            showSolutionAnimation: false,
        });

        get().setPhase(previousPhase);
    },

    // Phase status tracking functions
    getPhaseStatus: (phase) => {
        const { phaseStatusMap } = get();
        return {
            phase,
            status: phaseStatusMap[phase] || 'not-started'
        };
    },

    markPhaseComplete: (phase) => {
        const { phaseStatusMap } = get();
        console.log(`[markPhaseComplete] Marking phase "${phase}" as completed`);

        set({
            phaseStatusMap: {
                ...phaseStatusMap,
                [phase]: 'completed'
            }
        });

        // Check if auto-transition is enabled and trigger transition
        if (get().autoTransitionEnabled) {
            console.log('[markPhaseComplete] Auto-transition enabled, checking for next phase');
            setTimeout(() => {
                get().checkAndTransitionToNextPhase();
            }, 1000); // Small delay to allow UI updates
        }
    },

    isPhaseComplete: (phase) => {
        const { phaseStatusMap } = get();
        return phaseStatusMap[phase] === 'completed';
    },

    setAutoTransitionEnabled: (enabled) => {
        console.log(`[setAutoTransitionEnabled] Setting auto-transition to ${enabled}`);
        set({ autoTransitionEnabled: enabled });
    },

    checkAndTransitionToNextPhase: () => {
        const currentPhase = get().phase;
        const currentIndex = get().getCurrentPhaseIndex();

        if (currentIndex === -1) {
            console.warn('[checkAndTransitionToNextPhase] Current phase not found in ALL_PHASES');
            return;
        }

        if (currentIndex >= ALL_PHASES.length - 1) {
            console.log('[checkAndTransitionToNextPhase] Already at the last phase, no auto-transition');
            return;
        }

        // Check if current phase is completed
        if (!get().isPhaseComplete(currentPhase)) {
            console.log(`[checkAndTransitionToNextPhase] Current phase "${currentPhase}" not completed yet`);
            return;
        }

        // Don't auto-transition from certain phases that have explicit next phase logic
        const manualTransitionPhases = [
            'normal', 'done',
            'celebration-before-thousands',
            'celebration-thousands-complete',
            'intro-discover-machine', // Has user choice
            'intro-count-digits', // Has user input
            'intro-max-value-question', // Has user input
        ];

        if (manualTransitionPhases.includes(currentPhase)) {
            console.log(`[checkAndTransitionToNextPhase] Phase "${currentPhase}" requires manual transition`);
            return;
        }

        const nextPhase = ALL_PHASES[currentIndex + 1];
        console.log(`[checkAndTransitionToNextPhase] Auto-transitioning from "${currentPhase}" to "${nextPhase}"`);

        set({ feedback: `Transition automatique vers: ${nextPhase}` });
        setTimeout(() => {
            get().goToNextPhase();
        }, 500);
    },

    // ============================================================================
    // SIMPLIFIED TUTORIAL (DIDACTICIEL) ACTIONS
    // ============================================================================

    setDidacticielStep1UpClicks: (count) => set({ didacticielStep1UpClicks: count }),
    setDidacticielStep1DownClicks: (count) => set({ didacticielStep1DownClicks: count }),
    setDidacticielStep2TargetIndex: (index) => set({ didacticielStep2TargetIndex: index }),
    setDidacticielStep2SuccessCount: (count) => set({ didacticielStep2SuccessCount: count }),
    setDidacticielStep3Target: (target) => set({ didacticielStep3Target: target }),
    setDidacticielStep3SuccessCount: (count) => set({ didacticielStep3SuccessCount: count }),
    setShowDidacticielQuitButton: (show) => set({ showDidacticielQuitButton: show }),
    setIsInSimplifiedTutorial: (isIn) => set({ isInSimplifiedTutorial: isIn }),

    startSimplifiedTutorial: () => {
        console.log('[startSimplifiedTutorial] Starting simplified tutorial');
        
        // Reset all tutorial state
        const newCols = initialColumns.map(col => ({ ...col, value: 0, unlocked: true }));
        // Only unlock units column initially for step 1
        newCols[0].unlocked = true;
        newCols[1].unlocked = false;
        newCols[2].unlocked = false;
        newCols[3].unlocked = false;
        
        set({
            columns: newCols,
            phase: 'didacticiel-step1-buttons',
            isInSimplifiedTutorial: true,
            didacticielStep1UpClicks: 0,
            didacticielStep1DownClicks: 0,
            didacticielStep2TargetIndex: 0,
            didacticielStep2SuccessCount: 0,
            didacticielStep3Target: getRandomDidacticielNumber(),
            didacticielStep3SuccessCount: 0,
            showDidacticielQuitButton: false,
            feedback: "",
        });
        
        setValue(0);
        get().updateInstruction();
    },

    handleDidacticielStep1ButtonClick: (direction) => {
        const { 
            didacticielStep1UpClicks, 
            didacticielStep1DownClicks, 
            columns,
            sequenceFeedback,
            speakAndThen
        } = get();
        
        const newCols = [...columns];
        
        if (direction === 'up') {
            const newUpClicks = didacticielStep1UpClicks + 1;
            set({ didacticielStep1UpClicks: newUpClicks });
            
            // Increment the unit column value
            if (newCols[0].value < 9) {
                newCols[0].value++;
                set({ columns: newCols });
                setValue(newCols[0].value);
            }
            
            if (newUpClicks === DIDACTICIEL_REQUIRED_CLICKS && didacticielStep1DownClicks < DIDACTICIEL_REQUIRED_CLICKS) {
                speakAndThen(`Parfait ! Tu as cliqué ${DIDACTICIEL_REQUIRED_CLICKS} fois sur Haut ! Maintenant clique ${DIDACTICIEL_REQUIRED_CLICKS} fois sur Bas !`);
            }
        } else if (direction === 'down') {
            const newDownClicks = didacticielStep1DownClicks + 1;
            set({ didacticielStep1DownClicks: newDownClicks });
            
            // Decrement the unit column value
            if (newCols[0].value > 0) {
                newCols[0].value--;
                set({ columns: newCols });
                setValue(newCols[0].value);
            }
            
            if (newDownClicks === DIDACTICIEL_REQUIRED_CLICKS && didacticielStep1UpClicks >= DIDACTICIEL_REQUIRED_CLICKS) {
                // Step 1 complete - show validate message
                sequenceFeedback(
                    "Bravo ! Tu as bien compris les boutons Haut et Bas !",
                    "Clique sur VALIDER pour passer à l'étape suivante.",
                    () => {
                        set({ showValidateLearningButton: true });
                    }
                );
            }
        }
        
        // Update progress feedback
        const currentUp = get().didacticielStep1UpClicks;
        const currentDown = get().didacticielStep1DownClicks;
        if (currentUp < DIDACTICIEL_REQUIRED_CLICKS || currentDown < DIDACTICIEL_REQUIRED_CLICKS) {
            set({ feedback: `Haut: ${currentUp}/3 | Bas: ${currentDown}/3` });
        }
    },

    handleDidacticielStep2Validate: () => {
        const { 
            columns, 
            didacticielStep2TargetIndex, 
            didacticielStep2SuccessCount,
            sequenceFeedback,
            speakAndThen
        } = get();
        
        // Get current target
        const challenge = DIDACTICIEL_STEP2_CHALLENGES;
        const targetNumber = challenge.targets[didacticielStep2TargetIndex];
        
        // Calculate current value from columns
        const currentValue = columns.reduce((acc, col, idx) => acc + col.value * Math.pow(10, idx), 0);
        
        if (currentValue === targetNumber) {
            // Success!
            sendCorrectValue();
            const newSuccessCount = didacticielStep2SuccessCount + 1;
            set({ didacticielStep2SuccessCount: newSuccessCount });
            
            if (didacticielStep2TargetIndex + 1 >= challenge.targets.length) {
                // Step 2 complete - move to step 3
                sequenceFeedback(
                    "Félicitations ! Tu as complété tous les défis de cette étape !",
                    "Tu comprends maintenant comment fonctionnent les colonnes. Passons aux exercices libres !",
                    () => {
                        const newCols = initialColumns.map(col => ({ ...col, value: 0, unlocked: true }));
                        set({
                            columns: newCols,
                            phase: 'didacticiel-step3-free-practice',
                            didacticielStep3Target: getRandomDidacticielNumber(),
                            showDidacticielQuitButton: true,
                        });
                        setValue(0);
                        get().updateInstruction();
                    }
                );
            } else {
                // Next target in step 2
                sendNextGoal();
                const nextTarget = challenge.targets[didacticielStep2TargetIndex + 1];
                const newCols = initialColumns.map(col => ({ ...col, value: 0, unlocked: true }));
                set({
                    columns: newCols,
                    didacticielStep2TargetIndex: didacticielStep2TargetIndex + 1,
                });
                setValue(0);
                speakAndThen(`Excellent ! Tu as réussi ${newSuccessCount}/3 défis ! Maintenant affiche ${nextTarget} !`);
                get().updateInstruction();
            }
        } else {
            // Incorrect
            sendWrongValue();
            const diff = Math.abs(currentValue - targetNumber);
            let hint = "";
            if (diff <= 10) {
                hint = "Tu y es presque !";
            } else if (currentValue < targetNumber) {
                hint = "Le nombre est PLUS GRAND que ça !";
            } else {
                hint = "Le nombre est PLUS PETIT que ça !";
            }
            speakAndThen(`Ce n'est pas tout à fait ça. ${hint} Essaie encore !`);
        }
    },

    handleDidacticielStep3Validate: () => {
        const { 
            columns, 
            didacticielStep3Target, 
            didacticielStep3SuccessCount,
            speakAndThen
        } = get();
        
        // Calculate current value from columns
        const currentValue = columns.reduce((acc, col, idx) => acc + col.value * Math.pow(10, idx), 0);
        
        if (currentValue === didacticielStep3Target) {
            // Success!
            sendCorrectValue();
            const newSuccessCount = didacticielStep3SuccessCount + 1;
            set({ didacticielStep3SuccessCount: newSuccessCount });
            
            // Get next random target
            const nextTarget = getRandomDidacticielNumber();
            const newCols = initialColumns.map(col => ({ ...col, value: 0, unlocked: true }));
            
            set({
                columns: newCols,
                didacticielStep3Target: nextTarget,
            });
            setValue(0);
            
            // Send the new target to Unity
            sendChallengeListToUnity([nextTarget]);
            
            speakAndThen(`Bravo ! ${newSuccessCount} exercice${newSuccessCount > 1 ? 's' : ''} réussi${newSuccessCount > 1 ? 's' : ''} ! Voici un nouveau nombre : ${nextTarget} !`);
            get().updateInstruction();
        } else {
            // Incorrect
            sendWrongValue();
            const diff = Math.abs(currentValue - didacticielStep3Target);
            let hint = "";
            if (diff <= 10) {
                hint = "Tu y es presque !";
            } else if (currentValue < didacticielStep3Target) {
                hint = "Le nombre est PLUS GRAND que ça !";
            } else {
                hint = "Le nombre est PLUS PETIT que ça !";
            }
            speakAndThen(`Ce n'est pas tout à fait ça. ${hint} Essaie encore !`);
        }
    },

    quitDidacticiel: () => {
        const { didacticielStep3SuccessCount, sequenceFeedback } = get();
        
        sequenceFeedback(
            `Merci d'avoir utilisé le didacticiel ! Tu as réussi ${didacticielStep3SuccessCount} exercice${didacticielStep3SuccessCount > 1 ? 's' : ''} !`,
            "Tu peux maintenant utiliser la machine librement. À bientôt !",
            () => {
                const newCols = initialColumns.map(col => ({ ...col, value: 0, unlocked: true }));
                set({
                    columns: newCols,
                    phase: 'normal',
                    isInSimplifiedTutorial: false,
                    showDidacticielQuitButton: false,
                });
                setValue(0);
                get().updateInstruction();
            }
        );
    },

    resetDidacticiel: () => {
        set({
            didacticielStep1UpClicks: 0,
            didacticielStep1DownClicks: 0,
            didacticielStep2TargetIndex: 0,
            didacticielStep2SuccessCount: 0,
            didacticielStep3Target: getRandomDidacticielNumber(),
            didacticielStep3SuccessCount: 0,
            showDidacticielQuitButton: false,
            isInSimplifiedTutorial: false,
        });
    },
}));
useStore.subscribe(
    (state, previousState) => {
        const phase = state.phase;
        const columns = state.columns;
        const isCountingAutomatically = state.isCountingAutomatically;
        if (phase != 'loading') {
            // Get unlocked state from store columns - this is the source of truth
            const isUnit = columns[0]?.unlocked || false;
            const isTen = columns[1]?.unlocked || false;
            const isHundred = columns[2]?.unlocked || false;
            const isThousand = columns[3]?.unlocked || false;

            console.log('isUnit:', isUnit);

            // Lock all rolls initially
            let lockUnits = true;
            let lockTens = true;
            let lockHundreds = true;
            let lockThousands = true;

            // Determine which rolls should be unlocked based on phase and column unlock state
            if (phase == 'intro-first-interaction' && isUnit) {
                lockUnits = false;
            }
            if (phase == 'intro-second-column' && isUnit) {
                lockUnits = false;
            }
            if (phase == 'delock-dizaines') {
                // During unlock phase, keep everything locked to show the unlocking animation
                lockUnits = false;
                lockTens = false;
            } else if (phase == 'practice-ten') {
                // During unlock phase, keep everything locked to show the unlocking animation
                lockUnits = false;
                lockTens = false;
            } else if (phase === "didacticiel-step1-buttons") {
                // Handle simplified tutorial (didacticiel) phases
                // Step 1: Only unlock units column for button discovery
                lockUnits = false;
            } else if (phase === "didacticiel-step2-columns" || phase === "didacticiel-step3-free-practice") {
                // Steps 2 & 3: Unlock all columns for column understanding and free practice
                lockUnits = false;
                lockTens = false;
                lockHundreds = false;
                lockThousands = false;
            } else if (phase === "normal") {
                // In normal mode, directly use store unlock state
                lockUnits = !isUnit;
                lockTens = !isTen;
                lockHundreds = !isHundred;
                lockThousands = !isThousand;
            } else if (

                phase.startsWith("challenge-unit-") &&
                isUnit
            ) {
                lockUnits = false;
            } else if (phase === "challenge-ten-to-twenty") {
                lockUnits = false;
                lockTens = false;
            }
            else if (phase === "learn-carry" && isUnit) {
                lockUnits = false;
            } else if (
                (phase === "learn-ten-to-twenty" ||
                    phase === "learn-twenty-to-thirty") &&
                isUnit
            ) {
                lockUnits = false;
                lockTens = false;
            } else if (
                phase === "practice-hundred" &&
                (isUnit || isTen || isHundred)
            ) {
                // Use store unlock state for practice
                lockUnits = !isUnit;
                lockTens = !isTen;
                lockHundreds = !isHundred;
            } else if (
                (phase === "learn-hundred-to-hundred-ten" ||
                    phase === "learn-hundred-ten-to-two-hundred" ||
                    phase === "challenge-hundred-to-two-hundred" ||
                    phase === "learn-two-hundred-to-three-hundred" ||
                    phase === "challenge-two-hundred-to-three-hundred") &&
                isUnit
            ) {
                lockUnits = false;
            } else if (
                (phase.startsWith("challenge-tens-") ||
                    phase === "learn-tens-combination") &&
                (isUnit || isTen)
            ) {
                // Use store unlock state
                lockUnits = !isUnit;
                lockTens = !isTen;
            } else if (
                (phase.startsWith("challenge-hundreds-") ||
                    phase === "learn-hundreds-combination" ||
                    phase === "learn-hundreds-simple-combination") &&
                (isUnit || isTen || isHundred)
            ) {
                // Use store unlock state
                lockUnits = !isUnit;
                lockTens = !isTen;
                lockHundreds = !isHundred;
            } else if (
                phase === "practice-thousand" &&
                (isUnit || isTen || isHundred || isThousand)
            ) {
                // Use store unlock state for practice
                lockUnits = !isUnit;
                lockTens = !isTen;
                lockHundreds = !isHundred;
                lockThousands = !isThousand;
            } else if (
                (phase === "learn-thousand-to-thousand-ten" ||
                    phase === "learn-thousand-to-thousand-hundred" ||
                    phase === "learn-thousand-hundred-to-two-thousand" ||
                    phase === "challenge-thousand-to-two-thousand" ||
                    phase === "learn-two-thousand-to-three-thousand" ||
                    phase === "challenge-two-thousand-to-three-thousand") &&
                isUnit
            ) {
                lockUnits = false;
            } else if (
                (phase.startsWith("challenge-thousands-") ||
                    phase === "learn-thousands-combination" ||
                    phase === "challenge-thousands-simple-combination" ||
                    phase === "learn-thousands-very-simple-combination" ||
                    phase === "learn-thousands-full-combination") &&
                (isUnit || isTen || isHundred || isThousand)
            ) {
                // Use store unlock state
                lockUnits = !isUnit;
                lockTens = !isTen;
                lockHundreds = !isHundred;
                lockThousands = !isThousand;
            }

            // During auto-counting, lock everything
            if (isCountingAutomatically) {
                lockUnits = true;
                lockTens = true;
                lockHundreds = true;
                lockThousands = true;
            }

            LockUnitRoll(lockUnits);
            LockTenRoll(lockTens);
            LockHundredRoll(lockHundreds);
            LockThousandRoll(lockThousands);
        }


        if (
            state.phase.startsWith('learn-') &&
            state.pendingAutoCount &&
            !state.isCountingAutomatically &&
            // Only trigger when pendingAutoCount changed to true or phase changed
            (state.pendingAutoCount !== previousState.pendingAutoCount ||
                state.phase !== previousState.phase)
        ) {
            // Use a small delay to ensure state updates are processed
            setTimeout(() => {
                const currentState = useStore.getState();
                // Re-verify conditions before executing
                if (
                    currentState.phase.startsWith('learn-') &&
                    currentState.pendingAutoCount &&
                    !currentState.isCountingAutomatically
                ) {
                    currentState.setIsCountingAutomatically(true);
                    currentState.setPendingAutoCount(false);
                    currentState.runAutoCount();
                }
            }, 100);
        }
    });