{
  description = "AeroTizen development environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
          python = pkgs.python3.withPackages (ps: [
            ps.cryptography
            ps.lxml
            ps.pytest
            ps.ruff
            ps.websocket-client
          ]);
          aerotizen = pkgs.writeShellScriptBin "aerotizen" ''
            exec ${python}/bin/python -m aerotizen "$@"
          '';
          aerotizen-inspect = pkgs.writeShellScriptBin "aerotizen-inspect" ''
            exec ${python}/bin/python -m aerotizen.inspect_app "$@"
          '';
        in
        {
          default = pkgs.mkShell {
            packages = [
              aerotizen
              aerotizen-inspect
              pkgs.nodejs_22
              pkgs.nixfmt
              python
            ];

            shellHook = ''
              export PYTHONPATH="$PWD/src''${PYTHONPATH:+:$PYTHONPATH}"
            '';
          };
        }
      );

      formatter = forAllSystems (system: (import nixpkgs { inherit system; }).nixfmt-tree);
    };
}
