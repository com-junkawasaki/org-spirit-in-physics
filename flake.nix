{
  description = "Spirit in Physics - Nix Flake";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    nix2container.url = "github:nlewo/nix2container";
    nix2container.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { self, nixpkgs, flake-utils, nix2container }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
        n2c = nix2container.packages.${system}.nix2container;
        lib = pkgs.lib;

        # Shared Protobuf tools
        proto-tools = with pkgs; [
          buf
          sqlc
          protoc-gen-go
          protoc-gen-connect-go
          # We'll skip Node plugins in the Go build for now, or add them if needed
        ];

        # 1. gRPC Service (Go)
        grpc-service = pkgs.buildGoModule {
          pname = "spirit-grpc-service";
          version = "0.1.0";
          src = ./performers/services/grpc;
          vendorHash = "sha256-A1HJr9Gv0l3PZZm5/Nruwenx52MQ4DMTG8aHDKfi+yY=";
          proxyVendor = true;
          nativeBuildInputs = proto-tools;
          preBuild = ''
            export HOME=$TMPDIR
            # Generate only Go code to avoid Node dependency during Go build
            cat > buf.gen.go.yaml <<EOF
            version: v2
            plugins:
              - local: protoc-gen-go
                out: .
                opt:
                  - module=github.com/spirit-in-physics/services/grpc
              - local: protoc-gen-connect-go
                out: .
                opt:
                  - module=github.com/spirit-in-physics/services/grpc
            EOF
            buf generate --template buf.gen.go.yaml
            sqlc generate
          '';
          subPackages = [ "cmd/server" ];
          postInstall = ''
            mv $out/bin/server $out/bin/grpc-service
          '';
        };

        grpc-image = n2c.buildImage {
          name = "spirit-grpc-service";
          config = {
            Cmd = [ "${grpc-service}/bin/grpc-service" ];
            ExposedPorts = {
              "8080/tcp" = { };
            };
            Env = [
              "DATABASE_URL=postgresql://postgres:postgres@infra-timescaledb:5432/spirit_in_physics"
              "TEMPORAL_ADDRESS=infra-temporal:7233"
            ];
          };
        };

        # 2. Python Import Service
        # Custom temporalio package for Nix
        temporalio-py = pkgs.python311Packages.buildPythonPackage rec {
          pname = "temporalio";
          version = "1.7.0";
          src = pkgs.python311Packages.fetchPypi {
            inherit pname version;
            hash = "sha256-UFe3TfZEvU9fTrDpXnMKCjahb37pJtNvzUecIjp8Y80=";
          };
          pyproject = true;
          build-system = with pkgs.python311Packages; [ setuptools ];
          doCheck = false;
          propagatedBuildInputs = with pkgs.python311Packages; [
            protobuf
            types-protobuf
            grpcio
            pydantic
            python-dateutil
            typing-extensions
          ];
        };

        python-env = pkgs.python311.withPackages (ps: with ps; [
          fastapi
          uvicorn
          asyncpg
          pydantic
          python-dotenv
          temporalio-py
        ]);

        import-service = pkgs.stdenv.mkDerivation {
          pname = "spirit-import-service";
          version = "0.1.0";
          src = ./performers/services/import;
          nativeBuildInputs = [ pkgs.makeWrapper ];
          installPhase = ''
            mkdir -p $out/bin $out/lib
            cp -r . $out/lib/
            makeWrapper ${python-env}/bin/python $out/bin/import-service \
              --add-flags "$out/lib/main.py"
          '';
        };

        import-image = n2c.buildImage {
          name = "spirit-import-service";
          config = {
            Cmd = [ "${import-service}/bin/import-service" ];
            ExposedPorts = {
              "8082/tcp" = { };
            };
          };
        };

        # 3. Svelte App
        svelte-app = pkgs.stdenv.mkDerivation {
          pname = "spirit-svelte-app";
          version = "0.1.0";
          src = ./apps/svelte-app;
          nativeBuildInputs = [ 
            pkgs.nodejs_20 
            pkgs.pnpmConfigHook 
          ];
          pnpmDeps = pkgs.fetchPnpmDeps {
            pname = "spirit-svelte-app-deps";
            inherit (svelte-app) version src;
            hash = "sha256-CwMqzwJMUKkRRVMAnV1X5Qct3BVMdclLtmvb0dlh/vw=";
            fetcherVersion = 3;
          };
          buildPhase = ''
            pnpm build
          '';
          installPhase = ''
            mkdir -p $out/www
            cp -r build/* $out/www/
          '';
        };

        svelte-image = n2c.buildImage {
          name = "spirit-svelte-app";
          contents = [ pkgs.python311 ];
          config = {
            Cmd = [ 
              "python3" "-c" 
              "import http.server, socketserver, os; PORT = 80; DIRECTORY = '${svelte-app}/www'; class Handler(http.server.SimpleHTTPRequestHandler): def __init__(self, *args, **kwargs): super().__init__(*args, directory=DIRECTORY, **kwargs); def do_GET(self): path = self.translate_path(self.path); if not os.path.exists(path) and '.' not in os.path.basename(path): self.path = '/index.html'; return super().do_GET(); with socketserver.TCPServer(('', PORT), Handler) as httpd: httpd.serve_forever()" 
            ];
            ExposedPorts = {
              "80/tcp" = { };
            };
          };
        };

        # 4. Temporal TS Worker
        temporal-ts-worker = pkgs.stdenv.mkDerivation {
          pname = "spirit-temporal-ts";
          version = "0.1.0";
          src = ./performers/services/temporal-ts;
          nativeBuildInputs = [ 
            pkgs.nodejs_20 
            pkgs.pnpmConfigHook 
            pkgs.makeWrapper
          ];
          pnpmDeps = pkgs.fetchPnpmDeps {
            pname = "spirit-temporal-ts-deps";
            inherit (temporal-ts-worker) version src;
            hash = "sha256-4H2JYHh03VJxGR6cXVLQhWQBM0Tzfzg2IUtirKTGND4=";
            fetcherVersion = 3;
          };
          buildPhase = ''
            pnpm build
          '';
          installPhase = ''
            mkdir -p $out/lib $out/bin
            cp -r . $out/lib/
            makeWrapper ${pkgs.nodejs_20}/bin/node $out/bin/temporal-ts-worker \
              --add-flags "$out/lib/dist/worker.js"
          '';
        };

        temporal-ts-image = n2c.buildImage {
          name = "spirit-temporal-ts";
          config = {
            Cmd = [ "${temporal-ts-worker}/bin/temporal-ts-worker" ];
            Env = [
              "TEMPORAL_ADDRESS=infra-temporal:7233"
              "TASK_QUEUE=visualization-analysis-queue"
            ];
          };
        };

      in
      {
        packages = {
          inherit 
            grpc-service grpc-image 
            import-service import-image 
            svelte-app svelte-image 
            temporal-ts-worker temporal-ts-image;
          svelte-app-deps = svelte-app.pnpmDeps;
          temporal-ts-deps = temporal-ts-worker.pnpmDeps;
          default = grpc-service;
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            go
            python311
            nodejs_20
            pnpm
            buf
            sqlc
            tilt
            kubectl
            timoni
            kubernetes-helm
          ];
        };
      }
    );
}
