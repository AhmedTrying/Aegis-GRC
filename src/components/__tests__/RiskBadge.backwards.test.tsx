import { render, screen } from '@testing-library/react';
import { RiskBadge } from '../RiskBadge';

describe('RiskBadge Backward Compatibility', () => {
  describe('Legacy Data Compatibility', () => {
    it('should handle old data format with only inherent values', () => {
      render(
        <RiskBadge
          inherentLikelihood={4}
          inherentImpact={3}
          residualLikelihood={null as any}
          residualImpact={null as any}
          status="open"
        />
      );
      
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('should handle partial residual data', () => {
      render(
        <RiskBadge
          inherentLikelihood={5}
          inherentImpact={4}
          residualLikelihood={3}
          residualImpact={null as any}
          status="open"
        />
      );
      
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    it('should handle mixed valid and invalid data', () => {
      render(
        <RiskBadge
          inherentLikelihood={2}
          inherentImpact={5}
          residualLikelihood={0} // Invalid: should be clamped to 1
          residualImpact={6}     // Invalid: should be clamped to 5
          status="open"
        />
      );
      
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('should handle string number inputs', () => {
      render(
        <RiskBadge
          inherentLikelihood={"3" as any}
          inherentImpact={"4" as any}
          residualLikelihood={"2" as any}
          residualImpact={"3" as any}
          status="open"
        />
      );
      
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('should handle undefined status gracefully', () => {
      render(
        <RiskBadge
          inherentLikelihood={3}
          inherentImpact={3}
          residualLikelihood={2}
          residualImpact={2}
          status={undefined as any}
        />
      );
      
      expect(screen.getByText('9')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });
  });

  describe('Risk Level Boundaries', () => {
    it('should correctly categorize low risk (score ≤ 6)', () => {
      const testCases = [
        { inherent: [1, 5], residual: [1, 3], expectedScore: 5 },
        { inherent: [2, 3], residual: [1, 2], expectedScore: 6 },
        { inherent: [1, 1], residual: [1, 1], expectedScore: 1 }
      ];

      testCases.forEach(({ inherent, residual, expectedScore }) => {
        render(
          <RiskBadge
            inherentLikelihood={inherent[0]}
            inherentImpact={inherent[1]}
            residualLikelihood={residual[0]}
            residualImpact={residual[1]}
            status="open"
          />
        );
        
        expect(screen.getByText(expectedScore.toString())).toBeInTheDocument();
        expect(screen.getByText('Low')).toBeInTheDocument();
      });
    });

    it('should correctly categorize medium risk (score ≤ 12)', () => {
      const testCases = [
        { inherent: [3, 4], residual: [2, 3], expectedScore: 12 },
        { inherent: [2, 5], residual: [2, 4], expectedScore: 10 },
        { inherent: [4, 3], residual: [3, 2], expectedScore: 12 }
      ];

      testCases.forEach(({ inherent, residual, expectedScore }) => {
        render(
          <RiskBadge
            inherentLikelihood={inherent[0]}
            inherentImpact={inherent[1]}
            residualLikelihood={residual[0]}
            residualImpact={residual[1]}
            status="open"
          />
        );
        
        expect(screen.getByText(expectedScore.toString())).toBeInTheDocument();
        expect(screen.getByText('Medium')).toBeInTheDocument();
      });
    });

    it('should correctly categorize high risk (score ≤ 20)', () => {
      const testCases = [
        { inherent: [4, 5], residual: [3, 4], expectedScore: 20 },
        { inherent: [5, 4], residual: [4, 3], expectedScore: 20 },
        { inherent: [4, 4], residual: [3, 3], expectedScore: 16 }
      ];

      testCases.forEach(({ inherent, residual, expectedScore }) => {
        render(
          <RiskBadge
            inherentLikelihood={inherent[0]}
            inherentImpact={inherent[1]}
            residualLikelihood={residual[0]}
            residualImpact={residual[1]}
            status="open"
          />
        );
        
        expect(screen.getByText(expectedScore.toString())).toBeInTheDocument();
        expect(screen.getByText('High')).toBeInTheDocument();
      });
    });

    it('should correctly categorize critical risk (score > 20)', () => {
      const testCases = [
        { inherent: [5, 5], residual: [4, 4], expectedScore: 25 },
        { inherent: [5, 5], residual: [5, 5], expectedScore: 25 },
        { inherent: [5, 5], residual: [3, 5], expectedScore: 25 }
      ];

      testCases.forEach(({ inherent, residual, expectedScore }) => {
        render(
          <RiskBadge
            inherentLikelihood={inherent[0]}
            inherentImpact={inherent[1]}
            residualLikelihood={residual[0]}
            residualImpact={residual[1]}
            status="open"
          />
        );
        
        expect(screen.getByText(expectedScore.toString())).toBeInTheDocument();
        expect(screen.getByText('Critical')).toBeInTheDocument();
      });
    });
  });

  describe('Performance & Memory', () => {
    it('should handle rapid re-renders efficiently', () => {
      const { rerender } = render(
        <RiskBadge
          inherentLikelihood={3}
          inherentImpact={3}
          residualLikelihood={2}
          residualImpact={2}
          status="open"
        />
      );

      for (let i = 0; i < 100; i++) {
        rerender(
          <RiskBadge
            inherentLikelihood={3 + (i % 3)}
            inherentImpact={3 + (i % 2)}
            residualLikelihood={2 + (i % 2)}
            residualImpact={2 + (i % 3)}
            status="open"
          />
        );
      }

      expect(screen.getByText('9')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('should memoize calculations correctly', () => {
      const { rerender } = render(
        <RiskBadge
          inherentLikelihood={4}
          inherentImpact={4}
          residualLikelihood={3}
          residualImpact={3}
          status="open"
          showTrend={true}
        />
      );

      const firstRender = screen.getByText('↓ 43%').textContent;
      
      rerender(
        <RiskBadge
          inherentLikelihood={4}
          inherentImpact={4}
          residualLikelihood={3}
          residualImpact={3}
          status="open"
          showTrend={true}
        />
      );

      const secondRender = screen.getByText('↓ 43%').textContent;
      expect(firstRender).toBe(secondRender);
    });
  });
});