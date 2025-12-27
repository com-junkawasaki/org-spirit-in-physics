{ pkgs, lib }:

let
  src = lib.cleanSource ../../.;
in
pkgs.stdenv.mkDerivation {
  pname = "spirit-svelte-app";
  version = "1.0.0";

  src = src;
  sourceRoot = "source/apps/svelte-app";

  nativeBuildInputs = with pkgs; [
    nodejs_20
    pnpm.configHook
  ];

  # This will need to be updated
  pnpmDeps = pkgs.pnpm.fetchDeps {
    pname = "spirit-svelte-app";
    version = "1.0.0";
    src = src;
    sourceRoot = "source/apps/svelte-app";
    hash = "sha256-0000000000000000000000000000000000000000000=";
  };

  buildPhase = ''
    export HOME=$TMPDIR
    pnpm build
  '';

  installPhase = ''
    mkdir -p $out
    cp -r build/* $out/
  '';
}

