# Tiltfile for Spirit in Physics using Nix & Docker

allow_k8s_contexts('orbstack')

# 1. Generate YAML from Timoni and give it to Tilt
k8s_yaml(local('timoni bundle build -f timoni/bundle.cue -r timoni/runtime-orbstack.cue'))

# 2. Go gRPC Service (Nix Cross-compilation)
custom_build(
    'spirit-grpc-service',
    '$(nix build .#grpc-image --no-link --print-out-paths) | docker load',
    deps=['./performers/services/grpc', './flake.nix'],
    tag='latest'
)

# 3. Python Import Service & Worker (Docker - Nix Python cross-build is slow on Darwin)
docker_build(
    'spirit-import-service',
    './performers/services/import',
    dockerfile='./performers/services/import/Dockerfile'
)

# 4. Temporal TypeScript Worker (Docker - Nix Node cross-build is slow on Darwin)
docker_build(
    'spirit-temporal-ts',
    './performers/services/temporal-ts',
    dockerfile='./performers/services/temporal-ts/Dockerfile'
)

# 5. Svelte App (Docker - Nix Node cross-build is flaky on Darwin)
docker_build(
    'spirit-svelte-app',
    './apps/svelte-app',
    dockerfile='./apps/svelte-app/Dockerfile'
)

# 6. Argo CD Setup
local_resource(
    'install-argocd',
    cmd='kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f - && kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml',
    labels=['infra']
)

# 7. UI Grouping & Endpoints Setup
k8s_resource('grpc-service', 
    labels=['backend'], 
    links=['http://spirit.localhost/api'])

k8s_resource('import-service', 
    labels=['backend'], 
    links=['http://spirit.localhost/import'])

k8s_resource('import-worker', 
    labels=['backend'])

k8s_resource('portal', 
    labels=['frontend'], 
    links=['http://spirit.localhost'])

k8s_resource('infra-temporal', 
    labels=['infra'], 
    links=['http://spirit.localhost/temporal'],
    port_forwards=8088)

k8s_resource('infra-timescaledb', 
    labels=['infra'], 
    port_forwards=5432)

k8s_resource('infra-lakefs',
    labels=['infra'],
    links=['http://spirit.localhost/lakefs'],
    port_forwards=8000)

k8s_resource('infra-minio', 
    labels=['infra'], 
    links=['http://spirit.localhost/minio-console'],
    port_forwards=9001)

# k8s_resource('infra-nix-cache',
#     labels=['infra'],
#     links=['http://spirit.localhost/nix-cache'],
#     port_forwards=5000)
