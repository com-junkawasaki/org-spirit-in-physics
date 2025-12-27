{
  description = "Spirit in Physics - Nix based Monorepo management";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    devenv.url = "github:cachix/devenv";
  };

  outputs = { self, nixpkgs, flake-utils, devenv, ... } @ inputs:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };

        # Linux pkgs for OCI images (even when building on macOS)
        linuxSystem = if system == "aarch64-darwin" then "aarch64-linux" 
                      else if system == "x86_64-darwin" then "x86_64-linux"
                      else system;
        
        pkgsLinux = import nixpkgs {
          system = linuxSystem;
          config.allowUnfree = true;
        };

        # Shared build tools
        buildTools = with pkgs; [
          git
          gnumake
          curl
          buf
          sqlc
          go_1_24
          nodejs_20
          pnpm
          python311
          timoni
          cue
          kubectl
          temporal-cli
        ];

        grpc = pkgs.callPackage ./nix/grpc/default.nix { };
        svelte = pkgs.callPackage ./nix/svelte-app/default.nix { };

      in
      {
        devShells.default = devenv.lib.mkShell {
          inherit inputs pkgs;
          modules = [
            ({ pkgs, ... }: {
              packages = buildTools;

              enterScript = ''
                echo "Spirit in Physics Development Environment"
                echo "Nix-built tools: $(timoni version | head -n 1)"
              '';
            })
          ];
        };

        packages = {
          grpc-service = grpc.package;
          grpc-image = grpc.image;
          svelte-app = svelte.package;
          svelte-image = svelte.image;
        };

        defaultPackage = self.packages.${system}.grpc-service;
      }
    );
}
