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

# 4. Svelte App
local_resource(
    'svelte-build',
    cmd='cd apps/svelte-app && pnpm build',
    deps=['./apps/svelte-app/src'],
    labels=['frontend']
)

docker_build(
    'spirit-svelte-app',
    './apps/svelte-app',
    dockerfile='./apps/svelte-app/Dockerfile',
    live_update=[
        sync('./apps/svelte-app/build', '/usr/share/nginx/html'),
    ]
)

# 5. BDD Tests
local_resource(
    'bdd-tests',
    cmd='cd tests/bdd && pnpm test',
    deps=[
        './performers/services/grpc/internal',
        './apps/svelte-app/src'
    ],
    auto_init=False,
    labels=['test']
)

# 6. UI Grouping & Endpoints Setup
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

k8s_resource('infra-minio', 
    labels=['infra'], 
    links=['http://spirit.localhost/minio-console'],
    port_forwards=9001)
