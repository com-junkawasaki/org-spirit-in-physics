# Tiltfile for spirit-in-physics
# ArgoCD + Tilt integration for fast local development

load('ext://restart_process', 'docker_build_with_restart')
load('ext://helm_resource', 'helm_resource', 'helm_repo')

# Allow GKE context for development
allow_k8s_contexts('gke_com-junkawasaki-sip_asia-northeast1_spirit-autopilot')

# Configuration
config.define_string("runtime", args=True, usage="Runtime environment (orbstack or gke)")
cfg = config.parse()
runtime = cfg.get("runtime", "local")

print("🚀 Tilt starting with runtime: {}".format(runtime))

# Kustomize manifests
k8s_yaml(local('timeout 30s kubectl kustomize manifests/overlays/{}'.format(runtime)))

# Portal (Svelte App)
docker_build(
  'asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/web',
  './apps/web',
  dockerfile='./apps/web/Dockerfile',
  ignore=[
    '**/node_modules',
    '**/.svelte-kit',
    './build'
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
watch_file('dataset/')
watch_file('.cursor/rules/')

print("""
✨ Tilt is ready!

🌐 Access your services:
  - Portal: http://localhost:3000
  - Temporal UI: http://localhost:8088

📊 Tilt UI: http://localhost:10350

🔄 GitOps:
  - Local changes are applied immediately via Tilt
  - Push manifests to Artifact Registry for GKE Config Sync via:
    task push-manifest
""")
