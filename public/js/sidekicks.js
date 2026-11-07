// Granny x DBD has no sidekicks. These stubs keep the shared match code happy.
export function loadTed() { return Promise.resolve(null); }
export const tedReady = () => false;
export const TED_LINES = {};
export const TED_CAPTIONS = {};
export function resetVoices() {}
export class Sidekick { constructor() { this.kind = ''; } update() {} dispose() {} }
export function makeSidekickModel() { return null; }
