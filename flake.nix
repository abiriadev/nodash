{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    wrangler = {
      url = "github:emrldnix/wrangler";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = (
    {
      self,
      nixpkgs,
      flake-utils,
      wrangler,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      with pkgs;
      {
        nix.settings = {
          substituters = [ "https://wrangler.cachix.org" ];
          trusted-public-keys = [ "wrangler.cachix.org-1:N/FIcG2qBQcolSpklb2IMDbsfjZKWg+ctxx0mSMXdSs=" ];
        };

        devShells.default = mkShell {
          packages = [
            nodejs
            pnpm
            litecli
            wrangler.packages.${system}.wrangler
          ];
        };
      }
    )
  );
}
