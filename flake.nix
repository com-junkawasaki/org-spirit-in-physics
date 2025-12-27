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
        };

        defaultPackage = self.packages.${system}.grpc-service;
      }
    );
}
