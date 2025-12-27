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

# 3. Svelte App
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

# 4. BDD Tests
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

# 5. UI Grouping & Endpoints Setup
k8s_resource('grpc-service', 
    labels=['backend'], 
    links=['http://api.localhost'])

k8s_resource('participant', 
    labels=['frontend'], 
    links=['http://participant.localhost'])

k8s_resource('researcher', 
    labels=['frontend'], 
    links=['http://researcher.localhost'])

k8s_resource('paper', 
    labels=['frontend'], 
    links=['http://paper.localhost'])

k8s_resource('demo', 
    labels=['frontend'], 
    links=['http://demo.localhost'])

k8s_resource('infra-temporal', 
    labels=['infra'], 
    links=['http://temporal.localhost'],
    port_forwards=8088)

k8s_resource('infra-timescaledb', 
    labels=['infra'], 
    port_forwards=5432)

k8s_resource('infra-minio', 
    labels=['infra'], 
    links=['http://minio-console.localhost'],
    port_forwards=9001)
