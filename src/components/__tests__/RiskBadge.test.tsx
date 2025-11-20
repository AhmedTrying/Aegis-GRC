import { render, screen } from '@testing-library/react';
import { RiskBadge } from '../RiskBadge';

describe('RiskBadge Component', () => {
  describe('Edge Cases', () => {
    it('should handle missing residual values gracefully', () => {
      render(
        <RiskBadge
          inherentLikelihood={5}
          inherentImpact={4}
          residualLikelihood={null as any}
          residualImpact={undefined as any}
          status="open"
        />
      );
      
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    it('should handle zero values correctly', () => {
      render(
        <RiskBadge
          inherentLikelihood={0}
          inherentImpact={5}
          residualLikelihood={0}
          residualImpact={3}
          status="open"
        />
      );
      
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('should handle negative values with validation', () => {
      render(
        <RiskBadge
          inherentLikelihood={-1}
          inherentImpact={5}
          residualLikelihood={2}
          residualImpact={-3}
          status="open"
        />
      );
      
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('should handle very large values', () => {
      render(
        <RiskBadge
          inherentLikelihood={100}
          inherentImpact={50}
          residualLikelihood={80}
          residualImpact={40}
          status="open"
        />
      );
      
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    it('should handle different sizes correctly', () => {
      const { container: small } = render(
        <RiskBadge
          inherentLikelihood={3}
          inherentImpact={3}
          residualLikelihood={2}
          residualImpact={2}
          status="open"
          size="sm"
        />
      );
      
      const { container: medium } = render(
        <RiskBadge
          inherentLikelihood={3}
          inherentImpact={3}
          residualLikelihood={2}
          residualImpact={2}
          status="open"
          size="md"
        />
      );
      
      const { container: large } = render(
        <RiskBadge
          inherentLikelihood={3}
          inherentImpact={3}
          residualLikelihood={2}
          residualImpact={2}
          status="open"
          size="lg"
        />
      );
      
      expect(small.querySelector('.text-xs')).toBeInTheDocument();
      expect(medium.querySelector('.text-sm')).toBeInTheDocument();
      expect(large.querySelector('.text-base')).toBeInTheDocument();
    });

    it('should handle trend indicators correctly', () => {
      const { rerender } = render(
        <RiskBadge
          inherentLikelihood={5}
          inherentImpact={4}
          residualLikelihood={3}
          residualImpact={3}
          status="open"
          showTrend={true}
        />
      );
      
      expect(screen.getByText('↓')).toBeInTheDocument();
      
      rerender(
        <RiskBadge
          inherentLikelihood={2}
          inherentImpact={2}
          residualLikelihood={4}
          residualImpact={4}
          status="open"
          showTrend={true}
        />
      );
      
      expect(screen.getByText('↑')).toBeInTheDocument();
    });

    it('should handle different risk statuses', () => {
      const statuses = ['open', 'in_progress', 'closed'] as const;
      
      statuses.forEach(status => {
        const { rerender } = render(
          <RiskBadge
            inherentLikelihood={3}
            inherentImpact={3}
            residualLikelihood={2}
            residualImpact={2}
            status={status}
          />
        );
        
        expect(screen.getByText('9')).toBeInTheDocument();
        expect(screen.getByText('Medium')).toBeInTheDocument();
      });
    });

    it('should calculate risk reduction percentage correctly', () => {
      render(
        <RiskBadge
          inherentLikelihood={5}
          inherentImpact={4}
          residualLikelihood={3}
          residualImpact={2}
          status="open"
          showTrend={true}
        />
      );
      
      expect(screen.getByText('↓ 70%')).toBeInTheDocument();
    });

    it('should handle equal inherent and residual scores', () => {
      render(
        <RiskBadge
          inherentLikelihood={3}
          inherentImpact={3}
          residualLikelihood={3}
          residualImpact={3}
          status="open"
          showTrend={true}
        />
      );
      
      expect(screen.queryByText('↓')).not.toBeInTheDocument();
      expect(screen.queryByText('↑')).not.toBeInTheDocument();
    });

    it('should apply custom className correctly', () => {
      const { container } = render(
        <RiskBadge
          inherentLikelihood={3}
          inherentImpact={3}
          residualLikelihood={2}
          residualImpact={2}
          status="open"
          className="custom-class"
        />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});