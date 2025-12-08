import { SequencePhase } from "../../../core/phases/sequence-phase";
import { PhaseBase } from "../../../core/phases/abstract-phase";
import { ColumnFillPhase } from "./column-fill-phase";
import { NUMBER_INTRO_DELAY, NUMBER_COMPLETION_DELAY } from "./timing-constants";

/**
 * Mini-phase: Exercice pour un nombre complet
 * Orchestre le remplissage de toutes les colonnes pour un seul nombre
 */
export class NumberExercisePhase extends SequencePhase {
  constructor(
    exerciseNumber: number, // 1, 2, or 3
    targetNumber: string,
    maxPosition: number,
    stageNumber: number
  ) {
    super(
      `number-exercise-${stageNumber}-${exerciseNumber}`,
      buildNumberPhases(exerciseNumber, targetNumber, maxPosition, stageNumber),
      `Exercice ${exerciseNumber}/3`
    );

  // stageNumber is only used to build the phase id and for child phases, no stored field required
  }
}

function buildNumberPhases(
  exerciseNumber: number,
  targetNumber: string,
  maxPosition: number,
  stageNumber: number
): PhaseBase[] {
  const phases: PhaseBase[] = [];

  phases.push(new NumberIntroPhase(
    exerciseNumber,
    targetNumber,
    maxPosition,
    stageNumber
  ));

  for (let columnIndex = 0; columnIndex <= maxPosition; columnIndex++) {
    phases.push(new ColumnFillPhase(
      columnIndex,
      targetNumber,
      maxPosition
    ));
  }

  phases.push(new NumberCompletionPhase(
    exerciseNumber,
    targetNumber,
    maxPosition
  ));

  return phases;
}

/**
 * Mini-phase: Introduction d'un exercice de nombre
 */
class NumberIntroPhase extends PhaseBase {
  constructor(
    private exerciseNumber: number,
    private targetNumber: string,
    private maxPosition: number,
    stageNumber: number
  ) {
    super(`number-intro-${stageNumber}-${exerciseNumber}`, `Introduction Exercice ${exerciseNumber}`);
  }

  async execute(): Promise<void> {
    console.log(`🎯 Exercice ${this.exerciseNumber}/3: ${this.targetNumber}`);

    // Apply locks BEFORE sending ChangeList to prevent flashing all columns
    const lockCommands = ['LockUnit:', 'LockTen:', 'LockHundred:', 'LockThousand:'];
    for (let i = 0; i < lockCommands.length; i++) {
      const lockValue = i <= this.maxPosition ? 0 : 1;
      this.sendToUnity(lockCommands[i], lockValue);
    }

    this.sendToUnity('SetValue', '0000');

    console.log('Sending ChangeList ->', this.targetNumber);
    this.sendToUnity('ChangeList', this.targetNumber);
    
    await this.speak(`Très bien ! Exercice ${this.exerciseNumber}. À toi de former le nombre ${this.targetNumber}.`);
    await this.speak(`Je vais te guider colonne par colonne pour y arriver.`);
    this.updateGameState({
      message: `Nombre ${this.exerciseNumber}/3 : ${this.targetNumber}`,
      targetNumber: this.targetNumber,
      instruction: `Nombre à former : ${this.targetNumber}. Je vais débloquer les colonnes une par une en commençant par les Unités.`,
      showValidateButton: false
    });

    // Pause avant de commencer
    await new Promise(resolve => setTimeout(resolve, NUMBER_INTRO_DELAY));

    this.complete();
  }
}

/**
 * Mini-phase: Complétion d'un exercice de nombre
 */
class NumberCompletionPhase extends PhaseBase {
  private readonly lockCommands = ['LockUnit:', 'LockTen:', 'LockHundred:', 'LockThousand:'];

  constructor(
    private exerciseNumber: number,
    private targetNumber: string,
    private maxPosition: number
  ) {
    super(
      `number-completion-${exerciseNumber}`,
      `Complétion Exercice ${exerciseNumber}`
    );
  }

  async execute(): Promise<void> {
    console.log(`✅ Exercice ${this.exerciseNumber}/3 complété`);

    await this.speak('Excellent ! Tu as formé le nombre correctement !');

    this.updateGameState({
      message: `✓ Nombre ${this.exerciseNumber}/3 complété !`,
      instruction: `Bravo ! Tu as réussi à former le nombre ${this.targetNumber}.`
    });

    // Restore the stage's allowed column unlocks (do NOT unlock all)
    for (let i = 0; i < this.lockCommands.length; i++) {
      const lockValue = i <= this.maxPosition ? 0 : 1; // 0 = unlock, 1 = lock
      this.sendToUnity(this.lockCommands[i], lockValue);
    }

    // Pause before the next number
    await new Promise(resolve => setTimeout(resolve, NUMBER_COMPLETION_DELAY));

    this.complete();
  }
}
