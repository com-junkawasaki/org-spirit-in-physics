# Tiltfile for Spirit in Physics using Nix & Docker

allow_k8s_contexts(['orbstack', 'gke_com-junkawasaki-sip_asia-northeast1-a_spirit-in-physics'])

ctx = str(local('kubectl config current-context')).strip()
runtime_file = 'timoni/runtime-gke.cue' if 'gke' in ctx else 'timoni/runtime-orbstack.cue'

# 1. Generate YAML from Timoni and give it to Tilt
k8s_yaml(local('timoni bundle build -f timoni/bundle.cue -r ' + runtime_file))

GRPC_IMAGE = 'asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/grpc-service'
IMPORT_IMAGE = 'asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/import-service'
SVELTE_IMAGE = 'asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/svelte-app'
TEMPORAL_TS_IMAGE = 'asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/temporal-ts'

# 2. Go gRPC Service (Nix Cross-compilation)
custom_build(
    GRPC_IMAGE,
    '$(nix build .#grpc-image --no-link --print-out-paths) | docker load && docker tag spirit-grpc-service:latest $EXPECTED_REF',
    deps=['./performers/services/grpc', './flake.nix']
)

# 3. Python Import Service & Worker (Docker - Nix Python cross-build is slow on Darwin)
docker_build(
    IMPORT_IMAGE,
    './performers/services/import',
    dockerfile='./performers/services/import/Dockerfile'
)

# 4. Temporal TypeScript Worker (Docker - Nix Node cross-build is slow on Darwin)
docker_build(
    TEMPORAL_TS_IMAGE,
    './performers/services/temporal-ts',
    dockerfile='./performers/services/temporal-ts/Dockerfile'
)

# 5. Svelte App (Docker - Nix Node cross-build is flaky on Darwin)
docker_build(
    SVELTE_IMAGE,
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
