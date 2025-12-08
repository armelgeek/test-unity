import { PhaseBase } from "../../../core/phases/abstract-phase";
import { STAGE_INTRO_DELAY } from "./timing-constants";

/**
 * Mini-phase: Introduction d'un stage
 * Annonce vocalement le début d'un stage (Unités, Unités+Dizaines, etc.)
 */
export class StageIntroPhase extends PhaseBase {
  constructor(
    private stageNumber: number,
    private stageName: string,
    private stageDescription: string
  ) {
    super(`stage-intro-${stageNumber}`, `Introduction Stage ${stageNumber}`);
  }

  async execute(): Promise<void> {
    console.log(`📢 Stage ${this.stageNumber}: ${this.stageName}`);

    const introSentence = `On passe maintenant à l’étape ${this.stageNumber}. ${this.stageName}. ${this.stageDescription}.`;
    await this.speak(introSentence);
    await this.speak(`Pour chaque nombre, je vais débloquer les colonnes une par une. Les colonnes validées resteront accessibles.`);

    // Mettre à jour l'interface
    this.updateGameState({
      message: `Étape ${this.stageNumber}/4: ${this.stageName}`,
      instruction: `${this.stageDescription} Les colonnes seront débloquées progressivement.`
    });

    // Petite pause pour laisser le temps de lire
    await new Promise(resolve => setTimeout(resolve, STAGE_INTRO_DELAY));

    this.complete();
  }
}
