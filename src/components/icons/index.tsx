import React from 'react';
import { 
  Circle, 
  Play, 
  CheckCircle, 
  AlertTriangle,
  AlertCircle,
  Minus,
  Edit3,
  Trash2,
  Calendar,
  List,
  BarChart3,
  Brain,
  Plus,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Grip,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Filter,
  Search,
  Settings,
  MoreHorizontal,
  ExternalLink
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

// Icon wrapper component for consistent styling
interface IconProps extends LucideProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const getVariantColor = (variant: IconProps['variant']) => {
  switch (variant) {
    case 'success': return 'text-green-500';
    case 'warning': return 'text-yellow-500';
    case 'error': return 'text-red-500';
    case 'info': return 'text-blue-500';
    default: return 'text-current';
  }
};

export const Icon: React.FC<IconProps> = ({ variant = 'default', className = '', ...props }) => {
  const variantClass = getVariantColor(variant);
  const combinedClassName = `${variantClass} ${className}`.trim();
  
  // This is a placeholder - actual icon will be passed as children or type
  return <span className={combinedClassName} {...props} />;
};

// Status Icons
export const StatusNotStartedIcon = (props: LucideProps) => <Circle {...props} />;
export const StatusInProgressIcon = (props: LucideProps) => <Play {...props} />;
export const StatusCompletedIcon = (props: LucideProps) => <CheckCircle {...props} />;

// Priority Icons
export const PriorityHighIcon = (props: LucideProps) => <AlertTriangle {...props} />;
export const PriorityMediumIcon = (props: LucideProps) => <AlertCircle {...props} />;
export const PriorityLowIcon = (props: LucideProps) => <Minus {...props} />;

// Action Icons
export const EditIcon = (props: LucideProps) => <Edit3 {...props} />;
export const DeleteIcon = (props: LucideProps) => <Trash2 {...props} />;
export const CalendarIcon = (props: LucideProps) => <Calendar {...props} />;
export const AddIcon = (props: LucideProps) => <Plus {...props} />;
export const CheckIcon = (props: LucideProps) => <Check {...props} />;
export const CloseIcon = (props: LucideProps) => <X {...props} />;

// Navigation Icons
export const ListViewIcon = (props: LucideProps) => <List {...props} />;
export const GanttViewIcon = (props: LucideProps) => <BarChart3 {...props} />;
export const AiViewIcon = (props: LucideProps) => <Brain {...props} />;

// Utility Icons
export const ChevronUpIcon = (props: LucideProps) => <ChevronUp {...props} />;
export const ChevronDownIcon = (props: LucideProps) => <ChevronDown {...props} />;
export const GripIcon = (props: LucideProps) => <Grip {...props} />;
export const ZoomInIcon = (props: LucideProps) => <ZoomIn {...props} />;
export const ZoomOutIcon = (props: LucideProps) => <ZoomOut {...props} />;
export const ResetIcon = (props: LucideProps) => <RotateCcw {...props} />;
export const FilterIcon = (props: LucideProps) => <Filter {...props} />;
export const SearchIcon = (props: LucideProps) => <Search {...props} />;
export const SettingsIcon = (props: LucideProps) => <Settings {...props} />;
export const MoreIcon = (props: LucideProps) => <MoreHorizontal {...props} />;
export const ExternalLinkIcon = (props: LucideProps) => <ExternalLink {...props} />;

// Icon size presets
export const iconSizes = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4', 
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8'
} as const;

export type IconSize = keyof typeof iconSizes;