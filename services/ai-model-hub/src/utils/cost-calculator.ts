/**
 * Cost Calculator Utility
 * 
 * Accurate cost calculation and optimization for AI model usage.
 */

import { ModelDefinition, TokenUsage } from '../types';

export class CostCalculator {
  static calculateCost(usage: TokenUsage, model: ModelDefinition): number {
    const inputCost = (usage.promptTokens / 1000) * model.inputCostPer1k;
    const outputCost = (usage.completionTokens / 1000) * model.outputCostPer1k;
    return inputCost + outputCost;
  }

  static estimateCost(
    inputTokens: number,
    outputTokens: number,
    model: ModelDefinition
  ): number {
    const inputCost = (inputTokens / 1000) * model.inputCostPer1k;
    const outputCost = (outputTokens / 1000) * model.outputCostPer1k;
    return inputCost + outputCost;
  }

  static optimizeCost(
    models: ModelDefinition[],
    tokenEstimate: number
  ): ModelDefinition | null {
    if (models.length === 0) return null;

    return models.reduce((cheapest, model) => {
      const currentCost = this.estimateCost(tokenEstimate, tokenEstimate * 0.5, model);
      const cheapestCost = this.estimateCost(tokenEstimate, tokenEstimate * 0.5, cheapest);
      
      return currentCost < cheapestCost ? model : cheapest;
    });
  }
}