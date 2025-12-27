{ pkgs, lib }:

let
  src = lib.cleanSource ../../.;
  
  grpc-service = pkgs.buildGoModule {
    pname = "spirit-grpc-service";
    version = "1.45.0";

    src = src;
    sourceRoot = "source/performers/services/grpc";

    vendorHash = "sha256-A1HJr9Gv0l3PZZm5/Nruwenx52MQ4DMTG8aHDKfi+yY=";

    nativeBuildInputs = with pkgs; [
      buf
      sqlc
      protoc-gen-go
      protoc-gen-connect-go
      go_1_24
    ];

    proxyVendor = true;
    subPackages = [ "cmd/server" ];
    ldflags = [ "-s" "-w" ];
  };
in
{
  package = grpc-service;

  image = pkgs.dockerTools.buildLayeredImage {
    name = "spirit-grpc-service";
    tag = "latest";
    
    contents = [
      pkgs.cacert
      pkgs.curl # Useful for health checks
    ];

    config = {
      Cmd = [ "${grpc-service}/bin/server" ];
      ExposedPorts = {
        "8080/tcp" = { };
      };
      WorkingDir = "/";
    };
  };
}
