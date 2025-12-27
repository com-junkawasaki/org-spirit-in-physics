{ pkgs, lib }:

let
  src = lib.cleanSource ../../.;
  
  svelte-app = pkgs.stdenv.mkDerivation {
    pname = "spirit-svelte-app";
    version = "1.0.0";

    src = src;
    sourceRoot = "source/apps/svelte-app";

    nativeBuildInputs = with pkgs; [
      nodejs_20
      pnpm
      pnpmConfigHook
      jq
    ];

    pnpmDeps = pkgs.fetchPnpmDeps {
      pname = "spirit-svelte-app";
      version = "1.0.0";
      src = src;
      sourceRoot = "source/apps/svelte-app";
      hash = "sha256-Aptkz+is2kxHqYkmuU3WuWjd/sIRJObavXkRk24SSAU=";
      fetcherVersion = 1;
    };

    postPatch = ''
      # Remove packageManager field to prevent pnpm from trying to install itself
      jq 'del(.packageManager)' package.json > package.json.tmp && mv package.json.tmp package.json
    '';

    buildPhase = ''
      export HOME=$TMPDIR
      export PNPM_SKIP_CHECK_UPDATE=1
      pnpm build
    '';

    installPhase = ''
      mkdir -p $out
      cp -r build/* $out/
    '';
  };

  # SPA Server script (extracted from Dockerfile)
  spa-server = pkgs.writeText "spa_server.py" ''
import http.server, socketserver, os
PORT = 8080
DIRECTORY = '/app/www'
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=DIRECTORY, **kwargs)
    def do_GET(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path) and '.' not in os.path.basename(path): self.path = '/index.html'
        return super().do_GET()
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving SPA at port {PORT}")
    httpd.serve_forever()
  '';

in
{
  package = svelte-app;

  image = pkgs.dockerTools.buildLayeredImage {
    name = "spirit-svelte-app";
    tag = "latest";
    
    contents = [
      pkgs.python311
      pkgs.envoy
      pkgs.bash
      pkgs.coreutils
    ];

    config = {
      Cmd = [ 
        "${pkgs.bash}/bin/bash" "-c" 
        "python3 ${spa-server} & envoy -c /app/envoy.yaml" 
      ];
      ExposedPorts = {
        "8080/tcp" = { };
        "10000/tcp" = { }; # Default Envoy port
      };
      WorkingDir = "/app";
    };

    # Set up the /app directory with the build and envoy config
    extraCommands = ''
      mkdir -p app/www
      cp -r ${svelte-app}/* app/www/
      cp ${../../apps/svelte-app/envoy.yaml} app/envoy.yaml
    '';
  };
}
