// CI module for spirit-in-physics
//
// This module provides CI/CD functions for building and deploying
// the spirit-in-physics application to Google Artifact Registry and GKE.
package main

import (
	"context"
	"dagger/ci/internal/dagger"
)

const (
	registry  = "asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics"
	namespace = "spirit-in-physics"
)

type Ci struct{}

// Build the web application Docker image
func (m *Ci) BuildWeb(ctx context.Context, source *dagger.Directory) *dagger.Container {
	return dag.Container().
		Build(source.Directory("apps/web"), dagger.ContainerBuildOpts{
			Dockerfile: "Dockerfile",
		})
}

// Push the web application image to Artifact Registry
func (m *Ci) PushWeb(ctx context.Context, source *dagger.Directory) (string, error) {
	return m.BuildWeb(ctx, source).
		WithRegistryAuth(registry, "_json_key", dag.SetSecret("gcp-key", "")).
		Publish(ctx, registry+"/web:latest")
}

// Build manifests using Kustomize
func (m *Ci) BuildManifests(ctx context.Context, source *dagger.Directory, overlay string) *dagger.File {
	return dag.Container().
		From("bitnami/kubectl:latest").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src").
		WithExec([]string{"kubectl", "kustomize", "manifests/overlays/" + overlay}).
		File("/dev/stdout")
}

// Push manifests image to Artifact Registry
func (m *Ci) PushManifests(ctx context.Context, source *dagger.Directory) (string, error) {
	manifests := dag.Container().
		From("bitnami/kubectl:latest").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src").
		WithExec([]string{"sh", "-c", "kubectl kustomize manifests/overlays/gke > /manifests/all.yaml"}).
		Directory("/manifests")

	return dag.Container().
		From("scratch").
		WithDirectory("/", manifests).
		Publish(ctx, registry+"/manifests:latest")
}

// Apply manifests to local cluster
func (m *Ci) ApplyLocal(ctx context.Context, source *dagger.Directory) (string, error) {
	return dag.Container().
		From("bitnami/kubectl:latest").
		WithMountedDirectory("/src", source).
		WithWorkdir("/src").
		WithExec([]string{"sh", "-c", "kubectl kustomize manifests/overlays/local | kubectl apply -f -"}).
		Stdout(ctx)
}

// Rollout restart a deployment
func (m *Ci) Rollout(ctx context.Context, deployment string) (string, error) {
	return dag.Container().
		From("bitnami/kubectl:latest").
		WithExec([]string{"kubectl", "rollout", "restart", "deployment", deployment, "-n", namespace}).
		Stdout(ctx)
}

// Full deploy: build, push web image, and restart deployment
func (m *Ci) Deploy(ctx context.Context, source *dagger.Directory) (string, error) {
	_, err := m.PushWeb(ctx, source)
	if err != nil {
		return "", err
	}
	return m.Rollout(ctx, "portal")
}
