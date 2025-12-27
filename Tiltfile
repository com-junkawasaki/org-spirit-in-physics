# Tiltfile for Spirit in Physics

allow_k8s_contexts('orbstack')

# 1. Generate YAML from Timoni and give it to Tilt
k8s_yaml(local('timoni bundle build -f timoni/bundle.cue -r timoni/runtime-orbstack.cue'))

# 2. Go gRPC Service
docker_build(
    'spirit-grpc-service',
    './performers/services/grpc',
    dockerfile='./performers/services/grpc/Dockerfile'
)

# 3. Python Import Service & Worker
docker_build(
    'spirit-import-service',
    './performers/services/import',
    dockerfile='./performers/services/import/Dockerfile'
)

# 4. Temporal TypeScript Worker
docker_build(
    'spirit-temporal-ts',
    './performers/services/temporal-ts',
    dockerfile='./performers/services/temporal-ts/Dockerfile'
)

# 5. Svelte App
local_resource(
    'svelte-build',
    cmd='cd apps/svelte-app && rm -rf build .svelte-kit && pnpm build',
    deps=['./apps/svelte-app/src', './apps/svelte-app/package.json', './apps/svelte-app/vite.config.ts', './apps/svelte-app/svelte.config.js', './apps/svelte-app/tsconfig.json'],
    labels=['frontend']
)

docker_build(
    'spirit-svelte-app',
    './apps/svelte-app',
    dockerfile='./apps/svelte-app/Dockerfile',
    live_update=[
        sync('./apps/svelte-app/build', '/app/www'),
        run('/app/replace-env.sh /app/www'),
    ]
)

# 5. BDD Tests (now orchestrated by Temporal, but can still be run locally)
local_resource(
    'bdd-tests',
    cmd='cd performers/services/temporal-ts/bdd && pnpm test',
    deps=[
        './performers/services/temporal-ts/bdd',
        './apps/svelte-app/src'
    ],
    auto_init=False,
    labels=['test']
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

k8s_resource('argocd-server',
    new_name='infra-argocd',
    port_forwards='8080:8080',
    links=['http://localhost:8080'],
    labels=['infra'])
