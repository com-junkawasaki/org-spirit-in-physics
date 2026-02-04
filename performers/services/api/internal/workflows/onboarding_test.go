package workflows

import (
	"testing"

	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
	"go.temporal.io/sdk/testsuite"
    "github.com/spirit-in-physics/services/grpc/internal/activities"
)

type UnitTestSuite struct {
	suite.Suite
	testsuite.WorkflowTestSuite
}

func TestUnitTestSuite(t *testing.T) {
	suite.Run(t, new(UnitTestSuite))
}

func (s *UnitTestSuite) Test_OnboardingWorkflow_Success() {
	env := s.NewTestWorkflowEnvironment()
    
    a := &activities.ParticipantActivities{}

	// Mock Activities
	env.OnActivity(a.CreateParticipantActivity, mock.Anything, "sig_abc123").Return(nil)
	env.OnActivity(a.SetupEnvironmentActivity, mock.Anything, mock.Anything).Return(nil)

	env.ExecuteWorkflow(OnboardingWorkflow, "sig_abc123")

	s.True(env.IsWorkflowCompleted())
	s.NoError(env.GetWorkflowError())
}
