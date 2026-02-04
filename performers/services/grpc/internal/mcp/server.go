package mcp

import (
	"context"
	"encoding/json"
	"fmt"

	dapr "github.com/dapr/go-sdk/client"
	"github.com/gftdcojp/dapr-agents-go/mcp"
	"github.com/gftdcojp/dapr-agents-go/tool"
	"github.com/spirit-in-physics/services/grpc/internal/dapr/tools"
	"github.com/spirit-in-physics/services/grpc/internal/db"
)

type MCPServer struct {
	server     *mcp.Server
	queries    *db.Queries
	daprClient dapr.Client
}

func NewMCPServer(queries *db.Queries, daprClient dapr.Client) (*MCPServer, error) {
	server := mcp.NewServer(mcp.ServerConfig{
		Name:        "spirit-in-physics-mcp",
		Version:     "1.0.0",
		Description: "MCP server for Spirit in Physics platform",
	})

	s := &MCPServer{
		server:     server,
		queries:    queries,
		daprClient: daprClient,
	}

	// Register local Go tools
	s.registerGoTools()

	// Register proxied tools from Python/TypeScript services
	s.registerProxiedTools()

	// Register resources
	s.registerResources()

	return s, nil
}

func (s *MCPServer) registerGoTools() {
	registry := s.server.ToolRegistry()

	// Timeline tools
	timelineTools := tools.NewTimelineTools(s.queries)
	timelineTools.RegisterTools(registry)

	// Participant tools
	participantTools := tools.NewParticipantTools(s.queries)
	participantTools.RegisterTools(registry)

	// Import tools
	importTools := tools.NewImportTools(s.queries)
	importTools.RegisterTools(registry)

	// Workflow management tools
	registry.Register(tool.Tool{
		Name:        "start_workflow",
		Description: "Start a Dapr workflow",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"workflow_name": map[string]string{"type": "string"},
				"input":         map[string]string{"type": "object"},
			},
			"required": []string{"workflow_name"},
		},
		Handler: s.startWorkflowHandler,
	})

	registry.Register(tool.Tool{
		Name:        "get_workflow_status",
		Description: "Get status of a running workflow",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"instance_id": map[string]string{"type": "string"},
			},
			"required": []string{"instance_id"},
		},
		Handler: s.getWorkflowStatusHandler,
	})
}

func (s *MCPServer) registerProxiedTools() {
	registry := s.server.ToolRegistry()

	// Python service tools (import-service)
	registry.Register(tool.Tool{
		Name:        "python_import_participants",
		Description: "Import participants from dataset directory (Python service)",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"dataset_path": map[string]string{"type": "string"},
			},
			"required": []string{"dataset_path"},
		},
		Handler: s.proxyToPythonService("import_participants"),
	})

	registry.Register(tool.Tool{
		Name:        "python_import_sessions",
		Description: "Import sessions with physiological data (Python service)",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"dataset_path": map[string]string{"type": "string"},
			},
			"required": []string{"dataset_path"},
		},
		Handler: s.proxyToPythonService("import_sessions"),
	})

	registry.Register(tool.Tool{
		Name:        "generate_stimulus_audio",
		Description: "Generate audio for stimulus words (Python service)",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"words":   map[string]string{"type": "array"},
				"api_key": map[string]string{"type": "string"},
			},
			"required": []string{"words", "api_key"},
		},
		Handler: s.proxyToPythonService("generate_stimulus_audio"),
	})

	// TypeScript service tools (temporal-ts -> dapr-ts)
	registry.Register(tool.Tool{
		Name:        "run_structure_analysis",
		Description: "Run 3D structure analysis on visualization data (TypeScript service)",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"nodes":           map[string]string{"type": "array"},
				"links":           map[string]string{"type": "array"},
				"emotion_vectors": map[string]string{"type": "object"},
				"session_data":    map[string]string{"type": "array"},
			},
			"required": []string{"nodes", "links", "emotion_vectors", "session_data"},
		},
		Handler: s.proxyToTypeScriptService("run_structure_analysis"),
	})

	registry.Register(tool.Tool{
		Name:        "get_integrated_timeline",
		Description: "Get integrated timeline with analysis (TypeScript orchestrated)",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"participant_id": map[string]string{"type": "string"},
				"session_id":     map[string]string{"type": "string"},
			},
			"required": []string{"participant_id"},
		},
		Handler: s.proxyToTypeScriptService("get_integrated_timeline"),
	})
}

func (s *MCPServer) proxyToPythonService(method string) tool.Handler {
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

func (s *MCPServer) proxyToTypeScriptService(method string) tool.Handler {
	return func(ctx context.Context, params map[string]interface{}) (interface{}, error) {
		inputBytes, _ := json.Marshal(params)
		content := &dapr.DataContent{
			ContentType: "application/json",
			Data:        inputBytes,
		}

		resp, err := s.daprClient.InvokeMethodWithContent(ctx, "temporal-ts", method, "POST", content)
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

func (s *MCPServer) registerResources() {
	s.server.RegisterResource(mcp.Resource{
		URI:         "spirit://participants",
		Name:        "Participants",
		Description: "List of all participants in the system",
		MimeType:    "application/json",
		Handler:     s.getParticipantsResource,
	})

	s.server.RegisterResource(mcp.Resource{
		URI:         "spirit://stimulus-words",
		Name:        "Stimulus Words",
		Description: "List of stimulus words for assessments",
		MimeType:    "application/json",
		Handler:     s.getStimulusWordsResource,
	})
}

func (s *MCPServer) getParticipantsResource(ctx context.Context) (interface{}, error) {
	return s.queries.ListParticipants(ctx)
}

func (s *MCPServer) getStimulusWordsResource(ctx context.Context) (interface{}, error) {
	return s.queries.ListStimulusWords(ctx)
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
	return s.server.ListenAndServe(fmt.Sprintf(":%d", port))
}
