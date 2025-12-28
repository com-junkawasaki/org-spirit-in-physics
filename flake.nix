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
        
        # Target Linux x86_64 for GKE (e2-medium nodes)
        # We disable tests for Node.js to speed up cross-compilation
        linuxPkgs = pkgs.pkgsCross.gnu64.extend (final: prev: {
          nodejs_20 = prev.nodejs_20.overrideAttrs (old: {
            doCheck = false;
            doInstallCheck = false;
            # Also skip some other time-consuming parts if possible
            separateDebugInfo = false;
          });
        });

        # 1. gRPC Service (Go) - Cross-compiled for Linux x86_64
        grpc-service = linuxPkgs.buildGoModule {
          pname = "spirit-grpc-service";
          version = "0.1.0";
          src = ./performers/services/grpc;
          vendorHash = "sha256-A1HJr9Gv0l3PZZm5/Nruwenx52MQ4DMTG8aHDKfi+yY=";
          proxyVendor = true;
          nativeBuildInputs = with pkgs; [ buf sqlc protoc-gen-go protoc-gen-connect-go ];
          env = { 
            CGO_ENABLED = "0";
            GOOS = "linux";
            GOARCH = "amd64";
          };
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

        # 2. Python Import Service - Built for Linux x86_64
        import-service-eval = dream2nix.lib.evalModules {
          packageSets.nixpkgs = linuxPkgs;
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

        # 3. Svelte App - Standard build with pnpm (adapter-node)
        svelte-app = pkgs.stdenv.mkDerivation {
          pname = "spirit-svelte-app";
          version = "0.1.0";
          src = ./apps/svelte-app;
          nativeBuildInputs = with pkgs; [ nodejs_20 pnpm pnpmConfigHook ];
          pnpmDeps = pkgs.fetchPnpmDeps {
            pname = "spirit-svelte-app-deps";
            version = "0.1.0";
            src = ./apps/svelte-app;
            hash = "sha256-e8VkKBy4MgqNa4hWwVyG5OnD01aD6yAXMppFdowRSVk=";
            fetcherVersion = 2;
          };
          buildPhase = ''
            pnpm build
          '';
          installPhase = ''
            mkdir -p $out
            cp -r build $out/build
            cp package.json $out/package.json
          '';
        };

        # Start script for the Svelte app (Node.js)
        start-script = linuxPkgs.writeScript "start-portal.sh" ''
          #!/bin/sh
          # SvelteKit adapter-node reads environment variables directly
          export PORT=80
          export ORIGIN=http://spirit.localhost
          exec ${linuxPkgs.nodejs_20}/bin/node ${svelte-app}/build/index.js
        '';

      in
      {
        packages = {
          svelte-app = svelte-app;
          # Image using only cross-compiled Go binary
          grpc-image = linuxPkgs.dockerTools.streamLayeredImage {
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

          # Svelte Image (Node.js)
          svelte-image = linuxPkgs.dockerTools.streamLayeredImage {
            name = "spirit-svelte-app";
            tag = "latest";
            contents = [ 
              linuxPkgs.nodejs_20
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
          import-image = linuxPkgs.dockerTools.streamLayeredImage {
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
