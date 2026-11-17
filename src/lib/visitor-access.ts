export type VisitorFeature = 'reading' | 'ai' | 'teacher' | 'progress';
export function needsSignIn(feature: VisitorFeature, signedIn: boolean) {
  return feature !== 'reading' && !signedIn;
}