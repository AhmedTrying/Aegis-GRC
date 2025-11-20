import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskBadgeProps {
  inherentLikelihood: number;
  inherentImpact: number;
  residualLikelihood: number;
  residualImpact: number;
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  className?: string;
}

// Validation functions
const validateLikelihood = (value: number): number => {
  const num = Number(value);
  if (isNaN(num) || num < 1) return 1;
  if (num > 5) return 5;
  return Math.round(num);
};

const validateImpact = (value: number): number => {
  const num = Number(value);
  if (isNaN(num) || num < 1) return 1;
  if (num > 5) return 5;
  return Math.round(num);
};

const validateStatus = (status: string): string => {
  const validStatuses = ['open', 'in_progress', 'closed'];
  return validStatuses.includes(status) ? status : 'open';
};

export const RiskBadge = ({
  inherentLikelihood,
  inherentImpact,
  residualLikelihood,
  residualImpact,
  status,
  size = 'md',
  showTrend = true,
  className
}: RiskBadgeProps) => {
  try {
    // Validate inputs
    const validatedInherentLikelihood = validateLikelihood(inherentLikelihood);
    const validatedInherentImpact = validateImpact(inherentImpact);
    const validatedResidualLikelihood = validateLikelihood(residualLikelihood);
    const validatedResidualImpact = validateImpact(residualImpact);
    const validatedStatus = validateStatus(status);

    // Calculate risk scores
    const inherentScore = validatedInherentLikelihood * validatedInherentImpact;
    const residualScore = validatedResidualLikelihood * validatedResidualImpact;
    const riskReduction = inherentScore - residualScore;
    const reductionPercentage = inherentScore > 0 ? Math.round((riskReduction / inherentScore) * 100) : 0;

    // Determine risk level and color
    const getRiskLevel = (score: number) => {
      if (score <= 6) return { level: 'low', color: 'bg-green-100 text-green-800 border-green-200' };
      if (score <= 12) return { level: 'medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      if (score <= 20) return { level: 'high', color: 'bg-orange-100 text-orange-800 border-orange-200' };
      return { level: 'critical', color: 'bg-red-100 text-red-800 border-red-200' };
    };

    const inherentRisk = getRiskLevel(inherentScore);
    const residualRisk = getRiskLevel(residualScore);

    // Get status icon and color
    const getStatusInfo = () => {
      switch (validatedStatus) {
        case 'open':
          return { icon: AlertTriangle, color: 'bg-red-100 text-red-800', label: 'Open' };
        case 'in_progress':
          return { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'In Progress' };
        case 'closed':
          return { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Closed' };
        default:
          return { icon: Shield, color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
      }
    };

    const statusInfo = getStatusInfo();
    const StatusIcon = statusInfo.icon;

    // Size configurations
    const sizeConfig = {
      sm: { 
        badge: 'px-2 py-1 text-xs', 
        icon: 'h-3 w-3',
        trend: 'text-xs'
      },
      md: { 
        badge: 'px-2.5 py-1.5 text-sm', 
        icon: 'h-4 w-4',
        trend: 'text-sm'
      },
      lg: { 
        badge: 'px-3 py-2 text-base', 
        icon: 'h-5 w-5',
        trend: 'text-base'
      }
    };

    const config = sizeConfig[size];

    return (
      <div className={cn("flex items-center gap-2", className)}>
        {/* Status Badge */}
        <Badge className={cn(config.badge, statusInfo.color, 'flex items-center gap-1')}>
          <StatusIcon className={config.icon} />
          {statusInfo.label}
        </Badge>

        {/* Inherent Risk Badge */}
        <Badge className={cn(config.badge, inherentRisk.color, 'flex items-center gap-1')}>
          <AlertTriangle className={cn(config.icon, 'opacity-70')} />
          Inherent: {inherentScore}
        </Badge>

        {/* Residual Risk Badge */}
        <Badge className={cn(config.badge, residualRisk.color, 'flex items-center gap-1')}>
          <Shield className={cn(config.icon, 'opacity-70')} />
          Residual: {residualScore}
        </Badge>

        {/* Risk Reduction Indicator */}
        {showTrend && reductionPercentage > 0 && (
          <Badge className={cn(config.badge, 'bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1')}>
            <CheckCircle className={cn(config.icon, 'text-blue-600')} />
            -{reductionPercentage}%
          </Badge>
        )}

        {/* Risk Level Summary */}
        <div className="hidden md:flex items-center gap-1 text-xs text-gray-600">
          <span className={cn('px-1.5 py-0.5 rounded', inherentRisk.color)}>
            {inherentRisk.level}
          </span>
          <span className="text-gray-400">→</span>
          <span className={cn('px-1.5 py-0.5 rounded', residualRisk.color)}>
            {residualRisk.level}
          </span>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering RiskBadge:', error);
    return (
      <Badge variant="destructive" className="text-xs">
        Error loading risk data
      </Badge>
    );
  }
};

// Risk Score Component for standalone display
interface RiskScoreProps {
  score: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const RiskScore = ({ score, label, size = 'md', className }: RiskScoreProps) => {
  const getRiskColor = (score: number) => {
    if (score <= 6) return 'bg-green-100 text-green-800 border-green-200';
    if (score <= 12) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (score <= 20) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const sizeConfig = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base'
  };

  return (
    <Badge className={`${sizeConfig[size]} ${getRiskColor(score)} border ${className}`}>
      {label}: {score}
    </Badge>
  );
};

// Risk Trend Indicator
interface RiskTrendProps {
  previousScore: number;
  currentScore: number;
  className?: string;
}

export const RiskTrend = ({ previousScore, currentScore, className }: RiskTrendProps) => {
  const trend = currentScore - previousScore;
  const percentageChange = previousScore > 0 ? Math.round((trend / previousScore) * 100) : 0;

  if (trend === 0) {
    return (
      <div className={`flex items-center gap-1 text-gray-600 ${className}`}>
        <div className="w-2 h-0.5 bg-gray-400"></div>
        <span className="text-xs">No change</span>
      </div>
    );
  }

  const isImproving = trend < 0;
  const color = isImproving ? 'text-green-600' : 'text-red-600';
  const bgColor = isImproving ? 'bg-green-100' : 'bg-red-100';
  const arrow = isImproving ? '↓' : '↑';

  return (
    <div className={`flex items-center gap-1 ${color} ${bgColor} px-2 py-1 rounded ${className}`}>
      <span className="text-xs font-medium">{arrow}</span>
      <span className="text-xs">{Math.abs(percentageChange)}%</span>
    </div>
  );
};