package mcp

import (
	"context"
	"encoding/json"
	"fmt"

	dapr "github.com/dapr/go-sdk/client"
	agent "github.com/gftdcojp/dapr-agents-go"
	"github.com/spirit-in-physics/services/grpc/internal/dapr/tools"
	"github.com/spirit-in-physics/services/grpc/internal/db"
)

type MCPServer struct {
	server     *agent.MCPServer
	queries    *db.Queries
	daprClient dapr.Client
}

func NewMCPServer(queries *db.Queries, daprClient dapr.Client) (*MCPServer, error) {
	config := agent.DefaultMCPServerConfig()
	config.Name = "spirit-in-physics-mcp"
	config.Version = "1.0.0"
	config.Description = "MCP server for Spirit in Physics platform"

	server := agent.NewMCPServer(config)

	s := &MCPServer{
		server:     server,
		queries:    queries,
		daprClient: daprClient,
	}

	// Register local Go tools
	s.registerGoTools()

	// Register proxied tools from Python/TypeScript services
	s.registerProxiedTools()

	return s, nil
}

func (s *MCPServer) registerGoTools() {
	// Timeline tools
	timelineTools := tools.NewTimelineTools(s.queries)
	for _, tool := range timelineTools.GetTools() {
		s.server.RegisterTool(tool)
	}

	// Participant tools
	participantTools := tools.NewParticipantTools(s.queries)
	for _, tool := range participantTools.GetTools() {
		s.server.RegisterTool(tool)
	}

	// Import tools
	importTools := tools.NewImportTools(s.queries)
	for _, tool := range importTools.GetTools() {
		s.server.RegisterTool(tool)
	}

	// Workflow management tools
	s.server.RegisterTool(agent.NewFuncTool(
		"start_workflow",
		"Start a Dapr workflow",
		&agent.ToolSchema{
			Type: "object",
			Properties: map[string]*agent.ToolSchema{
				"workflow_name": {Type: "string"},
				"input":         {Type: "object"},
			},
			Required: []string{"workflow_name"},
		},
		s.startWorkflowHandler,
	))

	s.server.RegisterTool(agent.NewFuncTool(
		"get_workflow_status",
		"Get status of a running workflow",
		&agent.ToolSchema{
			Type: "object",
			Properties: map[string]*agent.ToolSchema{
				"instance_id": {Type: "string"},
			},
			Required: []string{"instance_id"},
		},
		s.getWorkflowStatusHandler,
	))
}

func (s *MCPServer) registerProxiedTools() {
	// Python service tools (import-service)
	s.server.RegisterTool(agent.NewFuncTool(
		"python_import_participants",
		"Import participants from dataset directory (Python service)",
		&agent.ToolSchema{
			Type: "object",
			Properties: map[string]*agent.ToolSchema{
				"dataset_path": {Type: "string"},
			},
			Required: []string{"dataset_path"},
		},
		s.proxyToPythonService("import_participants"),
	))

	s.server.RegisterTool(agent.NewFuncTool(
		"python_import_sessions",
		"Import sessions with physiological data (Python service)",
		&agent.ToolSchema{
			Type: "object",
			Properties: map[string]*agent.ToolSchema{
				"dataset_path": {Type: "string"},
			},
			Required: []string{"dataset_path"},
		},
		s.proxyToPythonService("import_sessions"),
	))

	s.server.RegisterTool(agent.NewFuncTool(
		"generate_stimulus_audio",
		"Generate audio for stimulus words (Python service)",
		&agent.ToolSchema{
			Type: "object",
			Properties: map[string]*agent.ToolSchema{
				"words":   {Type: "array"},
				"api_key": {Type: "string"},
			},
			Required: []string{"words", "api_key"},
		},
		s.proxyToPythonService("generate_stimulus_audio"),
	))

	// TypeScript service tools (dapr-ts)
	s.server.RegisterTool(agent.NewFuncTool(
		"run_structure_analysis",
		"Run 3D structure analysis on visualization data (TypeScript service)",
		&agent.ToolSchema{
			Type: "object",
			Properties: map[string]*agent.ToolSchema{
				"nodes":           {Type: "array"},
				"links":           {Type: "array"},
				"emotion_vectors": {Type: "object"},
				"session_data":    {Type: "array"},
			},
			Required: []string{"nodes", "links", "emotion_vectors", "session_data"},
		},
		s.proxyToTypeScriptService("run_structure_analysis"),
	))

	s.server.RegisterTool(agent.NewFuncTool(
		"get_integrated_timeline",
		"Get integrated timeline with analysis (TypeScript orchestrated)",
		&agent.ToolSchema{
			Type: "object",
			Properties: map[string]*agent.ToolSchema{
				"participant_id": {Type: "string"},
				"session_id":     {Type: "string"},
			},
			Required: []string{"participant_id"},
		},
		s.proxyToTypeScriptService("get_integrated_timeline"),
	))
}

func (s *MCPServer) proxyToPythonService(method string) func(ctx context.Context, params map[string]interface{}) (interface{}, error) {
	return func(ctx context.Context, params map[string]interface{}) (interface{}, error) {
		inputBytes, _ := json.Marshal(params)
		content := &dapr.DataContent{
			ContentType: "application/json",
			Data:        inputBytes,
		}

		resp, err := s.daprClient.InvokeMethodWithContent(ctx, "import-service", method, "POST", content)
		if err != nil {
			return nil, fmt.Errorf("failed to invoke Python service: %w", err)
		}

		var result interface{}
		if err := json.Unmarshal(resp, &result); err != nil {
			return nil, err
		}
		return result, nil
	}
}

func (s *MCPServer) proxyToTypeScriptService(method string) func(ctx context.Context, params map[string]interface{}) (interface{}, error) {
	return func(ctx context.Context, params map[string]interface{}) (interface{}, error) {
		inputBytes, _ := json.Marshal(params)
		content := &dapr.DataContent{
			ContentType: "application/json",
			Data:        inputBytes,
		}

		resp, err := s.daprClient.InvokeMethodWithContent(ctx, "dapr-ts", method, "POST", content)
		if err != nil {
			return nil, fmt.Errorf("failed to invoke TypeScript service: %w", err)
		}

		var result interface{}
		if err := json.Unmarshal(resp, &result); err != nil {
			return nil, err
		}
		return result, nil
	}
}

func (s *MCPServer) startWorkflowHandler(ctx context.Context, params map[string]interface{}) (interface{}, error) {
	workflowName := params["workflow_name"].(string)
	input, _ := params["input"]

	inputBytes, _ := json.Marshal(input)

	// Use Dapr workflow API
	resp, err := s.daprClient.InvokeMethodWithContent(ctx, "dapr", fmt.Sprintf("/v1.0-beta1/workflows/dapr/%s/start", workflowName), "POST", &dapr.DataContent{
		ContentType: "application/json",
		Data:        inputBytes,
	})
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	json.Unmarshal(resp, &result)
	return result, nil
}

func (s *MCPServer) getWorkflowStatusHandler(ctx context.Context, params map[string]interface{}) (interface{}, error) {
	instanceID := params["instance_id"].(string)

	resp, err := s.daprClient.InvokeMethodWithContent(ctx, "dapr", fmt.Sprintf("/v1.0-beta1/workflows/dapr/%s", instanceID), "GET", nil)
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	json.Unmarshal(resp, &result)
	return result, nil
}

func (s *MCPServer) Start(port int) error {
	s.server.Start()
	return nil
}
