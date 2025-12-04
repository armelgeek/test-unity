import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { useStore, initialColumns } from "./store.ts";
import { UnityGame } from "./components/UnityGame";
import { parse, useUnity } from "./hooks/useUnity";
import { UI_MESSAGES } from "./instructions.ts";


function formatNumber(num: number, length = 4) {
  return num.toString().padStart(length, "0");
}
function MachineANombres() {
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const {
    init,
    columns,
    phase,
    instruction,
    feedback,
    userInput,
    showInputField,
    handleAdd,
    handleSubtract,
    handleSetValue,
    handleValidateTutorialChallenge,
    handleValidateLearning,
    handleValidateTenToTwenty,
    handleValidateTens,
    handleValidateHundredToTwoHundred,
    handleValidateTwoHundredToThreeHundred,
    handleValidateHundreds,
    handleValidateThousands,
    handleValidateThousandToTwoThousand,
    handleValidateTwoThousandToThreeThousand,
    handleValidateThousandsSimpleCombination,
    startLearningPhase,
    unlockNextColumn,
    showUnlockButton,
    showStartLearningButton,
    showValidateLearningButton,
    showValidateTensButton,
    showValidateHundredsButton,
    showValidateThousandsButton,
    setUserInput,
    handleUserInputSubmit,
    attemptCount,
    showHelpOptions,
    totalChallengesCompleted,
    handleHelpChoice,
    guidedMode,
    showSolutionAnimation,
    currentTarget,
    setFeedback,
    // New intro state
    showResponseButtons,
    setSelectedResponse,
    handleIntroNameSubmit,
    handleIntroMachineResponse,
    handleIntroSecondColumnChoice,
    handleIntroThirdColumnChoice,
    handleIntroFourthColumnChoice,
    introMaxAttempt: _introMaxAttempt,
    // Phase navigation functions
    goToNextPhase,
    getCurrentPhaseIndex,
    // Unity loading state setters
    setUnityLoaded,
    setUnityLoadingProgression,
    // Simplified tutorial (didacticiel) state and handlers
    didacticielStep1UpClicks,
    didacticielStep1DownClicks,
    didacticielStep2TargetIndex,
    didacticielStep3SuccessCount,
    showDidacticielQuitButton,
    startSimplifiedTutorial,
    handleDidacticielStep2Validate,
    handleDidacticielStep3Validate,
    quitDidacticiel,
  } = useStore();

  // Unity integration
  const {
    isLoaded: unityLoaded,
    loadingProgression: unityLoadingProgression,
    changeCurrentValue,
  } = useUnity();

  // Local typing animation state
  const [typedInstruction, setTypedInstruction] = useState("");
  const [typedFeedback, setTypedFeedback] = useState("");
  const [isTypingInstruction, setIsTypingInstruction] = useState(false);
  const [isTypingFeedback, setIsTypingFeedback] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  // Validation lock to prevent duplicate validations
  const validationInProgressRef = useRef(false);
  const lastValidationTimeRef = useRef(0);

  // Handle manual validation button click
  const handleManualValidation = useCallback(() => {
    // Prevent duplicate validations within 500ms window
    const now = Date.now();
    if (validationInProgressRef.current || (now - lastValidationTimeRef.current) < 500) {
      return;
    }
    validationInProgressRef.current = true;
    lastValidationTimeRef.current = now;
    setTimeout(() => {
      validationInProgressRef.current = false;
    }, 100);
    
    // Handle simplified tutorial (didacticiel) phases
    if (phase === "didacticiel-step1-buttons") {
      // Step 1 complete - move to step 2
      if (didacticielStep1UpClicks >= 3 && didacticielStep1DownClicks >= 3) {
        // Transition to step 2
        const { setPhase, setColumns } = useStore.getState();
        const newCols = initialColumns.map(col => ({ ...col, value: 0, unlocked: true }));
        setColumns(newCols);
        setPhase('didacticiel-step2-columns');
      }
      return;
    } else if (phase === "didacticiel-step2-columns") {
      handleDidacticielStep2Validate();
      return;
    } else if (phase === "didacticiel-step3-free-practice") {
      handleDidacticielStep3Validate();
      return;
    }
    
    if (phase === "challenge-ten-to-twenty") {
      handleValidateTenToTwenty();
    } else if (phase === 'tutorial-challenge') {
      handleValidateTutorialChallenge();
    } else if (
      phase === "challenge-unit-1" ||
      phase === "challenge-unit-2" ||
      phase === "challenge-unit-3"
    ) {
      handleValidateLearning();
    } else if (
      phase === "challenge-tens-1" ||
      phase === "challenge-tens-2" ||
      phase === "challenge-tens-3"
    ) {
      handleValidateTens();
    } else if (phase === "challenge-hundred-to-two-hundred") {
      handleValidateHundredToTwoHundred();
    } else if (phase === "challenge-two-hundred-to-three-hundred") {
      handleValidateTwoHundredToThreeHundred();
    } else if (
      phase === "challenge-hundreds-1" ||
      phase === "challenge-hundreds-2" ||
      phase === "challenge-hundreds-3"
    ) {
      handleValidateHundreds();
    } else if (phase === "challenge-thousand-to-two-thousand") {
      handleValidateThousandToTwoThousand();
    } else if (phase === "challenge-two-thousand-to-three-thousand") {
      handleValidateTwoThousandToThreeThousand();
    } else if (phase === "challenge-thousands-simple-combination") {
      handleValidateThousandsSimpleCombination();
    } else if (
      phase === "challenge-thousands-1" ||
      phase === "challenge-thousands-2" ||
      phase === "challenge-thousands-3"
    ) {
      handleValidateThousands();
    } else {
      // Not a challenge phase - provide feedback
      setFeedback("Il n'y a pas de défi en ce moment ! Suis les instructions ! 👀");
    }
  }, [phase, didacticielStep1UpClicks, didacticielStep1DownClicks, handleDidacticielStep2Validate, handleDidacticielStep3Validate, handleValidateTenToTwenty, handleValidateTutorialChallenge, handleValidateLearning, handleValidateTens, handleValidateHundredToTwoHundred, handleValidateTwoHundredToThreeHundred, handleValidateHundreds, handleValidateThousandToTwoThousand, handleValidateTwoThousandToThreeThousand, handleValidateThousandsSimpleCombination, handleValidateThousands, setFeedback]);

  // Handle messages from Unity (button clicks)
  const handleUnityMessage = useCallback(
    (message: string) => {
      const data = parse(message);
      if (!data || typeof data !== "object" || !("type" in data)) {
        return;
      }
      const parsedData = data as { type: string; numericValue?: number };
      const getColumnIndex = (value?: number): number => {
        if (!value) return 0;
        if (value === 1) return 0;
        if (value === 10) return 1;
        if (value === 100) return 2;
        if (value === 1000) return 3;
        return 0;
      };
      const columnIndex = getColumnIndex(parsedData.numericValue);
      if (parsedData.type === "increaseValue") {
        handleAdd(columnIndex);
      } else if (parsedData.type === "decreaseValue") {
        handleSubtract(columnIndex);
      } else if (parsedData.type == "setValue") {
        handleSetValue(formatNumber(parsedData.numericValue || 0));
      } else if (parsedData.type === "addGoal") {
        // Note: This message type is no longer used for automatic validation.
      } else if (parsedData.type == "validButton") {
        handleManualValidation();
      }
      // Les autres cas sont ignorés ou loggés
    },
    [handleAdd, handleSubtract, handleSetValue, handleManualValidation]
  );

  // Set up Unity message handler
  useEffect(() => {
    window.onUnityMessage = handleUnityMessage;
    return () => {
      window.onUnityMessage = undefined;
    };
  }, [handleUnityMessage]);


  // Démarrage du jeu après interaction utilisateur pour déverrouiller l'audio
  useEffect(() => {
    if (audioUnlocked) {
      init();
    }
  }, [audioUnlocked, init]);


  const totalNumber = useMemo(
    () =>
      columns.reduce((acc, col, idx) => acc + col.value * Math.pow(10, idx), 0),
    [columns]
  );

  // Typing animation effect for instruction
  useEffect(() => {
    if (!instruction) return;

    setIsTypingInstruction(true);
    setTypedInstruction("");
    setTypedFeedback("");

    let currentIndex = 0;
    const typeNextChar = () => {
      if (currentIndex <= instruction.length) {
        setTypedInstruction(instruction.slice(0, currentIndex));
        currentIndex++;
        typingTimeoutRef.current = setTimeout(typeNextChar, 18);
      } else {
        setIsTypingInstruction(false);
      }
    };

    typeNextChar();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [instruction]);

  // Typing animation effect for feedback
  useEffect(() => {
    if (!feedback) return;

    setIsTypingFeedback(true);
    setTypedFeedback("");

    const prefixed = ` ${feedback}`;
    let currentIndex = 0;
    const typeNextChar = () => {
      if (currentIndex <= prefixed.length) {
        setTypedFeedback(prefixed.slice(0, currentIndex));
        currentIndex++;
        typingTimeoutRef.current = setTimeout(typeNextChar, 18);
      } else {
        setIsTypingFeedback(false);
      }
    };

    typeNextChar();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [feedback]);

  const displayText = useMemo(
    () => typedFeedback || typedInstruction,
    [typedInstruction, typedFeedback]
  );

  const isTyping = isTypingInstruction || isTypingFeedback;

  // Update store with Unity loading state
  useEffect(() => {
    setUnityLoaded(unityLoaded);
  }, [unityLoaded, setUnityLoaded]);

  useEffect(() => {
    setUnityLoadingProgression(unityLoadingProgression);
  }, [unityLoadingProgression, setUnityLoadingProgression]);

  // Sync Unity machine value with current state
  useEffect(() => {
    if (unityLoaded) {
      changeCurrentValue(totalNumber.toString());
    }
  }, [totalNumber, unityLoaded, changeCurrentValue]);



  // Variable pour l'écran de démarrage
  const showStartScreen = !audioUnlocked;

  // Tous les hooks doivent être appelés avant tout return

  // Rendu conditionnel de l'écran de démarrage
  if (showStartScreen) {
    return (
      <div className="font-sans flex flex-col justify-center items-center h-screen text-[22px] text-sky-500 bg-slate-100">
        <div className="mb-8">Bienvenue dans la machine à compter !</div>
        <div className="flex flex-col gap-4">
          <button
            className="text-[20px] px-10 py-4 bg-gradient-to-br from-sky-500 to-sky-700 text-white border-none rounded-xl cursor-pointer font-bold shadow-md transition-all duration-200"
            onClick={async () => {
              // Débloquer l'AudioContext si besoin (compatibilité Chrome/Safari)
              const WindowWithWebkit = window as Window & { webkitAudioContext?: typeof AudioContext };
              const AudioCtx = window.AudioContext || WindowWithWebkit.webkitAudioContext;
              if (AudioCtx) {
                try {
                  const ctx = new AudioCtx();
                  if (ctx.state === 'suspended') {
                    await ctx.resume();
                  }
                  ctx.close();
                } catch { /* ignore */ }
              }
              setAudioUnlocked(true);
            }}
          >
            Commencer
          </button>
          <button
            className="text-[18px] px-8 py-3 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-none rounded-xl cursor-pointer font-bold shadow-md transition-all duration-200"
            onClick={async () => {
              // Débloquer l'AudioContext si besoin (compatibilité Chrome/Safari)
              const WindowWithWebkit = window as Window & { webkitAudioContext?: typeof AudioContext };
              const AudioCtx = window.AudioContext || WindowWithWebkit.webkitAudioContext;
              if (AudioCtx) {
                try {
                  const ctx = new AudioCtx();
                  if (ctx.state === 'suspended') {
                    await ctx.resume();
                  }
                  ctx.close();
                } catch { /* ignore */ }
              }
              setAudioUnlocked(true);
              // Start simplified tutorial after audio is unlocked
              setTimeout(() => {
                startSimplifiedTutorial();
              }, 100);
            }}
          >
            🎓 Didacticiel Simplifié (3 étapes)
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="font-sans flex h-screen" >
      {/* Sidebar assistant */}
      <aside style={{
        backgroundColor: 'oklch(0.42 0.1947 261.88)'
      }} className="w-[320px] min-w-[260px] max-w-[340px] h-full bg-white border-r border-slate-200 flex flex-col shadow-lg overflow-y-auto">
        <div className="flex-1 flex flex-col pt-12 px-4">
          <div className="mb-4">
            <div style={{
              backgroundColor: 'oklch(0.52 0.1401 247.65)'
            }} className="rounded-xl shadow-lg border border-slate-200 p-6 h-64 overflow-auto flex flex-col justify-between">
              <div className="text-[15px] leading-relaxed text-white">
                <p
                  className="m-0"
                  dangerouslySetInnerHTML={{
                    __html: displayText.replace(
                      /\*\*(.*?)\*\*/g,
                      "<strong>$1</strong>"
                    ),
                  }}
                />
                {phase == 'loading' && "Chargement de l'assistant... "}
                {isTyping && (
                  <span
                    className="inline-block w-2 h-[14px] bg-white rounded animate-blink ml-0.5 align-text-bottom"
                  ></span>
                )}
              </div>
            </div>
          </div>
          {/* Blocs d'interaction utilisateur */}
          <div className="px-4 pb-4 flex flex-col gap-4">
            {/* Boutons de phase (Débloquer / Commencer) */}
            {(showUnlockButton || showStartLearningButton) && (
              <div className="text-center">
                {showStartLearningButton && (
                  <button
                    onClick={startLearningPhase}
                    className="text-[16px] px-6 py-2 bg-gradient-to-br from-sky-500 to-sky-700 text-white border-none rounded-lg cursor-pointer font-bold shadow-md transition-all duration-200 animate-pulse"
                  >
                    {phase === "celebration-before-thousands"
                      ? UI_MESSAGES.buttons.startLearning.thousands
                      : phase === "celebration-thousands-complete"
                        ? UI_MESSAGES.buttons.startLearning.freeMode
                        : UI_MESSAGES.buttons.startLearning.default}
                  </button>
                )}
                {showUnlockButton && (
                  <button
                    onClick={unlockNextColumn}
                    className={`text-[15px] px-5 py-2 bg-gradient-to-br from-violet-500 to-violet-700 text-white border-none rounded-lg cursor-pointer font-bold transition-all duration-200 shadow-md animate-pulse${showStartLearningButton ? ' ml-3' : ''}`}
                  >
                    {UI_MESSAGES.buttons.unlock}
                  </button>
                )}
              </div>
            )}
            {/* Input field for questions */}
            {showInputField && (
              <div className="text-center">
                {phase === "intro-welcome-personalized" ? (
                  <>
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleIntroNameSubmit();
                        }
                      }}
                      placeholder="Ton prénom (optionnel)..."
                      className="text-[16px] px-3 py-2 rounded-md border-2 border-slate-300 w-[200px] text-center mr-2"
                    />
                    <button
                      onClick={handleIntroNameSubmit}
                      className="text-[16px] px-5 py-2 bg-gradient-to-br from-sky-500 to-sky-700 text-white border-none rounded-lg cursor-pointer font-bold shadow-md transition-all duration-200"
                    >
                      ✓ Continuer
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUserInputSubmit();
                        }
                      }}
                      placeholder="Ta réponse..."
                      className="text-[16px] px-3 py-2 rounded-md border-2 bg-white w-[120px] text-center mr-2"
                    />
                    <button
                      onClick={handleUserInputSubmit}
                      className="text-[16px] px-5 py-2 bg-gradient-to-br from-sky-500 to-sky-700 text-white border-none rounded-lg cursor-pointer font-bold shadow-md transition-all duration-200"
                    >
                      ✓ Valider
                    </button>
                  </>
                )}
              </div>
            )}
            {/* Response buttons for intro-discover-machine */}
            {showResponseButtons && phase === "intro-discover-machine" && (
              <div className="flex flex-col gap-2 items-center">
                <button
                  onClick={() => {
                    setSelectedResponse("belle");
                    handleIntroMachineResponse();
                  }}
                  className="text-[16px] px-5 py-2 bg-gradient-to-br from-amber-400 to-amber-600 text-white border-none rounded-lg cursor-pointer font-bold shadow-md w-[250px]"
                >
                  Trop belle !
                </button>
                <button
                  onClick={() => {
                    setSelectedResponse("bof");
                    handleIntroMachineResponse();
                  }}
                  className="text-[16px] px-5 py-2 bg-gradient-to-br from-slate-400 to-slate-600 text-white border-none rounded-lg cursor-pointer font-bold shadow-md w-[250px]"
                >
                  Bof...
                </button>
                <button
                  onClick={() => {
                    setSelectedResponse("comprends-rien");
                    handleIntroMachineResponse();
                  }}
                  className="text-[16px] px-5 py-2 bg-gradient-to-br from-violet-500 to-violet-700 text-white border-none rounded-lg cursor-pointer font-bold shadow-md w-[250px]"
                >
                  J'y comprends rien !
                </button>
                <button
                  onClick={() => {
                    setSelectedResponse("cest-quoi");
                    handleIntroMachineResponse();
                  }}
                  className="text-[16px] px-5 py-2 bg-gradient-to-br from-sky-500 to-sky-700 text-white border-none rounded-lg cursor-pointer font-bold shadow-md w-[250px]"
                >
                  C'est quoi ?
                </button>
              </div>
            )}
            {/* Choice buttons for intro-second-column */}
            {phase === "intro-second-column" && (
              <div className="flex flex-col gap-2 items-center">
                <button
                  onClick={() => handleIntroSecondColumnChoice("ajouter-rouleau")}
                  className="text-[16px] px-5 py-2 bg-gradient-to-br from-green-500 to-green-700 text-white border-none rounded-lg cursor-pointer font-bold shadow-md w-[280px]"
                >
                  Ajouter un rouleau !
                </button>
                <button
                  onClick={() => handleIntroSecondColumnChoice("plus-grande")}
                  className="text-[16px] px-5 py-2 bg-gradient-to-br from-sky-500 to-sky-700 text-white border-none rounded-lg cursor-pointer font-bold shadow-md w-[280px]"
                >
                  Faire une plus grande machine !
                </button>
                <button
                  onClick={() => handleIntroSecondColumnChoice("sais-pas")}
                  className="text-[16px] px-5 py-2 bg-gradient-to-br from-slate-400 to-slate-600 text-white border-none rounded-lg cursor-pointer font-bold shadow-md w-[280px]"
                >
                  Je ne sais pas !
                </button>
              </div>
            )}
            {/* Choice buttons for intro-three-column */}
            {phase === "intro-three-column" && (
              <div className="flex flex-col gap-2 items-center">
                <button
                  onClick={() => handleIntroThirdColumnChoice("ajouter-rouleau")}
                  className="text-[16px] px-5 py-2 bg-gradient-to-br from-green-500 to-green-700 text-white border-none rounded-lg cursor-pointer font-bold shadow-md w-[280px]"
                >
                  Ajouter un troisième rouleau !
                </button>
                <button
                  onClick={() => handleIntroThirdColumnChoice("plus-grande")}
                  className="text-[16px] px-5 py-2 bg-gradient-to-br from-sky-500 to-sky-700 text-white border-none rounded-lg cursor-pointer font-bold shadow-md w-[280px]"
                >
                  Faire une encore plus grande machine !
                </button>
                <button
                  onClick={() => handleIntroThirdColumnChoice("sais-pas")}
                  className="text-[16px] px-5 py-2 bg-gradient-to-br from-slate-400 to-slate-600 text-white border-none rounded-lg cursor-pointer font-bold shadow-md w-[280px]"
                >
                  Je ne sais pas !
                </button>
              </div>
            )}
            {/* Choice buttons for intro-four-column */}
            {phase === "intro-four-column" && (
              <div className="flex flex-col gap-2 items-center">
                <button
                  onClick={() => handleIntroFourthColumnChoice("ajouter-rouleau")}
                  className="text-[16px] px-5 py-2 bg-gradient-to-br from-green-500 to-green-700 text-white border-none rounded-lg cursor-pointer font-bold shadow-md w-[280px]"
                >
                  Ajouter un quatrième rouleau !
                </button>
                <button
                  onClick={() => handleIntroFourthColumnChoice("plus-grande")}
                  className="text-[16px] px-5 py-2 bg-gradient-to-br from-sky-500 to-sky-700 text-white border-none rounded-lg cursor-pointer font-bold shadow-md w-[280px]"
                >
                  Faire la machine ultime !
                </button>
                <button
                  onClick={() => handleIntroFourthColumnChoice("sais-pas")}
                  className="text-[16px] px-5 py-2 bg-gradient-to-br from-slate-400 to-slate-600 text-white border-none rounded-lg cursor-pointer font-bold shadow-md w-[280px]"
                >
                  Je ne sais pas !
                </button>
              </div>
            )}
            {/* Attempt indicator for challenges */}
            {(showValidateLearningButton ||
              showValidateTensButton ||
              showValidateHundredsButton ||
              showValidateThousandsButton) &&
              attemptCount > 0 && (
                <div
                  className={`px-3 py-2 rounded-md text-center text-[13px] font-bold ${
                    attemptCount === 1
                      ? 'bg-blue-100 text-blue-900'
                      : attemptCount === 2
                        ? 'bg-yellow-100 text-yellow-900'
                        : attemptCount === 3
                          ? 'bg-orange-100 text-orange-900'
                          : 'bg-red-100 text-red-900'
                  }`}
                >
                  {attemptCount === 1 && "Essai 1/4"}
                  {attemptCount === 2 && "Essai 2/4 - Tu peux le faire !"}
                  {attemptCount === 3 && "Essai 3/4 - Voici des indices !"}
                  {attemptCount >= 4 && "Besoin d'aide ?"}
                </div>
              )}
            {/* Help options when user has tried 4+ times */}
            {showHelpOptions && (
              <div className="p-4 bg-yellow-100 rounded-lg border-2 border-yellow-400">
                <p className="mb-3 text-[14px] font-bold text-yellow-900 text-center">
                  Comment veux-tu continuer ?
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleHelpChoice("tryAgain")}
                    className="text-[14px] px-4 py-2 bg-gradient-to-br from-amber-400 to-amber-600 text-white border-none rounded-md cursor-pointer font-bold shadow transition-all duration-200"
                  >
                    Essayer encore tout seul !
                  </button>
                  <button
                    onClick={() => handleHelpChoice("guided")}
                    className="text-[14px] px-4 py-2 bg-gradient-to-br from-blue-500 to-blue-700 text-white border-none rounded-md cursor-pointer font-bold shadow transition-all duration-200"
                  >
                    Aide-moi à le faire !
                  </button>
                
                </div>
              </div>
            )}
            {/* Progress tracker showing total challenges completed */}
            {totalChallengesCompleted > 0 && (
              <div className="px-3 py-2 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-md text-center text-[13px] font-bold text-white shadow">
                {totalChallengesCompleted} défi
                {totalChallengesCompleted > 1 ? "s" : ""} réussi
                {totalChallengesCompleted > 1 ? "s" : ""} ! Continue !
              </div>
            )}
            {/* Guided mode indicator */}
            {guidedMode && (
              <div className="px-3 py-2 bg-gradient-to-br from-blue-500 to-blue-700 rounded-md text-center text-[13px] font-bold text-white shadow">
                Mode guidé actif - Suis les instructions !
              </div>
            )}
            {/* Solution animation indicator */}
            {showSolutionAnimation && (
              <div className="px-3 py-2 bg-gradient-to-br from-violet-500 to-violet-700 rounded-md text-center text-[13px] font-bold text-white shadow">
                Regarde bien comment on construit le nombre {currentTarget} !
              </div>
            )}
            {/* Simplified tutorial (didacticiel) progress indicators */}
            {phase === 'didacticiel-step1-buttons' && (
              <div className="px-3 py-2 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-md text-center text-[13px] font-bold text-white shadow">
                <div className="text-[11px] mb-1">📚 Étape 1 : Découverte des boutons</div>
                <div>Haut: {didacticielStep1UpClicks}/3 | Bas: {didacticielStep1DownClicks}/3</div>
              </div>
            )}
            {phase === 'didacticiel-step2-columns' && (
              <div className="px-3 py-2 bg-gradient-to-br from-blue-500 to-blue-700 rounded-md text-center text-[13px] font-bold text-white shadow">
                <div className="text-[11px] mb-1">📊 Étape 2 : Compréhension des colonnes</div>
                <div>Défi {didacticielStep2TargetIndex + 1}/3</div>
              </div>
            )}
            {phase === 'didacticiel-step3-free-practice' && (
              <div className="px-3 py-2 bg-gradient-to-br from-amber-500 to-amber-700 rounded-md text-center text-[13px] font-bold text-white shadow">
                <div className="text-[11px] mb-1">🎯 Étape 3 : Exercices libres</div>
                <div>{didacticielStep3SuccessCount} exercice{didacticielStep3SuccessCount > 1 ? 's' : ''} réussi{didacticielStep3SuccessCount > 1 ? 's' : ''}</div>
              </div>
            )}
            {/* Quit button for simplified tutorial step 3 */}
            {showDidacticielQuitButton && (
              <button
                onClick={quitDidacticiel}
                className="text-[14px] px-4 py-2 bg-gradient-to-br from-red-500 to-red-700 text-white border-none rounded-md cursor-pointer font-bold shadow transition-all duration-200 mt-2"
              >
                🚪 Quitter le Didacticiel
              </button>
            )}
          </div>
        </div>
      {/* Navigation phase en bas de la sidebar - hidden during didacticiel */}
      {!phase.startsWith('didacticiel-') && (
        <div className="w-full px-4 pb-4 flex flex-col items-center">
          <button
            onClick={goToNextPhase}
            disabled={getCurrentPhaseIndex() >= 62}
            className={`text-[14px] px-4 py-2 rounded-md font-bold transition-all duration-200 border-none flex-1 ${getCurrentPhaseIndex() >= 62
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-br from-sky-500 to-sky-700 text-white cursor-pointer shadow-md hover:-translate-y-0.5 hover:shadow-lg'}`}
            style={{ visibility: 'visible' }}
          >
            Suivante ➡️
          </button>
        </div>
      )}
      </aside>
      {/* Main content */}
      <main className="flex-1 flex items-center justify-center h-full bg-slate-100">
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-full h-full max-w-full max-h-full border-2 border-slate-300 rounded-lg overflow-hidden bg-black flex items-center justify-center">
            <UnityGame />
          </div>
        </div>
      </main>
    </div>
  );
}

export default MachineANombres;
