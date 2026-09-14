import { CompatibilityExplanationContext, RepairProposal } from '@migrationguard/core';

export interface AIExplanationResult {
  intent: 'explain_verification' | 'explain_cell' | 'general';
  observations: Array<{
    text: string;
    evidenceId?: string;
  }>;
  explanation: string;
  remediation: {
    available: boolean;
    text: string;
    isSuggestion: boolean;
    strategy?: string;
  };
  documentation: Array<{
    id?: string;
    title: string;
    topic?: string;
  }>;
}

export interface AIDocAnswerResult {
  answer: string;
  citations: Array<{
    title: string;
    topic: string;
  }>;
  suggestedQueries?: string[];
}

export interface AssistantDocChunk {
  title: string;
  topic: string;
  content: string;
}

export interface AIProvider {
  readonly name: string;
  explainFailure(context: CompatibilityExplanationContext): Promise<AIExplanationResult>;
  explainCell(
    cellState: string,
    context: CompatibilityExplanationContext,
  ): Promise<AIExplanationResult>;
  answerDocumentation(query: string, docs: AssistantDocChunk[]): Promise<AIDocAnswerResult>;
  explainRepair(proposal: RepairProposal): Promise<string>;
}
