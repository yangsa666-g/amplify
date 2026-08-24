import type { Model } from '../types';

type ModelIconModel = Pick<Model, 'name' | 'upstreamModelName'>;

/**
 * LobeHub matches provider icons from the model identifier. For custom models,
 * prefer the upstream model name because the local call ID is user-defined.
 */
export function modelIconName(model: ModelIconModel): string {
  return model.upstreamModelName?.trim() || model.name;
}
