export type QualityProfile =
  | 'portable-spec'
  | 'host-compatibility'
  | 'information-architecture'
  | 'behavioral-evidence'
  | 'safety-supply-chain'
  | 'lifecycle-health';

export type FindingBasis =
  | 'spec'
  | 'host'
  | 'security-standard'
  | 'empirical'
  | 'repository-policy';

export type FindingState = 'pass' | 'fail' | 'warning' | 'unknown' | 'not-applicable';
export type FindingSeverity = 'info' | 'warning' | 'error';
export type EvidenceLevel =
  | 'declared'
  | 'statically-verified'
  | 'executed'
  | 'baseline-compared'
  | 'independently-reproduced';

export interface EvidenceFinding {
  readonly id: string;
  readonly profile: QualityProfile;
  readonly basis: FindingBasis;
  readonly state: FindingState;
  readonly severity: FindingSeverity;
  readonly evidenceLevel: EvidenceLevel;
  readonly message: string;
  readonly evidence?: string;
  readonly sourcePaths?: readonly string[];
  readonly remediation?: string;
  readonly limitations?: readonly string[];
  readonly host?: string;
}

export interface ProfileSummary {
  readonly profile: QualityProfile;
  readonly state: FindingState;
  readonly counts: Readonly<Record<FindingState, number>>;
}

const PROFILE_ORDER: readonly QualityProfile[] = [
  'portable-spec',
  'host-compatibility',
  'information-architecture',
  'behavioral-evidence',
  'safety-supply-chain',
  'lifecycle-health'
];

export function summarizeProfiles(findings: readonly EvidenceFinding[]): ProfileSummary[] {
  return PROFILE_ORDER.map(profile => {
    const profileFindings = findings.filter(finding => finding.profile === profile);
    const counts: Record<FindingState, number> = {
      pass: 0,
      fail: 0,
      warning: 0,
      unknown: 0,
      'not-applicable': 0
    };
    for (const finding of profileFindings) counts[finding.state]++;

    let state: FindingState;
    if (profileFindings.length === 0 || counts['not-applicable'] === profileFindings.length) {
      state = 'not-applicable';
    } else if (counts.fail > 0) {
      state = 'fail';
    } else if (counts.unknown > 0) {
      state = 'unknown';
    } else if (counts.warning > 0) {
      state = 'warning';
    } else {
      state = 'pass';
    }

    return { profile, state, counts };
  });
}
