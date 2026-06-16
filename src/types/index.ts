export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  icon?: React.ReactNode;
}

export interface ParticleConfig {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  rotation: number;
  driftX: number;
  driftY: number;
  duration: number;
}
