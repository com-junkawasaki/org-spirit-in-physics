# Tiltfile for spirit-in-physics
# ArgoCD + Tilt integration for fast local development

load('ext://restart_process', 'docker_build_with_restart')
load('ext://helm_resource', 'helm_resource', 'helm_repo')

# Configuration
config.define_string("runtime", args=True, usage="Runtime environment (orbstack or gke)")
cfg = config.parse()
runtime = cfg.get("runtime", "orbstack")

print("🚀 Tilt starting with runtime: {}".format(runtime))

# Kustomize manifests
k8s_yaml(local('kubectl kustomize manifests/overlays/{}'.format(runtime)))

# Portal (Svelte App) - Host-side build for maximum efficiency
# This builds the app on your machine, which is much faster than inside Docker.
local_resource(
  'svelte-app-build',
  'cd apps/svelte-app && pnpm build',
  deps=[
    './apps/svelte-app/src',
    './apps/svelte-app/static',
    './apps/svelte-app/package.json',
    './apps/svelte-app/pnpm-lock.yaml',
    './apps/svelte-app/svelte.config.js',
    './apps/svelte-app/vite.config.ts'
  ],
  labels=['frontend']
)

docker_build(
  'asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/svelte-app',
  './apps/svelte-app',
  dockerfile='./apps/svelte-app/Dockerfile',
  ignore=[
    '**/node_modules',
    '**/.svelte-kit',
    # We ignore the build folder here because we sync it via live_update
    # and we don't want every local build to trigger a full image rebuild.
    './build'
  ],
  live_update=[
    # Sync the build output from host to container
    sync('./build', '/app/build'),
    # Also sync static files just in case
    sync('./static', '/app/static'),
    # NOTE: We removed 'run npm run build' from here.
    # The host-side 'svelte-app-build' resource handles the build.
  ]
)

# gRPC Service - Go hot reload
docker_build_with_restart(
  'asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/grpc-service',
  './performers/services/grpc',
  dockerfile='./performers/services/grpc/Dockerfile',
  entrypoint='./grpc-service',
  live_update=[
    sync('./performers/services/grpc', '/app'),
    run('go build -o main .', trigger=['./performers/services/grpc/**/*.go']),
  ]
)

# Import Service - Python hot reload
docker_build_with_restart(
  'asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/import-service',
  './performers/services/import',
  dockerfile='./performers/services/import/Dockerfile',
  entrypoint='python main.py',
  live_update=[
    sync('./performers/services/import', '/app'),
    sync('./dataset', '/dataset'),
    run('pip install -e .', trigger=['./performers/services/import/setup.py']),
  ]
)

# Temporal Worker - TypeScript hot reload
docker_build_with_restart(
  'asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/temporal-ts',
  './performers/services/temporal-ts',
  dockerfile='./performers/services/temporal-ts/Dockerfile',
  entrypoint='node dist/worker.js',
  live_update=[
    sync('./performers/services/temporal-ts/src', '/app/src'),
    run('npm run build', trigger=['./performers/services/temporal-ts/src/**/*.ts']),
  ]
)

# Port forwards for local access
k8s_resource(
  'portal',
  port_forwards=['3000:80'],
  labels=['frontend']
)

k8s_resource(
  'grpc-service',
  port_forwards=['8080:8080'],
  labels=['backend']
)

k8s_resource(
  'import-service',
  port_forwards=['8082:8082'],
  labels=['backend']
)

k8s_resource(
  'infra-temporal',
  port_forwards=['7233:7233', '8088:8088'],
  labels=['infrastructure']
)

k8s_resource(
  'infra-minio',
  port_forwards=['9000:9000', '9001:9001'],
  labels=['infrastructure']
)

k8s_resource(
  'infra-timescaledb',
  port_forwards=['5432:5432'],
  labels=['infrastructure']
)

# Custom buttons for common tasks
local_resource(
  'run-tests',
  'echo "Running tests..." && npm test',
  trigger_mode=TRIGGER_MODE_MANUAL,
  auto_init=False,
  labels=['tools']
)

# Watch files for changes
watch_file('manifests/')
watch_file('.cursor/rules/')

print("""
✨ Tilt is ready!

🌐 Access your services:
  - Portal: http://localhost:3000
  - Temporal UI: http://localhost:8088
  - MinIO Console: http://localhost:9001

📊 Tilt UI: http://localhost:10350

🔄 GitOps:
  - Local changes are applied immediately via Tilt
  - Push manifests to Artifact Registry for GKE Config Sync via:
    task push-manifest
""")
