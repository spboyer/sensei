import type { EvidenceFinding } from './evidence.js';

export type HostProfile = 'portable' | 'copilot';

const PORTABLE_FIELDS = new Set([
  'name',
  'description',
  'license',
  'allowed-tools',
  'metadata',
  'compatibility'
]);

const COPILOT_FIELD_TYPES = new Map<string, 'string' | 'boolean'>([
  ['argument-hint', 'string'],
  ['user-invocable', 'boolean'],
  ['disable-model-invocation', 'boolean'],
  ['context', 'string']
]);

export const HOST_PROFILES: readonly HostProfile[] = ['portable', 'copilot'];

export function isHostProfile(value: string): value is HostProfile {
  return HOST_PROFILES.includes(value as HostProfile);
}

export function validateHostProfile(
  fields: Readonly<Record<string, unknown>>,
  profile: HostProfile
): EvidenceFinding[] {
  if (profile === 'portable') {
    const extra = Object.keys(fields).filter(field => !PORTABLE_FIELDS.has(field));
    return [{
      id: 'host-profile-portable-fields',
      profile: 'host-compatibility',
      basis: 'spec',
      state: extra.length === 0 ? 'pass' : 'fail',
      severity: extra.length === 0 ? 'info' : 'error',
      evidenceLevel: 'statically-verified',
      message: extra.length === 0
        ? 'Frontmatter uses only portable Agent Skills fields'
        : `Host-specific or unknown fields are not portable: ${extra.join(', ')}`,
      evidence: 'https://agentskills.io/specification',
      remediation: extra.length === 0
        ? undefined
        : 'Select the intended host profile or remove the non-portable fields.',
      host: 'portable'
    }];
  }

  const allowedFields = new Set([...PORTABLE_FIELDS, ...COPILOT_FIELD_TYPES.keys()]);
  const unknown = Object.keys(fields).filter(field => !allowedFields.has(field));
  const invalidTypes = [...COPILOT_FIELD_TYPES.entries()]
    .filter(([field, expected]) => field in fields && typeof fields[field] !== expected)
    .map(([field, expected]) => `${field} (expected ${expected})`);
  if (typeof fields.context === 'string' && fields.context !== 'fork') {
    invalidTypes.push('context (expected "fork")');
  }
  const errors = [...unknown.map(field => `${field} (unknown)`), ...invalidTypes];

  return [{
    id: 'host-profile-copilot-fields',
    profile: 'host-compatibility',
    basis: 'host',
    state: errors.length === 0 ? 'pass' : 'fail',
    severity: errors.length === 0 ? 'info' : 'error',
    evidenceLevel: 'statically-verified',
    message: errors.length === 0
      ? 'Frontmatter fields are compatible with the Copilot skill profile'
      : `Copilot profile field errors: ${errors.join(', ')}`,
    evidence: 'https://code.visualstudio.com/docs/agent-customization/agent-skills',
    remediation: errors.length === 0
      ? undefined
      : 'Use a documented Copilot field with the required scalar type.',
    host: 'copilot'
  }];
}
