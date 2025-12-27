{
  description = "Spirit in Physics - Nix Flake";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    dream2nix.url = "github:nix-community/dream2nix";
  };

  outputs = { self, nixpkgs, flake-utils, dream2nix }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
        
        linuxPkgs = pkgs.pkgsCross.${if pkgs.stdenv.isAarch64 then "aarch64-multiplatform" else "gnu64"};

        # 1. gRPC Service (Go) - Cross-compiled for Linux
        grpc-service = linuxPkgs.buildGoModule {
          pname = "spirit-grpc-service";
          version = "0.1.0";
          src = ./performers/services/grpc;
          vendorHash = "sha256-A1HJr9Gv0l3PZZm5/Nruwenx52MQ4DMTG8aHDKfi+yY=";
          proxyVendor = true;
          nativeBuildInputs = with pkgs; [ buf sqlc protoc-gen-go protoc-gen-connect-go ];
          env = { CGO_ENABLED = "0"; };
          preBuild = ''
            export HOME=$TMPDIR
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
            if [ -f $out/bin/server ]; then
              mv $out/bin/server $out/bin/grpc-service
            fi
          '';
        };

        # 2. Python Import Service - Built with dream2nix
        import-service-eval = dream2nix.lib.evalModules {
          packageSets.nixpkgs = pkgs;
          modules = [
            dream2nix.modules.dream2nix.pip
            {
              paths.projectRoot = ./.;
              paths.package = ./performers/services/import;
              name = "spirit-import-service";
              version = "0.1.0";
              pip.requirementsFiles = [ 
                "${./performers/services/import/requirements.txt}"
              ];
              pip.flattenDependencies = true;
              mkDerivation.src = ./performers/services/import;
            }
          ];
        };
        import-service = import-service-eval.config.public;

        # 3. Svelte App - Standard build with pnpm
        svelte-app = pkgs.stdenv.mkDerivation {
          pname = "spirit-svelte-app";
          version = "0.1.0";
          src = ./apps/svelte-app;
          nativeBuildInputs = with pkgs; [ nodejs_20 pnpm pnpmConfigHook ];
          pnpmDeps = pkgs.fetchPnpmDeps {
            pname = "spirit-svelte-app-deps";
            version = "0.1.0";
            src = ./apps/svelte-app;
            hash = "sha256-biwnGKd9kuIktaDst4EXEHvgip39ZMGZV5UQ2iBq77k=";
            fetcherVersion = 2;
          };
          buildPhase = ''
            pnpm build
          '';
          installPhase = ''
            mkdir -p $out
            cp -r build $out/www
          '';
        };

        # SPA Handler Python script
        spa-handler = pkgs.writeText "spa_handler.py" ''
import http.server, socketserver, os, sys

PORT = 80
DIRECTORY = '/app/www'

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Translate the URL path to a filesystem path
        actual_path = self.translate_path(self.path)
        
        # SPA Fallback logic:
        # If the file/dir doesn't exist, and it doesn't look like a static asset (no dot in basename)
        # serve index.html instead.
        if not os.path.exists(actual_path):
            basename = os.path.basename(actual_path.rstrip('/'))
            if '.' not in basename:
                self.path = '/index.html'
        
        return super().do_GET()

    def log_message(self, format, *args):
        # Redirect logs to stderr for container visibility
        sys.stderr.write("%s - - [%s] %s\n" %
                         (self.address_string(),
                          self.log_date_time_string(),
                          format%args))

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    httpd.serve_forever()
        '';

        # Start script for the Svelte app
        start-script = linuxPkgs.writeScript "start-portal.sh" ''
          #!/bin/sh
          mkdir -p /app
          cp -r ${svelte-app}/www /app/www
          chmod -R 777 /app/www
          
          # Replace environment variables in static assets
          find /app/www -name "*.html" -exec sed -i \
            -e "s|__PUBLIC_CLERK_PUBLISHABLE_KEY__|$PUBLIC_CLERK_PUBLISHABLE_KEY|g" \
            -e "s|__PUBLIC_API_URL__|$PUBLIC_API_URL|g" \
            -e "s|__PUBLIC_SUPABASE_URL__|$PUBLIC_SUPABASE_URL|g" \
            -e "s|__PUBLIC_SUPABASE_ANON_KEY__|$PUBLIC_SUPABASE_ANON_KEY|g" \
            {} + || true
            
          exec ${linuxPkgs.python311}/bin/python3 ${spa-handler}
        '';

      in
      {
        packages = {
          # Image using only cross-compiled Go binary
          grpc-image = pkgs.dockerTools.streamLayeredImage {
            name = "spirit-grpc-service";
            tag = "latest";
            contents = [ grpc-service linuxPkgs.cacert ];
            config = {
              Cmd = [ "${grpc-service}/bin/grpc-service" ];
              ExposedPorts = { "8080/tcp" = { }; };
              Env = [
                "DATABASE_URL=postgresql://postgres:postgres@infra-timescaledb:5432/spirit_in_physics"
                "TEMPORAL_ADDRESS=infra-temporal:7233"
              ];
            };
          };

          # Svelte Image
          svelte-image = pkgs.dockerTools.streamLayeredImage {
            name = "spirit-svelte-app";
            tag = "latest";
            contents = [ 
              linuxPkgs.python311 
              linuxPkgs.busybox
              linuxPkgs.cacert
              svelte-app
            ];
            config = {
              Cmd = [ "${linuxPkgs.busybox}/bin/sh" "${start-script}" ];
              ExposedPorts = { "80/tcp" = { }; };
            };
          };

          # Python Import Service
          import-service = import-service;

          # Python Import Service Image (Built with dream2nix!)
          import-image = pkgs.dockerTools.streamLayeredImage {
            name = "spirit-import-service";
            tag = "latest";
            contents = [ import-service linuxPkgs.cacert ];
            config = {
              Cmd = [ "${import-service}/bin/python" "-m" "main" ];
              ExposedPorts = { "8000/tcp" = { }; };
            };
          };
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [ go python311 nodejs_20 pnpm buf sqlc tilt kubectl timoni ];
        };
      }
    );
}
